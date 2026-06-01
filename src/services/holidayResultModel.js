export const holidayResultTypes = ['flight-hotel', 'hotel-only', 'flight-only', 'package', 'advert'];
export const bookingModes = ['enquiry', 'affiliate', 'api-booking', 'manual-quote'];

export const holidayResultFields = [
  'id',
  'resultType',
  'provider',
  'supplierName',
  'airlineNames',
  'destination',
  'country',
  'hotelName',
  'image',
  'priceFrom',
  'currency',
  'priceQualifier',
  'flightSummary',
  'hotelSummary',
  'nights',
  'departureAirport',
  'returnAirport',
  'dateLabel',
  'groupSizeLabel',
  'boardBasis',
  'baggageLabel',
  'protectionLabel',
  'bookingMode',
  'partnerUrl',
  'tags',
  'isDemo',
];

export function isHolidayResult(result) {
  return Boolean(
    result
      && holidayResultTypes.includes(result.resultType)
      && bookingModes.includes(result.bookingMode)
      && result.id
      && result.provider
      && result.destination,
  );
}
