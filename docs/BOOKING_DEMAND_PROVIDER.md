# Booking.com Demand accommodation provider

PickyHoliday remains enquiry-first. The Booking.com Demand provider can contribute normalised hotel/accommodation ideas to composed holiday results, but PickyHoliday does not create Booking.com reservations, take payments, send customer confirmations or hold rooms.

## Controlled states

- `ENABLE_BOOKING_DEMAND=false` / `BOOKING_DEMAND_MODE=disabled`: provider appears in health/readiness diagnostics as disabled and is not active.
- Enabled without server-side credentials: diagnostics and composer provider notes report missing credentials without exposing values.
- Enabled without a verified destination mapping: composer returns a controlled `booking-demand` provider note and other providers still return results.
- `BOOKING_DEMAND_MODE=mock`: returns test accommodation cards without a live Booking.com request.
- `BOOKING_DEMAND_MODE=sandbox` or `live`: uses server-side credentials only and normalises provider responses.

## Destination ids

Do not guess Booking.com city ids. Configure only verified mappings in `BOOKING_DEMAND_CITY_MAPPINGS` or pass a verified `criteria.filters.bookingDemandCityId` from trusted server-side/admin tooling.

## Result-card copy

Booking.com results are labelled with supplier `Booking.com`, an accommodation/hotel source, “Check live price” when the price is not confirmed, partner-site cancellation/terms wording, and the guardrail that no booking is created by PickyHoliday.

## Railway/env setup still required

Set the server-side Booking.com Demand credentials and verified city mappings in Railway variables when approved. Do not add `VITE_BOOKING_*` variables.
