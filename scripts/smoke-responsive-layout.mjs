import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criteriaFromSearchParams } from '../src/services/search/holidaySearchCriteria.js';

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

console.log('Responsive layout smoke assertions passed');
