# Admin dashboard phase

PickyHoliday now has a lightweight owner admin area without customer accounts or full CMS complexity.

## Login flow

- Visit `/admin/login`.
- Enter the server-side `ADMIN_ACCESS_TOKEN` as the admin access key.
- The browser stores the key in `sessionStorage` only for the current session.
- The key is never stored in `localStorage`, never bundled as a `VITE_*` variable and never exposed by public API responses.
- Successful login redirects to `/admin`; logout clears `sessionStorage` and returns to `/admin/login`.

## Dashboard sections

The admin shell uses simple path detection and provides navigation for:

- Dashboard
- Enquiries
- Promoted Deals
- Site Content
- Feature Flags
- Settings

The dashboard shows enquiry counts, promoted deal counts, storage mode, database status, provider mode and last refresh time. Admin routes use `Authorization: Bearer <token>` and return controlled `401` errors when the key is missing or wrong.

## Guardrails

This phase does not create live bookings, payments, Duffel orders, Amadeus orders, supplier reservations, public sign-up, customer login, password reset or role management.

## Content page admin addition

The dashboard now links to `/admin/pages`, a lightweight editor for destination, group holiday, guide and landing pages. It follows the existing admin token protection pattern and supports draft, published and archived states without adding a heavy CMS dependency.
