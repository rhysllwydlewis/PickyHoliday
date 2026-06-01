# Duffel provider foundation pre-merge checklist

## Scope guardrails

- [ ] Mock mode works by default without live API credentials.
- [ ] No real credentials are committed.
- [ ] Duffel and Amadeus credentials are server-side only.
- [ ] No browser-side Duffel token usage exists.
- [ ] No Duffel orders are created.
- [ ] No payment flow is implemented.
- [ ] No live booking, flight order, hotel booking or fake booking confirmation is shown.
- [ ] Provider-adapter architecture remains intact and mock provider remains available.
- [ ] Amadeus remains available but is no longer described as the primary long-term provider.

## Product flow

- [ ] Homepage renders with PickyHoliday branding intact.
- [ ] Mock search returns normalised holiday results.
- [ ] Mock flight search includes Duffel-shaped flight-only fixtures.
- [ ] Provider diagnostics show primary flight provider, Duffel configured status, Amadeus configured status, active providers, latest result source, provider errors and Amadeus secondary status.
- [ ] Diagnostics copy says “Duffel preferred for flights”, “Amadeus optional sandbox/search provider” and “Package/affiliate providers still future work”.
- [ ] Enquiry CTA creates only a mock enquiry and clearly states that no booking was created.

## Backend/API

- [ ] `GET /api/health` returns provider status including Duffel.
- [ ] `GET /api/travel/locations?keyword=barcelona` returns a consistent location envelope.
- [ ] `POST /api/travel/search` returns results in mock mode.
- [ ] `POST /api/travel/flights`, `/hotels`, `/packages` and `/holiday-composer` return consistent JSON envelopes.
- [ ] `POST /api/travel/enquiries` returns a mock enquiry response, not a booking confirmation.
- [ ] Bad JSON returns a controlled 400 response.
- [ ] One provider failing does not fail the whole registry response.
- [ ] Hybrid mode includes Amadeus only when `ENABLE_AMADEUS_SECONDARY=true`.
- [ ] CORS and request body limits remain in place.

## Validation

- [ ] `npm run build` passes.
- [ ] `npm run test:api` passes against a running `npm run dev:api` server in mock mode.
- [ ] `docs/API_TEST_COMMANDS.md` curl commands are still accurate.

## Future PRs, not this PR

- [ ] Package/affiliate partner integrations for TUI, Jet2, easyJet Holidays, Loveholidays, On the Beach and Expedia-style redirects.
- [ ] Manual promoted deals admin/source.
- [ ] Persistent enquiry/CRM storage.
- [ ] Hotel depth provider such as Duffel Stays, Expedia Rapid or Hotelbeds/HBX.
- [ ] Payments.
- [ ] Live booking.
