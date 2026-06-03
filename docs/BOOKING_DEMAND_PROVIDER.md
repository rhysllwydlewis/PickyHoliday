# Booking.com Demand API accommodation provider

This phase adds a server-side Booking.com Demand API accommodation provider for the PickyHoliday composer.

## What it does

- Adds `booking-demand` as a hotel/accommodation provider in the travel provider registry.
- Calls Booking.com Demand API from the server only when enabled and configured.
- Normalises Booking.com accommodation search results into PickyHoliday hotel offers.
- Feeds those hotel offers into `/api/travel/holiday-composer` so `/search` and Spotlighted deals can show Booking.com-sourced hotel ideas.
- Keeps the journey enquiry-first: no booking, payment, order, cancellation or supplier reservation is created.

## Access requirements

Booking.com Demand API access requires approved Booking.com partner/affiliate access. You need server-side credentials before production calls can work:

- `BOOKING_DEMAND_API_KEY`
- `BOOKING_DEMAND_AFFILIATE_ID`

Do not add `VITE_BOOKING_*` variables. The browser must never receive Booking.com Demand credentials.

## Railway variables

```env
BOOKING_DEMAND_ENABLED=true
BOOKING_DEMAND_ENV=sandbox
BOOKING_DEMAND_BASE_URL=https://demandapi-sandbox.booking.com/3.1
BOOKING_DEMAND_API_KEY=your_booking_demand_api_key
BOOKING_DEMAND_AFFILIATE_ID=your_booking_affiliate_id
BOOKING_DEMAND_BOOKER_COUNTRY=gb
BOOKING_DEMAND_PLATFORM=desktop
BOOKING_DEMAND_CURRENCY=GBP
BOOKING_DEMAND_TIMEOUT_MS=7000
BOOKING_DEMAND_TEST_MOCK=false
```

Use `BOOKING_DEMAND_ENV=production` and the production base URL only after Booking.com approves live production use.

## Destination mapping

The provider intentionally does not guess Booking.com destination ids. It supports:

- `Amsterdam` using the Booking.com Demand API documentation city-id example.
- Explicit criteria filters, for example `filters.bookingDemandCityId`, when a verified Booking.com city id is known.

Unsupported destinations return a controlled provider error while the rest of the composer continues working from other providers.

## Safety rules

- Booking.com API calls are server-side only.
- `Authorization: Bearer ...` and `X-Affiliate-Id` are never exposed in public responses.
- Provider errors are sanitised before returning to the frontend.
- Result cards must use safe wording such as `Check live price` or `Ask for group quote`.
- Forbidden wording remains: `Book now`, `Booking confirmed`, `Reserved`, `Guaranteed price`, `Payment successful`, and fake protection claims.

## Verification

1. Set the Railway variables above.
2. Deploy.
3. Open `/api/health` and confirm `booking-demand` appears in `providerStatus` without exposing secrets.
4. Search Amsterdam with valid dates and rooms.
5. Confirm `/api/travel/holiday-composer` continues returning a `composed-holiday-v1` envelope.
6. Confirm Booking.com-sourced hotel offers are marked as Booking.com/provider hotel ideas and remain enquiry-first.

If credentials or mapping are missing, the site should still work through existing providers and partner redirects.
