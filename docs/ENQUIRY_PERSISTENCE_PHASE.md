# Enquiry persistence phase

## Goal

This phase makes PickyHoliday enquiries persist server-side so potential group holiday leads are not lost.

## What changed

- Added a shared enquiry model in `src/services/enquiries/enquiryModel.js`.
- Added server-side validation in `server/enquiries/validateEnquiry.js`.
- Added JSON-file enquiry storage in `server/enquiries/enquiryStore.js`.
- Added a no-op/scaffold notification layer in `server/enquiries/enquiryNotifier.js`.
- Updated `server/index.js` so `POST /api/travel/enquiries` validates and stores enquiries.
- Added admin review routes:
  - `GET /api/admin/enquiries`
  - `PATCH /api/admin/enquiries/:id/status`

## What this does not do

- No booking is created.
- No payment is taken.
- No Duffel order is created.
- No Amadeus order is created.
- No supplier reservation is made.
- No real email is sent yet.

## Storage

The first storage mode is JSON-file storage at:

```text
data/enquiries.json
```

This is intentionally simple and temporary. A future PR should move this to a real database or CRM once the product flow is stable.

## Validation behaviour

A full contact enquiry validates:

- name
- valid email
- destination
- consent to contact

The existing trip modal can also create a draft enquiry without customer contact details. Draft enquiries are marked `reviewing` and include an internal note so the current deployed UI does not fail while the proper enquiry form is built in the next UI PR.

## Admin access

`ADMIN_ACCESS_TOKEN` should be set before exposing admin routes outside local/mock development. When a token is set, admin requests need:

```text
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

## Future work

1. Add a polished frontend enquiry form with name, email, phone, notes and consent.
2. Add admin UI for reviewing enquiries.
3. Add email notifications with a confirmed provider and sender/domain.
4. Move storage from JSON to a database or CRM.

## Follow-up: customer form and admin UI

The enquiry persistence endpoints are now used by a full customer enquiry form opened from **Ask for group quote**. The form sends customer name, email, optional phone, group size, rough dates, notes, consent-to-contact, and selected-result context to `POST /api/travel/enquiries`. Success copy confirms that the enquiry was saved and is not a booking confirmation.

A lightweight `/admin/enquiries` frontend page lists persisted enquiries and updates statuses with the existing admin API. The admin token is entered at runtime, stored in `sessionStorage` only, and must match the server-side `ADMIN_ACCESS_TOKEN` configured in Railway/the API runtime.

This does not change storage selection: `ENQUIRY_STORAGE_MODE=json` keeps JSON fallback, while `ENQUIRY_STORAGE_MODE=postgres` requires `DATABASE_URL`. No booking, payment, supplier reservation, Duffel order, Amadeus order or real email sending is added.
