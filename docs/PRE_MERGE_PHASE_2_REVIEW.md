# Phase 2 pre-merge review

Date: 2026-06-01

## Scope guardrails checked

- [x] Mock mode remains the default and works without live API credentials.
- [x] No real credentials are committed; `.env.example` contains placeholders only.
- [x] Amadeus credentials are read server-side by the Node provider only.
- [x] No payment flow was added.
- [x] No live booking, flight order, hotel booking or fake booking confirmation was added.
- [x] Provider-adapter architecture remains in place with mock, Amadeus, affiliate/package scaffold and manual deals providers.
- [x] Affiliate/package providers remain scaffolds; TUI, Jet2, easyJet Holidays, Loveholidays and On the Beach flows were not built in this PR.

## Required Phase 2 acceptance criteria

- [x] `npm run build` passes.
- [x] App still renders from the Vite production build in mock mode.
- [x] Mock search still works without credentials.
- [x] Backend `GET /api/health` works and returns provider diagnostics.
- [x] Backend `POST /api/travel/search` works in mock mode.
- [x] Provider errors are isolated and do not break the whole registry response.
- [x] `providerErrors`, `providerStatus` and `meta` are returned in API responses.
- [x] Destination lookup route exists at `GET /api/travel/locations?keyword=barcelona` and `POST /api/travel/locations`.
- [x] Amadeus flight search supports origin/destination codes, dynamic lookup fallback, dates, adults, GBP, max result count and airline dictionaries.
- [x] Amadeus hotel pricing/offers are attempted where sandbox allows, with price-unavailable fallback.
- [x] Holiday composer only returns flight+hotel results when both sides exist and includes pricing confidence/source breakdown.
- [x] Provider diagnostics are visible in the UI.
- [x] Docs are updated for mock mode, local backend dev, Amadeus env vars, testing and future work.

## Product/API checks completed

- [x] Frontend production build completed with `npm run build`.
- [x] API smoke test completed in mock mode with `npm run test:api` against a running `npm run dev:api` server.
- [x] Bad JSON returned a controlled `400` envelope with no stack trace.
- [x] Oversized request bodies returned a controlled `413` envelope when `API_MAX_BODY_BYTES` was lowered for validation.
- [x] Provider isolation was checked by forcing an Amadeus connection failure and confirming the registry returned `providerErrors` instead of throwing the whole response.
- [x] Syntax checks passed for the main server/provider files.
- [x] `git diff --check` passed.

## Notes for merge reviewer

- Hotel pricing is best-effort in Amadeus sandbox. If `/v3/shopping/hotel-offers` is unavailable for a hotel/date, the app falls back to Hotel List results and labels the price as unavailable.
- Low-cost airline/package coverage remains future work for affiliate/package providers.
- The UI diagnostics panel intentionally exposes provider status and controlled provider error messages, but never raw credentials or tokens.
