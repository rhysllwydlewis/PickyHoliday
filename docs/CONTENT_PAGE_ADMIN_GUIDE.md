# Content page admin guide

The admin content-page editor is available at `/admin/pages` for users with the configured `ADMIN_ACCESS_TOKEN`.

## Page types and statuses

Supported types:

- `destination`
- `group-type`
- `guide`
- `landing`

Supported statuses:

- `draft` — visible in admin only
- `published` — visible through public APIs, sitemap and public routes
- `archived` — hidden from public APIs and sitemap

## Editing content

The editor supports simple fields only:

- page title, slug, type and status
- SEO title, description and canonical path
- hero copy
- intro copy
- simple content sections
- FAQ rows
- search defaults JSON
- related slugs
- comma-separated tags
- internal notes

Internal notes are admin-only and are stripped from public content responses.

## Publishing workflow

1. Create a draft page with a protected slug.
2. Add SEO and page copy.
3. Add search defaults such as `{ "destination": "Barcelona", "intent": "Holidays" }`.
4. Preview the public route from the admin list.
5. Publish the page when ready.
6. Archive or unpublish content that should no longer be public.

## Slug rules

Slugs must be lowercase and can contain letters, numbers and hyphens only. Duplicate slugs are blocked by both JSON and Postgres stores.

## Safety

The editor creates content only. It does not create bookings, payments, Duffel orders, Amadeus orders or supplier reservations.
