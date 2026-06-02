import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');
const analyticsFile = path.join(dataDir, 'analytics-events.json');

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(analyticsFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(analyticsFile, '[]\n', 'utf8');
      return;
    }
    throw error;
  }
}

async function readAll() {
  await ensureStore();
  const raw = await readFile(analyticsFile, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeAll(events) {
  await ensureStore();
  await writeFile(analyticsFile, `${JSON.stringify(events.slice(0, 5000), null, 2)}\n`, 'utf8');
}

export async function recordEvent(event) {
  const events = await readAll();
  events.unshift(event);
  await writeAll(events);
  return event;
}

export async function listEvents({ limit = 50 } = {}) {
  const events = await readAll();
  return events.slice(0, limit);
}

export async function getStatus() {
  try {
    await ensureStore();
    return { analyticsStorageMode: 'json', analyticsStorageStatus: 'json' };
  } catch {
    return { analyticsStorageMode: 'json', analyticsStorageStatus: 'postgres-error' };
  }
}
