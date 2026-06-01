import { Duffel } from '@duffel/api';

const DEFAULT_BASE_URL = 'https://api.duffel.com';
const DEFAULT_VERSION = 'v2';
const DEFAULT_CURRENCY = 'GBP';
const DEFAULT_ADULTS = 2;
const DEFAULT_NIGHTS = 7;

const destinationCodes = {
  barcelona: 'BCN',
  ibiza: 'IBZ',
  malaga: 'AGP',
  'costa del sol': 'AGP',
  majorca: 'PMI',
  mallorca: 'PMI',
  tenerife: 'TFS',
  alicante: 'ALC',
  benidorm: 'ALC',
  prague: 'PRG',
  albufeira: 'FAO',
  zante: 'ZTH',
  zakynthos: 'ZTH',
};

const originCodes = {
  'london (all airports)': 'LON',
  london: 'LON',
  heathrow: 'LHR',
  gatwick: 'LGW',
  manchester: 'MAN',
  birmingham: 'BHX',
  bristol: 'BRS',
  edinburgh: 'EDI',
  liverpool: 'LPL',
};

const normalise = (value = '') => value.toString().trim().toLowerCase();
const looksLikeIata = (value) => /^[A-Z]{3}$/.test(`${value || ''}`.trim().toUpperCase());
const explicitCode = (value) => (looksLikeIata(value) ? value.trim().toUpperCase() : '');
const resolveCode = (value, knownCodes, fallback) => explicitCode(value) || knownCodes[normalise(value)] || fallback;

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
  const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
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

const unique = (values) => [...new Set(values.filter(Boolean))];
const firstSegment = (offer = {}) => offer.slices?.[0]?.segments?.[0];
const lastSlice = (offer = {}) => offer.slices?.at(-1);
const lastSegment = (offer = {}) => lastSlice(offer)?.segments?.at(-1);

const carrierName = (segment = {}) => segment.operating_carrier?.name || segment.marketing_carrier?.name || segment.operating_carrier?.iata_code || segment.marketing_carrier?.iata_code;
const placeCode = (place = {}) => place.iata_code || place.iata_city_code || place.name || '';
const placeName = (place = {}) => place.city_name || place.name || placeCode(place);

const normaliseDuffelResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response.data?.offers)) return response.data.offers;
  if (Array.isArray(response.offers)) return response.offers;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export function createDuffelProvider(config = {}) {
  const providerConfig = {
    accessToken: config.accessToken,
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    version: config.version || DEFAULT_VERSION,
    defaultCurrency: config.defaultCurrency || DEFAULT_CURRENCY,
    defaultDepartureDate: config.defaultDepartureDate,
    defaultAdults: Number(config.defaultAdults || DEFAULT_ADULTS),
    defaultNights: Number(config.defaultNights || DEFAULT_NIGHTS),
  };

  const duffel = providerConfig.accessToken ? new Duffel({ token: providerConfig.accessToken }) : null;

  const buildOfferRequest = (criteria = {}) => {
    const rawDestination = criteria.destinationLocationCode || criteria.destinationCode || criteria.destination;
    const rawOrigin = criteria.originLocationCode || criteria.originCode || criteria.origin;
    const origin = resolveCode(rawOrigin, originCodes, 'LON');
    const destination = resolveCode(rawDestination, destinationCodes, normalise(rawDestination).slice(0, 3).toUpperCase() || 'BCN');
    const departureDate = criteria.departureDate || parseDateLabel(criteria.date, providerConfig.defaultDepartureDate);
    const nights = Number(criteria.nights || parseNights(criteria.date, providerConfig.defaultNights));
    const returnDate = criteria.returnDate || addDays(departureDate, nights);
    const adults = Number(criteria.adults || parseAdults(criteria.groupSize, providerConfig.defaultAdults));

    return {
      data: {
        cabin_class: criteria.cabinClass || 'economy',
        passengers: Array.from({ length: adults }, () => ({ type: 'adult' })),
        slices: [
          { origin, destination, departure_date: departureDate },
          { origin: destination, destination: origin, departure_date: returnDate },
        ],
      },
      resolved: { origin, destination, departureDate, returnDate, adults, nights },
    };
  };

  const mapOffer = (offer, criteria = {}, resolved = {}) => {
    const outbound = firstSegment(offer);
    const inbound = lastSegment(offer);
    const airlineNames = unique((offer.slices || []).flatMap((slice) => (slice.segments || []).map(carrierName)));
    const total = Number(offer.total_amount || offer.base_amount || 0);
    const destinationName = criteria.destination || placeName(outbound?.destination) || resolved.destination;

    return {
      id: `duffel-flight-${offer.id}`,
      resultType: 'flight-only',
      provider: 'duffel',
      supplierName: 'Duffel Flights API',
      airlineNames,
      destination: destinationName,
      country: criteria.country || 'To be confirmed by flight offer',
      hotelName: 'Flight only result',
      image: 'city',
      priceFrom: total,
      currency: offer.total_currency || offer.base_currency || providerConfig.defaultCurrency,
      priceQualifier: 'flight-only search result from Duffel; no booking created',
      priceType: 'flight-only total',
      pricingConfidence: total > 0 ? 'priced' : 'unpriced',
      sourceBreakdown: {
        flightProvider: 'duffel',
        hotelProvider: null,
        flightPrice: total > 0 ? total : null,
        hotelPrice: null,
        estimatedTotal: total > 0 ? total : null,
        pricingConfidence: total > 0 ? 'priced' : 'unpriced',
      },
      savingLabel: 'SEARCH ONLY',
      rating: 'Provider result',
      flightSummary: `${placeCode(outbound?.origin) || resolved.origin} to ${placeCode(outbound?.destination) || resolved.destination}; returns ${placeCode(inbound?.origin) || resolved.destination} to ${placeCode(inbound?.destination) || resolved.origin}`,
      hotelSummary: 'Flight-only search result. No Duffel order, payment, seat map or ancillary flow has been created.',
      nights: resolved.nights || parseNights(criteria.date, providerConfig.defaultNights),
      departureAirport: placeCode(outbound?.origin) || resolved.origin,
      returnAirport: placeCode(inbound?.destination) || resolved.origin,
      dateLabel: `${resolved.departureDate} to ${resolved.returnDate}`,
      groupSizeLabel: criteria.groupSize || `${resolved.adults || providerConfig.defaultAdults} adults`,
      boardBasis: 'Flight only; economy cabin search scaffold',
      baggageLabel: 'Baggage, fare rules and airline conditions must be confirmed before any booking.',
      protectionLabel: 'Search result only. No booking, order or payment is created by PickyHoliday.',
      bookingMode: 'enquiry',
      partnerUrl: '',
      tags: ['Holidays', 'Flights', 'Duffel', 'Search only'],
      isDemo: false,
    };
  };

  return {
    id: 'duffel',
    label: 'Duffel flight provider',
    configured: Boolean(providerConfig.accessToken),
    baseUrl: providerConfig.baseUrl,
    clientLibrary: '@duffel/api',
    async locations() {
      return [];
    },
    async flights(criteria = {}) {
      if (!duffel) return [];
      const { data, resolved } = buildOfferRequest(criteria);
      const response = await duffel.offerRequests.create(data, { return_offers: true });
      const offers = normaliseDuffelResponse(response);
      return offers.slice(0, Number(criteria.max || 5)).map((offer) => mapOffer(offer, criteria, resolved));
    },
    async search(criteria = {}) {
      return this.flights(criteria);
    },
    async composeHoliday(criteria = {}) {
      return this.flights(criteria);
    },
    getStatus() {
      return {
        provider: this.id,
        configured: this.configured,
        mode: this.configured ? 'official-js-client-ready' : 'needs-server-side-token',
        clientLibrary: this.clientLibrary,
        baseUrl: providerConfig.baseUrl,
        apiVersion: providerConfig.version,
        note: this.configured
          ? 'Duffel official JavaScript client is available server-side. This creates offer requests only; no orders, payments, seat maps or ancillaries are created.'
          : 'Set DUFFEL_ACCESS_TOKEN on the server to enable Duffel offer-request search. Use a test token first and keep tokens out of browser code.',
      };
    },
  };
}
