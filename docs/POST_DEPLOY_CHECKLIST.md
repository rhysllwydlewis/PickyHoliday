# Post-deploy stabilisation checklist

Use this checklist after each Railway deployment to confirm the site remains enquiry-first, server-side-only for supplier integrations, and safe for public traffic.

## Railway environment variables

- Confirm Railway production variables are set only in Railway and are not committed to the repository or exposed as `VITE_` variables.
- Confirm `ADMIN_ACCESS_TOKEN` is a strong production-only token and is rotated if it was shared outside the deployment team.
- Confirm `ENABLE_TEST_ADMIN_LOGIN` is **not** enabled in production. Test admin login is for local smoke tests only.
- Confirm supplier credentials, database URLs and webhook secrets are visible only to the server runtime.

## Booking.com Demand safety

- `ENABLE_BOOKING_DEMAND`
  - Leave unset or `false` unless the accommodation contribution has been explicitly approved for the deployment.
  - When disabled, `/api/health` should still include a controlled `booking-demand` provider status without making it active.
- `BOOKING_DEMAND_MODE`
  - Use `disabled` or `mock` for verification.
  - Do not use a live mode until a separate supplier-reservation and customer-confirmation flow has been designed and approved.
- `BOOKING_DEMAND_CITY_MAPPINGS`
  - Keep mappings as a compact JSON object such as `{ "Barcelona": "12345" }`.
  - Verify unmapped destinations fail closed with a provider note and do not break public search.
- No Booking.com reservations are created by PickyHoliday. Public copy must continue to say that results are enquiry-first and no booking/payment/reservation has been made.

## Admin token safety

- Open `/admin/login` and sign in with the production admin token only over HTTPS.
- Confirm the token is stored in browser `sessionStorage` only for the current browser session.
- Confirm `/api/admin/*` endpoints return controlled `401` responses without the bearer token.
- Rotate the token if a deployment log, screenshot or support thread may have exposed it.

## Public diagnostics and secrets

- Provider diagnostics must remain hidden publicly unless `VITE_SHOW_PROVIDER_DIAGNOSTICS=true` is deliberately set for a temporary diagnostic deploy.
- Do not set frontend `VITE_` variables containing Booking.com, Duffel, Amadeus, database, webhook or admin secrets.
- Confirm built frontend assets do not contain `BOOKING_DEMAND_API_KEY`, `BOOKING_DEMAND_AFFILIATE_ID`, `DUFFEL_ACCESS_TOKEN`, `AMADEUS_CLIENT_SECRET`, `DATABASE_URL`, `ADMIN_ACCESS_TOKEN`, `postgres://` or `postgresql://`.

## Post-deploy smoke checks

Run the smoke checks against the deployed Railway URL, then run the local Booking.com provider guardrail checks:

```bash
npm run build
API_BASE_URL=https://<railway-app-host> ADMIN_ACCESS_TOKEN=<production-admin-token> npm run test:api
npm run test:booking-demand
```

Manually verify:

- `/` loads the homepage app shell.
- `/search` loads the search route.
- `/admin/login` loads the owner login shell.
- `/destinations/barcelona`, `/group-holidays/stag-and-hen` and `/guides/best-group-holiday-destinations` load public content shells.
- `/api/health` and `/api/readiness` return safe JSON without secrets.
- `/sitemap.xml` includes published public content pages.
- `/robots.txt` disallows admin paths and points to the sitemap.

## Admin Ops after deployment

- Sign in to `/admin/login`.
- Open `/admin/ops`.
- Run the safe tests with write tests disabled first.
- Confirm all checks pass or produce controlled warnings only.
- Do not send real customer confirmations, supplier bookings, Duffel/Amadeus order creation or Booking.com reservations from Admin Ops.
