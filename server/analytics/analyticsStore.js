import crypto from 'node:crypto';
import * as jsonStore from './jsonAnalyticsStore.js';
import * as postgresStore from './postgresAnalyticsStore.js';

export const ANALYTICS_EVENT_TYPES = [
  'search_submitted',
  'enquiry_created',
  'partner_redirect_clicked',
  'content_page_view',
  'enquiry_form_opened',
  'admin_login_success',
  'admin_login_failed',
  'admin_status_update',
  'admin_promoted_deal_saved',
  'admin_content_page_saved',
  'api_provider_error',
  'webhook_test_sent',
  'system_test_run',
  'shortlist_added',
  'shortlist_removed',
  'shortlist_opened',
  'quote_builder_started',
  'quote_builder_submitted',
];

export const PUBLIC_ANALYTICS_EVENT_TYPES = ['search_submitted', 'partner_redirect_clicked', 'content_page_view', 'enquiry_form_opened', 'shortlist_added', 'shortlist_removed', 'shortlist_opened', 'quote_builder_started', 'quote_builder_submitted', 'spotlight_deal_viewed', 'spotlight_deal_clicked', 'composed_search_submitted', 'composed_search_results_viewed', 'composed_search_filter_changed', 'composed_search_sort_changed'];

const secretKeyPattern = /(token|secret|password|database|authorization|access[_-]?key|api[_-]?key|client[_-]?secret|url)$/i;
const secretValuePattern = /(postgres(?:ql)?:\/\/|bearer\s+|duffel_|amadeus|admin_access_token|database_url)/i;
const mode = () => (process.env.ANALYTICS_STORAGE_MODE || 'json').toLowerCase() === 'postgres' ? 'postgres' : 'json';
const selectedStore = () => (mode() === 'postgres' ? postgresStore : jsonStore);

const safeString = (value, max = 180) => (typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').trim().slice(0, max) : '');

export const sanitiseMetadata = (metadata = {}, depth = 0) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || depth > 2) return {};
  return Object.fromEntries(Object.entries(metadata).flatMap(([key, value]) => {
    const safeKey = safeString(key, 60);
    if (!safeKey || secretKeyPattern.test(safeKey)) return [];
    if (typeof value === 'string') {
      if (secretValuePattern.test(value)) return [];
      return [[safeKey, safeString(value, 220)]];
    }
    if (typeof value === 'number' || typeof value === 'boolean') return [[safeKey, value]];
    if (value && typeof value === 'object' && !Array.isArray(value)) return [[safeKey, sanitiseMetadata(value, depth + 1)]];
    if (Array.isArray(value)) return [[safeKey, value.slice(0, 10).map((item) => (typeof item === 'string' ? safeString(item, 80) : item)).filter((item) => ['string', 'number', 'boolean'].includes(typeof item))]];
    return [];
  }));
};

export const anonymiseIp = (ip = '') => {
  const value = `${ip}`.trim();
  if (!value) return '';
  return crypto.createHash('sha256').update(`${process.env.ANALYTICS_IP_HASH_SALT || 'pickyholiday'}:${value}`).digest('hex').slice(0, 24);
};

export const summariseUserAgent = (ua = '') => safeString(ua, 160).replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

export async function recordAnalyticsEvent(input = {}) {
  if (!ANALYTICS_EVENT_TYPES.includes(input.type)) {
    const error = new Error('Unsupported analytics event type.');
    error.status = 400;
    throw error;
  }
  const event = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: input.type,
    category: safeString(input.category, 80),
    label: safeString(input.label, 160),
    path: safeString(input.path, 220),
    provider: safeString(input.provider, 80),
    requestId: safeString(input.requestId, 128),
    metadata: sanitiseMetadata(input.metadata || {}),
    anonymisedIp: safeString(input.anonymisedIp || input.ipHash, 80),
    userAgentSummary: safeString(input.userAgentSummary, 160),
  };
  try {
    return await selectedStore().recordEvent(event);
  } catch (error) {
    console.error('[analytics-store-error]', { type: event.type, message: error.message });
    throw error;
  }
}

export async function listAnalyticsEvents({ limit = 50 } = {}) {
  return selectedStore().listEvents({ limit: Math.min(Math.max(Number(limit) || 50, 1), 200) });
}

export async function getAnalyticsStorageStatus() {
  return selectedStore().getStatus();
}

export async function getAnalyticsSummary() {
  const [events, storage] = await Promise.all([listAnalyticsEvents({ limit: 1000 }), getAnalyticsStorageStatus()]);
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const inRange = (event, since) => Date.parse(event.createdAt) >= since;
  const count = (type, since) => events.filter((event) => event.type === type && inRange(event, since)).length;
  const latest = (type) => events.find((event) => event.type === type)?.createdAt || '';
  const topFor = (type, field) => Object.entries(events.filter((event) => event.type === type).reduce((acc, event) => {
    const key = event.metadata?.[field] || event.label;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, countValue]) => ({ label, count: countValue }));
  return {
    ...storage,
    searchesToday: count('search_submitted', dayAgo),
    searchesLast7Days: count('search_submitted', weekAgo),
    enquiriesToday: count('enquiry_created', dayAgo),
    enquiriesLast7Days: count('enquiry_created', weekAgo),
    partnerRedirectsToday: count('partner_redirect_clicked', dayAgo),
    partnerRedirectsLast7Days: count('partner_redirect_clicked', weekAgo),
    providerErrorsToday: count('api_provider_error', dayAgo),
    providerErrorsLast7Days: count('api_provider_error', weekAgo),
    latestEnquiryTime: latest('enquiry_created'),
    latestSearchTime: latest('search_submitted'),
    topDestinationsSearched: topFor('search_submitted', 'destination'),
    topContentPagesViewed: topFor('content_page_view', 'slug'),
  };
}
