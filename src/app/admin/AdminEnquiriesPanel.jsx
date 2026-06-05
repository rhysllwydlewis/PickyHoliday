import React, { useCallback, useEffect, useState } from 'react';
import { listAdminEnquiries, updateAdminEnquiryStatus } from '../../services/travelApi.js';
import { enquiryStatuses, friendlyDate } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

export function AdminEnquiriesPanel({ token }) {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await listAdminEnquiries(token);
      setEnquiries(response.results || []);
    } catch (loadError) {
      setError(loadError.status === 401
        ? 'Admin access key is no longer accepted. Please log in again.'
        : (loadError.message || 'Could not load enquiries.'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (enquiry, status) => {
    setUpdatingId(enquiry.id);
    setError('');
    try {
      const response = await updateAdminEnquiryStatus(enquiry.id, status, token);
      const updated = response.results?.[0] || { ...enquiry, status };
      setEnquiries((current) => current.map((item) => (item.id === enquiry.id ? updated : item)));
    } catch (statusError) {
      setError(statusError.message || 'Could not update enquiry.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <>
      <AdminPageTitle
        kicker="Saved customer enquiries"
        title="Enquiries"
        copy="Review quote requests. Status updates are internal only and do not create bookings, payments or supplier reservations."
        action={<button onClick={load} disabled={isLoading}>Refresh</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {isLoading && <div className="loading-state">Loading saved enquiries…</div>}
      {!isLoading && enquiries.length === 0 && !error && <div className="empty-state">No enquiries found yet.</div>}
      <div className="admin-list">
        {enquiries.map((enquiry) => (
          <article className="admin-enquiry-card" key={enquiry.id}>
            <div className="admin-card-top">
              <div>
                <span className={`status-pill status-${enquiry.status}`}>{enquiry.status}</span>
                <h2>{enquiry.customerName || 'Name not supplied'}</h2>
                <p>{friendlyDate(enquiry.createdAt)} · Ref {enquiry.id}</p>
              </div>
              <label>
                <span>Status</span>
                <select value={enquiry.status || 'new'} onChange={(event) => updateStatus(enquiry, event.target.value)} disabled={updatingId === enquiry.id}>
                  {enquiryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <dl className="admin-fields">
              <dt>Email</dt><dd>{enquiry.customerEmail || '—'}</dd>
              <dt>Phone</dt><dd>{enquiry.customerPhone || '—'}</dd>
              <dt>Destination</dt><dd>{enquiry.destination || '—'}</dd>
              <dt>Hotel</dt><dd>{enquiry.hotelName || '—'}</dd>
              <dt>Dates</dt><dd>{enquiry.dateLabel || '—'}</dd>
              <dt>Group size</dt><dd>{enquiry.groupSizeLabel || '—'}</dd>
              <dt>Provider</dt><dd>{enquiry.provider || '—'}</dd>
              <dt>Supplier</dt><dd>{enquiry.supplierName || '—'}</dd>
            </dl>
            {(enquiry.budgetPerPerson || enquiry.roomMix || enquiry.boardPreference || enquiry.baggagePreference || enquiry.transferPreference || enquiry.occasionType || enquiry.flexibilityNotes) && (
              <div className="admin-notes">
                <b>Group requirements</b>
                <dl className="admin-fields group-fields">
                  <dt>Budget pp</dt><dd>{enquiry.budgetPerPerson ? `£${enquiry.budgetPerPerson}` : '—'}</dd>
                  <dt>Room mix</dt><dd>{enquiry.roomMix || '—'}</dd>
                  <dt>Board</dt><dd>{enquiry.boardPreference || '—'}</dd>
                  <dt>Bags/transfers</dt><dd>{[enquiry.baggagePreference, enquiry.transferPreference].filter(Boolean).join(' · ') || '—'}</dd>
                  <dt>Occasion</dt><dd>{enquiry.occasionType || '—'}</dd>
                  <dt>Flexibility</dt><dd>{enquiry.flexibilityNotes || '—'}</dd>
                </dl>
              </div>
            )}
            {Array.isArray(enquiry.shortlistedDeals) && enquiry.shortlistedDeals.length > 0 && (
              <div className="admin-notes">
                <b>Shortlisted deals</b>
                <div className="admin-shortlisted-deals">
                  {enquiry.shortlistedDeals.map((deal, index) => (
                    <article key={deal.resultId || `${deal.hotelName}-${index}`}>
                      <strong>{deal.hotelName || 'Holiday idea'}</strong>
                      <span>{deal.destination}{deal.country ? `, ${deal.country}` : ''} · {deal.supplierName || deal.provider || 'Supplier to confirm'} · {deal.priceFrom ? `${deal.currency === 'GBP' ? '£' : deal.currency}${deal.priceFrom}` : 'Check live price'}</span>
                    </article>
                  ))}
                </div>
              </div>
            )}
            <div className="admin-notes">
              <b>Customer notes</b>
              <p>{enquiry.customerNotes || 'No notes supplied.'}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
