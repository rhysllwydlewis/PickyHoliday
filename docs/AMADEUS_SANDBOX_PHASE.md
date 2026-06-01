# Amadeus sandbox phase

This phase makes Amadeus usable as the first server-side technical provider while keeping PickyHoliday provider-agnostic.

## What is enabled

- Server-side OAuth using `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` only on the Node API.
- Airport & City Search through `GET /api/travel/locations?keyword=barcelona` and `POST /api/travel/locations`.
- Flight Offers Search with origin, destination, departure date, return date, adults, GBP currency and maximum result count.
- Airline names are mapped from Amadeus dictionaries when provided.
- Hotel List by city code.
- Hotel Offers pricing is attempted for returned hotel IDs. If sandbox pricing is unavailable, hotel list results are returned with “price unavailable in sandbox”.
- Flight + hotel composition only returns composed results when both flight and hotel sides exist.

## What is deliberately not enabled

- No flight orders.
- No hotel bookings.
- No payment flow.
- No fake booking confirmation.
- No direct browser calls to Amadeus.

## Environment variables

```bash
TRAVEL_PROVIDER_MODE=amadeus
VITE_TRAVEL_PROVIDER_MODE=amadeus
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
AMADEUS_CURRENCY=GBP
```

For local development, run the API and Vite in separate terminals. Vite proxies `/api` to `http://localhost:8787`.

```bash
npm run dev:api
npm run dev
```

## Known limitations

- Amadeus sandbox hotel offers can be sparse and may fail for some hotel IDs, dates or cities. The provider catches hotel-offer failures and falls back to hotel list results.
- Low-cost airline and UK package holiday coverage is not solved by Amadeus alone. Ryanair, easyJet, Vueling, TUI, Jet2, easyJet Holidays, Loveholidays and On the Beach remain future affiliate/package/provider work.
- Prices are search results only. They are not booking-ready quotes.
