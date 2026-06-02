import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const shouldStartLocalServer = !process.env.API_BASE_URL;
const baseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
const adminAccessToken = process.env.ADMIN_ACCESS_TOKEN || (shouldStartLocalServer ? 'smoke-admin-token' : '');
const unprotectedAdminAllowed = `${process.env.ALLOW_UNPROTECTED_ADMIN || ''}`.toLowerCase() === 'true';
let localServer;
let contentPageJsonBackup;
const contentPageJsonPath = new URL('../data/content-pages.json', import.meta.url);

const backupContentPageJson = async () => {
  if (!shouldStartLocalServer) return;
  contentPageJsonBackup = await readFile(contentPageJsonPath, 'utf8').catch(() => null);
};

const restoreContentPageJson = async () => {
  if (!shouldStartLocalServer || contentPageJsonBackup === undefined) return;
  if (contentPageJsonBackup !== null) await writeFile(contentPageJsonPath, contentPageJsonBackup);
};

const waitForLocalServer = async () => {
  if (!shouldStartLocalServer) return;
  localServer = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: '8787', NODE_ENV: 'test', ADMIN_ACCESS_TOKEN: adminAccessToken, PROMOTED_DEAL_STORAGE_MODE: 'json', SITE_CONFIG_STORAGE_MODE: 'json', CONTENT_PAGE_STORAGE_MODE: 'json', REQUEST_LOGGING: 'false', ENQUIRY_RATE_LIMIT_MAX: '3' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  localServer.stdout.on('data', (chunk) => process.stdout.write(chunk));
  localServer.stderr.on('data', (chunk) => process.stderr.write(chunk));
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('Local smoke-test API server did not start on port 8787.');
};

const stopLocalServer = () => {
  if (localServer) localServer.kill();
};
process.on('exit', stopLocalServer);
process.on('SIGINT', () => { stopLocalServer(); process.exit(130); });

const endpoints = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/readiness' },
  { method: 'POST', path: '/api/travel/search', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/flights', body: { destination: 'Barcelona', origin: 'London (All Airports)' } },
  { method: 'POST', path: '/api/travel/hotels', body: { destination: 'Barcelona', intent: 'Group hotel stays' } },
  { method: 'POST', path: '/api/travel/packages', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/holiday-composer', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/enquiries', body: { destination: 'Barcelona', customerName: 'Smoke Test', customerEmail: 'smoke@example.com', consentToContact: true } },
  { method: 'GET', path: '/api/travel/locations?keyword=barcelona' },
  { method: 'GET', path: '/api/site-config' },
  { method: 'GET', path: '/api/deals/promoted' },
  { method: 'GET', path: '/api/content/pages' },
  { method: 'GET', path: '/api/content/pages/barcelona' },
];

const parseJson = async (response, label) => {
  const data = await response.json().catch(() => null);
  if (!data) throw new Error(`${label} did not return JSON.`);
  return data;
};

const assertEnvelope = (data, label) => {
  if (!data.providerMode) throw new Error(`${label} did not include providerMode.`);
  if (!Array.isArray(data.providerErrors)) throw new Error(`${label} did not include providerErrors array.`);
  if (!data.meta || typeof data.meta.totalResults !== 'number' || !Array.isArray(data.meta.activeProviders)) {
    throw new Error(`${label} did not include a complete meta envelope.`);
  }
};

const assertResponseHardening = (response, label) => {
  if (!response.headers.get('x-request-id')) throw new Error(`${label} did not include X-Request-Id.`);
  if (response.headers.get('x-content-type-options') !== 'nosniff') throw new Error(`${label} did not include X-Content-Type-Options: nosniff.`);
  if (response.headers.get('x-frame-options') !== 'DENY') throw new Error(`${label} did not include X-Frame-Options: DENY.`);
  if (!response.headers.get('referrer-policy')) throw new Error(`${label} did not include Referrer-Policy.`);
};

