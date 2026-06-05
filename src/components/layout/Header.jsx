import React, { useState } from 'react';
import { BriefcaseBusiness, ChevronDown, ChevronRight, Menu, Users, X } from 'lucide-react';
import { scrollToId } from '../../app/appConstants.js';
import { Logo } from './Brand.jsx';

const navTargets = {
  Holidays: 'deals',
  Destinations: '/destinations/barcelona',
  'Group Types': '/group-holidays/stag-and-hen',
  Deals: 'deals',
  Inspiration: '/guides/best-group-holiday-destinations',
  Support: 'footer',
};

export function Header({ onAction, onSignIn }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = Object.keys(navTargets);

  const handleNav = (label) => {
    setMobileOpen(false);
    const target = navTargets[label];
    if (target?.startsWith('/')) window.location.assign(target);
    else scrollToId(target);
  };

  const handleSignIn = () => {
    setMobileOpen(false);
    if (onSignIn) onSignIn();
    else window.location.assign('/admin/login');
  };

  return (
    <header className="topbar" id="top">
      <div className="navwrap">
        <Logo />
        <nav className="primary-nav" aria-label="Primary navigation">
          {nav.map((label, index) => (
            <button className="nav-link" key={label} onClick={() => handleNav(label)}>
              <span>{label}</span>
              {index !== 3 && <ChevronDown className="nav-chevron" size={14} />}
            </button>
          ))}
        </nav>
        <button
          className="signin glass-button"
          onClick={handleSignIn}
        >
          <span className="button-glow" aria-hidden="true" />
          <Users size={19} /> <span>Sign in</span>
        </button>
        <button className="start glass-button" onClick={() => scrollToId('search')}>
          <span className="button-glow" aria-hidden="true" />
          <BriefcaseBusiness size={17} /> <span>Start planning</span>
        </button>
        <button
          className="mobile"
          onClick={() => setMobileOpen((open) => !open)}
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
      {mobileOpen && (
        <div className="mobile-menu" id="mobile-navigation">
          {nav.map((label) => (
            <button className="mobile-link" key={label} onClick={() => handleNav(label)}>
              <span>{label}</span>
              <ChevronRight size={16} />
            </button>
          ))}
          <button className="mobile-signin" onClick={handleSignIn}>
            <Users size={17} />
            <span>Sign in</span>
          </button>
          <button className="mobile-start" onClick={() => { setMobileOpen(false); scrollToId('search'); }}>
            <BriefcaseBusiness size={17} />
            <span>Start planning</span>
          </button>
        </div>
      )}
    </header>
  );
}

