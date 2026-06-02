
## Operations centre guardrails

The operations centre is admin-only except for the public-safe analytics capture endpoint. Public analytics rejects admin event types and sanitises metadata. The webhook tester requires admin authorization, validates schemes/hosts, strips query strings from analytics metadata, and does not include secrets by default.

Do not add live booking, payments, Duffel orders, Amadeus orders, supplier reservations, customer accounts or supplier accounts as part of operations tooling.
