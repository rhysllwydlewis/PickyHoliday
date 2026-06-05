import { captureAnalyticsEvent } from '../services/travelApi.js';
import { imageUrls } from '../data/mockDeals.js';
import { validatePartnerUrl } from '../services/partners/partnerDeepLinks.js';
import { departureAirportGroups, departureAirports } from '../data/travelOptions.js';

export const img = (id) => imageUrls[id] || id;
export const hasPricedAmount = (deal) => Number(deal?.priceFrom || 0) > 0;
export const formatPrice = (deal) => `${deal.currency === 'GBP' ? '£' : deal.currency}${deal.priceFrom}`;
export const priceCopy = (deal) => (hasPricedAmount(deal) ? formatPrice(deal) : 'Check live price');
export const dealPlace = (deal) => `${deal.destination}, ${deal.country}`;
export const showProviderDiagnostics = import.meta.env.VITE_SHOW_PROVIDER_DIAGNOSTICS === 'true';
export const showDemoDeals = import.meta.env.VITE_SHOW_DEMO_DEALS === 'true';
export const defaultFeatureFlags = {
  showProviderDiagnostics: false,
  enablePromotedDeals: true,
  enableAffiliateRedirects: true,
  enableDuffelSearch: true,
  enableAmadeusSecondary: false,
  enableNewsletterSignupPlaceholder: true,
  enableAnnouncementBanner: false,
  enableAdminDebugPanel: false,
};
export const defaultSiteConfig = {
  hero: {},
  newsletter: {},
  footer: {},
  trust: {},
  announcement: {},
  featureFlags: defaultFeatureFlags,
};
export const isSafePartnerRedirectUrl = (deal = {}) => validatePartnerUrl(deal.partnerUrl, deal.partnerId || undefined);
export const adminPaths = ['/admin', '/admin/login', '/admin/enquiries', '/admin/deals', '/admin/pages', '/admin/content', '/admin/features', '/admin/settings', '/admin/ops'];
export const adminTokenStorageKey = 'pickyholiday-admin-token';
export const enquiryStatuses = ['new', 'reviewing', 'contacted', 'quoted', 'closed'];
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const friendlyDate = (value) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded');
export const trackEvent = (payload) => { captureAnalyticsEvent({ path: window.location.pathname, ...payload }).catch(() => {}); };
export const readAdminToken = () => {
  try { return window.sessionStorage.getItem(adminTokenStorageKey) || ''; } catch (error) { return ''; }
};
export const saveAdminToken = (token) => { window.sessionStorage.setItem(adminTokenStorageKey, token); };
export const clearAdminToken = () => {
  try { window.sessionStorage.removeItem(adminTokenStorageKey); } catch (error) {}
};
export const defaultOriginAirport = departureAirports[0]?.value || 'London (All Airports)';
export const fieldOptions = {
  origin: departureAirportGroups,
  flexibility: [
    { label: 'Exact dates', value: 0 },
    { label: '±1 day', value: 1 },
    { label: '±2 days', value: 2 },
    { label: '±3 days', value: 3 },
    { label: '±7 days', value: 7 },
  ],
};
export const getawaySearchConfig = {
  'Family getaways': { tab: 'Families', destination: 'Families' },
  'Villas for groups': { tab: 'Villas', destination: 'Villas' },
  'Stag & hen trips': { tab: 'Stag & Hen', destination: 'Stag & Hen' },
};
export function mergeHolidayResults(...resultSets) {
  const seen = new Set();
  return resultSets.flat().filter((result) => {
    const id = result?.id || result?.resultId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
export function rotateList(list, direction) {
  if (list.length < 2) return list;
  if (direction === 'next') return [...list.slice(1), list[0]];
  return [list[list.length - 1], ...list.slice(0, -1)];
}
export function scrollToId(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
