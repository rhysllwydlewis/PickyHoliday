import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { createTravelProviderRegistry } from './travelProviderRegistry.js';
import { validateEnquiryPayload } from './enquiries/validateEnquiry.js';
import { createEnquiry, getEnquiryStorageStatus, listEnquiries, updateEnquiryStatus } from './enquiries/enquiryStore.js';
import { notifyEnquiry } from './enquiries/enquiryNotifier.js';
import { publicEnquiry } from '../src/services/enquiries/enquiryModel.js';
import { createPromotedDeal, getPromotedDealStorageStatus, listPromotedDeals, listPublicPromotedDeals, updatePromotedDeal, updatePromotedDealStatus } from './deals/promotedDealStore.js';
import { getPublicSiteConfig, getSiteConfig, getSiteConfigStorageStatus, updateSiteConfig } from './site/siteConfigStore.js';
import { createContentPage, getContentPageStorageStatus, getPublicContentPageBySlug, listAdminContentPages, listPublicContentPages, updateContentPage, updateContentPageStatus } from './content/contentPageStore.js';
import { validatePartnerUrl } from '../src/services/partners/partnerDeepLinks.js';
import { PUBLIC_ANALYTICS_EVENT_TYPES, anonymiseIp, getAnalyticsStorageStatus, getAnalyticsSummary, listAnalyticsEvents, recordAnalyticsEvent, sanitiseMetadata, summariseUserAgent } from './analytics/analyticsStore.js';

const port = Number(process.env.PORT || 8787);
const registry = createTravelProviderRegistry(process.env);
const distDir = path.resolve(process.cwd(), 'dist');
const numberFromEnv = (name, fallback, { min = 0 } = {}) => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= min ? value : fallback;
};

const maxBodyBytes = numberFromEnv('API_MAX_BODY_BYTES', 1_000_000, { min: 1 });
const requestLogEnabled = `${process.env.REQUEST_LOGGING || 'true'}`.toLowerCase() !== 'false';
const hstsEnabled = `${process.env.ENABLE_HSTS || (process.env.NODE_ENV === 'production' ? 'true' : 'false')}`.toLowerCase() === 'true';
const rateLimitWindowMs = numberFromEnv('API_RATE_LIMIT_WINDOW_MS', 60_000, { min: 1 });
const publicRateLimitMax = numberFromEnv('API_RATE_LIMIT_MAX', 120);
const adminRateLimitMax = numberFromEnv('ADMIN_RATE_LIMIT_MAX', 60);
const enquiryRateLimitMax = numberFromEnv('ENQUIRY_RATE_LIMIT_MAX', 20);
const rateLimitBuckets = new Map();
const publicSiteUrl = (process.env.PUBLIC_SITE_URL || 'https://pickyholiday.co.uk').replace(/\/$/, '');
const publicAnalyticsEnabled = `${process.env.PUBLIC_ANALYTICS_ENABLED || 'true'}`.toLowerCase() !== 'false';
const webhookTestTimeoutMs = numberFromEnv('WEBHOOK_TEST_TIMEOUT_MS', 5000, { min: 100 });
const webhookTestAllowedHosts = () => `${process.env.WEBHOOK_TEST_ALLOWED_HOSTS || ''}`.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
const defaultTestAdminToken = 'pickyholiday-test-admin';
const testAdminAccessToken = () => `${process.env.TEST_ADMIN_ACCESS_TOKEN || defaultTestAdminToken}`;
const testAdminLoginEnabled = () => {
  if (process.env.ADMIN_ACCESS_TOKEN) return false;
  const configured = `${process.env.ENABLE_TEST_ADMIN_LOGIN || ''}`.toLowerCase();
  if (configured) return configured === 'true';
  return process.env.NODE_ENV !== 'production';
};

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


const securityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  ...(hstsEnabled ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
});

const requestIdFrom = (headers) => {
  const rawRequestId = Array.isArray(headers['x-request-id']) ? headers['x-request-id'][0] : headers['x-request-id'];
  const requestId = `${rawRequestId || ''}`.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(requestId) ? requestId : crypto.randomUUID();
};

const writeHead = (response, status, headers = {}) => {
  response.writeHead(status, {
    ...securityHeaders(),
    ...(response.requestId ? { 'X-Request-Id': response.requestId } : {}),
    ...headers,
  });
};

const clientIp = (request) => {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) return forwardedFor.split(',')[0].trim();
  return request.socket.remoteAddress || 'unknown';
};

