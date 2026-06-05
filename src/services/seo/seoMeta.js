export function pageTitle(title, siteName = 'PickyHoliday') {
  return title ? `${title} | ${siteName}` : siteName;
}

const ensureMeta = (selector, attrs) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs.create || {}).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  Object.entries(attrs.update || {}).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

const upsertJsonLd = (items = []) => {
  document.querySelectorAll('script[data-pickyholiday-jsonld]').forEach((node) => node.remove());
  items.filter(Boolean).forEach((item) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.pickyholidayJsonld = 'true';
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  });
};

export function setDocumentMeta({ title, description, canonicalPath, jsonLd, openGraph = {}, twitter = {} } = {}) {
  if (title) document.title = title;
  if (description) ensureMeta('meta[name="description"]', { create: { name: 'description' }, update: { content: description } });

  const ogTitle = openGraph.title || title;
  const ogDescription = openGraph.description || description;
  if (ogTitle) ensureMeta('meta[property="og:title"]', { create: { property: 'og:title' }, update: { content: ogTitle } });
  if (ogDescription) ensureMeta('meta[property="og:description"]', { create: { property: 'og:description' }, update: { content: ogDescription } });
  if (openGraph.type) ensureMeta('meta[property="og:type"]', { create: { property: 'og:type' }, update: { content: openGraph.type } });

  const twitterTitle = twitter.title || title;
  const twitterDescription = twitter.description || description;
  ensureMeta('meta[name="twitter:card"]', { create: { name: 'twitter:card' }, update: { content: twitter.card || 'summary_large_image' } });
  if (twitterTitle) ensureMeta('meta[name="twitter:title"]', { create: { name: 'twitter:title' }, update: { content: twitterTitle } });
  if (twitterDescription) ensureMeta('meta[name="twitter:description"]', { create: { name: 'twitter:description' }, update: { content: twitterDescription } });

  if (canonicalPath) {
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalPath);
  }

  if (jsonLd) upsertJsonLd(Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
}


export const defaultPublicLinks = {
  destinations: ['barcelona', 'crete', 'algarve'],
  groups: ['stag-and-hen', 'family-holidays', 'group-hotel-stays'],
  guides: ['best-group-holiday-destinations', 'how-to-plan-a-group-holiday', 'group-holiday-budgeting'],
};

export const labelFromSlug = (slug) => slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
export const publicRouteMatch = () => window.location.pathname.match(/^\/(destinations|group-holidays|guides)\/([^/]+)$/);
export const publicRouteSlug = () => {
  const match = publicRouteMatch();
  return match?.[2] || '';
};
export const publicRouteType = () => {
  const match = publicRouteMatch();
  if (match?.[1] === 'guides') return 'guide';
  if (match?.[1] === 'group-holidays') return 'group-type';
  return 'destination';
};
export const contentPathForSlug = (slug) => {
  if (slug.startsWith('how-') || slug.startsWith('best-')) return `/guides/${slug}`;
  if (slug.includes('stag') || slug.includes('villa') || slug.includes('party') || slug.includes('city') || slug.includes('family-holidays') || slug.includes('group-hotel')) return `/group-holidays/${slug}`;
  return `/destinations/${slug}`;
};
export const updateSeoMeta = (page = {}) => {
  const title = page?.metaTitle || page?.title || 'PickyHoliday | Group holidays made easy';
  const description = page?.metaDescription || page?.intro || 'Plan group holidays with enquiry-first support from PickyHoliday.';
  setDocumentMeta({
    title,
    description,
    canonicalPath: `${window.location.origin}${page?.canonicalPath || window.location.pathname}`,
    openGraph: { title, description, type: page?.type === 'guide' ? 'article' : 'website' },
    twitter: { title, description, card: 'summary_large_image' },
  });
};
export const replaceJsonLd = (items) => { setDocumentMeta({ jsonLd: items.filter(Boolean) }); };
export const pageSchema = (page) => {
  const site = window.location.origin;
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: site },
    { '@type': 'ListItem', position: 2, name: page.type === 'guide' ? 'Guides' : page.type === 'destination' ? 'Destinations' : 'Group Holidays', item: `${site}${page.type === 'guide' ? '/guides' : page.type === 'destination' ? '/destinations' : '/group-holidays'}` },
    { '@type': 'ListItem', position: 3, name: page.title, item: `${site}${page.canonicalPath}` },
  ] };
  const faq = page.faqs?.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } : null;
  const article = page.type === 'guide' ? { '@context': 'https://schema.org', '@type': 'Article', headline: page.title, description: page.metaDescription || page.intro, mainEntityOfPage: `${site}${page.canonicalPath}` } : null;
  return [breadcrumb, faq, article];
};
