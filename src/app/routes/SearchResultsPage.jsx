import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchPanel } from '../../components/search/SearchPanel.jsx';
import { SearchResultCard } from '../../components/search/SearchResultCard.jsx';
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
      <div>
        <p className="search-results-count">
          {isLoading ? 'Searching holiday ideas…' : `${count} ${count === 1 ? 'idea' : 'ideas'} found`}
        </p>
        <span>
          {holidaySearchSummary(criteria)}
          {totalCount !== count ? ` · ${totalCount} before filters` : ''}
        </span>
      </div>
      <div className="search-results-toolbar-actions">
        <label className="search-sort-control" htmlFor="search-results-sort">
          Sort by
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
          <span>Refine results</span>
          <b>Helpful filters</b>
        </div>
        {activeFilters.length > 0 && (
          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
      {filterSections.map((section) => (
        <fieldset className="search-filter-section" key={section.title}>
          <legend>{section.title}</legend>
          {section.options.map((option) => {
            const count = filterCounts?.[option.id] || 0;
            const checked = activeFilters.includes(option.id);
            return (
              <label key={option.id} className={checked ? 'is-selected' : ''}>
                <input type="checkbox" checked={checked} onChange={() => onToggleFilter(option.id)} />
                <span>{option.label}</span>
                <b aria-label={`${count} matching ideas`}>{count}</b>
              </label>
            );
          })}
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
        return (
          <button key={filterId} type="button" onClick={() => onRemoveFilter(filterId)}>
            {filter ? `${filter.section}: ${filter.label}` : filterId} ×
          </button>
        );
      })}
      <button type="button" className="clear-all" onClick={onClearFilters}>
        Clear filters
      </button>
    </div>
  );
}

function SearchResultsLoadingSkeleton() {
  return (
    <>
      <span className="sr-only">Searching holiday ideas…</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <article className="search-result-card search-result-skeleton" key={index} aria-hidden="true">
          <div className="search-result-card-media" />
          <div className="search-result-card-body">
            <span />
            <h2 />
            <p />
            <p />
            <div />
          </div>
          <div className="search-result-card-price">
            <span />
            <p />
            <button type="button" tabIndex={-1} />
          </div>
        </article>
      ))}
    </>
  );
}

function SearchQuoteStrip({ results, onQuote, variant = '' }) {
  if (!results.length) return null;
  return (
    <div className={`search-quote-strip${variant ? ` search-quote-strip--${variant}` : ''}`}>
      <div>
        <p>Need help checking rooms, dates or group extras?</p>
        <span>We’ll help shape the enquiry before any partner confirmation. No payment taken by PickyHoliday.</span>
      </div>
      <button type="button" onClick={() => onQuote(results.slice(0, 3))}>
        Ask for group quote
      </button>
    </div>
  );
}


