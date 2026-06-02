# PickyHoliday

A Vite + React landing page implementation of the PickyHoliday group-travel homepage with a provider-based travel integration foundation.

## Current provider direction

PickyHoliday should not be locked to one travel API. After the Amadeus sandbox phase, the preferred flight API path is now **Duffel first**, with **Amadeus kept as an optional sandbox/search provider** and package/affiliate/manual deals remaining separate provider tracks.

Why the pivot:

- Duffel is more startup-friendly for future flight selling, test-mode development and pay-as-you-go style experimentation.
- Amadeus remains useful for sandbox search and broad travel APIs, but production flight booking/ticketing requires extra commercial, operational and accreditation work.
- UK/Europe holiday stock needs package/affiliate redirects and manual promoted deals for TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach and similar partners.
- Hotels can later use Duffel Stays, Expedia Rapid, Hotelbeds/HBX or another hotel-specialist provider.

This repo still does **not** create live bookings, Duffel orders, Amadeus orders, hotel bookings, payments or booking confirmations.

## Scripts

- `npm run dev` - start the Vite development server for the React app. During dev, `/api` is proxied to `http://localhost:8787`.
- `npm run dev:api` - run the lightweight travel API proxy on `PORT` or `8787`.
- `npm run build` - build production frontend assets into `dist/`.
- `npm run preview` - preview the production frontend bundle with Vite.
- `npm run server` / `npm start` - run the production Node server, serving `/api/*` routes and built `dist/` assets.
- `npm run test:api` - smoke-test a running local API server.

## Local development

Mock mode is the safe default and requires no credentials:

```bash
TRAVEL_PROVIDER_MODE=mock
VITE_TRAVEL_PROVIDER_MODE=mock
TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel
ENABLE_AMADEUS_SECONDARY=false
AFFILIATE_PROVIDER_MODE=mock
```

For backend-backed local development, run two terminals:

```bash
npm run dev:api
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`, so `VITE_API_BASE_URL` can stay blank locally. The API allows local Vite origins (`localhost` and `127.0.0.1` on port `5173`) by default; set `CORS_ORIGIN` to a comma-separated allow-list for split deployments. For a split deployed frontend/API, set `VITE_API_BASE_URL` to the API origin.

## Provider modes

Server-side provider selection is controlled by `TRAVEL_PROVIDER_MODE`:

- `mock` - mock provider plus package/affiliate config results; default and credential-free.
- `duffel` - Duffel flight provider if configured, plus manual deals and package/affiliate config results.
- `amadeus` - Amadeus sandbox/search provider if configured, plus manual deals and package/affiliate config results.
- `hybrid` - Duffel plus manual deals and package/affiliate config results; Amadeus is included only when `ENABLE_AMADEUS_SECONDARY=true`.

`TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel` records the preferred strategic flight path. Do not create any `VITE_DUFFEL_*` token variable: Duffel tokens must stay server-side only.

## Package/affiliate provider

The package provider is active in mock/config mode. It reads approved partner config and package-style fixtures from:

- `src/data/affiliatePartners.js`
- `src/data/packageDeals.js`

It currently supports placeholder package redirect candidates for TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach and Expedia. It is not a live affiliate feed and does not create bookings. Partner redirects are only returned when the URL matches approved partner domains.

## Duffel flight provider foundation

Set these server-side only values to experiment locally with a Duffel test token:

```bash
TRAVEL_PROVIDER_MODE=duffel
TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel
DUFFEL_ACCESS_TOKEN=
DUFFEL_BASE_URL=https://api.duffel.com
DUFFEL_VERSION=v2
```

Use a Duffel test token only in local/dev; test tokens usually start with `duffel_test_`. The current provider creates flight offer-request searches only. It does not create orders, payments, seat maps, ancillaries or booking confirmations.

## Amadeus sandbox/search

Amadeus is now optional/secondary rather than the primary long-term provider path. To enable sandbox search, set server-side secrets:

