import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ChevronRight, Clock3, HandCoins, HeartHandshake, LockKeyhole, Mail, ShieldCheck, Star, Users, WalletCards } from 'lucide-react';

import { ShortlistBar, dealKey, readShortlist, saveShortlist, shortlistLimit, shortlistSummary } from '../components/groupQuoteFlow.jsx';
import { Header } from '../components/layout/Header.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Stars } from '../components/layout/Brand.jsx';
import { Dialog, dealModalContent } from '../components/ui/Dialog.jsx';
import { SearchPanel } from '../components/search/SearchPanel.jsx';
import { SpotlightedDealsSection } from '../components/deals/SpotlightedDealsSection.jsx';
import { DealsSection, GetawaysSection, GuidesSection, Hero, ReviewsSection, SectionTitle } from './HomeSections.jsx';
import { SearchResultsPage } from './routes/SearchResultsPage.jsx';
import { PublicContentPageApp } from './routes/PublicContentPageApp.jsx';
import { AdminApp, AdminLoginApp } from './routes/AdminApp.jsx';
import { getaways, guides } from '../data/mockDeals.js';
import {
  getFrontendProviderMode,
  getProviderStatus,
  getPublicPromotedDeals,
  getSiteConfig,
  searchHolidays,
  getSpotlightedDeals,
  searchComposedHolidays,
  searchLocations,
} from '../services/travelApi.js';
import { criteriaToSearchParams, holidaySearchSummary, normaliseHolidaySearchCriteria } from '../services/search/holidaySearchCriteria.js';
import { storeSearchHandoff } from '../services/search/searchHandoff.js';
import { replaceJsonLd, updateSeoMeta } from '../services/seo/seoMeta.js';
import {
  adminPaths,
  defaultSiteConfig,
  defaultOriginAirport,
  fieldOptions,
  getawaySearchConfig,
  mergeHolidayResults,
  rotateList,
  scrollToId,
  showDemoDeals,
  trackEvent,
} from './appConstants.js';

const benefits = [
  [BriefcaseBusiness, 'Group-friendly ideas', 'Search group-friendly holiday ideas in seconds'],
  [HandCoins, 'Live-price checks', 'Compare ideas and check live prices with partners'],
  [WalletCards, 'No payment taken', 'No booking created by PickyHoliday when you search or save'],
  [ShieldCheck, 'Enquiry first', 'Save favourites and ask for a group quote when plans need checking'],
  [Clock3, 'Group quote support', 'Ask for rooms, dates or extras to be checked before partner confirmation'],
  [LockKeyhole, 'Partner confirmation', 'Prices, availability and terms are confirmed by the partner or advisor'],
];

