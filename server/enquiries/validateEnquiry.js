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
  const hasContactFields = Boolean(customerName || customerEmail || payload.consentToContact === true);

  if (!destination) fieldErrors.push({ field: 'destination', message: 'Destination is required.' });

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
