import { spawn } from 'node:child_process';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createTravelProviderRegistry } from '../server/travelProviderRegistry.js';
import { validatePartnerUrl } from '../src/services/partners/partnerDeepLinks.js';
import { criteriaFromSearchParams, criteriaToSearchParams, normaliseHolidaySearchCriteria } from '../src/services/search/holidaySearchCriteria.js';
import { departureAirportCodeLookup, departureAirports, destinationAirportCodeLookup, destinationSuggestions, normaliseTravelOptionText, popularDestinationChips } from '../src/data/travelOptions.js';

const shouldStartLocalServer = !process.env.API_BASE_URL;
const baseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
const fallbackTestAdminAccessToken = process.env.TEST_ADMIN_ACCESS_TOKEN || 'pickyholiday-test-admin';
const adminAccessToken = process.env.ADMIN_ACCESS_TOKEN || (shouldStartLocalServer ? fallbackTestAdminAccessToken : '');
const unprotectedAdminAllowed = `${process.env.ALLOW_UNPROTECTED_ADMIN || ''}`.toLowerCase() === 'true';
let localServer;
const jsonStorePaths = [
  '../data/content-pages.json',
  '../data/analytics-events.json',
  '../data/enquiries.json',
  '../data/promoted-deals.json',
  '../data/site-config.json',
].map((item) => new URL(item, import.meta.url));
const jsonStoreBackups = new Map();

const backupJsonStores = async () => {
  if (!shouldStartLocalServer) return;
  await Promise.all(jsonStorePaths.map(async (storePath) => {
    const contents = await readFile(storePath, 'utf8').catch(() => null);
    jsonStoreBackups.set(storePath.href, contents);
  }));
};

const restoreJsonStores = async () => {
  if (!shouldStartLocalServer || jsonStoreBackups.size === 0) return;
  await Promise.all(jsonStorePaths.map(async (storePath) => {
    const contents = jsonStoreBackups.get(storePath.href);
    if (contents === null) {
      await rm(storePath, { force: true });
      return;
    }
    if (contents !== undefined) await writeFile(storePath, contents);
  }));
};

