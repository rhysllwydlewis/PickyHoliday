import pg from 'pg';

const { Pool } = pg;
let pool;
let ensureTablePromise;
const databaseUrl = () => process.env.DATABASE_URL || '';
const connectionTimeoutMillis = () => Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000);

const tableSql = `
CREATE TABLE IF NOT EXISTS analytics_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  type text NOT NULL,
  category text,
  label text,
  path text,
  provider text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  anonymised_ip text,
  user_agent_summary text
);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_desc_idx ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events (type);
`;

const requirePool = () => {
  if (!databaseUrl()) {
    const error = new Error('Postgres analytics storage is selected but DATABASE_URL is not configured.');
    error.status = 503;
    throw error;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      connectionTimeoutMillis: connectionTimeoutMillis(),
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (error) => console.error('[postgres-analytics-store-error]', { message: error.message }));
  }
  return pool;
};

const ensureTable = async () => {
  if (!ensureTablePromise) ensureTablePromise = requirePool().query(tableSql).catch((error) => { ensureTablePromise = undefined; throw error; });
  await ensureTablePromise;
};

const mapRow = (row) => ({
  id: row.id,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  type: row.type,
  category: row.category || '',
  label: row.label || '',
  path: row.path || '',
  provider: row.provider || '',
  requestId: row.request_id || '',
  metadata: row.metadata || {},
  anonymisedIp: row.anonymised_ip || '',
  userAgentSummary: row.user_agent_summary || '',
});

export async function recordEvent(event) {
  await ensureTable();
  const result = await requirePool().query(
    `INSERT INTO analytics_events (id, created_at, type, category, label, path, provider, request_id, metadata, anonymised_ip, user_agent_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [event.id, event.createdAt, event.type, event.category, event.label, event.path, event.provider, event.requestId, event.metadata || {}, event.anonymisedIp, event.userAgentSummary],
  );
  return mapRow(result.rows[0]);
}

export async function listEvents({ limit = 50 } = {}) {
  await ensureTable();
  const result = await requirePool().query('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows.map(mapRow);
}

export async function getStatus() {
  if (!databaseUrl()) return { analyticsStorageMode: 'postgres', analyticsStorageStatus: 'postgres-not-configured' };
  try {
    await ensureTable();
    await requirePool().query('SELECT 1');
    return { analyticsStorageMode: 'postgres', analyticsStorageStatus: 'postgres-ready' };
  } catch {
    return { analyticsStorageMode: 'postgres', analyticsStorageStatus: 'postgres-error' };
  }
}

export const isPostgresConfigured = () => Boolean(databaseUrl());
