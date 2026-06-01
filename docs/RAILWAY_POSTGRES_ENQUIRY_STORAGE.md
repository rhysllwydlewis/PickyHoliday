# Railway Postgres enquiry storage

PickyHoliday can store enquiries in Railway PostgreSQL while keeping the existing JSON file store as the default fallback. This only stores enquiry records for admin follow-up; it does **not** create payments, bookings, Duffel orders, supplier reservations, or live email sending.

## Storage modes

| Mode | Env setting | Behaviour |
| --- | --- | --- |
| JSON fallback | `ENQUIRY_STORAGE_MODE=json` or unset | Writes enquiries to `data/enquiries.json` in the app runtime. This remains the safe default. |
| Postgres | `ENQUIRY_STORAGE_MODE=postgres` | Writes enquiries to the Railway PostgreSQL database referenced by `DATABASE_URL`. The app auto-creates the `enquiries` table if it is missing. |

Use `ENQUIRY_STORAGE_MODE=postgres` only after `DATABASE_URL` is set on the app service. If Postgres mode is selected without `DATABASE_URL`, the enquiry API returns a controlled error instead of silently writing somewhere else or losing enquiries.

## Add Railway Postgres

1. Open the Railway project that hosts the PickyHoliday app service.
2. Add a new PostgreSQL database service from Railway's service/database menu.
3. Wait for Railway to finish provisioning the database.
4. Confirm the database service exposes a `DATABASE_URL` variable.

## Reference `DATABASE_URL` in the app service

1. Open the PickyHoliday app service in Railway, not just the database service.
2. Go to the app service variables.
3. Add or reference the database URL as `DATABASE_URL` for the app service.
   - Use Railway's variable reference UI if available so the app service reads the database service's `DATABASE_URL`.
   - Do not paste or commit the database URL into this repository.
4. Keep `ENQUIRY_STORAGE_MODE=json` until this code has deployed successfully.

## Safe rollout sequence

1. Deploy this PR with `ENQUIRY_STORAGE_MODE=json` or unset.
2. Check `/api/health` and confirm the app is still healthy.
3. Confirm the app service has `DATABASE_URL` configured.
4. Change `ENQUIRY_STORAGE_MODE=postgres` on the app service.
5. Redeploy or restart the Railway app service.
6. Create a test enquiry, then verify it appears in the admin enquiry list.

## Health check

The API health endpoint reports storage metadata without exposing secrets:

```bash
curl https://YOUR_APP/api/health
```

Expected storage fields:

- `enquiryStorageMode`: `json` or `postgres`
- `postgresConfigured`: `true` when `DATABASE_URL` is present, otherwise `false`
- `databaseStatus`: `not-configured`, `ready`, or `error`

## Curl checks

Replace `https://YOUR_APP` and `YOUR_ADMIN_ACCESS_TOKEN` with the Railway app URL and the configured admin token.

### Health

```bash
curl https://YOUR_APP/api/health
```

### Create enquiry

```bash
curl -X POST https://YOUR_APP/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
```

The public response must remain enquiry-only and include the message that this is not a booking confirmation and no supplier reservation has been made.

### Admin list with token

```bash
curl https://YOUR_APP/api/admin/enquiries \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

### Invalid email validation

```bash
curl -i -X POST https://YOUR_APP/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"bad-email","consentToContact":true}'
```

Expected result: HTTP `400` with field validation errors. The invalid enquiry should not be persisted.

## Notes and limitations

- JSON storage remains a fallback only. It is useful for local development and safe deployment while Railway variables are being configured.
- Railway app instances may not keep JSON runtime files permanently, so production enquiry persistence should use Postgres after `DATABASE_URL` is ready.
- Postgres mode creates and updates enquiry records only.
- This project still does not create bookings, payment intents, supplier reservations, Duffel orders, or live outbound email.
