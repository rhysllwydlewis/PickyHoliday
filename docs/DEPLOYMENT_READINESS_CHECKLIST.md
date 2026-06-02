
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
