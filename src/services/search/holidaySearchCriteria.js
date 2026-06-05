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

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateToUtc = (value) => {
  if (!isoDatePattern.test(`${value || ''}`)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const utcDateToIso = (date) => date.toISOString().slice(0, 10);
export const addDaysToIsoDate = (value, days = 0) => {
  const date = isoDateToUtc(value);
  if (!date) return '';
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return utcDateToIso(next);
};
export const daysBetweenIsoDates = (start, end) => {
  const startDate = isoDateToUtc(start);
  const endDate = isoDateToUtc(end);
  if (!startDate || !endDate) return null;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
};
export function applySmartHolidaySearchField(current = {}, name, value) {
  const draft = { ...current, [name]: value };
  const criteria = normaliseHolidaySearchCriteria(draft);
  if (name === 'departureDate' && criteria.departureDate) {
    const currentGap = daysBetweenIsoDates(criteria.departureDate, criteria.returnDate);
    if (currentGap && currentGap > 0) {
      criteria.nights = Math.min(60, currentGap);
      if (currentGap > 60) criteria.returnDate = addDaysToIsoDate(criteria.departureDate, criteria.nights);
    } else {
      criteria.returnDate = addDaysToIsoDate(criteria.departureDate, criteria.nights);
    }
  }
  if (name === 'returnDate' && criteria.departureDate && criteria.returnDate) {
    const nights = daysBetweenIsoDates(criteria.departureDate, criteria.returnDate);
    if (nights && nights > 0) {
      criteria.nights = Math.min(60, nights);
      if (nights > 60) criteria.returnDate = addDaysToIsoDate(criteria.departureDate, criteria.nights);
    } else {
      criteria.returnDate = addDaysToIsoDate(criteria.departureDate, criteria.nights || 1);
    }
  }
  if (name === 'nights' && criteria.departureDate) {
    criteria.returnDate = addDaysToIsoDate(criteria.departureDate, criteria.nights);
  }
  if (['adults', 'children', 'rooms'].includes(name) && criteria.rooms > criteria.partySize) {
    criteria.rooms = Math.max(1, Math.min(criteria.rooms, criteria.partySize));
    criteria.roomMix = criteria.rooms > 1 ? `${criteria.rooms} rooms` : '1 room';
  }
  return normaliseHolidaySearchCriteria(criteria);
}

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
  const legacyPartySize = asPositiveInt(source.partySize ?? source.groupSize, defaultHolidaySearchCriteria.partySize, { min: 1, max: 120 });
  const partySize = derivedPartySize || legacyPartySize;
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