const assertHealth = (data) => {
  const providerNames = (data.providerStatus || data.providers || []).map((provider) => provider.provider);
  if (!providerNames.includes('duffel')) throw new Error('/api/health did not include Duffel in providerStatus.');
  if (!providerNames.includes('affiliate-package')) throw new Error('/api/health did not include affiliate-package in providerStatus.');
  if (data.primaryFlightProvider !== 'duffel') throw new Error('/api/health did not report Duffel as the primary flight provider.');
  if (typeof data.duffelConfigured !== 'boolean') throw new Error('/api/health did not expose Duffel configured true/false.');
  if (typeof data.amadeusConfigured !== 'boolean') throw new Error('/api/health did not expose Amadeus configured true/false.');
  if (typeof data.amadeusSecondaryEnabled !== 'boolean') throw new Error('/api/health did not expose Amadeus secondary status.');
  if (typeof data.affiliatePackageConfigured !== 'boolean') throw new Error('/api/health did not expose affiliate package configured true/false.');
  if (!['json', 'postgres'].includes(data.enquiryStorageMode)) throw new Error('/api/health did not expose enquiryStorageMode.');
  if (typeof data.databaseConfigured !== 'boolean') throw new Error('/api/health did not expose databaseConfigured true/false.');
  if (!['json', 'postgres-ready', 'postgres-not-configured', 'postgres-error'].includes(data.databaseStatus)) throw new Error('/api/health did not expose a valid databaseStatus.');
  if (!['json', 'postgres'].includes(data.promotedDealStorageMode)) throw new Error('/api/health did not expose promotedDealStorageMode.');
  if (!data.promotedDealStorageStatus) throw new Error('/api/health did not expose promotedDealStorageStatus.');
  if (!data.siteConfigStorageStatus) throw new Error('/api/health did not expose siteConfigStorageStatus.');
  if (!['json', 'postgres'].includes(data.contentPageStorageMode)) throw new Error('/api/health did not expose contentPageStorageMode.');
  if (!['json', 'postgres-ready', 'postgres-not-configured', 'postgres-error'].includes(data.contentPageStorageStatus)) throw new Error('/api/health did not expose a valid contentPageStorageStatus.');
  if (!data.observability?.requestId) throw new Error('/api/health did not expose observability.requestId.');
  if (!data.security || typeof data.security.maxBodyBytes !== 'number') throw new Error('/api/health did not expose security limits.');
  const healthJson = JSON.stringify(data);
  if (healthJson.includes('postgres://') || healthJson.includes('postgresql://')) {
    throw new Error('/api/health appeared to expose a database connection string.');
  }
  for (const secretName of ['DATABASE_URL', 'PGPASSWORD', 'ADMIN_ACCESS_TOKEN']) {
    if (healthJson.includes(secretName)) throw new Error(`/api/health appeared to expose ${secretName}.`);
  }
};

const assertReadiness = (data) => {
  if (data.ok !== true) throw new Error('/api/readiness did not report ready in JSON storage smoke mode.');
  if (!data.storage || !data.observability?.requestId) throw new Error('/api/readiness did not expose storage and observability details.');
};

const assertSiteConfig = (data) => {
  if (!data.siteConfig?.hero || !data.siteConfig?.featureFlags) throw new Error('/api/site-config did not include safe public config.');
  const body = JSON.stringify(data);
  for (const secretName of ['DATABASE_URL', 'ADMIN_ACCESS_TOKEN', 'DUFFEL_ACCESS_TOKEN', 'AMADEUS_CLIENT_SECRET']) {
    if (body.includes(secretName)) throw new Error(`/api/site-config appeared to expose ${secretName}.`);
  }
  if (body.includes('postgres://') || body.includes('postgresql://')) throw new Error('/api/site-config appeared to expose a database URL.');
};

const assertFlightResults = (data) => {
  if (!data.results.some((result) => ['flight-only', 'flight-hotel'].includes(result.resultType))) {
    throw new Error('/api/travel/flights did not return flight-capable mock results.');
  }
};

const assertPackageResults = (data) => {
  if (!data.results.some((result) => result.resultType === 'package')) {
    throw new Error('/api/travel/packages did not return package results.');
  }
  if (!data.results.every((result) => ['affiliate', 'manual-quote', 'enquiry'].includes(result.bookingMode))) {
    throw new Error('/api/travel/packages returned an unexpected booking mode.');
  }
  if (JSON.stringify(data.results).toLowerCase().includes('booking confirmed')) {
    throw new Error('/api/travel/packages appeared to claim a live booking confirmation.');
  }
};

const assertSearchResults = (data, label) => {
  if (!Array.isArray(data.results)) throw new Error(`${label} did not include a results array.`);
  if (data.providerMode === 'mock' && data.results.length === 0) throw new Error(`${label} returned no mock results.`);
};

const assertEnquiry = (data) => {
  if (!data.enquiry?.id) {
    throw new Error('/api/travel/enquiries did not return an enquiry id.');
  }
  if (!data.enquiry?.message?.toLowerCase().includes('not a booking confirmation')) {
    throw new Error('/api/travel/enquiries did not return the expected mock enquiry-only message.');
  }
};

