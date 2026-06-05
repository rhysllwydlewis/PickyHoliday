import React, { useEffect, useRef, useState } from 'react';
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

const tabletVisibleNavCount = 3;

export function Header({ onAction, onSignIn }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const nav = Object.keys(navTargets);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };

    const handleOutsideClick = (event) => {
      if (menuRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return;
      setMobileOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [mobileOpen]);

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

  const handleStartPlanning = () => {
    setMobileOpen(false);
    scrollToId('search');
  };

  return (
    <header className="topbar" id="top">
      <div className="navwrap">
        <Logo />
        <nav className="primary-nav" aria-label="Primary navigation">
          {nav.map((label, index) => (
            <button type="button" className={index >= tabletVisibleNavCount ? 'nav-link nav-link-secondary' : 'nav-link'} key={label} onClick={() => handleNav(label)}>
              <span>{label}</span>
              {index !== 3 && <ChevronDown className="nav-chevron" size={14} />}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="signin glass-button"
          onClick={handleSignIn}
        >
          <span className="button-glow" aria-hidden="true" />
          <Users size={19} /> <span>Sign in</span>
        </button>
        <button type="button" className="start glass-button" onClick={handleStartPlanning}>
          <span className="button-glow" aria-hidden="true" />
          <BriefcaseBusiness size={17} /> <span>Start planning</span>
        </button>
        <button
          ref={menuButtonRef}
          type="button"
          className="mobile"
          onClick={() => setMobileOpen((open) => !open)}
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {mobileOpen && (
        <nav className="mobile-menu" id="mobile-navigation" ref={menuRef} aria-label="Collapsed navigation">
          {nav.map((label, index) => (
            <button type="button" className={index < tabletVisibleNavCount ? 'mobile-link tablet-menu-duplicate' : 'mobile-link'} key={label} onClick={() => handleNav(label)}>
              <span>{label}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="mobile-signin" onClick={handleSignIn}>
            <Users size={17} aria-hidden="true" />
            <span>Sign in</span>
          </button>
          <button type="button" className="mobile-start" onClick={handleStartPlanning}>
            <BriefcaseBusiness size={17} aria-hidden="true" />
            <span>Start planning</span>
          </button>
        </nav>
      )}
    </header>
  );
}
