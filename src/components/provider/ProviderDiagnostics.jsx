import React, { useState } from 'react';
import { showProviderDiagnostics } from '../../app/appConstants.js';

export function ProviderDiagnostics({ diagnostics, onRefresh }) {
  const [isOpen, setIsOpen] = useState(showProviderDiagnostics);
  const errors = diagnostics.providerErrors || [];
  const statuses = diagnostics.providerStatus || diagnostics.providers || [];

  return (
    <aside className={`provider-diagnostics ${isOpen ? 'open' : 'collapsed'}`}>
      <div>
        <span>Developer/provider status</span>
        <button onClick={() => setIsOpen((open) => !open)}>{isOpen ? 'Hide' : 'Show'}</button>
      </div>
      {isOpen && (
        <>
          <div className="provider-refresh-row"><button onClick={onRefresh}>Refresh status</button></div>
          <p className="provider-strategy-note">Duffel preferred for flights · Amadeus optional sandbox/search provider · Package/affiliate providers remain enquiry/redirect only.</p>
      <dl>
        <dt>Front end</dt><dd>{diagnostics.frontendMode}</dd>
        <dt>Backend</dt><dd>{diagnostics.backendMode || 'mock/local'}</dd>
        <dt>Primary flight</dt><dd>{diagnostics.primaryFlightProvider || 'duffel'}</dd>
        <dt>Duffel</dt><dd>{diagnostics.duffelConfigured ? 'configured server-side' : 'not configured / server-only'}</dd>
        <dt>Amadeus</dt><dd>{diagnostics.amadeusConfigured ? 'configured optional sandbox' : 'not configured / optional sandbox'}</dd>
        <dt>Amadeus secondary</dt><dd>{diagnostics.amadeusSecondaryEnabled ? 'enabled' : 'disabled'}</dd>
        <dt>Booking.com</dt><dd>{diagnostics.bookingDemandEnabled ? (diagnostics.bookingDemandConfigured ? 'configured accommodation source' : 'enabled but needs credentials/mapping') : 'disabled accommodation source'}</dd>
        <dt>Active</dt><dd>{(diagnostics.activeProviders || []).join(', ') || 'mock'}</dd>
        <dt>Latest</dt><dd>{diagnostics.latestSource || 'mock'}</dd>
      </dl>
      {statuses.length > 0 && (
        <ul>
          {statuses.slice(0, 8).map((status) => (
            <li key={`${status.provider}-${status.lastMethod || status.mode}`}>{status.provider}: {status.mode || 'ready'}{Number.isFinite(status.resultCount) ? ` · ${status.resultCount} results` : ''}</li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <div className="provider-errors">
          <b>Latest provider notes</b>
          {errors.map((error, index) => <p key={`${error.provider}-${error.method}-${index}`}>{error.provider} {error.method}: {error.message}</p>)}
        </div>
      )}
        </>
      )}
    </aside>
  );
}

