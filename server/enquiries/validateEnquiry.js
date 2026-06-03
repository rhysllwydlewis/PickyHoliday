const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EnquiryValidationError extends Error {
  constructor(message, fieldErrors = []) {
    super(message);
    this.name = 'EnquiryValidationError';
    this.status = 400;
    this.fieldErrors = fieldErrors;
  }
}

export { EnquiryValidationError };

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export function validateEnquiryPayload(payload = {}) {
  const fieldErrors = [];
  const customerName = clean(payload.customerName || payload.name);
  const customerEmail = clean(payload.customerEmail || payload.email).toLowerCase();
  const destination = clean(payload.destination);
  const hasPhone = Boolean(clean(payload.customerPhone || payload.phone));
  const hasContactFields = Boolean(customerName || customerEmail || hasPhone || payload.consentToContact === true);

  if (!destination) fieldErrors.push({ field: 'destination', message: 'Destination is required.' });

  if (payload.shortlistedDeals !== undefined) {
    if (!Array.isArray(payload.shortlistedDeals)) fieldErrors.push({ field: 'shortlistedDeals', message: 'Shortlisted deals must be an array.' });
    else if (payload.shortlistedDeals.length > 6) fieldErrors.push({ field: 'shortlistedDeals', message: 'Shortlist can include up to 6 deals.' });
  }

  if (payload.budgetPerPerson !== undefined && payload.budgetPerPerson !== '' && !Number.isFinite(Number(payload.budgetPerPerson))) {
    fieldErrors.push({ field: 'budgetPerPerson', message: 'Budget per person must be a number.' });
  }

  if (hasContactFields) {
    if (!customerName) fieldErrors.push({ field: 'customerName', message: 'Name is required.' });
    if (!customerEmail || !emailPattern.test(customerEmail)) fieldErrors.push({ field: 'customerEmail', message: 'A valid email address is required.' });
    if (payload.consentToContact !== true) fieldErrors.push({ field: 'consentToContact', message: 'Consent to contact is required.' });
  }

  if (fieldErrors.length) {
    throw new EnquiryValidationError('Please complete the required enquiry fields.', fieldErrors);
  }

  return {
    ...payload,
    customerName,
    customerEmail,
    destination,
    consentToContact: payload.consentToContact === true,
    status: hasContactFields ? 'new' : 'reviewing',
    internalNotes: hasContactFields
      ? clean(payload.internalNotes)
      : 'Draft enquiry captured from trip modal before the full customer form was completed.',
    bookingMode: 'enquiry-only',
  };
}
