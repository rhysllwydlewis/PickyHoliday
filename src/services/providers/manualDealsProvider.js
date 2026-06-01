import { mockHolidayResults } from '../../data/mockDeals.js';

export const manualDealsProvider = {
  id: 'manual-deals',
  label: 'Manual curated deals and adverts provider',
  async search(criteria = {}) {
    const destination = (criteria.destination || '').toLowerCase();
    return mockHolidayResults.filter((result) => {
      const isManual = (['manual-deals', 'mock'].includes(result.provider) && ['advert', 'hotel-only'].includes(result.resultType)) || result.bookingMode === 'manual-quote';
      if (!isManual) return false;
      if (!destination) return true;
      return `${result.destination} ${result.country} ${result.hotelName} ${result.tags.join(' ')}`.toLowerCase().includes(destination);
    });
  },
  async adverts(criteria = {}) {
    return this.search(criteria);
  },
};
