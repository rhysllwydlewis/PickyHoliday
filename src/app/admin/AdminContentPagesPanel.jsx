import React, { useCallback, useEffect, useState } from 'react';
import { createAdminContentPage, listAdminContentPages, updateAdminContentPage, updateAdminContentPageStatus } from '../../services/travelApi.js';
import { AdminPageTitle } from './AdminShared.jsx';

const emptyContentPage = {
  slug: '', type: 'destination', status: 'draft', title: '', shortTitle: '', metaTitle: '', metaDescription: '', canonicalPath: '',
  heroEyebrow: '', heroTitle: '', heroSubtitle: '', heroImage: '', intro: '',
  sections: [{ id: 'section-1', heading: '', body: '' }], faqs: [{ id: 'faq-1', question: '', answer: '' }],
  relatedSlugs: '', searchDefaults: '{\n  "destination": "",\n  "intent": "Holidays"\n}', tags: '', internalNotes: '',
};
const pagePathPrefix = (type) => ({ destination: '/destinations/', 'group-type': '/group-holidays/', guide: '/guides/', landing: '/' }[type] || '/');
const pageToForm = (page = emptyContentPage) => ({
  ...emptyContentPage, ...page,
  sections: page.sections?.length ? page.sections : emptyContentPage.sections,
  faqs: page.faqs?.length ? page.faqs : emptyContentPage.faqs,
  relatedSlugs: Array.isArray(page.relatedSlugs) ? page.relatedSlugs.join(', ') : (page.relatedSlugs || ''),
  tags: Array.isArray(page.tags) ? page.tags.join(', ') : (page.tags || ''),
  searchDefaults: typeof page.searchDefaults === 'string' ? page.searchDefaults : JSON.stringify(page.searchDefaults || {}, null, 2),
});
const formToPage = (form) => ({
  ...form,
  relatedSlugs: form.relatedSlugs.split(',').map((item) => item.trim()).filter(Boolean),
  tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
  searchDefaults: JSON.parse(form.searchDefaults || '{}'),
  sections: form.sections.filter((item) => item.heading || item.body),
  faqs: form.faqs.filter((item) => item.question || item.answer),
});

