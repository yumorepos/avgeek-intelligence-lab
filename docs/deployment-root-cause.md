# Deployment Root Cause Analysis (truth-first)

Date: 2026-03-25

## What was directly verified

1. Frontend intelligence pages call backend intelligence endpoints via `fetchIntelligence(...)`, and error copy appends backend hint text. 
2. In production, when `NEXT_PUBLIC_USE_BACKEND_PROXY=true`, frontend intelligence calls resolve to `/api` proxy mode. 
3. Airport-role and competition pages bootstrap with a default airport resolved from **frontend demo airport search** (`/api/airports/search`) and only then probe intelligence endpoints.
4. Backend intelligence endpoints return `404 Airport not found.` when airport context is missing.
5. Repository contains no mart CSV data (`data/marts` has only `.gitkeep`), while Render blueprint enables CSV fallback (`FPI_USE_CSV_FALLBACK=true`).
6. Backend readiness logic explicitly reports `503 not_ready` when CSV fallback is enabled but `route_competition_metrics.csv` is missing/empty.

## Root-cause chain for the live error text

Observed user-facing errors:
- `Airport role error: Airport not found ...`
- `Competition intelligence error: Airport not found ...`

Most likely real chain (supported by code + local diagnostic proof):

1. Intelligence pages auto-select an airport from frontend demo list (JFK/LAX/...).
2. Deployed frontend sends intelligence request to backend (direct base URL or `/api` proxy).
3. Deployed backend can be reachable/healthy but still data-empty for intelligence marts.
4. Backend `get_airport_context` cannot find selected airport in loaded intelligence universe and returns 404.
5. Frontend surfaces that exact backend detail with wrapper hint, producing current visible error.

## Classification: where the bug actually lives

- **Primary**: data/deployment configuration mismatch (backend runtime enabled without intelligence data loaded).
- **Secondary**: frontend default-airport strategy mixes demo airport universe with backend intelligence universe.
- **Tertiary**: IA/trust gap (UI implies backend-supported flow but lacks explicit “supported-airport universe” picker sourced from backend).

## Smallest high-confidence fix path

1. Add and use a backend-supported-airport endpoint for intelligence (or reuse `/intelligence/routes/changes` + aggregation if needed temporarily).
2. Change airport-role and competition pages to initialize airport only from backend-supported list; if empty, show explicit “backend not data-ready” state (not airport-not-found).
3. Add startup/health guard in deployment verification to fail release when `/health/readiness != 200`.

## Safest long-term fix path

1. Make data readiness a hard deployment gate.
2. Version and ship a minimal canonical mart bundle (or required DB seed) for production demo.
3. Unify airport selector component with explicit source badge (`backend-supported` vs `demo-only`) and prevent cross-surface drift.
4. Add CI/deploy check that verifies at least one known airport returns 200 for:
   - `/intelligence/airports/{iata}/role`
   - `/intelligence/airports/{iata}/competition`
   - `/intelligence/airports/{iata}/insights`
