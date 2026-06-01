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

const imageUrls = {
  ibiza: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&h=560&q=80',
  costa: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&h=560&q=80',
  prague: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=900&h=560&q=80',
  majorca: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&h=560&q=80',
  barcelona: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&h=560&q=80',
  albufeira: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&h=560&q=80',
  beach: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=900&h=560&q=80',
  city: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&h=560&q=80',
  party: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&h=560&q=80',
  family: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&h=560&q=80',
  villa: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&h=560&q=80',
  stag: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=900&h=560&q=80',
  'guide-city': 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&h=320&q=80',
  'guide-beach': 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=600&h=320&q=80',
  'guide-plan': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&h=320&q=80',
  'guide-hen': 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&h=320&q=80',
  'guide-food': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&h=320&q=80',
  'avatar-jess': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
  'avatar-ryan': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
  'avatar-mia': 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&h=120&q=80',
  'avatar-laura': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80',
  'avatar-tom': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80',
};

const img = (id) => imageUrls[id];

const deals = [
  {
    saving: 'SAVE 20%',
    image: 'ibiza',
    place: 'Ibiza, Spain',
    hotel: 'Ibiza Rocks Hotel',
    rating: '4.6 (128 reviews)',
    price: '£279',
    tags: ['Holidays', 'Group hotel stays', 'Stag & Hen', 'Party holidays', 'Ibiza'],
  },
  {
    saving: 'SAVE 15%',
    image: 'costa',
    place: 'Costa del Sol, Spain',
    hotel: 'H10 Costa del Sol',
    rating: '4.5 (96 reviews)',
    price: '£249',
    tags: ['Holidays', 'Families', 'Beach breaks', 'Tenerife'],
  },
  {
    saving: 'SAVE £150',
    image: 'prague',
    place: 'Prague, Czech Republic',
    hotel: 'Leonardo Hotel Prague',
    rating: '4.7 (210 reviews)',
    price: '£159',
    tags: ['Holidays', 'Group hotel stays', 'City breaks'],
  },
  {
    saving: 'SAVE 15%',
    image: 'majorca',
    place: 'Majorca, Spain',
    hotel: 'Marbella Beach Club',
    rating: '4.4 (101 reviews)',
    price: '£279',
    tags: ['Holidays', 'Families', 'Beach breaks'],
  },
  {
    saving: 'SAVE 20%',
    image: 'barcelona',
    place: 'Barcelona, Spain',
    hotel: 'Hotel Catalonia Barcelona Plaza',
    rating: '4.6 (88 reviews)',
    price: '£189',
    tags: ['Holidays', 'Group hotel stays', 'City breaks', 'Barcelona', 'Dubai'],
  },
  {
    saving: 'SAVE 25%',
    image: 'albufeira',
    place: 'Albufeira, Portugal',
    hotel: 'AluaSoul Sun',
    rating: '4.3 (44 reviews)',
    price: '£199',
    tags: ['Holidays', 'Stag & Hen', 'Villas', 'Party holidays', 'Ayia Napa', 'Zante', 'Benidorm'],
  },
];

const getaways = [
  ['Beach breaks', 'Sun, sea & good vibes', 'beach'],
  ['City breaks', 'Explore iconic cities', 'city'],
  ['Party holidays', 'Dance, DJs & daytime fun', 'party'],
  ['Family getaways', 'Adventures for all ages', 'family'],
  ['Villas for groups', 'Your space, your rules', 'villa'],
  ['Stag & hen trips', 'Celebrate in style', 'stag'],
];

const benefits = [
  [BriefcaseBusiness, 'Group experts', 'Years of experience in group travel'],
  [HandCoins, 'Low deposits', 'Secure your trip from just £49pp'],
  [WalletCards, 'Flexible payments', 'Spread the cost with interest free options'],
  [ShieldCheck, 'ATOL protected', 'Book with confidence. We’re ATOL protected'],
  [Clock3, '24/7 support', 'We’re here whenever you need us'],
  [LockKeyhole, 'Safe payments', 'Secure transactions every step of the way'],
];

