const baseUrl = process.env.API_BASE_URL || 'http://localhost:8787';

const endpoints = [
  { method: 'GET', path: '/api/health' },
  { method: 'POST', path: '/api/travel/search', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/flights', body: { destination: 'Barcelona', origin: 'London (All Airports)' } },
  { method: 'POST', path: '/api/travel/hotels', body: { destination: 'Barcelona', intent: 'Group hotel stays' } },
  { method: 'POST', path: '/api/travel/packages', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/holiday-composer', body: { destination: 'Barcelona', intent: 'Holidays' } },
  { method: 'POST', path: '/api/travel/enquiries', body: { resultId: 'smoke-test', destination: 'Barcelona' } },
  { method: 'GET', path: '/api/travel/locations?keyword=barcelona' },
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

const assertHealth = (data) => {
  const providerNames = (data.providerStatus || data.providers || []).map((provider) => provider.provider);
  if (!providerNames.includes('duffel')) throw new Error('/api/health did not include Duffel in providerStatus.');
  if (data.primaryFlightProvider !== 'duffel') throw new Error('/api/health did not report Duffel as the primary flight provider.');
  if (typeof data.duffelConfigured !== 'boolean') throw new Error('/api/health did not expose Duffel configured true/false.');
  if (typeof data.amadeusConfigured !== 'boolean') throw new Error('/api/health did not expose Amadeus configured true/false.');
  if (typeof data.amadeusSecondaryEnabled !== 'boolean') throw new Error('/api/health did not expose Amadeus secondary status.');
};

const assertFlightResults = (data) => {
  if (!data.results.some((result) => ['flight-only', 'flight-hotel'].includes(result.resultType))) {
    throw new Error('/api/travel/flights did not return flight-capable mock results.');
  }
};

const assertSearchResults = (data, label) => {
  if (!Array.isArray(data.results)) throw new Error(`${label} did not include a results array.`);
  if (data.providerMode === 'mock' && data.results.length === 0) throw new Error(`${label} returned no mock results.`);
};

const assertEnquiry = (data) => {
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
  const data = await parseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(data)}`);
  }
  assertEnvelope(data, label);
  if (path === '/api/health') assertHealth(data);
  if (path === '/api/travel/flights') assertFlightResults(data);
  if (['/api/travel/search', '/api/travel/holiday-composer'].includes(path)) assertSearchResults(data, label);
  if (path === '/api/travel/enquiries') assertEnquiry(data);
  return data;
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

console.log(`Running PickyHoliday API smoke tests against ${baseUrl}`);
for (const endpoint of endpoints) {
  const data = await request(endpoint);
  console.log(`✓ ${endpoint.method} ${endpoint.path} (${data.providerMode} mode)`);
}
await assertBadJson();
console.log('✓ POST /api/travel/search bad JSON returned controlled 400 envelope');
