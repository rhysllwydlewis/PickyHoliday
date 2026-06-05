import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criteriaFromSearchParams } from '../src/services/search/holidaySearchCriteria.js';
import { readSearchHandoff, searchHandoffMaxAgeMs, searchHandoffStorageKey, storeSearchHandoff } from '../src/services/search/searchHandoff.js';

const header = readFileSync(new URL('../src/components/layout/Header.jsx', import.meta.url), 'utf8');
const homeSections = readFileSync(new URL('../src/app/HomeSections.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const allSource = `${header}\n${homeSections}\n${styles}`.toLowerCase();

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
assert(brand.includes('brand-logo-mark'), 'Logo must render a logo mark');
assert(brand.includes('brand-logo-wordmark'), 'Logo must render a wordmark');

// CSS
assert(styles.includes('@keyframes mark-pop'), 'Logo intro animation keyframes must be defined');
assert(styles.includes('@keyframes wordmark-slide'), 'Wordmark slide-in keyframe must be defined');
assert(styles.includes('prefers-reduced-motion'), 'Logo CSS must include prefers-reduced-motion fallback');
assert(styles.includes('brand-logo--intro'), 'Logo intro class must be styled');
assert(styles.includes('brand-logo-picky'), 'Brand wordmark picky part must be styled');
assert(styles.includes('brand-logo-holiday'), 'Brand wordmark holiday part must be styled');
assert(styles.includes('brand-logo--footer'), 'Footer logo variant must be styled');
assert(styles.includes('brand-logo-mark{width:30px'), 'Mobile logo mark must be smaller');


/* ── Site-wide animation assertions ────────────────────────── */
const searchPanel = readFileSync(new URL('../src/components/search/SearchPanel.jsx', import.meta.url), 'utf8');

// Search button spinning sun
assert(searchPanel.includes('isLoading'), 'SearchPanel must accept isLoading prop for spinning sun');
assert(searchPanel.includes('searchbtn--loading'), 'SearchPanel must apply loading class to search button');
assert(searchPanel.includes('searchbtn-sun'), 'SearchPanel must render spinning sun SVG when loading');
assert(searchPanel.includes("aria-label={isLoading ? 'Searching…' : 'Search ideas'}"), 'Search button must update aria-label while loading');
assert(searchPanel.includes('disabled={isLoading}'), 'Search button must be disabled while loading');

// Site-wide animation CSS
assert(styles.includes('@keyframes sun-spin'), 'Spinning sun keyframe must be defined');
assert(styles.includes('@keyframes card-enter'), 'Deal card entrance keyframe must be defined');
assert(styles.includes('@keyframes loading-pulse'), 'Loading pulse keyframe must be defined');
assert(styles.includes('searchbtn--loading'), 'Search button loading state must be styled');
assert(styles.includes('searchbtn-sun'), 'Spinning sun must be styled');
assert(styles.includes('grid-six .deal-card'), 'Deal card entrance animation must be scoped to grid');
assert(styles.includes('spotlight-grid .spotlight-card'), 'Spotlight card entrance must be scoped');
assert(styles.includes('.tabs button,.composer-search-panel .tabs button{transition:'), 'Search tabs must have smooth transitions');

// Reduced-motion covers new animations — check entire stylesheet since there are multiple blocks
assert(
  styles.includes('@media(prefers-reduced-motion:reduce)') &&
  styles.includes('searchbtn-sun{animation:none}'),
  'Reduced-motion must disable spinning sun'
);
assert(
  styles.includes('.deal-card') && styles.includes('animation:none') &&
  styles.includes('@media(prefers-reduced-motion:reduce)'),
  'Reduced-motion must disable deal card animations'
);


/* ── Hero search handoff assertions ───────────────────────── */
const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
const searchResultsPage = readFileSync(new URL('../src/app/routes/SearchResultsPage.jsx', import.meta.url), 'utf8');

assert(app.includes('isHeroSearchLoading'), 'Homepage search should keep a dedicated loading state');
assert(app.includes('setIsHeroSearchLoading(true)'), 'Homepage search should enter loading state before redirecting');
assert(app.includes('await searchComposedHolidays(criteria)'), 'Homepage search should gather composed results before redirecting');
assert(app.includes('storeSearchHandoff({ criteria, response })'), 'Homepage search should store a search handoff after results resolve');
assert(app.includes("params.set('handoff', handoffId)"), 'Homepage search should redirect with a handoff id when storage succeeds');
assert(app.includes('isLoading={isHeroSearchLoading}'), 'Homepage SearchPanel should receive the hero loading state');
assert(searchResultsPage.includes('readSearchHandoff(window.location.search)'), 'Search results page should read homepage search handoffs');
assert(searchResultsPage.includes('initialHandoff?.response?.results'), 'Search results page should initialise from handoff results');
assert(searchResultsPage.includes('if (initialHandoff)') && searchResultsPage.includes('applySearchResponse(initialHandoff.response, initialHandoff.criteria)'), 'Search results page should render handoff responses without re-searching');
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
  setItem: () => { throw new Error('quota exceeded'); },
};
assert.equal(storeSearchHandoff({ criteria: { destination: 'Rome' }, response: { results: [] } }, failingStorage), '', 'Storage failures should not block direct search redirects');

console.log('Responsive layout smoke assertions passed');
