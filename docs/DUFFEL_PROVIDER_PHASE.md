# Duffel provider phase

## Goal

Add Duffel as PickyHoliday’s preferred future flight provider path without building live booking. This phase adds the server-side provider scaffold, environment variables, registry selection, diagnostics and mock fixtures needed to safely test the direction.

## Why Duffel now

Duffel is a better fit for the next flight phase because it is focused on modern flight retailing, has a clear test mode and is more startup-friendly for future flight selling. Amadeus remains useful for sandbox/search and broad travel experimentation, but production booking/ticketing can require extra commercial, operational and accreditation decisions.

## What this phase includes

- `src/services/providers/duffelProvider.js`.
- Server-side `DUFFEL_ACCESS_TOKEN` usage only.
- Duffel offer-request search scaffold using `Duffel-Version` and bearer-token headers.
- Mapping Duffel offers into the normalised `flight-only` holiday result model.
- Mock Duffel-shaped flight-only results for UK to Barcelona and UK to Ibiza.
- Provider diagnostics for Duffel configured status, primary flight provider and active providers.

## What this phase does not include

- No Duffel orders.
- No payments.
- No seat maps.
- No ancillaries.
- No live booking confirmation.
- No package affiliate feeds.
- No TUI, Jet2, easyJet Holidays, Loveholidays or On the Beach integrations.

## Environment variables

```bash
TRAVEL_PROVIDER_MODE=duffel
TRAVEL_PRIMARY_FLIGHT_PROVIDER=duffel
DUFFEL_ACCESS_TOKEN=
DUFFEL_BASE_URL=https://api.duffel.com
DUFFEL_VERSION=v2
```

Use a Duffel test token locally; test tokens usually start with `duffel_test_`. Keep the token server-side only and do not create any `VITE_DUFFEL_*` variable.

## Future work after this phase

The next major phase should be package/affiliate redirects and manual/commercial source work, not live booking. Priorities:

1. Affiliate/package redirect provider.
2. Manual promoted deals admin/source.
3. Enquiry persistence.
4. Hotel depth through Duffel Stays, Expedia Rapid, Hotelbeds/HBX or another lodging provider.
5. Deeper flight booking only after legal, support and fulfilment readiness.
