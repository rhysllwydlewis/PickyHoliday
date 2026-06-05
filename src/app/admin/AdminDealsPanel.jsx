import React, { useCallback, useEffect, useState } from 'react';
import { createAdminPromotedDeal, listAdminPromotedDeals, updateAdminPromotedDeal, updateAdminPromotedDealStatus } from '../../services/travelApi.js';
import { buildPartnerSearchUrl, partnerDefinitions, validatePartnerUrl } from '../../services/partners/partnerDeepLinks.js';
import { friendlyDate } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

const emptyDeal = {
  title: '',
  status: 'draft',
  dealType: 'package',
  supplierName: '',
  destination: '',
  country: '',
  hotelName: '',
  image: '',
  priceFrom: '',
  currency: 'GBP',
  priceQualifier: 'pp',
  savingLabel: '',
  nights: '',
  departureAirport: '',
  returnAirport: '',
  dateLabel: '',
  groupSizeLabel: '',
  boardBasis: '',
  baggageLabel: '',
  bookingMode: 'manual-quote',
  partnerId: '',
  partnerUrl: '',
  protectionLabel: 'Enquiry only — no automatic booking or payment.',
  tags: '',
  internalNotes: '',
};

export function AdminDealsPanel({ token }) {
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(emptyDeal);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listAdminPromotedDeals(token);
      setDeals(response.results || []);
    } catch (dealError) {
      setError(dealError.message || 'Could not load promoted deals.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const field = (name, label, type = 'text') => (
    <label>
      <span>{label}</span>
      <input type={type} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)} />
    </label>
  );

  const generatePartnerUrl = () => {
    const partnerId = form.partnerId || partnerDefinitions[0]?.partnerId || '';
    const generated = buildPartnerSearchUrl(partnerId, {
      destination: form.destination,
      origin: form.departureAirport,
      date: form.dateLabel,
      nights: form.nights,
      groupSize: form.groupSizeLabel,
    });
    if (!generated) {
      setError('Could not generate a safe partner URL for the selected partner.');
      return;
    }
    setForm((current) => ({ ...current, partnerId, partnerUrl: generated, bookingMode: 'affiliate', priceQualifier: 'Check live price with partner' }));
    setNotice('Generated a safe partner search URL. Leave price blank or £0 if the partner will show the live price.');
  };

  const edit = (deal) => {
    setEditingId(deal.id);
    setForm({ ...emptyDeal, ...deal, tags: (deal.tags || []).join(', ') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (form.bookingMode === 'affiliate' && form.partnerUrl && !validatePartnerUrl(form.partnerUrl, form.partnerId || undefined)) {
      setError('Partner URL must be an https:// URL on an approved partner domain. javascript:, data:, http: and unapproved domains are not allowed.');
      return;
    }

    const payload = { ...form, priceFrom: Number(form.priceFrom || 0), nights: Number(form.nights || 0), tags: form.tags };
    try {
      const response = editingId
        ? await updateAdminPromotedDeal(editingId, payload, token)
        : await createAdminPromotedDeal(payload, token);
      const saved = response.results?.[0];
      setDeals((current) => (editingId
        ? current.map((deal) => (deal.id === editingId ? saved : deal))
        : [saved, ...current]));
      setForm(emptyDeal);
      setEditingId('');
      setNotice('Promoted deal saved. Active deals can appear publicly; inactive deals stay private.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save promoted deal.');
    }
  };

  const status = async (deal, nextStatus) => {
    setError('');
    try {
      const response = await updateAdminPromotedDealStatus(deal.id, nextStatus, token);
      const updated = response.results?.[0];
      setDeals((current) => current.map((item) => (item.id === deal.id ? updated : item)));
    } catch (statusError) {
      setError(statusError.message || 'Could not update status.');
    }
  };

  return (
    <>
      <AdminPageTitle
        kicker="Admin-managed offers"
        title="Promoted Deals"
        copy="Create, edit, pause and archive promoted cards. This never creates a booking, payment or reservation."
        action={<button onClick={load} disabled={loading}>Refresh list</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {notice && <div className="loading-state">{notice}</div>}
      <form className="admin-form" onSubmit={save}>
        <h2>{editingId ? 'Edit promoted deal' : 'Create promoted deal'}</h2>
        <fieldset>
          <legend>A. Basic</legend>
          {field('title', 'Title')}
          {field('supplierName', 'Supplier name')}
          {field('destination', 'Destination')}
          {field('country', 'Country')}
          {field('hotelName', 'Hotel name')}
          {field('image', 'Image URL/key')}
          <label><span>Status</span><select value={form.status} onChange={(event) => update('status', event.target.value)}>{['draft', 'active', 'paused', 'archived'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Deal type</span><select value={form.dealType} onChange={(event) => update('dealType', event.target.value)}>{['package', 'advert', 'manual-quote', 'affiliate'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </fieldset>
        <fieldset>
          <legend>B. Pricing</legend>
          {field('priceFrom', 'Price from', 'number')}
          <p className="admin-muted">Leave price blank or £0 if the partner will show the live price.</p>
          {field('currency', 'Currency')}
          {field('priceQualifier', 'Price qualifier')}
          {field('savingLabel', 'Saving label')}
        </fieldset>
        <fieldset>
          <legend>C. Trip details</legend>
          {field('nights', 'Nights', 'number')}
          {field('departureAirport', 'Departure airport')}
          {field('returnAirport', 'Return airport')}
          {field('dateLabel', 'Date label')}
          {field('groupSizeLabel', 'Group size label')}
          {field('boardBasis', 'Board basis')}
          {field('baggageLabel', 'Baggage label')}
        </fieldset>
        <fieldset>
          <legend>D. Booking/CTA</legend>
          <label><span>Booking mode</span><select value={form.bookingMode} onChange={(event) => update('bookingMode', event.target.value)}>{['manual-quote', 'affiliate', 'enquiry'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Partner</span><select value={form.partnerId} onChange={(event) => update('partnerId', event.target.value)}><option value="">Select partner</option>{partnerDefinitions.map((partner) => <option key={partner.partnerId} value={partner.partnerId}>{partner.label}</option>)}</select></label>
          {field('partnerUrl', 'Partner URL')}
          <button type="button" onClick={generatePartnerUrl}>Generate partner search URL</button>
          <p className="admin-muted">Partner redirects open safe partner domains only. The partner shows live price, availability, booking and protection terms.</p>
          {field('protectionLabel', 'Protection label')}
        </fieldset>
        <fieldset>
          <legend>E. Tags and notes</legend>
          {field('tags', 'Tags comma-separated')}
          <label><span>Internal notes</span><textarea value={form.internalNotes || ''} onChange={(event) => update('internalNotes', event.target.value)} /></label>
        </fieldset>
        <div className="admin-actions">
          <button>{editingId ? 'Save changes' : 'Create deal'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyDeal); }}>Cancel edit</button>}
        </div>
      </form>
      <div className="admin-list">
        {deals.map((deal) => (
          <article className="admin-enquiry-card" key={deal.id}>
            <div className="admin-card-top">
              <div>
                <span className={`status-pill status-${deal.status}`}>{deal.status}</span>
                <h2>{deal.title}</h2>
                <p>{deal.destination} · {deal.supplierName || 'PickyHoliday'} · {friendlyDate(deal.updatedAt)}</p>
              </div>
              <button onClick={() => edit(deal)}>Edit</button>
            </div>
            <div className="admin-actions">
              <button onClick={() => status(deal, 'active')}>Activate</button>
              <button onClick={() => status(deal, 'paused')}>Pause</button>
              <button onClick={() => status(deal, 'archived')}>Archive</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

