# Site content and feature flags phase

The owner can manage safe website copy and frontend-safe feature flags without adding a heavy CMS.

## Site content

`/admin/content` manages homepage hero copy, assurance chips, newsletter copy, footer short description, trust/protection copy and announcement banner text/status.

Public clients read safe content from `GET /api/site-config`. No admin token, database URL, provider token or secret is returned.

## Feature flags

`/admin/features` manages safe toggles:

- `showProviderDiagnostics`
- `enablePromotedDeals`
- `enableAffiliateRedirects`
- `enableDuffelSearch`
- `enableAmadeusSecondary`
- `enableNewsletterSignupPlaceholder`
- `enableAnnouncementBanner`
- `enableAdminDebugPanel`

These are UI/safe-public toggles only. Backend environment protections still win and secrets remain server-side.

## Storage

- JSON fallback: `data/site-config.json`.
- Postgres mode: set `SITE_CONFIG_STORAGE_MODE=postgres` and provide `DATABASE_URL`.
- Postgres uses a simple `site_settings` table with `key`, `payload` and `updated_at`.
