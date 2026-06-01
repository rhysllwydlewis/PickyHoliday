import { mockProvider } from './providers/mockProvider.js';
import { createAffiliatePackageProvider } from './providers/affiliatePackageProvider.js';

const travelProviderMode = import.meta.env.VITE_TRAVEL_PROVIDER_MODE || 'mock';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const localAffiliatePackageProvider = createAffiliatePackageProvider();

const apiUrl = (path) => `${apiBaseUrl}${path}`;

const apiPost = async (path, payload) => {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.providerErrors?.[0]?.message || `Travel API request failed: ${response.status}`);
  return data;
};

const apiGet = async (path) => {
  const response = await fetch(apiUrl(path));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.providerErrors?.[0]?.message || `Travel API request failed: ${response.status}`);
  return data;
};

const localMockProviders = [mockProvider, localAffiliatePackageProvider];

const providerStatus = (provider, resultCount = 0) => (provider.getStatus
  ? { ...provider.getStatus(), ok: true, resultCount }
  : { provider: provider.id, configured: true, mode: 'mock-ready', ok: true, resultCount });

const mockEnvelope = async (method, criteria) => {
  const providerResults = await Promise.all(localMockProviders.map(async (provider) => {
    if (!provider[method]) return { provider, results: [], skipped: true };
    const results = await provider[method](criteria);
    return { provider, results: Array.isArray(results) ? results : [] };
  }));
  const results = providerResults.flatMap((item) => item.results);
  return {
    providerMode: 'mock',
    results,
    providerErrors: [],
    providerStatus: providerResults.map((item) => ({ ...providerStatus(item.provider, item.results.length), skipped: Boolean(item.skipped), lastMethod: method })),
    meta: { totalResults: results.length, activeProviders: localMockProviders.map((provider) => provider.id), timestamp: new Date().toISOString() },
  };
};

export function getFrontendProviderMode() {
  return travelProviderMode;
}

export async function getProviderStatus() {
  if (travelProviderMode === 'mock') {
    const affiliateStatus = localAffiliatePackageProvider.getStatus();
    return {
      ok: true,
      providerMode: 'mock',
      activeProviders: ['mock', 'affiliate-package'],
      primaryFlightProvider: 'duffel',
      duffelPreferredForFlights: true,
      duffelConfigured: false,
      amadeusConfigured: false,
      amadeusSecondaryEnabled: false,
      affiliatePackageConfigured: affiliateStatus.configured,
      providers: [
        { provider: 'mock', configured: true, mode: 'mock-ready' },
        { provider: 'duffel', configured: false, mode: 'server-only-token-required' },
        { provider: 'amadeus', configured: false, mode: 'optional-sandbox' },
        affiliateStatus,
      ],
      providerStatus: [
        { provider: 'mock', configured: true, mode: 'mock-ready', ok: true, resultCount: 0 },
        { ...affiliateStatus, ok: true, resultCount: affiliateStatus.resultCount || 0 },
      ],
      providerErrors: [],
      results: [],
      meta: { totalResults: 0, activeProviders: ['mock', 'affiliate-package'], timestamp: new Date().toISOString() },
    };
  }

  return apiGet('/api/health');
}

export async function searchLocations(keyword) {
  if (travelProviderMode === 'mock') {
    return mockEnvelope('locations', { keyword });
  }

  return apiGet(`/api/travel/locations?keyword=${encodeURIComponent(keyword)}`);
}

export async function searchHolidays(criteria) {
  if (travelProviderMode === 'mock') {
    return mockEnvelope('search', criteria);
  }

  try {
    return await apiPost('/api/travel/search', criteria);
  } catch (error) {
    console.warn('Falling back to mock provider because the travel API is unavailable.', error);
    const fallback = await mockEnvelope('search', criteria);
    return {
      ...fallback,
      providerMode: 'mock-fallback',
      providerErrors: [{ provider: 'frontend', method: 'search', message: error.message }],
      meta: { ...fallback.meta, fallbackUsed: true },
    };
  }
}

export async function submitEnquiry(payload) {
  if (travelProviderMode === 'mock') {
    return {
      ok: true,
      providerMode: 'mock',
      enquiry: {
        enquiryId: `mock-enquiry-${Date.now()}`,
        message: 'Enquiry saved in mock mode. No booking has been created.',
      },
      providerErrors: [],
      providerStatus: [
        { provider: 'mock', configured: true, mode: 'mock-ready', ok: true, resultCount: 0 },
        { ...localAffiliatePackageProvider.getStatus(), ok: true, resultCount: 0 },
      ],
      results: [],
      meta: { totalResults: 0, activeProviders: ['mock', 'affiliate-package'], timestamp: new Date().toISOString() },
    };
  }

  return apiPost('/api/travel/enquiries', payload);
}
