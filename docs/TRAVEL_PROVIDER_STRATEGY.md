# PickyHoliday travel provider strategy

## Strategic pivot

PickyHoliday is pivoting from “Amadeus as the main future provider” to **Duffel as the preferred flight API path**, with **Amadeus retained as an optional sandbox/search provider**.

The reason is commercial and operational, not architectural. Amadeus is valuable for sandbox search and broad travel coverage, but production flight booking/ticketing introduces extra commercial, ticketing, fulfilment and operational requirements. Duffel is a stronger fit for a startup flight-selling path because it has clear test-mode development, modern offer/order APIs and a more direct flight retailing focus.

This PR is still foundation work only. It does not build live booking, payments, Duffel orders, Amadeus orders, seat maps, ancillaries or booking confirmations.

## Why provider adapters still matter

PickyHoliday should not be locked to one travel API. UK and Europe holidays need a mix of flight search, package holiday redirects, low-cost airline coverage, hotel specialists, manual adverts and enquiry-led group quotes. The provider-adapter architecture lets the UI consume one normalised result shape while the backend chooses the right supplier path.

## Provider responsibilities

| Provider | Role now | Future role |
| --- | --- | --- |
| Mock provider | Safe default with normalised demo results and Duffel-shaped flight-only fixtures. | Regression fixture and credential-free demo mode. |
| Duffel provider | Preferred flight provider foundation. Creates flight offer-request searches server-side when a token is configured. | Future flight selling path after legal, operational and customer-protection decisions. |
| Amadeus provider | Optional sandbox/search provider for airport/city lookup, flights and hotels when explicitly enabled/configured. | Secondary search/sandbox provider; not the primary long-term booking path. |
| Affiliate/package provider | Scaffold only; no partner feed calls. | TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach, Expedia-style redirects and package affiliate links. |
| Manual deals provider | Curated promoted deals/adverts. | Early monetisation, sponsored placements and manual group quote offers. |
| Hotel specialist providers | Not implemented in this PR. | Duffel Stays, Expedia Rapid, Hotelbeds/HBX or another hotel provider for lodging depth. |
| Payments | Not implemented. | Stripe or marketplace/deposit flows only after the commercial/legal flow is ready. |

## Provider modes

- `TRAVEL_PROVIDER_MODE=mock` uses mock only.
- `TRAVEL_PROVIDER_MODE=duffel` uses Duffel if configured plus manual deals and affiliate/package scaffolds.
- `TRAVEL_PROVIDER_MODE=amadeus` uses Amadeus if configured plus manual deals and affiliate/package scaffolds.
- `TRAVEL_PROVIDER_MODE=hybrid` uses Duffel plus manual deals and affiliate/package scaffolds. Amadeus is included only when `ENABLE_AMADEUS_SECONDARY=true`.
- `TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel` records the preferred strategic flight path.

The registry must not call every provider by default. Credentialed providers are only active when mode/configuration allows them.

## Normalised holiday result model

Every provider maps its own response into this shape before returning results to the UI:

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

Duffel flight offers are mapped as `flight-only` enquiry results. Copy must state that the result is search-only, no order has been created, and baggage/fare rules must be confirmed before booking.

## Backend/API route foundation

The server-side proxy keeps secrets off the browser. Current routes are:

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

`.env.example` documents mock defaults, Duffel test-mode placeholders, Amadeus optional sandbox placeholders and future affiliate/hotel/payment placeholders. Real credentials must be stored in deployment secrets and must never be committed. Do not add browser-side Duffel token variables.

## Staged follow-up PRs

1. Duffel provider foundation (this PR): server-side offer-request scaffold, provider registry/status and mock fixtures.
2. Affiliate/package redirect provider: approved partner link model for TUI, Jet2holidays, easyJet Holidays, Loveholidays, On the Beach and Expedia-style redirects.
3. Manual promoted deals admin/source: allow PickyHoliday to manage promoted deals without code edits.
4. Enquiry persistence: store enquiries, add email/CRM notifications and admin review.
5. Hotel depth provider: Duffel Stays, Expedia Rapid, Hotelbeds/HBX or equivalent.
6. Payments later: Stripe only when the commercial/legal flow is ready.
7. Live booking later: only after provider contracts, fulfilment, protection and support processes are ready.

## Guardrails

- Do not expose API keys in the browser.
- Do not commit real credentials.
- Duffel and Amadeus calls must run server-side only.
- Do not create Duffel orders.
- Do not create Amadeus orders.
- Do not build payments.
- Do not create fake booking confirmations.
- Keep the UI provider-agnostic and render the normalised result model.
