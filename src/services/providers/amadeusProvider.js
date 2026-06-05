import { departureAirportCodeLookup, destinationAirportCodeLookup, extractTravelOptionCode, normaliseTravelOptionText } from '../../data/travelOptions.js';

const DEFAULT_BASE_URL = 'https://test.api.amadeus.com';
const DEFAULT_CURRENCY = 'GBP';
const DEFAULT_ADULTS = 2;
const DEFAULT_NIGHTS = 7;

const destinationCodes = {
  ...destinationAirportCodeLookup,
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
  ...departureAirportCodeLookup,
  'london (all airports)': 'LON',
  london: 'LON',
  manchester: 'MAN',
  birmingham: 'BHX',
  bristol: 'BRS',
  edinburgh: 'EDI',
};

const cityCodes = {
  ...Object.fromEntries([...new Set(Object.values(destinationAirportCodeLookup))].map((code) => [code, code])),
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

const normalise = normaliseTravelOptionText;
const explicitCode = extractTravelOptionCode;

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(`${label || ''}`)) return label;
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

const resolveCode = (value, knownCodes, fallback) => explicitCode(value) || knownCodes[normalise(value)] || fallback;

const pickCarrierNames = (offer = {}, dictionaries = {}) => {
  const carrierCodes = offer.itineraries?.flatMap((itinerary) => itinerary.segments?.map((segment) => segment.carrierCode) || []) || [];
  const uniqueCodes = [...new Set(carrierCodes)];
  return uniqueCodes.map((code) => dictionaries.carriers?.[code] || code).filter(Boolean);
};

