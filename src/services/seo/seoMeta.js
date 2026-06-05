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
