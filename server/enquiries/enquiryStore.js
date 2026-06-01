import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEnquiryRecord, ENQUIRY_STATUSES } from '../../src/services/enquiries/enquiryModel.js';

const dataDir = path.resolve(process.cwd(), 'data');
const enquiryFile = path.join(dataDir, 'enquiries.json');

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

export async function createEnquiry(payload) {
  const records = await readAll();
  const record = createEnquiryRecord(payload);
  records.unshift(record);
  await writeAll(records);
  return record;
}

export async function listEnquiries() {
  return readAll();
}

export async function updateEnquiryStatus(id, status) {
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
