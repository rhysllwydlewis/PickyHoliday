# Analytics and Webhook Testing

## Analytics storage

Analytics events use `ANALYTICS_STORAGE_MODE=json` by default and write to `data/analytics-events.json` at runtime. `ANALYTICS_STORAGE_MODE=postgres` uses the existing server-side `DATABASE_URL` and creates an `analytics_events` table if needed.

Readiness treats JSON analytics as a safe fallback. Postgres analytics is included in readiness only when `ANALYTICS_STORAGE_MODE=postgres`; a missing or errored Postgres analytics store then makes readiness fail with a controlled storage message.

## Tracked events

The server and frontend record safe events including:

- `search_submitted`
- `enquiry_created`
- `partner_redirect_clicked`
- `content_page_view`
- `enquiry_form_opened`
- `admin_login_success`
- `admin_login_failed`
- `admin_status_update`
- `admin_promoted_deal_saved`
- `admin_content_page_saved`
- `api_provider_error`
- `webhook_test_sent`
- `system_test_run`

The public endpoint `POST /api/analytics/events` accepts only public-safe types and sanitises metadata. Admin event types are rejected publicly.

## What is not tracked

Analytics does not intentionally store full admin tokens, `DATABASE_URL`, Duffel/Amadeus secrets, webhook secrets or unnecessary customer personal data. IP addresses are hashed when captured.

## Webhook tester

`POST /api/admin/ops/test-webhook` is admin-only. It validates the URL, allows HTTPS by default, allows `http://localhost` only in development/test, rejects unsafe schemes, supports `WEBHOOK_TEST_ALLOWED_HOSTS`, times out after `WEBHOOK_TEST_TIMEOUT_MS`, and returns only status, duration and a 500-character response snippet.

Do not include secrets in test payloads. The test sender sets `X-PickyHoliday-Test: true` and does not persist target URLs with query strings.
