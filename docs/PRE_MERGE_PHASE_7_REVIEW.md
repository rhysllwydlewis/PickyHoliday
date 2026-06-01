# Phase 7 pre-merge review

Date: 2026-06-01

PR: Phase 7 enquiry storage

## Review summary

This PR adds backend enquiry persistence. It changes the enquiry endpoint from mock-only to server-side validation plus JSON-file storage, with basic admin review routes and a notification scaffold.

## Fixes made during review

- Hardened admin access. Admin enquiry routes now require `ADMIN_ACCESS_TOKEN`, unless local unprotected admin is explicitly enabled with `ALLOW_UNPROTECTED_ADMIN=true` in dev/test mock mode.
- Added `.env.example` placeholders for enquiry storage and admin review.
- Added `.gitignore` protection for `data/enquiries.json` so customer lead data is not committed.
- Kept draft enquiry support so the current deployed modal can save a reviewing enquiry before the polished frontend form is built.

## Scope guardrails

- [x] No booking is created.
- [x] No payment is created.
- [x] No Duffel order is created.
- [x] No Amadeus order is created.
- [x] No supplier reservation is created.
- [x] No real email is sent.
- [x] Runtime customer lead data is ignored by git.
- [x] Admin routes are protected by default.

## Product checks

- [x] `POST /api/travel/enquiries` validates and persists enquiries.
- [x] Contact enquiries validate name, valid email, destination and consent.
- [x] Draft enquiries from the current trip modal are captured as `reviewing`.
- [x] Public enquiry response says this is not a booking confirmation.
- [x] `GET /api/admin/enquiries` exists for review.
- [x] `PATCH /api/admin/enquiries/:id/status` exists for status updates.
- [x] Status updates are restricted to known enquiry statuses.

## Validation still required before merge

These commands must be run in a normal dev environment before merging because this environment cannot run the app/build:

```bash
npm install
npm run build
TRAVEL_PROVIDER_MODE=mock AFFILIATE_PROVIDER_MODE=mock NODE_ENV=development ALLOW_UNPROTECTED_ADMIN=true npm run dev:api
npm run test:api
```

Manual checks:

```bash
curl -X POST http://localhost:8787/api/travel/enquiries \
  -H 'Content-Type: application/json' \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'

curl http://localhost:8787/api/admin/enquiries
```

## Known non-blocking items

- The frontend still needs a polished enquiry form with name, email, phone, notes and consent.
- JSON storage is temporary and may not be durable on all hosts. Move to a database or CRM later.
- Notification is scaffolded only. No email provider is connected.
- Existing smoke tests were not expanded in this PR because the large test-file rewrite was blocked during this session. Manual curl checks are documented above.

## Recommended next phase after merge

1. Add the polished frontend enquiry form and consent step.
2. Add an admin enquiries UI.
3. Move JSON storage to durable database/CRM storage.
4. Connect email notifications once sender/domain/provider details are confirmed.
