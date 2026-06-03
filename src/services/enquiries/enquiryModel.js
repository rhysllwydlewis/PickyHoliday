export const ENQUIRY_STATUSES = ['new', 'reviewing', 'contacted', 'quoted', 'closed'];

const clean = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const shortlistLimit = 6;

const cleanDealSummary = (deal = {}) => ({
  resultId: clean(deal.resultId || deal.id, 120),
  resultType: clean(deal.resultType, 80),
  provider: clean(deal.provider, 80),
  supplierName: clean(deal.supplierName, 120),
  partnerId: clean(deal.partnerId, 80),
  destination: clean(deal.destination, 120),
  country: clean(deal.country, 80),
  hotelName: clean(deal.hotelName || deal.title, 160),
  departureAirport: clean(deal.departureAirport, 80),
  dateLabel: clean(deal.dateLabel || deal.roughDates, 120),
  nights: clean(deal.nights, 40),
  groupSizeLabel: clean(deal.groupSizeLabel || deal.groupSize, 120),
  boardBasis: clean(deal.boardBasis, 120),
  baggageLabel: clean(deal.baggageLabel, 120),
  bookingMode: clean(deal.bookingMode, 80),
  protectionLabel: clean(deal.protectionLabel, 180),
  priceFrom: toNumber(deal.priceFrom),
  currency: clean(deal.currency, 8) || 'GBP',
  priceQualifier: clean(deal.priceQualifier, 60),
  hasPartnerRedirect: deal.hasPartnerRedirect === true || Boolean(clean(deal.partnerId)),
});

const cleanShortlistedDeals = (deals) => (Array.isArray(deals) ? deals.slice(0, shortlistLimit).map(cleanDealSummary).filter((deal) => deal.resultId || deal.hotelName || deal.destination) : []);

export function createEnquiryRecord(payload = {}) {
  const now = new Date().toISOString();
  return {
    id: payload.id || `enq_${Date.now()}`,
    createdAt: payload.createdAt || now,
    updatedAt: now,
    status: ENQUIRY_STATUSES.includes(payload.status) ? payload.status : 'new',
    source: clean(payload.source, 80) || 'pickyholiday-site',
    resultId: clean(payload.resultId, 120),
    resultType: clean(payload.resultType, 80),
    provider: clean(payload.provider, 80),
    supplierName: clean(payload.supplierName, 120),
    destination: clean(payload.destination, 120),
    country: clean(payload.country, 80),
    hotelName: clean(payload.hotelName, 160),
    departureAirport: clean(payload.departureAirport, 80),
    dateLabel: clean(payload.dateLabel || payload.roughDates, 120),
    groupSizeLabel: clean(payload.groupSizeLabel || payload.groupSize, 120),
    priceFrom: toNumber(payload.priceFrom),
    currency: clean(payload.currency, 8) || 'GBP',
    customerName: clean(payload.customerName || payload.name, 120),
    customerEmail: clean(payload.customerEmail || payload.email, 160).toLowerCase(),
    customerPhone: clean(payload.customerPhone || payload.phone, 80),
    customerNotes: clean(payload.customerNotes || payload.notes, 1200),
    consentToContact: payload.consentToContact === true,
    budgetPerPerson: toNumber(payload.budgetPerPerson),
    roomMix: clean(payload.roomMix, 500),
    boardPreference: clean(payload.boardPreference, 160),
    baggagePreference: clean(payload.baggagePreference, 300),
    transferPreference: clean(payload.transferPreference, 300),
    occasionType: clean(payload.occasionType, 120),
    flexibilityNotes: clean(payload.flexibilityNotes, 700),
    quoteBuilderVersion: clean(payload.quoteBuilderVersion, 40),
    shortlistedDeals: cleanShortlistedDeals(payload.shortlistedDeals),
    internalNotes: clean(payload.internalNotes, 700),
  };
}

export function publicEnquiry(record = {}) {
  return {
    id: record.id,
    createdAt: record.createdAt,
    status: record.status,
    destination: record.destination,
    dateLabel: record.dateLabel,
    groupSizeLabel: record.groupSizeLabel,
    message: 'Your enquiry has been saved. This is not a booking confirmation. No payment has been taken and no supplier reservation has been made.',
  };
}
