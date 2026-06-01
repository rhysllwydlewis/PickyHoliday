# PickyHoliday

A Vite + React landing page implementation of the PickyHoliday group-travel homepage concept, now with a provider-based travel integration foundation.

## Scripts

- `npm run dev` - start the Vite development server for the React app.
- `npm run build` - build production frontend assets into `dist/`.
- `npm run preview` - preview the production frontend bundle with Vite.
- `npm run server` / `npm run dev:api` - run the lightweight travel API proxy on `PORT` or `8787`.
- `npm start` - run the production Node server, serving both `/api/*` routes and built `dist/` assets.

## Provider mode

Mock mode is the safe default and requires no credentials:

```bash
TRAVEL_PROVIDER_MODE=mock
VITE_TRAVEL_PROVIDER_MODE=mock
```

For a deploy that uses the backend API from the same origin, build the frontend with a non-mock `VITE_TRAVEL_PROVIDER_MODE` and leave `VITE_API_BASE_URL` blank. The client will call `/api/travel/*` on the same host. For a split frontend/API deploy, set `VITE_API_BASE_URL` to the API origin.

## Amadeus

The Amadeus provider is live-capable server-side only. To enable it, set server-side secrets in your deployment environment:

```bash
TRAVEL_PROVIDER_MODE=amadeus
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

Do not commit real credentials. The app does not create live bookings or payments in this PR.
