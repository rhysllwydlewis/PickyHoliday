import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header.jsx';
import { Footer } from '../../components/layout/Footer.jsx';
import { Dialog, dealModalContent } from '../../components/ui/Dialog.jsx';
import { DealCard } from '../../components/deals/DealCard.jsx';
import { getPublicContentPage, searchHolidays } from '../../services/travelApi.js';
import { contentPathForSlug, labelFromSlug, pageSchema, publicRouteSlug, publicRouteType, replaceJsonLd, updateSeoMeta } from '../../services/seo/seoMeta.js';
import { showDemoDeals, trackEvent } from '../appConstants.js';

export function PublicContentPageApp() {
  const [page, setPage] = useState(null);
  const [deals, setDeals] = useState([]);
  const [status, setStatus] = useState('loading');
  const [modal, setModal] = useState(null);
  const slug = publicRouteSlug();
  useEffect(() => {
    let cancelled = false;
    getPublicContentPage(slug).then((data) => {
      if (cancelled) return;
      const nextPage = data.page || data.results?.[0];
      if (!nextPage || nextPage.type !== publicRouteType()) {
        setStatus('missing');
        updateSeoMeta({ title: 'Page not found | PickyHoliday', metaTitle: 'Page not found | PickyHoliday', metaDescription: 'This PickyHoliday content page is unavailable.' });
        return undefined;
      }
      setPage(nextPage); setStatus('ready'); updateSeoMeta(nextPage); replaceJsonLd(pageSchema(nextPage)); trackEvent({ type: 'content_page_view', category: 'content', label: nextPage.title, metadata: { slug: nextPage.slug, type: nextPage.type } });
      return searchHolidays(nextPage.searchDefaults || {}).then((results) => { if (!cancelled) setDeals((results.results || []).filter((result) => showDemoDeals || !result.isDemo).slice(0, 3)); }).catch(() => {});
    }).catch(() => { if (!cancelled) { setStatus('missing'); updateSeoMeta({ title: 'Page not found | PickyHoliday', metaTitle: 'Page not found | PickyHoliday', metaDescription: 'This PickyHoliday content page is unavailable.' }); } });
    return () => { cancelled = true; };
  }, [slug]);
  const openMessage = (title, body, kicker) => setModal(typeof title === 'object' ? title : { title, body, kicker });
  const openSignIn = () => setModal({ type: 'admin-login' });
  const openRelatedDeal = (deal) => setModal(dealModalContent(deal, { onOpenEnquiry: setModal }));
  if (status === 'loading') return <><Header onAction={() => {}} onSignIn={openSignIn} /><main className="content-page"><div className="loading-state">Loading content page…</div></main><Footer onAction={() => {}} onSignIn={openSignIn} /><Dialog content={modal} onClose={() => setModal(null)} /></>;
  if (!page || status === 'missing') return <><Header onAction={() => {}} onSignIn={openSignIn} /><main className="content-page"><h1>Page not found</h1><p>This page is not published or is temporarily unavailable.</p><a className="primary-link" href="/">Return home</a></main><Footer onAction={() => {}} onSignIn={openSignIn} /><Dialog content={modal} onClose={() => setModal(null)} /></>;
  const related = (page.relatedSlugs || []).slice(0, 6);
  return (
    <>
      <Header onAction={openMessage} onSignIn={openSignIn} />
      <main className={`content-page content-page-${page.type}`}>
        <section className="content-hero">
          <span>{page.heroEyebrow || (page.type === 'guide' ? 'Travel guide' : 'Group holiday page')}</span>
          <h1>{page.heroTitle || page.title}</h1>
          <p>{page.heroSubtitle || page.intro}</p>
          <div className="content-hero-actions"><a href={`/?destination=${encodeURIComponent(page.searchDefaults?.destination || '')}&intent=${encodeURIComponent(page.searchDefaults?.intent || '')}#search`}>Search</a><a href={`/?destination=${encodeURIComponent(page.searchDefaults?.destination || '')}#deals`}>Ask for group quote</a></div>
        </section>
        <section className="content-body"><p className="intro-copy">{page.intro}</p>{(page.sections || []).map((section) => <article key={section.id}><h2>{section.heading}</h2><p>{section.body}</p></article>)}</section>
        {deals.length > 0 && <section className="content-related"><h2>Related holiday ideas</h2><div className="deal-grid compact">{deals.map((deal) => <DealCard key={deal.id || deal.resultId} deal={deal} onView={openRelatedDeal} />)}</div></section>}
        {(page.faqs || []).length > 0 && <section className="content-faq"><h2>FAQs</h2>{page.faqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>}
        <section className="content-cta"><h2>Ready to plan this group trip?</h2><p>Send an enquiry for group quote support. No booking created by PickyHoliday and no payment is taken.</p><a href={`/?destination=${encodeURIComponent(page.searchDefaults?.destination || page.title)}&intent=${encodeURIComponent(page.searchDefaults?.intent || 'Holidays')}#deals`}>Ask for group quote</a></section>
        {related.length > 0 && <section className="content-links"><h2>Related links</h2>{related.map((item) => <a key={item} href={contentPathForSlug(item)}>{labelFromSlug(item)}</a>)}</section>}
      </main>
      <Footer onAction={openMessage} onSignIn={openSignIn} />
      <Dialog content={modal} onClose={() => setModal(null)} />
    </>
  );
}

