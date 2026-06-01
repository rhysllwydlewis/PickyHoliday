import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createTravelProviderRegistry } from './travelProviderRegistry.js';

const port = Number(process.env.PORT || 8787);
const registry = createTravelProviderRegistry(process.env);
const distDir = path.resolve(process.cwd(), 'dist');

const isPathInside = (parent, child) => {
  const relativePath = path.relative(parent, child);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      request.destroy();
      reject(new Error('Request body too large'));
    }
  });
  request.on('end', () => {
    if (!body) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
  request.on('error', reject);
});

const sendStatic = async (response, pathname) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(distDir, `.${requestedPath}`);

  if (!isPathInside(distDir, filePath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
    return true;
  } catch (error) {
    const indexPath = path.join(distDir, 'index.html');
    try {
      await stat(indexPath);
      response.writeHead(200, { 'Content-Type': 'text/html' });
      createReadStream(indexPath).pipe(response);
      return true;
    } catch (indexError) {
      return false;
    }
  }
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
};

const postRoutes = {
  '/api/travel/search': (body) => registry.search(body),
  '/api/travel/flights': (body) => registry.flights(body),
  '/api/travel/hotels': (body) => registry.hotels(body),
  '/api/travel/packages': (body) => registry.packages(body),
  '/api/travel/holiday-composer': (body) => registry.composeHoliday(body),
  '/api/travel/enquiries': (body) => registry.createEnquiry(body),
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, registry.status());
    return;
  }

  if (request.method === 'POST' && postRoutes[url.pathname]) {
    try {
      const body = await readJsonBody(request);
      const payload = await postRoutes[url.pathname](body);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    const served = await sendStatic(response, url.pathname);
    if (served) return;
  }

  sendJson(response, 404, { ok: false, error: 'Route not found' });
});

server.listen(port, () => {
  console.log(`PickyHoliday travel API proxy listening on ${port} in ${registry.mode} mode`);
});
