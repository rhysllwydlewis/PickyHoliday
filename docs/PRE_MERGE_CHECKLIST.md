# Phase 2 pre-merge checklist

## Scope guardrails

- [ ] Mock mode works by default without live API credentials.
- [ ] No real credentials are committed.
- [ ] Amadeus credentials are server-side only.
- [ ] No payment flow is implemented.
- [ ] No live booking, flight order, hotel booking or fake booking confirmation is shown.
- [ ] Provider-adapter architecture remains intact and mock provider remains available.

## Product flow

- [ ] Homepage renders with PickyHoliday branding intact.
- [ ] Mock search returns normalised holiday results.
- [ ] Provider diagnostics show frontend mode, backend mode, active providers, Amadeus configured status and provider errors.
- [ ] Result cards and modals distinguish flight-only totals, hotel-only from prices, estimated flight + hotel prices and price-to-confirm cases.
- [ ] Enquiry CTA creates only a mock enquiry and clearly states that no booking was created.

## Backend/API

- [ ] `GET /api/health` returns provider status.
- [ ] `GET /api/travel/locations?keyword=barcelona` returns a consistent location envelope.
- [ ] `POST /api/travel/search` returns results in mock mode.
- [ ] `POST /api/travel/flights`, `/hotels`, `/packages` and `/holiday-composer` return consistent JSON envelopes.
- [ ] `POST /api/travel/enquiries` returns a mock enquiry response, not a booking confirmation.
- [ ] Bad JSON returns a controlled 400 response.
- [ ] One provider failing does not fail the whole registry response.
- [ ] CORS and request body limits remain in place.

## Validation

- [ ] `npm run build` passes.
- [ ] `npm run test:api` passes against a running `npm run dev:api` server.
- [ ] `docs/API_TEST_COMMANDS.md` curl commands are still accurate.

## Future PRs, not this PR

- [ ] Package/affiliate partner integrations for TUI, Jet2, easyJet Holidays, Loveholidays, On the Beach and Expedia-style redirects.
- [ ] Hotel depth provider such as Expedia Rapid or Hotelbeds/HBX.
- [ ] Persistent enquiry/CRM storage.
- [ ] Payments.
- [ ] Live booking.
