import React from 'react';
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
  ['SAVE 20%', 'ibiza', 'Ibiza, Spain', 'Ibiza Rocks Hotel', '4.6 (128 reviews)', '£279'],
  ['SAVE 15%', 'costa', 'Costa del Sol, Spain', 'H10 Costa del Sol', '4.5 (96 reviews)', '£249'],
  ['SAVE £150', 'prague', 'Prague, Czech Republic', 'Leonardo Hotel Prague', '4.7 (210 reviews)', '£159'],
  ['SAVE 15%', 'majorca', 'Majorca, Spain', 'Marbella Beach Club', '4.4 (101 reviews)', '£279'],
  ['SAVE 20%', 'barcelona', 'Barcelona, Spain', 'Hotel Catalonia Barcelona Plaza', '4.6 (88 reviews)', '£189'],
  ['SAVE 25%', 'albufeira', 'Albufeira, Portugal', 'AluaSoul Sun', '4.3 (44 reviews)', '£199'],
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

function Logo({footer=false}) {
  return <div className={`logo ${footer ? 'logo-footer' : ''}`}><span>Picky</span><b>Holiday</b><small>.co.uk</small></div>;
}

function Stars({small=false}) {
  return <div className={small ? 'stars small' : 'stars'}>{Array.from({length:5}).map((_,i)=><Star key={i} fill="currentColor" />)}</div>;
}

function Header() {
  const nav = ['Holidays', 'Destinations', 'Group Types', 'Deals', 'Inspiration', 'Support'];
  return <header className="topbar">
    <div className="navwrap">
      <Logo />
      <nav>{nav.map((n,i)=><a key={n}>{n}{i!==3 && <ChevronDown size={14}/>}</a>)}</nav>
      <button className="signin"><Users size={19}/> Sign in</button>
      <button className="start"><BriefcaseBusiness size={17}/> Start planning</button>
      <button className="mobile"><Menu /></button>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero">
    <div className="hero-bg" />
    <div className="hero-content">
      <div className="eyebrow"><Star fill="currentColor" size={15}/> GROUP HOLIDAYS, MADE EASY</div>
      <h1>Smart group holidays.<br/><span>More fun.</span> Less fuss.</h1>
      <p>Epic trips. Unbeatable prices. Made for mates, families<br/>and every kind of group adventure.</p>
      <div className="assurances">
        {['Best group deals','Flexible payments','24/7 support','ATOL protected'].map((a,i)=><span key={a}>{[CircleDollarSign,WalletCards,Clock3,BadgeCheck].map((I,j)=>j===i?<I key={j} size={17}/>:null)} {a}</span>)}
      </div>
    </div>
    <div className="trust-float"><b>Excellent</b><Stars small/><span>4.7 out of 5</span><small>★ Trustpilot</small></div>
  </section>;
}

function SearchPanel() {
  const tabs = [['Holidays',Plane,true],['Villas',Hotel],['Group hotel stays',Users,'NEW'],['Stag & Hen',BriefcaseBusiness],['Families',HeartHandshake]];
  return <section className="search-panel">
    <div className="tabs">{tabs.map(([t,I,flag])=><button key={t} className={flag===true?'active':''}><I size={16}/>{t}{flag==='NEW'&&<em>NEW</em>}</button>)}</div>
    <div className="fields">
      <div className="field big"><label>Where to?</label><p><MapPin size={18}/>Search destinations, resort or hotel</p></div>
      <div className="field"><label>From</label><p>London (All Airports)<Plane size={17}/></p></div>
      <div className="field"><label>When</label><p>Fri 11 Jul – 7+ nights<CalendarDays size={17}/></p></div>
      <div className="field"><label>Group size</label><p>8 people, 2+ rooms<Users size={17}/></p></div>
      <button className="searchbtn">Search deals <ChevronRight size={20}/></button>
    </div>
    <div className="popular"><span>Popular:</span>{['Ibiza','Tenerife','Barcelona','Dubai','Ayia Napa','Zante','Benidorm'].map(x=><a key={x}>{x}</a>)}</div>
  </section>;
}

function DealCard({d}) {
  return <article className="deal-card"><div className="pic"><img src={img(d[1])}/><strong>{d[0]}</strong></div><div className="deal-body"><span>{d[2]}</span><h3>{d[3]}</h3><div className="rating"><Stars small/>{d[4]}</div><div className="price"><p>From <b>{d[5]}</b> pp</p><button>View deal</button></div></div></article>;
}