export function AdminContentPagesPanel({ token }) {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(emptyContentPage);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const loadPages = useCallback(() => listAdminContentPages(token).then((data) => setPages(data.results || [])).catch((loadError) => setError(loadError.message)), [token]);
  useEffect(() => { loadPages(); }, [loadPages]);
  const filtered = pages.filter((page) => (!filters.type || page.type === filters.type) && (!filters.status || page.status === filters.status));
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateRow = (key, index, field, value) => setForm((current) => ({ ...current, [key]: current[key].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row) }));
  const addRow = (key, row) => setForm((current) => ({ ...current, [key]: [...current[key], row] }));
  const removeRow = (key, index) => setForm((current) => ({ ...current, [key]: current[key].filter((_, rowIndex) => rowIndex !== index) }));
  const selectPage = (page) => { setSelectedId(page.id); setForm(pageToForm(page)); setNotice(''); setError(''); };
  const reset = () => { setSelectedId(''); setForm(emptyContentPage); setNotice(''); setError(''); };
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      const payload = formToPage(form);
      const saved = selectedId ? await updateAdminContentPage(selectedId, payload, token) : await createAdminContentPage(payload, token);
      const page = saved.results?.[0]; setNotice(selectedId ? 'Content page updated.' : 'Content page created.'); setSelectedId(page?.id || selectedId); if (page) setForm(pageToForm(page)); await loadPages();
    } catch (saveError) { setError(saveError.message || 'Could not save content page. Check JSON fields and required fields.'); }
  };
  const changeStatus = async (page, status) => { setError(''); await updateAdminContentPageStatus(page.id, status, token).then(loadPages).catch((statusError) => setError(statusError.message)); };
  return (
    <>
      <AdminPageTitle kicker="SEO content" title="Content Pages" copy="Create destination, group holiday and guide pages for the public site." action={<button onClick={reset}>New page</button>} />
      {error && <div className="error-state">{error}</div>}{notice && <div className="loading-state">{notice}</div>}
      <div className="admin-split">
        <section className="admin-list-panel">
          <div className="admin-filters"><select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}><option value="">All types</option><option value="destination">Destination</option><option value="group-type">Group type</option><option value="guide">Guide</option><option value="landing">Landing</option></select><select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
          {filtered.map((page) => <article key={page.id} className="admin-card"><button onClick={() => selectPage(page)}><b>{page.title}</b><span>{page.type} · {page.status}</span></button><a href={`${pagePathPrefix(page.type)}${page.slug}`} target="_blank" rel="noreferrer">Preview</a><div><button onClick={() => changeStatus(page, 'published')}>Publish</button><button onClick={() => changeStatus(page, 'draft')}>Unpublish</button><button onClick={() => changeStatus(page, 'archived')}>Archive</button></div></article>)}
        </section>
        <form className="admin-form" onSubmit={save}>
          <fieldset><legend>Page basics</legend><label><span>Title</span><input value={form.title} onChange={(e) => patch('title', e.target.value)} required /></label><label><span>Slug</span><input value={form.slug} onChange={(e) => patch('slug', e.target.value.toLowerCase())} required /></label><label><span>Type</span><select value={form.type} onChange={(e) => patch('type', e.target.value)}><option value="destination">Destination</option><option value="group-type">Group type</option><option value="guide">Guide</option><option value="landing">Landing</option></select></label><label><span>Status</span><select value={form.status} onChange={(e) => patch('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label><span>Short title</span><input value={form.shortTitle} onChange={(e) => patch('shortTitle', e.target.value)} /></label></fieldset>
          <fieldset><legend>SEO and hero</legend><label><span>Meta title</span><input value={form.metaTitle} onChange={(e) => patch('metaTitle', e.target.value)} /></label><label><span>Meta description</span><textarea value={form.metaDescription} onChange={(e) => patch('metaDescription', e.target.value)} /></label><label><span>Canonical path</span><input value={form.canonicalPath} onChange={(e) => patch('canonicalPath', e.target.value)} /></label><label><span>Hero eyebrow</span><input value={form.heroEyebrow} onChange={(e) => patch('heroEyebrow', e.target.value)} /></label><label><span>Hero title</span><input value={form.heroTitle} onChange={(e) => patch('heroTitle', e.target.value)} /></label><label><span>Hero subtitle</span><textarea value={form.heroSubtitle} onChange={(e) => patch('heroSubtitle', e.target.value)} /></label></fieldset>
          <fieldset><legend>Content</legend><label><span>Intro</span><textarea value={form.intro} onChange={(e) => patch('intro', e.target.value)} /></label>{form.sections.map((section, index) => <div className="admin-row" key={index}><input placeholder="Section heading" value={section.heading} onChange={(e) => updateRow('sections', index, 'heading', e.target.value)} /><textarea placeholder="Section body" value={section.body} onChange={(e) => updateRow('sections', index, 'body', e.target.value)} /><button type="button" onClick={() => removeRow('sections', index)}>Remove</button></div>)}<button type="button" onClick={() => addRow('sections', { id: `section-${form.sections.length + 1}`, heading: '', body: '' })}>Add section</button></fieldset>
          <fieldset><legend>FAQs</legend>{form.faqs.map((faq, index) => <div className="admin-row" key={index}><input placeholder="Question" value={faq.question} onChange={(e) => updateRow('faqs', index, 'question', e.target.value)} /><textarea placeholder="Answer" value={faq.answer} onChange={(e) => updateRow('faqs', index, 'answer', e.target.value)} /><button type="button" onClick={() => removeRow('faqs', index)}>Remove</button></div>)}<button type="button" onClick={() => addRow('faqs', { id: `faq-${form.faqs.length + 1}`, question: '', answer: '' })}>Add FAQ</button></fieldset>
          <fieldset><legend>Search and related</legend><label><span>Search defaults JSON</span><textarea value={form.searchDefaults} onChange={(e) => patch('searchDefaults', e.target.value)} /></label><label><span>Related slugs</span><input value={form.relatedSlugs} onChange={(e) => patch('relatedSlugs', e.target.value)} /></label><label><span>Tags</span><input value={form.tags} onChange={(e) => patch('tags', e.target.value)} /></label><label><span>Internal notes</span><textarea value={form.internalNotes} onChange={(e) => patch('internalNotes', e.target.value)} /></label></fieldset>
          <button type="submit">Save page</button>
        </form>
      </div>
    </>
  );
}
