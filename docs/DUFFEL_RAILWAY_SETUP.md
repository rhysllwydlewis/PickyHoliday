# Duffel Railway setup

## What this adds

PickyHoliday uses Duffel server-side only. The official `@duffel/api` JavaScript client is added to the Node server/provider layer and must not be imported into browser-facing code.

## Required Railway variables for Duffel search

Set these in Railway for the PickyHoliday service:

```text
TRAVEL_PROVIDER_MODE=duffel
TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel
DUFFEL_ACCESS_TOKEN=duffel_test_xxx
DUFFEL_BASE_URL=https://api.duffel.com
DUFFEL_VERSION=v2
```

Use a Duffel test token first. Do not use a live token until the product flow, customer support process, terms and booking responsibilities are ready.

## Optional hybrid mode

If you want package/config results to continue alongside Duffel, keep:

```text
AFFILIATE_PROVIDER_MODE=mock
```

If you later want Amadeus as a secondary sandbox provider:

```text
TRAVEL_PROVIDER_MODE=hybrid
ENABLE_AMADEUS_SECONDARY=true
```

Do not enable Amadeus unless its credentials are also configured.

## Admin/enquiry variables from PR #7

For enquiry persistence/admin review:

```text
ENQUIRY_STORAGE_MODE=json
ADMIN_ACCESS_TOKEN=<generate-a-long-random-secret>
ALLOW_UNPROTECTED_ADMIN=false
ENQUIRY_NOTIFY_EMAIL=
```

`data/enquiries.json` is runtime storage and should not be committed. Railway filesystem persistence may not be durable across redeploys, so move enquiries to a database or CRM before depending on it for production leads.

## What this still does not do

- No Duffel order is created.
- No payment is created.
- No seat map or ancillary flow is created.
- No booking confirmation is issued.
- Flight results remain search/enquiry only.

## What to test after setting Railway variables

1. Deploy the branch/PR.
2. Open the site and check Provider status.
3. Confirm Duffel shows as configured server-side.
4. Search a route such as London to Barcelona.
5. Confirm results remain search-only and CTA still routes to enquiry, not booking.
