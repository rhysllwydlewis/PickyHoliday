import React from 'react';
import {
  Heart,
  MapPin,
  Plane,
  CalendarDays,
  Users,
  ShieldCheck,
  BriefcaseBusiness,
  Utensils,
  BedDouble,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { hasPricedAmount, img, priceCopy } from '../../app/appConstants.js';
import { Stars } from '../layout/Brand.jsx';

const formatMoney = (value, currency = 'GBP') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const prefix = currency === 'GBP' ? '£' : `${currency} `;
  return `${prefix}${Math.round(amount).toLocaleString('en-GB')}`;
};

const sourceLabel = (deal = {}) => {
  const source = deal.sourceBreakdown || {};
  const parts = [deal.supplierName, source.accommodationSource, source.flightSource, deal.resultType]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
  return parts.slice(0, 3).join(' · ') || 'PickyHoliday composed result';
};

const destinationPlace = (deal = {}) => [deal.destination, deal.country].filter(Boolean).join(', ') || 'Destination to confirm';

const shouldCheckLivePrice = (deal = {}) =>
  ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider) ||
  deal.bookingMode === 'affiliate' ||
  Boolean(deal.partnerUrl) ||
  deal.priceQualifier === 'Check live price' ||
  !hasPricedAmount(deal);

export function SearchResultCard({ deal, index = 0, onView, isShortlisted = false, onToggleShortlist, onQuote }) {
  const title = deal.hotelName || 'Holiday idea';
  const place = destinationPlace(deal);
  const imageSrc = deal.image || deal.imageId ? img(deal.imageId || deal.image) : '';
  const fallbackSeed = [deal.destination, deal.country, deal.hotelName, deal.provider, index].filter(Boolean).join('-');
  const fallbackTone = `tone-${Math.abs(fallbackSeed.split('').reduce((total, char) => total + char.charCodeAt(0), index)) % 4}`;
  const altText = `${title} holiday idea in ${place}`;
  const ctaLabel = shouldCheckLivePrice(deal) ? 'Check live price' : 'View trip';
  const hasPrice = hasPricedAmount(deal);
  const totalEstimate = formatMoney(deal.totalEstimate, deal.currency);
  const perPersonEstimate = formatMoney(deal.perPersonEstimate || deal.priceFrom, deal.currency);
  const scoreReasons = Array.isArray(deal.scoreReasons) ? deal.scoreReasons.slice(0, 3) : [];
  const metaItems = [
    deal.dateLabel && { icon: CalendarDays, label: deal.dateLabel },
    deal.nights && { icon: CalendarDays, label: `${deal.nights} night${Number(deal.nights) === 1 ? '' : 's'}` },
    deal.departureAirport && { icon: Plane, label: `From ${deal.departureAirport}` },
    deal.flightSummary && { icon: Plane, label: deal.flightSummary },
    deal.boardBasis && { icon: Utensils, label: deal.boardBasis },
    deal.baggageLabel && { icon: BriefcaseBusiness, label: deal.baggageLabel },
    deal.groupSizeLabel && { icon: Users, label: deal.groupSizeLabel },
    (deal.roomMix || deal.rooms) && { icon: BedDouble, label: deal.roomMix || `${deal.rooms} room${Number(deal.rooms) === 1 ? '' : 's'}` },
  ]
    .filter(Boolean)
    .slice(0, 8);

  return (
    <article className="search-result-card">
      <div className={`search-result-card-media ${fallbackTone}${imageSrc ? '' : ' search-result-card-media--fallback'}`}>
        {imageSrc ? (
          <img src={imageSrc} alt={altText} loading="lazy" />
        ) : (
          <div aria-hidden="true" className="search-result-image-fallback">
            <Sparkles size={28} />
            <span>{deal.destination || deal.country || 'Holiday idea'}</span>
          </div>
        )}
        {deal.dealReasonLabel && <span className="search-result-media-badge">{deal.dealReasonLabel}</span>}
        <span className="search-result-gallery-count" aria-label="Image preview">
          Preview
        </span>
        <button
          type="button"
          className={`search-result-heart${isShortlisted ? ' is-saved' : ''}`}
          onClick={() => onToggleShortlist?.(deal)}
          aria-label={isShortlisted ? `Remove ${title} from saved enquiries` : `Save ${title} to enquiry shortlist`}
          aria-pressed={isShortlisted}
        >
          <Heart size={18} fill={isShortlisted ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <div className="search-result-card-body">
        <div className="search-result-title-row">
          <div>
            <p className="search-result-place">
              <MapPin size={14} aria-hidden="true" />
              {place}
            </p>
            <h2>{title}</h2>
          </div>
          <div className="search-result-rating" aria-label={deal.rating ? `${deal.rating} star rating` : 'Rating to confirm'}>
            <Stars small />
            <span>{deal.rating || 'Rating to confirm'}</span>
          </div>
        </div>
        <p className="search-result-source">{sourceLabel(deal)}</p>
        {deal.hotelSummary && <p className="search-result-summary">{deal.hotelSummary}</p>}

        <div className="search-result-meta">
          {metaItems.map(({ icon: Icon, label }) => (
            <span key={label}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

        {scoreReasons.length > 0 && (
          <div className="search-result-badges" aria-label="Why this idea matched">
            {scoreReasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        )}

        <p className="search-result-protection">
          <ShieldCheck size={16} aria-hidden="true" />
          {deal.protectionLabel || 'Partner terms confirmed on partner site'}
        </p>
      </div>

      <div className="search-result-card-price">
        <span className="search-result-price-kicker">{hasPrice ? 'From' : 'Live check'}</span>
        <p className="search-result-price">
          {hasPrice ? (
            <>
              {priceCopy(deal)} <small>pp</small>
            </>
          ) : (
            'Check live price'
          )}
        </p>
        {deal.priceQualifier && <p className="search-result-price-qualifier">{deal.priceQualifier}</p>}
        {totalEstimate && <p className="search-result-total">Est. total {totalEstimate}</p>}
        {!totalEstimate && perPersonEstimate && deal.perPersonEstimate && (
          <p className="search-result-total">Indicative pp {perPersonEstimate}</p>
        )}
        <button type="button" className="search-result-primary" onClick={() => onView(deal)}>
          {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button type="button" className="search-result-secondary" onClick={() => onQuote?.([deal])}>
          Ask for group quote
        </button>
        <button
          type="button"
          className={`search-result-save-inline${isShortlisted ? ' is-saved' : ''}`}
          onClick={() => onToggleShortlist?.(deal)}
          aria-pressed={isShortlisted}
        >
          <Heart size={15} fill={isShortlisted ? 'currentColor' : 'none'} aria-hidden="true" />{' '}
          {isShortlisted ? 'Saved enquiry' : 'Save enquiry'}
        </button>
      </div>
    </article>
  );
}
