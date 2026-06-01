import { mockProvider } from '../src/services/providers/mockProvider.js';
import { createAmadeusProvider } from '../src/services/providers/amadeusProvider.js';
import { createAffiliatePackageProvider } from '../src/services/providers/affiliatePackageProvider.js';
import { manualDealsProvider } from '../src/services/providers/manualDealsProvider.js';

export function createTravelProviderRegistry(env = process.env) {
  const mode = env.TRAVEL_PROVIDER_MODE || 'mock';
  const amadeusProvider = createAmadeusProvider({
    clientId: env.AMADEUS_CLIENT_ID,
    clientSecret: env.AMADEUS_CLIENT_SECRET,
    baseUrl: env.AMADEUS_BASE_URL,
    currency: env.AMADEUS_CURRENCY,
    defaultDepartureDate: env.AMADEUS_DEFAULT_DEPARTURE_DATE,
    defaultAdults: env.AMADEUS_DEFAULT_ADULTS,
    defaultNights: env.AMADEUS_DEFAULT_NIGHTS,
  });
  const affiliatePackageProvider = createAffiliatePackageProvider({
    defaultTrackingId: env.AFFILIATE_DEFAULT_TRACKING_ID,
    partners: ['tui', 'jet2holidays', 'easyjet-holidays', 'loveholidays', 'onthebeach', 'expedia'],
  });

  const providers = {
    mock: mockProvider,
    amadeus: amadeusProvider,
    'affiliate-package': affiliatePackageProvider,
    'manual-deals': manualDealsProvider,
  };

  const activeSearchProviders = mode === 'mock'
    ? [mockProvider]
    : [amadeusProvider, affiliatePackageProvider, manualDealsProvider];

  const collect = async (method, criteria) => {
    const providerResults = await Promise.all(
      activeSearchProviders.map(async (provider) => {
        if (!provider[method]) return [];
        return provider[method](criteria);
      }),
    );

    return providerResults.flat();
  };

  return {
    mode,
    providers,
    async search(criteria) {
      const results = await collect('search', criteria);
      return { providerMode: mode, results };
    },
    async flights(criteria) {
      const results = await collect('flights', criteria);
      return { providerMode: mode, results };
    },
    async hotels(criteria) {
      const results = await collect('hotels', criteria);
      return { providerMode: mode, results };
    },
    async packages(criteria) {
      const results = await collect('packages', criteria);
      return { providerMode: mode, results };
    },
    async composeHoliday(criteria) {
      const results = await collect('composeHoliday', criteria);
      return { providerMode: mode, results };
    },
    async createEnquiry(payload) {
      return {
        ok: true,
        mode,
        enquiryId: `mock-enquiry-${Date.now()}`,
        message: 'Mock enquiry received. This is not a booking confirmation and no supplier reservation was made.',
        received: {
          resultId: payload?.resultId || null,
          destination: payload?.destination || null,
          groupSizeLabel: payload?.groupSizeLabel || null,
        },
      };
    },
    status() {
      return {
        ok: true,
        providerMode: mode,
        providers: Object.values(providers).map((provider) => (provider.getStatus ? provider.getStatus() : {
          provider: provider.id,
          configured: true,
          mode: provider.id === 'mock' || provider.id === 'manual-deals' ? 'mock-ready' : 'scaffold-only',
        })),
      };
    },
  };
}
