import { validatePartnerUrl } from '../partners/partnerDeepLinks.js';
import { normaliseHolidaySearchCriteria } from './holidaySearchCriteria.js';

const text = (value, fallback = '') => (value ?? fallback).toString().trim();
const numeric = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const slug = (value) => text(value, 'holiday-idea').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'holiday-idea';
const destinationHaystack = (result = {}) => [result.destination, result.country, result.hotelName, result.supplierName, ...(result.tags || [])].join(' ').toLowerCase();
const safeBookingMode = (value, hasPartnerUrl) => {
  const mode = text(value);
  if (hasPartnerUrl) return 'affiliate';
  if (['enquiry', 'manual-quote'].includes(mode)) return mode;
  return 'enquiry';
};
const dealReasonLabel = (result = {}, { provider, priceFrom, hasPartnerUrl, rating, criteria }) => {
  if (provider === 'promoted-deals' || provider === 'manual-deals' || result.promoted || result.isPromoted) return 'Advisor quote pick';
  if (hasPartnerUrl && !priceFrom) return 'Live price check';
  if (priceFrom > 0 && priceFrom <= 300) return 'Cheapest flight-led idea';
  if (Number(rating) >= 4) return 'Strong hotel value';
  if ((criteria?.partySize || 0) >= 6 || (criteria?.rooms || 0) > 1) return 'Best group pick';
  if (hasPartnerUrl) return 'Live price check';
  return 'Best group pick';
};

export const composedHolidayResultFields = [
  'id', 'resultType', 'provider', 'supplierName', 'destination', 'country', 'hotelName', 'hotelSummary', 'flightSummary', 'airlineNames', 'departureAirport', 'arrivalAirport', 'dateLabel', 'departureDate', 'returnDate', 'nights', 'groupSizeLabel', 'rooms', 'roomMix', 'boardBasis', 'baggageLabel', 'rating', 'priceFrom', 'currency', 'priceQualifier', 'totalEstimate', 'perPersonEstimate', 'score', 'scoreReasons', 'dealReasonLabel', 'partnerId', 'partnerUrl', 'bookingMode', 'protectionLabel', 'sourceBreakdown',
];

export function scoreComposedHolidayResult(result = {}, criteria = {}) {
  const normalisedCriteria = normaliseHolidaySearchCriteria(criteria);
  const scoreReasons = [];
  let score = 45;
  const price = numeric(result.priceFrom, 0);
  if (price > 0 && price <= 300) { score += 18; scoreReasons.push('Lower per-person lead price'); }
  else if (price > 0 && price <= 500) { score += 12; scoreReasons.push('Competitive per-person lead price'); }
  else if (price > 0) { score += 6; scoreReasons.push('Indicative per-person price available'); }
  else { score += 5; scoreReasons.push('Live price check available'); }

  if (normalisedCriteria.destination && destinationHaystack(result).includes(normalisedCriteria.destination.toLowerCase())) {
    score += 16;
    scoreReasons.push('Destination match');
  }
  if (['partner-redirect', 'affiliate-package'].includes(result.provider) && result.partnerUrl) {
    score += 10;
    scoreReasons.push('Safe partner live-price path');
  }
  if (['promoted-deals', 'manual-deals'].includes(result.provider) || result.promoted || result.isPromoted) {
    score += 10;
    scoreReasons.push('Advisor-managed pick');
  }
  const rating = numeric(result.rating, null);
  if (rating && rating >= 4) { score += 8; scoreReasons.push('Strong rating signal'); }
  if (result.resultType === 'flight-hotel' || result.resultType === 'package') { score += 7; scoreReasons.push('Flight and hotel idea'); }
  if (normalisedCriteria.rooms > 1 || normalisedCriteria.partySize >= 6) { score += 4; scoreReasons.push('Group-sized search fit'); }

  return { score: Math.round(score), scoreReasons };
}

