import { normaliseHolidaySearchCriteria } from '../search/holidaySearchCriteria.js';
import { normaliseHotelOffers } from '../search/hotelOfferModel.js';
import { lookupBookingDemandDestination } from './bookingDemandDestinations.js';

const clean = (value = '', max = 240) => value.toString().replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return `${value}`.toLowerCase() === 'true';
};
const asInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
};

const defaultBaseUrlFor = (environment) => (environment === 'production'
  ? 'https://demandapi.booking.com/3.1'
  : 'https://demandapi-sandbox.booking.com/3.1');

const safeErrorMessage = (error) => clean(error?.message || 'Booking.com Demand request failed')
  .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
  .replace(/BOOKING_DEMAND_API_KEY/gi, 'BOOKING_DEMAND_[redacted]')
  .replace(/X-Affiliate-Id:\s*[^\s,}]+/gi, 'X-Affiliate-Id: [redacted]')
  .replace(/affiliate[_-]?id[^\s,}]+/gi, 'affiliate_id[redacted]');

const addDays = (dateValue, nights) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + nights);
  return date.toISOString().slice(0, 10);
};

const firstArray = (...items) => items.find((item) => Array.isArray(item)) || [];
const valueAt = (object, paths = []) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, part) => (current && current[part] !== undefined ? current[part] : undefined), object);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const priceFromAvailability = (item = {}) => valueAt(item, [
  'priceFrom',
  'price.from',
  'price.total',
  'product_price_breakdown.gross_amount.value',
  'product_price_breakdown.all_inclusive_amount.value',
  'composite_price_breakdown.gross_amount.value',
]);

const currencyFromAvailability = (item = {}, fallback = 'GBP') => valueAt(item, [
  'currency',
  'price.currency',
  'product_price_breakdown.gross_amount.currency',
  'product_price_breakdown.all_inclusive_amount.currency',
  'composite_price_breakdown.gross_amount.currency',
]) || fallback;

const createMockBookingDemandOffers = (criteria = {}, config = {}) => {
  const search = normaliseHolidaySearchCriteria(criteria);
  const destination = search.destination || 'Amsterdam';
  return normaliseHotelOffers([
    {
      id: `booking-demand-mock-${destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-1`,
      provider: 'booking-demand',
      supplierName: 'Booking.com',
      hotelName: `${destination} Central Group Hotel`,
      destination,
      country: destination.toLowerCase() === 'amsterdam' ? 'Netherlands' : 'To confirm',
      locationLabel: `Central ${destination}`,
      checkInDate: search.departureDate,
      checkOutDate: search.returnDate || addDays(search.departureDate, search.nights),
      nights: search.nights,
      rooms: search.rooms,
      roomMix: search.roomMix,
      boardBasis: 'Room only',
      rating: 4,
      reviewScore: 8.6,
      amenities: ['Group-friendly location', 'Free Wi-Fi', 'Central base'],
      priceFrom: search.budgetPerPerson ? Math.min(search.budgetPerPerson, 180) : 149,
      currency: config.currency,
      totalEstimate: (search.budgetPerPerson ? Math.min(search.budgetPerPerson, 180) : 149) * Math.max(search.partySize, 1),
      cancellationLabel: 'Cancellation terms checked on Booking.com before any purchase.',
      bookingMode: 'affiliate-live-price',
      sourceConfidence: 'booking-demand-mock',
      sourceBreakdown: { bookingDemandAccommodationId: 'mock-accommodation-1', pricingConfidence: 'sandbox-mock' },
    },
    {
      id: `booking-demand-mock-${destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-2`,
      provider: 'booking-demand',
      supplierName: 'Booking.com',
      hotelName: `${destination} Value Apartments`,
      destination,
      country: destination.toLowerCase() === 'amsterdam' ? 'Netherlands' : 'To confirm',
      locationLabel: `${destination} group aparthotel area`,
      checkInDate: search.departureDate,
      checkOutDate: search.returnDate || addDays(search.departureDate, search.nights),
      nights: search.nights,
      rooms: search.rooms,
      roomMix: search.roomMix,
      boardBasis: 'Self catering',
      rating: 3,
      reviewScore: 8.1,
      amenities: ['Apartment-style rooms', 'Kitchenette', 'Good for groups'],
      priceFrom: 119,
      currency: config.currency,
      totalEstimate: 119 * Math.max(search.partySize, 1),
      cancellationLabel: 'Cancellation terms checked on Booking.com before any purchase.',
      bookingMode: 'affiliate-live-price',
      sourceConfidence: 'booking-demand-mock',
      sourceBreakdown: { bookingDemandAccommodationId: 'mock-accommodation-2', pricingConfidence: 'sandbox-mock' },
    },
  ], 'booking-demand', search);
};