function SearchResultsRecoveryPanel({ title, message, criteria, activeFilters = [], onClearFilters, onQuote, primaryAction = 'quote' }) {
  const destination = criteria.destination?.trim() || 'your group';
  const hasFilters = activeFilters.length > 0;
  return (
    <section className="empty-state search-results-empty search-results-recovery" aria-labelledby="search-results-recovery-title">
      <div>
        <span className="search-results-recovery-kicker">Still planning?</span>
        <h2 id="search-results-recovery-title">{title}</h2>
        <p>{message}</p>
      </div>
      <ul aria-label="Ways to improve this search">
        {hasFilters && <li>Remove one or two filters to widen the matching holiday ideas.</li>}
        <li>Try flexible dates or nearby airports if {destination} is not fixed.</li>
        <li>Ask us to check room mixes, child ages and group extras before any partner confirmation.</li>
      </ul>
      <div className="search-results-recovery-actions">
        {hasFilters && (
          <button type="button" className="search-results-secondary-action" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
        <button type="button" onClick={() => onQuote([])}>
          {primaryAction === 'retry' ? 'Ask for manual help' : 'Ask for group quote'}
        </button>
      </div>
    </section>
  );
}

export function SearchResultsPage({
  onOpenDeal,
  isShortlisted,
  onToggleShortlist,
  onQuote,
  diagnostics,
  setDiagnostics,
  locationSuggestions,
  onLookupLocations,
}) {
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
  const [visibleResultCount, setVisibleResultCount] = useState(INITIAL_VISIBLE_RESULTS);

  const applySearchResponse = useCallback(
    (response, normalised) => {
      setResults(response.results || []);
      setDiagnostics((current) => ({
        ...current,
        backendMode: response.providerMode || current.backendMode,
        activeProviders: response.meta?.activeProviders || current.activeProviders,
        latestSource:
          (response.providerStatus || [])
            .filter((status) => status.resultCount > 0)
            .map((status) => status.provider)
            .join(', ') || response.providerMode,
        providerErrors: response.providerErrors || [],
        providerStatus: response.providerStatus || current.providerStatus,
      }));
      trackEvent({
        type: 'composed_search_results_viewed',
        category: 'search',
        label: normalised.destination || normalised.intent,
        metadata: {
          destination: normalised.destination,
          providerMode: response.providerMode,
          resultCount: response.results?.length || 0,
          sort: normalised.sort,
        },
      });
    },
    [setDiagnostics],
  );

  const runSearch = useCallback(
    async (nextCriteria = criteria) => {
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
    },
    [applySearchResponse, criteria],
  );

  useEffect(() => {
    updateSeoMeta({
      metaTitle: 'Search holiday ideas | PickyHoliday',
      metaDescription: 'Search enquiry-first group holiday ideas with destination, airports, dates, adults, children and rooms.',
      canonicalPath: '/search',
    });
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
    if (eventType)
      trackEvent({
        type: eventType,
        category: 'search',
        label: normalised.destination || normalised.intent,
        metadata: {
          sort: normalised.sort,
          destination: normalised.destination,
        },
      });
    return normalised;
  };

  const submitSearch = () => {
    setActiveFilters([]);
    setVisibleResultCount(INITIAL_VISIBLE_RESULTS);
    const normalised = updateCriteria({ ...criteria, intent: activeTab }, { eventType: 'composed_search_submitted' });
    runSearch(normalised);
  };

  const updateSort = (event) => {
    const normalised = updateCriteria({ ...criteria, sort: event.target.value }, { eventType: 'composed_search_sort_changed' });
    runSearch(normalised);
  };

  const toggleFilter = (filterId) => {
    setActiveFilters((current) => (current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId]));
    trackEvent({
      type: 'composed_search_filter_changed',
      category: 'search',
      label: filterId,
      metadata: { destination: criteria.destination },
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setVisibleResultCount(INITIAL_VISIBLE_RESULTS);
  };
  const removeFilter = (filterId) => {
    setActiveFilters((current) => current.filter((item) => item !== filterId));
    setVisibleResultCount(INITIAL_VISIBLE_RESULTS);
  };

  const filterCounts = useMemo(
    () =>
      allFilterOptions.reduce(
        (counts, option) => ({
          ...counts,
          [option.id]: results.filter((deal) => option.test(deal)).length,
        }),
        {},
      ),
    [results],
  );

  const displayedResults = useMemo(() => {
    if (!activeFilters.length) return results;
    const selectedFilters = allFilterOptions.filter((option) => activeFilters.includes(option.id));
    const filtersBySection = selectedFilters.reduce((groups, filter) => {
      groups[filter.section] = [...(groups[filter.section] || []), filter];
      return groups;
    }, {});
    return results.filter((deal) =>
      Object.values(filtersBySection).every((sectionFilters) => sectionFilters.some((filter) => filter.test(deal))),
    );
  }, [activeFilters, results]);

  const visibleResults = useMemo(() => displayedResults.slice(0, visibleResultCount), [displayedResults, visibleResultCount]);
  const hasMoreResults = visibleResults.length < displayedResults.length;

  useEffect(() => {
    setVisibleResultCount(INITIAL_VISIBLE_RESULTS);
  }, [activeFilters, results]);

  return (
    <main className="search-results-page">
      <section className="search-results-top" aria-label="Refine holiday search">
        <div className="content search-results-top-inner">
          <div className="search-results-refine-bar">
            <SearchPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              search={criteria}
              setSearch={setCriteria}
              onSearch={submitSearch}
              isLoading={isLoading}
              locationSuggestions={locationSuggestions}
              onLookupLocations={onLookupLocations}
            />
          </div>
        </div>
      </section>

      <section className="content search-results-layout">
        <aside className="search-filters-panel" aria-label="Search results filters">
          <SearchResultsFilters
            activeFilters={activeFilters}
            filterCounts={filterCounts}
            onToggleFilter={toggleFilter}
            onClearFilters={clearFilters}
          />
        </aside>

        <div className="search-results-main">
          <SearchResultsToolbar
            count={displayedResults.length}
            totalCount={results.length}
            criteria={criteria}
            isLoading={isLoading}
            activeFilterCount={activeFilters.length}
            mobileFiltersOpen={mobileFiltersOpen}
            onSort={updateSort}
            onToggleMobileFilters={() => setMobileFiltersOpen((value) => !value)}
          />
          <div className="search-mobile-filters" aria-label="Mobile search filters">
            <SearchResultsFilters
              id="mobile-search-filters"
              activeFilters={activeFilters}
              filterCounts={filterCounts}
              onToggleFilter={toggleFilter}
              onClearFilters={clearFilters}
              mobileOpen={mobileFiltersOpen}
            />
          </div>
          <SearchResultsAppliedChips activeFilters={activeFilters} onRemoveFilter={removeFilter} onClearFilters={clearFilters} />
          <p className="search-results-safety-note">
            Enquiry-first holiday ideas. No booking created. No payment taken. Prices and availability are confirmed by the partner or advisor.
          </p>

          {showProviderDiagnostics && (
            <div className="diagnostic-toggle">
              <button type="button" onClick={() => setShowDiagnostics((value) => !value)}>
                {showDiagnostics ? 'Hide' : 'Show'} provider diagnostics
              </button>
            </div>
          )}
          {showProviderDiagnostics && showDiagnostics && <ProviderDiagnostics diagnostics={diagnostics} onRefresh={() => {}} />}

          <div className="search-results-status" aria-live="polite">
            {isLoading && <span className="sr-only">Searching holiday ideas…</span>}
            {error && <div className="error-state">{error}</div>}
          </div>

          <div className="search-result-list" aria-busy={isLoading}>
            {isLoading && <SearchResultsLoadingSkeleton />}
            {!isLoading &&
              !error &&
              visibleResults.map((deal, index) => (
                <React.Fragment key={deal.id || deal.resultId || index}>
                  {index === 6 && displayedResults.length > 9 && (
                    <SearchQuoteStrip results={displayedResults} onQuote={onQuote} variant="inline" />
                  )}
                  <SearchResultCard
                    deal={deal}
                    index={index}
                    onView={onOpenDeal}
                    isShortlisted={isShortlisted(deal)}
                    onToggleShortlist={onToggleShortlist}
                  />
                </React.Fragment>
              ))}
          </div>

          {!isLoading && !error && hasMoreResults && (
            <div className="search-results-load-more">
              <p>
                Showing {visibleResults.length} of {displayedResults.length} matching holiday ideas.
              </p>
              <button
                type="button"
                aria-label={`Load more holiday ideas. Showing ${visibleResults.length} of ${displayedResults.length}.`}
                onClick={() => setVisibleResultCount((count) => count + LOAD_MORE_INCREMENT)}
              >
                Load more ideas
              </button>
            </div>
          )}

          {!isLoading && error && (
            <SearchResultsRecoveryPanel
              title="We could not load live holiday ideas."
              message="The live search has not responded, but your trip details can still be sent for advisor follow-up."
              criteria={criteria}
              onClearFilters={clearFilters}
              onQuote={onQuote}
              primaryAction="retry"
            />
          )}
          {!isLoading && !error && results.length > 0 && displayedResults.length === 0 && (
            <SearchResultsRecoveryPanel
              title="No ideas match these filters yet."
              message="Your search has results, but the current filters are too narrow for this group trip."
              criteria={criteria}
              activeFilters={activeFilters}
              onClearFilters={clearFilters}
              onQuote={onQuote}
            />
          )}
          {!isLoading && !error && results.length === 0 && (
            <SearchResultsRecoveryPanel
              title="No ideas match this search yet."
              message="We can still help sense-check the destination, dates and room mix before you commit elsewhere."
              criteria={criteria}
              onClearFilters={clearFilters}
              onQuote={onQuote}
            />
          )}

          <SearchQuoteStrip results={displayedResults} onQuote={onQuote} />
        </div>
      </section>
    </main>
  );
}
