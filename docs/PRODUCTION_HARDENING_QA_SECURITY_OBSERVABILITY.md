# Production hardening, QA, security and observability

This phase adds the first production-safety layer around the existing enquiry-first API. It does not add booking, supplier reservation, payment, Duffel order or Amadeus order flows.

## Runtime security controls

The API now applies baseline security headers to JSON API responses and static assets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security` when `NODE_ENV=production` or `ENABLE_HSTS=true`

Each response also includes `X-Request-Id`. If the caller sends a short header-safe `X-Request-Id`, the API reuses it; otherwise the server generates a UUID. This makes browser/admin reports easier to correlate with logs without echoing malformed header values.

## Rate limiting

The server includes a lightweight in-memory limiter for non-GET API traffic. It is intended as a local/Railway safety guard, not a replacement for edge/WAF controls.

| Setting | Default | Scope |
| --- | ---: | --- |
| `API_RATE_LIMIT_WINDOW_MS` | `60000` | Shared limiter window |
| `API_RATE_LIMIT_MAX` | `120` | General non-admin write API calls per IP/window |
| `ADMIN_RATE_LIMIT_MAX` | `60` | Admin write API calls per IP/window |
| `ENQUIRY_RATE_LIMIT_MAX` | `20` | `POST /api/travel/enquiries` calls per IP/window |

Set any request-count limit to `0` to disable that bucket. Invalid numeric values fall back to the defaults above. Limited requests return a controlled `429` JSON envelope plus `Retry-After`.

## Observability

Request logging is enabled by default and can be disabled with `REQUEST_LOGGING=false`. Logs use a structured `[api-request]` entry with:

- request id
- method and path (query string omitted)
- status code
- duration in milliseconds
- client IP
- user agent
- redacted authorization state

Provider and route errors continue to use controlled `[travel-provider-error]` and `[api-error]` log lines without exposing provider tokens, database URLs or admin tokens.

## Health and readiness checks

`GET /api/health` remains the broad diagnostics endpoint and now reports:

- storage modes and storage statuses
- provider status
- observability state
- security/rate-limit configuration values

`GET /api/readiness` is the deployment-facing readiness probe. It returns `200` when configured storage backends are ready and `503` when a selected backend is missing configuration or reports an error.

Recommended Railway checks:

```bash
curl -fsS "$RAILWAY_PUBLIC_DOMAIN/api/health"
curl -fsS "$RAILWAY_PUBLIC_DOMAIN/api/readiness"
```

## QA coverage

`npm run test:api` now verifies:

- the health endpoint still avoids secret exposure
- the readiness endpoint reports ready in JSON smoke mode
- every smoke-tested endpoint returns request/security headers
- invalid JSON and invalid enquiry payloads remain controlled JSON envelopes
- admin routes remain protected without an admin token
- admin deal and site-config mutation checks still work with a configured token

## Production checklist

Before promoting a deployment:

1. Set `ADMIN_ACCESS_TOKEN` to a long, unique server-side token.
2. Set `CORS_ORIGIN` to approved production origins instead of `*`.
3. Use Postgres storage modes only when `DATABASE_URL` is configured and `/api/readiness` returns `200`.
4. Keep `ENABLE_HSTS=true` in HTTPS production environments.
5. Review `npm run test:api` output and check that no response includes `DATABASE_URL`, `ADMIN_ACCESS_TOKEN`, `DUFFEL_ACCESS_TOKEN` or `AMADEUS_CLIENT_SECRET`.
6. Add platform-level rate limiting/WAF once real traffic starts; the in-memory limiter resets when a process restarts and is per-process when horizontally scaled.
