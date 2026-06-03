import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';
import { submitEnquiry } from '../services/travelApi.js';

export const shortlistStorageKey = 'pickyholiday-shortlist-v1';
export const shortlistLimit = 6;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasPricedAmount = (deal) => Number(deal?.priceFrom || 0) > 0;
const priceSymbol = (currency) => (currency === 'GBP' ? '£' : currency || '');
const priceCopy = (deal = {}) => (hasPricedAmount(deal) ? `${priceSymbol(deal.currency)}${deal.priceFrom}` : 'Check live price');

export const dealKey = (deal = {}) => `${deal.id || deal.resultId || deal.hotelName || deal.destination}`;

export const shortlistSummary = (deal = {}) => ({
  id: dealKey(deal),
  resultId: deal.id || deal.resultId || '',
  resultType: deal.resultType || '',
  provider: deal.provider || '',
  supplierName: deal.supplierName || '',
  partnerId: deal.partnerId || '',
  destination: deal.destination || '',
  country: deal.country || '',
  hotelName: deal.hotelName || deal.title || '',
  departureAirport: deal.departureAirport || '',
  dateLabel: deal.dateLabel || '',
  nights: deal.nights || '',
  groupSizeLabel: deal.groupSizeLabel || '',
  boardBasis: deal.boardBasis || '',
  baggageLabel: deal.baggageLabel || '',
  bookingMode: deal.bookingMode || 'enquiry-only',
  protectionLabel: deal.protectionLabel || 'Enquiry only — no automatic booking or payment.',
  priceFrom: Number(deal.priceFrom || 0) > 0 ? Number(deal.priceFrom) : null,
  currency: deal.currency || 'GBP',
  priceQualifier: deal.priceQualifier || '',
  hasPartnerRedirect: Boolean(deal.partnerId || deal.partnerUrl),
});

export const readShortlist = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(shortlistStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, shortlistLimit) : [];
  } catch (error) {
    return [];
  }
};

export const saveShortlist = (items) => {
  try {
    window.localStorage.setItem(shortlistStorageKey, JSON.stringify(items.slice(0, shortlistLimit)));
  } catch (error) {
    // Shortlisting remains optional if localStorage is unavailable.
  }
};

const dealLocation = (deal = {}) => [deal.destination, deal.country].filter(Boolean).join(', ');

function ShortlistedDealMini({ deal, onRemove }) {
  return (
    <article>
      <b>{deal.hotelName || 'Holiday idea'}</b>
      <small>{dealLocation(deal) || 'Destination to confirm'} · {deal.supplierName || deal.provider || 'Supplier to confirm'} · {priceCopy(deal)}</small>
      {onRemove && <button onClick={() => onRemove(deal)}>Remove</button>}
    </article>
  );
}

function validateQuoteBuilderStep(form, targetStep) {
  const nextErrors = {};
  if ((targetStep === 0 || targetStep === 3) && !form.destination.trim()) nextErrors.destination = 'Please choose a destination.';
  if ((targetStep === 1 || targetStep === 3) && form.budgetPerPerson && !Number.isFinite(Number(form.budgetPerPerson))) nextErrors.budgetPerPerson = 'Budget must be a number.';
  if (targetStep === 2 || targetStep === 3) {
    if (!form.customerName.trim()) nextErrors.customerName = 'Please tell us your name.';
    if (!emailPattern.test(form.customerEmail.trim())) nextErrors.customerEmail = 'Please enter a valid email address.';
    if (!form.consentToContact) nextErrors.consentToContact = 'Please confirm we can contact you about this saved enquiry.';
  }
  return nextErrors;
}

