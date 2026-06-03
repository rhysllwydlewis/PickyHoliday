import { mockProvider } from '../src/services/providers/mockProvider.js';
import { createAmadeusProvider } from '../src/services/providers/amadeusProvider.js';
import { createDuffelProvider } from '../src/services/providers/duffelProvider.js';
import { createAffiliatePackageProvider } from '../src/services/providers/affiliatePackageProvider.js';
import { manualDealsProvider } from '../src/services/providers/manualDealsProvider.js';
import { createPartnerRedirectProvider } from '../src/services/providers/partnerRedirectProvider.js';
import { createBookingDemandProvider } from '../src/services/providers/bookingDemandProvider.js';
import { normaliseHolidaySearchCriteria } from '../src/services/search/holidaySearchCriteria.js';
import { normaliseComposedHolidayResults } from '../src/services/search/composedHolidayResults.js';

const safeMessage = (error) => {
  const message = error?.message || 'Provider request failed';
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=[redacted]')
    .replace(/client_id=[^&\s]+/gi, 'client_id=[redacted]')
    .replace(/duffel_(test|live)_[A-Za-z0-9._-]+/gi, 'duffel_[redacted]')
    .replace(/BOOKING_DEMAND_API_KEY/gi, 'BOOKING_DEMAND_[redacted]')
    .replace(/X-Affiliate-Id:\s*[^\s,}]+/gi, 'X-Affiliate-Id: [redacted]')
    .replace(/affiliate[_-]?id[^\s,}]+/gi, 'affiliate_id[redacted]');
};

const providerLabel = (provider) => provider?.id || provider?.label || 'unknown-provider';

const summariseProviderStatus = (statuses = [], method = 'composeHoliday') => {
  const byProvider = new Map();
  statuses.forEach((status = {}) => {
    const provider = status.provider || 'unknown-provider';
    const current = byProvider.get(provider) || { ...status, provider, resultCount: 0, methods: [], ok: true, skipped: true };
    current.resultCount += Number(status.resultCount || 0);
    current.ok = current.ok && status.ok !== false;
    current.skipped = current.skipped && Boolean(status.skipped);
    if (status.lastMethod && !current.methods.includes(status.lastMethod)) current.methods.push(status.lastMethod);
    current.lastMethod = method;
    byProvider.set(provider, { ...current, ...status, resultCount: current.resultCount, ok: current.ok, skipped: current.skipped, methods: current.methods, lastMethod: method });
  });
  return [...byProvider.values()];
};

