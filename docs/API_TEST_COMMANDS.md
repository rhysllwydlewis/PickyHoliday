# API test commands

Mock mode should pass without credentials. Start the backend first:

```bash
TRAVEL_PROVIDER_MODE=mock npm run dev:api
```

Then run the automated smoke test from another terminal:

```bash
npm run test:api
```

The smoke test checks that:

- `/api/health` includes Duffel in `providerStatus`.
- `/api/travel/flights` returns flight-capable mock results.
- `/api/travel/search` works.
- `/api/travel/holiday-composer` works.
- `/api/travel/enquiries` returns a mock enquiry-only response, not a booking confirmation.

Manual curl checks:

```bash
curl http://localhost:8787/api/health
curl 'http://localhost:8787/api/travel/locations?keyword=barcelona'
curl -X POST http://localhost:8787/api/travel/search -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/flights -H 'Content-Type: application/json' -d '{"destination":"Barcelona","origin":"London (All Airports)"}'
curl -X POST http://localhost:8787/api/travel/hotels -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Group hotel stays"}'
curl -X POST http://localhost:8787/api/travel/packages -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/holiday-composer -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/enquiries -H 'Content-Type: application/json' -d '{"resultId":"demo","destination":"Barcelona"}'
curl -i -X POST http://localhost:8787/api/travel/search -H 'Content-Type: application/json' -d '{bad'
```

Optional Duffel status check when you have a local test token:

```bash
TRAVEL_PROVIDER_MODE=duffel DUFFEL_ACCESS_TOKEN=duffel_test_xxx npm run dev:api
curl http://localhost:8787/api/health
```

Do not make live Duffel calls required for CI/local smoke tests. All travel routes should return a JSON envelope with `providerMode`, `results`, `providerErrors` and `meta` where applicable.
