import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const dataDir = path.resolve(process.cwd(), 'data');
const configFile = path.join(dataDir, 'site-config.json');
let pool;

const defaultConfig = {
  hero: {
    eyebrow: 'GROUP HOLIDAYS, MADE EASY',
    title: 'Smart group holidays. More fun. Less fuss.',
    subtitle: 'Compare inspiration, partner redirects and saved enquiries for mates, families and every kind of group adventure.',
    assuranceChips: ['Best group ideas', 'Saved enquiries', 'Advisor review', 'No auto-booking'],
  },
  newsletter: {
    title: 'Get group deals & travel inspiration straight to your inbox',
    subtitle: 'Be the first to hear about exclusive offers, big savings and new destinations.',
  },
  footer: { shortDescription: 'Group holidays made easy.' },
  trust: { protectionCopy: 'Saved enquiries only — no automatic booking' },
  announcement: { active: false, text: '' },
  featureFlags: {
    showProviderDiagnostics: false,
    enablePromotedDeals: true,
    enableAffiliateRedirects: true,
    enableDuffelSearch: true,
    enableAmadeusSecondary: false,
    enableNewsletterSignupPlaceholder: true,
    enableAnnouncementBanner: false,
    enableAdminDebugPanel: false,
  },
};

const mode = () => (process.env.SITE_CONFIG_STORAGE_MODE || 'json').toLowerCase() === 'postgres' ? 'postgres' : 'json';

const safeString = (value) => (typeof value === 'string' ? value.trim() : '');

const mergeConfig = (payload = {}) => ({
  ...defaultConfig,
  ...payload,
  hero: {
    ...defaultConfig.hero,
    ...(payload.hero || {}),
    assuranceChips: Array.isArray(payload.hero?.assuranceChips)
      ? payload.hero.assuranceChips.map(safeString).filter(Boolean).slice(0, 6)
      : defaultConfig.hero.assuranceChips,
  },
  newsletter: { ...defaultConfig.newsletter, ...(payload.newsletter || {}) },
  footer: { ...defaultConfig.footer, ...(payload.footer || {}) },
  trust: { ...defaultConfig.trust, ...(payload.trust || {}) },
  announcement: { ...defaultConfig.announcement, ...(payload.announcement || {}) },
  featureFlags: { ...defaultConfig.featureFlags, ...(payload.featureFlags || {}) },
});

const readJson = async () => {
  try {
    const rawConfig = await readFile(configFile, 'utf8');
    return mergeConfig(JSON.parse(rawConfig));
  } catch (error) {
    if (error.code === 'ENOENT') return defaultConfig;
    throw error;
  }
};

const writeJson = async (config) => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(configFile, JSON.stringify(config, null, 2));
};

const requirePool = () => {
  if (!process.env.DATABASE_URL) {
    const error = new Error('Postgres site config storage is selected but DATABASE_URL is not configured.');
    error.status = 503;
    throw error;
  }

  pool ||= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });
  return pool;
};

const ensureTable = async () => {
  await requirePool().query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key text PRIMARY KEY,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

const readPostgres = async () => {
  await ensureTable();
  const { rows } = await requirePool().query("SELECT payload FROM site_settings WHERE key='public-site-config'");
  return mergeConfig(rows[0]?.payload || defaultConfig);
};

const writePostgres = async (config) => {
  await ensureTable();
  await requirePool().query(
    "INSERT INTO site_settings (key, payload, updated_at) VALUES ('public-site-config',$1,now()) ON CONFLICT (key) DO UPDATE SET payload=$1, updated_at=now()",
    [config],
  );
};

export async function getSiteConfig() {
  return mode() === 'postgres' ? readPostgres() : readJson();
}

export async function updateSiteConfig(patch = {}) {
  const current = await getSiteConfig();
  const next = mergeConfig({
    ...current,
    ...patch,
    hero: { ...current.hero, ...(patch.hero || {}) },
    newsletter: { ...current.newsletter, ...(patch.newsletter || {}) },
    footer: { ...current.footer, ...(patch.footer || {}) },
    trust: { ...current.trust, ...(patch.trust || {}) },
    announcement: { ...current.announcement, ...(patch.announcement || {}) },
    featureFlags: { ...current.featureFlags, ...(patch.featureFlags || {}) },
  });

  if (mode() === 'postgres') await writePostgres(next);
  else await writeJson(next);
  return next;
}

export async function getPublicSiteConfig() {
  return getSiteConfig();
}

export async function getSiteConfigStorageStatus() {
  if (mode() === 'json') return { siteConfigStorageMode: 'json', siteConfigStorageStatus: 'json' };
  if (!process.env.DATABASE_URL) return { siteConfigStorageMode: 'postgres', siteConfigStorageStatus: 'postgres-not-configured' };

  try {
    await ensureTable();
    return { siteConfigStorageMode: 'postgres', siteConfigStorageStatus: 'postgres-ready' };
  } catch (error) {
    return { siteConfigStorageMode: 'postgres', siteConfigStorageStatus: 'postgres-error' };
  }
}

export { defaultConfig };
