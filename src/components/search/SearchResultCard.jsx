import React from 'react';
import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  CalendarDays,
  Heart,
  MapPin,
  Plane,
  Sparkles,
  Star,
  Utensils,
  Users,
} from 'lucide-react';
import { hasPricedAmount, img, priceCopy } from '../../app/appConstants.js';
import './SearchResultCard.css';
import './SearchResultCardPolish.css';

const formatMoney = (value, currency = 'GBP') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const prefix = currency === 'GBP' ? '£' : `${currency} `;
  return `${prefix}${Math.round(amount).toLocaleString('en-GB')}`;
};

const unique = (items = []) => [...new Set(items.filter(Boolean).map((item) => item.toString().trim()).filter(Boolean))];

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

const getBadgeLabels = (deal = {}) => {
  const scoreReasons = Array.isArray(deal.scoreReasons) ? deal.scoreReasons : [];
  return unique([
    deal.savingLabel,
    deal.dealReasonLabel,
    deal.promoted || deal.isPromoted ? 'Advisor pick' : '',
    scoreReasons.some((reason) => /group/i.test(reason)) ? 'Group friendly' : '',
    Boolean(deal.partnerUrl) || deal.bookingMode === 'affiliate' ? 'Live price check' : '',
  ]).slice(0, 2);
};

const getPriceBadges = (deal = {}, hasPrice, totalEstimate) =>
  unique([
    hasPrice ? 'Guide price' : 'Partner check',
    totalEstimate ? 'Est. total shown' : '',
    deal.savingLabel && !getBadgeLabels(deal).includes(deal.savingLabel) ? deal.savingLabel : '',
    deal.bookingMode === 'manual-quote' ? 'Quote support' : '',
  ]).slice(0, 2);

const getImageCountLabel = (deal = {}) => {
  const count = Number(deal.imageCount || deal.galleryCount || deal.photoCount || deal.photosCount || 0);
  if (Number.isFinite(count) && count > 1) return `1/${Math.round(count)}`;
  return '1/6';
};

const getRatingStars = (deal = {}) => {
  const rating = Number(deal.rating || 0);
  if (!Number.isFinite(rating) || rating <= 0) return 0;
  return Math.max(1, Math.min(5, Math.round(rating)));
};

const getReviewSignal = (deal = {}) => {
  const rating = Number(deal.rating || 0);
  const score = Number(deal.score || 0);
  if (rating > 0 && score > 0) return `${rating.toFixed(rating % 1 ? 1 : 0)} rating · ${score}% match`;
  if (rating > 0) return `${rating.toFixed(rating % 1 ? 1 : 0)} rating`;
  if (score > 0) return `${score}% match`;
  return 'Advisor match to confirm';
};

const getDetailRows = (deal = {}) =>
  [
    deal.dateLabel && { icon: CalendarDays, label: deal.dateLabel, emphasis: true },
    deal.nights && { icon: CalendarDays, label: `${deal.nights} night${Number(deal.nights) === 1 ? '' : 's'}` },
    deal.boardBasis && { icon: Utensils, label: deal.boardBasis, emphasis: true },
    deal.departureAirport && { icon: Plane, label: `From ${deal.departureAirport}` },
    deal.flightSummary && { icon: Plane, label: deal.flightSummary },
    deal.groupSizeLabel && { icon: Users, label: deal.groupSizeLabel },
    (deal.roomMix || deal.rooms) && { icon: BedDouble, label: deal.roomMix || `${deal.rooms} room${Number(deal.rooms) === 1 ? '' : 's'}` },
    deal.baggageLabel && { icon: BriefcaseBusiness, label: deal.baggageLabel },
  ]
    .filter(Boolean)
    .slice(0, 3);

