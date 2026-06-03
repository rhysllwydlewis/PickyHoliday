# Admin Operations Centre Phase

This phase adds `/admin/ops` as a safe operations centre for the owner. It keeps the current runtime admin access key model: the key is entered at `/admin/login`, stored only in `sessionStorage`, and sent as a Bearer token to admin APIs. For temporary non-live testing only, `pickyholiday-test-admin` works when `ADMIN_ACCESS_TOKEN` is unset and test login is enabled; set a real `ADMIN_ACCESS_TOKEN` and disable test login before launch.

## What changed

- Admin analytics overview cards for searches, enquiries, partner redirects, provider errors and top destinations.
- Recent analytics activity list with sanitised metadata only.
- Admin-only system test runner at `POST /api/admin/ops/run-tests`.
- Optional write test that creates one clearly marked test enquiry only when `includeWriteTests: true` is sent.
- Admin-only webhook tester at `POST /api/admin/ops/test-webhook`.
- `/api/health` and `/api/readiness` now include `analyticsStorageMode` and `analyticsStorageStatus`.

## System test behaviour

The safe test runner checks health/readiness construction, storage list operations, public content/deal lists, provider status, Duffel/database configured booleans, sitemap generation and robots generation. It does not call live booking, payment, order or supplier reservation flows.

When `includeWriteTests` is true, it creates a test enquiry with `customerEmail: admin-test@example.invalid` and `internalNotes: Automated admin test enquiry`. No real customer email is sent.

## Guardrails

No booking, payment, Duffel order, Amadeus order, supplier reservation, customer account or supplier account flow was added. Public and admin responses return booleans/status strings rather than secret values.

## Partner redirect/API mode checks

The operations centre system tests now warn if frontend or backend provider mode is mock, verify `/api/travel/search` responds, confirm `partner-redirect` appears when enabled, validate safe partner URLs, and document mock fallback reporting. Use these checks after deployment to confirm production is API-first and demo fixtures are not the default public experience.