```bash
TRAVEL_PROVIDER_MODE=amadeus
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
AMADEUS_CURRENCY=GBP
```

For hybrid testing with Amadeus as a secondary provider:

```bash
TRAVEL_PROVIDER_MODE=hybrid
ENABLE_AMADEUS_SECONDARY=true
```

Do not commit real credentials. The app does not create live bookings, flight orders, hotel bookings or payments.

## Provider diagnostics

The homepage includes a Provider status area near the deals. It shows frontend mode, backend mode, primary flight provider, Duffel configured status, Amadeus configured status, active providers, latest result source, provider errors and whether Amadeus secondary mode is enabled. Wording states that Duffel is preferred for flights, Amadeus is optional sandbox/search, and package/affiliate providers are config/mock active until approved partner feeds exist.

## API envelopes

Travel routes return consistent JSON envelopes:

```json
{
  "providerMode": "mock",
  "results": [],
  "providerErrors": [],
  "meta": {
    "totalResults": 0,
    "activeProviders": ["mock", "affiliate-package"],
    "timestamp": "2026-06-01T00:00:00.000Z"
  }
}
```

Provider failures are isolated, so one failing provider does not prevent other provider results from returning.

## API smoke testing

Start the API first:

```bash
npm run dev:api
```

Then run:

```bash
npm run test:api
```

See `docs/API_TEST_COMMANDS.md` for curl commands.

## Customer enquiries and admin review

The site now treats **Ask for group quote** as a saved enquiry flow. Users complete name, email, optional phone, editable group size/dates, notes, and consent-to-contact before `POST /api/travel/enquiries` is called. The success state shows an enquiry reference and clearly states that it is not a booking confirmation. Search results and partner redirects remain inspiration/redirect/enquiry flows only; PickyHoliday does not create live bookings, supplier reservations, Duffel orders, Amadeus orders or payments.

A lightweight admin review page is available at `/admin/enquiries`. It asks for the admin token at runtime, stores it in `sessionStorage` only, and calls `GET /api/admin/enquiries` / `PATCH /api/admin/enquiries/:id/status` with `Authorization: Bearer <token>`. Configure the server-side `ADMIN_ACCESS_TOKEN` in Railway or your API environment; never expose it through frontend code.

Enquiry storage remains controlled by `ENQUIRY_STORAGE_MODE=json|postgres`. Railway Postgres still requires `DATABASE_URL` when `ENQUIRY_STORAGE_MODE=postgres`; JSON fallback remains available for local/mock use. Provider diagnostics are hidden by default behind a developer/provider status toggle and can be opened by default with `VITE_SHOW_PROVIDER_DIAGNOSTICS=true`.

See `docs/ENQUIRY_FORM_AND_ADMIN_UI_PHASE.md` for the full form/admin rollout notes.


## Admin dashboard, promoted deals and site settings

The owner admin area is available at `/admin/login`. Enter the server-side `ADMIN_ACCESS_TOKEN` at runtime; the browser stores it in `sessionStorage` only and never in `localStorage`. After login, `/admin` provides Dashboard, Enquiries, Promoted Deals, Site Content, Feature Flags and Settings sections. Logout clears the session token.

Promoted deals are managed at `/admin/deals` and stored in `data/promoted-deals.json` by default or Postgres when `PROMOTED_DEAL_STORAGE_MODE=postgres` and `DATABASE_URL` are configured. Only active deals are returned by `GET /api/deals/promoted`; draft, paused and archived deals stay private. Affiliate URLs are validated so unsafe `javascript:` or `data:` URLs are rejected.

Site content and feature flags are managed at `/admin/content` and `/admin/features`. Public clients read safe copy and flags from `GET /api/site-config`; no secrets, database URLs or admin tokens are exposed. JSON fallback writes to `data/site-config.json`; Postgres mode uses `SITE_CONFIG_STORAGE_MODE=postgres` and `DATABASE_URL`.

This remains enquiry-first: no live booking, payments, Duffel orders, Amadeus orders, supplier reservations or real emails are created by the admin tools.
