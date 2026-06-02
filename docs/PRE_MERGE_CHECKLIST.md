# Affiliate package provider pre-merge checklist

## Scope guardrails

- [ ] Mock mode works by default without live API credentials.
- [ ] No real credentials are committed.
- [ ] Duffel, Amadeus and affiliate tracking values remain server-side only unless a partner explicitly approves otherwise.
- [ ] No browser-side Duffel token usage exists.
- [ ] No Duffel orders are created.
- [ ] No payment flow is implemented.
- [ ] No live booking, flight order, hotel booking or fake booking confirmation is shown.
- [ ] Provider-adapter architecture remains intact and mock provider remains available.
- [ ] Amadeus remains available but is not described as the primary long-term provider.

## Product flow

- [ ] Homepage renders with PickyHoliday branding intact.
- [ ] Mock search returns normalised holiday results.
- [ ] Mock flight search includes Duffel-shaped flight-only fixtures.
- [ ] Package search returns affiliate/package config results.
- [ ] Package results show partner/supplier names, package-style copy and safe non-live booking modes.
- [ ] “Continue to partner” only appears when a provider supplies a safe approved partner URL.
- [ ] “Ask for group quote” remains available.
- [ ] Provider diagnostics show primary flight provider, Duffel configured status, Amadeus configured status, active providers, latest result source, provider errors and package/affiliate provider status.
- [ ] Enquiry CTA creates only a mock enquiry and clearly states that no booking was created.

## Backend/API

- [ ] `GET /api/health` returns provider status including Duffel and affiliate-package.
- [ ] `GET /api/travel/locations?keyword=barcelona` returns a consistent location envelope.
- [ ] `POST /api/travel/search` returns results in mock mode.
- [ ] `POST /api/travel/packages` returns package/affiliate results in mock/config mode.
- [ ] `POST /api/travel/flights`, `/hotels`, `/packages` and `/holiday-composer` return consistent JSON envelopes.
- [ ] `POST /api/travel/enquiries` returns a mock enquiry response, not a booking confirmation.
- [ ] Bad JSON returns a controlled 400 response.
- [ ] One provider failing does not fail the whole registry response.
- [ ] Hybrid mode includes Amadeus only when `ENABLE_AMADEUS_SECONDARY=true`.
- [ ] Partner redirects are restricted to approved domains.
- [ ] CORS and request body limits remain in place.

## Validation

- [ ] `npm run build` passes.
- [ ] `npm run test:api` passes against a running `npm run dev:api` server in mock mode.
- [ ] `docs/API_TEST_COMMANDS.md` curl commands are still accurate.

## Future PRs, not this PR

- [ ] Manual promoted deals admin/source.
- [ ] Persistent enquiry/CRM storage.
- [ ] Hotel depth provider such as Duffel Stays, Expedia Rapid or Hotelbeds/HBX.
- [ ] Payments.
- [ ] Live booking.

## Enquiry form and admin UI checklist

- [ ] `npm install` completed and lockfile checked.
- [ ] `npm run build` passes.
- [ ] `npm run test:api` passes against a running local API.
- [ ] Homepage renders and provider diagnostics are hidden by default or behind the developer/provider toggle.
- [ ] **Ask for group quote** opens a real customer form with required name, valid email, required destination and required consent validation.
- [ ] Successful enquiry save shows an enquiry reference and says it is not a booking confirmation.
- [ ] `/admin/enquiries` prompts for a runtime admin token, stores it only in `sessionStorage`, and never exposes the token after entry.
- [ ] Admin list displays persisted enquiries and supports status updates to `new`, `reviewing`, `contacted`, `quoted`, and `closed`.
- [ ] Railway has `ADMIN_ACCESS_TOKEN` set server-side, and Postgres mode still depends on `ENQUIRY_STORAGE_MODE=postgres` plus `DATABASE_URL`.
- [ ] No booking, payment, Duffel order, Amadeus order, supplier reservation or real email sending was added.


## Latest pre-merge verification (2026-06-02)

- [x] Reviewed the previous enquiry/admin UI patch for broken validation, admin token storage handling, backend status-route parsing, customer-facing diagnostics, and docs coverage.
- [x] Confirmed the enquiry form can now show inline validation errors on submit instead of leaving users blocked by a disabled button before errors are shown.
- [x] Confirmed `/admin/enquiries` keeps using runtime token entry and `sessionStorage` only, with guarded storage access for browsers that block session storage.
- [x] Confirmed the backend status route matches `PATCH /api/admin/enquiries/:id/status` exactly and updates the enquiry id segment, not the literal `status` segment.
- [x] Ran `npm install`.
- [x] Ran `npm run build`.
- [x] Ran `npm run test:api` against a local mock API with `ADMIN_ACCESS_TOKEN` configured.
- [x] Ran local HTTP checks for homepage/admin route rendering, enquiry creation, admin listing, and status update to `contacted`.
- [x] Ran a Postgres-not-configured check to confirm enquiry writes return a controlled `503` when `ENQUIRY_STORAGE_MODE=postgres` is set without `DATABASE_URL`.
- [x] Confirmed no booking, payment, Duffel order, Amadeus order, supplier reservation, real email sending, or committed secret was added.
