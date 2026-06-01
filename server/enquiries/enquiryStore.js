import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEnquiryRecord, ENQUIRY_STATUSES } from '../../src/services/enquiries/enquiryModel.js';
import * as postgresEnquiryStore from './postgresEnquiryStore.js';

const dataDir = path.resolve(process.cwd(), 'data');
const enquiryFile = path.join(dataDir, 'enquiries.json');
const POSTGRES_MISSING_DATABASE_URL_MESSAGE = 'Postgres enquiry storage is selected but DATABASE_URL is not configured. Set DATABASE_URL or switch ENQUIRY_STORAGE_MODE=json.';

const selectedStorageMode = () => `${process.env.ENQUIRY_STORAGE_MODE || 'json'}`.trim().toLowerCase();
const usesPostgres = () => selectedStorageMode() === 'postgres';

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(enquiryFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(enquiryFile, '[]\n', 'utf8');
      return;
    }
    throw error;
  }
}

async function readAll() {
  await ensureStore();
  const raw = await readFile(enquiryFile, 'utf8');
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error('Enquiry store is not valid JSON.');
  }
}

async function writeAll(records) {
  await ensureStore();
  await writeFile(enquiryFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function createJsonEnquiry(payload) {
  const records = await readAll();
  const record = createEnquiryRecord(payload);
  records.unshift(record);
  await writeAll(records);
  return record;
}

async function listJsonEnquiries() {
  return readAll();
}

async function updateJsonEnquiryStatus(id, status) {
  if (!ENQUIRY_STATUSES.includes(status)) {
    const error = new Error('Invalid enquiry status.');
    error.status = 400;
    throw error;
  }
  const records = await readAll();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) {
    const error = new Error('Enquiry not found.');
    error.status = 404;
    throw error;
  }
  records[index] = { ...records[index], status, updatedAt: new Date().toISOString() };
  await writeAll(records);
  return records[index];
}

const selectedStore = () => (usesPostgres()
  ? postgresEnquiryStore
  : {
    createEnquiry: createJsonEnquiry,
    listEnquiries: listJsonEnquiries,
    updateEnquiryStatus: updateJsonEnquiryStatus,
  });

export async function createEnquiry(payload) {
  return selectedStore().createEnquiry(payload);
}

export async function listEnquiries() {
  return selectedStore().listEnquiries();
}

export async function updateEnquiryStatus(id, status) {
  return selectedStore().updateEnquiryStatus(id, status);
}

export async function getEnquiryStorageStatus() {
  const enquiryStorageMode = usesPostgres() ? 'postgres' : 'json';
  const postgresConfigured = postgresEnquiryStore.isPostgresConfigured();
  const databaseStatus = await postgresEnquiryStore.getDatabaseStatus();

  return {
    enquiryStorageMode,
    postgresConfigured,
    databaseStatus,
    ...(usesPostgres() && !postgresConfigured ? { storageWarning: POSTGRES_MISSING_DATABASE_URL_MESSAGE } : {}),
  };
}