const request = async ({ method, path, body }) => {
  const label = `${method} ${path}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  assertResponseHardening(response, label);
  const data = await parseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(data)}`);
  }
  assertEnvelope(data, label);
  if (path === '/api/health') assertHealth(data);
  if (path === '/api/readiness') assertReadiness(data);
  if (path === '/api/site-config') assertSiteConfig(data);
  if (path === '/api/deals/promoted' && !Array.isArray(data.results)) throw new Error('/api/deals/promoted did not return a results array.');
  if (path === '/api/content/pages') {
    if (!Array.isArray(data.results)) throw new Error('/api/content/pages did not return a results array.');
    if (!data.results.some((page) => page.slug === 'barcelona')) throw new Error('/api/content/pages did not include seeded Barcelona page.');
    const contentJson = JSON.stringify(data);
    if (contentJson.includes('internalNotes') || contentJson.includes('\"status\"')) throw new Error('/api/content/pages exposed admin-only fields.');
  }
  if (path === '/api/content/pages/barcelona') {
    if (data.page?.slug !== 'barcelona') throw new Error('/api/content/pages/barcelona did not return a published page.');
    const pageJson = JSON.stringify(data);
    if (pageJson.includes('internalNotes') || pageJson.includes('\"status\"')) throw new Error('/api/content/pages/:slug exposed admin-only fields.');
  }
  if (path === '/api/travel/flights') assertFlightResults(data);
  if (path === '/api/travel/packages') assertPackageResults(data);
  if (['/api/travel/search', '/api/travel/holiday-composer'].includes(path)) assertSearchResults(data, label);
  if (path === '/api/travel/enquiries') assertEnquiry(data);
  return data;
};


const assertAdminUnauthorized = async () => {
  for (const path of ['/api/admin/enquiries', '/api/admin/promoted-deals', '/api/admin/content-pages', '/api/admin/site-config']) {
    const response = await fetch(`${baseUrl}${path}`);
    const data = await parseJson(response, `GET ${path} unauthorized`);
    if (response.status !== 401) throw new Error(`GET ${path} without token returned ${response.status}, expected 401.`);
    assertEnvelope(data, `GET ${path} unauthorized`);
  }
};

const assertAdminPromotedDeals = async () => {
  const headers = { 'Content-Type': 'application/json', ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}) };
  if (!adminAccessToken && !unprotectedAdminAllowed) {
    console.log('• Skipping admin promoted deal mutation checks because ADMIN_ACCESS_TOKEN is not set.');
    return;
  }
  const unique = `Smoke promoted ${Date.now()}`;
  const createResponse = await fetch(`${baseUrl}/api/admin/promoted-deals`, { method: 'POST', headers, body: JSON.stringify({ title: unique, destination: 'Barcelona', status: 'active', dealType: 'affiliate', bookingMode: 'affiliate', partnerUrl: 'https://example.com/pickyholiday-smoke', tags: 'Holidays, Smoke' }) });
  const createdData = await parseJson(createResponse, 'POST /api/admin/promoted-deals');
  if (!createResponse.ok) throw new Error(`POST /api/admin/promoted-deals failed: ${JSON.stringify(createdData)}`);
  const created = createdData.results?.[0];
  if (!created?.id) throw new Error('Created promoted deal did not include an id.');
  const publicActive = await request({ method: 'GET', path: '/api/deals/promoted' });
  if (!publicActive.results.some((deal) => deal.hotelName === unique || deal.title === unique)) throw new Error('Active promoted deal did not appear publicly.');
  const searchActive = await request({ method: 'POST', path: '/api/travel/search', body: { destination: 'Barcelona', intent: 'Holidays' } });
  if (!searchActive.results.some((deal) => deal.hotelName === unique || deal.title === unique)) throw new Error('Active promoted deal did not appear in public search results.');
  const invalidStatus = await fetch(`${baseUrl}/api/admin/promoted-deals/${encodeURIComponent(created.id)}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'sold-out' }) });
  if (invalidStatus.status !== 400) throw new Error(`Invalid promoted deal status returned ${invalidStatus.status}, expected 400.`);
  await fetch(`${baseUrl}/api/admin/promoted-deals/${encodeURIComponent(created.id)}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'paused' }) });
  const publicPaused = await request({ method: 'GET', path: '/api/deals/promoted' });
  if (publicPaused.results.some((deal) => deal.hotelName === unique || deal.title === unique)) throw new Error('Paused promoted deal appeared publicly.');
  const searchPaused = await request({ method: 'POST', path: '/api/travel/search', body: { destination: 'Barcelona', intent: 'Holidays' } });
  if (searchPaused.results.some((deal) => deal.hotelName === unique || deal.title === unique)) throw new Error('Paused promoted deal appeared in public search results.');
  const badUrl = await fetch(`${baseUrl}/api/admin/promoted-deals`, { method: 'POST', headers, body: JSON.stringify({ title: `${unique} bad`, destination: 'Barcelona', bookingMode: 'affiliate', partnerUrl: 'javascript:alert(1)' }) });
  if (badUrl.status !== 400) throw new Error(`Invalid partner URL returned ${badUrl.status}, expected 400.`);
  const sitePatch = await fetch(`${baseUrl}/api/admin/site-config`, { method: 'PATCH', headers, body: JSON.stringify({ announcement: { active: false, text: 'Smoke checked' } }) });
  const siteData = await parseJson(sitePatch, 'PATCH /api/admin/site-config');
  if (!sitePatch.ok || siteData.siteConfig?.announcement?.text !== 'Smoke checked') throw new Error('Admin site config patch failed.');
  console.log('✓ Admin promoted deal create/status/site-config checks passed');
};