export function SearchResultCard({ deal, index = 0, onView, isShortlisted = false, onToggleShortlist }) {
  const title = deal.hotelName || 'Holiday idea';
  const place = destinationPlace(deal);
  const imageSrc = deal.image || deal.imageId ? img(deal.imageId || deal.image) : '';
  const fallbackSeed = [deal.destination, deal.country, deal.hotelName, deal.provider, index].filter(Boolean).join('-');
  const fallbackTone = `tone-${Math.abs(fallbackSeed.split('').reduce((total, char) => total + char.charCodeAt(0), index)) % 4}`;
  const altText = `${title} in ${place}`;
  const ctaLabel = shouldCheckLivePrice(deal) ? 'Check live price' : 'View trip';
  const hasPrice = hasPricedAmount(deal);
  const totalEstimate = formatMoney(deal.totalEstimate, deal.currency);
  const perPersonEstimate = formatMoney(deal.perPersonEstimate || deal.priceFrom, deal.currency);
  const detailRows = getDetailRows(deal);
  const badgeLabels = getBadgeLabels(deal);
  const priceBadges = getPriceBadges(deal, hasPrice, totalEstimate);
  const ratingStars = getRatingStars(deal);

  return (
    <article className="search-result-card search-result-card--retail">
      <div className={`search-result-card-media ${fallbackTone}${imageSrc ? '' : ' search-result-card-media--fallback'}`}>
        {imageSrc ? (
          <img src={imageSrc} alt={altText} loading="lazy" />
        ) : (
          <div aria-hidden="true" className="search-result-image-fallback">
            <Sparkles size={30} />
            <span>{deal.destination || deal.country || 'Holiday idea'}</span>
          </div>
        )}

        {badgeLabels.length > 0 && (
          <div className="search-result-card-badges" aria-label="Holiday idea highlights">
            {badgeLabels.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        )}

        <button
          type="button"
          className={`search-result-save search-result-heart${isShortlisted ? ' is-saved' : ''}`}
          onClick={() => onToggleShortlist?.(deal)}
          aria-label={isShortlisted ? `Remove ${title} from saved enquiries` : `Save ${title} to enquiry shortlist`}
          aria-pressed={isShortlisted}
        >
          <Heart size={21} fill={isShortlisted ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        <span className="search-result-image-count search-result-gallery-count" aria-label="Image preview count">
          {getImageCountLabel(deal)}
        </span>
      </div>

      <div className="search-result-card-main search-result-card-body">
        <div className="search-result-title-row">
          <div>
            <h2>{title}</h2>
            <p className="search-result-location search-result-place">
              <MapPin size={15} aria-hidden="true" />
              {place}
            </p>
          </div>
          <div className="search-result-stars" aria-label={ratingStars ? `${ratingStars} star rating` : 'Rating to confirm'}>
            {ratingStars ? (
              Array.from({ length: 5 }).map((_, starIndex) => (
                <Star
                  key={starIndex}
                  size={14}
                  fill={starIndex < ratingStars ? 'currentColor' : 'none'}
                  className={starIndex < ratingStars ? 'is-filled' : 'is-empty'}
                  aria-hidden="true"
                />
              ))
            ) : (
              <span>Rating to confirm</span>
            )}
          </div>
        </div>

        <div className="search-result-review-row">
          <span className="search-result-review-dot" aria-hidden="true" />
          <span>{getReviewSignal(deal)}</span>
          <b>{sourceLabel(deal)}</b>
        </div>

        <div className="search-result-detail-grid search-result-meta">
          {detailRows.map(({ icon: Icon, label, emphasis }) => (
            <span className={emphasis ? 'is-emphasis' : ''} key={label}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

      </div>

      <aside className="search-result-price-panel search-result-card-price" aria-label={`${title} price and actions`}>
        {priceBadges.length > 0 && (
          <div className="search-result-price-badges">
            {priceBadges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        )}

        <div className="search-result-price-wrap">
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
          {!totalEstimate && perPersonEstimate && deal.perPersonEstimate && <p className="search-result-total">Indicative pp {perPersonEstimate}</p>}
        </div>

        <button type="button" className="search-result-primary" onClick={() => onView(deal)}>
          {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </aside>
    </article>
  );
}
