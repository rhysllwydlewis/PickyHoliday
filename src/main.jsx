import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  HandCoins,
  HeartHandshake,
  Hotel,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  Plane,
  ShieldCheck,
  ShipWheel,
  Star,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import './styles.css';
import { imageUrls, getaways, guides, reviews } from './data/mockDeals.js';
import {
  createAdminPromotedDeal,
  getAdminSiteConfig,
  getBackendHealth,
  getFrontendProviderMode,
  getProviderStatus,
  getPublicPromotedDeals,
  getSiteConfig,
  listAdminEnquiries,
  listAdminPromotedDeals,
  searchHolidays,
  searchLocations,
  submitEnquiry,
  updateAdminEnquiryStatus,
  updateAdminPromotedDeal,
  updateAdminPromotedDealStatus,
  updateAdminSiteConfig,
} from './services/travelApi.js';

const img = (id) => imageUrls[id] || id;
const hasPricedAmount = (deal) => Number(deal?.priceFrom || 0) > 0;
const formatPrice = (deal) => `${deal.currency === 'GBP' ? '£' : deal.currency}${deal.priceFrom}`;
const priceCopy = (deal) => (hasPricedAmount(deal) ? formatPrice(deal) : 'Price to confirm');
const dealPlace = (deal) => `${deal.destination}, ${deal.country}`;
const showProviderDiagnostics = import.meta.env.VITE_SHOW_PROVIDER_DIAGNOSTICS === 'true';
const defaultFeatureFlags = {
  showProviderDiagnostics: false,
  enablePromotedDeals: true,
  enableAffiliateRedirects: true,
  enableDuffelSearch: true,
  enableAmadeusSecondary: false,
  enableNewsletterSignupPlaceholder: true,
  enableAnnouncementBanner: false,
  enableAdminDebugPanel: false,
};
const defaultSiteConfig = {
  hero: {},
  newsletter: {},
  footer: {},
  trust: {},
  announcement: {},
  featureFlags: defaultFeatureFlags,
};
const isSafeUrl = (value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } };
const adminPaths = ['/admin', '/admin/login', '/admin/enquiries', '/admin/deals', '/admin/content', '/admin/features', '/admin/settings'];
const adminTokenStorageKey = 'pickyholiday-admin-token';
const enquiryStatuses = ['new', 'reviewing', 'contacted', 'quoted', 'closed'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const friendlyDate = (value) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded');

const readAdminToken = () => {
  try {
    return window.sessionStorage.getItem(adminTokenStorageKey) || '';
  } catch (error) {
    return '';
  }
};

const saveAdminToken = (token) => {
  window.sessionStorage.setItem(adminTokenStorageKey, token);
};

const clearAdminToken = () => {
  try {
    window.sessionStorage.removeItem(adminTokenStorageKey);
  } catch (error) {
    // If session storage is unavailable, clearing local React state is still safe.
  }
};

const benefits = [
  [BriefcaseBusiness, 'Group experts', 'Years of experience in group travel'],
  [HandCoins, 'Low deposits', 'Secure your trip from just £49pp'],
  [WalletCards, 'Flexible planning', 'Save an enquiry now and discuss deposits later with an advisor'],
  [ShieldCheck, 'Enquiry first', 'Results and redirects are not bookings or supplier reservations'],
  [Clock3, '24/7 support', 'We’re here whenever you need us'],
  [LockKeyhole, 'Secure enquiries', 'Your quote request stays with PickyHoliday advisors'],
];

const navTargets = {
  Holidays: 'deals',
  Destinations: 'getaways',
  'Group Types': 'getaways',
  Deals: 'deals',
  Inspiration: 'guides',
  Support: 'footer',
};

const searchTabs = [
  ['Holidays', Plane, true],
  ['Villas', Hotel],
  ['Group hotel stays', Users, 'NEW'],
  ['Stag & Hen', BriefcaseBusiness],
  ['Families', HeartHandshake],
];

const fieldOptions = {
  origin: ['London (All Airports)', 'Manchester', 'Birmingham', 'Bristol', 'Edinburgh'],
  date: ['Fri 11 Jul – 7+ nights', 'Mon 4 Aug – 4 nights', 'Sat 23 Aug – 10 nights', 'Flexible dates'],
  groupSize: ['8 people, 2+ rooms', '4 people, 1 room', '12 people, 4 rooms', '20+ people, group quote'],
};

const getawaySearchConfig = {
  'Family getaways': { tab: 'Families', destination: 'Families' },
  'Villas for groups': { tab: 'Villas', destination: 'Villas' },
  'Stag & hen trips': { tab: 'Stag & Hen', destination: 'Stag & Hen' },
};

function mergeHolidayResults(...resultSets) {
  const seen = new Set();
  return resultSets.flat().filter((result) => {
    const id = result?.id || result?.resultId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function rotateList(list, direction) {
  if (list.length < 2) return list;
  if (direction === 'next') return [...list.slice(1), list[0]];
  return [list[list.length - 1], ...list.slice(0, -1)];
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Logo({ footer = false }) {
  return (
    <button className={`logo ${footer ? 'logo-footer' : ''}`} onClick={() => scrollToId('top')} aria-label="Back to top">
      <span>Picky</span>
      <b>Holiday</b>
      <small>.co.uk</small>
    </button>
  );
}

function Stars({ small = false }) {
  return (
    <div className={small ? 'stars small' : 'stars'}>
      {Array.from({ length: 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}
    </div>
  );
}

function Header({ onAction }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = Object.keys(navTargets);

  const handleNav = (label) => {
    setMobileOpen(false);
    scrollToId(navTargets[label]);
  };

  return (
    <header className="topbar" id="top">
      <div className="navwrap">
        <Logo />
        <nav aria-label="Primary navigation">
          {nav.map((label, index) => (
            <button key={label} onClick={() => handleNav(label)}>
              {label}
              {index !== 3 && <ChevronDown size={14} />}
            </button>
          ))}
        </nav>
        <button
          className="signin"
          onClick={() => onAction('Sign in', 'Sign in to manage saved enquiries, favourite ideas and group votes when accounts are enabled.')}
        >
          <Users size={19} /> Sign in
        </button>
        <button className="start" onClick={() => scrollToId('search')}>
          <BriefcaseBusiness size={17} /> Start planning
        </button>
        <button
          className="mobile"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
      </div>
      {mobileOpen && (
        <div className="mobile-menu">
          {nav.map((label) => <button key={label} onClick={() => handleNav(label)}>{label}</button>)}
        </div>
      )}
    </header>
  );
}

function Hero({ config }) {
  const hero = config?.hero || {};
  const titleParts = (hero.title || 'Smart group holidays. More fun. Less fuss.').split('. ');
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <div className="eyebrow"><Star fill="currentColor" size={15} /> {hero.eyebrow || 'GROUP HOLIDAYS, MADE EASY'}</div>
        <h1>{titleParts[0] || 'Smart group holidays.'}<br /><span>{titleParts[1] || 'More fun.'}</span> {titleParts.slice(2).join('. ') || 'Less fuss.'}</h1>
        <p>{hero.subtitle || 'Compare inspiration, partner redirects and saved enquiries for mates, families and every kind of group adventure.'}</p>
        <div className="assurances">
          {(hero.assuranceChips || ['Best group ideas', 'Saved enquiries', 'Advisor review', 'No auto-booking']).map((assurance, index) => {
            const Icon = [CircleDollarSign, WalletCards, Clock3, BadgeCheck][index];
            return <span key={assurance}><Icon size={17} /> {assurance}</span>;
          })}
        </div>
      </div>
      <div className="trust-float"><b>Excellent</b><Stars small /><span>4.7 out of 5</span><small>★ Trustpilot</small></div>
    </section>
  );
}

function SearchSelect({ icon: Icon, label, name, value, options, onChange }) {
  return (
    <label className="field select-field">
      <span>{label}</span>
      <p>
        <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <Icon size={17} />
      </p>
    </label>
  );
}

function SearchPanel({ activeTab, setActiveTab, search, setSearch, onSearch, locationSuggestions, onLookupLocations }) {
  const updateSearchField = (name, value) => {
    setSearch((currentSearch) => ({ ...currentSearch, [name]: value }));
  };

  return (
    <section className="search-panel" id="search">
      <div className="tabs" role="tablist" aria-label="Holiday type">
        {searchTabs.map(([tab, Icon, flag]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
          >
            <Icon size={16} />
            {tab}
            {flag === 'NEW' && <em>NEW</em>}
          </button>
        ))}
      </div>
      <form className="fields" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <label className="field big">
          <span>Where to?</span>
          <p>
            <MapPin size={18} />
            <input
              value={search.destination}
              onChange={(event) => updateSearchField('destination', event.target.value)}
              onBlur={() => onLookupLocations(search.destination)}
              placeholder="Search destinations, resort or hotel"
            />
          </p>
          {locationSuggestions.length > 0 && (
            <div className="location-suggestions" aria-label="Location suggestions">
              {locationSuggestions.slice(0, 4).map((location) => (
                <button key={location.id} type="button" onClick={() => updateSearchField('destination', location.cityName || location.name)}>
                  {location.name} {location.iataCode && <b>{location.iataCode}</b>}
                </button>
              ))}
            </div>
          )}
        </label>
        <SearchSelect icon={Plane} label="From" name="origin" value={search.origin} options={fieldOptions.origin} onChange={updateSearchField} />
        <SearchSelect icon={CalendarDays} label="When" name="date" value={search.date} options={fieldOptions.date} onChange={updateSearchField} />
        <SearchSelect icon={Users} label="Group size" name="groupSize" value={search.groupSize} options={fieldOptions.groupSize} onChange={updateSearchField} />
        <button className="searchbtn">Search deals <ChevronRight size={20} /></button>
      </form>
      <div className="popular">
        <span>Popular:</span>
        {['Ibiza', 'Tenerife', 'Barcelona', 'Dubai', 'Ayia Napa', 'Zante', 'Benidorm'].map((destination) => (
          <button key={destination} onClick={() => updateSearchField('destination', destination)}>{destination}</button>
        ))}
      </div>
    </section>
  );
}

function DealCard({ deal, onView }) {
  return (
    <article className="deal-card">
      <div className="pic"><img src={img(deal.image)} alt={dealPlace(deal)} /><strong>{deal.savingLabel}</strong></div>
      <div className="deal-body">
        <span>{dealPlace(deal)}</span>
        <h3>{deal.hotelName}</h3>
        <div className="rating"><Stars small />{deal.rating}</div>
        <p className="provider-chip">{deal.supplierName} · {deal.resultType}</p>
        <div className="price">
          <p>{hasPricedAmount(deal) ? 'From ' : ''}<b>{priceCopy(deal)}</b> {deal.priceQualifier}</p>
          <button onClick={() => onView(deal)}>View trip</button>
        </div>
      </div>
    </article>
  );
}

function SectionTitle({ title, link, onLink }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {link && <button onClick={onLink}>{link} <ChevronRight size={16} /></button>}
    </div>
  );
}

function dealPayload(deal = {}) {
  return {
    resultId: deal.id || deal.resultId || '',
    resultType: deal.resultType || '',
    provider: deal.provider || '',
    supplierName: deal.supplierName || '',
    destination: deal.destination || '',
    country: deal.country || '',
    hotelName: deal.hotelName || '',
    departureAirport: deal.departureAirport || '',
    dateLabel: deal.dateLabel || '',
    groupSizeLabel: deal.groupSizeLabel || '',
    priceFrom: deal.priceFrom || null,
    currency: deal.currency || 'GBP',
  };
}

function validateEnquiryForm(form) {
  const errors = {};
  if (!form.customerName.trim()) errors.customerName = 'Please tell us your name.';
  if (!emailPattern.test(form.customerEmail.trim())) errors.customerEmail = 'Please enter a valid email address.';
  if (!form.destination.trim()) errors.destination = 'Please choose a destination.';
  if (!form.consentToContact) errors.consentToContact = 'Please confirm we can contact you about this enquiry.';
  return errors;
}

function EnquiryForm({ deal, onClose, onSubmitted }) {
  const defaults = dealPayload(deal);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    destination: defaults.destination,
    groupSizeLabel: defaults.groupSizeLabel,
    dateLabel: defaults.dateLabel,
    customerNotes: '',
    consentToContact: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateEnquiryForm(form);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await submitEnquiry({
        ...defaults,
        ...form,
        source: 'customer-enquiry-form',
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        customerNotes: form.customerNotes.trim(),
        destination: form.destination.trim(),
        groupSizeLabel: form.groupSizeLabel.trim(),
        dateLabel: form.dateLabel.trim(),
      });
      const enquiry = response.enquiry || {};
      setSuccess({ id: enquiry.id || enquiry.enquiryId, message: enquiry.message || 'Thanks, your enquiry has been saved. This is not a booking confirmation.' });
      onSubmitted?.(enquiry);
    } catch (error) {
      const fieldErrors = Object.fromEntries((error.fieldErrors || []).map((fieldError) => [fieldError.field, fieldError.message]));
      setErrors((current) => ({ ...current, ...fieldErrors }));
      setSubmitError(error.userMessage || error.message || 'Sorry, we could not save your enquiry right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="enquiry-success" role="status">
        <span>Enquiry saved</span>
        <h2 id="modal-title">Thanks, your enquiry has been saved.</h2>
        <p>This is not a booking confirmation. No payment, supplier reservation or travel booking has been created automatically.</p>
        {success.id && <p className="enquiry-ref">Enquiry ref: {success.id}</p>}
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={handleSubmit} noValidate>
      <span>Saved enquiry only</span>
      <h2 id="modal-title">Ask for a group quote</h2>
      <p>Share your contact details and notes. PickyHoliday will save this enquiry for review; this is not a booking and no supplier reservation is created automatically.</p>
      <div className="enquiry-trip-summary">
        <b>{deal.hotelName}</b>
        <small>{dealPlace(deal)} · {deal.supplierName} · {priceCopy(deal)} {deal.priceQualifier}</small>
      </div>
      <div className="form-grid">
        <label>
          <span>Name *</span>
          <input value={form.customerName} onChange={(event) => updateField('customerName', event.target.value)} aria-invalid={Boolean(errors.customerName)} />
          {errors.customerName && <small>{errors.customerName}</small>}
        </label>
        <label>
          <span>Email *</span>
          <input type="email" value={form.customerEmail} onChange={(event) => updateField('customerEmail', event.target.value)} aria-invalid={Boolean(errors.customerEmail)} />
          {errors.customerEmail && <small>{errors.customerEmail}</small>}
        </label>
        <label>
          <span>Phone</span>
          <input value={form.customerPhone} onChange={(event) => updateField('customerPhone', event.target.value)} />
        </label>
        <label>
          <span>Destination *</span>
          <input value={form.destination} onChange={(event) => updateField('destination', event.target.value)} aria-invalid={Boolean(errors.destination)} />
          {errors.destination && <small>{errors.destination}</small>}
        </label>
        <label>
          <span>Group size</span>
          <input value={form.groupSizeLabel} onChange={(event) => updateField('groupSizeLabel', event.target.value)} />
        </label>
        <label>
          <span>Dates / rough dates</span>
          <input value={form.dateLabel} onChange={(event) => updateField('dateLabel', event.target.value)} />
        </label>
      </div>
      <label className="notes-field">
        <span>Notes</span>
        <textarea rows="4" value={form.customerNotes} onChange={(event) => updateField('customerNotes', event.target.value)} placeholder="Tell us about room mix, preferred airports, budget, accessibility needs or anything else useful." />
      </label>
      <label className="consent-field">
        <input type="checkbox" checked={form.consentToContact} onChange={(event) => updateField('consentToContact', event.target.checked)} />
        <span>I agree that PickyHoliday can contact me about this saved enquiry. *</span>
      </label>
      {errors.consentToContact && <small className="form-error">{errors.consentToContact}</small>}
      {submitError && <div className="error-state compact">{submitError}</div>}
      <div className="modal-actions">
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving enquiry…' : 'Save enquiry'}</button>
        <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  );
}

function Dialog({ content, onClose, siteConfig = defaultSiteConfig }) {
  const featureFlags = siteConfig.featureFlags || defaultFeatureFlags;
  if (!content) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {content.type === 'enquiry' ? (
          <EnquiryForm deal={content.deal} onClose={onClose} onSubmitted={content.onSubmitted} />
        ) : (
          <>
            <span>{content.kicker || 'PickyHoliday'}</span>
            <h2 id="modal-title">{content.title}</h2>
            <p>{content.body}</p>
            {content.deal && (
              <ul>
                <li><b>Supplier:</b> {content.deal.supplierName}</li>
                <li><b>Airlines:</b> {content.deal.airlineNames?.length ? content.deal.airlineNames.join(', ') : 'Quoted separately'}</li>
                <li><b>Destination:</b> {dealPlace(content.deal)}</li>
                <li><b>Hotel:</b> {content.deal.hotelName}</li>
                <li><b>Lead price:</b> {priceCopy(content.deal)} {content.deal.priceQualifier}</li>
                {content.deal.sourceBreakdown && <li><b>Pricing confidence:</b> {content.deal.sourceBreakdown.pricingConfidence} · flight {content.deal.sourceBreakdown.flightPrice || 'n/a'} · hotel {content.deal.sourceBreakdown.hotelPrice || 'n/a'}</li>}
                <li><b>Nights/date:</b> {content.deal.nights} nights · {content.deal.dateLabel}</li>
                <li><b>Group size:</b> {content.deal.groupSizeLabel}</li>
                <li><b>Board/bags:</b> {content.deal.boardBasis} · {content.deal.baggageLabel}</li>
                <li><b>Booking mode:</b> enquiry-only saved quote request</li>
                <li><b>Protection:</b> {content.deal.protectionLabel}</li>
              </ul>
            )}
            <div className="modal-actions">
              {featureFlags.enableAffiliateRedirects !== false && content.deal?.partnerUrl && isSafeUrl(content.deal.partnerUrl) && <button onClick={() => window.open(content.deal.partnerUrl, '_blank', 'noopener,noreferrer')}>Continue to partner</button>}
              {content.deal && <button onClick={() => content.onEnquiry?.(content.deal)}>Ask for group quote</button>}
              <button onClick={onClose}>Shortlist this trip</button>
              <button onClick={() => { onClose(); scrollToId('search'); }}>Edit search</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ProviderDiagnostics({ diagnostics, onRefresh }) {
  const [isOpen, setIsOpen] = useState(showProviderDiagnostics);
  const errors = diagnostics.providerErrors || [];
  const statuses = diagnostics.providerStatus || diagnostics.providers || [];

  return (
    <aside className={`provider-diagnostics ${isOpen ? 'open' : 'collapsed'}`}>
      <div>
        <span>Developer/provider status</span>
        <button onClick={() => setIsOpen((open) => !open)}>{isOpen ? 'Hide' : 'Show'}</button>
      </div>
      {isOpen && (
        <>
          <div className="provider-refresh-row"><button onClick={onRefresh}>Refresh status</button></div>
          <p className="provider-strategy-note">Duffel preferred for flights · Amadeus optional sandbox/search provider · Package/affiliate providers remain enquiry/redirect only.</p>
      <dl>
        <dt>Front end</dt><dd>{diagnostics.frontendMode}</dd>
        <dt>Backend</dt><dd>{diagnostics.backendMode || 'mock/local'}</dd>
        <dt>Primary flight</dt><dd>{diagnostics.primaryFlightProvider || 'duffel'}</dd>
        <dt>Duffel</dt><dd>{diagnostics.duffelConfigured ? 'configured server-side' : 'not configured / server-only'}</dd>
        <dt>Amadeus</dt><dd>{diagnostics.amadeusConfigured ? 'configured optional sandbox' : 'not configured / optional sandbox'}</dd>
        <dt>Amadeus secondary</dt><dd>{diagnostics.amadeusSecondaryEnabled ? 'enabled' : 'disabled'}</dd>
        <dt>Active</dt><dd>{(diagnostics.activeProviders || []).join(', ') || 'mock'}</dd>
        <dt>Latest</dt><dd>{diagnostics.latestSource || 'mock'}</dd>
      </dl>
      {statuses.length > 0 && (
        <ul>
          {statuses.slice(0, 4).map((status) => (
            <li key={`${status.provider}-${status.lastMethod || status.mode}`}>{status.provider}: {status.mode || 'ready'}{Number.isFinite(status.resultCount) ? ` · ${status.resultCount} results` : ''}</li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <div className="provider-errors">
          <b>Latest provider notes</b>
          {errors.map((error, index) => <p key={`${error.provider}-${error.method}-${index}`}>{error.provider} {error.method}: {error.message}</p>)}
        </div>
      )}
        </>
      )}
    </aside>
  );
}

function DealsSection({ dealsToShow, searchSummary, onReset, onRotateDeals, onViewDeal, isLoading, error, diagnostics, onRefreshDiagnostics }) {
  return (
    <section className="content block overlap" id="deals">
      <SectionTitle title="Popular group holiday deals" link="View all deals" onLink={onReset} />
      <p className="results-note">{searchSummary}</p>
      <ProviderDiagnostics diagnostics={diagnostics} onRefresh={onRefreshDiagnostics} />
      {isLoading && <div className="loading-state">Searching provider adapters safely. Mock fallback stays available if the API is unavailable…</div>}
      {error && <div className="error-state">{error}</div>}
      <button className="arrow left" onClick={() => onRotateDeals('prev')} aria-label="Previous deal"><ChevronLeft /></button>
      <div className="deals grid-six">
        {!isLoading && dealsToShow.length ? (
          dealsToShow.map((deal) => <DealCard key={deal.id} deal={deal} onView={onViewDeal} />)
        ) : !isLoading ? (
          <div className="empty-state">No provider results yet. Try another destination, holiday type or group size.</div>
        ) : null}
      </div>
      <button className="arrow right" onClick={() => onRotateDeals('next')} aria-label="Next deal"><ChevronRight /></button>
    </section>
  );
}

function GetawaysSection({ items, onSelectGetaway, onRotate }) {
  return (
    <section className="content block" id="getaways">
      <SectionTitle title="Find your perfect group getaway" />
      <div className="getaways grid-six">
        {items.map(([title, subtitle, image]) => (
          <button className="getaway" key={title} onClick={() => onSelectGetaway(title)}>
            <img src={img(image)} alt="" />
            <div><h3>{title}</h3><p>{subtitle}</p></div>
          </button>
        ))}
      </div>
      <button className="arrow right mid" onClick={() => onRotate('next')} aria-label="Next getaway"><ChevronRight /></button>
    </section>
  );
}

function GuidesSection({ items, onAction, onRotate }) {
  return (
    <section className="content block" id="guides">
      <SectionTitle
        title="Travel inspiration for groups"
        link="View all guides"
        onLink={() => onAction('Travel guides', 'Choose a guide card to preview planning tips, destination ideas and group-friendly itineraries.', 'Inspiration')}
      />
      <div className="guides">
        {items.map(([image, title]) => (
          <button key={title} onClick={() => onAction(title, 'Here you can preview this guide, save it for later, or use it to start planning a matching group holiday.', 'Guide preview')}>
            <img src={img(image)} alt="" />
            <h3>{title}</h3>
          </button>
        ))}
      </div>
      <button className="arrow left low" onClick={() => onRotate('prev')} aria-label="Previous guide"><ChevronLeft /></button>
      <button className="arrow right low" onClick={() => onRotate('next')} aria-label="Next guide"><ChevronRight /></button>
    </section>
  );
}

function ReviewsSection({ onAction }) {
  return (
    <section className="content block">
      <div className="reviews-head">
        <SectionTitle
          title="What travellers say"
          link="View all reviews"
          onLink={() => onAction('Traveller reviews', 'Reviews are now interactive: pick a review card to see who travelled and what they loved.', 'Reviews')}
        />
        <div className="trust-line"><b>Excellent</b><Stars small /><span>4.7 out of 5 based on 2,842 reviews</span></div>
      </div>
      <div className="reviews">
        {reviews.map(([name, quote, avatar]) => (
          <button key={name} onClick={() => onAction(name, quote, 'Traveller story')}>
            <Stars small />
            <p>{quote}</p>
            <div><img src={img(avatar)} alt="" /><b>{name}</b></div>
          </button>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('Holidays');
  const [search, setSearch] = useState({
    destination: '',
    origin: fieldOptions.origin[0],
    date: fieldOptions.date[0],
    groupSize: fieldOptions.groupSize[0],
  });
  const [searchSummary, setSearchSummary] = useState('Showing popular group holiday ideas. Ask for group quote saves an enquiry only; it is not a booking.');
  const [dealList, setDealList] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [getawayList, setGetawayList] = useState(getaways);
  const [guideList, setGuideList] = useState(guides);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);
  const [diagnostics, setDiagnostics] = useState({
    frontendMode: getFrontendProviderMode(),
    backendMode: 'mock',
    activeProviders: ['mock'],
    latestSource: 'mock',
    primaryFlightProvider: 'duffel',
    duffelConfigured: false,
    amadeusConfigured: false,
    amadeusSecondaryEnabled: false,
    providerErrors: [],
    providerStatus: [],
  });

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const featureFlags = siteConfig.featureFlags || {};
  const filteredDeals = useMemo(() => {
    const destination = search.destination.trim().toLowerCase();

    return dealList.filter((deal) => {
      const dealContent = `${deal.destination} ${deal.country} ${deal.hotelName} ${deal.supplierName} ${deal.tags.join(' ')}`.toLowerCase();
      const isPromotedDeal = deal.provider === 'promoted-deals';
      return (deal.tags.includes(activeTab) || isPromotedDeal) && (!destination || dealContent.includes(destination));
    });
  }, [activeTab, dealList, search.destination]);

  const openMessage = (title, body, kicker) => setModal({ title, body, kicker });
  const showNotice = (message) => setNotice(message);

  const refreshDiagnostics = async () => {
    try {
      const status = await getProviderStatus();
      setDiagnostics((current) => ({
        ...current,
        frontendMode: getFrontendProviderMode(),
        backendMode: status.providerMode,
        activeProviders: status.activeProviders || status.meta?.activeProviders || [],
        primaryFlightProvider: status.primaryFlightProvider || 'duffel',
        duffelConfigured: Boolean(status.duffelConfigured),
        amadeusConfigured: Boolean(status.amadeusConfigured),
        amadeusSecondaryEnabled: Boolean(status.amadeusSecondaryEnabled),
        providerStatus: status.providers || current.providerStatus || [],
        providerErrors: status.providerErrors || [],
      }));
    } catch (error) {
      setDiagnostics((current) => ({
        ...current,
        latestSource: 'mock fallback',
        providerErrors: [{ provider: 'frontend', method: 'health', message: error.message }],
      }));
    }
  };

  const lookupLocations = async (keyword) => {
    if (!keyword || keyword.trim().length < 3) return;
    try {
      const response = await searchLocations(keyword);
      setLocationSuggestions(response.results || []);
      setDiagnostics((current) => ({
        ...current,
        backendMode: response.providerMode || current.backendMode,
        latestSource: (response.meta?.activeProviders || []).join(', ') || response.providerMode,
        providerErrors: response.providerErrors || [],
        providerStatus: response.providerStatus || current.providerStatus,
      }));
    } catch (error) {
      setDiagnostics((current) => ({ ...current, providerErrors: [{ provider: 'frontend', method: 'locations', message: error.message }] }));
    }
  };

  const runHolidaySearch = async (criteria, shouldScroll = true) => {
    setIsSearching(true);
    setSearchError('');
    try {
      const response = await searchHolidays(criteria);
      let results = response.results || [];
      if (featureFlags.enablePromotedDeals !== false) {
        try {
          const promoted = await getPublicPromotedDeals();
          results = mergeHolidayResults(promoted.results || [], results);
        } catch (promotedError) {
          response.providerErrors = [...(response.providerErrors || []), { provider: 'promoted-deals', method: 'search', message: 'Promoted deals unavailable; showing standard results.' }];
        }
      }
      setDealList(results);
      setDiagnostics((current) => ({
        ...current,
        backendMode: response.providerMode,
        activeProviders: response.meta?.activeProviders || current.activeProviders,
        latestSource: response.meta?.fallbackUsed ? 'mock fallback' : (response.providerStatus || []).filter((status) => status.resultCount > 0).map((status) => status.provider).join(', ') || response.providerMode,
        providerErrors: response.providerErrors || [],
        providerStatus: response.providerStatus || current.providerStatus,
      }));
      setSearchSummary(`Showing ${criteria.intent.toLowerCase()} from ${criteria.origin} for ${criteria.date.toLowerCase()} (${criteria.groupSize}) · ${response.providerMode} mode.`);
      if (shouldScroll) scrollToId('deals');
    } catch (error) {
      setSearchError('Sorry, the travel search service could not return results. Mock mode should still work without live credentials.');
      setDealList([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    getSiteConfig().then((response) => { if (response.siteConfig) setSiteConfig(response.siteConfig); }).catch(() => {});
    refreshDiagnostics();
    runHolidaySearch({ ...search, intent: activeTab }, false);
  }, []);

  const handleSearch = () => {
    runHolidaySearch({ ...search, intent: activeTab });
  };

  const handleNewsletter = (event) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      showNotice('Please enter a valid email address.');
      return;
    }

    showNotice(`Thanks! Group travel ideas will be sent to ${newsletterEmail}.`);
    setNewsletterEmail('');
  };

  const handleResetDeals = () => {
    setActiveTab('Holidays');
    setSearch((currentSearch) => ({ ...currentSearch, destination: '' }));
    runHolidaySearch({ ...search, destination: '', intent: 'Holidays' });
  };

  const handleSelectGetaway = (title) => {
    const config = getawaySearchConfig[title] || { tab: 'Holidays', destination: title };
    setActiveTab(config.tab);
    setSearch((currentSearch) => ({ ...currentSearch, destination: config.destination }));
    runHolidaySearch({ ...search, destination: config.destination, intent: config.tab });
  };

  const handleViewDeal = (selected) => {
    setModal({
      title: selected.hotelName,
      body: `${selected.flightSummary}. ${selected.hotelSummary}. You can save an enquiry or continue to a partner where available; PickyHoliday does not create a booking, payment or supplier reservation automatically.`,
      kicker: selected.savingLabel,
      deal: selected,
      onEnquiry: (deal) => {
        setModal({
          type: 'enquiry',
          deal,
          onSubmitted: (enquiry) => showNotice(enquiry.message || 'Thanks, your enquiry has been saved. This is not a booking confirmation.'),
        });
      },
    });
  };

  return (
    <>
      <Header onAction={openMessage} />
      <main>
        {siteConfig.announcement?.active && siteConfig.featureFlags?.enableAnnouncementBanner !== false && siteConfig.announcement?.text && <div className="announcement">{siteConfig.announcement.text}</div>}
        <Hero config={siteConfig} />
        <SearchPanel activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch} onSearch={handleSearch} locationSuggestions={locationSuggestions} onLookupLocations={lookupLocations} />
        <DealsSection
          dealsToShow={filteredDeals}
          searchSummary={searchSummary}
          onReset={handleResetDeals}
          onRotateDeals={(direction) => setDealList((list) => rotateList(list, direction))}
          onViewDeal={handleViewDeal}
          isLoading={isSearching}
          error={searchError}
          diagnostics={diagnostics}
          onRefreshDiagnostics={refreshDiagnostics}
        />
        <GetawaysSection
          items={getawayList}
          onSelectGetaway={handleSelectGetaway}
          onRotate={(direction) => setGetawayList((list) => rotateList(list, direction))}
        />
        <section className="content block">
          <SectionTitle title="Why book with PickyHoliday?" />
          <div className="benefits">
            {benefits.map(([Icon, title, copy]) => (
              <button className="benefit" key={title} onClick={() => openMessage(title, copy, 'Why book with us')}>
                <Icon />
                <div><h3>{title}</h3><p>{copy}</p></div>
              </button>
            ))}
          </div>
        </section>
        <section className="content promo">
          <div>
            <span>BETTER TOGETHER</span>
            <h2>Save more when<br />you go <b>together</b></h2>
            <p>Big group? Save an enquiry and tell us what you need.<br />No payment or booking is created automatically.</p>
            <button onClick={() => { setSearch((currentSearch) => ({ ...currentSearch, groupSize: '20+ people, group quote' })); scrollToId('search'); }}>
              Explore group deals <ChevronRight size={18} />
            </button>
          </div>
          <div className="promo-price">Group deals<br />from <strong>£199</strong> pp<Users /></div>
        </section>
        <GuidesSection
          items={guideList}
          onAction={openMessage}
          onRotate={(direction) => setGuideList((list) => rotateList(list, direction))}
        />
        <ReviewsSection onAction={openMessage} />
        <form className="content newsletter" onSubmit={handleNewsletter}>
          <div className="mailicon"><Mail /></div>
          <div>
            <h2>{siteConfig.newsletter?.title || 'Get group deals & travel inspiration straight to your inbox'}</h2>
            <p>{siteConfig.newsletter?.subtitle || 'Be the first to hear about exclusive offers, big savings and new destinations.'}</p>
          </div>
          <label><Mail size={18} /><input value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="Enter your email address" /></label>
          <button>Sign me up <ChevronRight size={17} /></button>
        </form>
        <div className="content strip">
          <button onClick={() => openMessage('Trustpilot rating', 'PickyHoliday is rated 4.7 out of 5 by travellers in this demo experience.', 'Trustpilot')}><Star fill="currentColor" /> Trustpilot</button>
          <Stars small />
          <span>Rated 4.7/5</span>
          <span><LockKeyhole size={18} /> Secure enquiries</span>
          <span>{siteConfig.trust?.protectionCopy || 'Saved enquiries only — no automatic booking'}</span>
        </div>
      </main>
      <Footer onAction={openMessage} siteConfig={siteConfig} />
      {notice && <div className="toast" role="status">{notice}</div>}
      <Dialog content={modal} onClose={() => setModal(null)} siteConfig={siteConfig} />
    </>
  );
}

function Footer({ onAction, siteConfig = defaultSiteConfig }) {
  const cols = [
    ['Book', ['Holidays', 'Villas', 'Group hotel stays', 'Stag & Hen', 'Families']],
    ['Explore', ['Destinations', 'Inspiration', 'Travel guides', 'Group travel ideas', 'Deals']],
    ['Help', ['Help Centre', 'Manage enquiries', 'How quotes work', 'FAQs']],
    ['About PickyHoliday', ['About us', 'Careers', 'Terms & Conditions', 'Privacy Policy']],
  ];

  return (
    <footer id="footer">
      <div className="foot content">
        <div className="brand">
          <Logo footer />
          <p>{siteConfig.footer?.shortDescription || 'Group holidays made easy.'}</p>
          <span>Follow us</span>
          <div className="social">
            <button onClick={() => onAction('Facebook', 'This would open the PickyHoliday Facebook community.')}><i>f</i></button>
            <button onClick={() => onAction('Instagram', 'This would open the PickyHoliday travel inspiration feed.')}><i>◎</i></button>
            <button onClick={() => onAction('Travel wheel', 'Spin through featured group destinations and hand-picked deals.')}><ShipWheel /></button>
            <button onClick={() => onAction('Video guides', 'Watch destination guides, hotel walk-throughs and group travel tips.')}><i>▶</i></button>
          </div>
        </div>
        {cols.map(([heading, links]) => (
          <div className="fcol" key={heading}>
            <h3>{heading}</h3>
            {links.map((link) => <button key={link} onClick={() => onAction(link, `Open ${link.toLowerCase()} options, useful links and next steps.`)}>{link}</button>)}
          </div>
        ))}
        <div className="apps">
          <h3>Download the app</h3>
          <p>Manage saved enquiries, get alerts<br />and group travel ideas.</p>
          <div>
            <button onClick={() => onAction('App Store', 'The iOS app link is ready for connection to the live store listing.')}> App Store</button>
            <button onClick={() => onAction('Google Play', 'The Android app link is ready for connection to the live store listing.')}>▶ Google Play</button>
          </div>
        </div>
      </div>
      <div className="copy content">
        <p>© 2025 PickyHoliday.co.uk. All rights reserved.</p>
        <span><ShieldCheck /> Enquiry-first planning</span>
        <span><ShieldCheck /> Secure enquiries</span>
        <span><Clock3 /> 24/7 support</span>
      </div>
    </footer>
  );
}



const adminNav = [
  ['Dashboard', '/admin'],
  ['Enquiries', '/admin/enquiries'],
  ['Promoted Deals', '/admin/deals'],
  ['Site Content', '/admin/content'],
  ['Feature Flags', '/admin/features'],
  ['Settings', '/admin/settings'],
];

const emptyDeal = {
  title: '',
  status: 'draft',
  dealType: 'package',
  supplierName: '',
  destination: '',
  country: '',
  hotelName: '',
  image: '',
  priceFrom: '',
  currency: 'GBP',
  priceQualifier: 'pp',
  savingLabel: '',
  nights: '',
  departureAirport: '',
  returnAirport: '',
  dateLabel: '',
  groupSizeLabel: '',
  boardBasis: '',
  baggageLabel: '',
  bookingMode: 'manual-quote',
  partnerId: '',
  partnerUrl: '',
  protectionLabel: 'Enquiry only — no automatic booking or payment.',
  tags: '',
  internalNotes: '',
};

function AdminPageTitle({ kicker, title, copy, action }) {
  return (
    <div className="admin-title">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

function AdminLoginApp() {
  const [tokenInput, setTokenInput] = useState('');
  const [rememberForSession, setRememberForSession] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setError('Enter the admin access key.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await listAdminEnquiries(token);
      saveAdminToken(token);
      window.location.assign('/admin');
    } catch (loginError) {
      setError(loginError.status === 401
        ? 'That access key was not accepted. Check the current server ADMIN_ACCESS_TOKEN.'
        : (loginError.message || 'Could not verify the admin access key.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="admin-page admin-login">
      <section className="admin-login-card">
        <Logo />
        <span>Owner admin</span>
        <h1>Sign in to PickyHoliday</h1>
        <p>Enter the server-side admin access key. It is stored in sessionStorage only for this browser session and is never saved to localStorage.</p>
        <form onSubmit={submit}>
          <label>
            <span>Admin access key</span>
            <input type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} autoComplete="off" placeholder="Enter admin password" />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={rememberForSession} onChange={(event) => setRememberForSession(event.target.checked)} />
            Remember for this browser session only
          </label>
          {!rememberForSession && <p className="admin-muted">The admin area still needs sessionStorage for navigation. Log out when finished to clear the key.</p>}
          {error && <div className="error-state compact">{error}</div>}
          <button disabled={isLoading}>{isLoading ? 'Checking…' : 'Log in'}</button>
        </form>
      </section>
    </main>
  );
}

function AdminLayout({ children, onLogout }) {
  const path = window.location.pathname;

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Logo />
        <nav aria-label="Admin navigation">
          {adminNav.map(([label, href]) => <a key={href} className={path === href ? 'active' : ''} href={href}>{label}</a>)}
        </nav>
        <button className="admin-logout" onClick={onLogout}>Log out</button>
      </aside>
      <section className="admin-shell admin-dashboard-shell">{children}</section>
    </main>
  );
}

function AdminEnquiriesPanel({ token }) {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await listAdminEnquiries(token);
      setEnquiries(response.results || []);
    } catch (loadError) {
      setError(loadError.status === 401
        ? 'Admin access key is no longer accepted. Please log in again.'
        : (loadError.message || 'Could not load enquiries.'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (enquiry, status) => {
    setUpdatingId(enquiry.id);
    setError('');
    try {
      const response = await updateAdminEnquiryStatus(enquiry.id, status, token);
      const updated = response.results?.[0] || { ...enquiry, status };
      setEnquiries((current) => current.map((item) => (item.id === enquiry.id ? updated : item)));
    } catch (statusError) {
      setError(statusError.message || 'Could not update enquiry.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <>
      <AdminPageTitle
        kicker="Saved customer enquiries"
        title="Enquiries"
        copy="Review quote requests. Status updates are internal only and do not create bookings, payments or supplier reservations."
        action={<button onClick={load} disabled={isLoading}>Refresh</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {isLoading && <div className="loading-state">Loading saved enquiries…</div>}
      {!isLoading && enquiries.length === 0 && !error && <div className="empty-state">No enquiries found yet.</div>}
      <div className="admin-list">
        {enquiries.map((enquiry) => (
          <article className="admin-enquiry-card" key={enquiry.id}>
            <div className="admin-card-top">
              <div>
                <span className={`status-pill status-${enquiry.status}`}>{enquiry.status}</span>
                <h2>{enquiry.customerName || 'Name not supplied'}</h2>
                <p>{friendlyDate(enquiry.createdAt)} · Ref {enquiry.id}</p>
              </div>
              <label>
                <span>Status</span>
                <select value={enquiry.status || 'new'} onChange={(event) => updateStatus(enquiry, event.target.value)} disabled={updatingId === enquiry.id}>
                  {enquiryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <dl className="admin-fields">
              <dt>Email</dt><dd>{enquiry.customerEmail || '—'}</dd>
              <dt>Phone</dt><dd>{enquiry.customerPhone || '—'}</dd>
              <dt>Destination</dt><dd>{enquiry.destination || '—'}</dd>
              <dt>Hotel</dt><dd>{enquiry.hotelName || '—'}</dd>
              <dt>Dates</dt><dd>{enquiry.dateLabel || '—'}</dd>
              <dt>Group size</dt><dd>{enquiry.groupSizeLabel || '—'}</dd>
              <dt>Provider</dt><dd>{enquiry.provider || '—'}</dd>
              <dt>Supplier</dt><dd>{enquiry.supplierName || '—'}</dd>
            </dl>
            <div className="admin-notes">
              <b>Customer notes</b>
              <p>{enquiry.customerNotes || 'No notes supplied.'}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AdminDashboardPanel({ token }) {
  const [state, setState] = useState({ enquiries: [], deals: [], health: {}, loadedAt: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enquiries, deals, health] = await Promise.all([
        listAdminEnquiries(token),
        listAdminPromotedDeals(token),
        getBackendHealth(),
      ]);
      setState({
        enquiries: enquiries.results || [],
        deals: deals.results || [],
        health,
        loadedAt: new Date().toLocaleString('en-GB'),
      });
    } catch (dashboardError) {
      setError(dashboardError.message || 'Could not refresh dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const count = (status) => state.enquiries.filter((item) => item.status === status).length;
  const activeDeals = state.deals.filter((deal) => deal.status === 'active').length;
  const inactiveDeals = state.deals.filter((deal) => ['draft', 'paused'].includes(deal.status)).length;
  const cards = [
    ['Total enquiries', state.enquiries.length],
    ['New enquiries', count('new')],
    ['Reviewing', count('reviewing')],
    ['Contacted/quoted', count('contacted') + count('quoted')],
    ['Active promoted deals', activeDeals],
    ['Draft/paused deals', inactiveDeals],
    ['Storage mode', state.health.enquiryStorageMode || 'json'],
    ['Database status', state.health.databaseStatus || 'unknown'],
    ['Provider mode', state.health.providerMode || 'mock'],
  ];

  return (
    <>
      <AdminPageTitle
        kicker="Admin cockpit"
        title="Dashboard"
        copy="Operational snapshot for enquiries, promoted deals and safe provider/storage status."
        action={<button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>}
      />
      {error && <div className="error-state">{error}</div>}
      <div className="admin-cards">
        {cards.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}
      </div>
      <p className="admin-muted">Last refreshed: {state.loadedAt || 'Not yet refreshed'}.</p>
    </>
  );
}

function AdminDealsPanel({ token }) {
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(emptyDeal);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listAdminPromotedDeals(token);
      setDeals(response.results || []);
    } catch (dealError) {
      setError(dealError.message || 'Could not load promoted deals.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const field = (name, label, type = 'text') => (
    <label>
      <span>{label}</span>
      <input type={type} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)} />
    </label>
  );

  const edit = (deal) => {
    setEditingId(deal.id);
    setForm({ ...emptyDeal, ...deal, tags: (deal.tags || []).join(', ') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (form.bookingMode === 'affiliate' && form.partnerUrl && !isSafeUrl(form.partnerUrl)) {
      setError('Partner URL must be a safe http:// or https:// URL. javascript: and data: URLs are not allowed.');
      return;
    }

    const payload = { ...form, priceFrom: Number(form.priceFrom || 0), nights: Number(form.nights || 0), tags: form.tags };
    try {
      const response = editingId
        ? await updateAdminPromotedDeal(editingId, payload, token)
        : await createAdminPromotedDeal(payload, token);
      const saved = response.results?.[0];
      setDeals((current) => (editingId
        ? current.map((deal) => (deal.id === editingId ? saved : deal))
        : [saved, ...current]));
      setForm(emptyDeal);
      setEditingId('');
      setNotice('Promoted deal saved. Active deals can appear publicly; inactive deals stay private.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save promoted deal.');
    }
  };

  const status = async (deal, nextStatus) => {
    setError('');
    try {
      const response = await updateAdminPromotedDealStatus(deal.id, nextStatus, token);
      const updated = response.results?.[0];
      setDeals((current) => current.map((item) => (item.id === deal.id ? updated : item)));
    } catch (statusError) {
      setError(statusError.message || 'Could not update status.');
    }
  };

  return (
    <>
      <AdminPageTitle
        kicker="Admin-managed offers"
        title="Promoted Deals"
        copy="Create, edit, pause and archive promoted cards. This never creates a booking, payment or reservation."
        action={<button onClick={load} disabled={loading}>Refresh list</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {notice && <div className="loading-state">{notice}</div>}
      <form className="admin-form" onSubmit={save}>
        <h2>{editingId ? 'Edit promoted deal' : 'Create promoted deal'}</h2>
        <fieldset>
          <legend>A. Basic</legend>
          {field('title', 'Title')}
          {field('supplierName', 'Supplier name')}
          {field('destination', 'Destination')}
          {field('country', 'Country')}
          {field('hotelName', 'Hotel name')}
          {field('image', 'Image URL/key')}
          <label><span>Status</span><select value={form.status} onChange={(event) => update('status', event.target.value)}>{['draft', 'active', 'paused', 'archived'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Deal type</span><select value={form.dealType} onChange={(event) => update('dealType', event.target.value)}>{['package', 'advert', 'manual-quote', 'affiliate'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </fieldset>
        <fieldset>
          <legend>B. Pricing</legend>
          {field('priceFrom', 'Price from', 'number')}
          {field('currency', 'Currency')}
          {field('priceQualifier', 'Price qualifier')}
          {field('savingLabel', 'Saving label')}
        </fieldset>
        <fieldset>
          <legend>C. Trip details</legend>
          {field('nights', 'Nights', 'number')}
          {field('departureAirport', 'Departure airport')}
          {field('returnAirport', 'Return airport')}
          {field('dateLabel', 'Date label')}
          {field('groupSizeLabel', 'Group size label')}
          {field('boardBasis', 'Board basis')}
          {field('baggageLabel', 'Baggage label')}
        </fieldset>
        <fieldset>
          <legend>D. Booking/CTA</legend>
          <label><span>Booking mode</span><select value={form.bookingMode} onChange={(event) => update('bookingMode', event.target.value)}>{['manual-quote', 'affiliate', 'enquiry'].map((value) => <option key={value}>{value}</option>)}</select></label>
          {field('partnerId', 'Partner ID')}
          {field('partnerUrl', 'Partner URL')}
          {field('protectionLabel', 'Protection label')}
        </fieldset>
        <fieldset>
          <legend>E. Tags and notes</legend>
          {field('tags', 'Tags comma-separated')}
          <label><span>Internal notes</span><textarea value={form.internalNotes || ''} onChange={(event) => update('internalNotes', event.target.value)} /></label>
        </fieldset>
        <div className="admin-actions">
          <button>{editingId ? 'Save changes' : 'Create deal'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyDeal); }}>Cancel edit</button>}
        </div>
      </form>
      <div className="admin-list">
        {deals.map((deal) => (
          <article className="admin-enquiry-card" key={deal.id}>
            <div className="admin-card-top">
              <div>
                <span className={`status-pill status-${deal.status}`}>{deal.status}</span>
                <h2>{deal.title}</h2>
                <p>{deal.destination} · {deal.supplierName || 'PickyHoliday'} · {friendlyDate(deal.updatedAt)}</p>
              </div>
              <button onClick={() => edit(deal)}>Edit</button>
            </div>
            <div className="admin-actions">
              <button onClick={() => status(deal, 'active')}>Activate</button>
              <button onClick={() => status(deal, 'paused')}>Pause</button>
              <button onClick={() => status(deal, 'archived')}>Archive</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AdminContentPanel({ token, featureOnly = false }) {
  const [config, setConfig] = useState(defaultSiteConfig);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await getAdminSiteConfig(token);
      setConfig(response.siteConfig || defaultSiteConfig);
    } catch (contentError) {
      setError(contentError.message || 'Could not load site content.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const patch = (section, key, value) => setConfig((current) => ({
    ...current,
    [section]: { ...(current[section] || {}), [key]: value },
  }));

  const save = async () => {
    setError('');
    setNotice('');
    try {
      const response = await updateAdminSiteConfig(config, token);
      setConfig(response.siteConfig);
      setNotice('Site configuration saved.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save site configuration.');
    }
  };

  const flags = { ...defaultFeatureFlags, ...(config.featureFlags || {}) };

  if (featureOnly) {
    return (
      <>
        <AdminPageTitle
          kicker="Safe public toggles"
          title="Feature Flags"
          copy="Frontend-safe flags only. Secure backend environment settings still win."
          action={<button onClick={save}>Save flags</button>}
        />
        {error && <div className="error-state">{error}</div>}
        {notice && <div className="loading-state">{notice}</div>}
        <div className="admin-form feature-list">
          {Object.keys(defaultFeatureFlags).map((key) => (
            <label className="admin-check" key={key}>
              <input type="checkbox" checked={Boolean(flags[key])} onChange={(event) => patch('featureFlags', key, event.target.checked)} />
              {key}
            </label>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageTitle
        kicker="Website copy"
        title="Site Content"
        copy="Update public homepage copy without editing source code."
        action={<button onClick={save}>Save content</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {notice && <div className="loading-state">{notice}</div>}
      <div className="admin-form">
        <fieldset>
          <legend>Homepage hero</legend>
          <label><span>Eyebrow</span><input value={config.hero?.eyebrow || ''} onChange={(event) => patch('hero', 'eyebrow', event.target.value)} /></label>
          <label><span>Title</span><input value={config.hero?.title || ''} onChange={(event) => patch('hero', 'title', event.target.value)} /></label>
          <label><span>Subtitle</span><textarea value={config.hero?.subtitle || ''} onChange={(event) => patch('hero', 'subtitle', event.target.value)} /></label>
          <label><span>Assurance chips</span><input value={(config.hero?.assuranceChips || []).join(', ')} onChange={(event) => patch('hero', 'assuranceChips', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
        </fieldset>
        <fieldset>
          <legend>Newsletter/footer/trust</legend>
          <label><span>Newsletter title</span><input value={config.newsletter?.title || ''} onChange={(event) => patch('newsletter', 'title', event.target.value)} /></label>
          <label><span>Newsletter subtitle</span><input value={config.newsletter?.subtitle || ''} onChange={(event) => patch('newsletter', 'subtitle', event.target.value)} /></label>
          <label><span>Footer short description</span><input value={config.footer?.shortDescription || ''} onChange={(event) => patch('footer', 'shortDescription', event.target.value)} /></label>
          <label><span>Trust/protection copy</span><input value={config.trust?.protectionCopy || ''} onChange={(event) => patch('trust', 'protectionCopy', event.target.value)} /></label>
        </fieldset>
        <fieldset>
          <legend>Announcement</legend>
          <label className="admin-check"><input type="checkbox" checked={Boolean(config.announcement?.active)} onChange={(event) => patch('announcement', 'active', event.target.checked)} /> Announcement active</label>
          <label><span>Banner text</span><input value={config.announcement?.text || ''} onChange={(event) => patch('announcement', 'text', event.target.value)} /></label>
        </fieldset>
      </div>
    </>
  );
}

function AdminSettingsPanel() {
  const [health, setHealth] = useState({});

  useEffect(() => {
    getBackendHealth().then(setHealth).catch(() => {});
  }, []);

  const items = [
    ['Provider mode', health.providerMode],
    ['Enquiry storage', health.enquiryStorageMode],
    ['Promoted deal storage', health.promotedDealStorageMode],
    ['Database status', health.databaseStatus],
    ['Promoted deal status', health.promotedDealStorageStatus],
    ['Site config status', health.siteConfigStorageStatus],
    ['Diagnostics default', showProviderDiagnostics ? 'visible' : 'hidden'],
    ['App version', import.meta.env.VITE_APP_VERSION || 'not set'],
    ['Railway database configured', health.databaseConfigured ? 'yes' : 'no'],
    ['Duffel configured', health.duffelConfigured ? 'yes' : 'no'],
    ['Amadeus configured', health.amadeusConfigured ? 'yes' : 'no'],
  ];

  return (
    <>
      <AdminPageTitle
        kicker="Safe environment summary"
        title="Settings"
        copy="No secrets, tokens, URLs or passwords are displayed here."
      />
      <dl className="admin-fields settings-fields">
        {items.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt>{key}</dt>
            <dd>{String(value ?? 'unknown')}</dd>
          </React.Fragment>
        ))}
      </dl>
    </>
  );
}

function AdminApp() {
  const [token, setToken] = useState(readAdminToken);

  useEffect(() => {
    if (!token) window.location.replace('/admin/login');
  }, [token]);

  const logout = () => {
    clearAdminToken();
    setToken('');
    window.location.assign('/admin/login');
  };

  if (!token) return null;

  const path = window.location.pathname;
  let panel = <AdminDashboardPanel token={token} />;
  if (path === '/admin/enquiries') panel = <AdminEnquiriesPanel token={token} />;
  if (path === '/admin/deals') panel = <AdminDealsPanel token={token} />;
  if (path === '/admin/content') panel = <AdminContentPanel token={token} />;
  if (path === '/admin/features') panel = <AdminContentPanel token={token} featureOnly />;
  if (path === '/admin/settings') panel = <AdminSettingsPanel />;

  return <AdminLayout onLogout={logout}>{panel}</AdminLayout>;
}

const Root = window.location.pathname === '/admin/login' ? AdminLoginApp : (adminPaths.includes(window.location.pathname) ? AdminApp : App);

createRoot(document.getElementById('root')).render(<Root />);
