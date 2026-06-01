import { mockProvider } from './providers/mockProvider.js';

const apiPost = async (path, payload) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Travel API request failed: ${response.status}`);
  return response.json();
};

const travelProviderMode = import.meta.env.VITE_TRAVEL_PROVIDER_MODE || 'mock';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export async function searchHolidays(criteria) {
  if (travelProviderMode === 'mock') {
    return { providerMode: 'mock', results: await mockProvider.search(criteria) };
  }

  try {
    return await apiPost(`${apiBaseUrl}/api/travel/search`, criteria);
  } catch (error) {
    console.warn('Falling back to mock provider because the travel API is unavailable.', error);
    return { providerMode: 'mock-fallback', results: await mockProvider.search(criteria) };
  }
}

export async function submitEnquiry(payload) {
  if (travelProviderMode === 'mock') {
    return {
      ok: true,
      mode: 'mock',
      enquiryId: `mock-enquiry-${Date.now()}`,
      message: 'Enquiry saved in mock mode. No booking has been created.',
    };
  }

  return apiPost(`${apiBaseUrl}/api/travel/enquiries`, payload);
}
