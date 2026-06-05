import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SearchPanel } from '../../components/search/SearchPanel.jsx';
import { DealCard } from '../../components/deals/DealCard.jsx';
import { ProviderDiagnostics } from '../../components/provider/ProviderDiagnostics.jsx';
import { searchComposedHolidays } from '../../services/travelApi.js';
import { criteriaFromSearchParams, criteriaToSearchParams, holidaySearchSummary, normaliseHolidaySearchCriteria } from '../../services/search/holidaySearchCriteria.js';
import { showProviderDiagnostics, trackEvent } from '../appConstants.js';
import { updateSeoMeta, replaceJsonLd } from '../../services/seo/seoMeta.js';

export function SearchResultsPage({ onOpenDeal, isShortlisted, onToggleShortlist, onQuote, diagnostics, setDiagnostics, locationSuggestions, onLookupLocations }) {
  const [criteria, setCriteria] = useState(() => criteriaFromSearchParams(window.location.search));
  const [activeTab, setActiveTab] = useState(criteria.intent || 'Holidays');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const runSearch = useCallback(async (nextCriteria = criteria) => {
    const normalised = normaliseHolidaySearchCriteria(nextCriteria);
    setIsLoading(true);
    setError('');
    try {
      const response = await searchComposedHolidays(normalised);
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
    } catch (searchError) {
      setError('Sorry, composed holiday ideas are temporarily unavailable. You can still ask for a group quote.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [criteria, setDiagnostics]);

  useEffect(() => {
    updateSeoMeta({ metaTitle: 'Search holiday ideas | PickyHoliday', metaDescription: 'Search enquiry-first group holiday ideas with destination, airports, dates, adults, children and rooms.', canonicalPath: '/search' });
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
    const normalised = updateCriteria({ ...criteria, intent: activeTab }, { eventType: 'composed_search_submitted' });
    runSearch(normalised);
  };

  const updateSort = (event) => {
    const normalised = updateCriteria({ ...criteria, sort: event.target.value }, { eventType: 'composed_search_sort_changed' });
    runSearch(normalised);
  };

  const applyFilterChip = (name, value) => {
    const normalised = updateCriteria({ ...criteria, filters: { ...(criteria.filters || {}), [name]: value } }, { eventType: 'composed_search_filter_changed' });
    runSearch(normalised);
  };

  return (
    <main className="search-results-page">
      <section className="search-hero content">
        <span>Composed holiday search</span>
        <h1>Group holiday ideas matched to your trip</h1>
        <p>These are enquiry-first ideas, partner redirects, quote requests or live-price checks only. No booking has been created, no payment has been taken and no supplier reservation has been made.</p>
      </section>
      <SearchPanel activeTab={activeTab} setActiveTab={setActiveTab} search={criteria} setSearch={setCriteria} onSearch={submitSearch} isLoading={isLoading} locationSuggestions={locationSuggestions} onLookupLocations={onLookupLocations} />
      <section className="content block search-results-shell">
        <div className="search-summary-bar">
          <div><span>Search summary</span><b>{holidaySearchSummary(criteria)}</b></div>
          <label>Sort
            <select value={criteria.sort} onChange={updateSort}>
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
              <option value="best-rated">Best rated</option>
              <option value="easiest-travel">Shortest flight / easiest travel</option>
              <option value="closest-match">Closest match</option>
            </select>
          </label>
        </div>
        <div className="filter-chips" aria-label="Search filters">
          {['Flight + hotel', 'Partner live price', 'Advisor quote pick'].map((chip) => <button key={chip} onClick={() => applyFilterChip('quick', chip)}>{chip}</button>)}
          <span>More provider-backed filters will follow as live data expands.</span>
        </div>
        {showProviderDiagnostics && (
          <div className="diagnostic-toggle"><button onClick={() => setShowDiagnostics((value) => !value)}>{showDiagnostics ? 'Hide' : 'Show'} provider diagnostics</button></div>
        )}
        {showProviderDiagnostics && showDiagnostics && <ProviderDiagnostics diagnostics={diagnostics} onRefresh={() => {}} />}
        {isLoading && <div className="loading-state">Searching composed holiday ideas…</div>}
        {error && <div className="error-state">{error}</div>}
        {!isLoading && !error && results.length === 0 && <div className="empty-state">No composed holiday ideas matched this search yet. Try flexible dates, a different airport or ask for a group quote.</div>}
        <div className="deal-grid search-result-grid">
          {results.map((deal) => <DealCard key={deal.id || deal.resultId} deal={deal} onView={onOpenDeal} isShortlisted={isShortlisted(deal)} onToggleShortlist={onToggleShortlist} />)}
        </div>
        {results.length > 0 && <div className="search-quote-strip"><p>Need multi-room allocation or a bespoke group check?</p><button onClick={() => onQuote(results.slice(0, 3))}>Ask for group quote</button></div>}
      </section>
    </main>
  );
}

