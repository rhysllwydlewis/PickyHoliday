import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normaliseContentPage } from '../../src/services/content/contentPageModel.js';

const dataDir = path.resolve(process.cwd(), 'data');
const pageFile = path.join(dataDir, 'content-pages.json');

const readPages = async () => {
  try {
    const raw = await readFile(pageFile, 'utf8');
    const pages = JSON.parse(raw);
    return Array.isArray(pages) ? pages.map((page) => {
      const normalised = normaliseContentPage(page, page);
      return { ...normalised, createdAt: page.createdAt || normalised.createdAt, updatedAt: page.updatedAt || normalised.updatedAt };
    }) : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const writePages = async (pages) => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(pageFile, JSON.stringify(pages, null, 2));
};

const assertUniqueSlug = (pages, page) => {
  if (pages.some((existing) => existing.slug === page.slug && existing.id !== page.id)) {
    const error = new Error('A content page with this slug already exists.');
    error.status = 409;
    error.fieldErrors = [{ field: 'slug', message: error.message }];
    throw error;
  }
};

export async function listJsonContentPages() { return readPages(); }

export async function createJsonContentPage(payload) {
  const pages = await readPages();
  const page = normaliseContentPage(payload);
  assertUniqueSlug(pages, page);
  pages.unshift(page);
  await writePages(pages);
  return page;
}

export async function updateJsonContentPage(id, payload) {
  const pages = await readPages();
  const index = pages.findIndex((page) => page.id === id);
  if (index === -1) { const error = new Error('Content page not found.'); error.status = 404; throw error; }
  const updated = normaliseContentPage(payload, pages[index]);
  assertUniqueSlug(pages, updated);
  pages[index] = updated;
  await writePages(pages);
  return updated;
}

export async function getJsonContentPageStatus() { return { contentPageStorageMode: 'json', contentPageStorageStatus: 'json' }; }