const waitForLocalServer = async () => {
  if (!shouldStartLocalServer) return;
  const serverEnv = {
    ...process.env,
    PORT: '8787',
    NODE_ENV: 'test',
    PROMOTED_DEAL_STORAGE_MODE: 'json',
    SITE_CONFIG_STORAGE_MODE: 'json',
    CONTENT_PAGE_STORAGE_MODE: 'json',
    ANALYTICS_STORAGE_MODE: 'json',
    PUBLIC_ANALYTICS_ENABLED: 'true',
    REQUEST_LOGGING: 'false',
    ENQUIRY_RATE_LIMIT_MAX: '3',
    TRAVEL_PROVIDER_MODE: process.env.SMOKE_TRAVEL_PROVIDER_MODE || 'duffel',
    VITE_TRAVEL_PROVIDER_MODE: process.env.SMOKE_VITE_TRAVEL_PROVIDER_MODE || 'api',
    VITE_SHOW_DEMO_DEALS: process.env.VITE_SHOW_DEMO_DEALS || 'false',
    ENABLE_PARTNER_REDIRECTS: process.env.ENABLE_PARTNER_REDIRECTS || 'true',
    PARTNER_REDIRECT_PROVIDER_MODE: process.env.PARTNER_REDIRECT_PROVIDER_MODE || 'enabled',
    ENABLE_BOOKING_DEMAND: process.env.ENABLE_BOOKING_DEMAND || 'false',
    BOOKING_DEMAND_MODE: process.env.BOOKING_DEMAND_MODE || 'disabled',
  };
  if (process.env.ADMIN_ACCESS_TOKEN) serverEnv.ADMIN_ACCESS_TOKEN = adminAccessToken;
  else {
    delete serverEnv.ADMIN_ACCESS_TOKEN;
    serverEnv.ENABLE_TEST_ADMIN_LOGIN = 'true';
    serverEnv.TEST_ADMIN_ACCESS_TOKEN = fallbackTestAdminAccessToken;
  }
  localServer = spawn(process.execPath, ['server/index.js'], {
    env: serverEnv,
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
  { method: 'POST', path: '/api/travel/search', body: { destination: 'Lisbon', origin: 'Amsterdam', originAirport: 'Amsterdam', intent: 'Holidays', adults: 4, children: 0, rooms: 2, nights: 5 } },
  { method: 'POST', path: '/api/travel/flights', body: { destination: 'Barcelona', origin: 'London (All Airports)' } },
  { method: 'POST', path: '/api/travel/hotels', body: { destination: 'Barcelona', intent: 'Group hotel stays' } },
  { method: 'POST', path: '/api/travel/packages', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/holiday-composer', body: { destination: 'Barcelona', originAirport: 'Manchester', departureDate: '2026-08-10', returnDate: '2026-08-17', dateFlexibilityDays: 2, flexibleDates: true, adults: 6, children: 2, rooms: 3, intent: 'Holidays', sort: 'recommended' } },
  { method: 'POST', path: '/api/travel/enquiries', body: { destination: 'Barcelona', customerName: 'Smoke Test', customerEmail: 'smoke@example.com', consentToContact: true } },
  { method: 'POST', path: '/api/travel/enquiries', body: {
    destination: 'Barcelona',
    customerName: 'Smoke Quote Builder',
    customerEmail: 'quote-builder@example.com',
    consentToContact: true,
    budgetPerPerson: 650,
    roomMix: '3 twin rooms and 1 double room',
    occasionType: 'Birthday group trip',
    quoteBuilderVersion: 'group-shortlist-v1',
    shortlistedDeals: [
      { resultId: 'smoke-result-1', destination: 'Barcelona', country: 'Spain', hotelName: 'Smoke Group Hotel', supplierName: 'Smoke Supplier', provider: 'partner-redirect', partnerId: 'loveholidays', priceFrom: 499, currency: 'GBP', boardBasis: 'Half board', baggageLabel: 'Bags checked separately', bookingMode: 'affiliate', protectionLabel: 'Enquiry only — no automatic booking or payment.', hasPartnerRedirect: true },
    ],
  } },
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
  if (!providerNames.includes('partner-redirect')) throw new Error('/api/health did not include partner-redirect in providerStatus.');
  if (data.providerMode === 'mock') throw new Error('/api/health defaulted to mock provider mode.');
  if (typeof data.partnerRedirectConfigured !== 'boolean') throw new Error('/api/health did not expose partnerRedirectConfigured true/false.');
  if (data.primaryFlightProvider !== 'duffel') throw new Error('/api/health did not report Duffel as the primary flight provider.');
  if (typeof data.duffelConfigured !== 'boolean') throw new Error('/api/health did not expose Duffel configured true/false.');
  if (typeof data.amadeusConfigured !== 'boolean') throw new Error('/api/health did not expose Amadeus configured true/false.');
  if (typeof data.amadeusSecondaryEnabled !== 'boolean') throw new Error('/api/health did not expose Amadeus secondary status.');
  if (typeof data.affiliatePackageConfigured !== 'boolean') throw new Error('/api/health did not expose affiliate package configured true/false.');
  if (typeof data.bookingDemandConfigured !== 'boolean' || typeof data.bookingDemandEnabled !== 'boolean') throw new Error('/api/health did not expose Booking.com Demand safe configured/enabled flags.');
  if (!(data.providerStatus || []).some((provider) => provider.provider === 'booking-demand')) throw new Error('/api/health did not include booking-demand in providerStatus.');
  if (!['json', 'postgres'].includes(data.enquiryStorageMode)) throw new Error('/api/health did not expose enquiryStorageMode.');
  if (typeof data.databaseConfigured !== 'boolean') throw new Error('/api/health did not expose databaseConfigured true/false.');
  if (!['json', 'postgres-ready', 'postgres-not-configured', 'postgres-error'].includes(data.databaseStatus)) throw new Error('/api/health did not expose a valid databaseStatus.');
  if (!['json', 'postgres'].includes(data.promotedDealStorageMode)) throw new Error('/api/health did not expose promotedDealStorageMode.');
  if (!data.promotedDealStorageStatus) throw new Error('/api/health did not expose promotedDealStorageStatus.');
  if (!data.siteConfigStorageStatus) throw new Error('/api/health did not expose siteConfigStorageStatus.');
  if (!['json', 'postgres'].includes(data.contentPageStorageMode)) throw new Error('/api/health did not expose contentPageStorageMode.');
  if (!['json', 'postgres-ready', 'postgres-not-configured', 'postgres-error'].includes(data.contentPageStorageStatus)) throw new Error('/api/health did not expose a valid contentPageStorageStatus.');
  if (!['json', 'postgres-ready', 'postgres-not-configured', 'postgres-error'].includes(data.analyticsStorageStatus)) throw new Error('/api/health did not expose a valid analyticsStorageStatus.');
  if (!['json', 'postgres'].includes(data.analyticsStorageMode)) throw new Error('/api/health did not expose analyticsStorageMode.');
  if (!data.observability?.requestId) throw new Error('/api/health did not expose observability.requestId.');
  if (!data.security || typeof data.security.maxBodyBytes !== 'number') throw new Error('/api/health did not expose security limits.');
  if (typeof data.adminSafeSettings?.testAdminLoginEnabled !== 'boolean') throw new Error('/api/health did not expose temporary test admin login status.');
  const healthJson = JSON.stringify(data);
  if (healthJson.includes('postgres://') || healthJson.includes('postgresql://')) {
    throw new Error('/api/health appeared to expose a database connection string.');
  }
  for (const secretName of ['DATABASE_URL', 'PGPASSWORD', 'ADMIN_ACCESS_TOKEN', 'BOOKING_DEMAND_API_KEY', 'BOOKING_DEMAND_AFFILIATE_ID']) {
    if (healthJson.includes(secretName)) throw new Error(`/api/health appeared to expose ${secretName}.`);
  }
};

const assertReadiness = (data) => {
  if (data.ok !== true) throw new Error('/api/readiness did not report ready in JSON storage smoke mode.');
  if (!data.storage || !data.observability?.requestId) throw new Error('/api/readiness did not expose storage and observability details.');
};

const assertSiteConfig = (data) => {
  if (!data.siteConfig?.hero || !data.siteConfig?.featureFlags) throw new Error('/api/site-config did not include safe public config.');
  if (data.siteConfig.featureFlags.showProviderDiagnostics === true) throw new Error('/api/site-config made provider diagnostics publicly visible by default.');
  const body = JSON.stringify(data);
  for (const secretName of ['DATABASE_URL', 'ADMIN_ACCESS_TOKEN', 'DUFFEL_ACCESS_TOKEN', 'AMADEUS_CLIENT_SECRET']) {
    if (body.includes(secretName)) throw new Error(`/api/site-config appeared to expose ${secretName}.`);
  }
  if (body.includes('postgres://') || body.includes('postgresql://')) throw new Error('/api/site-config appeared to expose a database URL.');
};

const assertFlightResults = (data) => {
  if (data.providerMode === 'mock' && !data.results.some((result) => ['flight-only', 'flight-hotel'].includes(result.resultType))) {
    throw new Error('/api/travel/flights did not return flight-capable mock results.');
  }
};

const assertPackageResults = (data) => {
  if (!data.results.some((result) => result.resultType === 'package' || result.provider === 'partner-redirect')) {
    throw new Error('/api/travel/packages did not return package results.');
  }
  if (!data.results.every((result) => ['affiliate', 'manual-quote', 'enquiry'].includes(result.bookingMode))) {
    throw new Error('/api/travel/packages returned an unexpected booking mode.');
  }
  if (JSON.stringify(data.results).toLowerCase().includes('booking confirmed')) {
    throw new Error('/api/travel/packages appeared to claim a completed customer booking.');
  }
};

const assertComposedHolidayResults = (data, label) => {
  if (!Array.isArray(data.results)) throw new Error(`${label} did not include a results array.`);
  for (const key of ['providerMode', 'providerErrors', 'meta']) {
    if (!(key in data)) throw new Error(`${label} did not include ${key}.`);
  }
  if (!Array.isArray(data.providerErrors)) throw new Error(`${label} providerErrors was not an array.`);
  if (data.meta?.resultShape !== 'composed-holiday-v1') throw new Error(`${label} did not expose composed-holiday-v1 resultShape.`);
  if (!data.meta?.criteria || data.meta.criteria.dateFlexibilityDays !== 2 || data.meta.criteria.adults !== 6 || data.meta.criteria.children !== 2 || data.meta.criteria.partySize !== 8 || data.meta.criteria.rooms !== 3) throw new Error(`${label} did not normalise richer search criteria.`);
  const requiredFields = ['id', 'resultType', 'provider', 'supplierName', 'destination', 'hotelName', 'hotelSummary', 'flightSummary', 'departureAirport', 'dateLabel', 'nights', 'groupSizeLabel', 'rooms', 'roomMix', 'priceFrom', 'currency', 'priceQualifier', 'score', 'scoreReasons', 'dealReasonLabel', 'bookingMode', 'protectionLabel', 'sourceBreakdown'];
  for (const result of data.results) {
    if (result.resultType !== 'composed-holiday') throw new Error(`${label} returned a non-composed resultType: ${result.resultType}`);
    for (const field of requiredFields) {
      if (!(field in result)) throw new Error(`${label} result ${result.id} missed normalised field ${field}.`);
    }
    if (!Array.isArray(result.scoreReasons)) throw new Error(`${label} result ${result.id} missed scoreReasons array.`);
    if (result.partnerUrl && !validatePartnerUrl(result.partnerUrl, result.partnerId || undefined)) throw new Error(`${label} returned an unsafe partnerUrl: ${result.partnerUrl}`);
  }
  const body = JSON.stringify(data).toLowerCase();
  for (const blocked of ['book now', 'booking confirmed', 'reserved', 'payment successful', 'guaranteed price', 'atol protected']) {
    if (body.includes(blocked)) throw new Error(`${label} contained forbidden wording: ${blocked}.`);
  }
};

const assertSearchResults = (data, label) => {
  if (!Array.isArray(data.results)) throw new Error(`${label} did not include a results array.`);
  if (data.providerMode === 'mock' && data.results.length === 0) throw new Error(`${label} returned no mock results.`);
  if (label.includes('/api/travel/search') && !data.results.some((result) => result.provider === 'partner-redirect')) throw new Error(`${label} did not return partner redirect results.`);
  for (const result of data.results.filter((item) => item.partnerUrl)) {
    if (!validatePartnerUrl(result.partnerUrl, result.partnerId || undefined)) throw new Error(`${label} returned an unsafe partnerUrl: ${result.partnerUrl}`);
  }
  const body = JSON.stringify(data).toLowerCase();
  for (const blocked of ['booking confirmed', 'book now', 'atol protected', 'supplier reservation']) {
    if (body.includes(blocked)) throw new Error(`${label} contained forbidden wording: ${blocked}.`);
  }
};

const assertEnquiry = (data) => {
  if (!data.enquiry?.id) {
    throw new Error('/api/travel/enquiries did not return an enquiry id.');
  }
  if (!data.enquiry?.message?.toLowerCase().includes('no booking created by pickyholiday')) {
    throw new Error('/api/travel/enquiries did not return the expected mock enquiry-only message.');
  }
  const body = JSON.stringify(data).toLowerCase();
  for (const blocked of ['booking confirmed', 'book now', 'atol protected', 'guaranteed price', 'payment successful']) {
    if (body.includes(blocked)) throw new Error(`/api/travel/enquiries contained forbidden wording: ${blocked}.`);
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
  if (path === '/api/travel/search') assertSearchResults(data, label);
  if (path === '/api/travel/holiday-composer') assertComposedHolidayResults(data, label);
  if (path === '/api/travel/enquiries') assertEnquiry(data);
  return data;
};


const assertAdminUnauthorized = async () => {
  for (const path of ['/api/admin/enquiries', '/api/admin/promoted-deals', '/api/admin/content-pages', '/api/admin/site-config', '/api/admin/analytics/summary', '/api/admin/analytics/events']) {
    const response = await fetch(`${baseUrl}${path}`);
    const data = await parseJson(response, `GET ${path} unauthorized`);
    if (response.status !== 401) throw new Error(`GET ${path} without token returned ${response.status}, expected 401.`);
    assertEnvelope(data, `GET ${path} unauthorized`);
  }

  for (const path of ['/api/admin/ops/run-tests', '/api/admin/ops/test-webhook']) {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await parseJson(response, `POST ${path} unauthorized`);
    if (response.status !== 401) throw new Error(`POST ${path} without token returned ${response.status}, expected 401.`);
    assertEnvelope(data, `POST ${path} unauthorized`);
  }
};


const assertAnalyticsAndOps = async () => {
  const publicEvent = await fetch(`${baseUrl}/api/analytics/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'shortlist_added', label: 'Barcelona', metadata: { destination: 'Barcelona', resultId: 'smoke-result-1', provider: 'partner-redirect', shortlistCount: 1, source: 'smoke', ADMIN_ACCESS_TOKEN: 'should-not-store' } }) });
  const publicData = await parseJson(publicEvent, 'POST /api/analytics/events');
  if (publicEvent.status !== 201 || publicData.event?.type !== 'shortlist_added') throw new Error('Public analytics event was not accepted.');
  const unsafeEvent = await fetch(`${baseUrl}/api/analytics/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'admin_login_success' }) });
  if (unsafeEvent.status !== 400) throw new Error(`Unsafe analytics event returned ${unsafeEvent.status}, expected 400.`);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` };
  const summary = await fetch(`${baseUrl}/api/admin/analytics/summary`, { headers });
  const summaryData = await parseJson(summary, 'GET /api/admin/analytics/summary');
  if (!summary.ok || !summaryData.summary || typeof summaryData.summary.searchesToday !== 'number') throw new Error('Admin analytics summary did not include counters.');
  const events = await fetch(`${baseUrl}/api/admin/analytics/events?limit=20`, { headers });
  const eventsData = await parseJson(events, 'GET /api/admin/analytics/events');
  if (!events.ok || !Array.isArray(eventsData.results)) throw new Error('Admin analytics events did not return results.');
  const body = JSON.stringify(eventsData);
  for (const secret of ['ADMIN_ACCESS_TOKEN', 'DATABASE_URL', 'postgres://', 'postgresql://', 'should-not-store']) {
    if (body.includes(secret)) throw new Error(`Analytics events exposed ${secret}.`);
  }
  const ops = await fetch(`${baseUrl}/api/admin/ops/run-tests`, { method: 'POST', headers, body: JSON.stringify({ includeWriteTests: false }) });
  const opsData = await parseJson(ops, 'POST /api/admin/ops/run-tests');
  if (!ops.ok || !Array.isArray(opsData.checks) || opsData.checks.length === 0) throw new Error('Ops run-tests did not return checks.');
  for (const checkName of ['frontend provider mode production default', 'backend provider mode production default', 'partner-redirect provider enabled', 'partner URL safety validation']) {
    if (!opsData.checks.some((check) => check.name === checkName)) throw new Error(`Ops run-tests did not include ${checkName}.`);
  }
  const invalidWebhook = await fetch(`${baseUrl}/api/admin/ops/test-webhook`, { method: 'POST', headers, body: JSON.stringify({ url: 'not-a-url', eventType: 'test', payload: {} }) });
  if (invalidWebhook.status !== 400) throw new Error(`Invalid webhook URL returned ${invalidWebhook.status}, expected 400.`);
  for (const badUrl of ['javascript:alert(1)', 'data:text/plain,hello']) {
    const bad = await fetch(`${baseUrl}/api/admin/ops/test-webhook`, { method: 'POST', headers, body: JSON.stringify({ url: badUrl, eventType: 'test', payload: {} }) });
    if (bad.status !== 400) throw new Error(`${badUrl} webhook URL returned ${bad.status}, expected 400.`);
  }
  console.log('✓ Analytics and admin ops endpoints passed');
};

const assertAdminPromotedDeals = async () => {
  const headers = { 'Content-Type': 'application/json', ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}) };
  if (!adminAccessToken && !unprotectedAdminAllowed) {
    console.log('• Skipping admin promoted deal mutation checks because ADMIN_ACCESS_TOKEN is not set.');
    return;
  }
  const unique = `Smoke promoted ${Date.now()}`;
  const createResponse = await fetch(`${baseUrl}/api/admin/promoted-deals`, { method: 'POST', headers, body: JSON.stringify({ title: unique, destination: 'Barcelona', status: 'active', dealType: 'affiliate', bookingMode: 'affiliate', partnerId: 'tui', partnerUrl: 'https://www.tui.co.uk/holidays/search?searchTerm=Barcelona', tags: 'Holidays, Smoke' }) });
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
  const badDataUrl = await fetch(`${baseUrl}/api/admin/promoted-deals`, { method: 'POST', headers, body: JSON.stringify({ title: `${unique} data bad`, destination: 'Barcelona', bookingMode: 'affiliate', partnerUrl: 'data:text/html,bad' }) });
  if (badDataUrl.status !== 400) throw new Error(`Invalid data partner URL returned ${badDataUrl.status}, expected 400.`);
  const badPartnerDomain = await fetch(`${baseUrl}/api/admin/promoted-deals`, { method: 'POST', headers, body: JSON.stringify({ title: `${unique} domain bad`, destination: 'Barcelona', bookingMode: 'affiliate', partnerId: 'tui', partnerUrl: 'https://example.com/not-tui' }) });
  if (badPartnerDomain.status !== 400) throw new Error(`Invalid partner domain returned ${badPartnerDomain.status}, expected 400.`);
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

const assertPublicAppRoutes = async () => {
  const routes = ['/', '/search?destination=Barcelona&originAirport=Manchester&adults=6&children=2&rooms=3', '/search?destination=Lisbon&originAirport=Amsterdam&adults=4&children=0&rooms=2&nights=5', '/search?destination=Barcelona&originAirport=Manchester&partySize=8&budgetPerPerson=450&rooms=3', '/admin', '/admin/login', '/admin/enquiries', '/admin/deals', '/admin/pages', '/admin/content', '/admin/features', '/admin/settings', '/admin/ops', '/destinations/barcelona', '/group-holidays/stag-and-hen', '/guides/best-group-holiday-destinations'];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    assertResponseHardening(response, `GET ${route}`);
    const text = await response.text();
    if (!response.ok || !text.includes('PickyHoliday')) throw new Error(`${route} did not return the built app shell. Run npm run build before npm run test:api.`);
    if ((route.startsWith('/search') || route.startsWith('/admin')) && !text.includes('id="root"')) throw new Error(`${route} app shell did not include the React root.`);
    if (route === '/admin/login' && text.includes('pickyholiday-admin-token')) throw new Error('/admin/login shell exposed the sessionStorage admin token key before client JS executed.');
  }
  console.log('✓ Public, search, admin and content app routes returned the built app shell after the frontend refactor');
};

const assertBuiltFrontendSecrets = async () => {
  const assetDir = new URL('../dist/assets/', import.meta.url);
  const files = await readdir(assetDir).catch(() => []);
  const assetFiles = files.filter((item) => item.endsWith('.js') || item.endsWith('.css'));
  if (assetFiles.length === 0) throw new Error('No built frontend assets found under dist/assets. Run npm run build before npm run test:api.');
  const forbidden = ['BOOKING_DEMAND_API_KEY', 'BOOKING_DEMAND_AFFILIATE_ID', 'secret-booking-key', 'affiliate-secret', 'DUFFEL_ACCESS_TOKEN', 'AMADEUS_CLIENT_SECRET', 'postgres://', 'postgresql://'];
  for (const file of assetFiles) {
    const text = await readFile(new URL(file, assetDir), 'utf8');
    for (const marker of forbidden) {
      if (text.includes(marker)) throw new Error(`Built frontend asset ${file} exposed ${marker}.`);
    }
  }
  console.log('✓ Built frontend assets did not expose Booking.com, supplier, admin or database secret markers');
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


const assertTravelOptions = () => {
  const airportLabels = new Set(departureAirports.map((airport) => airport.label));
  for (const label of ['London (All Airports)', 'Manchester', 'Dublin', 'Amsterdam', 'Lisbon', 'Athens', 'Larnaca']) {
    if (!airportLabels.has(label)) throw new Error(`Expanded departure airport options did not include ${label}.`);
  }
  const destinationLabels = new Set(destinationSuggestions.map((destination) => destination.label));
  for (const label of ['Barcelona', 'Albufeira', 'Zante', 'Ayia Napa', 'Dubrovnik', 'Reykjavik']) {
    if (!destinationLabels.has(label)) throw new Error(`Expanded destination suggestions did not include ${label}.`);
  }
  if (airportLabels.size !== departureAirports.length) throw new Error('Expanded departure airport options included duplicate labels.');
  if (destinationLabels.size !== destinationSuggestions.length) throw new Error('Expanded destination suggestions included duplicate labels.');
  if (departureAirportCodeLookup.amsterdam !== 'AMS' || departureAirportCodeLookup[normaliseTravelOptionText('Paris Charles de Gaulle')] !== 'CDG') throw new Error('Expanded airport code lookup did not include European airport codes.');
  if (destinationAirportCodeLookup.majorca !== 'PMI' || destinationAirportCodeLookup.zakynthos !== 'ZTH' || destinationAirportCodeLookup[normaliseTravelOptionText('Ayia Napa')] !== 'LCA') throw new Error('Destination alias code lookup did not include common European destination aliases.');
  if (destinationAirportCodeLookup[normaliseTravelOptionText('St Julian’s')] !== 'MLA' || destinationAirportCodeLookup[normaliseTravelOptionText('St Julians')] !== 'MLA') throw new Error('Destination lookup did not normalise apostrophe variants.');
  if (popularDestinationChips.length < 8 || popularDestinationChips.length > 10) throw new Error('Popular destination chips should stay within the compact 8-10 chip range.');
  if (!popularDestinationChips.every((chip) => destinationLabels.has(chip))) throw new Error('Popular destination chips should all exist in destination suggestions.');
  if (!popularDestinationChips.includes('Amsterdam') || !popularDestinationChips.includes('Majorca')) throw new Error('Popular destination chips missed key European group-holiday destinations.');
  console.log('✓ Expanded European airport, destination suggestion and popular chip data passed');
};

const assertHolidayCriteriaSearchParams = () => {
  const criteria = normaliseHolidaySearchCriteria({ destination: 'Barcelona', originAirport: 'Manchester', adults: 6, children: 2, rooms: 3, partySize: 12 });
  if (criteria.partySize !== 8) throw new Error('Adults and children did not drive the derived partySize.');
  const params = criteriaToSearchParams(criteria);
  for (const [key, expected] of [['adults', '6'], ['children', '2'], ['rooms', '3']]) {
    if (params.get(key) !== expected) throw new Error(`/search params did not include ${key}=${expected}.`);
  }
  if (params.has('budgetPerPerson')) throw new Error('Default hero-style search params unexpectedly included budgetPerPerson.');
  const legacy = criteriaFromSearchParams('destination=Barcelona&partySize=8&budgetPerPerson=450&rooms=3');
  if (legacy.partySize !== 8 || legacy.adults !== 8 || legacy.budgetPerPerson !== 450 || legacy.rooms !== 3) throw new Error('Legacy partySize/budgetPerPerson search URL did not remain compatible.');
  console.log('✓ Holiday criteria params preserved adults, children, rooms and legacy budget compatibility');
};

const assertProviderModeDefaults = () => {
  const defaultRegistry = createTravelProviderRegistry({});
  if (defaultRegistry.mode !== 'duffel') throw new Error('Backend registry did not default to duffel.');
  if (!defaultRegistry.status().activeProviders.includes('partner-redirect')) throw new Error('Default backend registry did not include partner-redirect.');
  const mockRegistry = createTravelProviderRegistry({ TRAVEL_PROVIDER_MODE: 'mock' });
  if (mockRegistry.mode !== 'mock' || !mockRegistry.status().activeProviders.includes('mock')) throw new Error('Explicit TRAVEL_PROVIDER_MODE=mock did not keep mock mode working.');
  if (!validatePartnerUrl('https://www.tui.co.uk/holidays/', 'tui') || validatePartnerUrl('javascript:alert(1)', 'tui') || validatePartnerUrl('data:text/html,bad', 'tui') || validatePartnerUrl('http://www.tui.co.uk/holidays/', 'tui')) throw new Error('Partner URL validation default checks failed.');
  console.log('✓ Provider mode defaults and partner URL validation helpers passed');
};

try {
  assertProviderModeDefaults();
  assertTravelOptions();
  assertHolidayCriteriaSearchParams();
  await backupJsonStores();
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
  await assertAnalyticsAndOps();
  await assertAdminPromotedDeals();
  await assertContentPages();
  await assertSitemapAndRobots();
  await assertPublicAppRoutes();
  await assertBuiltFrontendSecrets();
  if (adminAccessToken) console.log('✓ GET /api/admin/enquiries returned enquiries for configured admin token');
  await assertInvalidEnquiryEmail();
  console.log('✓ POST /api/travel/enquiries invalid email returned controlled 400 envelope');
  await assertBadJson();
  console.log('✓ POST /api/travel/search bad JSON returned controlled 400 envelope');
  await assertRateLimit();
  console.log('✓ POST /api/travel/enquiries rate limit returned controlled 429 envelope');
} finally {
  stopLocalServer();
  await restoreJsonStores();
}
