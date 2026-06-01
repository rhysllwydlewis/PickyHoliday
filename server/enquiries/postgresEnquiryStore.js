import pg from 'pg';
import { createEnquiryRecord, ENQUIRY_STATUSES } from '../../src/services/enquiries/enquiryModel.js';

const { Pool } = pg;

const createStorageError = (message, status = 503, cause) => {
  const error = new Error(message);
  error.status = status;
  error.provider = 'postgres-enquiry-store';
  if (cause) error.cause = cause;
  return error;
};

const databaseUrl = () => process.env.DATABASE_URL || '';
const connectionTimeoutMillis = () => Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000);

let pool;
let ensureTablePromise;

const tableSql = `
  CREATE TABLE IF NOT EXISTS enquiries (
    id text PRIMARY KEY,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    status text NOT NULL,
    source text,
    result_id text,
    result_type text,
    provider text,
    supplier_name text,
    destination text NOT NULL,
    country text,
    hotel_name text,
    departure_airport text,
    date_label text,
    group_size_label text,
    price_from numeric,
    currency text,
    customer_name text,
    customer_email text,
    customer_phone text,
    customer_notes text,
    consent_to_contact boolean NOT NULL DEFAULT false,
    internal_notes text
  );

  CREATE INDEX IF NOT EXISTS enquiries_created_at_desc_idx ON enquiries (created_at DESC);
  CREATE INDEX IF NOT EXISTS enquiries_status_idx ON enquiries (status);
  CREATE INDEX IF NOT EXISTS enquiries_customer_email_idx ON enquiries (customer_email);
`;

const getPool = () => {
  const connectionString = databaseUrl();
  if (!connectionString) {
    throw createStorageError('Postgres enquiry storage is selected but the server database connection is not configured. Configure the database connection or switch ENQUIRY_STORAGE_MODE=json.');
  }

  if (!pool) {
    pool = new Pool({ connectionString, connectionTimeoutMillis: connectionTimeoutMillis() });
    pool.on('error', (error) => {
      console.error('[postgres-enquiry-store-error]', { message: error.message });
    });
  }

  return pool;
};

const ensureTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = getPool().query(tableSql).catch((error) => {
      ensureTablePromise = undefined;
      throw error;
    });
  }
  await ensureTablePromise;
};

const toIsoString = (value) => (value instanceof Date ? value.toISOString() : value);
const toNumberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

const mapRowToEnquiry = (row) => ({
  id: row.id,
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
  status: row.status,
  source: row.source || '',
  resultId: row.result_id || '',
  resultType: row.result_type || '',
  provider: row.provider || '',
  supplierName: row.supplier_name || '',
  destination: row.destination || '',
  country: row.country || '',
  hotelName: row.hotel_name || '',
  departureAirport: row.departure_airport || '',
  dateLabel: row.date_label || '',
  groupSizeLabel: row.group_size_label || '',
  priceFrom: toNumberOrNull(row.price_from),
  currency: row.currency || 'GBP',
  customerName: row.customer_name || '',
  customerEmail: row.customer_email || '',
  customerPhone: row.customer_phone || '',
  customerNotes: row.customer_notes || '',
  consentToContact: row.consent_to_contact === true,
  internalNotes: row.internal_notes || '',
});

const insertSql = `
  INSERT INTO enquiries (
    id,
    created_at,
    updated_at,
    status,
    source,
    result_id,
    result_type,
    provider,
    supplier_name,
    destination,
    country,
    hotel_name,
    departure_airport,
    date_label,
    group_size_label,
    price_from,
    currency,
    customer_name,
    customer_email,
    customer_phone,
    customer_notes,
    consent_to_contact,
    internal_notes
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
  )
  RETURNING *;
`;

const enquiryValues = (record) => [
  record.id,
  record.createdAt,
  record.updatedAt,
  record.status,
  record.source,
  record.resultId,
  record.resultType,
  record.provider,
  record.supplierName,
  record.destination,
  record.country,
  record.hotelName,
  record.departureAirport,
  record.dateLabel,
  record.groupSizeLabel,
  record.priceFrom,
  record.currency,
  record.customerName,
  record.customerEmail,
  record.customerPhone,
  record.customerNotes,
  record.consentToContact,
  record.internalNotes,
];

const withStorageError = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    if (error.status) throw error;
    throw createStorageError('Postgres enquiry storage is unavailable. Check the server database connection and Railway Postgres service status.', 503, error);
  }
};

export async function createEnquiry(payload) {
  return withStorageError(async () => {
    await ensureTable();
    const record = createEnquiryRecord(payload);
    const result = await getPool().query(insertSql, enquiryValues(record));
    return mapRowToEnquiry(result.rows[0]);
  });
}

export async function listEnquiries() {
  return withStorageError(async () => {
    await ensureTable();
    const result = await getPool().query('SELECT * FROM enquiries ORDER BY created_at DESC;');
    return result.rows.map(mapRowToEnquiry);
  });
}

export async function updateEnquiryStatus(id, status) {
  if (!ENQUIRY_STATUSES.includes(status)) {
    const error = new Error('Invalid enquiry status.');
    error.status = 400;
    throw error;
  }

  return withStorageError(async () => {
    await ensureTable();
    const result = await getPool().query(
      'UPDATE enquiries SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;',
      [id, status],
    );

    if (result.rowCount === 0) {
      const error = new Error('Enquiry not found.');
      error.status = 404;
      throw error;
    }

    return mapRowToEnquiry(result.rows[0]);
  });
}

export async function getDatabaseStatus() {
  if (!databaseUrl()) return 'postgres-not-configured';

  try {
    await ensureTable();
    await getPool().query('SELECT 1;');
    return 'postgres-ready';
  } catch (error) {
    return 'postgres-error';
  }
}

export function isPostgresConfigured() {
  return Boolean(databaseUrl());
}