export function createTravelProviderRegistry(env = process.env) {
  const mode = env.TRAVEL_PROVIDER_MODE || 'duffel';
  const affiliateMode = env.AFFILIATE_PROVIDER_MODE || 'mock';
  const showDemoDeals = `${env.SHOW_DEMO_DEALS || env.VITE_SHOW_DEMO_DEALS || 'false'}`.toLowerCase() === 'true';
  const partnerRedirectMode = env.PARTNER_REDIRECT_PROVIDER_MODE || 'enabled';
  const partnerRedirectEnabled = `${env.ENABLE_PARTNER_REDIRECTS || 'true'}`.toLowerCase() !== 'false' && partnerRedirectMode !== 'disabled';
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

  const partnerRedirectProvider = createPartnerRedirectProvider({
    enabled: partnerRedirectEnabled ? 'true' : 'false',
    mode: partnerRedirectMode,
    trackingId: env.PARTNER_REDIRECT_TRACKING_ID || env.AFFILIATE_DEFAULT_TRACKING_ID,
  });

  const bookingDemandProvider = createBookingDemandProvider(env);

  const providers = {
    mock: mockProvider,
    duffel: duffelProvider,
    amadeus: amadeusProvider,
    'affiliate-package': affiliatePackageProvider,
    'manual-deals': manualDealsProvider,
    'partner-redirect': partnerRedirectProvider,
    'booking-demand': bookingDemandProvider,
  };

  const includeIfConfigured = (provider) => (provider.configured ? [provider] : []);
  const packageProviders = affiliateMode === 'disabled' || (!showDemoDeals && mode !== 'mock') ? [] : [affiliatePackageProvider];
  const partnerRedirectProviders = partnerRedirectProvider.configured && mode !== 'mock' ? [partnerRedirectProvider] : [];
  const bookingDemandProviders = bookingDemandProvider.configured && bookingDemandProvider.enabled && mode !== 'mock' ? [bookingDemandProvider] : [];
  const activeSearchProviders = (() => {
    if (mode === 'mock') return [mockProvider, ...packageProviders];
    if (mode === 'duffel') return [...includeIfConfigured(duffelProvider), ...bookingDemandProviders, ...partnerRedirectProviders, manualDealsProvider, ...packageProviders];
    if (mode === 'amadeus') return [...includeIfConfigured(amadeusProvider), ...bookingDemandProviders, ...partnerRedirectProviders, manualDealsProvider, ...packageProviders];
    if (mode === 'hybrid') {
      return [
        ...includeIfConfigured(duffelProvider),
        ...bookingDemandProviders,
        ...partnerRedirectProviders,
        ...packageProviders,
        manualDealsProvider,
        ...(amadeusSecondaryEnabled ? includeIfConfigured(amadeusProvider) : []),
      ];
    }
    return [...bookingDemandProviders, ...partnerRedirectProviders, manualDealsProvider, ...packageProviders];
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
      const normalisedCriteria = normaliseHolidaySearchCriteria(criteria);
      const methods = ['composeHoliday', 'packages', 'flights', 'hotels', 'search'];
      const collectedSets = await Promise.all(methods.map((method) => collect(method, normalisedCriteria)));
      const collected = {
        results: collectedSets.flatMap((item) => item.results || []),
        providerErrors: collectedSets.flatMap((item) => item.providerErrors || []),
        providerStatus: summariseProviderStatus(collectedSets.flatMap((item) => item.providerStatus || []), 'composeHoliday'),
      };
      const results = normaliseComposedHolidayResults(collected.results, normalisedCriteria, { limit: normalisedCriteria.filters?.spotlight ? 6 : 24 });
      return {
        ...envelope({ ...collected, results }),
        results,
        meta: {
          ...envelope({ ...collected, results }).meta,
          criteria: normalisedCriteria,
          resultShape: 'composed-holiday-v1',
          bookingDemandConfigured: bookingDemandProvider.configured,
          bookingDemandEnabled: bookingDemandProvider.enabled,
          hotelProviderCount: bookingDemandProvider.configured ? (collected.providerStatus.find((status) => status.provider === 'booking-demand')?.resultCount || 0) : 0,
          rankingNote: 'Deterministic foundation scoring uses price, destination match, provider confidence, partner redirect availability, promoted/manual signals and rating when available. Richer provider data can improve this later.',
        },
      };
    },
    async locations(criteria) {
      const providerSet = mode === 'mock'
        ? [mockProvider]
        : [
          ...(duffelProvider.configured ? [duffelProvider] : []),
          ...(amadeusProvider.configured && (mode === 'amadeus' || amadeusSecondaryEnabled) ? [amadeusProvider] : []),
          ...(partnerRedirectProvider.configured ? [partnerRedirectProvider] : []),
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
        bookingDemandConfigured: bookingDemandProvider.configured,
        bookingDemandEnabled: bookingDemandProvider.enabled,
        bookingDemandEnvironment: bookingDemandProvider.environment,
        affiliatePackageConfigured: affiliatePackageProvider.configured,
        affiliateProviderMode: affiliateMode,
        showDemoDeals,
        partnerRedirectConfigured: partnerRedirectProvider.configured,
        partnerRedirectProviderMode: partnerRedirectMode,
        partnerRedirectsEnabled: partnerRedirectEnabled,
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
