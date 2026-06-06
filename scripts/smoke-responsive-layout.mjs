import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criteriaFromSearchParams } from '../src/services/search/holidaySearchCriteria.js';
import { readSearchHandoff, searchHandoffMaxAgeMs, searchHandoffStorageKey, storeSearchHandoff } from '../src/services/search/searchHandoff.js';

const header = readFileSync(new URL('../src/components/layout/Header.jsx', import.meta.url), 'utf8');
const homeSections = readFileSync(new URL('../src/app/HomeSections.jsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/layout/Footer.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const brandLogoPolish = readFileSync(new URL('../src/components/layout/BrandLogoPolish.css', import.meta.url), 'utf8');
const searchPanelPolish = readFileSync(new URL('../src/components/search/SearchPanelPolish.css', import.meta.url), 'utf8');
const searchToolbarPolish = readFileSync(new URL('../src/components/search/SearchResultsToolbarPolish.css', import.meta.url), 'utf8');
const searchCardPolish = readFileSync(new URL('../src/components/search/SearchResultCardPolish.css', import.meta.url), 'utf8');
const allSource = `${header}\n${homeSections}\n${footer}\n${app}\n${styles}`.toLowerCase();

for (const token of ['--nav-height', '--content-gutter', '--hero-height', '--hero-title-size', '--search-panel-width', '--search-field-height', '--button-height', '--tab-height', '--section-spacing']) {
  assert(styles.includes(token), `Responsive token ${token} should be defined`);
}

for (const width of ['1199px', '959px', '719px', '639px', '519px']) {
  assert(styles.includes(`@media(max-width:${width})`), `Responsive breakpoint ${width} should be present`);
}

assert(header.includes('aria-expanded={mobileOpen}'), 'Navigation menu button should expose aria-expanded');
assert(header.includes('aria-controls="mobile-navigation"'), 'Navigation menu button should control the drawer region');
assert(header.includes("event.key === 'Escape'"), 'Navigation drawer should close with Escape');
assert(header.includes('pointerdown'), 'Navigation drawer should close on outside click');
assert(header.includes('aria-label="Collapsed navigation"'), 'Collapsed navigation should expose a readable nav label');
assert(header.includes('type="button"'), 'Header navigation buttons should be explicit buttons');
assert(styles.includes('.primary-nav .nav-link-secondary{display:none}'), 'Tablet nav should move lower-priority links into the menu before overlap');
assert(styles.includes('.signin{display:none}'), 'Tablet nav should move Sign in into the drawer before it can crowd links');
assert(styles.includes('.start{display:flex;height:44px'), 'Tablet portrait nav should restore the visible Start planning CTA after legacy mobile rules');
assert(styles.includes('.mobile-menu .mobile-start{display:none}'), 'Tablet drawer should not duplicate the visible Start planning CTA');
assert(styles.includes('@media(max-width:639px)') && styles.includes('.start{display:none}') && styles.includes('.mobile-menu .mobile-start{display:flex}'), 'Small mobile nav should move Start planning into the drawer');
const assuranceRules = [...styles.matchAll(/\.assurances(?:\s+li)?[^{}]*\{([^}]*)\}/g)].map((match) => match[1]);
const assuranceListRule = assuranceRules[0] || '';
const assuranceItemRule = assuranceRules.find((rule) => rule.includes('white-space:nowrap')) || '';
assert(homeSections.includes('<ul className="assurances" aria-label="Planning reassurance" role="list">'), 'Hero assurance chips should use explicit non-button list semantics');
assert(homeSections.includes('<li key={assurance}>'), 'Hero assurance chip items should render as list items');
assert(assuranceRules.length > 0, 'Hero assurance CSS rules should be present');
assert(!assuranceRules.some((rule) => /position\s*:\s*absolute/.test(rule)), 'Hero assurance chips should not use viewport-sensitive absolute positioning');
assert(/position\s*:\s*static/.test(assuranceListRule), 'Hero assurance chips should stay in the normal hero content flow');
assert(!assuranceRules.some((rule) => /cursor\s*:\s*pointer/.test(rule)), 'Hero assurance chips should not imply click behavior with a pointer cursor');
assert(/white-space\s*:\s*nowrap/.test(assuranceItemRule), 'Hero assurance chip labels should stay readable inside each pill while the row wraps');

const criteria = criteriaFromSearchParams('destination=Barcelona&originAirport=Manchester&adults=4&children=2&rooms=3&nights=10&dateFlexibilityDays=3');
assert.equal(criteria.destination, 'Barcelona');
assert.equal(criteria.originAirport, 'Manchester');
assert.equal(criteria.adults, 4);
assert.equal(criteria.children, 2);
assert.equal(criteria.rooms, 3);
assert.equal(criteria.nights, 10);
assert.equal(criteria.dateFlexibilityDays, 3);

for (const blocked of ['booking confirmed', 'reservation_id', 'order created', 'payment successful', 'supplier reservation']) {
  assert(!allSource.includes(blocked), `Responsive changes must not introduce booking/payment/reservation wording: ${blocked}`);
}

/* ── Navbar logo assertions ─────────────────────────────────── */
const brand = readFileSync(new URL('../src/components/layout/Brand.jsx', import.meta.url), 'utf8');

// Component structure
assert(brand.includes('aria-label="PickyHoliday home"'), 'Logo must have aria-label="PickyHoliday home"');
assert(brand.includes('type="button"'), 'Logo button must have explicit type="button"');
assert(brand.includes('handleLogoClick'), 'Logo must implement home/scroll-to-top routing');
assert(brand.includes("window.location.assign('/')"), 'Logo must navigate to / from non-home pages');
assert(brand.includes('scrollToId'), 'Logo must scroll to top when already on home page');
assert(brand.includes('brand-logo--intro'), 'Logo must gate intro animation class');
assert(brand.includes('brand-logo--premium'), 'Logo must use the premium logo system');
assert(brand.includes('brand-logo-mark'), 'Logo must render a logo mark');
assert(brand.includes('brand-logo-wordmark'), 'Logo must render a wordmark');
assert(brand.includes('brand-logo-route') && brand.includes('brand-logo-h-stem'), 'Logo must render a simplified PH route monogram');

// CSS
assert(brandLogoPolish.includes('@keyframes ph-logo-shell-in'), 'Premium logo shell intro keyframe must be defined');
assert(brandLogoPolish.includes('@keyframes ph-logo-route-draw'), 'Premium logo route draw keyframe must be defined');
assert(brandLogoPolish.includes('@keyframes ph-logo-accent-pop'), 'Premium logo accent pop keyframe must be defined');
assert(brandLogoPolish.includes('@keyframes ph-logo-wordmark-in'), 'Premium logo wordmark keyframe must be defined');
assert(brandLogoPolish.includes('@keyframes ph-logo-tld-in'), 'Premium logo TLD keyframe must be defined');
assert(brandLogoPolish.includes('prefers-reduced-motion:reduce'), 'Logo CSS must include prefers-reduced-motion fallback');
assert(brandLogoPolish.includes('brand-logo--intro'), 'Logo intro class must be styled');
assert(brandLogoPolish.includes('brand-logo--premium'), 'Premium logo class must be styled');
assert(brandLogoPolish.includes('brand-logo-picky'), 'Brand wordmark picky part must be styled');
assert(brandLogoPolish.includes('brand-logo-holiday'), 'Brand wordmark holiday part must be styled');
assert(brandLogoPolish.includes('brand-logo--footer'), 'Footer logo variant must be styled');
assert(brandLogoPolish.includes('@media(max-width:720px)') && brandLogoPolish.includes('brand-logo-mark{width:34px'), 'Mobile logo mark must be smaller');

/* ── Site-wide animation assertions ────────────────────────── */
const searchPanel = readFileSync(new URL('../src/components/search/SearchPanel.jsx', import.meta.url), 'utf8');

// Search button spinning sun
assert(searchPanel.includes('isLoading'), 'SearchPanel must accept isLoading prop for spinning sun');
assert(searchPanel.includes('searchbtn--loading'), 'SearchPanel must apply loading class to search button');
assert(searchPanel.includes('searchbtn-sun'), 'SearchPanel must render spinning sun SVG when loading');
assert(searchPanel.includes("aria-label={isLoading ? 'Searching…' : searchButtonLabel}"), 'Search button must use the configured CTA label while not loading');
assert(searchPanel.includes("searchButtonLabel = 'Search'"), 'Search button default label should be the shorter Search CTA');
assert(searchPanel.includes('disabled={isLoading}'), 'Search button must be disabled while loading');
assert(searchPanel.includes('role="status" aria-live="polite"'), 'Search button should expose a polite loading status for assistive tech');
assert(searchPanel.includes('type="button"') && searchPanel.includes('popularDestinationChips.map'), 'Non-submit tab and popular destination buttons should use explicit button types');

// Site-wide animation CSS
assert(styles.includes('@keyframes sun-spin'), 'Spinning sun keyframe must be defined');
assert(styles.includes('@keyframes card-enter'), 'Deal card entrance keyframe must be defined');
assert(styles.includes('@keyframes loading-pulse'), 'Loading pulse keyframe must be defined');
assert(styles.includes('searchbtn--loading'), 'Search button loading state must be styled');
assert(styles.includes('searchbtn-sun'), 'Spinning sun must be styled');
assert(searchPanelPolish.includes('.composer-searchbtn') && searchPanelPolish.includes('.searchbtn--loading'), 'SearchPanel polish CSS should keep compact Search and Searching states styled');
assert(searchPanelPolish.includes('.composer-search-panel .popular button') && searchPanelPolish.includes('.composer-search-panel .tabs .active'), 'SearchPanel polish CSS should style popular chips and active tabs');
assert(styles.includes('grid-six .deal-card'), 'Deal card entrance animation must be scoped to grid');
assert(styles.includes('spotlight-grid .spotlight-card'), 'Spotlight card entrance must be scoped');
assert(styles.includes('.tabs button,.composer-search-panel .tabs button{transition:'), 'Search tabs must have smooth transitions');

// Reduced-motion covers new animations — check entire stylesheet since there are multiple blocks
assert(styles.includes('@media(prefers-reduced-motion:reduce)') && styles.includes('searchbtn-sun{animation:none}'), 'Reduced-motion must disable spinning sun');
assert(styles.includes('.deal-card') && styles.includes('animation:none') && styles.includes('@media(prefers-reduced-motion:reduce)'), 'Reduced-motion must disable deal card animations');

/* ── Hero search handoff assertions ───────────────────────── */
const searchResultsPage = readFileSync(new URL('../src/app/routes/SearchResultsPage.jsx', import.meta.url), 'utf8');

assert(app.includes('Why choose PickyHoliday?'), 'Homepage benefits section should use enquiry-first choice wording');
assert(app.includes('Live-price checks') && app.includes('No booking created — no payment taken by PickyHoliday'), 'Homepage visible reassurance copy should avoid booking/reservation-oriented language');
assert(!app.includes('Why book with PickyHoliday?') && !app.includes('Why book with us'), 'Homepage benefits section should avoid booking-oriented labels');
assert(footer.includes("['Plan',") && !footer.includes("['Book',"), 'Footer primary column should use planning rather than booking wording');
assert(footer.includes('Enquiry-first, advisor-led'), 'Footer promise should keep enquiry-first wording without auto-booking phrasing');
assert(app.includes('isHeroSearchLoading'), 'Homepage search should keep a dedicated loading state');
assert(app.includes('setIsHeroSearchLoading(true)'), 'Homepage search should enter loading state before redirecting');
assert(app.includes('await searchComposedHolidays(criteria)'), 'Homepage search should gather composed results before redirecting');
assert(app.includes('storeSearchHandoff({ criteria, response })'), 'Homepage search should store a search handoff after results resolve');
assert(app.includes("params.set('handoff', handoffId)"), 'Homepage search should redirect with a handoff id when storage succeeds');
assert(app.includes('isLoading={isHeroSearchLoading}'), 'Homepage SearchPanel should receive the hero loading state');
assert(searchResultsPage.includes('readSearchHandoff(window.location.search)'), 'Search results page should read homepage search handoffs');
assert(searchResultsPage.includes('initialHandoff?.response?.results'), 'Search results page should initialise from handoff results');
assert(
  searchResultsPage.includes('if (initialHandoff)') && searchResultsPage.includes('applySearchResponse(initialHandoff.response, initialHandoff.criteria)'),
  'Search results page should render handoff responses without re-searching',
);
assert(searchResultsPage.includes('window.history.replaceState') && searchResultsPage.includes('criteriaToSearchParams(initialHandoff.criteria)'), 'Search results page should remove consumed handoff ids from the URL');

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

const handoffStorage = createMemoryStorage();
const handoffId = storeSearchHandoff({ criteria: { destination: 'Barcelona', adults: 4 }, response: { providerMode: 'mock', results: [{ id: 'deal-1' }] } }, handoffStorage);
assert(handoffId, 'Search handoff storage should return an id when storage succeeds');
const handoff = readSearchHandoff(`destination=Barcelona&handoff=${handoffId}`, handoffStorage);
assert.equal(handoff.criteria.destination, 'Barcelona');
assert.equal(handoff.criteria.adults, 4);
assert.equal(handoff.response.results[0].id, 'deal-1');
assert.equal(handoffStorage.getItem(searchHandoffStorageKey(handoffId)), null, 'Search handoff should be removed after it is read');

const criteriaFallbackStorage = createMemoryStorage();
const criteriaFallbackId = 'hero-missing-criteria';
criteriaFallbackStorage.setItem(searchHandoffStorageKey(criteriaFallbackId), JSON.stringify({ createdAt: Date.now(), source: 'hero-search', response: { results: [{ id: 'fallback-criteria' }] } }));
const fallbackHandoff = readSearchHandoff(`destination=Lisbon&adults=3&handoff=${criteriaFallbackId}`, criteriaFallbackStorage);
assert.equal(fallbackHandoff.criteria.destination, 'Lisbon', 'Search handoff should fall back to URL criteria if stored criteria are missing');
assert.equal(fallbackHandoff.criteria.adults, 3, 'Search handoff URL criteria fallback should preserve party fields');

const expiredStorage = createMemoryStorage();
const expiredId = 'hero-expired';
expiredStorage.setItem(searchHandoffStorageKey(expiredId), JSON.stringify({ createdAt: Date.now() - searchHandoffMaxAgeMs - 1, source: 'hero-search', response: { results: [{ id: 'stale' }] } }));
assert.equal(readSearchHandoff(`handoff=${expiredId}`, expiredStorage), null, 'Expired search handoff should be ignored');
assert.equal(expiredStorage.getItem(searchHandoffStorageKey(expiredId)), null, 'Expired search handoff should be removed');

const failingStorage = {
  setItem: () => {
    throw new Error('quota exceeded');
  },
};
assert.equal(storeSearchHandoff({ criteria: { destination: 'Rome' }, response: { results: [] } }, failingStorage), '', 'Storage failures should not block direct search redirects');

/* ── Search results page v2 assertions ────────────────────── */
const searchResultCard = readFileSync(new URL('../src/components/search/SearchResultCard.jsx', import.meta.url), 'utf8');
const searchTripDetailModal = readFileSync(new URL('../src/components/search/SearchTripDetailModal.jsx', import.meta.url), 'utf8');
const searchTripDetailModalCss = readFileSync(new URL('../src/components/search/SearchTripDetailModal.css', import.meta.url), 'utf8');
const dialog = readFileSync(new URL('../src/components/ui/Dialog.jsx', import.meta.url), 'utf8');

assert(searchResultsPage.includes('search-results-layout'), 'Search results page should render a dedicated results layout');
assert(searchResultsPage.includes('search-filters-panel'), 'Search results page should render a desktop filter panel');
assert(searchResultsPage.includes('search-results-toolbar'), 'Search results page should render a results toolbar');
assert(searchResultsPage.includes('search-results-applied-filters'), 'Search results page should render applied filter chips');
assert(searchResultsPage.includes('filterCounts') && searchResultsPage.includes('option.test(deal)'), 'Search filters should calculate counts from raw results');
assert(searchResultsPage.includes('displayedResults.length'), 'Search results page should use displayed/filtered results for counts');
assert(searchResultsPage.includes('visibleResults') && searchResultsPage.includes('Load more ideas'), 'Search results page should add load-more rhythm for long lists');
assert(searchResultsPage.includes('activeFilterCount'), 'Mobile filter button should expose the number of active filters');
assert(searchResultsPage.includes('aria-label="Map view coming soon" disabled'), 'Unavailable map control should be explicitly disabled');
assert(searchResultsPage.includes('Load more holiday ideas. Showing'), 'Load-more button should describe the current visible result range');
assert(!searchResultsPage.includes('search-results-heading'), 'Search results top hero should stay minimal and not duplicate result summary text above the refinement form');
assert(searchResultsPage.includes('search-results-safety-note'), 'Search results safety copy should be moved out of the top hero into a compact note');
assert(searchResultsPage.includes('runSearch(criteria)'), 'Search results page should preserve the direct search fallback');
assert(searchResultsPage.includes('isLoading={isLoading}'), 'Search results SearchPanel should receive page loading state');
assert(searchResultsPage.includes('aria-label="Search results filters"'), 'Search filters should have accessible labelling');
assert(searchResultsPage.includes('aria-live="polite"'), 'Search results should expose polite live regions');
assert(searchResultsPage.includes('aria-busy={isLoading}'), 'Search results list should expose aria-busy while loading');
assert(searchResultsPage.includes('aria-expanded={mobileFiltersOpen}') && searchResultsPage.includes('aria-controls="mobile-search-filters"'), 'Mobile filter toggle should expose expanded state and controlled region');
assert(searchResultsPage.includes('requestIdRef'), 'Search results page should guard against stale async responses');

for (const field of ['dealReasonLabel', 'flightSummary', 'boardBasis', 'groupSizeLabel']) {
  assert(searchResultCard.includes(field), `SearchResultCard should preserve compact summary access to ${field}`);
}
for (const richField of ['hotelSummary', 'flightSummary', 'departureAirport', 'arrivalAirport', 'dateLabel', 'nights', 'roomMix', 'boardBasis', 'baggageLabel', 'scoreReasons', 'protectionLabel', 'sourceBreakdown', 'supplierName', 'provider', 'resultType']) {
  assert(searchTripDetailModal.includes(richField), `SearchTripDetailModal should render rich field ${richField}`);
}
assert(!searchResultCard.includes('search-result-summary') && !searchResultCard.includes('search-result-score-reasons') && !searchResultCard.includes('search-result-protection'), 'SearchResultCard should not render long summaries, score reason chips or protection paragraphs');
assert(searchResultCard.includes('onToggleShortlist') && searchResultCard.includes('isShortlisted'), 'SearchResultCard should preserve shortlist handling');
assert(searchTripDetailModal.includes('aria-pressed={isSaved}') && searchTripDetailModal.includes('Save enquiry') && searchTripDetailModal.includes('Saved enquiry'), 'Trip detail modal should expose saved enquiry state with aria-pressed');
assert(searchResultCard.includes('onView(deal)'), 'SearchResultCard should preserve view handling');
assert(!searchResultCard.includes('onQuote?.([deal])'), 'SearchResultCard should keep quote flow out of compact cards');
assert(!searchResultsPage.includes('onQuote={onQuote}\n                  />'), 'SearchResultsPage should not pass card-only quote props into compact result cards');
assert(searchTripDetailModal.includes('content.onQuote?.(deal)'), 'SearchTripDetailModal should preserve quote handling');
assert(searchResultCard.includes('Check live price') && searchResultCard.includes('View trip'), 'SearchResultCard should keep compact primary CTA language');
assert(searchTripDetailModal.includes('Check live price with partner') && searchTripDetailModal.includes('Ask for group quote') && searchTripDetailModal.includes('No payment taken') && searchTripDetailModal.includes('Partner terms confirmed on partner site'), 'Trip detail modal should keep safe enquiry-first CTA language');
assert(searchTripDetailModal.includes('displaySourceLabel') && searchTripDetailModal.includes('Partner accommodation source') && searchTripDetailModal.includes('safeProtectionLabel'), 'Trip detail modal should sanitise provider/source/protection labels before rendering');
assert(!searchResultCard.includes('1/8'), 'SearchResultCard should not imply a fake gallery image count');

for (const className of ['search-results-layout', 'search-filters-panel', 'search-results-toolbar', 'search-results-applied-filters', 'search-result-list', 'search-result-card', 'search-result-card-media', 'search-result-card-body', 'search-result-card-price', 'search-result-skeleton', 'search-results-load-more']) {
  assert(styles.includes(`.${className}`), `Search results CSS should include ${className}`);
}
assert(styles.includes('@keyframes skeleton-shimmer'), 'Search results CSS should include skeleton shimmer styling');
assert(searchToolbarPolish.includes('.search-results-toolbar') && searchToolbarPolish.includes('min-height:74px'), 'Search toolbar polish CSS should keep the toolbar slim');
assert(searchToolbarPolish.includes('.search-filters-content') && searchToolbarPolish.includes('.search-results-applied-filters'), 'Search toolbar polish CSS should tidy filters and applied filter chips');
assert(searchTripDetailModalCss.includes('.trip-detail-hero') && searchTripDetailModalCss.includes('.trip-detail-actions') && searchTripDetailModalCss.includes('@media(max-width:820px)'), 'Trip detail modal CSS should include premium hero, actions and mobile layout rules');
assert(styles.includes('.modal--trip-detail') && styles.includes('100dvh'), 'Global modal CSS should keep the trip detail view viewport-safe on mobile');
assert(searchCardPolish.includes('.search-result-summary,.search-result-card--retail .search-result-score-reasons,.search-result-card--retail .search-result-protection{display:none}') || searchCardPolish.includes('search-result-summary'), 'Compact card polish CSS should preserve hidden detail-card content in list cards');
assert(searchCardPolish.includes('height:282px') && searchCardPolish.includes('@media(max-width:820px)'), 'Compact card polish CSS should preserve compact desktop cards and mobile stacking');
assert(styles.includes('prefers-reduced-motion:reduce') && styles.includes('search-result-skeleton') && styles.includes('animation:none'), 'Reduced motion should disable search result skeleton animations');
assert(searchPanelPolish.includes('prefers-reduced-motion:reduce') && searchToolbarPolish.includes('prefers-reduced-motion:reduce') && searchCardPolish.includes('prefers-reduced-motion:reduce') && searchTripDetailModalCss.includes('prefers-reduced-motion:reduce'), 'Polish CSS should preserve reduced-motion support');
assert(dialog.includes("event.key === 'Escape'") && dialog.includes('onCloseRef.current?.()') && dialog.includes('aria-labelledby="modal-title"') && dialog.includes('type="button"') && dialog.includes('className="modal-close"'), 'Dialog should keep accessible name, stable Escape close and explicit close button type');

const forbiddenSearchResultPhrases = ['Book now', 'Booking confirmed', 'Checkout', 'Reserve now', 'Pay now', 'Order now'];
for (const phrase of forbiddenSearchResultPhrases) {
  assert(!searchResultsPage.includes(phrase) && !searchResultCard.includes(phrase) && !searchTripDetailModal.includes(phrase) && !dialog.includes(phrase), `Search results must not include forbidden action wording: ${phrase}`);
}

console.log('Responsive layout smoke assertions passed');
