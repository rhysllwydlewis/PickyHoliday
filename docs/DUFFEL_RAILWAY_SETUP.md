# Duffel Railway setup

## Current implementation

PickyHoliday currently uses a server-side Duffel direct API provider. The official `@duffel/api` JavaScript client was trialled in PR #8, but that deployment failed because the dependency was added to `package.json` without a regenerated `package-lock.json`.

This fix keeps the provider server-side and search/enquiry only, but removes the uncommitted client-library dependency so Railway can deploy using the existing lockfile.

## Required Railway variables for Duffel search

Set these in the PickyHoliday app service:

```text
TRAVEL_PROVIDER_MODE=duffel
TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel
DUFFEL_ACCESS_TOKEN=duffel_test_xxx
DUFFEL_BASE_URL=https://api.duffel.com
DUFFEL_VERSION=v2
AFFILIATE_PROVIDER_MODE=mock
```

Use a Duffel test token first. Do not use a live token until the product flow, customer support process, terms and booking responsibilities are ready.

## Enquiry/admin variables

```text
ENQUIRY_STORAGE_MODE=json
ADMIN_ACCESS_TOKEN=<generate-a-long-random-secret>
ALLOW_UNPROTECTED_ADMIN=false
ENQUIRY_NOTIFY_EMAIL=
```

`data/enquiries.json` is runtime storage and should not be committed. Railway filesystem persistence may not be durable across redeploys, so move enquiries to Postgres or a CRM before relying on it for production leads.

## What this still does not do

- No Duffel order is created.
- No payment is created.
- No seat map or ancillary flow is created.
- No booking confirmation is issued.
- Flight results remain search/enquiry only.

## Future official-client PR

A future PR may reintroduce `@duffel/api`, but it must include a regenerated `package-lock.json` and pass `npm ci`, `npm run build`, and the API smoke tests before merge.
