# Railway Postgres enquiry storage pre-merge checklist

## Scope guardrails

- [x] JSON enquiry storage remains the default when `ENQUIRY_STORAGE_MODE` is unset or `json`.
- [x] Postgres enquiry storage is only selected when `ENQUIRY_STORAGE_MODE=postgres`.
- [x] Missing `DATABASE_URL` in Postgres mode returns controlled API errors rather than silently falling back or losing enquiries.
- [x] `/api/health` reports storage metadata without exposing `DATABASE_URL`.
- [x] No secrets or Railway connection strings are committed.
- [x] No payments, bookings, Duffel orders, supplier reservations, fake booking confirmations, or live email sending are added.

## Enquiry API behaviour

- [x] `POST /api/travel/enquiries` keeps returning an enquiry-only response and the public no-booking/no-reservation message.
- [x] `GET /api/admin/enquiries` still returns the selected store's enquiry list for authorised admin requests.
- [x] `PATCH /api/admin/enquiries/:id/status` still validates status values and updates the selected store.
- [x] Invalid enquiry email input returns a controlled `400` and does not persist an enquiry.
- [x] Postgres rows map back to the existing camelCase enquiry shape used by the JSON store.

## Railway rollout readiness

- [x] `.env.example` documents `ENQUIRY_STORAGE_MODE=json`, `DATABASE_URL=`, `ADMIN_ACCESS_TOKEN=`, and `ALLOW_UNPROTECTED_ADMIN=false`.
- [x] Docs instruct Railway users to keep JSON mode until this code is deployed and `DATABASE_URL` is configured on the app service.
- [x] Docs include Railway Postgres setup, `DATABASE_URL` app-service reference guidance, and curl checks for health, create enquiry, admin list, and invalid email.
- [x] `docs/API_TEST_COMMANDS.md` includes the new health storage metadata and enquiry validation checks.

## Validation performed

- [x] `npm install` completed successfully.
- [x] `npm run build` completed successfully.
- [x] JSON-mode smoke tests passed against a local running API server.
- [x] Postgres-mode-without-`DATABASE_URL` health check returned `databaseConfigured:false` and `databaseStatus:"postgres-not-configured"`.
- [x] Postgres-mode-without-`DATABASE_URL` enquiry POST returned a controlled `503` without exposing the connection string or secret values.

## Not validated in this environment

- [ ] Live Railway app URL smoke test. The Railway URL and admin token were not available in the local agent environment.
- [ ] Live Railway Postgres insert/list/status-update verification. A Railway `DATABASE_URL` was not available in the local agent environment.
