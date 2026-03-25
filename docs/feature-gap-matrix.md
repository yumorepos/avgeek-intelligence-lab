# Feature Gap Matrix (current reality vs target)

Date: 2026-03-25

## Current module reality

| Module | Current status | Runtime truth | Gap |
|---|---|---|---|
| Route price explorer (`/`) | Partially real | Frontend `/api/routes/*` + backend parity exists in repo | No production proof gate; still partly demo-shaped UX |
| Airport profiles (`/airports`) | Partially real | Frontend demo airport discovery + backend parity endpoint exists | Selector source drifts from backend intelligence support |
| Route changes (`/intelligence/route-changes`) | Backend-first | Backend endpoint implemented | Defaults hardcode JFK; weak empty-state handling |
| Airport roles (`/intelligence/airports`) | Backend-first | Backend endpoint implemented | Fails when default/demo airport absent in backend data |
| Competition (`/intelligence/competition`) | Backend-first | Backend endpoints implemented | Same airport universe mismatch; dense wording |
| Airlines (`/airlines`) | Demo-only | Frontend demo endpoints only | No logo system; low realism |
| Network (`/network`) | Demo-only | Frontend mock geo rendering | Not tied to backend route/intel marts |
| Seasonality (`/seasonality`) | Demo-only | Frontend demo endpoint only | No airport/route filters or backend contract |
| Methodology (`/learn`) | Partial | Frontend API route + static framing | Good baseline, but verbose/duplicated trust copy |
| Data status (`/data-status`) | Partial | Alias to `/about` | Duplicate-route semantics and naming drift |

## Requested feature classification

| Feature | Classification | Notes |
|---|---|---|
| Airline market share by route | Easy extension (backend competition marts) | Route competition already has dominant share + carriers; add per-carrier split model |
| Aircraft used per route/airline | Requires new data model | Needs fleet/equipment source not in current marts |
| Route network map | Partially exists | Demo map exists; production-grade needs backend geo + route filters |
| Load factor by route | Requires new data model | Needs seats + pax at route-period grain |
| RPK / ASK / CASM | Requires new data model | Financial/traffic modeling absent; demo-only candidate if synthetic |
| Most profitable airlines | Unrealistic now | Profitability cannot be credibly inferred from existing data |
| Busiest airports | Easy extension | Airport role + enplanement can support |
| Hub strength / dependence | Partially exists | Airport role metrics close to this already |
| Route concentration / monopoly risk | Already exists (partial) | Route/airport competition labels available |
| Airport dominance / carrier concentration | Already exists | Airport competition metrics endpoint implemented |
| On-time reliability | Partial | Basic on-time in route explorer; no broad reliability module |
| Seasonality & demand shifts | Demo-only partial | Current seasonality is mock-only |
| Launch/suspension/resumption | Already exists | Route changes endpoint exposes these types |
| Alliance/codeshare intelligence | Requires new data model | No alliance datasets currently wired |

## Best demo-only candidates (truthful)

- RPK/ASK/CASM exploratory cards with explicit synthetic label.
- Aircraft mix visualizations from curated sample routes.
- Alliance/codeshare explorer with static reference dataset.

## Best production-grade candidates (near-term)

- Airport supported-universe + stable defaulting.
- Route market share by carrier (from competition marts).
- Hub strength and dominance leaderboard.
- Route concentration risk dashboard.
- Reliability module using existing on-time/cancellation marts where available.
