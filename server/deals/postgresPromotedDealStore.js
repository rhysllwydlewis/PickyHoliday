import pg from 'pg';
import { normalisePromotedDeal } from '../../src/services/deals/promotedDealModel.js';

const { Pool } = pg;
let pool;

const requirePool = () => {
  if (!process.env.DATABASE_URL) {
    const error = new Error('Postgres promoted deal storage is selected but DATABASE_URL is not configured.');
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
    CREATE TABLE IF NOT EXISTS promoted_deals (
      id text PRIMARY KEY,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

export async function listPostgresPromotedDeals() {
  await ensureTable();
  const { rows } = await requirePool().query('SELECT payload FROM promoted_deals ORDER BY updated_at DESC');
  return rows.map((row) => row.payload);
}

export async function createPostgresPromotedDeal(payload) {
  await ensureTable();
  const deal = normalisePromotedDeal(payload);
  await requirePool().query(
    'INSERT INTO promoted_deals (id, payload, created_at, updated_at) VALUES ($1,$2,$3,$4)',
    [deal.id, deal, deal.createdAt, deal.updatedAt],
  );
  return deal;
}

export async function updatePostgresPromotedDeal(id, payload) {
  await ensureTable();
  const { rows } = await requirePool().query('SELECT payload FROM promoted_deals WHERE id=$1', [id]);
  if (!rows[0]) {
    const error = new Error('Promoted deal not found.');
    error.status = 404;
    throw error;
  }

  const updated = normalisePromotedDeal(payload, rows[0].payload);
  await requirePool().query('UPDATE promoted_deals SET payload=$2, updated_at=$3 WHERE id=$1', [id, updated, updated.updatedAt]);
  return updated;
}

export async function getPostgresPromotedDealStatus() {
  if (!process.env.DATABASE_URL) return { promotedDealStorageMode: 'postgres', promotedDealStorageStatus: 'postgres-not-configured' };

  try {
    await ensureTable();
    return { promotedDealStorageMode: 'postgres', promotedDealStorageStatus: 'postgres-ready' };
  } catch (error) {
    return { promotedDealStorageMode: 'postgres', promotedDealStorageStatus: 'postgres-error' };
  }
}
