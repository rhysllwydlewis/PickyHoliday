import React, { useEffect, useRef, useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { CompareShortlist, QuoteBuilder } from '../groupQuoteFlow.jsx';
import { SearchTripDetailModal } from '../search/SearchTripDetailModal.jsx';
import { listAdminEnquiries, submitEnquiry } from '../../services/travelApi.js';
import { dealPlace, defaultFeatureFlags, defaultSiteConfig, emailPattern, priceCopy, saveAdminToken, trackEvent } from '../../app/appConstants.js';

function dealPayload(deal = {}) {
  return {
    resultId: deal.id || deal.resultId || '',
    resultType: deal.resultType || '',
    provider: deal.provider || '',
    supplierName: deal.supplierName || '',
    destination: deal.destination || '',
    country: deal.country || '',
    hotelName: deal.hotelName || '',
    departureAirport: deal.departureAirport || '',
    dateLabel: deal.dateLabel || '',
    groupSizeLabel: deal.groupSizeLabel || '',
    priceFrom: deal.priceFrom || null,
    currency: deal.currency || 'GBP',
    priceQualifier: deal.priceQualifier || '',
    partnerId: deal.partnerId || '',
    boardBasis: deal.boardBasis || '',
    baggageLabel: deal.baggageLabel || '',
    bookingMode: deal.bookingMode || 'enquiry-only',
    protectionLabel: deal.protectionLabel || '',
  };
}

function validateEnquiryForm(form) {
  const errors = {};
  if (!form.customerName.trim()) errors.customerName = 'Please tell us your name.';
  if (!emailPattern.test(form.customerEmail.trim())) errors.customerEmail = 'Please enter a valid email address.';
  if (!form.destination.trim()) errors.destination = 'Please choose a destination.';
  if (!form.consentToContact) errors.consentToContact = 'Please confirm we can contact you about this enquiry.';
  return errors;
}

export function dealModalContent(selected, { onOpenEnquiry, onSubmitted, onShortlist, isShortlisted, onQuote } = {}) {
  return {
    title: selected.hotelName,
    body: selected.provider === 'partner-redirect' ? `${selected.flightSummary}. ${selected.hotelSummary}. This sends you to the partner to check live price. No payment taken by PickyHoliday.` : `${selected.flightSummary}. ${selected.hotelSummary}. You can save an enquiry or continue to a partner where available. No payment taken by PickyHoliday.`,
    kicker: selected.savingLabel,
    deal: selected,
    onEnquiry: (deal) => {
      trackEvent({ type: 'enquiry_form_opened', category: 'enquiry', label: deal.destination || deal.hotelName, metadata: { destination: deal.destination, resultId: deal.id || deal.resultId } });
      onOpenEnquiry?.({ type: 'enquiry', deal, onSubmitted });
    },
    onShortlist,
    isShortlisted,
    onQuote,
  };
}

function EnquiryForm({ deal, onClose, onSubmitted }) {
  const defaults = dealPayload(deal);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    destination: defaults.destination,
    groupSizeLabel: defaults.groupSizeLabel,
    dateLabel: defaults.dateLabel,
    customerNotes: '',
    consentToContact: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateEnquiryForm(form);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await submitEnquiry({
        ...defaults,
        ...form,
        source: 'customer-enquiry-form',
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        customerNotes: form.customerNotes.trim(),
        destination: form.destination.trim(),
        groupSizeLabel: form.groupSizeLabel.trim(),
        dateLabel: form.dateLabel.trim(),
      });
      const enquiry = response.enquiry || {};
      setSuccess({ id: enquiry.id || enquiry.enquiryId, message: enquiry.message || 'Thanks, your enquiry has been saved. No payment taken by PickyHoliday.' });
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
        <span>Enquiry saved</span>
        <h2 id="modal-title">Thanks, your enquiry has been saved.</h2>
        <p>This is an enquiry only. No payment taken by PickyHoliday. Partner terms are confirmed on partner site.</p>
        {success.id && <p className="enquiry-ref">Enquiry ref: {success.id}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={handleSubmit} noValidate>
      <span>Saved enquiry only</span>
      <h2 id="modal-title">Ask for a group quote</h2>
      <p>Share your contact details and notes. PickyHoliday will save this enquiry for review. No payment taken by PickyHoliday and partner terms are confirmed on partner site.</p>
      <div className="enquiry-trip-summary">
        <b>{deal.hotelName}</b>
        <small>{dealPlace(deal)} · {deal.supplierName} · {priceCopy(deal)} {deal.priceQualifier}</small>
      </div>
      <div className="form-grid">
        <label>
          <span>Name *</span>
          <input value={form.customerName} onChange={(event) => updateField('customerName', event.target.value)} aria-invalid={Boolean(errors.customerName)} />
          {errors.customerName && <small>{errors.customerName}</small>}
        </label>
        <label>
          <span>Email *</span>
          <input type="email" value={form.customerEmail} onChange={(event) => updateField('customerEmail', event.target.value)} aria-invalid={Boolean(errors.customerEmail)} />
          {errors.customerEmail && <small>{errors.customerEmail}</small>}
        </label>
        <label>
          <span>Phone</span>
          <input value={form.customerPhone} onChange={(event) => updateField('customerPhone', event.target.value)} />
        </label>
        <label>
          <span>Destination *</span>
          <input value={form.destination} onChange={(event) => updateField('destination', event.target.value)} aria-invalid={Boolean(errors.destination)} />
          {errors.destination && <small>{errors.destination}</small>}
        </label>
        <label>
          <span>Group size</span>
          <input value={form.groupSizeLabel} onChange={(event) => updateField('groupSizeLabel', event.target.value)} />
        </label>
        <label>
          <span>Dates / rough dates</span>
          <input value={form.dateLabel} onChange={(event) => updateField('dateLabel', event.target.value)} />
        </label>
      </div>
      <label className="notes-field">
        <span>Notes</span>
        <textarea rows="4" value={form.customerNotes} onChange={(event) => updateField('customerNotes', event.target.value)} placeholder="Tell us about room mix, preferred airports, budget, accessibility needs or anything else useful." />
      </label>
      <label className="consent-field">
        <input type="checkbox" checked={form.consentToContact} onChange={(event) => updateField('consentToContact', event.target.checked)} />
        <span>I agree that PickyHoliday can contact me about this saved enquiry. *</span>
      </label>
      {errors.consentToContact && <small className="form-error">{errors.consentToContact}</small>}
      {submitError && <div className="error-state compact">{submitError}</div>}
      <div className="modal-actions">
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving enquiry…' : 'Save enquiry'}</button>
        <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  );
}


export function AdminSignInForm({ onClose }) {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setError('Enter your access key.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await listAdminEnquiries(token);
      saveAdminToken(token);
      window.location.assign('/admin');
    } catch (loginError) {
      setError(loginError.status === 401
        ? 'Those sign in details were not accepted. Check the current access key.'
        : (loginError.message || 'Could not verify the access key.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="signin-form" onSubmit={submit} noValidate>
      <div className="signin-hero">
        <div className="signin-icon"><LockKeyhole size={22} /></div>
        <div>
          <span className="signin-kicker">Secure owner access</span>
          <h2 id="modal-title">Sign in</h2>
        </div>
      </div>
      <p>Use the access key supplied to you to open the owner dashboard. Customer accounts will be added later.</p>
      <label>
        <span>Access key</span>
        <input type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} autoComplete="current-password" placeholder="Enter access key" />
      </label>
      <p className="signin-help">Your key is checked by the API and kept in sessionStorage only for this browser session.</p>
      {error && <div className="error-state compact">{error}</div>}
      <div className="modal-actions signin-actions">
        <button type="submit" disabled={isLoading}>{isLoading ? 'Checking…' : 'Sign in'}</button>
        <button type="button" onClick={onClose} disabled={isLoading}>Cancel</button>
      </div>
    </form>
  );
}

export function Dialog({ content, onClose, siteConfig = defaultSiteConfig }) {
  const featureFlags = siteConfig.featureFlags || defaultFeatureFlags;
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!content) return undefined;
    const previousFocus = document.activeElement;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [content]);

  if (!content) return null;

  const isTripDetail = Boolean(content.deal) && !content.type;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section ref={dialogRef} className={`modal${isTripDetail ? ' modal--trip-detail' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()} tabIndex={-1}>
        <button ref={closeButtonRef} type="button" className="modal-close" onClick={onClose} aria-label={isTripDetail ? 'Close trip details' : 'Close dialog'}><X size={18} aria-hidden="true" /></button>
        {content.type === 'enquiry' ? (
          <EnquiryForm deal={content.deal} onClose={onClose} onSubmitted={content.onSubmitted} />
        ) : content.type === 'quote-builder' ? (
          <QuoteBuilder deals={content.deals || []} onClose={onClose} onSubmitted={content.onSubmitted} source={content.source || 'quote-builder'} onTrack={trackEvent} />
        ) : content.type === 'compare-shortlist' ? (
          <CompareShortlist deals={content.deals || []} />
        ) : content.type === 'admin-login' ? (
          <AdminSignInForm onClose={onClose} />
        ) : content.deal ? (
          <SearchTripDetailModal content={content} featureFlags={featureFlags} />
        ) : (
          <>
            <span>{content.kicker || 'PickyHoliday'}</span>
            <h2 id="modal-title">{content.title}</h2>
            <p>{content.body}</p>
            {content.bullets?.length > 0 && (
              <ul className="modal-list">
                {content.bullets.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            <div className="modal-actions">
              {content.actions?.map((action) => (
                <button type="button" key={action.label} onClick={() => { onClose(); action.onClick?.(); }}>{action.label}</button>
              ))}
              <button type="button" onClick={onClose}>{content.closeLabel || 'Close'}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

