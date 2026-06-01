const DEFAULT_BASE_URL = 'https://test.api.amadeus.com';
const DEFAULT_CURRENCY = 'GBP';
const DEFAULT_ADULTS = 2;
const DEFAULT_NIGHTS = 7;

const destinationCodes = {
  ibiza: 'IBZ',
  tenerife: 'TCI',
  barcelona: 'BCN',
  dubai: 'DXB',
  'ayia napa': 'LCA',
  zante: 'ZTH',
  zakynthos: 'ZTH',
  benidorm: 'ALC',
  prague: 'PRG',
  majorca: 'PMI',
  mallorca: 'PMI',
  albufeira: 'FAO',
  'costa del sol': 'AGP',
  malaga: 'AGP',
};

const originCodes = {
  'london (all airports)': 'LON',
  london: 'LON',
  manchester: 'MAN',
  birmingham: 'BHX',
  bristol: 'BRS',
  edinburgh: 'EDI',
};

const cityCodes = {
  IBZ: 'IBZ',
  TCI: 'TCI',
  BCN: 'BCN',
  DXB: 'DXB',
  LCA: 'LCA',
  ZTH: 'ZTH',
  ALC: 'ALC',
  PRG: 'PRG',
  PMI: 'PMI',
  FAO: 'FAO',
  AGP: 'AGP',
};

const normalise = (value = '') => value.toString().trim().toLowerCase();

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

const nextDateForMonthDay = (month, day) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const candidate = new Date(Date.UTC(currentYear, month - 1, day));
  if (candidate > now) return candidate.toISOString().slice(0, 10);
  return new Date(Date.UTC(currentYear + 1, month - 1, day)).toISOString().slice(0, 10);
};

const parseDateLabel = (label, fallbackDate) => {
  if (fallbackDate) return fallbackDate;
  const normalised = normalise(label);
  const monthMap = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const match = normalised.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  if (!match) return addDays(new Date(), 42);
  return nextDateForMonthDay(monthMap[match[2]], Number(match[1]));
};

const parseNights = (label, fallbackNights = DEFAULT_NIGHTS) => {
  const match = `${label || ''}`.match(/(\d+)\+?\s*nights?/i);
  return match ? Number(match[1]) : fallbackNights;
};

const parseAdults = (groupSize, fallbackAdults = DEFAULT_ADULTS) => {
  const match = `${groupSize || ''}`.match(/(\d+)\s*people/i);
  if (!match) return fallbackAdults;
  return Math.min(Math.max(Number(match[1]), 1), 9);
};

const resolveCode = (value, knownCodes, fallback) => knownCodes[normalise(value)] || fallback;

const pickCarrierNames = (offer = {}, dictionaries = {}) => {
  const carrierCodes = offer.itineraries?.flatMap((itinerary) => itinerary.segments?.map((segment) => segment.carrierCode) || []) || [];
  const uniqueCodes = [...new Set(carrierCodes)];
  return uniqueCodes.map((code) => dictionaries.carriers?.[code] || code).filter(Boolean);
};

const firstSegment = (offer = {}) => offer.itineraries?.[0]?.segments?.[0];
const lastSegment = (offer = {}) => offer.itineraries?.at(-1)?.segments?.at(-1);

