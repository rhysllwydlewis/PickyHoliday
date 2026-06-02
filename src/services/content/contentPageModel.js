export const contentPageTypes = ['destination', 'group-type', 'guide', 'landing'];
export const contentPageStatuses = ['draft', 'published', 'archived'];

const stringField = (value) => (typeof value === 'string' ? value.trim() : '');
const arrayField = (value) => {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};
const objectField = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const validationError = (field, message) => {
  const error = new Error(message);
  error.status = 400;
  error.fieldErrors = [{ field, message }];
  return error;
};

export const pathPrefixForContentType = (type) => ({
  destination: '/destinations/',
  'group-type': '/group-holidays/',
  guide: '/guides/',
  landing: '/',
}[type] || '/');

export function canonicalPathForPage(page) {
  const slug = stringField(page.slug);
  const explicit = stringField(page.canonicalPath);
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}`;
  return `${pathPrefixForContentType(page.type)}${slug}`;
}

const normaliseSections = (value) => (Array.isArray(value) ? value : []).map((section, index) => ({
  id: stringField(section?.id) || `section-${index + 1}`,
  heading: stringField(section?.heading),
  body: stringField(section?.body),
})).filter((section) => section.heading || section.body);

const normaliseFaqs = (value) => (Array.isArray(value) ? value : []).map((faq, index) => ({
  id: stringField(faq?.id) || `faq-${index + 1}`,
  question: stringField(faq?.question),
  answer: stringField(faq?.answer),
})).filter((faq) => faq.question || faq.answer);

export function normaliseContentPage(input = {}, existing = {}) {
  const now = new Date().toISOString();
  const type = input.type ?? existing.type ?? 'guide';
  const status = input.status ?? existing.status ?? 'draft';
  if (!contentPageTypes.includes(type)) throw validationError('type', `type must be one of: ${contentPageTypes.join(', ')}.`);
  if (!contentPageStatuses.includes(status)) throw validationError('status', `status must be one of: ${contentPageStatuses.join(', ')}.`);

  const slug = stringField(input.slug ?? existing.slug).toLowerCase();
  const title = stringField(input.title ?? existing.title);
  if (!slug) throw validationError('slug', 'Content page slug is required.');
  if (!slugPattern.test(slug)) throw validationError('slug', 'Slug must use lowercase letters, numbers and hyphens only.');
  if (!title) throw validationError('title', 'Content page title is required.');

  const page = {
    id: stringField(existing.id || input.id) || `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug,
    type,
    status,
    title,
    shortTitle: stringField(input.shortTitle ?? existing.shortTitle) || title,
    metaTitle: stringField(input.metaTitle ?? existing.metaTitle) || `${title} | PickyHoliday`,
    metaDescription: stringField(input.metaDescription ?? existing.metaDescription),
    canonicalPath: stringField(input.canonicalPath ?? existing.canonicalPath),
    heroEyebrow: stringField(input.heroEyebrow ?? existing.heroEyebrow),
    heroTitle: stringField(input.heroTitle ?? existing.heroTitle) || title,
    heroSubtitle: stringField(input.heroSubtitle ?? existing.heroSubtitle),
    heroImage: stringField(input.heroImage ?? existing.heroImage),
    intro: stringField(input.intro ?? existing.intro),
    sections: normaliseSections(input.sections ?? existing.sections),
    faqs: normaliseFaqs(input.faqs ?? existing.faqs),
    relatedSlugs: arrayField(input.relatedSlugs ?? existing.relatedSlugs).map(stringField),
    searchDefaults: objectField(input.searchDefaults ?? existing.searchDefaults),
    tags: arrayField(input.tags ?? existing.tags).map(stringField),
    createdAt: existing.createdAt || input.createdAt || now,
    updatedAt: now,
    internalNotes: stringField(input.internalNotes ?? existing.internalNotes),
  };
  page.canonicalPath = canonicalPathForPage(page);
  return page;
}

export function publicContentPage(page) {
  if (!page || page.status !== 'published') return null;
  const { internalNotes, status, ...publicPage } = page;
  return publicPage;
}

export function adminContentPage(page) {
  return { ...page };
}
