import React from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, LockKeyhole, Star, Users, WalletCards } from 'lucide-react';
import { guideWidgetCopy } from '../data/guideWidgets.js';
import { reviews } from '../data/mockDeals.js';
import { contentPathForSlug } from '../services/seo/seoMeta.js';
import { img } from './appConstants.js';
import { Stars } from '../components/layout/Brand.jsx';
import { DealCard } from '../components/deals/DealCard.jsx';
import { ProviderDiagnostics } from '../components/provider/ProviderDiagnostics.jsx';

const footerSearchUrl = ({ intent = 'Holidays', destination = '' } = {}) => `/?${new URLSearchParams({ intent, ...(destination ? { destination } : {}) }).toString()}#search`;

export function Hero({ config }) {
  const hero = config?.hero || {};
  const titleParts = (hero.title || 'Smart group holidays. More fun. Less fuss.').split('. ');
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <div className="eyebrow"><Star fill="currentColor" size={15} /> {hero.eyebrow || 'GROUP HOLIDAYS, MADE EASY'}</div>
        <h1>{titleParts[0] || 'Smart group holidays.'}<br /><span>{titleParts[1] || 'More fun.'}</span> {titleParts.slice(2).join('. ') || 'Less fuss.'}</h1>
        <p>{hero.subtitle || 'Compare inspiration, partner redirects and saved enquiries for mates, families and every kind of group adventure.'}</p>
        <ul className="assurances" aria-label="Planning reassurance" role="list">
          {(hero.assuranceChips || ['Best group ideas', 'Saved enquiries', 'Advisor review', 'Enquiry only']).map((assurance, index) => {
            const Icon = [CircleDollarSign, WalletCards, Clock3, BadgeCheck][index];
            return <li key={assurance}><Icon size={17} aria-hidden="true" /> {assurance}</li>;
          })}
        </ul>
      </div>
      <div className="trust-float"><b>Excellent</b><Stars small /><span>4.7 out of 5</span><small>★ Trustpilot</small></div>
    </section>
  );
}


export function SectionTitle({ title, link, onLink }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {link && <button onClick={onLink}>{link} <ChevronRight size={16} /></button>}
    </div>
  );
}


export function DealsSection({ dealsToShow, searchSummary, onReset, onRotateDeals, onViewDeal, isShortlisted, onToggleShortlist, isLoading, error, diagnostics, onRefreshDiagnostics }) {
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
          dealsToShow.map((deal) => <DealCard key={deal.id} deal={deal} onView={onViewDeal} isShortlisted={isShortlisted?.(deal)} onToggleShortlist={onToggleShortlist} />)
        ) : !isLoading ? (
          <div className="empty-state">No live partner results found yet. Try another destination or send a group quote enquiry.</div>
        ) : null}
      </div>
      <button className="arrow right" onClick={() => onRotateDeals('next')} aria-label="Next deal"><ChevronRight /></button>
    </section>
  );
}

export function GetawaysSection({ items, onSelectGetaway, onRotate }) {
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

function guideWidgetFor(title) {
  const content = guideWidgetCopy[title] || {
    kicker: 'Guide preview',
    title,
    body: `Open planning help for ${title.toLowerCase()} and use it to choose a safer enquiry-first group holiday next step.`,
    bullets: ['Preview the topic before searching.', 'Use the search action for matching ideas.', 'Enquiries stay saved until you choose a next step.'],
    search: { intent: 'Holidays' },
    searchActionLabel: 'Search matching trips',
  };
  const actions = [];
  if (content.guideSlug) {
    actions.push({ label: content.guideActionLabel || 'Open matching guide', onClick: () => window.location.assign(contentPathForSlug(content.guideSlug)) });
  }
  if (content.search) {
    actions.push({ label: content.searchActionLabel, onClick: () => window.location.assign(footerSearchUrl(content.search)) });
  }
  return { ...content, actions };
}

export function GuidesSection({ items, onAction, onRotate }) {
  return (
    <section className="content block" id="guides">
      <SectionTitle
        title="Travel inspiration for groups"
        link="View all guides"
        onLink={() => onAction({
          kicker: 'Guide hub',
          title: 'Travel inspiration for groups',
          body: 'Choose the guide type that matches the group decision you need to make: destination shortlist, celebration planning, family trips or enquiry next steps.',
          bullets: ['City and beach guides help narrow destinations.', 'Planning guides explain enquiry-first quote requests.', 'Each guide action opens a matching public content page or search.'],
          actions: [
            { label: 'Open destination guide', onClick: () => window.location.assign('/guides/best-group-holiday-destinations') },
            { label: 'Open quote process guide', onClick: () => window.location.assign('/guides/how-group-holiday-enquiries-work') },
          ],
        })}
      />
      <div className="guides">
        {items.map(([image, title]) => (
          <button key={title} onClick={() => onAction(guideWidgetFor(title))}>
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

export function ReviewsSection({ onAction }) {
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

