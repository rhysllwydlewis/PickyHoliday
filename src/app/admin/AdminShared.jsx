import React from 'react';
import { Logo } from '../../components/layout/Brand.jsx';

export const adminNav = [
  ['Dashboard', '/admin'],
  ['Enquiries', '/admin/enquiries'],
  ['Promoted Deals', '/admin/deals'],
  ['Pages', '/admin/pages'],
  ['Site Content', '/admin/content'],
  ['Feature Flags', '/admin/features'],
  ['Operations', '/admin/ops'],
  ['Settings', '/admin/settings'],
];

export function AdminPageTitle({ kicker, title, copy, action }) {
  return (
    <div className="admin-title">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminLayout({ children, onLogout }) {
  const path = window.location.pathname;

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Logo />
        <nav aria-label="Admin navigation">
          {adminNav.map(([label, href]) => <a key={href} className={path === href ? 'active' : ''} href={href}>{label}</a>)}
        </nav>
        <button className="admin-logout" onClick={onLogout}>Log out</button>
      </aside>
      <section className="admin-shell admin-dashboard-shell">{children}</section>
    </main>
  );
}
