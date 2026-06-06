import React from 'react';
import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  CalendarDays,
  Heart,
  Info,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
  Users,
} from 'lucide-react';
import { dealPlace, hasPricedAmount, img, isSafePartnerRedirectUrl, priceCopy, trackEvent } from '../../app/appConstants.js';
import './SearchTripDetailModal.css';

const formatMoney = (value, currency = 'GBP') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const prefix = currency === 'GBP' ? '£' : `${currency} `;
  return `${prefix}${Math.round(amount).toLocaleString('en-GB')}`;
};

const unique = (items = []) => [...new Set(items.filter(Boolean).map((item) => item.toString().trim()).filter(Boolean))];

const displaySourceLabel = (value = '', fallback = 'Partner source') => {
  const label = value.toString().trim();
  if (!label) return '';
  if (/booking-demand|booking\.com|booking/i.test(label)) return fallback;
  return label
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const shouldCheckLivePrice = (deal = {}) =>
  ['partner-redirect', 'booking-demand', 'affiliate-package'].includes(deal.provider) ||
  deal.bookingMode === 'affiliate' ||
  Boolean(deal.partnerUrl) ||
  deal.priceQualifier === 'Check live price' ||
  !hasPricedAmount(deal);

const getHeroBadge = (deal = {}) => {
  if (deal.dealReasonLabel) return deal.dealReasonLabel;
  if (deal.partnerUrl || deal.bookingMode === 'affiliate') return 'Live price check';
  if ((deal.scoreReasons || []).some((reason) => /group/i.test(reason))) return 'Best group pick';
  if (deal.provider === 'composer' || deal.resultType === 'composed') return 'Advisor pick';
  return 'Trip detail';
};

const getRatingLabel = (deal = {}) => {
  const rating = Number(deal.rating || 0);
  const score = Number(deal.score || 0);
  if (rating > 0 && score > 0) return `${rating.toFixed(rating % 1 ? 1 : 0)} rating · ${score}% match`;
  if (rating > 0) return `${rating.toFixed(rating % 1 ? 1 : 0)} rating`;
  if (score > 0) return `${score}% match`;
  return 'Advisor match to confirm';
};

const detailItems = (deal = {}) =>
  [
    deal.dateLabel && { icon: CalendarDays, label: 'Dates', value: deal.dateLabel },
    deal.nights && { icon: CalendarDays, label: 'Length', value: `${deal.nights} night${Number(deal.nights) === 1 ? '' : 's'}` },
    deal.departureAirport && { icon: Plane, label: 'Departure', value: deal.departureAirport },
    deal.arrivalAirport && { icon: Plane, label: 'Arrival', value: deal.arrivalAirport },
    deal.flightSummary && { icon: Plane, label: 'Flight summary', value: deal.flightSummary },
    deal.boardBasis && { icon: Utensils, label: 'Board basis', value: deal.boardBasis },
    (deal.roomMix || deal.rooms) && { icon: BedDouble, label: 'Room mix', value: deal.roomMix || `${deal.rooms} room${Number(deal.rooms) === 1 ? '' : 's'}` },
    deal.groupSizeLabel && { icon: Users, label: 'Group size', value: deal.groupSizeLabel },
    deal.baggageLabel && { icon: BriefcaseBusiness, label: 'Baggage', value: deal.baggageLabel },
  ].filter(Boolean);

const safeProtectionLabel = (_protectionLabel = '') => 'Partner terms confirmed on partner site';

const sourceItems = (deal = {}) => {
  const source = deal.sourceBreakdown || {};
  return unique([
    deal.supplierName && `Supplier: ${displaySourceLabel(deal.supplierName)}`,
    deal.provider && `Provider: ${displaySourceLabel(deal.provider)}`,
    deal.resultType && `Result type: ${displaySourceLabel(deal.resultType, 'Partner result')}`,
    source.accommodationSource && `Accommodation: ${displaySourceLabel(source.accommodationSource, 'Partner accommodation source')}`,
    source.flightSource && `Flight: ${displaySourceLabel(source.flightSource, 'Partner flight source')}`,
    source.pricingConfidence && `Price confidence: ${displaySourceLabel(source.pricingConfidence, 'Partner confidence')}`,
  ]);
};

export function SearchTripDetailModal({ content, featureFlags }) {
  const deal = content.deal || {};
  const title = deal.hotelName || content.title || 'Holiday idea';
  const place = dealPlace(deal) || [deal.destination, deal.country].filter(Boolean).join(', ') || 'Destination to confirm';
  const imageSrc = deal.image || deal.imageId ? img(deal.imageId || deal.image) : '';
  const hasPrice = hasPricedAmount(deal);
  const totalEstimate = formatMoney(deal.totalEstimate, deal.currency);
  const perPersonEstimate = formatMoney(deal.perPersonEstimate || deal.priceFrom, deal.currency);
  const primaryLabel = shouldCheckLivePrice(deal) ? 'Check live price' : 'Continue with enquiry';
  const canOpenPartner = featureFlags?.enableAffiliateRedirects !== false && deal.partnerUrl && isSafePartnerRedirectUrl(deal);
  const isSaved = Boolean(content.isShortlisted?.(deal));
  const details = detailItems(deal);
  const scoreReasons = Array.isArray(deal.scoreReasons) ? deal.scoreReasons.filter(Boolean).slice(0, 5) : [];
  const sources = sourceItems(deal);

  const handlePrimary = () => {
    if (canOpenPartner) {
      trackEvent({
        type: 'partner_redirect_clicked',
        category: 'partner',
        label: deal.supplierName || deal.provider,
        metadata: { destination: deal.destination, provider: deal.provider, supplierName: deal.supplierName, resultId: deal.id || deal.resultId },
      });
      window.open(deal.partnerUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    content.onEnquiry?.(deal);
  };

  return (
    <article className="trip-detail-modal">
      <div className="trip-detail-hero">
        {imageSrc ? (
          <img src={imageSrc} alt={`${title} in ${place}`} />
        ) : (
          <div className="trip-detail-image-fallback" aria-hidden="true">
            <Sparkles size={34} />
            <span>{deal.destination || deal.country || 'Holiday idea'}</span>
          </div>
        )}
        <div className="trip-detail-hero-overlay" aria-hidden="true" />
        <span className="trip-detail-badge">{getHeroBadge(deal)}</span>
        <button
          type="button"
          className={`trip-detail-heart${isSaved ? ' is-saved' : ''}`}
          onClick={() => content.onShortlist?.(deal)}
          aria-label={isSaved ? `Remove ${title} from saved enquiries` : `Save ${title} to enquiry shortlist`}
          aria-pressed={isSaved}
        >
          <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <div className="trip-detail-shell">
        <div className="trip-detail-main">
          <div className="trip-detail-heading">
            <span className="trip-detail-kicker">Detailed trip view</span>
            <h2 id="modal-title">{title}</h2>
            <p className="trip-detail-place">
              <MapPin size={16} aria-hidden="true" />
              {place}
            </p>
            <div className="trip-detail-rating" aria-label={getRatingLabel(deal)}>
              <Star size={17} fill="currentColor" aria-hidden="true" />
              <span>{getRatingLabel(deal)}</span>
            </div>
          </div>

          {deal.hotelSummary && <p className="trip-detail-summary">{deal.hotelSummary}</p>}

          <section className="trip-detail-section" aria-labelledby="trip-detail-key-info">
            <h3 id="trip-detail-key-info">Key trip information</h3>
            <div className="trip-detail-grid">
              {details.map(({ icon: Icon, label, value }) => (
                <div className="trip-detail-item" key={`${label}-${value}`}>
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </section>

          {scoreReasons.length > 0 && (
            <section className="trip-detail-section" aria-labelledby="trip-detail-match">
              <h3 id="trip-detail-match">Why it suits your group</h3>
              <div className="trip-detail-reasons">
                {scoreReasons.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            </section>
          )}

          <section className="trip-detail-section trip-detail-protection" aria-labelledby="trip-detail-protection-title">
            <h3 id="trip-detail-protection-title">Safe next steps</h3>
            <p>
              <ShieldCheck size={17} aria-hidden="true" />
              {safeProtectionLabel(deal.protectionLabel)} · No payment taken by PickyHoliday.
            </p>
            {canOpenPartner && <small>Live prices and partner terms are confirmed on the partner site before you choose any next step.</small>}
          </section>

          {sources.length > 0 && (
            <section className="trip-detail-section" aria-labelledby="trip-detail-source">
              <h3 id="trip-detail-source">Source information</h3>
              <ul className="trip-detail-sources">
                {sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="trip-detail-actions" aria-label={`${title} price and actions`}>
          <span className="trip-detail-action-label">Price summary</span>
          <p className="trip-detail-price">
            {hasPrice ? (
              <>
                {priceCopy(deal)} <small>pp</small>
              </>
            ) : (
              'Check live price'
            )}
          </p>
          {deal.priceQualifier && <p className="trip-detail-price-note">{deal.priceQualifier}</p>}
          {totalEstimate && <p className="trip-detail-total">Est. total {totalEstimate}</p>}
          {!totalEstimate && perPersonEstimate && deal.perPersonEstimate && <p className="trip-detail-total">Indicative pp {perPersonEstimate}</p>}

          <button type="button" className="trip-detail-primary" onClick={handlePrimary}>
            {primaryLabel} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="trip-detail-secondary" onClick={() => content.onQuote?.(deal)}>
            Ask for group quote
          </button>
          <button
            type="button"
            className={`trip-detail-save${isSaved ? ' is-saved' : ''}`}
            onClick={() => content.onShortlist?.(deal)}
            aria-pressed={isSaved}
          >
            <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            {isSaved ? 'Saved enquiry' : 'Save enquiry'}
          </button>
          <p className="trip-detail-action-note">
            <Info size={14} aria-hidden="true" />
            No payment taken. Partner terms confirmed on partner site.
          </p>
        </aside>
      </div>
    </article>
  );
}