export function QuoteBuilder({ deals = [], onClose, onSubmitted, source = 'quote-builder', onTrack }) {
  const safeDeals = deals.slice(0, shortlistLimit).map(shortlistSummary);
  const firstDeal = safeDeals[0] || {};
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    destination: firstDeal.destination || '',
    dateLabel: firstDeal.dateLabel || '',
    departureAirport: firstDeal.departureAirport || '',
    groupSizeLabel: firstDeal.groupSizeLabel || '',
    budgetPerPerson: '',
    roomMix: '',
    boardPreference: firstDeal.boardBasis || '',
    baggagePreference: firstDeal.baggageLabel || '',
    transferPreference: '',
    occasionType: '',
    flexibilityNotes: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    consentToContact: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const steps = ['Trip basics', 'Group requirements', 'Contact details', 'Review'];

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validateStep = (targetStep = step) => {
    const nextErrors = validateQuoteBuilderStep(form, targetStep);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateStep(3)) return;
    setIsSubmitting(true);

    try {
      const response = await submitEnquiry({
        ...firstDeal,
        ...form,
        source,
        quoteBuilderVersion: 'group-shortlist-v1',
        shortlistedDeals: safeDeals,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        destination: form.destination.trim(),
        dateLabel: form.dateLabel.trim(),
        departureAirport: form.departureAirport.trim(),
        groupSizeLabel: form.groupSizeLabel.trim(),
        budgetPerPerson: form.budgetPerPerson === '' ? undefined : Number(form.budgetPerPerson),
        roomMix: form.roomMix.trim(),
        boardPreference: form.boardPreference.trim(),
        baggagePreference: form.baggagePreference.trim(),
        transferPreference: form.transferPreference.trim(),
        occasionType: form.occasionType.trim(),
        flexibilityNotes: form.flexibilityNotes.trim(),
        customerNotes: form.flexibilityNotes.trim(),
      });
      const enquiry = response.enquiry || {};
      onTrack?.({ type: 'quote_builder_submitted', category: 'enquiry', label: form.destination, metadata: { destination: form.destination, shortlistCount: safeDeals.length, source } });
      setSuccess({ id: enquiry.id || enquiry.enquiryId, message: enquiry.message || 'Thanks, your enquiry has been saved. This is not a booking confirmation.' });
      onSubmitted?.(enquiry);
    } catch (error) {
      const fieldErrors = Object.fromEntries((error.fieldErrors || []).map((fieldError) => [fieldError.field, fieldError.message]));
      setErrors((current) => ({ ...current, ...fieldErrors }));
      setSubmitError(error.userMessage || error.message || 'Sorry, we could not save your enquiry right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="enquiry-success" role="status">
        <span>Saved enquiry</span>
        <h2 id="modal-title">Your group quote enquiry was saved.</h2>
        <p>No booking has been created. No payment has been taken. No supplier reservation has been made.</p>
        {success.id && <p className="enquiry-ref">Enquiry ref: {success.id}</p>}
        <div className="modal-actions"><button onClick={onClose}>Close</button></div>
      </div>
    );
  }

  return (
    <form className="quote-builder" onSubmit={handleSubmit} noValidate>
      <span>Group quote builder</span>
      <h2 id="modal-title">Ask for group quote</h2>
      <p>Build one richer saved enquiry from your shortlist. This is enquiry planning only, not held availability or a locked-in price.</p>
      <div className="quote-steps">
        {steps.map((label, index) => <button type="button" key={label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}>{index + 1}. {label}</button>)}
      </div>

      {step === 0 && (
        <div className="form-grid">
          <label><span>Destination *</span><input value={form.destination} onChange={(event) => updateField('destination', event.target.value)} aria-invalid={Boolean(errors.destination)} />{errors.destination && <small>{errors.destination}</small>}</label>
          <label><span>Dates / rough dates</span><input value={form.dateLabel} onChange={(event) => updateField('dateLabel', event.target.value)} /></label>
          <label><span>Departure airport</span><input value={form.departureAirport} onChange={(event) => updateField('departureAirport', event.target.value)} /></label>
          <label><span>Group size</span><input value={form.groupSizeLabel} onChange={(event) => updateField('groupSizeLabel', event.target.value)} /></label>
        </div>
      )}

      {step === 1 && (
        <>
          <div className="form-grid">
            <label><span>Budget per person</span><input inputMode="numeric" value={form.budgetPerPerson} onChange={(event) => updateField('budgetPerPerson', event.target.value)} aria-invalid={Boolean(errors.budgetPerPerson)} />{errors.budgetPerPerson && <small>{errors.budgetPerPerson}</small>}</label>
            <label><span>Room mix</span><input value={form.roomMix} onChange={(event) => updateField('roomMix', event.target.value)} placeholder="e.g. 3 twins, 2 doubles" /></label>
            <label><span>Board preference</span><input value={form.boardPreference} onChange={(event) => updateField('boardPreference', event.target.value)} /></label>
            <label><span>Occasion / trip type</span><input value={form.occasionType} onChange={(event) => updateField('occasionType', event.target.value)} placeholder="Birthday, hen, family trip…" /></label>
          </div>
          <div className="form-grid">
            <label><span>Baggage notes</span><input value={form.baggagePreference} onChange={(event) => updateField('baggagePreference', event.target.value)} /></label>
            <label><span>Transfer notes</span><input value={form.transferPreference} onChange={(event) => updateField('transferPreference', event.target.value)} /></label>
          </div>
          <label className="notes-field"><span>Flexibility notes</span><textarea rows="3" value={form.flexibilityNotes} onChange={(event) => updateField('flexibilityNotes', event.target.value)} /></label>
        </>
      )}

      {step === 2 && (
        <>
          <div className="form-grid">
            <label><span>Name *</span><input value={form.customerName} onChange={(event) => updateField('customerName', event.target.value)} aria-invalid={Boolean(errors.customerName)} />{errors.customerName && <small>{errors.customerName}</small>}</label>
            <label><span>Email *</span><input type="email" value={form.customerEmail} onChange={(event) => updateField('customerEmail', event.target.value)} aria-invalid={Boolean(errors.customerEmail)} />{errors.customerEmail && <small>{errors.customerEmail}</small>}</label>
            <label><span>Phone optional</span><input value={form.customerPhone} onChange={(event) => updateField('customerPhone', event.target.value)} /></label>
          </div>
          <label className="consent-field"><input type="checkbox" checked={form.consentToContact} onChange={(event) => updateField('consentToContact', event.target.checked)} /><span>I agree that PickyHoliday can contact me about this saved enquiry. *</span></label>
          {errors.consentToContact && <small className="form-error">{errors.consentToContact}</small>}
        </>
      )}

      {step === 3 && (
        <div className="quote-review">
          <b>Review saved enquiry details</b>
          <p>{form.destination || 'Destination to confirm'} · {form.dateLabel || 'Dates flexible'} · {form.groupSizeLabel || 'Group size to confirm'}</p>
          <p>Budget: {form.budgetPerPerson ? `£${form.budgetPerPerson}pp` : 'Not supplied'} · Rooms: {form.roomMix || 'Not supplied'} · Occasion: {form.occasionType || 'Not supplied'}</p>
          <div className="shortlist-mini-list">{safeDeals.map((deal) => <ShortlistedDealMini key={deal.id || deal.resultId} deal={deal} />)}</div>
          <p className="quote-safety">No booking has been created. No payment has been taken. No supplier reservation has been made.</p>
        </div>
      )}

      {submitError && <div className="error-state compact">{submitError}</div>}
      <div className="modal-actions">
        <button type={step === 3 ? 'submit' : 'button'} onClick={step === 3 ? undefined : goNext} disabled={isSubmitting}>{step === 3 ? (isSubmitting ? 'Saving enquiry…' : 'Save quote enquiry') : 'Next'}</button>
        {step > 0 && <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={isSubmitting}>Back</button>}
        <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  );
}

