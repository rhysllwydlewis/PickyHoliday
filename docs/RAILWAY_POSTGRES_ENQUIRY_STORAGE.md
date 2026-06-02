# Railway Postgres enquiry storage

PickyHoliday can store enquiry records in Railway PostgreSQL while keeping the existing JSON store as the safe default fallback. This is enquiry persistence only: it does **not** create bookings, payments, Duffel orders, Amadeus orders, supplier reservations, or real outbound emails.

## Storage modes

| Mode | Environment | Behaviour |
| --- | --- | --- |
| JSON fallback | `ENQUIRY_STORAGE_MODE=json` or unset | Uses `data/enquiries.json` in the app runtime. This is the default and remains useful for local/dev and safe rollout. |
| Postgres | `ENQUIRY_STORAGE_MODE=postgres` with `DATABASE_URL` set | Uses Railway PostgreSQL via `DATABASE_URL` and auto-creates the `enquiries` table/indexes if missing. |
| Misconfigured Postgres | `ENQUIRY_STORAGE_MODE=postgres` without `DATABASE_URL` | The app does not crash on startup. `/api/health` reports `postgres-not-configured`, and enquiry writes return a controlled server error rather than silently dropping data. |

JSON is fallback only. Railway filesystem JSON storage may not be durable across redeploys, so production enquiry persistence should move to Postgres once the deployment is green and `DATABASE_URL` is configured.

## Step-by-step Railway rollout

### Step 1: Create Railway PostgreSQL

Create a Railway PostgreSQL service in the same Railway project as the PickyHoliday app service.

### Step 2: Reference the database from the app service

In the app service variables, set:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

The exact service name may differ. Use Railway’s variable reference picker where possible so the app service points at the PostgreSQL service variable.

### Step 3: Keep JSON mode first

Keep:

```text
ENQUIRY_STORAGE_MODE=json
```

Do this while deploying the Postgres-support PR so the app remains on the known JSON fallback until the new code is live.

### Step 4: Deploy the Postgres-support PR

Deploy this PR with JSON mode still selected. Confirm the app deploys successfully before switching persistence modes.

### Step 5: Switch to Postgres after green deployment

After deployment is green, change:

```text
ENQUIRY_STORAGE_MODE=postgres
```

Only make this change after `DATABASE_URL` is present on the app service.

### Step 6: Redeploy

Redeploy or restart the Railway app service so the app starts using Postgres for enquiries.

### Step 7: Test health and enquiry creation

Test `/api/health` and `/api/travel/enquiries` after redeploying.

```bash
curl https://YOUR_APP_URL/api/health
curl -X POST https://YOUR_APP_URL/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
```

## Health check fields

The API health response includes storage metadata without exposing secrets:

- `enquiryStorageMode`: `json` or `postgres`
- `databaseConfigured`: `true` when `DATABASE_URL` is set on the server, otherwise `false`
- `databaseStatus`: one of `json`, `postgres-ready`, `postgres-not-configured`, or `postgres-error`

The health response must never include `DATABASE_URL`, `PGPASSWORD`, `ADMIN_ACCESS_TOKEN`, or any connection string.

## Manual curl checks

Replace `https://YOUR_APP_URL` and `YOUR_ADMIN_ACCESS_TOKEN` with the Railway app URL and configured admin token.

### Health

```bash
curl https://YOUR_APP_URL/api/health
```

### Create enquiry

```bash
curl -X POST https://YOUR_APP_URL/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
```

The response must remain enquiry-only and include: “Your enquiry has been saved. This is not a booking confirmation and no supplier reservation has been made.”

### Invalid email

```bash
curl -i -X POST https://YOUR_APP_URL/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"bad-email","consentToContact":true}'
```

Expected result: HTTP `400` with controlled validation errors. The invalid enquiry should not be persisted.

### Admin list

```bash
curl https://YOUR_APP_URL/api/admin/enquiries \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

### Admin status update

```bash
curl -X PATCH https://YOUR_APP_URL/api/admin/enquiries/ENQUIRY_ID/status \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'
```

## Security and limitations

- `DATABASE_URL` must never be committed or exposed to browser code.
- Do not create `VITE_DATABASE_URL` or any other `VITE_*` variable containing database credentials.
- `ADMIN_ACCESS_TOKEN` must remain server-side and must never be exposed to browser code.
- JSON remains a fallback only and may not persist across Railway redeploys.
- Postgres mode creates, lists, and updates enquiry records only.
- No booking, payment, Duffel order, Amadeus order, supplier reservation, or real email is created by this storage change.

## Customer form/admin UI Railway checks

For the form/admin phase, keep the Railway server variables server-side only:

```bash
ENQUIRY_STORAGE_MODE=postgres
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_ACCESS_TOKEN=<strong runtime token>
```

After deployment, submit an enquiry from the public **Ask for group quote** form. Open `/admin/enquiries`, enter the runtime admin token, confirm the enquiry appears, update the status to `contacted`, refresh, and confirm it persists. The admin token is stored in `sessionStorage` only by the browser UI and is sent as an Authorization bearer token; it is not hardcoded and should not be exposed as a `VITE_*` variable.

The customer flow remains enquiry-only. It does not create bookings, payments, Duffel orders, Amadeus orders, supplier reservations or real email sends. Provider diagnostics can remain hidden on the public homepage with `VITE_SHOW_PROVIDER_DIAGNOSTICS=false`.


## Related admin storage variables

Enquiry storage remains controlled by `ENQUIRY_STORAGE_MODE`. The admin dashboard phase also adds `PROMOTED_DEAL_STORAGE_MODE` and `SITE_CONFIG_STORAGE_MODE`, both defaulting to `json`. Set either to `postgres` only when Railway `DATABASE_URL` is configured. Do not expose these server storage variables as `VITE_*` values, and never expose `DATABASE_URL` or `ADMIN_ACCESS_TOKEN` in browser code.

Railway variables for this phase:

- `ADMIN_ACCESS_TOKEN` — server-side admin key entered at `/admin/login`.
- `ENQUIRY_STORAGE_MODE=json|postgres`.
- `PROMOTED_DEAL_STORAGE_MODE=json|postgres`.
- `SITE_CONFIG_STORAGE_MODE=json|postgres`.
- `DATABASE_URL` — required only for Postgres modes.
- `ALLOW_UNPROTECTED_ADMIN=false` in production.
