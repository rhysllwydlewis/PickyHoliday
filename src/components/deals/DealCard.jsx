import React from 'react';
import { Heart } from 'lucide-react';
import { dealPlace, hasPricedAmount, img, priceCopy } from '../../app/appConstants.js';
import { Stars } from '../layout/Brand.jsx';

export function DealCard({ deal, onView, isShortlisted = false, onToggleShortlist }) {
  const handleView = () => onView(deal);

  return (
    <article className="deal-card">
      <div className="pic"><img src={img(deal.imageId || deal.image)} alt={dealPlace(deal)} /><strong>{deal.savingLabel}</strong></div>
      <div className="deal-body">
        <span>{dealPlace(deal)}</span>
        <h3>{deal.hotelName}</h3>
        <div className="rating"><Stars small />{deal.rating}</div>
        <p className="provider-chip">{deal.supplierName} · {deal.sourceBreakdown?.accommodationSource || deal.resultType}</p>
        {deal.provider === 'booking-demand' && <p className="provider-chip">Booking.com hotel source · cancellation/terms checked on partner site · no booking created by PickyHoliday</p>}
        <div className="price">
          <p>{hasPricedAmount(deal) ? 'From ' : ''}<b>{priceCopy(deal)}</b> {deal.priceQualifier}</p>
          <button onClick={handleView}>{deal.provider === 'partner-redirect' || deal.provider === 'booking-demand' || deal.priceQualifier === 'Check live price' ? 'Check live price' : 'View trip'}</button>
        </div>
        <button className={`shortlist-card-action ${isShortlisted ? 'added' : ''}`} onClick={() => onToggleShortlist?.(deal)} aria-pressed={isShortlisted}>
          <Heart size={15} fill={isShortlisted ? 'currentColor' : 'none'} /> {isShortlisted ? 'Added' : 'Shortlist'}
        </button>
      </div>
    </article>
  );
}
