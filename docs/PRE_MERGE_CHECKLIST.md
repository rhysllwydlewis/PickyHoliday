# Project pre-merge checklist

Use this checklist before merging changes to PickyHoliday.

## Required checks

- Run `npm install` when dependencies or lockfile state need verification.
- Run `npm run build`.
- Run `npm run test:api`.
- Confirm the homepage still renders.
- Confirm the enquiry form still saves an enquiry in the selected storage mode.
- Confirm admin dashboard access remains protected by `ADMIN_ACCESS_TOKEN` unless local test overrides are explicitly enabled.
- Confirm admin enquiries, promoted deals, site content, feature flags and settings still work.
- Confirm public content pages, sitemap and robots routes work when this phase is in scope.

## Storage and environment

- Keep JSON fallbacks available for enquiry, promoted deal, site config and content page storage.
- Do not expose `DATABASE_URL`, `ADMIN_ACCESS_TOKEN`, `DUFFEL_ACCESS_TOKEN`, `AMADEUS_CLIENT_SECRET` or other secrets to browser code.
- If a Postgres storage mode is selected without `DATABASE_URL`, readiness should report not configured with a controlled 503 instead of crashing.

## Product guardrails

- Do not add live booking.
- Do not add payments.
- Do not create Duffel orders.
- Do not create Amadeus orders.
- Do not create supplier reservations.
- Do not claim an enquiry is a booking confirmation.
- Do not make fake protection, ATOL or package booking claims.

## Admin operations centre checks

- [ ] `/admin/ops` loads after admin login.
- [ ] Analytics summary and recent activity load without secret values.
- [ ] Safe system tests return pass/warn/fail rows.
- [ ] Optional write test creates only the marked admin test enquiry.
- [ ] Webhook tester rejects invalid, `javascript:`, `data:`, `file:` and `ftp:` URLs.
- [ ] No booking/payment/order/reservation/email sending flow has been added.

## Admin login check

- [ ] In non-live test mode, `/admin/login` accepts `pickyholiday-test-admin` when `ADMIN_ACCESS_TOKEN` is unset and `ENABLE_TEST_ADMIN_LOGIN=true`.
- [ ] Production launch plan sets a real `ADMIN_ACCESS_TOKEN` and disables temporary test login.

## Partner redirect pre-merge checks

- Confirm `.env.example` keeps `VITE_TRAVEL_PROVIDER_MODE=api`, `TRAVEL_PROVIDER_MODE=duffel`, `VITE_SHOW_DEMO_DEALS=false`, `ENABLE_PARTNER_REDIRECTS=true` and `PARTNER_REDIRECT_PROVIDER_MODE=enabled`.
- Run `npm run build` and `npm run test:api`.
- Confirm search cards say “Check live price” / “Ask for group quote” for partner redirects and do not say “Book now”, “Booking confirmed”, fake ATOL protection or supplier reservation wording.
- Confirm `/admin/ops` includes frontend/backend provider mode, partner provider, partner URL safety and mock-mode warning checks.
