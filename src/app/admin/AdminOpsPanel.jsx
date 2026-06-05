import React, { useCallback, useEffect, useState } from 'react';
import { getAdminAnalyticsSummary, listAdminAnalyticsEvents, runAdminOpsTests, sendAdminTestWebhook } from '../../services/travelApi.js';
import { friendlyDate } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

export function AdminOpsPanel({ token }) {
  const [summary, setSummary] = useState({});
  const [events, setEvents] = useState([]);
  const [tests, setTests] = useState(null);
  const [includeWriteTests, setIncludeWriteTests] = useState(false);
  const [webhook, setWebhook] = useState({ url: '', eventType: 'admin.test', payload: '{\n  "message": "PickyHoliday admin test"\n}' });
  const [webhookResult, setWebhookResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadOps = useCallback(async () => {
    setError('');
    try {
      const [summaryResponse, eventsResponse] = await Promise.all([getAdminAnalyticsSummary(token), listAdminAnalyticsEvents(token, 20)]);
      setSummary(summaryResponse.summary || {});
      setEvents(eventsResponse.results || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load operations data.');
    }
  }, [token]);

  useEffect(() => { loadOps(); }, [loadOps]);

  const runTests = async () => {
    setLoading(true); setError('');
    try {
      const result = await runAdminOpsTests({ includeWriteTests }, token);
      setTests(result);
      await loadOps();
    } catch (testError) { setError(testError.message || 'Could not run system tests.'); }
    finally { setLoading(false); }
  };

  const sendWebhook = async () => {
    setLoading(true); setError(''); setWebhookResult(null);
    try {
      const parsedPayload = webhook.payload.trim() ? JSON.parse(webhook.payload) : {};
      const response = await sendAdminTestWebhook({ url: webhook.url, eventType: webhook.eventType, payload: parsedPayload }, token);
      setWebhookResult(response.webhook || response);
      await loadOps();
    } catch (webhookError) { setError(webhookError.message || 'Could not send webhook test. Check the URL and JSON payload.'); }
    finally { setLoading(false); }
  };

  const cards = [
    ['Searches today', summary.searchesToday ?? 0],
    ['Enquiries today', summary.enquiriesToday ?? 0],
    ['Partner redirects today', summary.partnerRedirectsToday ?? 0],
    ['Provider errors today', summary.providerErrorsToday ?? 0],
    ['Enquiries last 7 days', summary.enquiriesLast7Days ?? 0],
    ['Latest enquiry', summary.latestEnquiryTime ? friendlyDate(summary.latestEnquiryTime) : 'None'],
  ];

  return (
    <>
      <AdminPageTitle kicker="Operations centre" title="Analytics, system tests and webhook tools" copy="Monitor whether the website is working without exposing secrets or creating bookings/payments/reservations." action={<button onClick={loadOps}>Refresh</button>} />
      {error && <div className="error-state">{error}</div>}
      <div className="admin-cards">{cards.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div>
      <section className="admin-panel"><h2>Top destinations</h2><p>{(summary.topDestinationsSearched || []).map((item) => `${item.label} (${item.count})`).join(', ') || 'No search analytics yet.'}</p></section>
      <section className="admin-panel"><h2>Recent activity</h2><div className="admin-table"><table><thead><tr><th>Type</th><th>Created</th><th>Category</th><th>Label</th><th>Metadata</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.type}</td><td>{friendlyDate(event.createdAt)}</td><td>{event.category || '—'}</td><td>{event.label || '—'}</td><td>{JSON.stringify(event.metadata || {}).slice(0, 120)}</td></tr>)}</tbody></table></div>{events.length === 0 && <p className="admin-muted">No analytics events recorded yet.</p>}</section>
      <section className="admin-panel"><h2>System tests</h2><label className="admin-check"><input type="checkbox" checked={includeWriteTests} onChange={(event) => setIncludeWriteTests(event.target.checked)} /> Include write test enquiry</label><button onClick={runTests} disabled={loading}>{loading ? 'Running…' : 'Run safe tests'}</button>{tests && <div className="admin-table"><table><thead><tr><th>Status</th><th>Check</th><th>Message</th><th>Duration</th></tr></thead><tbody>{(tests.checks || []).map((check) => <tr key={check.name}><td><span className={`ops-badge ops-${check.status}`}>{check.status}</span></td><td>{check.name}</td><td>{check.message}</td><td>{check.durationMs}ms</td></tr>)}</tbody></table></div>}</section>
      <section className="admin-panel"><h2>Webhook tester</h2><p className="admin-muted">This sends a test payload only. Do not include secrets.</p><label><span>URL</span><input value={webhook.url} onChange={(event) => setWebhook((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/webhook" /></label><label><span>Event type</span><input value={webhook.eventType} onChange={(event) => setWebhook((current) => ({ ...current, eventType: event.target.value }))} /></label><label><span>JSON payload</span><textarea value={webhook.payload} rows="6" onChange={(event) => setWebhook((current) => ({ ...current, payload: event.target.value }))} /></label><button onClick={sendWebhook} disabled={loading || !webhook.url}>Send test webhook</button>{webhookResult && <pre className="ops-result">{JSON.stringify(webhookResult, null, 2)}</pre>}</section>
      <section className="admin-panel"><h2>Quick links</h2><div className="quick-links"><a href="/api/health">/api/health</a><a href="/api/readiness">/api/readiness</a><a href="/sitemap.xml">/sitemap.xml</a><a href="/robots.txt">/robots.txt</a></div></section>
    </>
  );
}
