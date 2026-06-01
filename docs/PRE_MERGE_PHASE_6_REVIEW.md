# Phase 6 pre-merge review

Date: 2026-06-01

PR: Build affiliate package provider and partner redirect foundation

## Review summary

This PR moves the package/affiliate provider from scaffold-only to active mock/config mode. It adds approved partner configuration, package-style fixtures, safe redirect validation, registry wiring, local browser mock support, documentation and smoke-test assertions.

## Fixes made during review

- Fixed local browser mock mode so it includes the affiliate/package provider as well as the mock provider. Without this, the backend mock route could return package results but the Vite/browser-only mock path could miss them.
- Confirmed provider registry includes `affiliate-package` in mock/config, Duffel, Amadeus and hybrid modes while keeping credentialed providers opt-in.
- Confirmed package redirect URLs are only returned when they match approved partner domains.
- Confirmed unsafe or missing partner URLs are downgraded to `manual-quote` rather than `affiliate`.
- Confirmed smoke tests now assert affiliate-package provider status and package results.

## Scope guardrails

- [x] Mock mode works without live API credentials.
- [x] No real affiliate IDs are committed.
- [x] No Duffel token or Amadeus secret is exposed to browser code.
- [x] No live booking is implemented.
- [x] No payment flow is implemented.
- [x] No Duffel orders are created.
- [x] No Amadeus orders are created.
- [x] No fake booking confirmation is added.
- [x] Partner redirects are restricted to approved domains.
- [x] Package results are clearly mock/config redirect candidates.

## Product checks

- [x] `src/data/affiliatePartners.js` exists and defines partner metadata.
- [x] `src/data/packageDeals.js` exists and defines package-style results.
- [x] `affiliatePackageProvider.search()` no longer returns an empty array by default.
- [x] `affiliatePackageProvider.packages()` no longer returns an empty array by default.
- [x] Package fixtures cover TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach and Expedia-style routes.
- [x] Package results support `bookingMode: affiliate` when a URL is approved.
- [x] Package results fall back to `manual-quote` when a partner URL is missing or unsafe.
- [x] Local frontend mock mode includes package/affiliate results.

## Backend/API checks

- [x] `GET /api/health` should include `affiliate-package` in provider status.
- [x] `POST /api/travel/packages` should return package results in mock/config mode.
- [x] `POST /api/travel/search` should return mixed mock and package results where the criteria match.
- [x] `POST /api/travel/enquiries` remains enquiry-only and does not create a booking.
- [x] Provider error isolation remains intact.

## Validation still required before merge

These commands must be run in a normal dev environment before merging because this review environment cannot resolve GitHub/npm network access:

```bash
npm install
npm run build
TRAVEL_PROVIDER_MODE=mock AFFILIATE_PROVIDER_MODE=mock npm run dev:api
npm run test:api
```

## Known non-blocking items

- The public UI still includes temporary trust/protection wording such as ATOL/Trustpilot placeholders from earlier phases. This was intentionally left alone because the site is not live, but it should be centralised before launch.
- The provider diagnostics are still visible on the public homepage. This remains useful during build, but should later move behind a dev/admin flag.
- Partner links are placeholder home/deep-link candidates only; they are not approved commercial affiliate links yet.
- No live partner feeds are connected.

## Recommended next phase after merge

The next PR should focus on **manual promoted deals/admin source or enquiry persistence**. The stronger commercial sequence is:

1. Manual promoted deals source/admin so offers can be edited without code changes.
2. Enquiry persistence with email/CRM notification.
3. Hotel depth provider.
4. Payments only when the commercial/legal flow is ready.
5. Live booking only after fulfilment, support and protection requirements are clear.
