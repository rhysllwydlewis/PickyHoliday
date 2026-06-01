import { mockHolidayResults } from '../../data/mockDeals.js';
import { isHolidayResult } from '../holidayResultModel.js';

const normalise = (value = '') => value.toString().trim().toLowerCase();

const matchesDestination = (result, destination) => {
  const query = normalise(destination);
  if (!query) return true;

  return normalise([
    result.destination,
    result.country,
    result.hotelName,
    result.supplierName,
    ...(result.airlineNames || []),
    ...(result.tags || []),
  ].join(' ')).includes(query);
};

const matchesIntent = (result, intent) => {
  if (!intent || intent === 'Holidays') return result.tags.includes('Holidays');
  return result.tags.includes(intent) || result.resultType === normalise(intent).replaceAll(' ', '-');
};

const matchesResultType = (result, resultTypes) => {
  if (!resultTypes) return true;
  const allowedTypes = Array.isArray(resultTypes) ? resultTypes : [resultTypes];
  return allowedTypes.includes(result.resultType);
};

export const mockProvider = {
  id: 'mock',
  label: 'Mock holiday provider',
  async search(criteria = {}) {
    return mockHolidayResults.filter((result) => (
      isHolidayResult(result)
      && matchesDestination(result, criteria.destination)
      && matchesIntent(result, criteria.intent)
      && matchesResultType(result, criteria.resultType || criteria.resultTypes)
    ));
  },
  async flights(criteria = {}) {
    return this.search({ ...criteria, resultTypes: ['flight-hotel', 'flight-only'] });
  },
  async hotels(criteria = {}) {
    return this.search({ ...criteria, resultTypes: ['hotel-only', 'flight-hotel', 'package'] });
  },
  async packages(criteria = {}) {
    return this.search({ ...criteria, intent: criteria.intent || 'Holidays', resultTypes: ['package', 'advert'] });
  },

  async locations(criteria = {}) {
    const keyword = normalise(criteria.keyword || criteria.destination || '');
    const seen = new Set();
    return mockHolidayResults
      .filter((result) => !keyword || normalise(`${result.destination} ${result.country} ${result.departureAirport}`).includes(keyword))
      .map((result) => ({
        id: `mock-location-${normalise(result.destination).replaceAll(' ', '-')}`,
        provider: 'mock',
        type: 'location',
        name: result.destination,
        cityName: result.destination,
        countryName: result.country,
        iataCode: result.returnAirport || result.departureAirport || '',
        subType: 'CITY',
        relevance: 0.5,
      }))
      .filter((location) => {
        if (seen.has(location.id)) return false;
        seen.add(location.id);
        return true;
      })
      .slice(0, criteria.max || 8);
  },
  async composeHoliday(criteria = {}) {
    const results = await this.search(criteria);
    return results.filter((result) => ['flight-hotel', 'package'].includes(result.resultType));
  },
};
