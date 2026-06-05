# Pre-merge review: Booking.com Demand hardening and frontend modularisation

Date: 2026-06-05

## Automated checks run

- [x] `npm run build` — production Vite build completed.
- [x] `npm run test:booking-demand` — Booking.com Demand disabled, missing-credentials, unmapped destination, mapped mock contribution and redaction checks passed.
- [x] `npm run test:api` — API smoke checks passed, including health, readiness, holiday composer, admin ops, public app-shell routes and controlled error envelopes.

## Booking.com Demand checks

- [x] Provider is server-side only; `.env.example` documents only `BOOKING_DEMAND_*` variables and no `VITE_BOOKING_*` secrets.
- [x] `/api/health` and `/api/readiness` include safe Booking.com Demand status through the provider registry without exposing credentials.
- [x] Provider diagnostics expose Booking.com enabled/configured state while remaining hidden by default unless the existing diagnostics flag is enabled.
- [x] Holiday composer can receive normalised Booking.com hotel/accommodation results in mock/test or live/sandbox mode when explicitly enabled and mapped.
- [x] Disabled, missing-credentials and unmapped-destination states produce controlled provider notes/errors without breaking other providers.
- [x] Destination ids are not guessed; the provider uses only verified `BOOKING_DEMAND_CITY_MAPPINGS` or `criteria.filters.bookingDemandCityId`.
- [x] Error strings redact bearer/basic tokens, API keys, affiliate ids, passwords, secrets and database URLs before provider notes are exposed.
- [x] Booking.com result cards show supplier/source, check-live-price confidence when unconfirmed, partner-site cancellation/terms copy and no-booking-created guardrails.

## Frontend modularisation checks

- [x] `src/main.jsx` is a small React entrypoint.
- [x] Top-level app/root route selection lives in `src/app/App.jsx` and preserves current routes.
- [x] Requested route/component/data/SEO module files exist; guide/footer widget data and SEO meta helpers now contain real implementation instead of circular re-export placeholders.
- [x] Public smoke checks confirm `/`, `/search`, `/destinations/barcelona`, `/group-holidays/stag-and-hen` and `/guides/best-group-holiday-destinations` still serve the app shell.
- [x] Shortlist localStorage key, admin `sessionStorage` token flow, admin route list and provider diagnostics hidden-by-default behaviour are preserved.

## Enquiry-first guardrails

- [x] No live bookings, payments, reservations, Booking.com reservations, Duffel orders, Amadeus orders, cancellations or customer confirmation emails were added.
- [x] Composer/search smoke checks reject forbidden customer-flow wording such as `Book now`, `Booking confirmed`, fake ATOL claims and payment-success claims.
- [x] Admin ops copy and optional write tests remain enquiry-only and do not create supplier reservations or send customer confirmation emails.

## Remaining setup before production enablement

- [ ] Keep `ENABLE_BOOKING_DEMAND=false` until approved Booking.com Demand server credentials are available.
- [ ] Add only verified city ids to `BOOKING_DEMAND_CITY_MAPPINGS` in Railway/server env.
- [ ] Use `BOOKING_DEMAND_MODE=mock` for non-live smoke checks, then switch to `sandbox` or `live` only when provider credentials and mappings have been approved.
