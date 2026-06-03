import { createBookingDemandProvider } from '../src/services/providers/bookingDemandProvider.js';
import { lookupBookingDemandDestination } from '../src/services/providers/bookingDemandDestinations.js';
import { createTravelProviderRegistry } from '../server/travelProviderRegistry.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertNoSecretLeak = (value, label) => {
  const body = JSON.stringify(value).toLowerCase();
  for (const blocked of ['booking_demand_api_key', 'super-secret-booking-token', 'bearer super-secret', 'x-affiliate-id: 123456', 'database_url', 'admin_access_token']) {
    assert(!body.includes(blocked), `${label} appeared to expose ${blocked}.`);
  }
};

const disabledProvider = createBookingDemandProvider({ BOOKING_DEMAND_ENABLED: 'false' });
const disabledStatus = disabledProvider.getStatus();
assert(disabledStatus.provider === 'booking-demand', 'Disabled status did not report booking-demand provider.');
assert(disabledStatus.configured === false, 'Disabled provider should not be configured.');
assert(disabledStatus.enabled === false, 'Disabled provider should not be enabled.');
assertNoSecretLeak(disabledStatus, 'disabled provider status');

const mapping = lookupBookingDemandDestination({ destination: 'Amsterdam' });
assert(mapping?.cityId === -2140479, 'Amsterdam Booking.com Demand mapping was not available.');
assert(lookupBookingDemandDestination({ destination: 'Barcelona' }) === null, 'Unverified Booking.com destination mapping should not be guessed.');
assert(lookupBookingDemandDestination({ destination: 'Barcelona', filters: { bookingDemandCityId: '-12345' } })?.cityId === -12345, 'Explicit Booking.com city id mapping did not work.');

const mockProvider = createBookingDemandProvider({
  NODE_ENV: 'test',
  BOOKING_DEMAND_ENABLED: 'true',
  BOOKING_DEMAND_TEST_MOCK: 'true',
  BOOKING_DEMAND_ENV: 'sandbox',
  BOOKING_DEMAND_CURRENCY: 'GBP',
});
const mockStatus = mockProvider.getStatus();
assert(mockStatus.configured === true, 'Mock Booking.com provider should be configured for local smoke tests.');
assert(mockStatus.liveCredentialsConfigured === false, 'Mock Booking.com provider should not require live credentials.');
const hotelOffers = await mockProvider.hotels({ destination: 'Amsterdam', departureDate: '2026-08-10', returnDate: '2026-08-17', adults: 2, partySize: 2, rooms: 1 });
assert(hotelOffers.length >= 1, 'Mock Booking.com provider returned no hotel offers.');
assert(hotelOffers.every((offer) => offer.provider === 'booking-demand'), 'Booking.com hotel offers were not normalised with provider=booking-demand.');
assert(hotelOffers.every((offer) => offer.supplierName === 'Booking.com'), 'Booking.com hotel offers missed supplier name.');
assert(hotelOffers.every((offer) => offer.bookingMode === 'affiliate-live-price'), 'Booking.com hotel offers should remain affiliate-live-price/enquiry-first.');
assertNoSecretLeak(hotelOffers, 'mock hotel offers');

const registry = createTravelProviderRegistry({
  NODE_ENV: 'test',
  TRAVEL_PROVIDER_MODE: 'duffel',
  ENABLE_PARTNER_REDIRECTS: 'false',
  PARTNER_REDIRECT_PROVIDER_MODE: 'disabled',
  AFFILIATE_PROVIDER_MODE: 'disabled',
  BOOKING_DEMAND_ENABLED: 'true',
  BOOKING_DEMAND_TEST_MOCK: 'true',
  BOOKING_DEMAND_ENV: 'sandbox',
  BOOKING_DEMAND_CURRENCY: 'GBP',
});
const registryStatus = registry.status();
assert(registryStatus.bookingDemandConfigured === true, 'Registry did not report Booking.com Demand configured in mock mode.');
assert((registryStatus.providerStatus || []).some((status) => status.provider === 'booking-demand'), 'Registry providerStatus did not include booking-demand.');
const composed = await registry.composeHoliday({ destination: 'Amsterdam', departureDate: '2026-08-10', returnDate: '2026-08-17', adults: 2, partySize: 2, rooms: 1 });
assert(composed.meta?.resultShape === 'composed-holiday-v1', 'Composer did not return composed-holiday-v1 shape.');
assert(composed.results.some((result) => result.sourceBreakdown?.sourceProvider === 'booking-demand' || result.sourceBreakdown?.hotelProvider === 'booking-demand'), 'Composer did not include a Booking.com-sourced hotel idea.');
assertNoSecretLeak(composed, 'composed Booking.com results');
const composedBody = JSON.stringify(composed).toLowerCase();
for (const blocked of ['book now', 'booking confirmed', 'reserved', 'payment successful', 'guaranteed price', 'atol protected']) {
  assert(!composedBody.includes(blocked), `Booking.com composed results contained forbidden wording: ${blocked}.`);
}

console.log('✓ Booking.com Demand provider smoke checks passed');
