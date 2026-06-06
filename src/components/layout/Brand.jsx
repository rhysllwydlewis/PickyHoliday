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

  const id = {
    shell: `${uid}-ph-shell`,
    shellSheen: `${uid}-ph-shell-sheen`,
    route: `${uid}-ph-route`,
    routeGlow: `${uid}-ph-route-glow`,
    accent: `${uid}-ph-accent`,
  };

  return (
    <button type="button" className={cls} onClick={handleLogoClick} aria-label="PickyHoliday home">
      <span className="brand-logo-mark" aria-hidden="true">
        <svg className="brand-logo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect className="brand-logo-shell" x="6" y="6" width="52" height="52" rx="18" fill={`url(#${id.shell})`} />
          <path className="brand-logo-shell-sheen" d="M15 17C24 11 41 11 50 18" stroke={`url(#${id.shellSheen})`} strokeWidth="4" strokeLinecap="round" />
          <path className="brand-logo-monogram-shadow" d="M22 47V18H35.5C43 18 48 22.5 48 29C48 35.5 43 40 35.5 40H22" stroke="rgba(5,24,56,0.24)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path className="brand-logo-route-glow" d="M22 47V18H35.5C43 18 48 22.5 48 29C48 35.5 43 40 35.5 40H22" stroke={`url(#${id.routeGlow})`} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="brand-logo-route" d="M22 47V18H35.5C43 18 48 22.5 48 29C48 35.5 43 40 35.5 40H22" stroke={`url(#${id.route})`} strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" />
          <path className="brand-logo-h-stem" d="M44 31V47" stroke="#FFD43F" strokeWidth="6.4" strokeLinecap="round" />
          <path className="brand-logo-h-bridge" d="M34 40H44" stroke="#FFD43F" strokeWidth="6.4" strokeLinecap="round" />
          <circle className="brand-logo-accent" cx="49" cy="18" r="5.3" fill={`url(#${id.accent})`} />
          <circle className="brand-logo-accent-core" cx="49" cy="18" r="2.1" fill="rgba(255,255,255,0.76)" />

          <defs>
            <linearGradient id={id.shell} x1="10" y1="9" x2="57" y2="58">
              <stop offset="0%" stopColor="#0A7AF2" />
              <stop offset="48%" stopColor="#075EDB" />
              <stop offset="100%" stopColor="#082A62" />
            </linearGradient>
            <linearGradient id={id.shellSheen} x1="15" y1="12" x2="50" y2="19">
              <stop offset="0%" stopColor="rgba(255,255,255,0.82)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
            <linearGradient id={id.route} x1="22" y1="18" x2="47" y2="45">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EAF8FF" />
            </linearGradient>
            <linearGradient id={id.routeGlow} x1="18" y1="18" x2="50" y2="48">
              <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
              <stop offset="100%" stopColor="rgba(106,231,255,0.16)" />
            </linearGradient>
            <radialGradient id={id.accent} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FFF4AA" />
              <stop offset="58%" stopColor="#FFD43F" />
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