const firstSegment = (offer = {}) => offer.itineraries?.[0]?.segments?.[0];
const lastSegment = (offer = {}) => offer.itineraries?.at(-1)?.segments?.at(-1);
const firstOfferPrice = (hotel) => hotel.offers?.[0]?.price;

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

  const amadeusFetch = async (method, path, params = {}, payload) => {
    if (!providerConfig.clientId || !providerConfig.clientSecret) return null;

    const token = await requestToken();
    const url = new URL(`${providerConfig.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!response.ok) throw new Error(`Amadeus ${path} failed with ${response.status}`);
    return response.json();
  };

  const amadeusGet = (path, params = {}) => amadeusFetch('GET', path, params);

  const resolveLocationCode = async (value, knownCodes, fallback, subType = 'CITY,AIRPORT') => {
    const directCode = resolveCode(value, knownCodes, '');
    if (directCode) return directCode;
    const keyword = `${value || ''}`.trim();
    if (!keyword || !providerConfig.clientId || !providerConfig.clientSecret) return fallback;

    const response = await amadeusGet('/v1/reference-data/locations', {
      keyword,
      subType,
      'page[limit]': 1,
      view: 'LIGHT',
    });
    return response?.data?.[0]?.iataCode || fallback;
  };

  const buildFlightCriteria = (criteria = {}) => {
    const rawDestination = criteria.destinationLocationCode || criteria.destinationCode || criteria.destination;
    const rawOrigin = criteria.originLocationCode || criteria.originCode || criteria.origin;
    const destinationCode = resolveCode(rawDestination, destinationCodes, normalise(rawDestination).slice(0, 3).toUpperCase() || 'BCN');
    const departureDate = criteria.departureDate || parseDateLabel(criteria.date, providerConfig.defaultDepartureDate);
    const returnDate = criteria.returnDate || addDays(departureDate, Number(criteria.nights || parseNights(criteria.date, providerConfig.defaultNights)));

    return {
      originLocationCode: resolveCode(rawOrigin, originCodes, 'LON'),
      destinationLocationCode: destinationCode,
      departureDate,
      returnDate,
      adults: Number(criteria.adults || parseAdults(criteria.groupSize, providerConfig.defaultAdults)),
      currencyCode: criteria.currencyCode || providerConfig.currency,
      max: criteria.max || 5,
      destinationCode,
    };
  };

  const buildHotelCriteria = (criteria = {}) => {
    const flightCriteria = buildFlightCriteria(criteria);
    return {
      cityCode: criteria.cityCode || cityCodes[flightCriteria.destinationCode] || flightCriteria.destinationCode,
      checkInDate: criteria.checkInDate || flightCriteria.departureDate,
      checkOutDate: criteria.checkOutDate || flightCriteria.returnDate,
      adults: flightCriteria.adults,
      currency: flightCriteria.currencyCode,
      max: Number(criteria.max || 5),
    };
  };


  const buildFlightRequest = async (criteria = {}) => {
    const fallbackCriteria = buildFlightCriteria(criteria);
    const rawDestination = criteria.destinationLocationCode || criteria.destinationCode || criteria.destination;
    const rawOrigin = criteria.originLocationCode || criteria.originCode || criteria.origin;

    return {
      ...fallbackCriteria,
      originLocationCode: await resolveLocationCode(rawOrigin, originCodes, fallbackCriteria.originLocationCode),
      destinationLocationCode: await resolveLocationCode(rawDestination, destinationCodes, fallbackCriteria.destinationLocationCode),
    };
  };

  const buildHotelRequest = async (criteria = {}) => {
    const flightCriteria = await buildFlightRequest(criteria);
    return {
      cityCode: criteria.cityCode || cityCodes[flightCriteria.destinationLocationCode] || flightCriteria.destinationLocationCode,
      checkInDate: criteria.checkInDate || flightCriteria.departureDate,
      checkOutDate: criteria.checkOutDate || flightCriteria.returnDate,
      adults: flightCriteria.adults,
      currency: flightCriteria.currencyCode,
      max: Number(criteria.max || 5),
    };
  };

  const mapLocation = (location) => ({
    id: `amadeus-location-${location.id || location.iataCode || location.name}`,
    provider: 'amadeus',
    type: location.type || 'location',
    name: location.name || location.detailedName || location.address?.cityName || location.iataCode,
    cityName: location.address?.cityName || location.name || '',
    countryName: location.address?.countryName || location.address?.countryCode || '',
    iataCode: location.iataCode || '',
    subType: location.subType || '',
    relevance: Number(location.analytics?.travelers?.score || 0),
  });

  const mapFlightOffer = (offer, criteria = {}, dictionaries = {}, resolvedRequest = null) => {
    const request = resolvedRequest || buildFlightCriteria(criteria);
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
      priceQualifier: 'flight-only total from Amadeus sandbox',
      priceType: 'flight-only total',
      pricingConfidence: 'priced',
      sourceBreakdown: {
        flightProvider: 'amadeus',
        hotelProvider: null,
        flightPrice: Number(offer.price?.grandTotal || offer.price?.total || 0),
        hotelPrice: null,
        estimatedTotal: Number(offer.price?.grandTotal || offer.price?.total || 0),
        pricingConfidence: 'priced',
      },
      savingLabel: 'SANDBOX',
      rating: 'Provider result',
      flightSummary: `${outbound?.departure?.iataCode || request.originLocationCode} to ${outbound?.arrival?.iataCode || request.destinationLocationCode}; returns ${inbound?.departure?.iataCode || request.destinationLocationCode} to ${inbound?.arrival?.iataCode || request.originLocationCode}`,
      hotelSummary: 'Hotel can be composed through the Amadeus hotel adapter. Cabin, baggage and fare rules must be confirmed before any future booking flow.',
      nights: parseNights(criteria.date, providerConfig.defaultNights),
      departureAirport: outbound?.departure?.iataCode || request.originLocationCode,
      returnAirport: inbound?.arrival?.iataCode || request.originLocationCode,
      dateLabel: `${request.departureDate} to ${request.returnDate}`,
      groupSizeLabel: criteria.groupSize || `${request.adults} adults`,
      boardBasis: 'Flight only; cabin details vary by offer',
      baggageLabel: 'Baggage and fare-rule caveats must be checked with the airline/supplier before booking.',
      protectionLabel: 'Search only. No booking or payment is created by PickyHoliday.',
      bookingMode: 'enquiry',
      partnerUrl: '',
      tags: ['Holidays', 'Flights', 'Amadeus'],
      isDemo: false,
    };
  };

  const mapHotel = (hotel, criteria = {}, offerHotel = null) => {
    const hotelOffer = offerHotel || hotel;
    const price = firstOfferPrice(hotelOffer);
    const numericPrice = Number(price?.total || price?.base || 0);
    const hasPrice = numericPrice > 0;

    return {
      id: `amadeus-hotel-${hotel.hotelId || hotelOffer.hotel?.hotelId || hotel.name || hotel.hotelName}`,
      resultType: 'hotel-only',
      provider: 'amadeus',
      supplierName: hasPrice ? 'Amadeus Hotel Offers Search' : 'Amadeus Hotel List',
      airlineNames: [],
      destination: criteria.destination || hotel.address?.cityName || hotel.iataCode || 'Selected city',
      country: hotel.address?.countryCode || hotelOffer.hotel?.address?.countryCode || 'To be resolved by provider',
      hotelName: hotel.name || hotel.hotelName || hotelOffer.hotel?.name || 'Amadeus hotel result',
      image: 'city',
      priceFrom: numericPrice,
      currency: price?.currency || providerConfig.currency,
      priceQualifier: hasPrice ? 'hotel-only from price from Amadeus sandbox' : 'price unavailable in sandbox; confirm with supplier',
      priceType: hasPrice ? 'hotel-only from price' : 'price to confirm',
      pricingConfidence: hasPrice ? 'priced' : 'unpriced',
      sourceBreakdown: {
        flightProvider: null,
        hotelProvider: 'amadeus',
        flightPrice: null,
        hotelPrice: hasPrice ? numericPrice : null,
        estimatedTotal: hasPrice ? numericPrice : null,
        pricingConfidence: hasPrice ? 'priced' : 'unpriced',
      },
      savingLabel: hasPrice ? 'SANDBOX PRICE' : 'SANDBOX LIST',
      rating: hotel.rating ? `${hotel.rating} star` : 'Provider result',
      flightSummary: 'Flights can be composed separately through the Amadeus flight adapter.',
      hotelSummary: `${hotel.address?.lines?.join(', ') || hotelOffer.hotel?.address?.lines?.join(', ') || 'Hotel list result from Amadeus.'}`,
      nights: parseNights(criteria.date, providerConfig.defaultNights),
      departureAirport: resolveCode(criteria.origin, originCodes, 'LON'),
      returnAirport: hotel.iataCode || '',
      dateLabel: criteria.date || `${buildHotelCriteria(criteria).checkInDate} to ${buildHotelCriteria(criteria).checkOutDate}`,
      groupSizeLabel: criteria.groupSize || `${buildHotelCriteria(criteria).adults} adults`,
      boardBasis: hasPrice ? 'Hotel offer returned by sandbox; board terms must be confirmed.' : 'To be confirmed from a priced hotel offer',
      baggageLabel: 'Not applicable to hotel-only result',
      protectionLabel: 'Search only. No booking or payment is created by PickyHoliday.',
      bookingMode: 'enquiry',
      partnerUrl: '',
      tags: ['Holidays', 'Group hotel stays', 'Amadeus'],
      isDemo: false,
    };
  };

  const pricedHotelOffers = async (hotelIds = [], criteria = {}) => {
    if (!hotelIds.length) return [];
    const request = buildHotelCriteria(criteria);
    const response = await amadeusGet('/v3/shopping/hotel-offers', {
      hotelIds: hotelIds.slice(0, request.max).join(','),
      adults: request.adults,
      checkInDate: request.checkInDate,
      checkOutDate: request.checkOutDate,
      currency: request.currency,
      bestRateOnly: true,
    });
    return response?.data || [];
  };

  return {
    id: 'amadeus',
    label: 'Amadeus sandbox flight + hotel provider',
    configured: Boolean(providerConfig.clientId && providerConfig.clientSecret),
    baseUrl: providerConfig.baseUrl,
    async locations(criteria = {}) {
      const keyword = criteria.keyword || criteria.destination || '';
      if (!keyword || !this.configured) return [];
      const response = await amadeusGet('/v1/reference-data/locations', {
        keyword,
        subType: criteria.subType || 'CITY,AIRPORT',
        'page[limit]': criteria.max || 8,
        view: 'LIGHT',
      });
      return (response?.data || []).map(mapLocation);
    },
    async flights(criteria = {}) {
      const request = await buildFlightRequest(criteria);
      const response = await amadeusGet('/v2/shopping/flight-offers', request);
      if (!response) return [];
      return (response.data || []).map((offer) => mapFlightOffer(offer, criteria, response.dictionaries || {}, request));
    },
    async hotels(criteria = {}) {
      const request = await buildHotelRequest(criteria);
      const response = await amadeusGet('/v1/reference-data/locations/hotels/by-city', {
        cityCode: request.cityCode,
        radius: criteria.radius || 20,
        radiusUnit: 'KM',
        hotelSource: 'ALL',
      });
      if (!response) return [];

      const hotels = (response.data || []).slice(0, request.max);
      const hotelIds = hotels.map((hotel) => hotel.hotelId).filter(Boolean);
      let offerByHotelId = new Map();
      try {
        const offers = await pricedHotelOffers(hotelIds, criteria);
        offerByHotelId = new Map(offers.map((offer) => [offer.hotel?.hotelId, offer]));
      } catch (error) {
        console.warn('[amadeus-hotel-offers-fallback]', { message: error.message });
      }

      return hotels.map((hotel) => mapHotel(hotel, criteria, offerByHotelId.get(hotel.hotelId)));
    },
    async packages(criteria = {}) {
      return this.composeHoliday(criteria);
    },
    async composeHoliday(criteria = {}) {
      const [flights, hotels] = await Promise.all([this.flights(criteria), this.hotels(criteria)]);
      if (!flights.length || !hotels.length) return [];

      return flights.slice(0, 3).map((flight, index) => {
        const hotel = hotels[index % hotels.length];
        const flightPrice = flight.sourceBreakdown?.flightPrice || flight.priceFrom || null;
        const hotelPrice = hotel.sourceBreakdown?.hotelPrice || null;
        const estimatedTotal = flightPrice && hotelPrice ? flightPrice + hotelPrice : null;
        const pricingConfidence = estimatedTotal ? 'priced' : hotelPrice || flightPrice ? 'partial' : 'unpriced';

        return {
          ...flight,
          id: `amadeus-composed-${flight.id}-${hotel.id}`,
          resultType: 'flight-hotel',
          hotelName: hotel.hotelName,
          hotelSummary: hotel.hotelSummary,
          priceFrom: estimatedTotal || flightPrice || hotelPrice || 0,
          priceQualifier: estimatedTotal ? 'estimated flight + hotel from price' : 'price to confirm; hotel price unavailable or partial',
          priceType: estimatedTotal ? 'estimated flight + hotel from price' : 'price to confirm',
          pricingConfidence,
          sourceBreakdown: {
            flightProvider: 'amadeus',
            hotelProvider: 'amadeus',
            flightPrice,
            hotelPrice,
            estimatedTotal,
            pricingConfidence,
          },
          boardBasis: hotel.boardBasis,
          baggageLabel: flight.baggageLabel,
          tags: ['Holidays', 'Group hotel stays', 'Amadeus'],
        };
      });
    },
    async search(criteria = {}) {
      if (criteria.resultType === 'flight-only') return this.flights(criteria);
      if (criteria.resultType === 'hotel-only' || criteria.intent === 'Group hotel stays') return this.hotels(criteria);
      return this.composeHoliday(criteria);
    },
    getStatus() {
      return {
        provider: this.id,
        configured: this.configured,
        mode: this.configured ? 'sandbox-enabled' : 'needs-server-side-credentials',
        note: this.configured
          ? 'Amadeus sandbox OAuth, Airport & City Search, Flight Offers Search, Hotel List and Hotel Offers Search are enabled server-side.'
          : 'Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET on the server to enable Amadeus sandbox calls.',
      };
    },
  };
}