const rateLimitPolicy = (request, pathname) => {
  if (!pathname.startsWith('/api/')) return null;
  if (request.method === 'OPTIONS' || request.method === 'GET') return null;
  if (pathname.startsWith('/api/admin/')) return { name: 'admin', max: adminRateLimitMax };
  if (request.method === 'POST' && pathname === '/api/travel/enquiries') return { name: 'enquiry', max: enquiryRateLimitMax };
  return { name: 'public-api', max: publicRateLimitMax };
};

const pruneRateLimitBuckets = (now) => {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
};

const checkRateLimit = (request, pathname) => {
  const policy = rateLimitPolicy(request, pathname);
  if (!policy || policy.max <= 0) return { limited: false, policy: policy?.name || 'none' };

  const now = Date.now();
  pruneRateLimitBuckets(now);
  const key = `${policy.name}:${clientIp(request)}`;
  const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    limited: bucket.count > policy.max,
    policy: policy.name,
    limit: policy.max,
    remaining: Math.max(0, policy.max - bucket.count),
    retryAfterSeconds,
    resetAt: new Date(bucket.resetAt).toISOString(),
  };
};

const redactHeaderValue = (value) => (value ? '[redacted]' : undefined);

const logRequest = (request, response, startedAt) => {
  if (!requestLogEnabled) return;
  const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000);
  console.log('[api-request]', {
    requestId: request.requestId,
    method: request.method,
    path: request.url?.split('?')[0],
    status: response.statusCode,
    durationMs,
    ip: clientIp(request),
    userAgent: request.headers['user-agent'],
    authorization: redactHeaderValue(request.headers.authorization),
  });
};

class BodyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  let receivedBytes = 0;
  let rejected = false;
  request.on('data', (chunk) => {
    if (rejected) return;
    receivedBytes += chunk.length;
    if (receivedBytes > maxBodyBytes) {
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
    writeHead(response, 403);
    response.end('Forbidden');
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');
    writeHead(response, 200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
    return true;
  } catch (error) {
    const indexPath = path.join(distDir, 'index.html');
    try {
      await stat(indexPath);
      writeHead(response, 200, { 'Content-Type': 'text/html' });
      createReadStream(indexPath).pipe(response);
      return true;
    } catch (indexError) {
      return false;
    }
  }
};

const defaultCorsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const allowedCorsOrigins = () => {
  if (!process.env.CORS_ORIGIN) return defaultCorsOrigins;
  const configuredOrigins = process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configuredOrigins.length > 0 ? configuredOrigins : defaultCorsOrigins;
};

const corsOrigin = (request) => {
  const allowedOrigins = allowedCorsOrigins();
  if (allowedOrigins.includes('*')) return '*';
  const requestOrigin = request.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0];
};

const sendText = (response, status, body, contentType) => {
  writeHead(response, status, { 'Content-Type': contentType });
  response.end(body);
};

const sendJson = (request, response, status, payload) => {
  writeHead(response, status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin(request),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    ...(payload?.rateLimit?.retryAfterSeconds ? { 'Retry-After': `${payload.rateLimit.retryAfterSeconds}` } : {}),
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


const safeAnalyticsFromRequest = (request, body = {}) => ({
  type: body.type,
  category: body.category,
  label: body.label,
  path: body.path,
  provider: body.provider,
  requestId: request.requestId,
  metadata: sanitiseMetadata(body.metadata || {}),
  anonymisedIp: anonymiseIp(clientIp(request)),
  userAgentSummary: summariseUserAgent(request.headers['user-agent'] || ''),
});

const recordAnalyticsSafely = async (event) => {
  try {
    return await recordAnalyticsEvent(event);
  } catch (error) {
    return null;
  }
};

const adminEnvelope = (extra = {}) => ({
  ok: true,
  providerMode: registry.mode,
  results: [],
  providerErrors: [],
  meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() },
  ...extra,
});

const buildHealthPayload = async (request) => {
  const [enquiryStorageStatus, promotedDealStorageStatus, siteConfigStorageStatus, contentPageStorageStatus, analyticsStorageStatus] = await Promise.all([
    getEnquiryStorageStatus(),
    getPromotedDealStorageStatus(),
    getSiteConfigStorageStatus(),
    getContentPageStorageStatus(),
    getAnalyticsStorageStatus(),
  ]);
  return {
    ...registry.status(),
    ...enquiryStorageStatus,
    ...promotedDealStorageStatus,
    ...siteConfigStorageStatus,
    ...contentPageStorageStatus,
    ...analyticsStorageStatus,
    observability: { requestId: request.requestId, requestLogging: requestLogEnabled },
    security: { hstsEnabled, maxBodyBytes, rateLimitWindowMs, publicRateLimitMax, adminRateLimitMax, enquiryRateLimitMax },
    adminSafeSettings: {
      analyticsStorageMode: analyticsStorageStatus.analyticsStorageMode,
      analyticsStorageStatus: analyticsStorageStatus.analyticsStorageStatus,
      webhookTestAllowlistConfigured: webhookTestAllowedHosts().length > 0,
      webhookTestTimeoutMs,
      publicAnalyticsEnabled,
      testAdminLoginEnabled: testAdminLoginEnabled(),
      frontendProviderModeExpected: process.env.VITE_TRAVEL_PROVIDER_MODE || 'api',
      backendProviderModeExpected: process.env.TRAVEL_PROVIDER_MODE || 'duffel',
    },
    productionWarnings: [
      ...(registry.mode === 'mock' ? ['TRAVEL_PROVIDER_MODE=mock is for local/dev only and should not be used for production launch.'] : []),
      ...(`${process.env.VITE_TRAVEL_PROVIDER_MODE || 'api'}` === 'mock' ? ['VITE_TRAVEL_PROVIDER_MODE=mock is for local/dev only and should not be used for production launch.'] : []),
      ...(testAdminLoginEnabled() && process.env.NODE_ENV === 'production' ? ['Temporary test admin login must be disabled in production.'] : []),
    ],
  };
};

const readinessFromHealth = (health) => {
  const storageStatuses = [
    health.databaseStatus,
    health.promotedDealStorageStatus,
    health.siteConfigStorageStatus,
    health.contentPageStorageStatus,
  ].filter(Boolean);
  const ready = storageStatuses.every((status) => !`${status}`.includes('error') && !`${status}`.includes('not-configured'));
  const analyticsRequired = health.analyticsStorageMode === 'postgres';
  const analyticsReady = !analyticsRequired || !['postgres-not-configured', 'postgres-error'].includes(health.analyticsStorageStatus);
  return { ready: ready && analyticsReady, analyticsRequired, analyticsReady };
};

const timedCheck = async (name, fn) => {
  const started = Date.now();
  try {
    const result = await fn();
    return { name, status: result?.status || 'pass', message: result?.message || 'Passed.', durationMs: Date.now() - started };
  } catch (error) {
    return { name, status: 'fail', message: error.status ? error.message : 'Check failed in a controlled way.', durationMs: Date.now() - started };
  }
};

const generateSitemapXml = async () => {
  const pages = await listPublicContentPages();
  const urls = ['/', ...pages.map((page) => page.canonicalPath)].map((item) => `${publicSiteUrl}${item.startsWith('/') ? item : `/${item}`}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((loc) => `  <url><loc>${loc.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>`;
};

const generateRobotsTxt = () => `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${publicSiteUrl}/sitemap.xml\n`;

const runOpsTests = async (request, includeWriteTests = false) => {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const checks = [];
  const add = async (name, fn) => checks.push(await timedCheck(name, fn));
  await add('/api/health payload builds', async () => ({ message: (await buildHealthPayload(request)).providerMode ? 'Health payload built without exposing secrets.' : 'Health payload missing provider mode.' }));
  await add('readiness/storage statuses', async () => { const health = await buildHealthPayload(request); const status = readinessFromHealth(health); return { status: status.ready ? 'pass' : 'warn', message: status.ready ? 'Configured storage is ready.' : 'One or more configured storage checks is warning or unavailable.' }; });
  await add('enquiry storage list', async () => ({ message: `${(await listEnquiries()).length} enquiries listed.` }));
  await add('promoted deal storage list', async () => ({ message: `${(await listPromotedDeals()).length} promoted deals listed.` }));
  await add('site config storage', async () => ({ message: (await getSiteConfig()).hero ? 'Site config loaded.' : 'Site config loaded with defaults.' }));
  await add('content page storage', async () => ({ message: `${(await listAdminContentPages()).length} content pages listed.` }));
  await add('public content pages list', async () => ({ message: `${(await listPublicContentPages()).length} public pages listed.` }));
  await add('public promoted deals list', async () => ({ message: `${(await listPublicPromotedDeals()).length} public deals listed.` }));
  await add('provider registry status', async () => ({ message: `${registry.status().activeProviders.length} active providers reported.` }));
  await add('frontend provider mode production default', async () => ({ status: `${process.env.VITE_TRAVEL_PROVIDER_MODE || 'api'}` === 'mock' ? 'warn' : 'pass', message: `Frontend provider mode is ${process.env.VITE_TRAVEL_PROVIDER_MODE || 'api'}; production should be api.` }));
  await add('backend provider mode production default', async () => ({ status: registry.mode === 'mock' ? 'warn' : 'pass', message: `Backend provider mode is ${registry.mode}; production should not be mock.` }));
  await add('/api/travel/search responds', async () => { const result = await searchWithPromotedDeals({ destination: 'Barcelona', intent: 'Holidays', origin: 'London (All Airports)', date: 'Flexible dates', groupSize: '8 people, 2+ rooms' }); return { message: `${result.results?.length || 0} search results returned from ${result.providerMode}.` }; });
  await add('partner-redirect provider enabled', async () => { const status = registry.status(); const provider = (status.providerStatus || []).find((item) => item.provider === 'partner-redirect'); return { status: provider?.configured ? 'pass' : 'warn', message: provider ? `partner-redirect is ${provider.mode}.` : 'partner-redirect provider was not reported.' }; });
  await add('partner URL safety validation', async () => ({ message: validatePartnerUrl('https://www.tui.co.uk/holidays/search?searchTerm=Barcelona', 'tui') && !validatePartnerUrl('javascript:alert(1)', 'tui') && !validatePartnerUrl('data:text/html,test', 'tui') && !validatePartnerUrl('http://www.tui.co.uk/holidays/', 'tui') ? 'Partner URL validation rejects unsafe protocols and accepts approved domains.' : 'Partner URL validation did not behave as expected.', status: validatePartnerUrl('https://www.tui.co.uk/holidays/search?searchTerm=Barcelona', 'tui') && !validatePartnerUrl('javascript:alert(1)', 'tui') && !validatePartnerUrl('http://www.tui.co.uk/holidays/', 'tui') ? 'pass' : 'fail' }));
  await add('mock fallback reporting', async () => ({ status: registry.mode === 'mock' ? 'warn' : 'pass', message: registry.mode === 'mock' ? 'Backend is explicitly in mock mode; production should switch to duffel/hybrid with partner redirects.' : 'Mock fallback will be reported via providerErrors/meta.fallbackUsed if frontend API mode cannot reach the backend.' }));
  await add('Duffel configured flag safe', async () => ({ message: `Duffel configured: ${Boolean(registry.status().duffelConfigured)}.` }));
  await add('database configured flag safe', async () => ({ message: `Database configured: ${Boolean(process.env.DATABASE_URL)}.` }));
  await add('sitemap generation', async () => ({ message: (await generateSitemapXml()).includes('<urlset') ? 'Sitemap generated.' : 'Sitemap output missing urlset.' }));
  await add('robots.txt generation', async () => ({ message: generateRobotsTxt().includes('Disallow: /admin') ? 'Robots generated.' : 'Robots output missing admin disallow.' }));
  if (includeWriteTests) {
    await add('optional write test enquiry', async () => {
      const record = await createEnquiry({ customerName: 'Admin Test', customerEmail: 'admin-test@example.invalid', destination: 'Barcelona', consentToContact: true, internalNotes: 'Automated admin test enquiry', source: 'admin-ops-write-test' });
      const found = (await listEnquiries()).some((item) => item.id === record.id);
      return { status: found ? 'pass' : 'fail', message: found ? `Created test enquiry ${record.id}; no email, booking, payment or reservation was created.` : 'Test enquiry could not be listed.' };
    });
  }
  const completedAt = new Date().toISOString();
  const ok = checks.every((check) => check.status !== 'fail');
  await recordAnalyticsSafely({ type: 'system_test_run', category: 'admin_ops', label: includeWriteTests ? 'write-tests' : 'safe-tests', requestId: request.requestId, metadata: { includeWriteTests, ok, checks: checks.length } });
  return { ok, requestId: request.requestId, startedAt, completedAt, durationMs: Date.now() - startMs, checks };
};

const validateWebhookTarget = (rawUrl) => {
  let target;
  try { target = new URL(rawUrl); } catch { const error = new Error('Webhook URL must be a valid URL.'); error.status = 400; throw error; }
  const protocol = target.protocol.toLowerCase();
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(target.hostname.toLowerCase());
  const devMode = ['development', 'test'].includes(process.env.NODE_ENV || '');
  if (protocol !== 'https:' && !(protocol === 'http:' && isLocal && devMode)) { const error = new Error('Webhook URL must use https. Localhost http is allowed only in development/test.'); error.status = 400; throw error; }
  const allowlist = webhookTestAllowedHosts();
  if (allowlist.length > 0 && !allowlist.includes(target.hostname.toLowerCase())) { const error = new Error('Webhook host is not on the configured allowlist.'); error.status = 400; throw error; }
  return target;
};

const testWebhook = async (request, body = {}) => {
  const target = validateWebhookTarget(body.url || '');
  const eventType = `${body.eventType || 'admin.test'}`.replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 80) || 'admin.test';
  const payload = sanitiseMetadata(body.payload || {});
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webhookTestTimeoutMs);
  try {
    const webhookResponse = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PickyHoliday-Test': 'true', 'X-PickyHoliday-Event': eventType }, body: JSON.stringify({ eventType, test: true, payload }), signal: controller.signal });
    const text = await webhookResponse.text().catch(() => '');
    const durationMs = Date.now() - started;
    await recordAnalyticsSafely({ type: 'webhook_test_sent', category: 'admin_ops', label: eventType, requestId: request.requestId, metadata: { host: target.hostname, path: target.pathname, statusCode: webhookResponse.status, durationMs } });
    return { ok: true, statusCode: webhookResponse.status, durationMs, responseSnippet: text.slice(0, 500) };
  } finally {
    clearTimeout(timeout);
  }
};

const canUseAdminRoutes = (request) => {
  const token = process.env.ADMIN_ACCESS_TOKEN;
  const header = request.headers.authorization || '';
  if (token) return header === `Bearer ${token}`;
  if (testAdminLoginEnabled() && header === `Bearer ${testAdminAccessToken()}`) return true;

  const explicitlyAllowed = `${process.env.ALLOW_UNPROTECTED_ADMIN || ''}`.toLowerCase() === 'true';
  const safeLocalMode = registry.mode === 'mock' && ['development', 'test'].includes(process.env.NODE_ENV || '');
  return explicitlyAllowed && safeLocalMode;
};

const mergeResultsById = (...resultSets) => {
  const seen = new Set();
  return resultSets.flat().filter((result) => {
    const id = result?.id || result?.resultId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const filterPromotedDealsForCriteria = (deals, criteria = {}) => {
  const destination = `${criteria.destination || ''}`.trim().toLowerCase();
  if (!destination) return deals;
  return deals.filter((deal) => `${deal.destination || ''} ${deal.country || ''} ${deal.hotelName || ''} ${deal.supplierName || ''} ${(deal.tags || []).join(' ')}`.toLowerCase().includes(destination));
};

const searchWithPromotedDeals = async (body, method = 'search') => {
  const envelope = await registry[method](body);
  let siteConfig;
  try {
    siteConfig = await getPublicSiteConfig();
  } catch (error) {
    siteConfig = { featureFlags: { enablePromotedDeals: true } };
  }

  if (siteConfig.featureFlags?.enablePromotedDeals === false) return envelope;

  try {
    const promotedDeals = filterPromotedDealsForCriteria(await listPublicPromotedDeals(), body);
    const results = mergeResultsById(promotedDeals, envelope.results || []);
    return {
      ...envelope,
      results,
      providerStatus: [
        ...(envelope.providerStatus || []),
        { provider: 'promoted-deals', configured: true, mode: 'admin-managed', ok: true, resultCount: promotedDeals.length, lastMethod: method },
      ],
      meta: {
        ...(envelope.meta || {}),
        totalResults: results.length,
        activeProviders: [...new Set([...(envelope.meta?.activeProviders || []), 'promoted-deals'])],
      },
    };
  } catch (error) {
    return {
      ...envelope,
      providerErrors: [
        ...(envelope.providerErrors || []),
        { provider: 'promoted-deals', method, message: 'Promoted deals are temporarily unavailable.' },
      ],
    };
  }
};

const postRoutes = {
  '/api/travel/search': (body) => searchWithPromotedDeals(body, 'search'),
  '/api/travel/flights': (body) => registry.flights(body),
  '/api/travel/hotels': (body) => registry.hotels(body),
  '/api/travel/packages': (body) => searchWithPromotedDeals(body, 'packages'),
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
  const startedAt = process.hrtime.bigint();
  request.requestId = requestIdFrom(request.headers);
  response.requestId = request.requestId;
  response.on('finish', () => logRequest(request, response, startedAt));

  const url = new URL(request.url, `http://${request.headers.host}`);
  const rateLimit = checkRateLimit(request, url.pathname);
  if (rateLimit.limited) {
    sendJson(request, response, 429, errorEnvelope(429, 'Too many requests. Please wait before trying again.', { rateLimit }));
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(request, response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(request, response, 200, await buildHealthPayload(request));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/readiness') {
    const health = await buildHealthPayload(request);
    const { ready } = readinessFromHealth(health);
    sendJson(request, response, ready ? 200 : 503, {
      ok: ready,
      providerMode: registry.mode,
      results: [],
      providerErrors: ready ? [] : [{ provider: 'storage', method: 'readiness', message: 'One or more configured storage backends are not ready. Analytics is warning-only unless postgres analytics is selected.' }],
      providerStatus: registry.status().providerStatus,
      storage: {
        enquiryStorageMode: health.enquiryStorageMode,
        databaseConfigured: health.databaseConfigured,
        databaseStatus: health.databaseStatus,
        promotedDealStorageMode: health.promotedDealStorageMode,
        promotedDealStorageStatus: health.promotedDealStorageStatus,
        siteConfigStorageMode: health.siteConfigStorageMode,
        siteConfigStorageStatus: health.siteConfigStorageStatus,
        contentPageStorageMode: health.contentPageStorageMode,
        contentPageStorageStatus: health.contentPageStorageStatus,
        analyticsStorageMode: health.analyticsStorageMode,
        analyticsStorageStatus: health.analyticsStorageStatus,
      },
      observability: { requestId: request.requestId, requestLogging: requestLogEnabled },
      meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString(), status: ready ? 200 : 503 },
    });
    return;
  }


  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    try {
      sendText(response, 200, await generateSitemapXml(), 'application/xml');
    } catch (error) {
      sendText(response, 503, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', 'application/xml');
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/robots.txt') {
    sendText(response, 200, generateRobotsTxt(), 'text/plain');
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/content/pages') {
    try {
      const type = url.searchParams.get('type') || undefined;
      const pages = await listPublicContentPages({ type });
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: pages, providerErrors: [], meta: { totalResults: pages.length, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Content pages are temporarily unavailable.'));
    }
    return;
  }

  const publicContentMatch = url.pathname.match(/^\/api\/content\/pages\/([^/]+)$/);
  if (request.method === 'GET' && publicContentMatch) {
    try {
      const page = await getPublicContentPageBySlug(decodeURIComponent(publicContentMatch[1] || ''));
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [page], page, providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not read content page.'));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/site-config') {
    try {
      const siteConfig = await getPublicSiteConfig();
      sendJson(request, response, 200, {
        ok: true,
        providerMode: registry.mode,
        results: [],
        providerErrors: [],
        siteConfig,
        meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      sendJson(request, response, 503, errorEnvelope(503, 'Site configuration is temporarily unavailable.'));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/deals/promoted') {
    try {
      const deals = await listPublicPromotedDeals();
      sendJson(request, response, 200, {
        ok: true,
        providerMode: registry.mode,
        results: deals,
        providerErrors: [],
        meta: { totalResults: deals.length, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      sendJson(request, response, 200, {
        ok: true,
        providerMode: registry.mode,
        results: [],
        providerErrors: [{ provider: 'promoted-deals', method: 'list', message: 'Promoted deals are temporarily unavailable.' }],
        meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() },
      });
    }
    return;
  }




  if (request.method === 'POST' && url.pathname === '/api/analytics/events') {
    if (!publicAnalyticsEnabled) {
      sendJson(request, response, 200, adminEnvelope({ event: null, message: 'Public analytics capture is disabled.' }));
      return;
    }
    try {
      const body = await readJsonBody(request);
      if (!PUBLIC_ANALYTICS_EVENT_TYPES.includes(body.type)) {
        sendJson(request, response, 400, errorEnvelope(400, 'Unsupported public analytics event type.'));
        return;
      }
      const event = await recordAnalyticsEvent(safeAnalyticsFromRequest(request, body));
      sendJson(request, response, 201, adminEnvelope({ event: { id: event.id, createdAt: event.createdAt, type: event.type } }));
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not capture analytics event.'));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/analytics/summary') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const summary = await getAnalyticsSummary();
      sendJson(request, response, 200, adminEnvelope({ summary }));
    } catch (error) { sendJson(request, response, 503, errorEnvelope(503, 'Could not read analytics summary.')); }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/analytics/events') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200);
      const events = await listAnalyticsEvents({ limit });
      sendJson(request, response, 200, adminEnvelope({ results: events, meta: { totalResults: events.length, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } }));
    } catch (error) { sendJson(request, response, 503, errorEnvelope(503, 'Could not read analytics events.')); }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/ops/run-tests') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const body = await readJsonBody(request);
      const result = await runOpsTests(request, body.includeWriteTests === true);
      sendJson(request, response, 200, adminEnvelope(result));
    } catch (error) { sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not run operations tests.')); }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/ops/test-webhook') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const result = await testWebhook(request, await readJsonBody(request));
      sendJson(request, response, 200, adminEnvelope({ webhook: result }));
    } catch (error) {
      const status = error.status || (error.name === 'AbortError' ? 504 : 502);
      sendJson(request, response, status, errorEnvelope(status, error.status ? error.message : (error.name === 'AbortError' ? 'Webhook test timed out.' : 'Webhook test failed.')));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/content-pages') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const pages = await listAdminContentPages({ type: url.searchParams.get('type') || undefined, status: url.searchParams.get('status') || undefined });
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: pages, providerErrors: [], meta: { totalResults: pages.length, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) { sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not read content pages.')); }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/content-pages') {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const page = await createContentPage(await readJsonBody(request));
      await recordAnalyticsSafely({ type: 'admin_content_page_saved', category: 'admin', label: page.slug || page.title, requestId: request.requestId, metadata: { id: page.id, status: page.status } });
      sendJson(request, response, 201, { ok: true, providerMode: registry.mode, results: [page], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) { sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not create content page.', { fieldErrors: error.fieldErrors || [] })); }
    return;
  }

  const adminContentStatusMatch = url.pathname.match(/^\/api\/admin\/content-pages\/([^/]+)\/status$/);
  if (request.method === 'PATCH' && adminContentStatusMatch) {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const body = await readJsonBody(request);
      const page = await updateContentPageStatus(decodeURIComponent(adminContentStatusMatch[1] || ''), body.status);
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [page], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) { sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not update content page status.', { fieldErrors: error.fieldErrors || [] })); }
    return;
  }

  const adminContentMatch = url.pathname.match(/^\/api\/admin\/content-pages\/([^/]+)$/);
  if (request.method === 'PATCH' && adminContentMatch) {
    if (!canUseAdminRoutes(request)) { sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.')); return; }
    try {
      const page = await updateContentPage(decodeURIComponent(adminContentMatch[1] || ''), await readJsonBody(request));
      await recordAnalyticsSafely({ type: 'admin_content_page_saved', category: 'admin', label: page.slug || page.title, requestId: request.requestId, metadata: { id: page.id, status: page.status } });
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [page], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) { sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not update content page.', { fieldErrors: error.fieldErrors || [] })); }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/promoted-deals') {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const deals = await listPromotedDeals();
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: deals, providerErrors: [], meta: { totalResults: deals.length, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not read promoted deals.'));
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/promoted-deals') {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const deal = await createPromotedDeal(await readJsonBody(request));
      await recordAnalyticsSafely({ type: 'admin_promoted_deal_saved', category: 'admin', label: deal.title || deal.hotelName, requestId: request.requestId, metadata: { id: deal.id, status: deal.status } });
      sendJson(request, response, 201, { ok: true, providerMode: registry.mode, results: [deal], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not create promoted deal.', { fieldErrors: error.fieldErrors || [] }));
    }
    return;
  }

  const adminDealStatusMatch = url.pathname.match(/^\/api\/admin\/promoted-deals\/([^/]+)\/status$/);
  if (request.method === 'PATCH' && adminDealStatusMatch) {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const body = await readJsonBody(request);
      const deal = await updatePromotedDealStatus(decodeURIComponent(adminDealStatusMatch[1] || ''), body.status);
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [deal], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not update promoted deal status.', { fieldErrors: error.fieldErrors || [] }));
    }
    return;
  }

  const adminDealMatch = url.pathname.match(/^\/api\/admin\/promoted-deals\/([^/]+)$/);
  if (request.method === 'PATCH' && adminDealMatch) {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const deal = await updatePromotedDeal(decodeURIComponent(adminDealMatch[1] || ''), await readJsonBody(request));
      await recordAnalyticsSafely({ type: 'admin_promoted_deal_saved', category: 'admin', label: deal.title || deal.hotelName, requestId: request.requestId, metadata: { id: deal.id, status: deal.status } });
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [deal], providerErrors: [], meta: { totalResults: 1, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not update promoted deal.', { fieldErrors: error.fieldErrors || [] }));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/site-config') {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const siteConfig = await getSiteConfig();
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [], providerErrors: [], siteConfig, meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not read site config.'));
    }
    return;
  }

  if (request.method === 'PATCH' && url.pathname === '/api/admin/site-config') {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const siteConfig = await updateSiteConfig(await readJsonBody(request));
      sendJson(request, response, 200, { ok: true, providerMode: registry.mode, results: [], providerErrors: [], siteConfig, meta: { totalResults: 0, activeProviders: registry.status().activeProviders, timestamp: new Date().toISOString() } });
    } catch (error) {
      sendJson(request, response, error.status || 503, errorEnvelope(error.status || 503, error.status ? error.message : 'Could not update site config.'));
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/enquiries') {
    if (!canUseAdminRoutes(request)) {
      await recordAnalyticsSafely({
        type: 'admin_login_failed',
        category: 'admin_auth',
        label: 'admin-enquiries',
        requestId: request.requestId,
        metadata: { path: url.pathname },
        anonymisedIp: anonymiseIp(clientIp(request)),
        userAgentSummary: summariseUserAgent(request.headers['user-agent'] || ''),
      });
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      await recordAnalyticsSafely({
        type: 'admin_login_success',
        category: 'admin_auth',
        label: 'admin-enquiries',
        requestId: request.requestId,
        metadata: { path: url.pathname },
        anonymisedIp: anonymiseIp(clientIp(request)),
        userAgentSummary: summariseUserAgent(request.headers['user-agent'] || ''),
      });
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
      sendJson(request, response, error.status || 500, errorEnvelope(error.status || 500, error.status ? error.message : 'Could not read enquiries.'));
    }
    return;
  }

  const adminStatusMatch = url.pathname.match(/^\/api\/admin\/enquiries\/([^/]+)\/status$/);

  if (request.method === 'PATCH' && adminStatusMatch) {
    if (!canUseAdminRoutes(request)) {
      sendJson(request, response, 401, errorEnvelope(401, 'Admin authorisation required.'));
      return;
    }
    try {
      const body = await readJsonBody(request);
      const id = decodeURIComponent(adminStatusMatch[1] || '');
      const updated = await updateEnquiryStatus(id, body.status);
      await recordAnalyticsSafely({ type: 'admin_status_update', category: 'admin', label: body.status, requestId: request.requestId, metadata: { id } });
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
      const message = status === 503 ? error.message : (status >= 500 ? 'Could not update enquiry.' : error.message);
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
      await recordAnalyticsSafely({ type: 'enquiry_created', category: 'enquiry', label: payload.enquiry?.destination || body.destination, requestId: request.requestId, metadata: { destination: payload.enquiry?.destination || body.destination, source: body.source || 'public' } });
      sendJson(request, response, 200, payload);
    } catch (error) {
      const status = error.status || 500;
      const message = status === 503 ? error.message : (status >= 500 ? 'Could not save enquiry.' : error.message);
      console.error('[api-error]', { route: url.pathname, status, message: error.message });
      sendJson(request, response, status, errorEnvelope(status, message, { fieldErrors: error.fieldErrors || [] }));
    }
    return;
  }

  if (request.method === 'POST' && postRoutes[url.pathname]) {
    try {
      const body = await readJsonBody(request);
      const payload = await postRoutes[url.pathname](body);
      if (url.pathname === '/api/travel/search') await recordAnalyticsSafely({ type: 'search_submitted', category: 'search', label: body.destination || body.intent || 'search', requestId: request.requestId, metadata: { destination: body.destination || '', intent: body.intent || '' } });
      if ((payload.providerErrors || []).length) await recordAnalyticsSafely({ type: 'api_provider_error', category: 'provider', label: url.pathname, requestId: request.requestId, metadata: { errors: (payload.providerErrors || []).map((item) => item.provider).slice(0, 5) } });
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
