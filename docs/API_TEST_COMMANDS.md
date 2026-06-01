# API test commands

Start the backend first:

```bash
npm run dev:api
```

Then run the automated smoke test from another terminal:

```bash
npm run test:api
```

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

All travel routes should return a JSON envelope with `providerMode`, `results`, `providerErrors` and `meta` where applicable.
