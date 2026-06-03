const safeProtocols = ['https:'];

const searchPath = (destination = '') => encodeURIComponent(`${destination || 'holiday'} holidays`.trim());

export const partnerDefinitions = [
  {
    partnerId: 'onthebeach',
    label: 'On the Beach',
    baseSearchUrl: 'https://www.onthebeach.co.uk/',
    allowedDomains: ['onthebeach.co.uk', 'www.onthebeach.co.uk'],
    trackingParamName: 'affiliate',
    buildSearchUrl: (criteria = {}) => `https://www.onthebeach.co.uk/search?q=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'loveholidays',
    label: 'loveholidays',
    baseSearchUrl: 'https://www.loveholidays.com/',
    allowedDomains: ['loveholidays.com', 'www.loveholidays.com'],
    trackingParamName: 'ref',
    buildSearchUrl: (criteria = {}) => `https://www.loveholidays.com/holidays/?q=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'tui',
    label: 'TUI',
    baseSearchUrl: 'https://www.tui.co.uk/holidays/',
    allowedDomains: ['tui.co.uk', 'www.tui.co.uk'],
    trackingParamName: 'affid',
    buildSearchUrl: (criteria = {}) => `https://www.tui.co.uk/holidays/search?searchTerm=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'jet2holidays',
    label: 'Jet2holidays',
    baseSearchUrl: 'https://www.jet2holidays.com/',
    allowedDomains: ['jet2holidays.com', 'www.jet2holidays.com'],
    trackingParamName: 'affiliate',
    buildSearchUrl: (criteria = {}) => `https://www.jet2holidays.com/search-results?search=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'easyjet-holidays',
    label: 'easyJet Holidays',
    baseSearchUrl: 'https://holidays.easyjet.com/',
    allowedDomains: ['easyjet.com', 'www.easyjet.com', 'holidays.easyjet.com'],
    trackingParamName: 'affid',
    buildSearchUrl: (criteria = {}) => `https://holidays.easyjet.com/search?search=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'expedia',
    label: 'Expedia',
    baseSearchUrl: 'https://www.expedia.co.uk/',
    allowedDomains: ['expedia.co.uk', 'www.expedia.co.uk'],
    trackingParamName: 'affcid',
    buildSearchUrl: (criteria = {}) => `https://www.expedia.co.uk/Hotel-Search?destination=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'booking',
    label: 'Booking.com',
    baseSearchUrl: 'https://www.booking.com/',
    allowedDomains: ['booking.com', 'www.booking.com'],
    trackingParamName: 'aid',
    buildSearchUrl: (criteria = {}) => `https://www.booking.com/searchresults.html?ss=${searchPath(criteria.destination)}`,
  },
  {
    partnerId: 'hotels',
    label: 'Hotels.com',
    baseSearchUrl: 'https://uk.hotels.com/',
    allowedDomains: ['hotels.com', 'uk.hotels.com', 'www.hotels.com'],
    trackingParamName: 'affcid',
    buildSearchUrl: (criteria = {}) => `https://uk.hotels.com/Hotel-Search?destination=${searchPath(criteria.destination)}`,
  },
];

const partnerMap = Object.fromEntries(partnerDefinitions.map((partner) => [partner.partnerId, partner]));

export function getPartnerDefinition(partnerId) {
  return partnerMap[partnerId] || null;
}

export function isAllowedPartnerUrl(value, partnerId) {
  if (!value) return false;
  const partner = partnerId ? getPartnerDefinition(partnerId) : null;
  if (partnerId && !partner) return false;

  try {
    const url = new URL(value);
    if (!safeProtocols.includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    const allowedDomains = partner?.allowedDomains || partnerDefinitions.flatMap((item) => item.allowedDomains);
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

const appendCriteria = (url, criteria = {}, partner, trackingId = '') => {
  const parsed = new URL(url);
  const params = {
    ph_destination: criteria.destination,
    ph_origin: criteria.origin,
    ph_departure_date: criteria.departureDate || criteria.date,
    ph_nights: criteria.nights,
    ph_adults: criteria.adults || criteria.groupSize,
    ph_rooms: criteria.rooms,
  };

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim()) parsed.searchParams.set(key, `${value}`.trim());
  });

  if (trackingId && partner?.trackingParamName && !parsed.searchParams.has(partner.trackingParamName)) {
    parsed.searchParams.set(partner.trackingParamName, trackingId);
  }
  return parsed.toString();
};

export function buildPartnerSearchUrl(partnerId, criteria = {}, options = {}) {
  const partner = getPartnerDefinition(partnerId);
  if (!partner) return '';
  const rawUrl = partner.buildSearchUrl?.(criteria) || partner.baseSearchUrl;
  if (!isAllowedPartnerUrl(rawUrl, partner.partnerId)) return '';
  const withCriteria = appendCriteria(rawUrl, criteria, partner, options.trackingId || '');
  return isAllowedPartnerUrl(withCriteria, partner.partnerId) ? withCriteria : '';
}

export function validatePartnerUrl(value, partnerId) {
  return isAllowedPartnerUrl(value, partnerId);
}