export function createAmadeusProvider(config = {}) {
  const providerConfig = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    currency: config.currency || DEFAULT_CURRENCY,
    defaultDepartureDate: config.defaultDepartureDate,
    defaultAdults: Number(config.defaultAdults || DEFAULT_ADULTS),
    defaultNights: Number(config.defaultNights || DEFAULT_NIGHTS),
  };
  let tokenCache = null;

  const requestToken = async () => {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.accessToken;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
    });

    const response = await fetch(`${providerConfig.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Amadeus OAuth failed with ${response.status}`);
    }

    const token = await response.json();
    tokenCache = {
      accessToken: token.access_token,
      expiresAt: Date.now() + (Number(token.expires_in || 0) * 1000),
    };
    return tokenCache.accessToken;
  };

  const amadeusGet = async (path, params = {}) => {
    if (!providerConfig.clientId || !providerConfig.clientSecret) return null;

    const token = await requestToken();
    const url = new URL(`${providerConfig.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Amadeus ${path} failed with ${response.status}`);
    return response.json();
  };

  const buildFlightCriteria = (criteria = {}) => {
    const destinationCode = resolveCode(criteria.destination, destinationCodes, normalise(criteria.destination).slice(0, 3).toUpperCase());
    return {
      originLocationCode: resolveCode(criteria.origin, originCodes, 'LON'),
      destinationLocationCode: destinationCode,
      departureDate: parseDateLabel(criteria.date, providerConfig.defaultDepartureDate),
      returnDate: addDays(parseDateLabel(criteria.date, providerConfig.defaultDepartureDate), parseNights(criteria.date, providerConfig.defaultNights)),
      adults: parseAdults(criteria.groupSize, providerConfig.defaultAdults),
      currencyCode: providerConfig.currency,
      max: criteria.max || 5,
      destinationCode,
    };
  };

  const mapFlightOffer = (offer, criteria = {}, dictionaries = {}) => {
    const request = buildFlightCriteria(criteria);
    const outbound = firstSegment(offer);
    const inbound = lastSegment(offer);
    const destination = criteria.destination || request.destinationLocationCode;
    const carrierNames = pickCarrierNames(offer, dictionaries);

    return {
      id: `amadeus-flight-${offer.id}`,
      resultType: 'flight-only',
      provider: 'amadeus',
      supplierName: 'Amadeus Self-Service Flight Offers Search',
      airlineNames: carrierNames,
      destination,
      country: criteria.country || 'To be resolved by provider',
      hotelName: 'Flight only result',
      image: 'city',
      priceFrom: Number(offer.price?.grandTotal || offer.price?.total || 0),
      currency: offer.price?.currency || providerConfig.currency,
      priceQualifier: 'total live fare from Amadeus test API',
      savingLabel: 'LIVE API',
      rating: 'Provider result',
      flightSummary: `${outbound?.departure?.iataCode || request.originLocationCode} to ${outbound?.arrival?.iataCode || request.destinationLocationCode}; returns ${inbound?.departure?.iataCode || request.destinationLocationCode} to ${inbound?.arrival?.iataCode || request.originLocationCode}`,
      hotelSummary: 'Hotel can be composed through the Amadeus hotel adapter or package provider in a later booking flow.',
      nights: parseNights(criteria.date, providerConfig.defaultNights),
      departureAirport: outbound?.departure?.iataCode || request.originLocationCode,
      returnAirport: inbound?.arrival?.iataCode || request.originLocationCode,
      dateLabel: `${request.departureDate} to ${request.returnDate}`,
      groupSizeLabel: criteria.groupSize || `${request.adults} adults`,
      boardBasis: 'Flight only',
      baggageLabel: 'Baggage and fare rules must be checked with the live offer details before booking.',
      protectionLabel: 'Search only. No booking or payment is created by PickyHoliday.',
      bookingMode: 'enquiry',
      partnerUrl: '',
      tags: ['Holidays', 'Flights', 'Amadeus'],
      isDemo: false,
    };
  };

  const mapHotel = (hotel, criteria = {}) => ({
    id: `amadeus-hotel-${hotel.hotelId || hotel.hotelName}`,
    resultType: 'hotel-only',
    provider: 'amadeus',
    supplierName: 'Amadeus Self-Service Hotel List',
    airlineNames: [],
    destination: criteria.destination || hotel.address?.cityName || hotel.iataCode || 'Selected city',
    country: hotel.address?.countryCode || 'To be resolved by provider',
    hotelName: hotel.name || hotel.hotelName || 'Amadeus hotel result',
    image: 'city',
    priceFrom: 0,
    currency: providerConfig.currency,
    priceQualifier: 'price requires hotel offers search',
    savingLabel: 'LIVE API',
    rating: hotel.rating ? `${hotel.rating} star` : 'Provider result',
    flightSummary: 'Flights can be composed separately through the Amadeus flight adapter.',
    hotelSummary: `${hotel.address?.lines?.join(', ') || 'Hotel list result from Amadeus.'}`,
    nights: parseNights(criteria.date, providerConfig.defaultNights),
    departureAirport: resolveCode(criteria.origin, originCodes, 'LON'),
    returnAirport: hotel.iataCode || '',
    dateLabel: criteria.date || 'Flexible dates',
    groupSizeLabel: criteria.groupSize || 'Group quote required',
    boardBasis: 'To be confirmed from live hotel offer',
    baggageLabel: 'Not applicable to hotel-only result',
    protectionLabel: 'Search only. No booking or payment is created by PickyHoliday.',
    bookingMode: 'enquiry',
    partnerUrl: '',
    tags: ['Holidays', 'Group hotel stays', 'Amadeus'],
    isDemo: false,
  });

  return {
    id: 'amadeus',
    label: 'Amadeus live-capable flight + hotel provider',
    configured: Boolean(providerConfig.clientId && providerConfig.clientSecret),
    baseUrl: providerConfig.baseUrl,
    async flights(criteria = {}) {
      const request = buildFlightCriteria(criteria);
      const response = await amadeusGet('/v2/shopping/flight-offers', request);
      if (!response) return [];
      return (response.data || []).map((offer) => mapFlightOffer(offer, criteria, response.dictionaries || {}));
    },
    async hotels(criteria = {}) {
      const request = buildFlightCriteria(criteria);
      const cityCode = cityCodes[request.destinationCode] || request.destinationCode;
      const response = await amadeusGet('/v1/reference-data/locations/hotels/by-city', {
        cityCode,
        radius: criteria.radius || 20,
        radiusUnit: 'KM',
        hotelSource: 'ALL',
      });
      if (!response) return [];
      return (response.data || []).slice(0, criteria.max || 5).map((hotel) => mapHotel(hotel, criteria));
    },
    async packages(criteria = {}) {
      return this.composeHoliday(criteria);
    },
    async composeHoliday(criteria = {}) {
      const [flights, hotels] = await Promise.all([this.flights(criteria), this.hotels(criteria)]);
      if (!flights.length) return hotels;
      if (!hotels.length) return flights;

      return flights.slice(0, 3).map((flight, index) => {
        const hotel = hotels[index % hotels.length];
        return {
          ...flight,
          id: `amadeus-composed-${flight.id}-${hotel.id}`,
          resultType: 'flight-hotel',
          hotelName: hotel.hotelName,
          hotelSummary: hotel.hotelSummary,
          priceQualifier: 'flight fare plus hotel price to be confirmed',
          tags: ['Holidays', 'Group hotel stays', 'Amadeus'],
        };
      });
    },
    async search(criteria = {}) {
      if (criteria.resultType === 'hotel-only' || criteria.intent === 'Group hotel stays') return this.hotels(criteria);
      return this.composeHoliday(criteria);
    },
    getStatus() {
      return {
        provider: this.id,
        configured: this.configured,
        mode: this.configured ? 'live-capable' : 'needs-server-side-credentials',
        note: this.configured
          ? 'Amadeus OAuth, Flight Offers Search and Hotel List calls are enabled server-side.'
          : 'Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET on the server to enable live Amadeus calls.',
      };
    },
  };
}
