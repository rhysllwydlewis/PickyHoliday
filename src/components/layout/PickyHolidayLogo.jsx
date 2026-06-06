import React, { useEffect, useId, useState } from 'react';
import { scrollToId } from '../../app/appConstants.js';
import './PickyHolidayLogo.css';
import './PickyHolidayLogoFixes.css';

const logoIntroStorageKey = 'pickyholiday-layered-logo-intro-v1';

const layout = {
  pickyX: 26,
  hX: 252,
  sunX: 342,
  sunY: 92,
  lidayX: 379,
  domainX: 595,
};

const flightPath = 'M292 55 C354 25 440 18 506 27 C548 33 574 30 602 21';
let firstNavbarLogoRender = true;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldRunIntro(footer) {
  if (footer || !firstNavbarLogoRender || prefersReducedMotion()) return false;
  firstNavbarLogoRender = false;

  try {
    if (window.sessionStorage?.getItem(logoIntroStorageKey)) return false;
    window.sessionStorage?.setItem(logoIntroStorageKey, '1');
    return true;
  } catch {
    return true;
  }
}

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

function makeId(rawId, suffix) {
  return `${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}-${suffix}`;
}

function WordmarkClip({ sunRadius = 23 }) {
  return (
    <>
      <text x={layout.pickyX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">Picky</text>
      <text x={layout.hX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">H</text>
      <circle cx={layout.sunX} cy={layout.sunY} r={sunRadius} />
      <text x={layout.lidayX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">liday</text>
    </>
  );
}

export function Logo({ footer = false }) {
  const rawId = useId();
  const [runIntro, setRunIntro] = useState(() => shouldRunIntro(footer));
  const goldId = makeId(rawId, 'gold');
  const shimmerId = makeId(rawId, 'shimmer');
  const shimmerClipId = makeId(rawId, 'clip');
  const flightPathId = makeId(rawId, 'flight');
  const flightMaskId = makeId(rawId, 'flight-mask');

  useEffect(() => {
    if (prefersReducedMotion()) setRunIntro(false);
  }, []);

  const cls = [
    'brand-logo',
    'brand-logo--premium',
    footer ? 'brand-logo--footer' : '',
    runIntro && !footer ? 'brand-logo--intro' : 'brand-logo--settled',
  ].filter(Boolean).join(' ');

  const staticPlaneTransform = footer ? 'translate(602 21) rotate(-14)' : 'translate(602 21) rotate(-14)';

  return (
    <button type="button" className={cls} onClick={handleLogoClick} aria-label="PickyHoliday home">
      <span className="brand-logo-stage" aria-hidden="true">
        <svg className="pickyholiday-logo-svg" viewBox={footer ? '0 0 650 180' : '0 0 700 180'} focusable="false" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
          <defs>
            <path id={flightPathId} d={flightPath} />
            <radialGradient id={goldId} cx="34%" cy="28%" r="74%">
              <stop offset="0%" stopColor="#fff6bf" />
              <stop offset="46%" stopColor="#ffd451" />
              <stop offset="100%" stopColor="#ffad00" />
            </radialGradient>
            <linearGradient id={shimmerId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="48%" stopColor="#fff" stopOpacity="0" />
              <stop offset="52%" stopColor="#fff" stopOpacity="0.62" />
              <stop offset="58%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={flightMaskId} maskUnits="userSpaceOnUse" x="280" y="0" width="350" height="90">
              <path className="brand-logo-flight-reveal" d={flightPath} pathLength="240" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" />
            </mask>
            <clipPath id={shimmerClipId}>
              <WordmarkClip />
            </clipPath>
          </defs>

          <g className="brand-logo-wordmark">
            <text className="brand-logo-picky-text" x={layout.pickyX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">Picky</text>
            <text className="brand-logo-holiday-text" x={layout.hX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">H</text>
            <g className="brand-logo-sun" transform={`translate(${layout.sunX} ${layout.sunY})`}>
              <g className="brand-logo-sun-rays">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line key={angle} x1="0" y1="-30" x2="0" y2="-43" transform={`rotate(${angle})`} stroke="#ffb400" strokeWidth="5" strokeLinecap="round" />
                ))}
              </g>
              <circle className="brand-logo-sun-glow" r="23" fill={`url(#${goldId})`} />
              <circle className="brand-logo-sun-core" r="18" fill={`url(#${goldId})`} />
              <circle className="brand-logo-sun-sheen" cx="-6" cy="-7" r="7" fill="#fff8ce" opacity="0.56" />
            </g>
            <text className="brand-logo-holiday-text" x={layout.lidayX} y="122" fontFamily="Inter, Arial, sans-serif" fontSize="78" fontWeight="950" letterSpacing="-5.4">liday</text>
          </g>

          {!footer && <text className="brand-logo-domain" x={layout.domainX} y="113" fontFamily="Inter, Arial, sans-serif" fontSize="34" fontWeight="900" letterSpacing="-1.1">.co.uk</text>}

          <path className="brand-logo-underline" d="M24 145 C96 131 176 138 256 143" pathLength="260" fill="none" />
          <path className="brand-logo-flight-path" d={flightPath} pathLength="240" fill="none" mask={`url(#${flightMaskId})`} />

          <g className="brand-logo-plane">
            {runIntro && !footer && (
              <animateMotion dur="2.6s" begin="0.62s" fill="freeze" rotate="auto" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1">
                <mpath href={`#${flightPathId}`} xlinkHref={`#${flightPathId}`} />
              </animateMotion>
            )}
            <g className="brand-logo-plane-position" transform={runIntro && !footer ? undefined : staticPlaneTransform}>
              <g className="brand-logo-plane-shape" transform="scale(0.82)">
                <path d="M-5 -3 L-22 -30 Q-20 -34 -14 -32 L14 -5 Z" />
                <path d="M-5 3 L-22 30 Q-20 34 -14 32 L14 5 Z" />
                <path d="M-28 -4 L-43 -18 Q-40 -22 -35 -19 L-16 -6 Z" />
                <path d="M-28 4 L-43 18 Q-40 22 -35 19 L-16 6 Z" />
                <path d="M-31 -3 L-45 0 L-31 3 Z" />
                <path className="brand-logo-plane-body" d="M-34 -4 C-22 -8 12 -8 32 -3 Q39 -1 39 0 Q39 1 32 3 C12 8 -22 8 -34 4 Q-40 2 -40 0 Q-40 -2 -34 -4 Z" />
                <ellipse className="brand-logo-plane-engine" cx="-7" cy="-14" rx="5" ry="3.6" />
                <ellipse className="brand-logo-plane-engine" cx="-7" cy="14" rx="5" ry="3.6" />
                <path className="brand-logo-plane-window" d="M24 -2 Q32 -1 35 0 Q32 1 24 2 Z" />
              </g>
            </g>
          </g>

          <g className="brand-logo-shimmer" clipPath={`url(#${shimmerClipId})`}>
            <rect x="-150" y="28" width="96" height="116" rx="22" fill={`url(#${shimmerId})`} />
          </g>
        </svg>
      </span>
    </button>
  );
}
