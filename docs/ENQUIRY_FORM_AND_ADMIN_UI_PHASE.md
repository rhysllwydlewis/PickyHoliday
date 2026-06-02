# Enquiry form and admin UI phase

## Scope

This phase adds the customer-facing enquiry form and a lightweight `/admin/enquiries` review UI. It remains an enquiry-only flow:

- no live booking is created
- no payment is taken
- no Duffel order, Amadeus order, supplier reservation or hotel reservation is created
- no real email is sent by the browser UI

## Customer enquiry form

The public trip modal now uses **Ask for group quote** to open a structured form. The form collects:

- customer name (required)
- customer email (required and validated)
- phone number (optional)
- destination (required, prefilled from the selected result)
- group size (prefilled and editable)
- dates / rough dates (prefilled and editable)
- notes (optional)
- consent to contact (required)

The submitted payload also includes selected result context such as result id/type, provider, supplier, destination/country, hotel, departure airport, date label, group size, lead price and currency. Successful submissions show the saved enquiry reference and the copy: “This is not a booking confirmation.”

## Admin enquiry review UI

Open `/admin/enquiries` on the same frontend deployment. The page prompts for an admin token at runtime, stores it in `sessionStorage` only, and sends it to the API as:

```http
Authorization: Bearer <token>
```

The token must be configured server-side as `ADMIN_ACCESS_TOKEN`; it must not be hardcoded or exposed through `VITE_*` variables. The page supports refresh, clear-token, empty/loading/unauthorized states, and status updates to `new`, `reviewing`, `contacted`, `quoted`, or `closed` via `PATCH /api/admin/enquiries/:id/status`.

## Storage and Railway

Persistence is still controlled by `ENQUIRY_STORAGE_MODE`:

- `json` keeps the JSON fallback active
- `postgres` uses Railway Postgres when `DATABASE_URL` is configured

On Railway, set:

```bash
ENQUIRY_STORAGE_MODE=postgres
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_ACCESS_TOKEN=<strong runtime token>
```

Do not expose `DATABASE_URL` or `ADMIN_ACCESS_TOKEN` in frontend environment variables.

## Provider diagnostics

Public provider diagnostics are hidden by default behind a small developer/provider status toggle. Set this when you intentionally want the diagnostics open by default:

```bash
VITE_SHOW_PROVIDER_DIAGNOSTICS=true
```

Keep `.env.example` at `VITE_SHOW_PROVIDER_DIAGNOSTICS=false` for customer-facing defaults.

## Local test checklist

1. `npm install`
2. `npm run build`
3. Start the API: `NODE_ENV=test TRAVEL_PROVIDER_MODE=mock ALLOW_UNPROTECTED_ADMIN=true npm run dev:api`
4. Run smoke tests: `npm run test:api`
5. Start the frontend: `npm run dev`
6. Open the homepage, choose a trip, select **Ask for group quote**, complete the form and confirm the enquiry ref appears.
7. Open `/admin/enquiries`, enter the runtime token if configured, confirm the enquiry appears, update status to `contacted`, refresh, and confirm the status persists.
