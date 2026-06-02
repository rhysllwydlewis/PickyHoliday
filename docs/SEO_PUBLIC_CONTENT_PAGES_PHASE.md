# SEO public content pages phase

This phase adds a lightweight public content architecture for destination pages, group holiday pages and guide/article pages.

## What changed

- Content pages are modelled in `src/services/content/contentPageModel.js`.
- JSON fallback storage writes to `data/content-pages.json`.
- Optional Postgres storage uses the `content_pages` table when `CONTENT_PAGE_STORAGE_MODE=postgres` and `DATABASE_URL` is configured.
- Public APIs return published pages only:
  - `GET /api/content/pages`
  - `GET /api/content/pages?type=destination`
  - `GET /api/content/pages/:slug`
- Admin APIs require the existing admin token pattern:
  - `GET /api/admin/content-pages`
  - `POST /api/admin/content-pages`
  - `PATCH /api/admin/content-pages/:id`
  - `PATCH /api/admin/content-pages/:id/status`
- Public routes are rendered directly by the Vite/React app without a router dependency:
  - `/destinations/:slug`
  - `/group-holidays/:slug`
  - `/guides/:slug`
- `/sitemap.xml` includes the homepage and published content pages.
- `/robots.txt` allows public content, disallows `/admin` and references the sitemap.

## SEO behaviour

The app updates `document.title`, meta description, canonical URL, Open Graph tags and Twitter summary tags on public content pages. It also adds safe JSON-LD for breadcrumbs, guide articles and FAQ pages. The homepage includes `WebSite` and `TravelAgency` JSON-LD.

## Storage behaviour

`CONTENT_PAGE_STORAGE_MODE=json` is the default and keeps the JSON fallback available for local/test environments. `CONTENT_PAGE_STORAGE_MODE=postgres` requires `DATABASE_URL`; if it is missing the server returns controlled 503 API errors and readiness reports `postgres-not-configured` instead of crashing.

## Guardrails

This phase does not add booking, payments, Duffel orders, Amadeus orders, supplier reservations, customer accounts, supplier accounts or real email sending. Enquiries remain enquiry-only and are not booking confirmations.