const assertContentPages = async () => {
  const headers = { 'Content-Type': 'application/json', ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}) };
  if (!adminAccessToken && !unprotectedAdminAllowed) {
    console.log('• Skipping admin content page mutation checks because ADMIN_ACCESS_TOKEN is not set.');
    return;
  }
  const unique = `smoke-content-${Date.now()}`;
  const createResponse = await fetch(`${baseUrl}/api/admin/content-pages`, { method: 'POST', headers, body: JSON.stringify({ title: 'Smoke draft page', slug: unique, type: 'guide', status: 'draft', metaDescription: 'Smoke test draft page.', intro: 'Draft should not be public.', internalNotes: 'private smoke note' }) });
  const createdData = await parseJson(createResponse, 'POST /api/admin/content-pages');
  if (!createResponse.ok) throw new Error(`POST /api/admin/content-pages failed: ${JSON.stringify(createdData)}`);
  const created = createdData.results?.[0];
  if (!created?.id) throw new Error('Created content page did not include an id.');
  const draftPublic = await fetch(`${baseUrl}/api/content/pages/${unique}`);
  if (draftPublic.status !== 404) throw new Error(`Draft content page returned ${draftPublic.status}, expected public 404.`);
  const patchResponse = await fetch(`${baseUrl}/api/admin/content-pages/${encodeURIComponent(created.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ title: 'Smoke published page', slug: unique, type: 'guide', status: 'draft', intro: 'Updated draft content.', searchDefaults: { destination: 'Barcelona' }, tags: 'Smoke, Guide' }) });
  const patchedData = await parseJson(patchResponse, 'PATCH /api/admin/content-pages/:id');
  if (!patchResponse.ok || patchedData.results?.[0]?.title !== 'Smoke published page') throw new Error('Content page patch failed.');
  await fetch(`${baseUrl}/api/admin/content-pages/${encodeURIComponent(created.id)}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'published' }) });
  const publicPage = await request({ method: 'GET', path: `/api/content/pages/${unique}` });
  if (publicPage.page?.slug !== unique) throw new Error('Published content page did not appear publicly.');
  if (JSON.stringify(publicPage).includes('internalNotes') || JSON.stringify(publicPage).includes('\"status\"')) throw new Error('Published content page exposed admin-only fields.');
  await fetch(`${baseUrl}/api/admin/content-pages/${encodeURIComponent(created.id)}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'archived' }) });
  const archivedPublic = await fetch(`${baseUrl}/api/content/pages/${unique}`);
  if (archivedPublic.status !== 404) throw new Error(`Archived content page returned ${archivedPublic.status}, expected public 404.`);
  const duplicate = await fetch(`${baseUrl}/api/admin/content-pages`, { method: 'POST', headers, body: JSON.stringify({ title: 'Duplicate slug', slug: 'barcelona', type: 'destination', status: 'draft' }) });
  if (duplicate.status !== 409) throw new Error(`Duplicate content slug returned ${duplicate.status}, expected 409.`);
  console.log('✓ Admin content-page create/update/status checks passed');
};

const assertSitemapAndRobots = async () => {
  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapText = await sitemap.text();
  assertResponseHardening(sitemap, 'GET /sitemap.xml');
  if (!sitemap.ok || !sitemapText.includes('<urlset') || !sitemapText.includes('/destinations/barcelona')) throw new Error('/sitemap.xml did not include published content pages.');
  const robots = await fetch(`${baseUrl}/robots.txt`);
  const robotsText = await robots.text();
  assertResponseHardening(robots, 'GET /robots.txt');
  if (!robots.ok || !robotsText.includes('Disallow: /admin') || !robotsText.includes('Sitemap:')) throw new Error('/robots.txt did not disallow admin and reference sitemap.');
  console.log('✓ Sitemap and robots checks passed');
};

const assertAdminList = async () => {
  if (!adminAccessToken) {
    console.log('• Skipping GET /api/admin/enquiries because ADMIN_ACCESS_TOKEN is not set.');
    return;
  }

  const label = 'GET /api/admin/enquiries';
  const response = await fetch(`${baseUrl}/api/admin/enquiries`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });
  const data = await parseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(data)}`);
  }
  assertEnvelope(data, label);
  if (!Array.isArray(data.results)) throw new Error(`${label} did not return an enquiries array.`);
};

