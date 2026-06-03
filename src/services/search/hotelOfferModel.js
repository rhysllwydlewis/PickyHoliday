import { normaliseHolidaySearchCriteria } from './holidaySearchCriteria.js';

const text = (value, fallback = '', max = 220) => (value ?? fallback).toString().replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const positiveNumber = (value) => {
  const number = numberOrNull(value);
  return number && number > 0 ? number : null;
};
const slug = (value) => text(value, 'hotel-offer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hotel-offer';

export const hotelOfferFields = [
  'id',
  'provider',
  'supplierName',
  'hotelName',
  'destination',
  'country',
  'locationLabel',
  'latitude',
  'longitude',
  'checkInDate',
  'checkOutDate',
  'nights',
  'rooms',
  'roomMix',
  'boardBasis',
  'rating',
  'reviewScore',
  'amenities',
  'image',
  'priceFrom',
  'currency',
  'perPersonEstimate',
  'totalEstimate',
  'cancellationLabel',
  'bookingMode',
  'sourceConfidence',
  'sourceBreakdown',
];

export function hotelOfferId(input = {}, sourceProvider = 'hotel-provider', index = 0) {
  return text(input.id || input.hotelId || input.accommodationId || input.accommodation || input.propertyId || '', '', 160)
    || `${sourceProvider}-${slug(input.hotelName || input.name || input.destination)}-${index}`;
}

export function normaliseHotelOffer(input = {}, sourceProvider = 'hotel-provider', criteria = {}, index = 0) {
  const search = normaliseHolidaySearchCriteria(criteria);
  const totalEstimate = positiveNumber(input.totalEstimate ?? input.totalPrice ?? input.priceTotal ?? input.priceFrom);
  const perPersonEstimate = positiveNumber(input.perPersonEstimate ?? input.priceFrom) || (totalEstimate ? Math.round(totalEstimate / Math.max(search.partySize || 1, 1)) : null);
  const priceFrom = positiveNumber(input.priceFrom) || perPersonEstimate || totalEstimate || null;
  const rating = numberOrNull(input.rating ?? input.stars ?? input.starRating);
  const reviewScore = numberOrNull(input.reviewScore ?? input.review_score ?? input.score);
  const provider = text(input.provider || sourceProvider, sourceProvider, 80);
  const supplierName = text(input.supplierName || input.supplier || (provider === 'booking-demand' ? 'Booking.com' : provider), provider, 120);
  const nights = numberOrNull(input.nights) || search.nights;
  const rooms = numberOrNull(input.rooms) || search.rooms;

  return {
    id: hotelOfferId(input, provider, index),
    provider,
    supplierName,
    hotelName: text(input.hotelName || input.name || input.title, 'Accommodation option', 180),
    destination: text(input.destination || search.destination, search.destination || 'Destination to confirm', 140),
    country: text(input.country || input.countryName, 'To confirm', 100),
    locationLabel: text(input.locationLabel || input.address || input.city || input.destination || search.destination, search.destination || 'Location to confirm', 180),
    ...(numberOrNull(input.latitude ?? input.lat) !== null ? { latitude: numberOrNull(input.latitude ?? input.lat) } : {}),
    ...(numberOrNull(input.longitude ?? input.lng ?? input.lon) !== null ? { longitude: numberOrNull(input.longitude ?? input.lng ?? input.lon) } : {}),
    checkInDate: text(input.checkInDate || input.checkin || search.departureDate, '', 40),
    checkOutDate: text(input.checkOutDate || input.checkout || search.returnDate, '', 40),
    nights,
    rooms,
    roomMix: text(input.roomMix || search.roomMix, `${rooms} room${rooms === 1 ? '' : 's'}`, 160),
    boardBasis: text(input.boardBasis || input.board || input.mealPlan, 'Board basis to confirm', 140),
    rating,
    reviewScore,
    amenities: Array.isArray(input.amenities) ? input.amenities.map((item) => text(item, '', 50)).filter(Boolean).slice(0, 12) : [],
    image: text(input.image || input.photoUrl || input.thumbnailUrl, '', 400),
    priceFrom,
    currency: text(input.currency, 'GBP', 8),
    perPersonEstimate,
    totalEstimate,
    cancellationLabel: text(input.cancellationLabel || input.cancellation || 'Cancellation terms checked on the partner site before any purchase.', 'Cancellation terms to confirm', 220),
    bookingMode: text(input.bookingMode, 'affiliate-live-price', 80),
    sourceConfidence: text(input.sourceConfidence, priceFrom ? 'provider-priced' : 'search-only', 80),
    sourceBreakdown: {
      ...(input.sourceBreakdown && typeof input.sourceBreakdown === 'object' ? input.sourceBreakdown : {}),
      hotelProvider: provider,
      supplierName,
      pricingConfidence: text(input.sourceBreakdown?.pricingConfidence || input.pricingConfidence, priceFrom ? 'provider-priced' : 'live-check-required', 80),
    },
  };
}

export function normaliseHotelOffers(inputs = [], sourceProvider = 'hotel-provider', criteria = {}) {
  return (Array.isArray(inputs) ? inputs : []).map((input, index) => normaliseHotelOffer(input, sourceProvider, criteria, index));
}

export function sortHotelOffers(offers = []) {
  return [...offers].sort((a, b) => {
    const priceA = a.priceFrom || Number.MAX_SAFE_INTEGER;
    const priceB = b.priceFrom || Number.MAX_SAFE_INTEGER;
    return priceA - priceB || (Number(b.reviewScore || b.rating) || 0) - (Number(a.reviewScore || a.rating) || 0);
  });
}
