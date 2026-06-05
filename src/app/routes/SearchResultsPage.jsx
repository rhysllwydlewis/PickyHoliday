import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchPanel } from '../../components/search/SearchPanel.jsx';
import { SearchResultCard } from '../../components/search/SearchResultCard.jsx';
import { ProviderDiagnostics } from '../../components/provider/ProviderDiagnostics.jsx';
import { searchComposedHolidays } from '../../services/travelApi.js';
import { criteriaFromSearchParams, criteriaToSearchParams, holidaySearchSummary, normaliseHolidaySearchCriteria } from '../../services/search/holidaySearchCriteria.js';
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

const filterSections = [
  { title: 'Trip type', options: [
    { id: 'flight-hotel', label: 'Flight + hotel', test: (deal) => ['flight-hotel', 'package'].includes(deal.resultType) || /flight/i.test(deal.flightSummary || '') },
    { id: 'live-price', label: 'Partner live price', test: (deal) => Boolean(deal.partnerUrl) || ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider) || deal.dealReasonLabel === 'Live price check' },
    { id: 'advisor-pick', label: 'Advisor quote pick', test: (deal) => ['promoted-deals', 'manual-deals'].includes(deal.provider) || deal.dealReasonLabel === 'Advisor quote pick' },
  ] },
  { title: 'Budget', options: [
    { id: 'under-300', label: 'Under £300pp', test: (deal) => Number(deal.priceFrom || deal.perPersonEstimate || 0) > 0 && Number(deal.priceFrom || deal.perPersonEstimate || 0) < 300 },
    { id: '300-500', label: '£300–£500pp', test: (deal) => Number(deal.priceFrom || deal.perPersonEstimate || 0) >= 300 && Number(deal.priceFrom || deal.perPersonEstimate || 0) <= 500 },
    { id: '500-plus', label: '£500pp+', test: (deal) => Number(deal.priceFrom || deal.perPersonEstimate || 0) > 500 },
    { id: 'live-price-budget', label: 'Live price check', test: (deal) => !Number(deal.priceFrom || deal.perPersonEstimate || 0) || deal.priceQualifier === 'Check live price' },
  ] },
  { title: 'Board basis', options: [
    { id: 'all-inclusive', label: 'All inclusive', test: (deal) => /all inclusive/i.test(deal.boardBasis || '') },
    { id: 'half-board', label: 'Half board', test: (deal) => /half board/i.test(deal.boardBasis || '') },
    { id: 'bed-breakfast', label: 'Bed & breakfast', test: (deal) => /(bed|breakfast|b&b)/i.test(deal.boardBasis || '') },
    { id: 'board-tbc', label: 'To confirm', test: (deal) => !deal.boardBasis || /confirm|tbc/i.test(deal.boardBasis || '') },
  ] },
  { title: 'Group fit', options: [
    { id: 'best-group', label: 'Best group pick', test: (deal) => deal.dealReasonLabel === 'Best group pick' || (deal.scoreReasons || []).some((reason) => /group/i.test(reason)) },
    { id: 'multi-room', label: 'Multi-room friendly', test: (deal) => Number(deal.rooms || 0) > 1 || /multi-room|[2-9]\s*rooms|rooms/i.test(deal.roomMix || '') },
    { id: 'flexible-dates', label: 'Flexible dates', test: (deal) => /flex/i.test(`${deal.dateLabel || ''} ${(deal.scoreReasons || []).join(' ')}`) },
  ] },
  { title: 'Rating', options: [
    { id: 'rating-4', label: '4★+', test: (deal) => Number(deal.rating || 0) >= 4 },
    { id: 'rating-3', label: '3★+', test: (deal) => Number(deal.rating || 0) >= 3 },
  ] },
  { title: 'Provider/source', options: [
    { id: 'partner-source', label: 'Partner redirect', test: (deal) => Boolean(deal.partnerUrl) || ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider) },
    { id: 'advisor-source', label: 'Advisor quote', test: (deal) => ['promoted-deals', 'manual-deals'].includes(deal.provider) || deal.bookingMode === 'manual-quote' },
    { id: 'composed-source', label: 'Composed result', test: (deal) => deal.provider === 'composer' || deal.resultType === 'composed' || Boolean(deal.sourceBreakdown) },
  ] },
];

