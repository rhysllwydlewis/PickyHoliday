import React from 'react';
import { ChevronRight, Heart, Hotel, Plane } from 'lucide-react';
import { hasPricedAmount, priceCopy } from '../../app/appConstants.js';

function SectionTitle({ title, link, onLink }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {link && <button onClick={onLink}>{link} <ChevronRight size={16} /></button>}
    </div>
  );
}

export function SpotlightedDealsSection({ deals, onViewDeal, isShortlisted, onToggleShortlist, onQuote, isLoading }) {
  return (
    <section className="content block spotlighted-deals" id="spotlighted-deals">
      <SectionTitle title="Spotlighted deals" link="Ask for group quote" onLink={() => onQuote?.(deals?.[0] ? [deals[0]] : [])} />
      <p className="spotlight-note">Spotlighted deals are generated from available provider, partner and promoted deal data. Prices and availability are not held by PickyHoliday.</p>
      <div className="spotlight-grid">
        {isLoading && <div className="loading-state">Loading spotlighted holiday ideas…</div>}
        {!isLoading && (!deals || deals.length === 0) && <div className="empty-state">No spotlighted ideas are available yet. Try a search or ask for a group quote.</div>}
        {(deals || []).slice(0, 4).map((deal) => (
          <article className="spotlight-card" key={deal.id || deal.resultId}>
            <div className="spotlight-card-top">
              <span className="reason-badge">{deal.dealReasonLabel || (deal.partnerUrl ? 'Live price check' : 'Best group pick')}</span>
              <b>{deal.destination}{deal.country ? `, ${deal.country}` : ''}</b>
              <h3>{deal.hotelName}</h3>
            </div>
            <p><Plane size={15} /> {deal.flightSummary || 'Flight options to be checked'}</p>
            <p><Hotel size={15} /> {deal.hotelSummary || 'Hotel details to confirm'}</p>
            <div className="spotlight-meta"><span>{deal.supplierName || deal.provider}</span><span>{deal.dateLabel || `${deal.nights || 7} nights`}</span></div>
            <div className="spotlight-price"><strong>{hasPricedAmount(deal) ? `From ${priceCopy(deal)}` : 'Check live price'}</strong><small>{deal.priceQualifier}</small></div>
            <div className="spotlight-actions">
              <button onClick={() => onViewDeal(deal)}>{deal.partnerUrl ? 'Check live price' : 'View deal'}</button>
              <button className="ghost-action" onClick={() => onQuote?.([deal])}>Ask for group quote</button>
              <button className={`icon-action ${isShortlisted?.(deal) ? 'added' : ''}`} onClick={() => onToggleShortlist?.(deal)} aria-pressed={isShortlisted?.(deal)}><Heart size={15} fill={isShortlisted?.(deal) ? 'currentColor' : 'none'} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
