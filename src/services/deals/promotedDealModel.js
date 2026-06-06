import { validatePartnerUrl } from '../partners/partnerDeepLinks.js';

export const promotedDealStatuses = ['draft', 'active', 'paused', 'archived'];
export const promotedDealTypes = ['package', 'advert', 'manual-quote', 'affiliate'];
export const promotedDealBookingModes = ['enquiry', 'affiliate', 'manual-quote'];
const stringField = (value) => (typeof value === 'string' ? value.trim() : '');
const numberField = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : 0;
};
const arrayField = (value) => {
  if (Array.isArray(value)) return value.map(stringField).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(stringField).filter(Boolean);
  return [];
};

const validationError = (field, message) => {
  const error = new Error(message);
  error.status = 400;
  error.fieldErrors = [{ field, message }];
  return error;
};

const enumField = (input, existing, field, allowed, fallback) => {
  if (input[field] !== undefined && !allowed.includes(input[field])) {
    throw validationError(field, `${field} must be one of: ${allowed.join(', ')}.`);
  }
  return input[field] || existing[field] || fallback;
};

export function normalisePromotedDeal(input = {}, existing = {}) {
  const now = new Date().toISOString();
  const status = enumField(input, existing, 'status', promotedDealStatuses, 'draft');
  const dealType = enumField(input, existing, 'dealType', promotedDealTypes, 'package');
  const bookingMode = enumField(input, existing, 'bookingMode', promotedDealBookingModes, dealType === 'affiliate' ? 'affiliate' : 'manual-quote');
  const partnerUrl = stringField(input.partnerUrl ?? existing.partnerUrl);
  const partnerId = stringField(input.partnerId ?? existing.partnerId);
  if (bookingMode === 'affiliate' && partnerUrl && !validatePartnerUrl(partnerUrl, partnerId || undefined)) {
    throw validationError('partnerUrl', 'Partner URL must be an https:// URL on an approved partner domain; javascript:, data:, http: and unapproved domains are not allowed.');
  }
  const title = stringField(input.title ?? existing.title);
  const destination = stringField(input.destination ?? existing.destination);
  if (!title) {
    throw validationError('title', 'Promoted deal title is required.');
  }
  if (!destination) {
    throw validationError('destination', 'Promoted deal destination is required.');
  }
  return {
    id: stringField(existing.id || input.id) || `promoted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: existing.createdAt || input.createdAt || now,
    updatedAt: now,
    status,
    dealType,
    title,
    supplierName: stringField(input.supplierName ?? existing.supplierName),
    partnerId,
    partnerUrl,
    resultType: stringField(input.resultType ?? existing.resultType) || (dealType === 'advert' ? 'advert' : 'package'),
    provider: stringField(input.provider ?? existing.provider) || 'promoted-deals',
    airlineNames: arrayField(input.airlineNames ?? existing.airlineNames),
    destination,
    country: stringField(input.country ?? existing.country),
    hotelName: stringField(input.hotelName ?? existing.hotelName) || title,
    image: stringField(input.image ?? existing.image),
    priceFrom: numberField(input.priceFrom ?? existing.priceFrom),
    currency: stringField(input.currency ?? existing.currency) || 'GBP',
    priceQualifier: stringField(input.priceQualifier ?? existing.priceQualifier) || 'pp',
    priceType: stringField(input.priceType ?? existing.priceType) || 'from-price',
    pricingConfidence: stringField(input.pricingConfidence ?? existing.pricingConfidence) || 'manual',
    savingLabel: stringField(input.savingLabel ?? existing.savingLabel),
    rating: numberField(input.rating ?? existing.rating),
    flightSummary: stringField(input.flightSummary ?? existing.flightSummary) || 'Flights and transfers can be tailored by a PickyHoliday advisor.',
    hotelSummary: stringField(input.hotelSummary ?? existing.hotelSummary) || 'Promoted group holiday idea with enquiry-first planning.',
    nights: numberField(input.nights ?? existing.nights),
    departureAirport: stringField(input.departureAirport ?? existing.departureAirport),
    returnAirport: stringField(input.returnAirport ?? existing.returnAirport),
    dateLabel: stringField(input.dateLabel ?? existing.dateLabel),
    groupSizeLabel: stringField(input.groupSizeLabel ?? existing.groupSizeLabel),
    boardBasis: stringField(input.boardBasis ?? existing.boardBasis),
    baggageLabel: stringField(input.baggageLabel ?? existing.baggageLabel),
    protectionLabel: stringField(input.protectionLabel ?? existing.protectionLabel) || 'Enquiry-first idea. No booking created. No payment taken by PickyHoliday.',
    bookingMode,
    tags: arrayField(input.tags ?? existing.tags),
    isDemo: Boolean(input.isDemo ?? existing.isDemo ?? false),
    internalNotes: stringField(input.internalNotes ?? existing.internalNotes),
  };
}

export function publicPromotedDeal(deal) {
  const { internalNotes, ...publicDeal } = deal;
  return publicDeal;
}

export function mapPromotedDealToHolidayResult(deal) {
  const publicDeal = publicPromotedDeal(deal);
  const safePartnerUrl = validatePartnerUrl(publicDeal.partnerUrl, publicDeal.partnerId || undefined) ? publicDeal.partnerUrl : '';
  return {
    ...publicDeal,
    id: publicDeal.id.startsWith('promoted-') ? publicDeal.id : `promoted-${publicDeal.id}`,
    provider: 'promoted-deals',
    supplierName: publicDeal.supplierName || 'PickyHoliday promoted deal',
    partnerUrl: publicDeal.bookingMode === 'affiliate' ? safePartnerUrl : '',
    tags: [...new Set(['Promoted', ...(publicDeal.tags || [])])],
    sourceBreakdown: { promoted: true, storage: 'admin-managed' },
  };
}
