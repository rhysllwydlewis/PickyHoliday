import { adminContentPage, contentPageStatuses, contentPageTypes, publicContentPage } from '../../src/services/content/contentPageModel.js';
import { createJsonContentPage, getJsonContentPageStatus, listJsonContentPages, updateJsonContentPage } from './jsonContentPageStore.js';
import { createPostgresContentPage, getPostgresContentPageStatus, listPostgresContentPages, updatePostgresContentPage } from './postgresContentPageStore.js';

const mode = () => (process.env.CONTENT_PAGE_STORAGE_MODE || 'json').toLowerCase() === 'postgres' ? 'postgres' : 'json';
const store = () => (mode() === 'postgres'
  ? { list: listPostgresContentPages, create: createPostgresContentPage, update: updatePostgresContentPage, status: getPostgresContentPageStatus }
  : { list: listJsonContentPages, create: createJsonContentPage, update: updateJsonContentPage, status: getJsonContentPageStatus });

export async function listContentPages(filters = {}) {
  const pages = await store().list();
  return pages.filter((page) => (!filters.type || page.type === filters.type) && (!filters.status || page.status === filters.status));
}
export async function listPublicContentPages(filters = {}) {
  const pages = await listContentPages({ ...filters, status: 'published' });
  return pages.map(publicContentPage).filter(Boolean);
}
export async function getPublicContentPageBySlug(slug) {
  const pages = await listPublicContentPages();
  const page = pages.find((item) => item.slug === slug);
  if (!page) { const error = new Error('Published content page not found.'); error.status = 404; throw error; }
  return page;
}
export async function listAdminContentPages(filters = {}) { return (await listContentPages(filters)).map(adminContentPage); }
export async function createContentPage(payload) { return store().create(payload); }
export async function updateContentPage(id, payload) { return store().update(id, payload); }
export async function updateContentPageStatus(id, status) {
  if (!contentPageStatuses.includes(status)) { const error = new Error(`status must be one of: ${contentPageStatuses.join(', ')}.`); error.status = 400; error.fieldErrors = [{ field: 'status', message: error.message }]; throw error; }
  return updateContentPage(id, { status });
}
export async function getContentPageStorageStatus() { return store().status(); }
export { contentPageTypes, contentPageStatuses };
