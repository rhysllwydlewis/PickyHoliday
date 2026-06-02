import pg from 'pg';
import { normaliseContentPage } from '../../src/services/content/contentPageModel.js';

const { Pool } = pg;
let pool;

const requirePool = () => {
  if (!process.env.DATABASE_URL) { const error = new Error('Postgres content page storage is selected but DATABASE_URL is not configured.'); error.status = 503; throw error; }
  pool ||= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } });
  return pool;
};

const ensureTable = async () => {
  await requirePool().query(`
    CREATE TABLE IF NOT EXISTS content_pages (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      type text NOT NULL,
      status text NOT NULL,
      title text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS content_pages_slug_idx ON content_pages (slug);
    CREATE INDEX IF NOT EXISTS content_pages_type_idx ON content_pages (type);
    CREATE INDEX IF NOT EXISTS content_pages_status_idx ON content_pages (status);
  `);
};

export async function listPostgresContentPages() {
  await ensureTable();
  const { rows } = await requirePool().query('SELECT payload FROM content_pages ORDER BY updated_at DESC');
  return rows.map((row) => row.payload);
}

export async function createPostgresContentPage(payload) {
  await ensureTable();
  const page = normaliseContentPage(payload);
  try {
    await requirePool().query('INSERT INTO content_pages (id, slug, type, status, title, payload, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [page.id, page.slug, page.type, page.status, page.title, page, page.createdAt, page.updatedAt]);
  } catch (error) {
    if (error.code === '23505') { const duplicate = new Error('A content page with this slug already exists.'); duplicate.status = 409; duplicate.fieldErrors = [{ field: 'slug', message: duplicate.message }]; throw duplicate; }
    throw error;
  }
  return page;
}

export async function updatePostgresContentPage(id, payload) {
  await ensureTable();
  const { rows } = await requirePool().query('SELECT payload FROM content_pages WHERE id=$1', [id]);
  if (!rows[0]) { const error = new Error('Content page not found.'); error.status = 404; throw error; }
  const updated = normaliseContentPage(payload, rows[0].payload);
  try {
    await requirePool().query('UPDATE content_pages SET slug=$2, type=$3, status=$4, title=$5, payload=$6, updated_at=$7 WHERE id=$1', [id, updated.slug, updated.type, updated.status, updated.title, updated, updated.updatedAt]);
  } catch (error) {
    if (error.code === '23505') { const duplicate = new Error('A content page with this slug already exists.'); duplicate.status = 409; duplicate.fieldErrors = [{ field: 'slug', message: duplicate.message }]; throw duplicate; }
    throw error;
  }
  return updated;
}

export async function getPostgresContentPageStatus() {
  if (!process.env.DATABASE_URL) return { contentPageStorageMode: 'postgres', contentPageStorageStatus: 'postgres-not-configured' };
  try { await ensureTable(); return { contentPageStorageMode: 'postgres', contentPageStorageStatus: 'postgres-ready' }; }
  catch { return { contentPageStorageMode: 'postgres', contentPageStorageStatus: 'postgres-error' }; }
}
