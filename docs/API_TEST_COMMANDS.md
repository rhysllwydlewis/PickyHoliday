# API test commands

Mock mode should pass without credentials and should default to JSON enquiry storage. Start the backend first:

```bash
TRAVEL_PROVIDER_MODE=mock AFFILIATE_PROVIDER_MODE=mock ENQUIRY_STORAGE_MODE=json npm run dev:api
```

Then run the automated smoke test from another terminal:

```bash
npm run test:api
```

The smoke test checks that:

- `/api/health` includes Duffel in `providerStatus`.
- `/api/health` includes `affiliate-package` in `providerStatus`.
- `/api/health` includes `enquiryStorageMode`, `databaseConfigured`, and `databaseStatus` without exposing `DATABASE_URL`.
- `/api/travel/flights` returns flight-capable mock results.
- `/api/travel/packages` returns package/affiliate results.
- Package results use safe non-live booking modes only.
- `/api/travel/search` works.
- `/api/travel/holiday-composer` works.
- `/api/travel/enquiries` returns an enquiry id and an enquiry-only response, not a booking confirmation.
- Invalid enquiry email input returns a controlled validation error.

## Local manual curl checks

```bash
curl http://localhost:8787/api/health
curl 'http://localhost:8787/api/travel/locations?keyword=barcelona'
curl -X POST http://localhost:8787/api/travel/search -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/flights -H 'Content-Type: application/json' -d '{"destination":"Barcelona","origin":"London (All Airports)"}'
curl -X POST http://localhost:8787/api/travel/hotels -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Group hotel stays"}'
curl -X POST http://localhost:8787/api/travel/packages -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/packages -H 'Content-Type: application/json' -d '{"destination":"Tenerife","intent":"Beach breaks"}'
curl -X POST http://localhost:8787/api/travel/holiday-composer -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
curl -X POST http://localhost:8787/api/travel/enquiries -H 'Content-Type: application/json' -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
curl -i -X POST http://localhost:8787/api/travel/enquiries -H 'Content-Type: application/json' -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"bad-email","consentToContact":true}'
curl -i -X POST http://localhost:8787/api/travel/search -H 'Content-Type: application/json' -d '{bad'
```

## Railway manual curl checks

Replace `https://YOUR_APP_URL`, `YOUR_ADMIN_ACCESS_TOKEN`, and `ENQUIRY_ID` with the Railway app URL, configured admin token, and an enquiry id returned from creation/listing.

### Health

```bash
curl https://YOUR_APP_URL/api/health
```

### Create enquiry

```bash
curl -X POST https://YOUR_APP_URL/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
```

### Invalid email

```bash
curl -i -X POST https://YOUR_APP_URL/api/travel/enquiries \
  -H "Content-Type: application/json" \
  -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"bad-email","consentToContact":true}'
```

### Admin list

```bash
curl https://YOUR_APP_URL/api/admin/enquiries \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

### Admin status update

```bash
curl -X PATCH https://YOUR_APP_URL/api/admin/enquiries/ENQUIRY_ID/status \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'
```

## Optional local admin enquiry check

Use this only when you intentionally allow unprotected admin routes in test/mock mode:

```bash
NODE_ENV=test TRAVEL_PROVIDER_MODE=mock ALLOW_UNPROTECTED_ADMIN=true npm run dev:api
curl http://localhost:8787/api/admin/enquiries
```

## Optional Postgres-mode missing configuration check

```bash
ENQUIRY_STORAGE_MODE=postgres npm run dev:api
curl http://localhost:8787/api/health
curl -i -X POST http://localhost:8787/api/travel/enquiries -H 'Content-Type: application/json' -d '{"destination":"Barcelona","customerName":"Test User","customerEmail":"test@example.com","consentToContact":true}'
```

The health response should report `databaseConfigured:false` and `databaseStatus:"postgres-not-configured"`; the enquiry POST should return a controlled `503` explaining that the server database connection must be configured or storage switched back to JSON.

## Optional Duffel status check

Use this only when you have a local test token:

```bash
TRAVEL_PROVIDER_MODE=duffel DUFFEL_ACCESS_TOKEN=duffel_test_xxx npm run dev:api
curl http://localhost:8787/api/health
```

## Optional affiliate tracking check

Use placeholder values only:

```bash
TRAVEL_PROVIDER_MODE=mock AFFILIATE_DEFAULT_TRACKING_ID=demo npm run dev:api
curl -X POST http://localhost:8787/api/travel/packages -H 'Content-Type: application/json' -d '{"destination":"Barcelona","intent":"Holidays"}'
```

Do not make live Duffel, live affiliate, booking, payment, or supplier-reservation calls required for CI/local smoke tests. All travel routes should return a JSON envelope with `providerMode`, `results`, `providerErrors`, and `meta` where applicable.
