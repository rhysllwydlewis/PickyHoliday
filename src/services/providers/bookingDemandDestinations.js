const text = (value = '') => value.toString().trim().toLowerCase();

// Booking.com's public Demand API hello-world examples commonly use Amsterdam city id -2140479.
// Other destination ids must be verified through approved Booking.com partner tooling before live use.
const destinationMappings = {
  amsterdam: { cityId: -2140479, name: 'Amsterdam', country: 'Netherlands', verified: true, source: 'booking-demand-doc-example' },
};

export function lookupBookingDemandDestination(criteria = {}) {
  const explicitCityId = criteria.bookingDemandCityId || criteria.filters?.bookingDemandCityId;
  if (explicitCityId && /^-?\d+$/.test(`${explicitCityId}`)) {
    return {
      cityId: Number(explicitCityId),
      name: criteria.destination || 'Booking.com mapped destination',
      country: '',
      verified: true,
      source: 'criteria.bookingDemandCityId',
    };
  }

  const destination = text(criteria.destination);
  if (!destination) return null;
  return destinationMappings[destination] || null;
}

export function bookingDemandDestinationStatus(criteria = {}) {
  const mapping = lookupBookingDemandDestination(criteria);
  if (mapping) return { configured: true, mapping };
  return {
    configured: false,
    message: 'Booking.com city mapping is not configured for this destination yet. Add criteria.filters.bookingDemandCityId or extend bookingDemandDestinations.js after verifying the Booking.com destination id.',
  };
}

export const bookingDemandDestinationMappings = destinationMappings;
