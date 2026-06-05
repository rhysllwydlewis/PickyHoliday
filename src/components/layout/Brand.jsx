import React, { useEffect, useId, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { scrollToId } from '../../app/appConstants.js';

/* Navigate home or scroll-to-top depending on current page */
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

/* Intro animation runs once for the first Logo that mounts (the navbar) */
let _firstRender = true;

export function Logo({ footer = false }) {
  const uid = useId().replace(/:/g, '');   // unique per instance — no gradient ID collisions
  const [ready, setReady] = useState(false);
  const [runIntro, setRunIntro] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
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

  const id = {
    bg: `${uid}-bg`,
    glow: `${uid}-glow`,
    sun: `${uid}-sun`,
    pin: `${uid}-pin`,
  };

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
          {/* Glass circle */}
          <circle cx="22" cy="22" r="20" fill={`url(#${id.bg})`} />
          <circle cx="22" cy="22" r="20" fill={`url(#${id.glow})`} opacity="0.55" />
          <circle cx="22" cy="22" r="19.5" stroke="rgba(255,255,255,0.72)" strokeWidth="1" />

          {/* Sun disc */}
          <circle className="brand-logo-sun" cx="22" cy="18" r="5.2" fill={`url(#${id.sun})`} />

          {/* Sun rays — simple lines, fade-only animation */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const r = (deg * Math.PI) / 180;
            return (
              <line
                key={i}
                className="brand-logo-ray"
                x1={22 + Math.cos(r) * 7.4}
                y1={18 + Math.sin(r) * 7.4}
                x2={22 + Math.cos(r) * 10}
                y2={18 + Math.sin(r) * 10}
                stroke="#FFD040"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ animationDelay: `${0.78 + i * 0.045}s` }}
              />
            );
          })}

          {/* Horizon arc */}
          <path d="M7 30 Q22 26 37 30" stroke="rgba(7,94,219,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* Location pin */}
          <path
            className="brand-logo-pin"
            d="M22 34C22 34 15 26.5 15 22.5C15 18.91 18.13 16 22 16C25.87 16 29 18.91 29 22.5C29 26.5 22 34 22 34Z"
            fill={`url(#${id.pin})`}
            opacity="0.92"
          />
          <circle cx="22" cy="22.5" r="2.6" fill="white" opacity="0.9" />

          {/* Plane — centered at (22,22) so CSS translate sweeps across the mark */}
          <g className="brand-logo-plane" transform="translate(22 22)">
            <path d="M0,-2 L3,1.2 L0,0.5 L-3,1.2 Z" fill="white" opacity="0.95" />
          </g>

          {/* Sparkles */}
          <circle className="brand-logo-spark brand-logo-spark--a" cx="10" cy="13" r="1.2" fill="#FFD040" />
          <circle className="brand-logo-spark brand-logo-spark--b" cx="34" cy="11" r="1" fill="#FFD040" />
          <circle className="brand-logo-spark brand-logo-spark--c" cx="36" cy="29" r="0.9" fill="rgba(255,255,255,0.9)" />

          <defs>
            <radialGradient id={id.bg} cx="38%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2478F0" />
              <stop offset="100%" stopColor="#082a62" />
            </radialGradient>
            <radialGradient id={id.glow} cx="50%" cy="10%" r="60%">
              <stop offset="0%" stopColor="rgba(255,200,60,0.5)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id={id.sun} cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFE566" />
              <stop offset="100%" stopColor="#FFB000" />
            </radialGradient>
            <linearGradient id={id.pin} x1="0" y1="0" x2="0" y2="1">
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
