# PickyHoliday

A Vite + React landing page implementation of the PickyHoliday group-travel homepage concept with a provider-based travel integration foundation.

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
```

For backend-backed local development, run two terminals:

```bash
npm run dev:api
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`, so `VITE_API_BASE_URL` can stay blank locally. The API allows local Vite origins (`localhost` and `127.0.0.1` on port `5173`) by default; set `CORS_ORIGIN` to a comma-separated allow-list for split deployments. For a split deployed frontend/API, set `VITE_API_BASE_URL` to the API origin.

## Provider diagnostics

The homepage includes a small Provider status area near the deals. It shows frontend mode, backend mode, active providers, Amadeus credential status, latest result source and provider errors. User-facing copy remains friendly; diagnostics show controlled errors without exposing secrets.

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

## Amadeus sandbox

The Amadeus provider is server-side only. To enable it, set server-side secrets in your local or deployment environment:

```bash
TRAVEL_PROVIDER_MODE=amadeus
VITE_TRAVEL_PROVIDER_MODE=amadeus
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
AMADEUS_CURRENCY=GBP
```

Current sandbox support includes airport/city lookup, Flight Offers Search, Hotel List and a best-effort Hotel Offers pricing step. If hotel pricing is unavailable in sandbox, hotel results are still returned with clear “price unavailable” wording.

Do not commit real credentials. The app does not create live bookings, flight orders, hotel bookings or payments.

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
