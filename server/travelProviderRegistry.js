import { mockProvider } from '../src/services/providers/mockProvider.js';
import { createAmadeusProvider } from '../src/services/providers/amadeusProvider.js';
import { createDuffelProvider } from '../src/services/providers/duffelProvider.js';
import { createAffiliatePackageProvider } from '../src/services/providers/affiliatePackageProvider.js';
import { manualDealsProvider } from '../src/services/providers/manualDealsProvider.js';

const safeMessage = (error) => {
  const message = error?.message || 'Provider request failed';
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=[redacted]')
    .replace(/client_id=[^&\s]+/gi, 'client_id=[redacted]')
    .replace(/duffel_(test|live)_[A-Za-z0-9._-]+/gi, 'duffel_[redacted]');
};

const providerLabel = (provider) => provider?.id || provider?.label || 'unknown-provider';

export function createTravelProviderRegistry(env = process.env) {
  const mode = env.TRAVEL_PROVIDER_MODE || 'mock';
  const affiliateMode = env.AFFILIATE_PROVIDER_MODE || 'mock';
  const primaryFlightProvider = env.TRAVEL_PRIMARY_FLIGHT_PROVIDER || 'duffel';
  const amadeusSecondaryEnabled = `${env.ENABLE_AMADEUS_SECONDARY || 'false'}`.toLowerCase() === 'true';
  const amadeusProvider = createAmadeusProvider({
    clientId: env.AMADEUS_CLIENT_ID,
    clientSecret: env.AMADEUS_CLIENT_SECRET,
    baseUrl: env.AMADEUS_BASE_URL,
    currency: env.AMADEUS_CURRENCY,
    defaultDepartureDate: env.AMADEUS_DEFAULT_DEPARTURE_DATE,
    defaultAdults: env.AMADEUS_DEFAULT_ADULTS,
    defaultNights: env.AMADEUS_DEFAULT_NIGHTS,
  });
  const duffelProvider = createDuffelProvider({
    accessToken: env.DUFFEL_ACCESS_TOKEN,
    baseUrl: env.DUFFEL_BASE_URL,
    version: env.DUFFEL_VERSION,
    defaultCurrency: env.AMADEUS_CURRENCY,
    defaultDepartureDate: env.AMADEUS_DEFAULT_DEPARTURE_DATE,
    defaultAdults: env.AMADEUS_DEFAULT_ADULTS,
    defaultNights: env.AMADEUS_DEFAULT_NIGHTS,
  });
  const affiliatePackageProvider = createAffiliatePackageProvider({
    defaultTrackingId: env.AFFILIATE_DEFAULT_TRACKING_ID,
    trackingIds: {
      tui: env.TUI_AFFILIATE_ID,
      jet2holidays: env.JET2HOLIDAYS_AFFILIATE_ID,
      'easyjet-holidays': env.EASYJET_HOLIDAYS_AFFILIATE_ID,
      loveholidays: env.LOVEHOLIDAYS_AFFILIATE_ID,
      onthebeach: env.ONTHEBEACH_AFFILIATE_ID,
      expedia: env.EXPEDIA_AFFILIATE_ID,
    },
    partners: ['tui', 'jet2holidays', 'easyjet-holidays', 'loveholidays', 'onthebeach', 'expedia'],
  });

  const providers = {
    mock: mockProvider,
    duffel: duffelProvider,
    amadeus: amadeusProvider,
    'affiliate-package': affiliatePackageProvider,
    'manual-deals': manualDealsProvider,
  };

  const includeIfConfigured = (provider) => (provider.configured ? [provider] : []);
  const packageProviders = affiliateMode === 'disabled' ? [] : [affiliatePackageProvider];
  const activeSearchProviders = (() => {
    if (mode === 'mock') return [mockProvider, ...packageProviders];
    if (mode === 'duffel') return [...includeIfConfigured(duffelProvider), manualDealsProvider, ...packageProviders];
    if (mode === 'amadeus') return [...includeIfConfigured(amadeusProvider), manualDealsProvider, ...packageProviders];
    if (mode === 'hybrid') {
      return [
        ...includeIfConfigured(duffelProvider),
        ...packageProviders,
        manualDealsProvider,
        ...(amadeusSecondaryEnabled ? includeIfConfigured(amadeusProvider) : []),
      ];
    }
    return [mockProvider, ...packageProviders];
  })();

  const statusFor = (provider) => (provider.getStatus ? provider.getStatus() : {
    provider: provider.id,
    configured: true,
    mode: provider.id === 'mock' || provider.id === 'manual-deals' ? 'mock-ready' : 'scaffold-only',
  });

  const collect = async (method, criteria) => {
    const settled = await Promise.all(activeSearchProviders.map(async (provider) => {
      if (!provider[method]) {
        return { provider, results: [], skipped: true };
      }

      try {
        const results = await provider[method](criteria);
        return { provider, results: Array.isArray(results) ? results : [] };
      } catch (error) {
        const providerName = providerLabel(provider);
        const message = safeMessage(error);
        console.error('[travel-provider-error]', {
          provider: providerName,
          method,
          message,
          status: error?.status || error?.cause?.status,
        });
        return {
          provider,
          results: [],
          error: {
            provider: providerName,
            method,
            message,
          },
        };
      }
    }));

    const results = settled.flatMap((item) => item.results);
    const providerErrors = settled.map((item) => item.error).filter(Boolean);
    const providerStatus = settled.map((item) => ({
      ...statusFor(item.provider),
      lastMethod: method,
      resultCount: item.results.length,
      ok: !item.error,
      skipped: Boolean(item.skipped),
    }));

    return { results, providerErrors, providerStatus };
  };

  const envelope = (collected) => ({
    providerMode: mode,
    results: collected.results,
    providerErrors: collected.providerErrors,
    providerStatus: collected.providerStatus,
    meta: {
      totalResults: collected.results.length,
      activeProviders: activeSearchProviders.map((provider) => providerLabel(provider)),
      timestamp: new Date().toISOString(),
    },
  });

  return {
    mode,
    providers,
    async search(criteria) {
      return envelope(await collect('search', criteria));
    },
    async flights(criteria) {
      return envelope(await collect('flights', criteria));
    },
    async hotels(criteria) {
      return envelope(await collect('hotels', criteria));
    },
    async packages(criteria) {
      return envelope(await collect('packages', criteria));
    },
    async composeHoliday(criteria) {
      return envelope(await collect('composeHoliday', criteria));
    },
    async locations(criteria) {
      const providerSet = mode === 'mock'
        ? [mockProvider]
        : [
          ...(duffelProvider.configured ? [duffelProvider] : []),
          ...(amadeusProvider.configured && (mode === 'amadeus' || amadeusSecondaryEnabled) ? [amadeusProvider] : []),
          mockProvider,
        ];
      const settled = await Promise.all(providerSet.map(async (provider) => {
        if (!provider.locations) return { provider, results: [], skipped: true };
        try {
          const results = await provider.locations(criteria);
          return { provider, results: Array.isArray(results) ? results : [] };
        } catch (error) {
          const providerName = providerLabel(provider);
          const message = safeMessage(error);
          console.error('[travel-provider-error]', { provider: providerName, method: 'locations', message });
          return { provider, results: [], error: { provider: providerName, method: 'locations', message } };
        }
      }));
      const results = settled.flatMap((item) => item.results);
      return {
        providerMode: mode,
        results,
        providerErrors: settled.map((item) => item.error).filter(Boolean),
        providerStatus: settled.map((item) => ({ ...statusFor(item.provider), lastMethod: 'locations', resultCount: item.results.length, ok: !item.error, skipped: Boolean(item.skipped) })),
        meta: {
          totalResults: results.length,
          activeProviders: providerSet.map((provider) => providerLabel(provider)),
          timestamp: new Date().toISOString(),
        },
      };
    },
    async createEnquiry(payload) {
      return {
        ok: true,
        providerMode: mode,
        results: [],
        providerErrors: [],
        providerStatus: activeSearchProviders.map((provider) => ({
          ...statusFor(provider),
          lastMethod: 'createEnquiry',
          resultCount: 0,
          ok: true,
        })),
        meta: {
          totalResults: 0,
          activeProviders: activeSearchProviders.map((provider) => providerLabel(provider)),
          timestamp: new Date().toISOString(),
        },
        enquiry: {
          enquiryId: `mock-enquiry-${Date.now()}`,
          message: 'Mock enquiry received. This is not a booking confirmation and no supplier reservation was made.',
          received: {
            resultId: payload?.resultId || null,
            destination: payload?.destination || null,
            groupSizeLabel: payload?.groupSizeLabel || null,
          },
        },
      };
    },
    status() {
      const providerStatuses = Object.values(providers).map(statusFor);
      return {
        ok: true,
        providerMode: mode,
        activeProviders: activeSearchProviders.map((provider) => providerLabel(provider)),
        primaryFlightProvider,
        duffelPreferredForFlights: true,
        amadeusSecondaryEnabled,
        duffelConfigured: duffelProvider.configured,
        amadeusConfigured: amadeusProvider.configured,
        affiliatePackageConfigured: affiliatePackageProvider.configured,
        affiliateProviderMode: affiliateMode,
        providers: providerStatuses,
        providerStatus: providerStatuses,
        providerErrors: [],
        results: [],
        meta: {
          totalResults: 0,
          activeProviders: activeSearchProviders.map((provider) => providerLabel(provider)),
          timestamp: new Date().toISOString(),
        },
      };
    },
  };
}
