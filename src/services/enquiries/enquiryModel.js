export const ENQUIRY_STATUSES = ['new', 'reviewing', 'contacted', 'quoted', 'closed'];

const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

export function createEnquiryRecord(payload = {}) {
  const now = new Date().toISOString();
  return {
    id: payload.id || `enq_${Date.now()}`,
    createdAt: payload.createdAt || now,
    updatedAt: now,
    status: ENQUIRY_STATUSES.includes(payload.status) ? payload.status : 'new',
    source: clean(payload.source) || 'pickyholiday-site',
    resultId: clean(payload.resultId),
    resultType: clean(payload.resultType),
    provider: clean(payload.provider),
    supplierName: clean(payload.supplierName),
    destination: clean(payload.destination),
    country: clean(payload.country),
    hotelName: clean(payload.hotelName),
    departureAirport: clean(payload.departureAirport),
    dateLabel: clean(payload.dateLabel || payload.roughDates),
    groupSizeLabel: clean(payload.groupSizeLabel || payload.groupSize),
    priceFrom: toNumber(payload.priceFrom),
    currency: clean(payload.currency) || 'GBP',
    customerName: clean(payload.customerName || payload.name),
    customerEmail: clean(payload.customerEmail || payload.email).toLowerCase(),
    customerPhone: clean(payload.customerPhone || payload.phone),
    customerNotes: clean(payload.customerNotes || payload.notes),
    consentToContact: payload.consentToContact === true,
    internalNotes: clean(payload.internalNotes),
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
    message: 'Your enquiry has been saved. This is not a booking confirmation and no supplier reservation has been made.',
  };
}
