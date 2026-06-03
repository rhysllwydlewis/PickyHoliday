import { imageUrls } from '../../data/mockDeals.js';
import { buildPartnerSearchUrl, partnerDefinitions } from '../partners/partnerDeepLinks.js';

const destinationCountry = (destination = '') => {
  const map = { barcelona: 'Spain', tenerife: 'Spain', ibiza: 'Spain', benidorm: 'Spain', zante: 'Greece', 'ayia napa': 'Cyprus', dubai: 'UAE', malaga: 'Spain', prague: 'Czechia', lisbon: 'Portugal', amsterdam: 'Netherlands', paris: 'France', rome: 'Italy', majorca: 'Spain', mallorca: 'Spain', albufeira: 'Portugal', alicante: 'Spain', cancun: 'Mexico', orlando: 'USA', 'new york': 'USA', london: 'United Kingdom', 'city breaks': 'Europe', 'party beaches': 'Europe', villas: 'Europe', families: 'Europe', holidays: 'Europe', 'stag & hen': 'Europe' };
  const normalised = `${destination}`.trim().toLowerCase();
  return map[normalised] || map[normalised.split(/\s+/)[0]] || 'To confirm';
};
const parseNights = (criteria = {}) => Number(criteria.nights) > 0 ? Number(criteria.nights) : (Number(`${criteria.date || criteria.dateLabel || ''}`.match(/(\d+)\s*\+?\s*nights?/i)?.[1]) || 7);
const defaultImage = (destination = '') => {
  const key = `${destination}`.toLowerCase().includes('barcelona') ? 'barcelona' : `${destination}`.toLowerCase().includes('tenerife') ? 'tenerife' : 'hero';
  return imageUrls[key] || imageUrls.hero || imageUrls.barcelona;
};
const slug = (value) => `${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'search';

const partnerCard = (partner, criteria = {}, index = 0, trackingId = '') => {
  const destination = `${criteria.destination || 'Popular group holidays'}`.trim();
  const partnerUrl = buildPartnerSearchUrl(partner.partnerId, criteria, { trackingId });
  if (!partnerUrl) return null;
  const nights = parseNights(criteria);
  return {
    id: `partner-redirect-${partner.partnerId}-${slug(destination)}`,
    resultType: index % 5 === 0 ? 'advert' : 'package',
    provider: 'partner-redirect',
    supplierName: partner.label,
    airlineNames: [],
    destination,
    country: destinationCountry(destination),
    hotelName: 'Live partner search',
    image: defaultImage(destination),
    priceFrom: 0,
    currency: 'GBP',
    priceQualifier: 'Check live price with partner',
    priceType: 'partner live price check',
    pricingConfidence: 'partner-check-required',
    sourceBreakdown: { partnerRedirect: true, pricingConfidence: 'partner-check-required' },
    flightSummary: `Open ${partner.label} to check current flight-inclusive holiday options for ${destination}.`,
    hotelSummary: 'PickyHoliday links to a partner search page; the partner confirms live price, availability, booking and protection terms before purchase.',
    nights,
    departureAirport: criteria.origin || criteria.departureAirport || 'Choose with partner',
    returnAirport: criteria.origin || criteria.returnAirport || 'Choose with partner',
    dateLabel: criteria.departureDate || criteria.date || criteria.dateLabel || 'Flexible dates',
    groupSizeLabel: criteria.groupSize || criteria.groupSizeLabel || (criteria.adults ? `${criteria.adults} adults` : 'Group size flexible'),
    boardBasis: 'Choose board with partner',
    baggageLabel: 'Baggage and transfers are shown by the partner before purchase.',
    protectionLabel: 'Booking and protection terms are provided by the partner before purchase.',
    bookingMode: 'affiliate',
    partnerId: partner.partnerId,
    partnerUrl,
    savingLabel: 'Live-price path',
    rating: 0,
    tags: ['Holidays', 'Package holidays', 'Partner live price', 'Group ideas'],
    isDemo: false,
  };
};

export function createPartnerRedirectProvider(config = {}) {
  const enabled = `${config.enabled ?? 'true'}`.toLowerCase() !== 'false' && `${config.mode || 'enabled'}`.toLowerCase() !== 'disabled';
  const selectedPartnerIds = config.partners || partnerDefinitions.map((partner) => partner.partnerId);
  const partners = partnerDefinitions.filter((partner) => selectedPartnerIds.includes(partner.partnerId));
  const resultsFor = (criteria = {}) => (enabled ? partners.map((partner, index) => partnerCard(partner, criteria, index, config.trackingId || '')).filter(Boolean) : []);
  return {
    id: 'partner-redirect', label: 'Partner live-price redirect provider', configured: enabled && partners.length > 0, partners: partners.map((partner) => partner.partnerId),
    async search(criteria = {}) { return resultsFor(criteria); },
    async packages(criteria = {}) { return resultsFor({ ...criteria, intent: criteria.intent || 'Holidays' }); },
    async composeHoliday(criteria = {}) { return this.packages(criteria); },
    getStatus() { return { provider: this.id, configured: this.configured, mode: enabled ? 'enabled-live-price-redirects' : 'disabled', partners: this.partners, resultCount: this.configured ? partners.length : 0, note: 'Returns safe partner search redirects only. PickyHoliday does not claim live availability or create bookings.' }; },
  };
}
