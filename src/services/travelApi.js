import { mockProvider } from './providers/mockProvider.js';
import { createAffiliatePackageProvider } from './providers/affiliatePackageProvider.js';

const travelProviderMode = import.meta.env.VITE_TRAVEL_PROVIDER_MODE || 'mock';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const localAffiliatePackageProvider = createAffiliatePackageProvider();

const apiUrl = (path) => `${apiBaseUrl}${path}`;

const safeApiMessage = (data, fallback) => {
  const message = data?.message || data?.providerErrors?.[0]?.message || fallback;
  if (!message || /stack|trace|at .*\(|database_url|admin_access_token|access_token|api[_-]?key|postgres(?:ql)?:\/\/|bearer\s+|password|secret/i.test(message)) return fallback;
  return message;
};

const apiPost = async (path, payload, token) => {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(safeApiMessage(data, `Travel API request failed: ${response.status}`));
    error.status = response.status;
    error.fieldErrors = data?.fieldErrors || [];
    error.payload = data;
    throw error;
  }
  return data;
};

const apiPatch = async (path, payload, token) => {
  const response = await fetch(apiUrl(path), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(safeApiMessage(data, `Travel API request failed: ${response.status}`));
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};

const apiGet = async (path, token) => {
  const response = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(safeApiMessage(data, `Travel API request failed: ${response.status}`));
    error.status = response.status;
    error.payload = data;
    throw error;
  }
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

export async function getBackendHealth() {
  return apiGet('/api/health');
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

  return getBackendHealth();
}

export async function getSiteConfig() {
  try {
    return await apiGet('/api/site-config');
  } catch (error) {
    return { ok: false, siteConfig: null, providerErrors: [{ provider: 'site-config', method: 'get', message: error.message }] };
  }
}

export async function getPublicPromotedDeals() {
  return apiGet('/api/deals/promoted');
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
  const enquiryPayload = {
    ...payload,
    consentToContact: payload?.consentToContact === true,
  };

  if (travelProviderMode === 'mock') {
    const mockEnquiryId = `mock-enquiry-${Date.now()}`;
    return {
      ok: true,
      providerMode: 'mock',
      enquiry: {
        ...enquiryPayload,
        id: mockEnquiryId,
        enquiryId: mockEnquiryId,
        message: 'Thanks, your enquiry has been saved. This is not a booking confirmation.',
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

  try {
    return await apiPost('/api/travel/enquiries', enquiryPayload);
  } catch (error) {
    if (error.status === 400) {
      error.userMessage = 'Please check the highlighted enquiry fields and try again.';
    } else if (error.status === 503) {
      error.userMessage = 'Enquiries are temporarily unavailable while storage is being configured. Please try again shortly.';
    } else {
      error.userMessage = 'Sorry, we could not save your enquiry right now. Please try again.';
    }
    throw error;
  }
}

export async function listAdminEnquiries(token) {
  return apiGet('/api/admin/enquiries', token);
}

export async function updateAdminEnquiryStatus(id, status, token) {
  return apiPatch(`/api/admin/enquiries/${encodeURIComponent(id)}/status`, { status }, token);
}


export async function listAdminPromotedDeals(token) {
  return apiGet('/api/admin/promoted-deals', token);
}

export async function createAdminPromotedDeal(payload, token) {
  return apiPost('/api/admin/promoted-deals', payload, token);
}

export async function updateAdminPromotedDeal(id, payload, token) {
  return apiPatch(`/api/admin/promoted-deals/${encodeURIComponent(id)}`, payload, token);
}

export async function updateAdminPromotedDealStatus(id, status, token) {
  return apiPatch(`/api/admin/promoted-deals/${encodeURIComponent(id)}/status`, { status }, token);
}

export async function getAdminSiteConfig(token) {
  return apiGet('/api/admin/site-config', token);
}

export async function updateAdminSiteConfig(payload, token) {
  return apiPatch('/api/admin/site-config', payload, token);
}

export async function listPublicContentPages(type) {
  return apiGet(`/api/content/pages${type ? `?type=${encodeURIComponent(type)}` : ''}`);
}

export async function getPublicContentPage(slug) {
  return apiGet(`/api/content/pages/${encodeURIComponent(slug)}`);
}

export async function listAdminContentPages(token) {
  return apiGet('/api/admin/content-pages', token);
}

export async function createAdminContentPage(payload, token) {
  return apiPost('/api/admin/content-pages', payload, token);
}

export async function updateAdminContentPage(id, payload, token) {
  return apiPatch(`/api/admin/content-pages/${encodeURIComponent(id)}`, payload, token);
}

export async function updateAdminContentPageStatus(id, status, token) {
  return apiPatch(`/api/admin/content-pages/${encodeURIComponent(id)}/status`, { status }, token);
}
