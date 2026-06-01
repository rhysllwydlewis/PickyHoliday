# PickyHoliday travel provider strategy

## Purpose of this PR

Phase 2 hardens the provider foundation and keeps mock mode safe by default. It includes provider error isolation, consistent API envelopes, provider diagnostics, server-side Amadeus Airport & City Search, Flight Offers Search, Hotel List and best-effort Hotel Offers pricing. It still does **not** create live bookings, payments, orders or booking confirmations.

## Why provider adapters

PickyHoliday should not be locked to one travel API. UK and Europe holidays need a mix of flight + hotel search, package holiday redirects, low-cost airline routes, hotel specialists, manual adverts and enquiry-led group quotes. A provider-adapter architecture lets the UI consume one normalised result shape while the backend chooses the right supplier path.

## Provider responsibilities

| Provider | Responsibility in this PR | Future role |
| --- | --- | --- |
| Mock provider | Powers search by default with normalised demo results. | Safe local/demo mode and regression fixture. |
| Amadeus provider | Server-side sandbox adapter for OAuth, Airport & City Search, dynamic airport/city code resolution, Flight Offers Search, Hotel List and best-effort Hotel Offers pricing when credentials are configured. | May later expand into stronger availability, pricing and supplier-specific booking readiness after commercial/legal review. |
| Affiliate/package provider | Scaffold only; no partner feed calls. | TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach, Expedia-style redirects and package affiliate links. |
| Manual deals provider | Supports curated promoted deals/adverts. | Early monetisation, sponsored placements and manual group quote offers. |
| Hotel specialist providers | Not implemented in this PR. | Expedia Rapid or Hotelbeds/HBX-style lodging depth. |
| Duffel-style flight provider | Not implemented in this PR. | Deeper flight booking capability if commercially needed. |
| Payments | Not implemented in this PR. | Stripe or marketplace payment flows after legal/operational readiness. |

## Product flow

1. A traveller searches in the React UI.
2. The UI calls the PickyHoliday travel service layer, not third-party APIs directly.
3. The backend/proxy route receives the search request.
4. The provider registry routes to mock by default, or to Amadeus/manual/future providers when `TRAVEL_PROVIDER_MODE` and server credentials are configured.
5. Providers return normalised holiday results.
6. The UI renders consistent cards and a richer trip modal.
7. The user can shortlist, continue to a partner redirect when present, or send an enquiry.
8. No live booking confirmation is shown until a real protected booking provider exists.

## Normalised holiday result model

Every provider should map its own response into this shape before returning results to the UI:

```js
{
  id,
  resultType: 'flight-hotel' | 'hotel-only' | 'flight-only' | 'package' | 'advert',
  provider,
  supplierName,
  airlineNames,
  destination,
  country,
  hotelName,
  image,
  priceFrom,
  currency,
  priceQualifier,
  priceType,
  pricingConfidence,
  sourceBreakdown,
  flightSummary,
  hotelSummary,
  nights,
  departureAirport,
  returnAirport,
  dateLabel,
  groupSizeLabel,
  boardBasis,
  baggageLabel,
  protectionLabel,
  bookingMode: 'enquiry' | 'affiliate' | 'api-booking' | 'manual-quote',
  partnerUrl,
  tags,
  isDemo,
}
```

## Backend/API route foundation

The server-side proxy is designed to keep secrets off the browser. Current mock-mode routes are:

- `GET /api/health`
- `POST /api/travel/search`
- `POST /api/travel/flights`
- `POST /api/travel/hotels`
- `POST /api/travel/packages`
- `POST /api/travel/holiday-composer`
- `POST /api/travel/enquiries`
- `GET /api/travel/locations?keyword=barcelona`
- `POST /api/travel/locations`

## Environment strategy

`.env.example` documents mock defaults and placeholder names for future providers. Real credentials must be stored in deployment secrets and must never be committed. The React app defaults to local mock provider behaviour when no backend URL is configured.

## Staged follow-up PRs

1. Provider foundation (this PR).
2. Hardened Amadeus sandbox search (this phase): airport/city lookup, hotel offers pricing attempt and stronger flight + hotel composition.
3. Package/affiliate provider: partner link model and approved redirects.
4. Hotel depth provider: Expedia Rapid or Hotelbeds/HBX-style lodging stock.
5. Enquiry/CRM persistence: store enquiries, email/CRM notifications and admin review.
6. Payments later: Stripe only when the commercial/legal flow is ready.
7. Deeper booking later: Duffel or other booking APIs only after provider and protection requirements are clear.

## Guardrails

- Do not expose API keys in the browser.
- Do not commit real credentials.
- Live Amadeus calls must run server-side only and require deployment secrets.
- Do not build payments in the provider foundation PR.
- Do not create fake booking confirmations.
- Keep the UI provider-agnostic and render the normalised result model.
