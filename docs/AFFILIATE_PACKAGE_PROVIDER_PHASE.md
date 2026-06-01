# Affiliate package provider phase

## Goal

This phase makes the package/affiliate provider useful without building live booking. It gives PickyHoliday a commercial package-holiday layer for UK and Europe holiday discovery while keeping all results as mock/config redirect candidates.

## What this phase includes

- Approved partner configuration in `src/data/affiliatePartners.js`.
- Package-style config fixtures in `src/data/packageDeals.js`.
- A working `affiliatePackageProvider` that returns package results instead of empty arrays.
- Safe redirect handling that only allows approved partner domains.
- Optional tracking-parameter appending using server-side placeholder environment values.
- Smoke-test coverage proving package results are returned in mock/config mode.

## Partners scaffolded

The following partners are configured as placeholders only:

- TUI
- Jet2holidays
- easyJet Holidays
- Loveholidays
- On the Beach
- Expedia

No real affiliate IDs are committed. No live partner feed is called.

## What this phase does not include

- No live booking.
- No payment flow.
- No Duffel orders.
- No Amadeus orders.
- No live package feed.
- No guarantee that partner links or tracking formats are production-approved.
- No fake booking confirmation.

## Redirect safety

Partner redirects are only returned when the package result URL matches the approved partner domain list. If a partner URL is missing or unsafe, the provider keeps the result available but downgrades the booking mode to `manual-quote`, meaning the UI should offer enquiry/group-quote actions rather than a partner redirect.

## Environment placeholders

```bash
AFFILIATE_PROVIDER_MODE=mock
AFFILIATE_DEFAULT_TRACKING_ID=
TUI_AFFILIATE_ID=
JET2HOLIDAYS_AFFILIATE_ID=
EASYJET_HOLIDAYS_AFFILIATE_ID=
LOVEHOLIDAYS_AFFILIATE_ID=
ONTHEBEACH_AFFILIATE_ID=
EXPEDIA_AFFILIATE_ID=
```

Keep real IDs server-side unless a commercial partner explicitly approves client-side use.

## Future work

1. Replace mock/config package fixtures with approved partner feed, deep-link or affiliate-network data.
2. Add an admin/manual deal source so promoted packages can be edited without code changes.
3. Persist enquiries and send notifications to email/CRM.
4. Add hotel depth through Duffel Stays, Expedia Rapid, Hotelbeds/HBX or another lodging partner.
5. Only consider live booking and payments after commercial, fulfilment and customer-protection requirements are clear.