function SectionTitle({title,link}) {return <div className="section-title"><h2>{title}</h2>{link&&<a>{link} <ChevronRight size={16}/></a>}</div>}

function App() {
  return <>
    <Header />
    <main>
      <Hero />
      <SearchPanel />
      <section className="content block overlap"><SectionTitle title="Popular group holiday deals" link="View all deals"/><button className="arrow left"><ChevronLeft/></button><div className="deals grid-six">{deals.map(d=><DealCard key={d[3]} d={d}/>)}</div><button className="arrow right"><ChevronRight/></button></section>
      <section className="content block"><SectionTitle title="Find your perfect group getaway"/><div className="getaways grid-six">{getaways.map(g=><div className="getaway" key={g[0]}><img src={img(g[2])}/><div><h3>{g[0]}</h3><p>{g[1]}</p></div></div>)}</div><button className="arrow right mid"><ChevronRight/></button></section>
      <section className="content block"><SectionTitle title="Why book with PickyHoliday?"/><div className="benefits">{benefits.map(([I,t,p])=><div className="benefit" key={t}><I/><div><h3>{t}</h3><p>{p}</p></div></div>)}</div></section>
      <section className="content promo"><div><span>BETTER TOGETHER</span><h2>Save more when<br/>you go <b>together</b></h2><p>Big group? Bigger savings.<br/>Exclusive group discounts on thousands of holidays.</p><button>Explore group deals <ChevronRight size={18}/></button></div><div className="promo-price">Group deals<br/>from <strong>£199</strong> pp<Users/></div></section>
      <section className="content block"><SectionTitle title="Travel inspiration for groups" link="View all guides"/><div className="guides">{guides.map(g=><article key={g[1]}><img src={img(g[0],600,320)}/><h3>{g[1]}</h3></article>)}</div><button className="arrow left low"><ChevronLeft/></button><button className="arrow right low"><ChevronRight/></button></section>
      <section className="content block"><div className="reviews-head"><SectionTitle title="What travellers say" link="View all reviews"/><div className="trust-line"><b>Excellent</b><Stars small/><span>4.7 out of 5 based on 2,842 reviews</span></div></div><div className="reviews">{reviews.map(r=><article key={r[0]}><Stars small/><p>{r[1]}</p><div><img src={img(r[2],120,120)}/><b>{r[0]}</b></div></article>)}</div></section>
      <section className="content newsletter"><div className="mailicon"><Mail/></div><div><h2>Get group deals & travel inspiration<br/>straight to your inbox</h2><p>Be the first to hear about exclusive offers, big savings and new destinations.</p></div><label><Mail size={18}/><input placeholder="Enter your email address"/></label><button>Sign me up <ChevronRight size={17}/></button></section>
      <div className="content strip"><span><Star fill="currentColor"/> Trustpilot</span><Stars small/><span>Rated 4.7/5</span><span><LockKeyhole size={18}/> Secure payments</span><span>100% encrypted</span></div>
    </main>
    <Footer />
  </>;
}

function Footer() {
  const cols = [
    ['Book',['Holidays','Villas','Group hotel stays','Stag & Hen','Families']],
    ['Explore',['Destinations','Inspiration','Travel guides','Group travel ideas','Deals']],
    ['Help',['Help Centre','Manage booking','Payment options','FAQs']],
    ['About PickyHoliday',['About us','Careers','Terms & Conditions','Privacy Policy']],
  ];
  return <footer><div className="foot content"><div className="brand"><Logo footer/><p>Group holidays made easy.</p><span>Follow us</span><div className="social"><i>f</i><i>◎</i><ShipWheel/><i>▶</i></div></div>{cols.map(c=><div className="fcol" key={c[0]}><h3>{c[0]}</h3>{c[1].map(x=><a key={x}>{x}</a>)}</div>)}<div className="apps"><h3>Download the app</h3><p>Manage your trips, get alerts<br/>and exclusive app deals.</p><div><button> App Store</button><button>▶ Google Play</button></div></div></div><div className="copy content"><p>© 2025 PickyHoliday.co.uk. All rights reserved.</p><span><ShieldCheck/> ATOL protected</span><span><ShieldCheck/> Secure booking</span><span><Clock3/> 24/7 support</span></div></footer>;
}

createRoot(document.getElementById('root')).render(<App />);
