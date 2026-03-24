# Truth-First Repository Assessment & Upgrade Plan (2026-03-24)

## Scope
Deep assessment of repository reality as of 2026-03-24, focused on product truth, data depth, and execution path to a real avgeek intelligence lab.

## Key Findings (Evidence-Backed)

### 1) Product runtime reality
- Frontend default API mode is mock/demo via Next.js API routes, while backend mode is optional and separate.
- Backend only exposes health, airports, routes, and methodology endpoints; no backend airline/network/seasonality endpoints currently exist.
- Core “aviation playground” framing is explicit in primary README.

### 2) Data reality
- Repository contains no committed raw/staging/marts data beyond `.gitkeep` placeholders.
- Data pipeline scripts are local-file dependent and require user-provided source paths.
- Scoring is heuristic (`v1_heuristic`) and documented as non-forecasting.

### 3) Engineering reality
- Clear backend layering (API/service/repository/schemas), with CSV fallback and DB mode branch.
- Tests exist for backend API shape/contracts and one Postgres integration path.
- Frontend has API-contract and Playwright journey tests.

### 4) Truth drift risk
- Repo contains many phase-completion/progress docs with stronger claims than code/data currently prove.
- Significant documentation duplication and stale portfolio narrative remains.

## Strategic Recommendation
Choose one wedge and make it deeply credible before adding more modules. Best wedge: **airport/route competitiveness intelligence** using robust schedule + reliability + network-change evidence, then layer fares as context rather than product core.
