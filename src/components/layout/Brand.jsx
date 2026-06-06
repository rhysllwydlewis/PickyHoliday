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
    shell: `${uid}-shell`,
    shellGlow: `${uid}-shell-glow`,
    sun: `${uid}-sun`,
    sea: `${uid}-sea`,
    route: `${uid}-route`,
    word: `${uid}-word`,
  };

  return (
    <button type="button" className={cls} onClick={handleLogoClick} aria-label="PickyHoliday home">
      <span className="brand-logo-mark" aria-hidden="true">
        <svg className="brand-logo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect className="brand-logo-shell" x="6" y="6" width="52" height="52" rx="17" fill={`url(#${id.shell})`} />
          <rect x="7.2" y="7.2" width="49.6" height="49.6" rx="15.8" stroke="rgba(255,255,255,0.78)" strokeWidth="1.4" />
          <path className="brand-logo-glass" d="M13 15C23 8 40 8 51 17" stroke={`url(#${id.shellGlow})`} strokeWidth="4" strokeLinecap="round" opacity="0.8" />

          <g className="brand-logo-sun">
            <circle cx="44" cy="21" r="7" fill={`url(#${id.sun})`} />
            <path className="brand-logo-ray" d="M44 9V5.8M44 36.2V33M56.2 21H59.4M28.6 21H31.8M52.6 12.4L54.9 10.1M33.1 31.9L35.4 29.6M52.6 29.6L54.9 31.9M33.1 10.1L35.4 12.4" stroke="#FFD65A" strokeWidth="2" strokeLinecap="round" />
          </g>

          <path className="brand-logo-horizon" d="M14 36C23.5 30.8 35.5 30.8 50 36" stroke="rgba(255,255,255,0.88)" strokeWidth="3" strokeLinecap="round" />
          <path className="brand-logo-sea brand-logo-sea--one" d="M14 41C21 37.8 28 37.8 35 41C40.4 43.5 45.4 43.5 51 41" stroke={`url(#${id.sea})`} strokeWidth="3" strokeLinecap="round" />
          <path className="brand-logo-sea brand-logo-sea--two" d="M16 47C23 44.2 30 44.2 37 47C42.2 49 46.5 49 51 47" stroke="rgba(255,255,255,0.78)" strokeWidth="2.4" strokeLinecap="round" />

          <path className="brand-logo-route" d="M17 49C21 33 30.5 22.2 43 17" stroke={`url(#${id.route})`} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="3.5 5" />
          <g className="brand-logo-plane" transform="translate(43 17) rotate(-24)">
            <path d="M0 -5.8L12 0L0 5.8L2.7 0L0 -5.8Z" fill="white" />
            <path d="M2.7 0H-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle className="brand-logo-dot brand-logo-dot--start" cx="17" cy="49" r="2.1" fill="#FFE07A" />
          <circle className="brand-logo-dot brand-logo-dot--end" cx="43" cy="17" r="2.2" fill="white" />

          <defs>
            <linearGradient id={id.shell} x1="10" y1="10" x2="56" y2="58">
              <stop offset="0%" stopColor="#0B78F0" />
              <stop offset="48%" stopColor="#075EDB" />
              <stop offset="100%" stopColor="#082A62" />
            </linearGradient>
            <linearGradient id={id.shellGlow} x1="12" y1="10" x2="50" y2="20">
              <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
            </linearGradient>
            <radialGradient id={id.sun} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FFF3A8" />
              <stop offset="58%" stopColor="#FFD43F" />
              <stop offset="100%" stopColor="#FFB000" />
            </radialGradient>
            <linearGradient id={id.sea} x1="14" y1="39" x2="51" y2="43">
              <stop offset="0%" stopColor="#EAF8FF" />
              <stop offset="100%" stopColor="#6AE7FF" />
            </linearGradient>
            <linearGradient id={id.route} x1="17" y1="49" x2="43" y2="17">
              <stop offset="0%" stopColor="#FFE07A" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <linearGradient id={id.word} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#075EDB" />
              <stop offset="100%" stopColor="#082A62" />
            </linearGradient>
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