export function createBookingDemandProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const environment = clean(env.BOOKING_DEMAND_ENV || 'sandbox', 24).toLowerCase() === 'production' ? 'production' : 'sandbox';
  const baseUrl = clean(env.BOOKING_DEMAND_BASE_URL || defaultBaseUrlFor(environment), 240).replace(/\/$/, '');
  const apiKey = clean(env.BOOKING_DEMAND_API_KEY || '', 600);
  const affiliateId = clean(env.BOOKING_DEMAND_AFFILIATE_ID || '', 120);
  const explicitEnabled = env.BOOKING_DEMAND_ENABLED;
  const testMockEnabled = asBool(env.BOOKING_DEMAND_TEST_MOCK, false);
  const enabled = asBool(explicitEnabled, Boolean(apiKey && affiliateId) || testMockEnabled);
  const liveCredentialsConfigured = enabled && Boolean(apiKey && affiliateId);
  const configured = enabled && (liveCredentialsConfigured || testMockEnabled);
  const timeoutMs = Math.max(500, asInt(env.BOOKING_DEMAND_TIMEOUT_MS, 7000));
  const currency = clean(env.BOOKING_DEMAND_CURRENCY || env.AMADEUS_CURRENCY || 'GBP', 8) || 'GBP';
  const bookerCountry = clean(env.BOOKING_DEMAND_BOOKER_COUNTRY || 'gb', 4).toLowerCase() || 'gb';
  const platform = clean(env.BOOKING_DEMAND_PLATFORM || 'desktop', 24) || 'desktop';

  const safeBaseUrl = (() => {
    try {
      const parsed = new URL(baseUrl);
      const isHttpLocalTest = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname) && ['test', 'development'].includes(env.NODE_ENV || '');
      return parsed.protocol === 'https:' || isHttpLocalTest;
    } catch {
      return false;
    }
  })();

  const request = async (path, payload) => {
    if (!fetchImpl) throw new Error('Fetch is not available for Booking.com Demand requests.');
    if (!safeBaseUrl) throw new Error('Booking.com Demand base URL must use https. Localhost http is allowed only in test/development.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Affiliate-Id': affiliateId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.message || data?.error || `Booking.com Demand request failed with ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      const safe = new Error(safeErrorMessage(error));
      safe.status = error.status;
      throw safe;
    } finally {
      clearTimeout(timeout);
    }
  };

  const buildSearchPayload = (criteria = {}) => {
    const search = normaliseHolidaySearchCriteria(criteria);
    const destination = lookupBookingDemandDestination(search);
    if (!destination) {
      const error = new Error('Booking.com city mapping is not configured for this destination yet. Add criteria.filters.bookingDemandCityId or extend bookingDemandDestinations.js after verifying the Booking.com destination id.');
      error.status = 422;
      error.code = 'booking-demand-destination-unmapped';
      throw error;
    }
    return {
      destination,
      payload: {
        booker: { country: bookerCountry, platform },
        checkin: search.departureDate,
        checkout: search.returnDate || addDays(search.departureDate, search.nights),
        city: destination.cityId,
        guests: {
          number_of_adults: search.adults || search.partySize || 2,
          number_of_rooms: search.rooms || 1,
        },
        currency,
      },
    };
  };

  const normaliseBookingItems = (items = [], criteria = {}, destination = {}) => normaliseHotelOffers(items.map((item = {}, index) => {
    const accommodationId = valueAt(item, ['id', 'accommodation', 'accommodation_id', 'hotel_id', 'property_id']) || `booking-demand-${destination.cityId || 'destination'}-${index}`;
    const priceFrom = priceFromAvailability(item);
    const hotelName = valueAt(item, ['name', 'hotelName', 'accommodation_name', 'property.name']) || `Booking.com accommodation ${accommodationId}`;
    return {
      id: `booking-demand-${accommodationId}`,
      provider: 'booking-demand',
      supplierName: 'Booking.com',
      hotelName,
      destination: criteria.destination || destination.name,
      country: destination.country || valueAt(item, ['country', 'country_name']) || '',
      locationLabel: valueAt(item, ['address', 'location', 'city', 'district']) || destination.name || criteria.destination,
      checkInDate: criteria.departureDate,
      checkOutDate: criteria.returnDate || addDays(criteria.departureDate, criteria.nights),
      nights: criteria.nights,
      rooms: criteria.rooms,
      roomMix: criteria.roomMix,
      boardBasis: valueAt(item, ['meal_plan', 'boardBasis', 'mealPlan']) || 'Board basis checked on Booking.com',
      rating: valueAt(item, ['rating', 'stars', 'star_rating']),
      reviewScore: valueAt(item, ['review_score', 'reviewScore', 'score']),
      amenities: firstArray(item.amenities, item.facilities).slice(0, 12),
      image: valueAt(item, ['main_photo_url', 'photo', 'image', 'thumbnail_url']),
      priceFrom,
      currency: currencyFromAvailability(item, currency),
      totalEstimate: priceFrom,
      cancellationLabel: valueAt(item, ['cancellationLabel', 'cancellation_type', 'policies.cancellation']) || 'Cancellation terms checked on Booking.com before any purchase.',
      bookingMode: 'affiliate-live-price',
      sourceConfidence: priceFrom ? (testMockEnabled ? 'booking-demand-test-mock' : `${environment}-provider-priced`) : `${environment}-search-only`,
      sourceBreakdown: {
        bookingDemandAccommodationId: `${accommodationId}`,
        bookingDemandEnvironment: environment,
        hotelProvider: 'booking-demand',
        pricingConfidence: priceFrom ? 'provider-priced' : 'live-check-required',
      },
    };
  }), 'booking-demand', criteria);

  const hotels = async (criteria = {}) => {
    const search = normaliseHolidaySearchCriteria(criteria);
    if (!enabled) return [];
    if (testMockEnabled) return createMockBookingDemandOffers(search, { currency });
    if (!liveCredentialsConfigured) {
      const error = new Error('Booking.com Demand provider is enabled but BOOKING_DEMAND_API_KEY and BOOKING_DEMAND_AFFILIATE_ID are not configured.');
      error.status = 503;
      throw error;
    }
    if (!search.departureDate) {
      const error = new Error('Booking.com Demand hotel search requires a departure/check-in date.');
      error.status = 400;
      throw error;
    }

    const { destination, payload } = buildSearchPayload(search);
    const searchData = await request('/accommodations/search', payload);
    const searchResults = firstArray(searchData.results, searchData.accommodations, searchData.data).slice(0, 12);

    // Some Demand API responses already contain enough accommodation/price data for a search result. If a
    // future account needs a dedicated availability/prices endpoint, this provider keeps that isolated here.
    return normaliseBookingItems(searchResults, search, destination);
  };

  return {
    id: 'booking-demand',
    label: 'Booking.com Demand API',
    configured,
    enabled,
    environment,
    async hotels(criteria) {
      return hotels(criteria);
    },
    getStatus() {
      return {
        provider: 'booking-demand',
        configured,
        enabled,
        mode: configured ? `${environment}-accommodation-search` : (enabled ? 'missing-server-credentials' : 'disabled'),
        environment,
        baseUrlMode: environment,
        requiresServerCredentials: true,
        liveCredentialsConfigured,
        testMockEnabled,
      };
    },
  };
}
