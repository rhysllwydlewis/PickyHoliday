import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchPanel } from '../../components/search/SearchPanel.jsx';
import { SearchResultCard } from '../../components/search/SearchResultCard.jsx';
import '../../components/search/SearchResultsToolbarPolish.css';
import { ProviderDiagnostics } from '../../components/provider/ProviderDiagnostics.jsx';
import { searchComposedHolidays } from '../../services/travelApi.js';
import {
  criteriaFromSearchParams,
  criteriaToSearchParams,
  holidaySearchSummary,
  normaliseHolidaySearchCriteria,
} from '../../services/search/holidaySearchCriteria.js';
import { showProviderDiagnostics, trackEvent } from '../appConstants.js';
import { updateSeoMeta } from '../../services/seo/seoMeta.js';
import { readSearchHandoff } from '../../services/search/searchHandoff.js';

const sortLabels = {
  recommended: 'Recommended',
  'price-asc': 'Price low to high',
  'price-desc': 'Price high to low',
  'best-rated': 'Best rated',
  'easiest-travel': 'Shortest flight / easiest travel',
  'closest-match': 'Closest match',
};

const INITIAL_VISIBLE_RESULTS = 12;
const LOAD_MORE_INCREMENT = 8;

const filterSections = [
  {
    title: 'Popular filters',
    options: [
      {
        id: 'best-group-popular',
        label: 'Best group pick',
        test: (deal) => deal.dealReasonLabel === 'Best group pick' || (deal.scoreReasons || []).some((reason) => /group/i.test(reason)),
      },
      {
        id: 'live-price',
        label: 'Live price check',
        test: (deal) =>
          Boolean(deal.partnerUrl) ||
          ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider) ||
          deal.dealReasonLabel === 'Live price check',
      },
      {
        id: 'advisor-pick',
        label: 'Advisor quote pick',
        test: (deal) =>
          ['promoted-deals', 'manual-deals'].includes(deal.provider) ||
          deal.dealReasonLabel === 'Advisor quote pick' ||
          deal.bookingMode === 'manual-quote',
      },
      {
        id: 'flight-hotel',
        label: 'Flight + hotel',
        test: (deal) => ['flight-hotel', 'package'].includes(deal.resultType) || /flight/i.test(deal.flightSummary || ''),
      },
    ],
  },
  {
    title: 'Budget',
    options: [
      {
        id: 'under-300',
        label: 'Under £300pp',
        test: (deal) =>
          Number(deal.priceFrom || deal.perPersonEstimate || 0) > 0 && Number(deal.priceFrom || deal.perPersonEstimate || 0) < 300,
      },
      {
        id: '300-500',
        label: '£300–£500pp',
        test: (deal) =>
          Number(deal.priceFrom || deal.perPersonEstimate || 0) >= 300 && Number(deal.priceFrom || deal.perPersonEstimate || 0) <= 500,
      },
      {
        id: '500-plus',
        label: '£500pp+',
        test: (deal) => Number(deal.priceFrom || deal.perPersonEstimate || 0) > 500,
      },
      {
        id: 'live-price-budget',
        label: 'Live price check',
        test: (deal) => !Number(deal.priceFrom || deal.perPersonEstimate || 0) || deal.priceQualifier === 'Check live price',
      },
    ],
  },
  {
    title: 'Board basis',
    options: [
      {
        id: 'all-inclusive',
        label: 'All inclusive',
        test: (deal) => /all inclusive/i.test(deal.boardBasis || ''),
      },
      {
        id: 'half-board',
        label: 'Half board',
        test: (deal) => /half board/i.test(deal.boardBasis || ''),
      },
      {
        id: 'bed-breakfast',
        label: 'Bed & breakfast',
        test: (deal) => /(bed|breakfast|b&b)/i.test(deal.boardBasis || ''),
      },
      {
        id: 'self-catering',
        label: 'Self catering',
        test: (deal) => /self catering|apartment|villa/i.test(deal.boardBasis || ''),
      },
      {
        id: 'board-tbc',
        label: 'To confirm',
        test: (deal) => !deal.boardBasis || /confirm|tbc/i.test(deal.boardBasis || ''),
      },
    ],
  },
  {
    title: 'Group fit',
    options: [
      {
        id: 'best-group',
        label: 'Best group pick',
        test: (deal) => deal.dealReasonLabel === 'Best group pick' || (deal.scoreReasons || []).some((reason) => /group/i.test(reason)),
      },
      {
        id: 'multi-room',
        label: 'Multi-room friendly',
        test: (deal) => Number(deal.rooms || 0) > 1 || /multi-room|[2-9]\s*rooms|rooms/i.test(deal.roomMix || ''),
      },
      {
        id: 'flexible-dates',
        label: 'Flexible dates',
        test: (deal) => /flex/i.test(`${deal.dateLabel || ''} ${(deal.scoreReasons || []).join(' ')}`),
      },
    ],
  },
  {
    title: 'Rating',
    options: [
      {
        id: 'rating-4',
        label: '4★+',
        test: (deal) => Number(deal.rating || 0) >= 4,
      },
      {
        id: 'rating-3',
        label: '3★+',
        test: (deal) => Number(deal.rating || 0) >= 3,
      },
    ],
  },
  {
    title: 'Provider/source',
    options: [
      {
        id: 'partner-source',
        label: 'Partner redirect',
        test: (deal) => Boolean(deal.partnerUrl) || ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider),
      },
      {
        id: 'advisor-source',
        label: 'Advisor quote',
        test: (deal) => ['promoted-deals', 'manual-deals'].includes(deal.provider) || deal.bookingMode === 'manual-quote',
      },
      {
        id: 'composed-source',
        label: 'Composed result',
        test: (deal) => deal.provider === 'composer' || deal.resultType === 'composed' || Boolean(deal.sourceBreakdown),
      },
    ],
  },
];

const allFilterOptions = filterSections.flatMap((section) => section.options.map((option) => ({ ...option, section: section.title })));

function SearchResultsToolbar({
  count,
  totalCount,
  criteria,
  isLoading,
  activeFilterCount,
  mobileFiltersOpen,
  onSort,
  onToggleMobileFilters,
}) {
  return (
    <div className="search-results-toolbar" aria-live="polite">
      <div className="search-results-toolbar-summary">
        <p className="search-results-count">
          {isLoading ? 'Searching holiday ideas…' : `${count} ${count === 1 ? 'idea' : 'ideas'} found`}
        </p>
        <span className="search-results-summary-text">
          {holidaySearchSummary(criteria)}
          {totalCount !== count ? ` · ${totalCount} before filters` : ''}
        </span>
      </div>
      <div className="search-results-toolbar-actions">
        <label className="search-sort-control" htmlFor="search-results-sort">
          <span className="search-sort-control-label">Sort by</span>
          <select id="search-results-sort" value={criteria.sort} onChange={onSort} aria-label="Sort holiday ideas">
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="search-map-button" aria-label="Map view coming soon" disabled>
          Map view coming soon
        </button>
        <button
          type="button"
          className="search-mobile-filter-button"
          onClick={onToggleMobileFilters}
          aria-label={mobileFiltersOpen ? 'Close search filters' : 'Open search filters'}
          aria-expanded={mobileFiltersOpen}
          aria-controls="mobile-search-filters"
        >
          {activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'}
        </button>
      </div>
    </div>
  );
}

function SearchResultsFilters({ activeFilters, filterCounts, onToggleFilter, onClearFilters, mobileOpen = false, id }) {
  return (
    <div id={id} className={`search-filters-content${mobileOpen ? ' is-open' : ''}`}>
      <div className="search-filters-head">
        <div>