# Roadmap

## Status legend
- ✅ Done / usable now
- 🟡 Partial / MVP quality
- ⬜ Not started

## Phase 0 — Truth cleanup + naming cleanup ✅
- Runtime-mode reality clarified in README
- Contradictory production language removed
- Product framed as modular aviation playground with price-intelligence core

## Phase 1 — IA repositioning ✅
- Added global module navigation
- Homepage repositioned as module hub
- Price Intelligence explicitly retained as flagship module

## Phase 2 — Demo/API parity fixes ✅
- Added Next.js mock routes for route detail, airport context, methodology, network hubs, and seasonality index
- Reduced broken navigation paths in mock mode
- Confidence semantics standardized to categorical labels in contracts/UI

## Phase 3 — New enthusiast modules ✅
- Airport Intelligence page backed by `/api/airports/[iata]/context`
- Airline Intelligence page backed by `/api/airlines/overview` with carrier drilldown page and trend charts
- Route Network page with geospatial visualization backed by `/api/network/geo`
- Seasonality page backed by `/api/seasonality/index`
- Learn page backed by `/api/meta/methodology`

## Phase 4 — Hardening pass ✅ (MVP-consistency)
- Backend repository now supports PostgreSQL query mode when `FPI_DATABASE_URL` is set
- Data-refresh workflow now passes required ingest `--input` args and validates configured source paths
- Added backend contract tests for categorical confidence + DB-mode branch behavior
- Added Postgres integration tests covering happy path and edge/failure path assertions
- Added frontend API contract tests and Playwright UI/E2E user-journey tests in CI
- Data provenance now includes `last_refreshed_at` and is surfaced in module UI notices

## Next hardening targets 🟡
1. Expand Postgres integration tests beyond fixture-level scope (pagination, null-heavy records, query performance)
2. Add frontend UI-level integration/E2E tests (not just API contract checks)
3. Deepen Airline Intelligence with carrier-level delay/cancellation trend charts
4. Add live freshness telemetry sourced from actual pipeline refresh events
