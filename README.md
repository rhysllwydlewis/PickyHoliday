# PickyHoliday

A Vite + React landing page implementation of the PickyHoliday group-travel homepage with a provider-based travel integration foundation.

## Current provider direction

PickyHoliday should not be locked to one travel API. After the Amadeus sandbox phase, the preferred flight API path is now **Duffel first**, with **Amadeus kept as an optional sandbox/search provider** and package/affiliate/manual deals remaining separate provider tracks.

Why the pivot:

- Duffel is more startup-friendly for future flight selling, test-mode development and pay-as-you-go style experimentation.
- Amadeus remains useful for sandbox search and broad travel APIs, but production flight booking/ticketing requires extra commercial, operational and accreditation work.
- UK/Europe holiday stock still needs package/affiliate redirects and manual promoted deals for TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach and similar partners.
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
```

For backend-backed local development, run two terminals:

```bash
npm run dev:api
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`, so `VITE_API_BASE_URL` can stay blank locally. The API allows local Vite origins (`localhost` and `127.0.0.1` on port `5173`) by default; set `CORS_ORIGIN` to a comma-separated allow-list for split deployments. For a split deployed frontend/API, set `VITE_API_BASE_URL` to the API origin.

## Provider modes

Server-side provider selection is controlled by `TRAVEL_PROVIDER_MODE`:

- `mock` - mock provider only; default and credential-free.
- `duffel` - Duffel flight provider if configured, plus manual deals and affiliate/package scaffolds.
- `amadeus` - Amadeus sandbox/search provider if configured, plus manual deals and affiliate/package scaffolds.
- `hybrid` - Duffel plus manual deals and affiliate/package scaffolds; Amadeus is included only when `ENABLE_AMADEUS_SECONDARY=true`.

`TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel` records the preferred strategic flight path. Do not create any `VITE_DUFFEL_*` token variable: Duffel tokens must stay server-side only.

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

The homepage includes a Provider status area near the deals. It shows frontend mode, backend mode, primary flight provider, Duffel configured status, Amadeus configured status, active providers, latest result source, provider errors and whether Amadeus secondary mode is enabled. Wording explicitly states that Duffel is preferred for flights, Amadeus is optional sandbox/search, and package/affiliate providers remain future work.

## API envelopes

Travel routes return consistent JSON envelopes:

```json
{
  "providerMode": "mock",
  "results": [],
  "providerErrors": [],
  "meta": {
    "totalResults": 0,
    "activeProviders": ["mock"],
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
