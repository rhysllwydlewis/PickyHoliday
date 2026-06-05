import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { scrollToId } from '../../app/appConstants.js';

/* Navigate home or scroll-to-top depending on current page */
function handleLogoClick() {
  const path = window.location.pathname;
  const isHome = path === '/' || path === '' || path === '/index.html';
  if (isHome) {
    scrollToId('top') || window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.assign('/');
  }
}

/* Detect first render to gate the intro animation */
let _firstRender = true;

export function Logo({ footer = false }) {
  const [ready, setReady] = useState(false);
  const [runIntro, setRunIntro] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    /* Mark layout-stable so CSS transitions have a base to animate from */
    setReady(true);
    if (_firstRender && !didRun.current) {
      _firstRender = false;
      didRun.current = true;
      setRunIntro(true);
    }
  }, []);

  const cls = [
    'brand-logo',
    footer ? 'brand-logo--footer' : '',
    ready && runIntro ? 'brand-logo--intro' : '',
    ready && !runIntro ? 'brand-logo--settled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={handleLogoClick}
      aria-label="PickyHoliday home"
    >
      {/* ── Logo mark ── */}
      <span className="brand-logo-mark" aria-hidden="true">
        <svg
          className="brand-logo-svg"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glass circle backing */}
          <circle cx="22" cy="22" r="20" fill="url(#mark-bg)" />
          <circle cx="22" cy="22" r="20" fill="url(#mark-glow)" opacity="0.55" />
          <circle cx="22" cy="22" r="19.5" stroke="rgba(255,255,255,0.72)" strokeWidth="1" />

          {/* Sun */}
          <circle className="brand-logo-sun" cx="22" cy="19" r="5" fill="url(#sun-grad)" />
          {/* Sun rays */}
          {[0,45,90,135,180,225,270,315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 22 + Math.cos(rad) * 7;
            const y1 = 19 + Math.sin(rad) * 7;
            const x2 = 22 + Math.cos(rad) * 9.5;
            const y2 = 19 + Math.sin(rad) * 9.5;
            return (
              <line
                key={i}
                className="brand-logo-ray"
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#FFD040"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ animationDelay: `${0.8 + i * 0.04}s` }}
              />
            );
          })}

          {/* Horizon / ground line */}
          <path d="M8 30 Q22 26 36 30" stroke="rgba(7,94,219,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* Location pin */}
          <path
            className="brand-logo-pin"
            d="M22 34 C22 34 15.5 27 15.5 23 C15.5 19.41 18.41 17 22 17 C25.59 17 28.5 19.41 28.5 23 C28.5 27 22 34 22 34Z"
            fill="url(#pin-grad)"
            opacity="0.92"
          />
          <circle cx="22" cy="23" r="2.5" fill="white" opacity="0.9" />

          {/* Plane (animated along route) */}
          <g className="brand-logo-plane">
            <path d="M0,-1.8 L2.5,1 L0,0.4 L-2.5,1 Z" fill="white" opacity="0.95" />
          </g>

          {/* Sparkle dots */}
          <circle className="brand-logo-spark brand-logo-spark--a" cx="10" cy="14" r="1.2" fill="#FFD040" />
          <circle className="brand-logo-spark brand-logo-spark--b" cx="34" cy="12" r="1" fill="#FFD040" />
          <circle className="brand-logo-spark brand-logo-spark--c" cx="36" cy="28" r="0.9" fill="rgba(255,255,255,0.9)" />

          {/* Gradients */}
          <defs>
            <radialGradient id="mark-bg" cx="38%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2478F0" />
              <stop offset="100%" stopColor="#082a62" />
            </radialGradient>
            <radialGradient id="mark-glow" cx="50%" cy="10%" r="60%">
              <stop offset="0%" stopColor="rgba(255,200,60,0.5)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="sun-grad" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFE566" />
              <stop offset="100%" stopColor="#FFB000" />
            </radialGradient>
            <linearGradient id="pin-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5F6D" />
              <stop offset="100%" stopColor="#C1121F" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      {/* ── Wordmark ── */}
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
