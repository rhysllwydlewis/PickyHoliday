import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createTravelProviderRegistry } from './travelProviderRegistry.js';
import { validateEnquiryPayload } from './enquiries/validateEnquiry.js';
import { createEnquiry, listEnquiries, updateEnquiryStatus } from './enquiries/enquiryStore.js';
import { notifyEnquiry } from './enquiries/enquiryNotifier.js';
import { publicEnquiry } from '../src/services/enquiries/enquiryModel.js';

const port = Number(process.env.PORT || 8787);
const registry = createTravelProviderRegistry(process.env);
const distDir = path.resolve(process.cwd(), 'dist');
const maxBodyBytes = Number(process.env.API_MAX_BODY_BYTES || 1_000_000);

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

class BodyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  let rejected = false;
  request.on('data', (chunk) => {
    if (rejected) return;
    if (body.length + chunk.length > maxBodyBytes) {
      rejected = true;
      reject(new BodyError('Request body too large', 413));
      request.resume();
      return;
    }
    body += chunk;
  });
  request.on('end', () => {
    if (rejected) return;
    if (!body) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(new BodyError('Invalid JSON body. Please send valid application/json.', 400));
    }
  });
  request.on('error', (error) => {
    if (!rejected) reject(error);
  });
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

const defaultCorsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const allowedCorsOrigins = () => (process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultCorsOrigins);

const corsOrigin = (request) => {
  const allowedOrigins = allowedCorsOrigins();
  if (allowedOrigins.includes('*')) return '*';
  const requestOrigin = request.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0];
};

const sendJson = (request, response, status, payload) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin(request),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  });
  response.end(JSON.stringify(payload));
};

const errorEnvelope = (status, message, extras = {}) => ({
  ok: false,
  providerMode: registry.mode,
  results: [],
  providerErrors: [{ provider: 'api', method: 'request', message }],
  ...extras,
  meta: {
    totalResults: 0,
    activeProviders: registry.status().activeProviders,
    timestamp: new Date().toISOString(),
    status,
    ...(extras.meta || {}),
  },
});

const enquiryEnvelope = (record, notifierResult) => ({
  ok: true,
  providerMode: registry.mode,
  results: [],
  providerErrors: [],
  providerStatus: registry.status().providerStatus || [],
  enquiry: publicEnquiry(record),
  notifier: notifierResult,
  meta: {
    totalResults: 0,
    activeProviders: registry.status().activeProviders,
    timestamp: new Date().toISOString(),
  },
});

const canUseAdminRoutes = (request) => {
  const token = process.env.ADMIN_ACCESS_TOKEN;
  const header = request.headers.authorization || '';
  if (token) return header === `Bearer ${token}`;

  const explicitlyAllowed = `${process.env.ALLOW_UNPROTECTED_ADMIN || ''}`.toLowerCase() === 'true';
  const safeLocalMode = registry.mode === 'mock' && ['development', 'test'].includes(process.env.NODE_ENV || '');
  return explicitlyAllowed && safeLocalMode;
};

const postRoutes = {
  '/api/travel/search': (body) => registry.search(body),
  '/api/travel/flights': (body) => registry.flights(body),
  '/api/travel/hotels': (body) => registry.hotels(body),
  '/api/travel/packages': (body) => registry.packages(body),
  '/api/travel/holiday-composer': (body) => registry.composeHoliday(body),
  '/api/travel/locations': (body) => registry.locations(body),
};

const handleCreateEnquiry = async (body) => {
  const validated = validateEnquiryPayload(body);
  const record = await createEnquiry(validated);
  const notifierResult = await notifyEnquiry(record, process.env);
  return enquiryEnvelope(record, notifierResult);
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(request, response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(request, response, 200, registry.status());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/enquiries') {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const enquiries = await listEnquiries();
      sendJson(request, response, 200, {
        ok: true,
        providerMode: registry.mode,
        results: enquiries,
        providerErrors: [],
        meta: {
          totalResults: enquiries.length,
          activeProviders: registry.status().activeProviders,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[api-error]', { route: url.pathname, message: error.message });
      sendJson(request, response, 500, errorEnvelope(500, 'Could not read enquiries.'));
    }
    return;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/enquiries/')) {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const body = await readJsonBody(request);
      const id = decodeURIComponent(url.pathname.split('/').pop() || '');
      const updated = await updateEnquiryStatus(id, body.status);
      sendJson(request, response, 200, {
        ok: true,
        providerMode: registry.mode,
        results: [updated],
        providerErrors: [],
        meta: {
          totalResults: 1,
          activeProviders: registry.status().activeProviders,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const status = error.status || 500;
      const message = status >= 500 ? 'Could not update enquiry.' : error.message;
      sendJson(request, response, status, errorEnvelope(status, message));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/travel/locations') {
    try {
      const payload = await registry.locations({
        keyword: url.searchParams.get('keyword') || url.searchParams.get('q') || '',
        max: url.searchParams.get('max') || undefined,
      });
      sendJson(request, response, 200, payload);
    } catch (error) {
      console.error('[api-error]', { route: url.pathname, message: error.message });
      sendJson(request, response, 500, errorEnvelope(500, 'Travel location lookup failed.'));
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/travel/enquiries') {
    try {
      const body = await readJsonBody(request);
      const payload = await handleCreateEnquiry(body);
      sendJson(request, response, 200, payload);
    } catch (error) {
      const status = error.status || 500;
      const message = status >= 500 ? 'Could not save enquiry.' : error.message;
      console.error('[api-error]', { route: url.pathname, status, message: error.message });
      sendJson(request, response, status, errorEnvelope(status, message, { fieldErrors: error.fieldErrors || [] }));
    }
    return;
  }

  if (request.method === 'POST' && postRoutes[url.pathname]) {
    try {
      const body = await readJsonBody(request);
      const payload = await postRoutes[url.pathname](body);
      sendJson(request, response, 200, payload);
    } catch (error) {
      const status = error.status || 500;
      const message = status >= 500 ? 'Travel API request failed in a controlled way.' : error.message;
      console.error('[api-error]', { route: url.pathname, status, message: error.message });
      sendJson(request, response, status, errorEnvelope(status, message));
    }
    return;
  }

  if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    const served = await sendStatic(response, url.pathname);
    if (served) return;
  }

  sendJson(request, response, 404, errorEnvelope(404, 'Route not found'));
});

server.listen(port, () => {
  console.log(`PickyHoliday travel API proxy listening on ${port} in ${registry.mode} mode`);
});