const guides = [
  ['guide-city', '6 epic cities perfect for a mates trip'],
  ['guide-beach', 'Best party beaches in Europe for groups'],
  ['guide-plan', 'How to plan the ultimate group holiday'],
  ['guide-hen', 'Top 10 hen do ideas you’ll all love'],
  ['guide-food', 'Food & nightlife hotspots for large groups'],
];

const reviews = [
  ['Jess, Manchester', 'The whole process was so easy. Whole group loved it!', 'avatar-jess'],
  ['Ryan, Liverpool', 'Top service, great options and amazing value!', 'avatar-ryan'],
  ['Mia, Bristol', 'You all think of everything - just perfect!', 'avatar-mia'],
  ['Laura, London', 'Service is five star. Loads of deals and help!', 'avatar-laura'],
  ['Tom, Leeds', 'Wouldn’t use anyone else to plan our trips!', 'avatar-tom'],
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
          {['Best group deals', 'Flexible payments', '24/7 support', 'ATOL protected'].map((assurance, index) => {
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
      <div className="pic"><img src={img(deal.image)} alt={deal.place} /><strong>{deal.saving}</strong></div>
      <div className="deal-body">
        <span>{deal.place}</span>
        <h3>{deal.hotel}</h3>
        <div className="rating"><Stars small />{deal.rating}</div>
        <div className="price">
          <p>From <b>{deal.price}</b> pp</p>
          <button onClick={() => onView(deal)}>View deal</button>
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
            <li><b>Destination:</b> {content.deal.place}</li>
            <li><b>Hotel:</b> {content.deal.hotel}</li>
            <li><b>Lead price:</b> {content.deal.price} pp</li>
          </ul>
        )}
        <div className="modal-actions">
          <button onClick={onClose}>Done</button>
          <button onClick={() => { onClose(); scrollToId('search'); }}>Edit search</button>
        </div>
      </section>
    </div>
  );
}

function DealsSection({ dealsToShow, searchSummary, onReset, onRotateDeals, onViewDeal }) {
  return (
    <section className="content block overlap" id="deals">
      <SectionTitle title="Popular group holiday deals" link="View all deals" onLink={onReset} />
      <p className="results-note">{searchSummary}</p>
      <button className="arrow left" onClick={() => onRotateDeals('prev')} aria-label="Previous deal"><ChevronLeft /></button>
      <div className="deals grid-six">
        {dealsToShow.length ? (
          dealsToShow.map((deal) => <DealCard key={deal.hotel} deal={deal} onView={onViewDeal} />)
        ) : (
          <div className="empty-state">No matches yet. Try another destination or holiday type.</div>
        )}
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
  const [searchSummary, setSearchSummary] = useState('Showing our most popular group holiday deals.');
  const [dealList, setDealList] = useState(deals);
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
      const dealContent = `${deal.place} ${deal.hotel} ${deal.tags.join(' ')}`.toLowerCase();
      return deal.tags.includes(activeTab) && (!destination || dealContent.includes(destination));
    });
  }, [activeTab, dealList, search.destination]);

  const openMessage = (title, body, kicker) => setModal({ title, body, kicker });
  const showNotice = (message) => setNotice(message);

  const handleSearch = () => {
    setSearchSummary(`Showing ${activeTab.toLowerCase()} from ${search.origin} for ${search.date.toLowerCase()} (${search.groupSize}).`);
    scrollToId('deals');
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
    setSearchSummary('Showing all available group holiday deals.');
  };

  const handleSelectGetaway = (title) => {
    const config = getawaySearchConfig[title] || { tab: 'Holidays', destination: title };
    setActiveTab(config.tab);
    setSearch((currentSearch) => ({ ...currentSearch, destination: config.destination }));
    setSearchSummary(`Showing ${config.destination.toLowerCase()} ideas for groups.`);
    scrollToId('deals');
  };

  const handleViewDeal = (selected) => {
    setModal({
      title: 'Deal added to your shortlist',
      body: 'We have saved this option so your group can compare prices, payment plans and room choices before booking.',
      kicker: selected.saving,
      deal: selected,
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
          <span><LockKeyhole size={18} /> Secure payments</span>
          <span>100% encrypted</span>
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
        <span><ShieldCheck /> Secure booking</span>
        <span><Clock3 /> 24/7 support</span>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
