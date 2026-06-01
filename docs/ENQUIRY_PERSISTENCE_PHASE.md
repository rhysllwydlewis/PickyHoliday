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
