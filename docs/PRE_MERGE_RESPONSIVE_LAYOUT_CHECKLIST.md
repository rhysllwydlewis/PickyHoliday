# Pre-merge checklist: responsive homepage, search hero and navigation

## Scope verified
- Homepage header, hero, search composer, popular chips and smart suggestion overlays use the shared responsive sizing tokens.
- `/search` continues to reuse the compact composer styles and accepts the existing search query parameters.
- All search fields remain present at every responsive breakpoint: destination, departure airport, depart, return, adults, children, rooms, nights, date flexibility and search.
- Enquiry-first behaviour is preserved; no live booking, payment, supplier reservation or Booking.com reservation behaviour was added.

## Responsive manual checks
- 1440px desktop: full navigation, Sign in and Start planning fit without overlap.
- 1280px laptop: desktop layout remains premium and the search panel is not enlarged.
- 1024px tablet landscape: priority nav links remain visible, lower-priority links and Sign in are in the drawer, and the search grid remains multi-column.
- 820px tablet portrait: menu plus Start planning fit cleanly; hero copy, assurance chips and search panel avoid crowding.
- 768px tablet portrait: menu plus Start planning fit cleanly and the balanced compact search grid remains available.
- 720px breakpoint edge: legacy mobile header rules are overridden so Start planning remains visible until the small-phone drawer breakpoint.
- 430px mobile: navigation collapses cleanly and search fields remain available with reduced spacing.
- 390px mobile: smart destination/airport suggestions remain tappable and viewport-constrained.
- 360px small mobile: Start planning is available inside the drawer and the composer stacks without removing fields.

## Automated checks
- `npm run build`
- `npm run test:api`
- `npm run test:booking-demand`
- `npm run test:smart-search`
- `npm run test:responsive-layout`
- `npm run lint`

## Guardrails
- No live bookings added.
- No payments added.
- No supplier reservations added.
- No Booking.com reservations added.
- Existing routes and query params preserved.
- Smart destination and airport combobox behaviour preserved.
