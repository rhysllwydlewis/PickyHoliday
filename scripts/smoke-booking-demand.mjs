import { createTravelProviderRegistry } from '../server/travelProviderRegistry.js';

const forbidden = ['BOOKING_DEMAND_API_KEY=secret', 'secret-booking-key', 'affiliate-secret', 'Bearer secret', 'postgres://'];

const assertNoBookingActions = (payload, label) => {
  const text = JSON.stringify(payload).toLowerCase();
  for (const blocked of ['booking confirmed', 'reservation_id', 'order created', 'payment successful', 'book now', 'supplier reservation']) {
    if (text.includes(blocked)) throw new Error(`${label} exposed booking/reservation/payment behaviour: ${blocked}`);
  }
};

const assertNoSecrets = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const item of forbidden) {
    if (text.includes(item)) throw new Error(`${label} leaked a secret marker: ${item}`);
  }
};
const baseEnv = {
  TRAVEL_PROVIDER_MODE: 'hybrid',
  ENABLE_PARTNER_REDIRECTS: 'false',
  SHOW_DEMO_DEALS: 'false',
};
const search = { destination: 'Barcelona', originAirport: 'Manchester', departureDate: '2026-08-10', returnDate: '2026-08-17', partySize: 8, adults: 8, rooms: 3, roomMix: '3 rooms', filters: {} };

async function assertDisabled() {
  const registry = createTravelProviderRegistry({ ...baseEnv, ENABLE_BOOKING_DEMAND: 'false' });
  const status = registry.status().providerStatus.find((item) => item.provider === 'booking-demand');
  if (!status || status.mode !== 'disabled' || status.configured) throw new Error('Disabled Booking.com Demand status was not controlled.');
  const result = await registry.composeHoliday(search);
  if (result.meta.activeProviders.includes('booking-demand')) throw new Error('Disabled Booking.com Demand provider became active.');
  assertNoSecrets(result, 'disabled composeHoliday');
  assertNoBookingActions(result, 'disabled composeHoliday');
}

async function assertMissingCredentials() {
  const registry = createTravelProviderRegistry({ ...baseEnv, ENABLE_BOOKING_DEMAND: 'true', BOOKING_DEMAND_MODE: 'sandbox' });
  const result = await registry.composeHoliday(search);
  const note = result.providerErrors.find((item) => item.provider === 'booking-demand' && item.mode === 'missing-credentials');
  if (!note) throw new Error('Missing Booking.com credentials did not produce a controlled provider note.');
  if (!Array.isArray(result.results)) throw new Error('Missing credentials broke composed holiday results.');
  assertNoSecrets(result, 'missing credentials composeHoliday');
  assertNoBookingActions(result, 'missing credentials composeHoliday');
}

async function assertUnmappedDestination() {
  const registry = createTravelProviderRegistry({ ...baseEnv, ENABLE_BOOKING_DEMAND: 'true', BOOKING_DEMAND_MODE: 'mock', BOOKING_DEMAND_API_KEY: 'secret-booking-key', BOOKING_DEMAND_AFFILIATE_ID: 'affiliate-secret' });
  const result = await registry.composeHoliday({ ...search, destination: 'Definitely Unknown' });
  const note = result.providerErrors.find((item) => item.provider === 'booking-demand' && item.mode === 'unmapped-destination');
  if (!note) throw new Error('Unmapped Booking.com destination did not produce a controlled provider note.');
  assertNoSecrets(result, 'unmapped composeHoliday');
  assertNoBookingActions(result, 'unmapped composeHoliday');
}

async function assertMockMapped() {
  const registry = createTravelProviderRegistry({ ...baseEnv, ENABLE_BOOKING_DEMAND: 'true', BOOKING_DEMAND_MODE: 'mock', BOOKING_DEMAND_CITY_MAPPINGS: JSON.stringify({ Barcelona: '12345' }) });
  const result = await registry.composeHoliday(search);
  const bookingResult = result.results.find((item) => item.provider === 'booking-demand');
  if (!bookingResult) throw new Error('Mapped Booking.com mock mode did not contribute an accommodation result.');
  if (bookingResult.supplierName !== 'Booking.com') throw new Error('Booking.com supplier name was not normalised.');
  if (bookingResult.priceQualifier !== 'Check live price') throw new Error('Booking.com unconfirmed price was not labelled Check live price.');
  if (!bookingResult.sourceBreakdown?.accommodationSource?.includes('Booking.com')) throw new Error('Booking.com accommodation source was not exposed.');
  if (!bookingResult.protectionLabel?.includes('No booking is created by PickyHoliday')) throw new Error('Booking.com enquiry-first guardrail was not exposed.');
  assertNoSecrets(result, 'mock mapped composeHoliday');
  assertNoBookingActions(result, 'mock mapped composeHoliday');
}

await assertDisabled();
await assertMissingCredentials();
await assertUnmappedDestination();
await assertMockMapped();
console.log('✓ Booking.com Demand provider smoke checks passed');