const allFilterOptions = filterSections.flatMap((section) => section.options.map((option) => ({ ...option, section: section.title })));

function SearchResultsToolbar({ count, criteria, isLoading, mobileFiltersOpen, onSort, onToggleMobileFilters }) {
  return (
    <div className="search-results-toolbar" aria-live="polite">
      <div>
        <p className="search-results-count">{isLoading ? 'Searching ideas…' : `${count} ${count === 1 ? 'idea' : 'ideas'} found`}</p>
        <span>{holidaySearchSummary(criteria)}</span>
      </div>
      <div className="search-results-toolbar-actions">
        <label className="search-sort-control" htmlFor="search-results-sort">Sort by
          <select id="search-results-sort" value={criteria.sort} onChange={onSort} aria-label="Sort holiday ideas">
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" className="search-map-button" aria-label="Map view coming soon">Map view coming soon</button>
        <button type="button" className="search-mobile-filter-button" onClick={onToggleMobileFilters} aria-label={mobileFiltersOpen ? 'Close search filters' : 'Open search filters'} aria-expanded={mobileFiltersOpen} aria-controls="mobile-search-filters">Filters</button>
      </div>
    </div>
  );
}

function SearchResultsFilters({ activeFilters, onToggleFilter, onClearFilters, mobileOpen = false, id }) {
  return (
    <div id={id} className={`search-filters-content${mobileOpen ? ' is-open' : ''}`}>
      <div className="search-filters-head">
        <div><span>Refine results</span><b>Helpful filters</b></div>
        {activeFilters.length > 0 && <button type="button" onClick={onClearFilters}>Clear filters</button>}
      </div>
      {filterSections.map((section) => (
        <fieldset className="search-filter-section" key={section.title}>
          <legend>{section.title}</legend>
          {section.options.map((option) => (
            <label key={option.id}>
              <input type="checkbox" checked={activeFilters.includes(option.id)} onChange={() => onToggleFilter(option.id)} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function SearchResultsAppliedChips({ activeFilters, onRemoveFilter, onClearFilters }) {
  if (!activeFilters.length) return null;
  return (
    <div className="search-results-applied-filters" aria-label="Applied search filters">
      <span>Applied filters</span>
      {activeFilters.map((filterId) => {
        const filter = allFilterOptions.find((option) => option.id === filterId);
        return <button key={filterId} type="button" onClick={() => onRemoveFilter(filterId)}>{filter?.label || filterId} ×</button>;
      })}
      <button type="button" className="clear-all" onClick={onClearFilters}>Clear filters</button>
    </div>
  );
}

function SearchResultsLoadingSkeleton() {
  return (
    <div className="search-result-list search-result-skeleton-list" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <article className="search-result-card search-result-skeleton" key={index}>
          <div className="search-result-card-media" />
          <div className="search-result-card-body"><span /><h2 /><p /><p /><div /></div>
          <div className="search-result-card-price"><span /><p /><button type="button" tabIndex={-1} /></div>
        </article>
      ))}
    </div>
  );
}

function SearchQuoteStrip({ results, onQuote }) {
  if (!results.length) return null;
  return (
    <div className="search-quote-strip">
      <div>
        <p>Need multi-room allocation or a bespoke group check?</p>
        <span>Send up to three ideas to an advisor for a saved enquiry. No booking has been created and no payment has been taken.</span>
      </div>
      <button type="button" onClick={() => onQuote(results.slice(0, 3))}>Ask for group quote</button>
    </div>
  );
}

export function SearchResultsPage({ onOpenDeal, isShortlisted, onToggleShortlist, onQuote, diagnostics, setDiagnostics, locationSuggestions, onLookupLocations }) {
  const requestIdRef = useRef(0);
  const [initialHandoff] = useState(() => readSearchHandoff(window.location.search));
  const [criteria, setCriteria] = useState(() => initialHandoff?.criteria || criteriaFromSearchParams(window.location.search));
  const [activeTab, setActiveTab] = useState(criteria.intent || 'Holidays');
  const [results, setResults] = useState(() => initialHandoff?.response?.results || []);
  const [isLoading, setIsLoading] = useState(() => !initialHandoff);
  const [error, setError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const applySearchResponse = useCallback((response, normalised) => {
    setResults(response.results || []);
    setDiagnostics((current) => ({
      ...current,
      backendMode: response.providerMode || current.backendMode,
      activeProviders: response.meta?.activeProviders || current.activeProviders,
      latestSource: (response.providerStatus || []).filter((status) => status.resultCount > 0).map((status) => status.provider).join(', ') || response.providerMode,
      providerErrors: response.providerErrors || [],
      providerStatus: response.providerStatus || current.providerStatus,
    }));
    trackEvent({ type: 'composed_search_results_viewed', category: 'search', label: normalised.destination || normalised.intent, metadata: { destination: normalised.destination, providerMode: response.providerMode, resultCount: response.results?.length || 0, sort: normalised.sort } });
  }, [setDiagnostics]);

  const runSearch = useCallback(async (nextCriteria = criteria) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const normalised = normaliseHolidaySearchCriteria(nextCriteria);
    setIsLoading(true);
    setError('');
    try {
      const response = await searchComposedHolidays(normalised);
      if (requestIdRef.current !== requestId) return;
      applySearchResponse(response, normalised);
    } catch (searchError) {
      if (requestIdRef.current !== requestId) return;
      setError('Sorry, composed holiday ideas are temporarily unavailable. You can still ask for a group quote.');
      setResults([]);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [applySearchResponse, criteria]);

  useEffect(() => {
    updateSeoMeta({ metaTitle: 'Search holiday ideas | PickyHoliday', metaDescription: 'Search enquiry-first group holiday ideas with destination, airports, dates, adults, children and rooms.', canonicalPath: '/search' });
    if (initialHandoff) {
      const params = criteriaToSearchParams(initialHandoff.criteria);
      window.history.replaceState({}, '', `/search?${params.toString()}`);
      setError('');
      applySearchResponse(initialHandoff.response, initialHandoff.criteria);
      return;
    }
    runSearch(criteria);
  }, []);

  const updateCriteria = (nextCriteria, { push = true, eventType = '' } = {}) => {
    const normalised = normaliseHolidaySearchCriteria(nextCriteria);
    setCriteria(normalised);
    setActiveTab(normalised.intent);
    if (push) window.history.replaceState({}, '', `/search?${criteriaToSearchParams(normalised).toString()}`);
    if (eventType) trackEvent({ type: eventType, category: 'search', label: normalised.destination || normalised.intent, metadata: { sort: normalised.sort, destination: normalised.destination } });
    return normalised;
  };

  const submitSearch = () => {
    setActiveFilters([]);
    const normalised = updateCriteria({ ...criteria, intent: activeTab }, { eventType: 'composed_search_submitted' });
    runSearch(normalised);
  };

  const updateSort = (event) => {
    const normalised = updateCriteria({ ...criteria, sort: event.target.value }, { eventType: 'composed_search_sort_changed' });
    runSearch(normalised);
  };

  const toggleFilter = (filterId) => {
    setActiveFilters((current) => (current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId]));
    trackEvent({ type: 'composed_search_filter_changed', category: 'search', label: filterId, metadata: { destination: criteria.destination } });
  };

  const clearFilters = () => setActiveFilters([]);
  const removeFilter = (filterId) => setActiveFilters((current) => current.filter((item) => item !== filterId));

  const displayedResults = useMemo(() => {
    if (!activeFilters.length) return results;
    const selectedFilters = allFilterOptions.filter((option) => activeFilters.includes(option.id));
    const filtersBySection = selectedFilters.reduce((groups, filter) => {
      groups[filter.section] = [...(groups[filter.section] || []), filter];
      return groups;
    }, {});
    return results.filter((deal) => Object.values(filtersBySection).every((sectionFilters) => sectionFilters.some((filter) => filter.test(deal))));
  }, [activeFilters, results]);

  const resultCountCopy = isLoading ? 'Searching group holiday ideas…' : `${displayedResults.length} group holiday ${displayedResults.length === 1 ? 'idea' : 'ideas'} found`;

  return (
    <main className="search-results-page">
      <section className="search-results-top">
        <div className="content search-results-top-inner">
          <div className="search-results-heading" aria-live="polite">
            <span>Search holiday ideas</span>
            <h1>{resultCountCopy}</h1>
            <p>{holidaySearchSummary(criteria)}</p>
            <div className="search-results-trust-chips" aria-label="Search safety promises">
              <span>Enquiry-first</span>
              <span>No payment taken</span>
              <span>Partner live-price checks</span>
            </div>
            <p className="search-results-safety-copy">These are enquiry-first ideas, partner redirects, quote requests or live-price checks only. No booking has been created, no payment has been taken and no supplier reservation has been made.</p>
          </div>
          <div className="search-results-refine-bar">
            <SearchPanel activeTab={activeTab} setActiveTab={setActiveTab} search={criteria} setSearch={setCriteria} onSearch={submitSearch} isLoading={isLoading} locationSuggestions={locationSuggestions} onLookupLocations={onLookupLocations} />
          </div>
        </div>
      </section>

      <section className="content search-results-layout">
        <aside className="search-filters-panel" aria-label="Search results filters">
          <SearchResultsFilters activeFilters={activeFilters} onToggleFilter={toggleFilter} onClearFilters={clearFilters} />
        </aside>

        <div className="search-results-main">
          <SearchResultsToolbar count={displayedResults.length} criteria={criteria} isLoading={isLoading} mobileFiltersOpen={mobileFiltersOpen} onSort={updateSort} onToggleMobileFilters={() => setMobileFiltersOpen((value) => !value)} />
          <div className="search-mobile-filters" aria-label="Mobile search filters">
            <SearchResultsFilters id="mobile-search-filters" activeFilters={activeFilters} onToggleFilter={toggleFilter} onClearFilters={clearFilters} mobileOpen={mobileFiltersOpen} />
          </div>
          <SearchResultsAppliedChips activeFilters={activeFilters} onRemoveFilter={removeFilter} onClearFilters={clearFilters} />

          {showProviderDiagnostics && (
            <div className="diagnostic-toggle"><button type="button" onClick={() => setShowDiagnostics((value) => !value)}>{showDiagnostics ? 'Hide' : 'Show'} provider diagnostics</button></div>
          )}
          {showProviderDiagnostics && showDiagnostics && <ProviderDiagnostics diagnostics={diagnostics} onRefresh={() => {}} />}

          <div className="search-results-status" aria-live="polite">
            {isLoading && <span className="sr-only">Searching holiday ideas…</span>}
            {error && <div className="error-state">{error}</div>}
          </div>

          <div className="search-result-list" aria-busy={isLoading}>
            {isLoading && <SearchResultsLoadingSkeleton />}
            {!isLoading && !error && displayedResults.map((deal) => (
              <SearchResultCard key={deal.id || deal.resultId} deal={deal} onView={onOpenDeal} isShortlisted={isShortlisted(deal)} onToggleShortlist={onToggleShortlist} onQuote={onQuote} />
            ))}
          </div>

          {!isLoading && !error && results.length > 0 && displayedResults.length === 0 && (
            <div className="empty-state search-results-empty">
              <h2>No holiday ideas match those filters yet.</h2>
              <p>Try removing a filter, widening the budget or asking an advisor to check a bespoke group option.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
          {!isLoading && !error && results.length === 0 && (
            <div className="empty-state search-results-empty">
              <h2>No composed holiday ideas matched this search yet.</h2>
              <p>Try flexible dates, a different airport or ask for a group quote.</p>
              <button type="button" onClick={() => onQuote([])}>Ask for group quote</button>
            </div>
          )}

          <SearchQuoteStrip results={displayedResults} onQuote={onQuote} />
        </div>
      </section>
    </main>
  );
}
