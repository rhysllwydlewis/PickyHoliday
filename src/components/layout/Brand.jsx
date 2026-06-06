import React, { useEffect, useId, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { scrollToId } from '../../app/appConstants.js';
import './BrandLogoPolish.css';

function handleLogoClick() {
  const path = window.location.pathname;
  const isHome = path === '/' || path === '' || path === '/index.html';
  if (isHome) {
    scrollToId('top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.assign('/');
  }
}

let firstNavbarLogoRender = true;

function shouldRunLogoIntro(footer) {
  if (footer || !firstNavbarLogoRender) return false;
  firstNavbarLogoRender = false;
  try {
    const key = 'pickyholiday-logo-intro-seen';
    if (window.sessionStorage?.getItem(key)) return false;
    window.sessionStorage?.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

export function Logo({ footer = false }) {
  const uid = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const [runIntro, setRunIntro] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    setReady(true);
    if (!didRun.current && shouldRunLogoIntro(footer)) {
      didRun.current = true;
      setRunIntro(true);
    }
  }, [footer]);

  const cls = [
    'brand-logo',
    'brand-logo--premium',
    footer ? 'brand-logo--footer' : '',
    ready && runIntro ? 'brand-logo--intro' : '',
    ready && !runIntro ? 'brand-logo--settled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const gId = { badge: `${uid}-badge`, accent: `${uid}-acc` };

  return (
    <button type="button" className={cls} onClick={handleLogoClick} aria-label="PickyHoliday home">
      {/* Logo mark — aria-hidden because the button label covers it */}
      <span className="brand-logo-mark" aria-hidden="true">
        <svg
          className="brand-logo-svg"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Badge — rounded square, deep navy */}
          <rect
            className="brand-logo-badge"
            x="4" y="4" width="56" height="56" rx="16"
            fill={`url(#${gId.badge})`}
          />

          {/*
            P route stroke — the single brand mark.
            Traces a clean P letterform starting at the bottom of the stem,
            going up, curving around the bowl, and returning to the stem.
            pathLength="200" normalises dasharray across browsers.
          */}
          <path
            className="brand-logo-route"
            d="M 20 48 L 20 17 H 33 Q 47 17 47 27 Q 47 37 33 37 H 20"
            stroke="white"
            strokeWidth="5.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="200"
          />

          {/*
            Gold accent — the route destination / sun.
            Positioned top-right, clearly outside the P stroke so it reads as
            a distinct brand element even at 32 px.
          */}
          <circle
            className="brand-logo-accent"
            cx="49" cy="14" r="5.8"
            fill={`url(#${gId.accent})`}
          />

          <defs>
            <linearGradient id={gId.badge} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1168F7" />
              <stop offset="100%" stopColor="#082A62" />
            </linearGradient>
            <radialGradient id={gId.accent} cx="35%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFF0A0" />
              <stop offset="55%" stopColor="#FFD43F" />
              <stop offset="100%" stopColor="#FFB400" />
            </radialGradient>
          </defs>
        </svg>
      </span>

      <span className="brand-logo-wordmark">
        <span className="brand-logo-picky">Picky</span>
        <span className="brand-logo-holiday">Holiday</span>
        {!footer && <span className="brand-logo-tld">.co.uk</span>}
      </span>
    </button>
  );
}

export function Stars({ small = false }) {
  return (
    <div className={small ? 'stars small' : 'stars'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} fill="currentColor" />
      ))}
    </div>
  );
}
