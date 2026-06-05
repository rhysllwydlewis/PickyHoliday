import React, { useCallback, useEffect, useState } from 'react';
import { getAdminAnalyticsSummary, getBackendHealth, listAdminEnquiries, listAdminPromotedDeals } from '../../services/travelApi.js';
import { friendlyDate } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

export function AdminDashboardPanel({ token }) {
  const [state, setState] = useState({ enquiries: [], deals: [], health: {}, loadedAt: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enquiries, deals, health, analytics] = await Promise.all([
        listAdminEnquiries(token),
        listAdminPromotedDeals(token),
        getBackendHealth(),
        getAdminAnalyticsSummary(token),
      ]);
      setState({
        enquiries: enquiries.results || [],
        deals: deals.results || [],
        health: { ...health, analyticsSummary: analytics.summary || {} },
        loadedAt: new Date().toLocaleString('en-GB'),
      });
    } catch (dashboardError) {
      setError(dashboardError.message || 'Could not refresh dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const count = (status) => state.enquiries.filter((item) => item.status === status).length;
  const activeDeals = state.deals.filter((deal) => deal.status === 'active').length;
  const inactiveDeals = state.deals.filter((deal) => ['draft', 'paused'].includes(deal.status)).length;
  const cards = [
    ['Total enquiries', state.enquiries.length],
    ['New enquiries', count('new')],
    ['Reviewing', count('reviewing')],
    ['Contacted/quoted', count('contacted') + count('quoted')],
    ['Active promoted deals', activeDeals],
    ['Draft/paused deals', inactiveDeals],
    ['Storage mode', state.health.enquiryStorageMode || 'json'],
    ['Database status', state.health.databaseStatus || 'unknown'],
    ['Provider mode', state.health.providerMode || 'mock'],
    ['Analytics storage', state.health.analyticsStorageMode || 'json'],
    ['Last search event', state.health.analyticsSummary?.latestSearchTime ? friendlyDate(state.health.analyticsSummary.latestSearchTime) : 'none'],
    ['Last enquiry event', state.health.analyticsSummary?.latestEnquiryTime ? friendlyDate(state.health.analyticsSummary.latestEnquiryTime) : 'none'],
    ['Readiness', state.health.databaseStatus === 'json' || state.health.databaseStatus === 'postgres-ready' ? 'ready' : 'warning'],
    ['Request logging', state.health.observability?.requestLogging ? 'enabled' : 'disabled'],
    ['Rate limits', `${state.health.security?.publicRateLimitMax ?? '?'} public / ${state.health.security?.adminRateLimitMax ?? '?'} admin`],
  ];

  return (
    <>
      <AdminPageTitle
        kicker="Admin cockpit"
        title="Dashboard"
        copy="Operational snapshot for enquiries, promoted deals and safe provider/storage status."
        action={<button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>}
      />
      {error && <div className="error-state">{error}</div>}
      <div className="admin-cards">
        {cards.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}
      </div>
      <p className="admin-muted">Last refreshed: {state.loadedAt || 'Not yet refreshed'}.</p>
    </>
  );
}