const assertInvalidEnquiryEmail = async () => {
  const label = 'POST /api/travel/enquiries invalid email';
  const response = await fetch(`${baseUrl}/api/travel/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      destination: 'Barcelona',
      customerName: 'Test User',
      customerEmail: 'bad-email',
      consentToContact: true,
    }),
  });
  const data = await parseJson(response, label);
  if (response.status !== 400) throw new Error(`${label} returned ${response.status}, expected 400.`);
  assertEnvelope(data, label);
  if (!data.fieldErrors?.some((fieldError) => fieldError.field === 'customerEmail')) {
    throw new Error(`${label} did not include a customerEmail validation error.`);
  }
};


const assertRateLimit = async () => {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': `smoke-rate-limit-${Date.now()}` };
  let limitedData;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/travel/enquiries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ destination: 'Barcelona', customerName: 'Rate Limit', customerEmail: 'bad-email', consentToContact: true }),
    });
    const data = await parseJson(response, `POST /api/travel/enquiries rate limit attempt ${attempt + 1}`);
    if (response.status === 429) {
      assertEnvelope(data, 'POST /api/travel/enquiries rate limit');
      if (!data.rateLimit?.retryAfterSeconds) throw new Error('Rate limit response did not include retry metadata.');
      if (!response.headers.get('retry-after')) throw new Error('Rate limit response did not include Retry-After header.');
      limitedData = data;
      break;
    }
    if (response.status !== 400) throw new Error(`Rate limit setup attempt returned ${response.status}, expected validation 400 before limit.`);
  }
  if (!limitedData) throw new Error('POST /api/travel/enquiries did not return 429 after repeated requests.');
};

const assertBadJson = async () => {
  const label = 'POST /api/travel/search bad JSON';
  const response = await fetch(`${baseUrl}/api/travel/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad',
  });
  const data = await parseJson(response, label);
  if (response.status !== 400) throw new Error(`${label} returned ${response.status}, expected 400.`);
  assertEnvelope(data, label);
  if (!data.providerErrors[0]?.message?.includes('Invalid JSON')) {
    throw new Error(`${label} did not include the expected controlled error message.`);
  }
};

try {
  await backupContentPageJson();
  await waitForLocalServer();
  console.log(`Running PickyHoliday API smoke tests against ${baseUrl}`);
  for (const endpoint of endpoints) {
    const data = await request(endpoint);
    console.log(`✓ ${endpoint.method} ${endpoint.path} (${data.providerMode} mode)`);
  }
  if (unprotectedAdminAllowed && !adminAccessToken) {
    console.log('• Skipping unauthorized admin checks because ALLOW_UNPROTECTED_ADMIN=true for local test override.');
  } else {
    await assertAdminUnauthorized();
    console.log('✓ Admin routes without a token returned controlled 401 envelopes');
  }
  await assertAdminList();
  await assertAdminPromotedDeals();
  await assertContentPages();
  await assertSitemapAndRobots();
  if (adminAccessToken) console.log('✓ GET /api/admin/enquiries returned enquiries for configured admin token');
  await assertInvalidEnquiryEmail();
  console.log('✓ POST /api/travel/enquiries invalid email returned controlled 400 envelope');
  await assertBadJson();
  console.log('✓ POST /api/travel/search bad JSON returned controlled 400 envelope');
  await assertRateLimit();
  console.log('✓ POST /api/travel/enquiries rate limit returned controlled 429 envelope');
} finally {
  stopLocalServer();
  await restoreContentPageJson();
}
