import React from 'react';
import { BadgeCheck, Clock3, LockKeyhole, ShieldCheck, ShipWheel, Users } from 'lucide-react';
import { footerWidgetCopy } from '../../data/footerWidgets.js';
import { contentPathForSlug, defaultPublicLinks, labelFromSlug } from '../../services/seo/seoMeta.js';
import { defaultSiteConfig } from '../../app/appConstants.js';
import { Logo } from './Brand.jsx';

const footerSearchUrl = ({ intent = 'Holidays', destination = '' } = {}) => `/?${new URLSearchParams({ intent, ...(destination ? { destination } : {}) }).toString()}#search`;

function footerWidgetFor(label, onSignIn) {
  const content = footerWidgetCopy[label] || {
    kicker: 'PickyHoliday',
    title: label,
    body: `Open ${label.toLowerCase()} options, useful links and next steps for group holiday planning.`,
    bullets: ['Explore relevant group holiday ideas.', 'Save an enquiry when you need advisor follow-up.', 'Enquiries stay saved until you choose a next step.'],
  };
  const actions = [];

  if (content.search) {
    actions.push({
      label: content.searchActionLabel || 'Start matching search',
      onClick: () => window.location.assign(footerSearchUrl(content.search)),
    });
  }

  if (content.guideSlug) {
    actions.push({
      label: content.guideActionLabel || 'Open related guide',
      onClick: () => window.location.assign(contentPathForSlug(content.guideSlug)),
    });
  }

  if (content.admin) {
    actions.push({
      label: 'Owner sign in',
      onClick: () => (onSignIn ? onSignIn() : window.location.assign('/admin/login')),
    });
  }

  return {
    kicker: content.kicker,
    title: content.title,
    body: content.body,
    bullets: content.bullets,
    actions: actions.length ? actions : undefined,
    closeLabel: content.closeLabel || `Close ${label} widget`,
  };
}

export function Footer({ onAction, onSignIn, siteConfig = defaultSiteConfig }) {
  const currentYear = new Date().getFullYear();
  const cols = [
    ['Plan', ['Holidays', 'Villas', 'Group hotel stays', 'Stag & Hen', 'Families']],
    ['Destinations', defaultPublicLinks.destinations.map(labelFromSlug)],
    ['Group holidays', defaultPublicLinks.groups.map(labelFromSlug)],
    ['Guides', defaultPublicLinks.guides.map(labelFromSlug)],
    ['Help', ['Help Centre', 'Manage enquiries', 'How quotes work', 'FAQs']],
    ['About PickyHoliday', ['About us', 'Careers', 'Terms & Conditions', 'Privacy Policy']],
  ];

  return (
    <footer id="footer">
      <div className="footer-glow footer-glow-gold" aria-hidden="true" />
      <div className="footer-glow footer-glow-blue" aria-hidden="true" />
      <div className="footer-promise content">
        <span><BadgeCheck /> Enquiry-first, advisor-led</span>
        <span><Users /> Built for groups, mates and families</span>
        <button onClick={() => onAction(footerWidgetFor('Footer promise', onSignIn))}>How PickyHoliday works</button>
      </div>
      <div className="foot content">
        <div className="brand">
          <Logo footer />
          <p>{siteConfig.footer?.shortDescription || 'Group holidays made easy.'}</p>
          <div className="footer-trust-pills" aria-label="PickyHoliday safeguards">
            <span><ShieldCheck /> Enquiry-first</span>
            <span><LockKeyhole /> Secure follow-up</span>
            <span><Clock3 /> Advisor support</span>
          </div>
          <span>Follow us</span>
          <div className="social">
            <button aria-label="Facebook community" onClick={() => onAction(footerWidgetFor('Facebook', onSignIn))}><i>f</i></button>
            <button aria-label="Instagram inspiration feed" onClick={() => onAction(footerWidgetFor('Instagram', onSignIn))}><i>◎</i></button>
            <button aria-label="Travel wheel" onClick={() => onAction(footerWidgetFor('Travel wheel', onSignIn))}><ShipWheel /></button>
            <button aria-label="Video guides" onClick={() => onAction(footerWidgetFor('Video guides', onSignIn))}><i>▶</i></button>
          </div>
        </div>
        {cols.map(([heading, links]) => (
          <div className="fcol" key={heading}>
            <h3>{heading}</h3>
            {links.map((link) => {
              const slug = link.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              const prefix = heading === 'Destinations' ? '/destinations/' : heading === 'Group holidays' ? '/group-holidays/' : heading === 'Guides' ? '/guides/' : '';
              return prefix ? <a key={link} href={`${prefix}${slug}`}>{link}</a> : <button key={link} onClick={() => onAction(footerWidgetFor(link, onSignIn))}>{link}</button>;
            })}
          </div>
        ))}
        <div className="apps">
          <span className="footer-kicker">Group travel hub</span>
          <h3>Keep the whole group in sync</h3>
          <p>Manage saved enquiries, destination shortlists and advisor updates from one place.</p>
          <div className="app-buttons">
            <button aria-label="App Store placeholder" onClick={() => onAction(footerWidgetFor('App Store', onSignIn))}> App Store</button>
            <button aria-label="Google Play placeholder" onClick={() => onAction(footerWidgetFor('Google Play', onSignIn))}>▶ Google Play</button>
          </div>
          <button className="footer-cta" onClick={() => onAction(footerWidgetFor('Ask for a group quote', onSignIn))}>Ask for a group quote</button>
        </div>
      </div>
      <div className="copy content">
        <p>© {currentYear} PickyHoliday.co.uk. All rights retained.</p>
        <span><ShieldCheck /> Enquiry-first planning</span>
        <span><ShieldCheck /> Secure enquiries</span>
        <span><Clock3 /> 24/7 support</span>
        <button onClick={() => (onSignIn ? onSignIn() : onAction('Sign in', 'Open the sign in widget from the header to access the owner admin dashboard. Customer accounts are not live yet.'))}>Sign in</button>
      </div>
    </footer>
  );
}