export function normaliseComposedHolidayResult(result = {}, criteria = {}, index = 0) {
  const normalisedCriteria = normaliseHolidaySearchCriteria(criteria);
  const provider = text(result.provider, 'composer');
  const priceFrom = numeric(result.priceFrom ?? result.perPersonEstimate, 0) || 0;
  const safePartnerUrl = result.partnerUrl && validatePartnerUrl(result.partnerUrl, result.partnerId || undefined) ? result.partnerUrl : undefined;
  const rooms = numeric(result.rooms, normalisedCriteria.rooms) || normalisedCriteria.rooms;
  const partySize = numeric(result.partySize, normalisedCriteria.partySize) || normalisedCriteria.partySize;
  const nights = numeric(result.nights, normalisedCriteria.nights) || normalisedCriteria.nights;
  const id = text(result.id || result.resultId, `composed-${provider}-${slug(result.destination || normalisedCriteria.destination)}-${index}`);
  const scored = scoreComposedHolidayResult({ ...result, provider, partnerUrl: safePartnerUrl }, normalisedCriteria);
  const bookingMode = safeBookingMode(result.bookingMode, Boolean(safePartnerUrl));

  return {
    id,
    resultType: 'composed-holiday',
    provider,
    supplierName: text(result.supplierName, provider),
    destination: text(result.destination, normalisedCriteria.destination || 'Flexible destination'),
    country: text(result.country, 'To confirm'),
    hotelName: text(result.hotelName || result.title, 'Holiday idea'),
    hotelSummary: text(result.hotelSummary, 'Hotel or package details will be checked by an advisor or partner before any next step.'),
    flightSummary: text(result.flightSummary, result.airlineNames?.length ? `${result.airlineNames.join(', ')} flight option` : 'Flight details to be checked against available provider data.'),
    airlineNames: Array.isArray(result.airlineNames) ? result.airlineNames.filter(Boolean) : [],
    departureAirport: text(result.departureAirport || result.originAirport || result.origin, normalisedCriteria.originAirport),
    arrivalAirport: text(result.arrivalAirport || result.returnAirport, result.destination || normalisedCriteria.destination || 'To confirm'),
    dateLabel: text(result.dateLabel, normalisedCriteria.departureDate ? `${normalisedCriteria.departureDate}${normalisedCriteria.returnDate ? ` to ${normalisedCriteria.returnDate}` : ` · ${nights} nights`}` : 'Flexible dates'),
    departureDate: text(result.departureDate, normalisedCriteria.departureDate),
    returnDate: text(result.returnDate, normalisedCriteria.returnDate),
    nights,
    groupSizeLabel: text(result.groupSizeLabel, `${partySize} people · ${rooms} room${rooms === 1 ? '' : 's'}`),
    rooms,
    roomMix: text(result.roomMix, normalisedCriteria.roomMix),
    boardBasis: text(result.boardBasis, 'Board basis to confirm'),
    baggageLabel: text(result.baggageLabel, 'Baggage details to confirm before any partner purchase.'),
    rating: result.rating || null,
    priceFrom,
    currency: text(result.currency, 'GBP'),
    priceQualifier: text(result.priceQualifier, priceFrom > 0 ? 'per person guide price' : 'Check live price'),
    totalEstimate: numeric(result.totalEstimate, priceFrom > 0 ? priceFrom * partySize : null),
    perPersonEstimate: numeric(result.perPersonEstimate, priceFrom || null),
    score: scored.score,
    scoreReasons: [...new Set([...(result.scoreReasons || []), ...scored.scoreReasons])].slice(0, 5),
    dealReasonLabel: text(result.dealReasonLabel, dealReasonLabel(result, { provider, priceFrom, hasPartnerUrl: Boolean(safePartnerUrl), rating: result.rating, criteria: normalisedCriteria })),
    partnerId: text(result.partnerId),
    ...(safePartnerUrl ? { partnerUrl: safePartnerUrl } : {}),
    bookingMode,
    protectionLabel: text(result.protectionLabel, safePartnerUrl ? 'Partner terms are confirmed on the partner site before purchase.' : 'Enquiry-first idea. No booking, payment or supplier reservation has been made.'),
    sourceBreakdown: {
      ...(result.sourceBreakdown && typeof result.sourceBreakdown === 'object' ? result.sourceBreakdown : {}),
      composer: 'normalised-provider-result',
      sourceProvider: provider,
      pricingConfidence: result.pricingConfidence || result.sourceBreakdown?.pricingConfidence || (priceFrom > 0 ? 'indicative' : 'live-check-required'),
    },
    image: result.image,
    tags: [...new Set([...(result.tags || []), 'Holidays', 'Composed holiday'])],
    isDemo: Boolean(result.isDemo),
  };
}

export function sortComposedHolidayResults(results = [], criteria = {}) {
  const sort = normaliseHolidaySearchCriteria(criteria).sort;
  const sorted = [...results];
  if (sort === 'price-asc') return sorted.sort((a, b) => (a.priceFrom || Number.MAX_SAFE_INTEGER) - (b.priceFrom || Number.MAX_SAFE_INTEGER) || b.score - a.score);
  if (sort === 'price-desc') return sorted.sort((a, b) => (b.priceFrom || 0) - (a.priceFrom || 0) || b.score - a.score);
  if (sort === 'best-rated') return sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || b.score - a.score);
  if (sort === 'easiest-travel') return sorted.sort((a, b) => (b.flightSummary ? 1 : 0) - (a.flightSummary ? 1 : 0) || b.score - a.score);
  if (sort === 'closest-match') return sorted.sort((a, b) => b.score - a.score);
  return sorted.sort((a, b) => b.score - a.score || (a.priceFrom || 999999) - (b.priceFrom || 999999));
}

export function normaliseComposedHolidayResults(results = [], criteria = {}, { limit } = {}) {
  const seen = new Set();
  const normalised = results.map((result, index) => normaliseComposedHolidayResult(result, criteria, index)).filter((result) => {
    if (seen.has(result.id)) return false;
    seen.add(result.id);
    return true;
  });
  const sorted = sortComposedHolidayResults(normalised, criteria);
  return Number(limit) > 0 ? sorted.slice(0, Number(limit)) : sorted;
}