export function App() {
  const isSearchRoute = window.location.pathname === '/search';
  const [activeTab, setActiveTab] = useState('Holidays');
  const [search, setSearch] = useState(() => normaliseHolidaySearchCriteria({
    destination: '',
    originAirport: defaultOriginAirport,
    departureDate: '',
    returnDate: '',
    nights: 7,
    dateFlexibilityDays: 0,
    adults: 2,
    children: 0,
    rooms: 1,
    intent: 'Holidays',
  }));
  const [searchSummary, setSearchSummary] = useState('Showing popular group-friendly holiday ideas. Save favourites, check live prices with partners or ask for a group quote.');
  const [dealList, setDealList] = useState([]);
  const [spotlightedDeals, setSpotlightedDeals] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [isHeroSearchLoading, setIsHeroSearchLoading] = useState(false);
  const [isLoadingSpotlights, setIsLoadingSpotlights] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [getawayList, setGetawayList] = useState(getaways);
  const [guideList, setGuideList] = useState(guides);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);
  const [shortlist, setShortlist] = useState(() => readShortlist());
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
    const params = new URLSearchParams(window.location.search);
    const destination = params.get('destination');
    const intent = params.get('intent');
    if (destination || intent) {
      setSearch((current) => ({ ...current, ...(destination ? { destination } : {}) }));
      if (intent) setActiveTab(intent);
      if (window.location.hash) window.setTimeout(() => scrollToId(window.location.hash.slice(1)), 100);
    }
  }, []);

  useEffect(() => {
    if (isSearchRoute) return;
    updateSeoMeta({ metaTitle: 'PickyHoliday | Group holidays made easy', metaDescription: 'Plan enquiry-first group holidays with PickyHoliday destination ideas, group travel guides and advisor follow-up.', canonicalPath: '/' });
    replaceJsonLd([{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'PickyHoliday', url: window.location.origin }, { '@context': 'https://schema.org', '@type': 'TravelAgency', name: 'PickyHoliday', url: window.location.origin, description: 'Enquiry-first group holiday planning support.' }]);
  }, [isSearchRoute]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const featureFlags = siteConfig.featureFlags || {};
  const filteredDeals = useMemo(() => {
    const destination = search.destination.trim().toLowerCase();

    return dealList.filter((deal) => {
      const tags = deal.tags || [];
      const dealContent = `${deal.destination} ${deal.country} ${deal.hotelName} ${deal.supplierName} ${tags.join(' ')}`.toLowerCase();
      const isPromotedDeal = deal.provider === 'promoted-deals';
      return (tags.includes(activeTab) || isPromotedDeal || deal.provider === 'partner-redirect') && (!destination || dealContent.includes(destination));
    });
  }, [activeTab, dealList, search.destination]);

  const openMessage = (title, body, kicker) => setModal(typeof title === 'object' ? title : { title, body, kicker });
  const openSignIn = () => setModal({ type: 'admin-login' });
  const showNotice = (message) => setNotice(message);
  const isDealShortlisted = (deal) => {
    const resultId = deal.id || deal.resultId;
    return shortlist.some((item) => item.id === dealKey(deal) || (resultId && item.resultId === resultId));
  };
  const addToShortlist = (deal, source = 'deal-card') => {
    const summary = shortlistSummary(deal);
    setShortlist((current) => {
      if (current.some((item) => item.id === summary.id || (summary.resultId && item.resultId === summary.resultId))) return current;
      if (current.length >= shortlistLimit) { showNotice('You can shortlist up to 6 holiday ideas for one group quote.'); return current; }
      const next = [...current, summary];
      saveShortlist(next);
      trackEvent({ type: 'shortlist_added', category: 'shortlist', label: summary.destination || summary.hotelName, metadata: { destination: summary.destination, resultId: summary.resultId, provider: summary.provider, shortlistCount: next.length, source } });
      showNotice('Added to your browser-local shortlist.');
      return next;
    });
  };
  const removeFromShortlist = (deal, source = 'shortlist-bar') => {
    setShortlist((current) => {
      const next = current.filter((item) => item.id !== deal.id && (!deal.resultId || item.resultId !== deal.resultId));
      saveShortlist(next);
      trackEvent({ type: 'shortlist_removed', category: 'shortlist', label: deal.destination || deal.hotelName, metadata: { destination: deal.destination, resultId: deal.resultId, provider: deal.provider, shortlistCount: next.length, source } });
      return next;
    });
  };
  const toggleShortlist = (deal, source = 'deal-card') => (isDealShortlisted(deal) ? removeFromShortlist(shortlistSummary(deal), source) : addToShortlist(deal, source));
  const openQuoteBuilder = (deals, source = 'quote-builder') => {
    const selectedDeals = (Array.isArray(deals) ? deals : [deals]).filter(Boolean);
    trackEvent({ type: 'quote_builder_started', category: 'enquiry', label: selectedDeals[0]?.destination || search.destination || 'group quote', metadata: { destination: selectedDeals[0]?.destination || search.destination, resultId: selectedDeals[0]?.resultId || selectedDeals[0]?.id, provider: selectedDeals[0]?.provider, shortlistCount: selectedDeals.length, source } });
    setModal({ type: 'quote-builder', deals: selectedDeals.length ? selectedDeals : shortlist, source, onSubmitted: (enquiry) => showNotice(enquiry.message || 'Thanks, your enquiry has been saved. No payment taken by PickyHoliday.') });
  };

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
      let results = (response.results || []).filter((result) => showDemoDeals || !result.isDemo);
      if (featureFlags.enablePromotedDeals !== false) {
        try {
          const promoted = await getPublicPromotedDeals();
          results = mergeHolidayResults(promoted.results || [], results);
        } catch (promotedError) {
          response.providerErrors = [...(response.providerErrors || []), { provider: 'promoted-deals', method: 'search', message: 'Promoted deals unavailable; showing standard results.' }];
        }
      }
      if (response.meta?.fallbackUsed) trackEvent({ type: 'mock_fallback_used', category: 'provider', label: response.providerMode, metadata: response.meta?.diagnostics || {} });
      if (!results.length) trackEvent({ type: 'no_live_results_found', category: 'search', label: criteria.destination || criteria.intent, metadata: { providerMode: response.providerMode } });
      setDealList(results);
      setDiagnostics((current) => ({
        ...current,
        backendMode: response.providerMode,
        activeProviders: response.meta?.activeProviders || current.activeProviders,
        latestSource: response.meta?.fallbackUsed ? 'mock fallback' : (response.providerStatus || []).filter((status) => status.resultCount > 0).map((status) => status.provider).join(', ') || response.providerMode,
        providerErrors: response.providerErrors || [],
        providerStatus: response.providerStatus || current.providerStatus,
      }));
      setSearchSummary(`Showing ${holidaySearchSummary(criteria)} · ${response.providerMode} mode.`);
      if (shouldScroll) scrollToId('deals');
    } catch (error) {
      setSearchError('Sorry, the travel search service could not return results. Mock mode should still work without live credentials.');
      setDealList([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadSpotlightedDeals = async (criteria = search) => {
    setIsLoadingSpotlights(true);
    try {
      const response = await getSpotlightedDeals({ ...criteria, intent: activeTab });
      const results = (response.results || []).filter((result) => showDemoDeals || !result.isDemo).slice(0, 4);
      setSpotlightedDeals(results);
      results.forEach((deal) => trackEvent({ type: 'spotlight_deal_viewed', category: 'spotlight', label: deal.destination || deal.hotelName, metadata: { destination: deal.destination, provider: deal.provider, resultId: deal.id || deal.resultId } }));
    } catch (error) {
      setSpotlightedDeals([]);
    } finally {
      setIsLoadingSpotlights(false);
    }
  };

  useEffect(() => {
    getSiteConfig().then((response) => { if (response.siteConfig) setSiteConfig(response.siteConfig); }).catch(() => {});
    refreshDiagnostics();
    if (!isSearchRoute) {
      runHolidaySearch({ ...search, intent: activeTab }, false);
      loadSpotlightedDeals(search);
    }
  }, [isSearchRoute]);

  const handleSearch = async () => {
    if (isHeroSearchLoading) return;

    const criteria = normaliseHolidaySearchCriteria({ ...search, intent: activeTab });
    trackEvent({ type: 'composed_search_submitted', category: 'search', label: criteria.destination || activeTab, metadata: { destination: criteria.destination, intent: activeTab, dateFlexibilityDays: criteria.dateFlexibilityDays, adults: criteria.adults, children: criteria.children, partySize: criteria.partySize, rooms: criteria.rooms } });
    setIsHeroSearchLoading(true);

    try {
      const response = await searchComposedHolidays(criteria);
      const handoffId = storeSearchHandoff({ criteria, response });
      const params = criteriaToSearchParams(criteria);
      if (handoffId) params.set('handoff', handoffId);

      window.location.href = `/search?${params.toString()}`;
    } catch (error) {
      showNotice('Sorry, composed holiday ideas are temporarily unavailable. Please try again.');
      setIsHeroSearchLoading(false);
    }
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
    if (selected?.dealReasonLabel) trackEvent({ type: 'spotlight_deal_clicked', category: 'spotlight', label: selected.destination || selected.hotelName, metadata: { destination: selected.destination, provider: selected.provider, resultId: selected.id || selected.resultId, bookingMode: selected.bookingMode } });
    setModal(dealModalContent(selected, {
      onOpenEnquiry: setModal,
      onSubmitted: (enquiry) => {
        showNotice(enquiry.message || 'Thanks, your enquiry has been saved. No payment taken by PickyHoliday.');
      },
      onShortlist: (deal) => toggleShortlist(deal, 'deal-modal'),
      isShortlisted: isDealShortlisted,
      onQuote: (deal) => openQuoteBuilder([deal], 'deal-modal'),
    }));
  };

  if (isSearchRoute) {
    return (
      <>
        <Header onAction={openMessage} onSignIn={openSignIn} />
        <SearchResultsPage onOpenDeal={handleViewDeal} isShortlisted={isDealShortlisted} onToggleShortlist={(deal) => toggleShortlist(deal, 'search-results')} onQuote={(deals) => openQuoteBuilder(deals, 'search-results')} diagnostics={diagnostics} setDiagnostics={setDiagnostics} locationSuggestions={locationSuggestions} onLookupLocations={lookupLocations} />
        <Footer onAction={openMessage} onSignIn={openSignIn} siteConfig={siteConfig} />
        <ShortlistBar shortlist={shortlist} onRemove={(deal) => removeFromShortlist(deal, 'shortlist-drawer')} onCompare={() => setModal({ type: 'compare-shortlist', deals: shortlist })} onQuote={() => openQuoteBuilder(shortlist, 'shortlist-drawer')} onTrack={trackEvent} />
        <Dialog content={modal} onClose={() => setModal(null)} siteConfig={siteConfig} />
        {notice && <div className="toast">{notice}</div>}
      </>
    );
  }

  return (
    <>
      <Header onAction={openMessage} onSignIn={openSignIn} />
      <main>
        {siteConfig.announcement?.active && siteConfig.featureFlags?.enableAnnouncementBanner !== false && siteConfig.announcement?.text && <div className="announcement">{siteConfig.announcement.text}</div>}
        <Hero config={siteConfig} />
        <SearchPanel activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch} onSearch={handleSearch} isLoading={isHeroSearchLoading} locationSuggestions={locationSuggestions} onLookupLocations={lookupLocations} />
        <SpotlightedDealsSection deals={spotlightedDeals} onViewDeal={handleViewDeal} isShortlisted={isDealShortlisted} onToggleShortlist={(deal) => toggleShortlist(deal, 'spotlight-card')} onQuote={(deals) => openQuoteBuilder(deals, 'spotlighted-deals')} isLoading={isLoadingSpotlights} />
        <DealsSection
          dealsToShow={filteredDeals}
          searchSummary={searchSummary}
          onReset={handleResetDeals}
          onRotateDeals={(direction) => setDealList((list) => rotateList(list, direction))}
          onViewDeal={handleViewDeal}
          isShortlisted={isDealShortlisted}
          onToggleShortlist={(deal) => toggleShortlist(deal, 'deal-card')}
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
          <SectionTitle title="Why choose PickyHoliday?" />
          <div className="benefits">
            {benefits.map(([Icon, title, copy]) => (
              <button type="button" className="benefit" key={title} onClick={() => openMessage(title, copy, 'Why choose us')}>
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
            <p>Big group? Save an enquiry and tell us what you need.<br />No payment taken by PickyHoliday. No booking created.</p>
            <button type="button" onClick={() => { setSearch((currentSearch) => ({ ...currentSearch, groupSize: '20+ people, group quote' })); scrollToId('search'); }}>
              Ask for group quote <ChevronRight size={18} />
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
          <button type="submit">Sign me up <ChevronRight size={17} /></button>
        </form>
        <div className="content strip">
          <button type="button" onClick={() => openMessage('Trustpilot rating', 'PickyHoliday is rated 4.7 out of 5 by travellers in this demo experience.', 'Trustpilot')}><Star fill="currentColor" /> Trustpilot</button>
          <Stars small />
          <span>Rated 4.7/5</span>
          <span><LockKeyhole size={18} /> Secure enquiries</span>
          <span>{siteConfig.trust?.protectionCopy || 'No booking created — no payment taken by PickyHoliday'}</span>
        </div>
      </main>
      <Footer onAction={openMessage} onSignIn={openSignIn} siteConfig={siteConfig} />
      {notice && <div className="toast" role="status">{notice}</div>}
      <ShortlistBar shortlist={shortlist} onRemove={(deal) => removeFromShortlist(deal, 'shortlist-drawer')} onCompare={() => setModal({ type: 'compare-shortlist', deals: shortlist })} onQuote={() => openQuoteBuilder(shortlist, 'shortlist-drawer')} onTrack={trackEvent} />
      <Dialog content={modal} onClose={() => setModal(null)} siteConfig={siteConfig} />
    </>
  );
}



export const isPublicContentPath = /^\/(destinations|group-holidays|guides)\/[^/]+$/.test(window.location.pathname);
export const Root = window.location.pathname === '/admin/login' ? AdminLoginApp : (adminPaths.includes(window.location.pathname) ? AdminApp : (isPublicContentPath ? PublicContentPageApp : App));