export function CompareShortlist({ deals = [] }) {
  return (
    <div className="compare-shortlist">
      <span>Compare shortlist</span>
      <h2 id="modal-title">Shortlisted group holiday ideas</h2>
      <p>This shortlist is for enquiry planning only. Availability is not held and prices are not locked in.</p>
      <div className="compare-grid">
        {deals.map((deal) => (
          <article key={deal.id || deal.resultId}>
            <h3>{deal.hotelName || 'Holiday idea'}</h3>
            <dl>
              <dt>Destination</dt><dd>{dealLocation(deal) || 'To confirm'}</dd>
              <dt>Supplier</dt><dd>{deal.supplierName || deal.provider || 'To confirm'}</dd>
              <dt>Nights/date</dt><dd>{deal.nights ? `${deal.nights} nights · ` : ''}{deal.dateLabel || 'Flexible'}</dd>
              <dt>Group size</dt><dd>{deal.groupSizeLabel || 'To confirm'}</dd>
              <dt>Board/bags</dt><dd>{[deal.boardBasis, deal.baggageLabel].filter(Boolean).join(' · ') || 'To confirm'}</dd>
              <dt>Price</dt><dd>{deal.priceFrom ? `${priceSymbol(deal.currency)}${deal.priceFrom} ${deal.priceQualifier || ''}` : 'Check live price'}</dd>
              <dt>Mode/protection</dt><dd>{deal.bookingMode || 'enquiry-only'} · {deal.protectionLabel || 'Saved enquiry only'}</dd>
              <dt>Partner redirect</dt><dd>{deal.hasPartnerRedirect ? 'Available via safe partner CTA' : 'Not shown'}</dd>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ShortlistBar({ shortlist, onRemove, onCompare, onQuote, onTrack }) {
  const [open, setOpen] = useState(false);
  if (!shortlist.length) return null;

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) onTrack?.({ type: 'shortlist_opened', category: 'shortlist', label: 'shortlist', metadata: { shortlistCount: shortlist.length, source: 'shortlist-bar' } });
  };

  return (
    <aside className={`shortlist-bar ${open ? 'open' : ''}`}>
      <button className="shortlist-toggle" onClick={toggleOpen}><ClipboardList size={18} /> {shortlist.length} shortlisted {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
      {open && (
        <div className="shortlist-drawer">
          <p>Browser-local shortlist only. Use it to compare ideas before a saved enquiry.</p>
          <div className="shortlist-mini-list">{shortlist.map((deal) => <ShortlistedDealMini key={deal.id || deal.resultId} deal={deal} onRemove={onRemove} />)}</div>
          <div className="shortlist-actions"><button onClick={onCompare}>Compare shortlist</button><button onClick={onQuote}>Ask for group quote</button></div>
        </div>
      )}
    </aside>
  );
}
