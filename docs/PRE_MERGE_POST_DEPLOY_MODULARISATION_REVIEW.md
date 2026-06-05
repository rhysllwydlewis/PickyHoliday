# Pre-merge review: frontend modularisation and post-deploy safety

## Frontend modularisation

- [x] `src/main.jsx` remains a tiny React entrypoint.
- [x] `src/app/App.jsx` is a top-level shell/router and no longer owns the layout, deal card, dialog, provider diagnostic, search results, public content, or admin implementations.
- [x] Component files contain real implementations rather than re-exporting from `src/app/App.jsx`.
- [x] Search results, public content, and admin routes live in route modules under `src/app/routes`.
- [x] Admin dashboard, enquiries, deals, content pages, content/settings, operations, and settings panels are split into focused modules under `src/app/admin`.
- [x] Shared app constants and small cross-cutting helpers live in `src/app/appConstants.js` and SEO/public route helpers live in `src/services/seo/seoMeta.js`.

## Behaviour preservation

- [x] Existing public routes remain covered by smoke checks: `/`, `/search`, `/destinations/:slug`, `/group-holidays/:slug`, and `/guides/:slug`.
- [x] Existing admin shell routes remain covered by smoke checks: `/admin`, `/admin/login`, `/admin/enquiries`, `/admin/deals`, `/admin/pages`, `/admin/content`, `/admin/features`, `/admin/settings`, and `/admin/ops`.
- [x] Shortlist storage continues to use `pickyholiday-shortlist-v1` via the existing shortlist helpers.
- [x] Admin access keys remain entered at runtime and stored in `sessionStorage` only.
- [x] Provider diagnostics remain hidden by default unless explicitly enabled for diagnostics.
- [x] Enquiry-first copy remains in deal details, enquiries, public content CTAs, and Admin Ops guidance.

## Post-deploy safety

- [x] `/api/health` and `/api/readiness` are included in smoke coverage.
- [x] `/sitemap.xml` and `/robots.txt` are included in smoke coverage.
- [x] Built frontend assets are scanned for Booking.com, supplier, admin, and database secret markers.
- [x] Booking.com Demand disabled, missing credentials, unmapped destination, and mapped mock contribution states are covered.
- [x] Booking.com smoke checks assert no booking, reservation, order, or payment behaviour is introduced.
- [x] `docs/POST_DEPLOY_CHECKLIST.md` documents Railway variables, Booking.com flags, admin token safety, hidden provider diagnostics, frontend secret avoidance, and Admin Ops checks.

## Verification commands run

- [x] `npm run build`
- [x] `npm run test:api`
- [x] `npm run test:booking-demand`
- [x] `npx --yes eslint@8 src --ext .js,.jsx --no-eslintrc --rule 'no-undef:error' --rule 'no-unused-vars:off' --parser-options '{"ecmaVersion":2024,"sourceType":"module","ecmaFeatures":{"jsx":true}}' --env browser --env es2021 --global import --global console`
