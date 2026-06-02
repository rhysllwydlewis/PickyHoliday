# Promoted deals admin phase

Promoted deals are now admin-managed records that can be shown in the public holiday results when active.

## Storage

- JSON fallback: `data/promoted-deals.json`.
- Postgres mode: set `PROMOTED_DEAL_STORAGE_MODE=postgres` and provide `DATABASE_URL`.
- Default mode is JSON.
- If Postgres is selected without `DATABASE_URL`, the API returns a controlled storage error.

## Admin workflow

Visit `/admin/deals` after logging in. The form covers:

- Basic title, status, type, supplier, destination, country, hotel and image.
- Pricing fields.
- Trip details.
- Booking/CTA fields.
- Tags and internal notes.

Statuses are `draft`, `active`, `paused` and `archived`. Only `active` deals appear at `GET /api/deals/promoted` and in public results. Internal notes stay admin-only.

## URL safety

Affiliate partner URLs must use `http://` or `https://`. `javascript:` and `data:` URLs are rejected. Public cards only show “Continue to partner” when the URL is safe. “Ask for group quote” remains available and remains enquiry-only.

## Relationship to content pages

Published content pages can surface related promoted/search results through their search defaults. Promoted deal storage and status behaviour remain unchanged, and promoted deals still do not create live bookings or payments.
