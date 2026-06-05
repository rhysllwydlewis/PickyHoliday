import React, { useCallback, useEffect, useState } from 'react';
import { getAdminSiteConfig, updateAdminSiteConfig } from '../../services/travelApi.js';
import { defaultFeatureFlags, defaultSiteConfig } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

export function AdminContentPanel({ token, featureOnly = false }) {
  const [config, setConfig] = useState(defaultSiteConfig);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await getAdminSiteConfig(token);
      setConfig(response.siteConfig || defaultSiteConfig);
    } catch (contentError) {
      setError(contentError.message || 'Could not load site content.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const patch = (section, key, value) => setConfig((current) => ({
    ...current,
    [section]: { ...(current[section] || {}), [key]: value },
  }));

  const save = async () => {
    setError('');
    setNotice('');
    try {
      const response = await updateAdminSiteConfig(config, token);
      setConfig(response.siteConfig);
      setNotice('Site configuration saved.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save site configuration.');
    }
  };

  const flags = { ...defaultFeatureFlags, ...(config.featureFlags || {}) };

  if (featureOnly) {
    return (
      <>
        <AdminPageTitle
          kicker="Safe public toggles"
          title="Feature Flags"
          copy="Frontend-safe flags only. Secure backend environment settings still win."
          action={<button onClick={save}>Save flags</button>}
        />
        {error && <div className="error-state">{error}</div>}
        {notice && <div className="loading-state">{notice}</div>}
        <div className="admin-form feature-list">
          {Object.keys(defaultFeatureFlags).map((key) => (
            <label className="admin-check" key={key}>
              <input type="checkbox" checked={Boolean(flags[key])} onChange={(event) => patch('featureFlags', key, event.target.checked)} />
              {key}
            </label>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageTitle
        kicker="Website copy"
        title="Site Content"
        copy="Update public homepage copy without editing source code."
        action={<button onClick={save}>Save content</button>}
      />
      {error && <div className="error-state">{error}</div>}
      {notice && <div className="loading-state">{notice}</div>}
      <div className="admin-form">
        <fieldset>
          <legend>Homepage hero</legend>
          <label><span>Eyebrow</span><input value={config.hero?.eyebrow || ''} onChange={(event) => patch('hero', 'eyebrow', event.target.value)} /></label>
          <label><span>Title</span><input value={config.hero?.title || ''} onChange={(event) => patch('hero', 'title', event.target.value)} /></label>
          <label><span>Subtitle</span><textarea value={config.hero?.subtitle || ''} onChange={(event) => patch('hero', 'subtitle', event.target.value)} /></label>
          <label><span>Assurance chips</span><input value={(config.hero?.assuranceChips || []).join(', ')} onChange={(event) => patch('hero', 'assuranceChips', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
        </fieldset>
        <fieldset>
          <legend>Newsletter/footer/trust</legend>
          <label><span>Newsletter title</span><input value={config.newsletter?.title || ''} onChange={(event) => patch('newsletter', 'title', event.target.value)} /></label>
          <label><span>Newsletter subtitle</span><input value={config.newsletter?.subtitle || ''} onChange={(event) => patch('newsletter', 'subtitle', event.target.value)} /></label>
          <label><span>Footer short description</span><input value={config.footer?.shortDescription || ''} onChange={(event) => patch('footer', 'shortDescription', event.target.value)} /></label>
          <label><span>Trust/protection copy</span><input value={config.trust?.protectionCopy || ''} onChange={(event) => patch('trust', 'protectionCopy', event.target.value)} /></label>
        </fieldset>
        <fieldset>
          <legend>Announcement</legend>
          <label className="admin-check"><input type="checkbox" checked={Boolean(config.announcement?.active)} onChange={(event) => patch('announcement', 'active', event.target.checked)} /> Announcement active</label>
          <label><span>Banner text</span><input value={config.announcement?.text || ''} onChange={(event) => patch('announcement', 'text', event.target.value)} /></label>
        </fieldset>
      </div>
    </>
  );
}

