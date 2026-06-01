# Provider foundation pre-merge checklist

Use this checklist before merging the provider-based travel integration foundation PR.

## Scope guardrails

- [ ] Mock mode works by default without live API credentials.
- [ ] Mock mode remains the default; live Amadeus calls only run server-side when `TRAVEL_PROVIDER_MODE` is non-mock and Amadeus credentials are configured.
- [ ] No real credentials are committed.
- [ ] No payment flow is implemented.
- [ ] No live booking or fake booking confirmation is shown.
- [ ] The frontend calls only the PickyHoliday travel service layer/proxy abstractions.

## Product flow

- [ ] Homepage renders with PickyHoliday branding intact via Vite preview and via `npm start` after `npm run build`.
- [ ] Mock search returns normalised holiday results.
- [ ] Result cards support flight + hotel, hotel-only, package and advert-shaped results.
- [ ] Loading, empty and error states are visible and understandable.
- [ ] Trip modal shows supplier, airline, destination, hotel, price, nights/date, group size, baggage, board basis, booking mode and protection labels.
- [ ] Enquiry CTA creates only a mock enquiry and clearly states that no booking was created.
- [ ] Partner redirect CTA appears only when a provider supplies a `partnerUrl`.

## Backend/API

- [ ] `GET /api/health` returns provider status.
- [ ] `POST /api/travel/search` returns mock results.
- [ ] `POST /api/travel/flights`, `/hotels`, `/packages` and `/holiday-composer` return consistent JSON envelopes.
- [ ] `POST /api/travel/enquiries` returns a mock enquiry response, not a booking confirmation.
- [ ] `npm start` serves built `dist/` assets and `/api/*` routes for a single-service deployment.

## Follow-up PRs, not this PR

- [ ] Expanded Amadeus autocomplete, hotel offers pricing and richer composition.
- [ ] Package/affiliate partner integrations.
- [ ] Hotel depth provider.
- [ ] Persistent enquiry/CRM storage.
- [ ] Payments.
- [ ] Live booking.
