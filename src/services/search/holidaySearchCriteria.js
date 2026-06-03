const asString = (value, fallback = '') => (value ?? fallback).toString().trim();
const asPositiveInt = (value, fallback, { min = 0, max = 99 } = {}) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};
const asMoney = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
};
const allowedFlexibilityDays = [0, 1, 2, 3, 7];
const allowedSorts = ['recommended', 'price-asc', 'price-desc', 'best-rated', 'easiest-travel', 'closest-match'];

export const defaultHolidaySearchCriteria = {
  destination: '',
  originAirport: 'London (All Airports)',
  origin: 'London (All Airports)',
  departureDate: '',
  returnDate: '',
  nights: 7,
  dateFlexibilityDays: 0,
  flexibleDates: false,
  adults: 2,
  children: 0,
  partySize: 2,
  rooms: 1,
  roomMix: '',
  budgetPerPerson: null,
  intent: 'Holidays',
  holidayType: 'Holidays',
  sort: 'recommended',
  filters: {},
};

export function normaliseHolidaySearchCriteria(input = {}) {
  const source = input || {};
  const destination = asString(source.destination);
  const originAirport = asString(source.originAirport || source.origin || source.departureAirport, defaultHolidaySearchCriteria.originAirport);
  const departureDate = asString(source.departureDate || source.date);
  const returnDate = asString(source.returnDate);
  const nights = asPositiveInt(source.nights, defaultHolidaySearchCriteria.nights, { min: 1, max: 60 });
  const rawFlex = asPositiveInt(source.dateFlexibilityDays ?? source.flexibilityDays, 0, { min: 0, max: 7 });
  const dateFlexibilityDays = allowedFlexibilityDays.includes(rawFlex) ? rawFlex : 0;
  const adults = asPositiveInt(source.adults, undefined, { min: 1, max: 60 });
  const children = asPositiveInt(source.children, 0, { min: 0, max: 60 });
  const derivedPartySize = adults ? adults + children : undefined;
  const partySize = asPositiveInt(source.partySize ?? source.groupSize, derivedPartySize || defaultHolidaySearchCriteria.partySize, { min: 1, max: 120 });
  const safeAdults = adults || Math.max(1, partySize - children);
  const rooms = asPositiveInt(source.rooms, defaultHolidaySearchCriteria.rooms, { min: 1, max: 30 });
  const intent = asString(source.intent || source.holidayType, defaultHolidaySearchCriteria.intent);
  const sort = allowedSorts.includes(source.sort) ? source.sort : defaultHolidaySearchCriteria.sort;
  const filters = source.filters && typeof source.filters === 'object' && !Array.isArray(source.filters) ? { ...source.filters } : {};

  return {
    destination,
    originAirport,
    origin: originAirport,
    departureAirport: originAirport,
    departureDate,
    returnDate,
    nights,
    dateFlexibilityDays,
    flexibleDates: Boolean(source.flexibleDates) || dateFlexibilityDays > 0,
    adults: safeAdults,
    children,
    partySize,
    rooms,
    roomMix: asString(source.roomMix, rooms > 1 ? `${rooms} rooms` : '1 room'),
    budgetPerPerson: asMoney(source.budgetPerPerson),
    intent,
    holidayType: asString(source.holidayType || intent, intent),
    sort,
    filters,
  };
}

export function criteriaToSearchParams(criteria = {}) {
  const normalised = normaliseHolidaySearchCriteria(criteria);
  const params = new URLSearchParams();
  Object.entries(normalised).forEach(([key, value]) => {
    if (key === 'filters') {
      if (Object.keys(value || {}).length) params.set(key, JSON.stringify(value));
      return;
    }
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });
  return params;
}

export function criteriaFromSearchParams(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || '');
  const filtersRaw = params.get('filters');
  let filters = {};
  if (filtersRaw) {
    try { filters = JSON.parse(filtersRaw); } catch (error) { filters = {}; }
  }
  return normaliseHolidaySearchCriteria({
    destination: params.get('destination') || '',
    originAirport: params.get('originAirport') || params.get('origin') || '',
    departureDate: params.get('departureDate') || '',
    returnDate: params.get('returnDate') || '',
    nights: params.get('nights') || undefined,
    dateFlexibilityDays: params.get('dateFlexibilityDays') || undefined,
    flexibleDates: params.get('flexibleDates') === 'true',
    adults: params.get('adults') || undefined,
    children: params.get('children') || undefined,
    partySize: params.get('partySize') || undefined,
    rooms: params.get('rooms') || undefined,
    roomMix: params.get('roomMix') || '',
    budgetPerPerson: params.get('budgetPerPerson') || undefined,
    intent: params.get('intent') || params.get('holidayType') || '',
    holidayType: params.get('holidayType') || '',
    sort: params.get('sort') || undefined,
    filters,
  });
}

export function holidaySearchSummary(criteria = {}) {
  const item = normaliseHolidaySearchCriteria(criteria);
  const destination = item.destination || 'anywhere';
  const date = item.departureDate ? `${item.departureDate}${item.returnDate ? ` to ${item.returnDate}` : ` · ${item.nights} nights`}` : `${item.nights} flexible nights`;
  const flex = item.dateFlexibilityDays ? ` ±${item.dateFlexibilityDays} days` : ' exact dates';
  return `${destination} from ${item.originAirport} · ${date}${flex} · ${item.partySize} people · ${item.rooms} room${item.rooms === 1 ? '' : 's'}`;
}
