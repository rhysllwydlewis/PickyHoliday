# Partner redirect live-results phase

This phase moves PickyHoliday away from dummy holiday cards as the production default without adding booking, payment or supplier-reservation flows.

## What changed

- The browser defaults to `VITE_TRAVEL_PROVIDER_MODE=api`, so public search calls the backend unless local/dev explicitly sets `VITE_TRAVEL_PROVIDER_MODE=mock`.
- The backend defaults to `TRAVEL_PROVIDER_MODE=duffel` and includes `partner-redirect` results when `ENABLE_PARTNER_REDIRECTS=true` and `PARTNER_REDIRECT_PROVIDER_MODE=enabled`.
- Demo fixture cards are hidden unless `VITE_SHOW_DEMO_DEALS=true`/`SHOW_DEMO_DEALS=true` is set for local demos.
- Partner redirect cards send customers to trusted partners to check live price and availability.

## Business model

This is the fastest safe route for a smaller travel discovery/enquiry site: show useful partner search paths, capture group quote enquiries, and let partners handle live price, availability, booking and protection terms. PickyHoliday does not take payments, create bookings, issue confirmations, create Duffel/Amadeus orders or make supplier reservations.

## Railway variables

Use these production-oriented values:

```env
TRAVEL_PROVIDER_MODE=duffel
VITE_TRAVEL_PROVIDER_MODE=api
VITE_SHOW_DEMO_DEALS=false
ENABLE_PARTNER_REDIRECTS=true
PARTNER_REDIRECT_PROVIDER_MODE=enabled
ENABLE_TEST_ADMIN_LOGIN=false
```

`TRAVEL_PROVIDER_MODE=mock`, `VITE_TRAVEL_PROVIDER_MODE=mock` and `VITE_SHOW_DEMO_DEALS=true` are local/dev/demo-only settings.

## How to verify

1. Open the homepage and search Barcelona.
2. Confirm provider diagnostics or `/api/health` show frontend API/backend mode rather than mock.
3. Confirm cards include `partner-redirect` results with a “Check live price” CTA.
4. Click “Check live price” and verify it opens an approved partner search URL in a new tab.
5. Click “Ask for group quote” and confirm the enquiry form still saves an enquiry only.
6. Open `/admin/ops`, run system tests, and check the API-mode, partner-provider and URL-safety checks.

## Guardrails

No code in this phase creates bookings, payments, Duffel orders, Amadeus orders, supplier reservations, ATOL claims or booking confirmations. Partner pages are responsible for live price, availability, booking and protection terms before purchase.
