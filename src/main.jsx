import React, { useEffect, useMemo, useState } from 'react';
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
import { searchHolidays, submitEnquiry } from './services/travelApi.js';

const img = (id) => imageUrls[id] || id;
const formatPrice = (deal) => `${deal.currency === 'GBP' ? '£' : deal.currency}${deal.priceFrom}`;
const dealPlace = (deal) => `${deal.destination}, ${deal.country}`;

const benefits = [
  [BriefcaseBusiness, 'Group experts', 'Years of experience in group travel'],
  [HandCoins, 'Low deposits', 'Secure your trip from just £49pp'],
  [WalletCards, 'Flexible plans', 'Plan deposits and staged balances with an advisor'],
  [ShieldCheck, 'ATOL protected', 'Book with confidence. We’re ATOL protected'],
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
          onClick={() => onAction('Sign in', 'Sign in to manage your booking, save favourite deals and invite your group to vote on holiday options.')}
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

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <div className="eyebrow"><Star fill="currentColor" size={15} /> GROUP HOLIDAYS, MADE EASY</div>
        <h1>Smart group holidays.<br /><span>More fun.</span> Less fuss.</h1>
        <p>Epic trips. Unbeatable prices. Made for mates, families<br />and every kind of group adventure.</p>
        <div className="assurances">
          {['Best group deals', 'Flexible planning', '24/7 support', 'ATOL protected'].map((assurance, index) => {
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

function SearchPanel({ activeTab, setActiveTab, search, setSearch, onSearch }) {
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
              placeholder="Search destinations, resort or hotel"
            />
          </p>
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
          <p>From <b>{formatPrice(deal)}</b> {deal.priceQualifier}</p>
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

function Dialog({ content, onClose }) {
  if (!content) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span>{content.kicker || 'PickyHoliday'}</span>
        <h2 id="modal-title">{content.title}</h2>
        <p>{content.body}</p>
        {content.deal && (
          <ul>
            <li><b>Supplier:</b> {content.deal.supplierName}</li>
            <li><b>Airlines:</b> {content.deal.airlineNames?.length ? content.deal.airlineNames.join(', ') : 'Quoted separately'}</li>
            <li><b>Destination:</b> {dealPlace(content.deal)}</li>
            <li><b>Hotel:</b> {content.deal.hotelName}</li>
            <li><b>Lead price:</b> {formatPrice(content.deal)} {content.deal.priceQualifier}</li>
            <li><b>Nights/date:</b> {content.deal.nights} nights · {content.deal.dateLabel}</li>
            <li><b>Group size:</b> {content.deal.groupSizeLabel}</li>
            <li><b>Board/bags:</b> {content.deal.boardBasis} · {content.deal.baggageLabel}</li>
            <li><b>Booking mode:</b> {content.deal.bookingMode}</li>
            <li><b>Protection:</b> {content.deal.protectionLabel}</li>
          </ul>
        )}
        <div className="modal-actions">
          {content.deal?.partnerUrl && <button onClick={() => window.open(content.deal.partnerUrl, '_blank', 'noopener,noreferrer')}>Continue to partner</button>}
          {content.deal && <button onClick={() => content.onEnquiry?.(content.deal)}>Ask for group quote</button>}
          <button onClick={onClose}>Shortlist this trip</button>
          <button onClick={() => { onClose(); scrollToId('search'); }}>Edit search</button>
        </div>
      </section>
    </div>
  );
}

function DealsSection({ dealsToShow, searchSummary, onReset, onRotateDeals, onViewDeal, isLoading, error }) {
  return (
    <section className="content block overlap" id="deals">
      <SectionTitle title="Popular group holiday deals" link="View all deals" onLink={onReset} />
      <p className="results-note">{searchSummary}</p>
      {isLoading && <div className="loading-state">Searching provider adapters in mock mode…</div>}
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
  const [searchSummary, setSearchSummary] = useState('Showing our most popular group holiday deals from the mock provider.');
  const [dealList, setDealList] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [getawayList, setGetawayList] = useState(getaways);
  const [guideList, setGuideList] = useState(guides);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const filteredDeals = useMemo(() => {
    const destination = search.destination.trim().toLowerCase();

    return dealList.filter((deal) => {
      const dealContent = `${deal.destination} ${deal.country} ${deal.hotelName} ${deal.supplierName} ${deal.tags.join(' ')}`.toLowerCase();
      return deal.tags.includes(activeTab) && (!destination || dealContent.includes(destination));
    });
  }, [activeTab, dealList, search.destination]);

  const openMessage = (title, body, kicker) => setModal({ title, body, kicker });
  const showNotice = (message) => setNotice(message);

  const runHolidaySearch = async (criteria, shouldScroll = true) => {
    setIsSearching(true);
    setSearchError('');
    try {
      const response = await searchHolidays(criteria);
      setDealList(response.results || []);
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

    showNotice(`Thanks! Deals will be sent to ${newsletterEmail}.`);
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
      body: `${selected.flightSummary}. ${selected.hotelSummary}. This foundation flow supports enquiries and partner redirects only; it does not create live bookings.`,
      kicker: selected.savingLabel,
      deal: selected,
      onEnquiry: async (deal) => {
        const response = await submitEnquiry({ ...deal, resultId: deal.id });
        setModal(null);
        showNotice(response.message || 'Mock enquiry sent. No booking was created.');
      },
    });
  };

  return (
    <>
      <Header onAction={openMessage} />
      <main>
        <Hero />
        <SearchPanel activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch} onSearch={handleSearch} />
        <DealsSection
          dealsToShow={filteredDeals}
          searchSummary={searchSummary}
          onReset={handleResetDeals}
          onRotateDeals={(direction) => setDealList((list) => rotateList(list, direction))}
          onViewDeal={handleViewDeal}
          isLoading={isSearching}
          error={searchError}
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
            <p>Big group? Bigger savings.<br />Exclusive group discounts on thousands of holidays.</p>
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
            <h2>Get group deals & travel inspiration<br />straight to your inbox</h2>
            <p>Be the first to hear about exclusive offers, big savings and new destinations.</p>
          </div>
          <label><Mail size={18} /><input value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="Enter your email address" /></label>
          <button>Sign me up <ChevronRight size={17} /></button>
        </form>
        <div className="content strip">
          <button onClick={() => openMessage('Trustpilot rating', 'PickyHoliday is rated 4.7 out of 5 by travellers in this demo experience.', 'Trustpilot')}><Star fill="currentColor" /> Trustpilot</button>
          <Stars small />
          <span>Rated 4.7/5</span>
          <span><LockKeyhole size={18} /> Secure enquiries</span>
          <span>No live booking in mock mode</span>
        </div>
      </main>
      <Footer onAction={openMessage} />
      {notice && <div className="toast" role="status">{notice}</div>}
      <Dialog content={modal} onClose={() => setModal(null)} />
    </>
  );
}

function Footer({ onAction }) {
  const cols = [
    ['Book', ['Holidays', 'Villas', 'Group hotel stays', 'Stag & Hen', 'Families']],
    ['Explore', ['Destinations', 'Inspiration', 'Travel guides', 'Group travel ideas', 'Deals']],
    ['Help', ['Help Centre', 'Manage booking', 'Payment options', 'FAQs']],
    ['About PickyHoliday', ['About us', 'Careers', 'Terms & Conditions', 'Privacy Policy']],
  ];

  return (
    <footer id="footer">
      <div className="foot content">
        <div className="brand">
          <Logo footer />
          <p>Group holidays made easy.</p>
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
          <p>Manage your trips, get alerts<br />and exclusive app deals.</p>
          <div>
            <button onClick={() => onAction('App Store', 'The iOS app link is ready for connection to the live store listing.')}> App Store</button>
            <button onClick={() => onAction('Google Play', 'The Android app link is ready for connection to the live store listing.')}>▶ Google Play</button>
          </div>
        </div>
      </div>
      <div className="copy content">
        <p>© 2025 PickyHoliday.co.uk. All rights reserved.</p>
        <span><ShieldCheck /> ATOL protected</span>
        <span><ShieldCheck /> Secure enquiries</span>
        <span><Clock3 /> 24/7 support</span>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
