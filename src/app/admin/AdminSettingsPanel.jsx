import React, { useEffect, useState } from 'react';
import { getBackendHealth } from '../../services/travelApi.js';
import { showProviderDiagnostics } from '../appConstants.js';
import { AdminPageTitle } from './AdminShared.jsx';

export function AdminSettingsPanel() {
  const [health, setHealth] = useState({});

  useEffect(() => {
    getBackendHealth().then(setHealth).catch(() => {});
  }, []);

  const items = [
    ['Provider mode', health.providerMode],
    ['Enquiry storage', health.enquiryStorageMode],
    ['Promoted deal storage', health.promotedDealStorageMode],
    ['Database status', health.databaseStatus],
    ['Promoted deal status', health.promotedDealStorageStatus],
    ['Site config status', health.siteConfigStorageStatus],
    ['Diagnostics default', showProviderDiagnostics ? 'visible' : 'hidden'],
    ['App version', import.meta.env.VITE_APP_VERSION || 'not set'],
    ['Railway database configured', health.databaseConfigured ? 'yes' : 'no'],
    ['Duffel configured', health.duffelConfigured ? 'yes' : 'no'],
    ['Amadeus configured', health.amadeusConfigured ? 'yes' : 'no'],
    ['Analytics storage mode', health.analyticsStorageMode],
    ['Analytics storage status', health.analyticsStorageStatus],
    ['Webhook allowlist configured', health.adminSafeSettings?.webhookTestAllowlistConfigured ? 'yes' : 'no'],
    ['Webhook timeout ms', health.adminSafeSettings?.webhookTestTimeoutMs],
    ['Public analytics capture', health.adminSafeSettings?.publicAnalyticsEnabled ? 'enabled' : 'disabled'],
    ['Temporary test admin login', health.adminSafeSettings?.testAdminLoginEnabled ? 'enabled' : 'disabled'],
  ];

  return (
    <>
      <AdminPageTitle
        kicker="Safe environment summary"
        title="Settings"
        copy="No secrets, tokens, URLs or passwords are displayed here."
      />
      <dl className="admin-fields settings-fields">
        {items.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt>{key}</dt>
            <dd>{String(value ?? 'unknown')}</dd>
          </React.Fragment>
        ))}
      </dl>
    </>
  );
}
