import { imageUrls } from '../../data/mockDeals.js';

const bool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return `${value}`.toLowerCase() === 'true';
};
const slug = (value) => `${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'destination';
const redacted = (message = 'Booking.com Demand provider failed in a controlled way.') => `${message}`
  .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
  .replace(/Basic\s+[A-Za-z0-9._~+/=-]+/gi, 'Basic [redacted]')
  .replace(/(booking[_-]?demand[_-]?(?:api[_-]?key|token|affiliate[_-]?id|username|password|secret)|api[_-]?key|affiliate[_-]?id|token|password|secret)=([^&\s]+)/gi, '$1=[redacted]')
  .replace(/\b[A-Za-z0-9._%+-]+:[A-Za-z0-9._%+-]+@/g, '[redacted]@');
const parseMappings = (raw) => {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Object.fromEntries(Object.entries(parsed || {}).map(([key, value]) => [slug(key), `${value}`.trim()]).filter(([, value]) => value));
  } catch (error) {
    return {};
  }
};
const destinationCountry = (destination = '') => {
  const map = { barcelona: 'Spain', tenerife: 'Spain', ibiza: 'Spain', benidorm: 'Spain', zante: 'Greece', 'ayia napa': 'Cyprus', dubai: 'UAE', malaga: 'Spain', prague: 'Czechia', lisbon: 'Portugal', amsterdam: 'Netherlands', paris: 'France', rome: 'Italy', majorca: 'Spain', mallorca: 'Spain' };
  return map[`${destination}`.trim().toLowerCase()] || 'To confirm';
};
const defaultImage = (destination = '') => imageUrls[slug(destination)] || imageUrls.barcelona || imageUrls.hero;

const mockAccommodation = (criteria, cityId) => [{
  id: `booking-demand-mock-${cityId}-${slug(criteria.destination)}`,
  resultType: 'hotel-only',
  provider: 'booking-demand',
  supplierName: 'Booking.com',
  destination: criteria.destination || 'Mapped destination',
  country: destinationCountry(criteria.destination),
  hotelName: `Booking.com hotel options in ${criteria.destination || 'your destination'}`,
  hotelSummary: 'Accommodation source: Booking.com Demand test data. Live room, cancellation and terms are checked on the partner site before any customer action.',
  flightSummary: 'Accommodation-only source. PickyHoliday advisors can pair this with suitable flight ideas for an enquiry.',
  image: defaultImage(criteria.destination),
  priceFrom: 0,
  currency: 'GBP',
  priceQualifier: 'Check live price',
  priceType: 'partner live price check',
  pricingConfidence: 'check-live-price',
  sourceBreakdown: { accommodationSource: 'Booking.com Demand', supplier: 'Booking.com', pricingConfidence: 'check-live-price', cityId, testMode: true },
  nights: criteria.nights || 7,
  departureAirport: criteria.originAirport || criteria.origin || 'Choose with advisor',
  arrivalAirport: criteria.destination || 'To confirm',
  dateLabel: criteria.departureDate || 'Flexible dates',
  groupSizeLabel: `${criteria.partySize || criteria.adults || 2} people · ${criteria.rooms || 1} room${Number(criteria.rooms || 1) === 1 ? '' : 's'}`,
  rooms: criteria.rooms || 1,
  roomMix: criteria.roomMix || `${criteria.rooms || 1} room${Number(criteria.rooms || 1) === 1 ? '' : 's'}`,
  boardBasis: 'Board and room terms checked on Booking.com',
  baggageLabel: 'Hotel-only result; baggage depends on any separate flights selected.',
  protectionLabel: 'Cancellation and terms are checked on Booking.com. No booking is created by PickyHoliday.',
  bookingMode: 'affiliate',
  partnerId: 'booking',
  partnerUrl: 'https://www.booking.com/',
  savingLabel: 'Hotel source',
  rating: 0,
  tags: ['Accommodation', 'Hotel source', 'Booking.com', 'Check live price'],
  isDemo: true,
}];

export function createBookingDemandProvider(config = {}) {
  const enabled = bool(config.enabled, false) && `${config.mode || 'disabled'}`.toLowerCase() !== 'disabled';
  const testMode = enabled && ['mock', 'test'].includes(`${config.mode || ''}`.toLowerCase());
  const apiKey = config.apiKey || config.token;
  const affiliateId = config.affiliateId;
  const baseUrl = (config.baseUrl || 'https://demandapi.booking.com/3.1').replace(/\/$/, '');
  const destinationMappings = parseMappings(config.destinationMappings);
  const timeoutMs = Number(config.timeoutMs || 8000);
  const credentialsConfigured = Boolean(apiKey && affiliateId);
  const statusMode = !enabled ? 'disabled' : testMode ? 'test-mock-ready' : credentialsConfigured ? 'live-or-sandbox-ready' : 'missing-credentials';
  const noteFor = (message, criteria = {}, extra = {}) => ({ provider: 'booking-demand', method: 'composeHoliday', message, destination: criteria.destination || '', ...extra });
  const cityIdFor = (criteria = {}) => `${criteria.filters?.bookingDemandCityId || destinationMappings[slug(criteria.destination || '')] || ''}`.trim();

  const normaliseLive = (item = {}, criteria = {}, index = 0, cityId = '') => {
    const name = item.name || item.hotel_name || item.accommodation?.name || `Booking.com accommodation ${index + 1}`;
    const amount = Number(item.price?.book || item.price?.total || item.composite_price_breakdown?.gross_amount?.value || 0);
    return {
      id: `booking-demand-${item.id || item.hotel_id || slug(name)}-${index}`,
      resultType: 'hotel-only', provider: 'booking-demand', supplierName: 'Booking.com', destination: criteria.destination || 'Mapped destination', country: destinationCountry(criteria.destination), hotelName: name,
      hotelSummary: 'Accommodation source: Booking.com Demand. Live room availability, cancellation and terms are checked on Booking.com before any customer action.',
      flightSummary: 'Accommodation-only source. PickyHoliday can combine this with flight ideas for an enquiry.', image: item.main_photo_url || defaultImage(criteria.destination),
      priceFrom: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0, currency: item.price?.currency || config.currency || 'GBP', priceQualifier: amount > 0 ? 'indicative hotel price from Booking.com' : 'Check live price', priceType: amount > 0 ? 'provider indicative accommodation price' : 'partner live price check', pricingConfidence: amount > 0 ? 'provider-response-indicative' : 'check-live-price',
      sourceBreakdown: { accommodationSource: 'Booking.com Demand', supplier: 'Booking.com', pricingConfidence: amount > 0 ? 'provider-response-indicative' : 'check-live-price', cityId, testMode: false },
      nights: criteria.nights || 7, departureAirport: criteria.originAirport || criteria.origin || 'Choose with advisor', arrivalAirport: criteria.destination || 'To confirm', dateLabel: criteria.departureDate || 'Flexible dates', groupSizeLabel: `${criteria.partySize || criteria.adults || 2} people · ${criteria.rooms || 1} room${Number(criteria.rooms || 1) === 1 ? '' : 's'}`, rooms: criteria.rooms || 1, roomMix: criteria.roomMix || `${criteria.rooms || 1} room${Number(criteria.rooms || 1) === 1 ? '' : 's'}`,
      boardBasis: 'Board and room terms checked on Booking.com', baggageLabel: 'Hotel-only result; baggage depends on any separate flights selected.', protectionLabel: 'Cancellation and terms are checked on Booking.com. No booking is created by PickyHoliday.', bookingMode: 'affiliate', partnerId: 'booking', partnerUrl: 'https://www.booking.com/', savingLabel: 'Hotel source', rating: Number(item.review_score || item.rating || 0) || 0, tags: ['Accommodation', 'Hotel source', 'Booking.com', amount > 0 ? 'Provider response' : 'Check live price'], isDemo: false,
    };
  };

  async function hotels(criteria = {}) {
    if (!enabled) throw Object.assign(new Error('Booking.com Demand provider disabled.'), { controlledProviderNote: true });
    if (!testMode && !credentialsConfigured) throw Object.assign(new Error('Booking.com Demand enabled but missing server-side credentials.'), { controlledProviderNote: true });
    const cityId = cityIdFor(criteria);
    if (!cityId) throw Object.assign(new Error('Booking.com Demand enabled but destination is unmapped. Add an explicit mapping or criteria.filters.bookingDemandCityId.'), { controlledProviderNote: true });
    if (testMode) return mockAccommodation(criteria, cityId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/accommodations/search`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Affiliate-Id': affiliateId },
        body: JSON.stringify({ city: Number(cityId) || cityId, checkin: criteria.departureDate || undefined, checkout: criteria.returnDate || undefined, guests: { number_of_adults: criteria.adults || criteria.partySize || 2, number_of_rooms: criteria.rooms || 1 }, currency: config.currency || 'GBP' }),
      });
      if (!response.ok) throw Object.assign(new Error(`Booking.com Demand responded with HTTP ${response.status}.`), { status: response.status });
      const data = await response.json();
      const items = data.results || data.accommodations || data.data || [];
      return (Array.isArray(items) ? items : []).slice(0, 6).map((item, index) => normaliseLive(item, criteria, index, cityId));
    } catch (error) {
      throw new Error(redacted(error?.message || 'Booking.com Demand request failed.'));
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: 'booking-demand', label: 'Booking.com Demand accommodation provider', configured: enabled && (testMode || credentialsConfigured), enabled,
    async hotels(criteria = {}) { return hotels(criteria); },
    async composeHoliday(criteria = {}) { return hotels(criteria); },
    getStatus() { return { provider: 'booking-demand', configured: this.configured, enabled, credentialsConfigured, mode: statusMode, accommodationSource: 'Booking.com Demand', supplier: 'Booking.com', destinationMappings: Object.keys(destinationMappings), note: !enabled ? 'Provider disabled.' : testMode ? 'Test/mock mode enabled; no live Booking.com request is made.' : credentialsConfigured ? 'Live/sandbox requests use server-side credentials only.' : 'Enabled but missing server-side credentials.' }; },
    getNote(criteria = {}) { if (!enabled) return noteFor('Booking.com Demand provider disabled.', criteria, { mode: 'disabled' }); if (!testMode && !credentialsConfigured) return noteFor('Booking.com Demand enabled but missing server-side credentials.', criteria, { mode: 'missing-credentials' }); if (!cityIdFor(criteria)) return noteFor('Booking.com Demand destination unmapped; no city id was guessed.', criteria, { mode: 'unmapped-destination' }); return null; },
  };
}
