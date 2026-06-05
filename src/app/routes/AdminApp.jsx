import React, { useEffect, useState } from 'react';
import { Logo } from '../../components/layout/Brand.jsx';
import { AdminSignInForm } from '../../components/ui/Dialog.jsx';
import { clearAdminToken, readAdminToken } from '../appConstants.js';
import { AdminLayout } from '../admin/AdminShared.jsx';
import { AdminDashboardPanel } from '../admin/AdminDashboardPanel.jsx';
import { AdminEnquiriesPanel } from '../admin/AdminEnquiriesPanel.jsx';
import { AdminDealsPanel } from '../admin/AdminDealsPanel.jsx';
import { AdminContentPagesPanel } from '../admin/AdminContentPagesPanel.jsx';
import { AdminContentPanel } from '../admin/AdminContentPanel.jsx';
import { AdminOpsPanel } from '../admin/AdminOpsPanel.jsx';
import { AdminSettingsPanel } from '../admin/AdminSettingsPanel.jsx';

export function AdminLoginApp() {
  return (
    <main className="admin-page admin-login">
      <section className="admin-login-card">
        <Logo />
        <AdminSignInForm onClose={() => window.location.assign('/')} />
      </section>
    </main>
  );
}

export function AdminApp() {
  const [token, setToken] = useState(readAdminToken);

  useEffect(() => {
    if (!token) window.location.replace('/admin/login');
  }, [token]);

  const logout = () => {
    clearAdminToken();
    setToken('');
    window.location.assign('/admin/login');
  };

  if (!token) return null;

  const path = window.location.pathname;
  let panel = <AdminDashboardPanel token={token} />;
  if (path === '/admin/enquiries') panel = <AdminEnquiriesPanel token={token} />;
  if (path === '/admin/deals') panel = <AdminDealsPanel token={token} />;
  if (path === '/admin/pages') panel = <AdminContentPagesPanel token={token} />;
  if (path === '/admin/content') panel = <AdminContentPanel token={token} />;
  if (path === '/admin/features') panel = <AdminContentPanel token={token} featureOnly />;
  if (path === '/admin/ops') panel = <AdminOpsPanel token={token} />;
  if (path === '/admin/settings') panel = <AdminSettingsPanel />;

  return <AdminLayout onLogout={logout}>{panel}</AdminLayout>;

}
