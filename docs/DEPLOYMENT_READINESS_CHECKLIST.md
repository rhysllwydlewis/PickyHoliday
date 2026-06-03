
## Analytics and webhook env vars

- [ ] `ANALYTICS_STORAGE_MODE=json` is acceptable as fallback, or `postgres` is set with `DATABASE_URL`.
- [ ] `PUBLIC_ANALYTICS_ENABLED=true` or deliberately disabled.
- [ ] `WEBHOOK_TEST_ALLOWED_HOSTS` is configured for production where possible.
- [ ] `WEBHOOK_TEST_TIMEOUT_MS=5000` or another short safe timeout.
- [ ] Public health/readiness responses show analytics status but no connection strings or secrets.

## Temporary admin test login

- [ ] For non-live testing only, `ENABLE_TEST_ADMIN_LOGIN=true` may be used with `TEST_ADMIN_ACCESS_TOKEN=pickyholiday-test-admin`.
- [ ] Before production launch, set a strong `ADMIN_ACCESS_TOKEN` and disable/remove `ENABLE_TEST_ADMIN_LOGIN`.
- [ ] Confirm `/admin/login` works and `/admin`, `/admin/enquiries`, `/admin/deals`, `/admin/pages`, `/admin/ops` load after login.

## Partner redirect launch readiness

Before Railway production launch, set `VITE_TRAVEL_PROVIDER_MODE=api`, `TRAVEL_PROVIDER_MODE=duffel` or `hybrid`, `VITE_SHOW_DEMO_DEALS=false`, `ENABLE_PARTNER_REDIRECTS=true`, `PARTNER_REDIRECT_PROVIDER_MODE=enabled` and `ENABLE_TEST_ADMIN_LOGIN=false`. After deploy, search Barcelona, confirm results are not all demo fixtures, click “Check live price” to open a safe partner site, submit “Ask for group quote”, then run `/admin/ops` system tests. PickyHoliday must remain enquiry-first: no payments, bookings, orders, supplier reservations or ATOL claims.
