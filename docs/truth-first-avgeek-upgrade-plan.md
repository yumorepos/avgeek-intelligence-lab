# Truth-First Avgeek Upgrade Plan

Date: 2026-03-25

## Phase 0 — Truth stabilization / deployment fix

**Objective**
- Eliminate live airport-not-found failures and align frontend defaults with backend-supported intelligence coverage.

**Why it matters**
- Current flagship pages fail on first load, undermining trust in every downstream feature.

**Likely files/systems**
- `frontend/lib/airport-defaults.ts`
- `frontend/app/intelligence/airports/page.tsx`
- `frontend/app/intelligence/competition/page.tsx`
- `frontend/app/intelligence/route-changes/page.tsx`
- `frontend/lib/api.ts`
- backend new endpoint for supported intelligence airports (likely under `backend/app/api/intelligence.py` + `services` + `repositories`)
- deployment checks: `frontend/scripts/verify-deployment.mjs`

**Dependencies**
- backend data-ready environment (DB seed or committed demo marts).

**Risks**
- Treating “backend reachable” as “backend data-ready.”
- Reintroducing demo/backend airport universe drift.

**Completion proof**
- `/health/readiness` is 200 in deployed backend.
- Default airport chosen on role/competition pages returns 200 for role + competition.
- No airport-not-found error on first load in production.

---

## Phase 1 — UX wording + IA cleanup

**Objective**
- Simplify labels and structure into clear user mental model: Routes, Airlines, Airports, Network, Seasonality, Methodology, Data Status.

**Why it matters**
- Current naming is accurate but verbose and repetitive, slowing comprehension.

**Likely files/systems**
- `frontend/components/AppNav.tsx`
- `frontend/app/page.tsx`
- intelligence page headers/copy in `frontend/app/intelligence/*`
- `frontend/app/about/page.tsx`, `frontend/app/data-status/page.tsx`, `frontend/app/learn/page.tsx`

**Dependencies**
- Phase 0 complete (no broken defaults/errors).

**Risks**
- Over-simplifying and losing truth/disclaimer precision.

**Completion proof**
- IA labels mapped 1:1 to modules.
- Trust copy reduced but all demo-vs-backend status still explicit.

---

## Phase 2 — Airline logos + visual polish

**Objective**
- Add consistent airline visual identity across cards/tables/details with truthful fallbacks.

**Why it matters**
- Biggest visual quality uplift for recruiter/demo impact.

**Likely files/systems**
- new logo utility map under `frontend/lib/` (e.g., `airline-branding.ts`)
- `frontend/app/airlines/page.tsx`
- `frontend/app/airlines/[carrier]/page.tsx`
- route cards/components that show carrier fields

**Dependencies**
- Decide source strategy.

**Recommended strategy**
1. Primary: local curated static mapping for top demo carriers (AA, DL, UA, B6, AS).
2. Secondary: optional provider URL for extended carriers.
3. Fallback: initials monogram + accessible color token.

**Risks**
- Licensing/terms issues if scraping unofficial assets.

**Completion proof**
- 100% rows show either verified logo or deterministic monogram fallback.

---

## Phase 3 — Demo-data expansion

**Objective**
- Make every visible module feel complete and internally consistent.

**Minimum credible demo dataset**
- 25 airports (major US hubs + focus cities)
- 12 airlines (US majors + ULCC + key international)
- 120 directional routes
- 12–24 monthly periods
- metrics: fares, frequency proxy, on-time, cancellation, concentration, share, aircraft family (if synthetic labeled)

**Likely files/systems**
- `frontend/lib/demo-data.ts`
- frontend mock API routes under `frontend/app/api/**`
- optional backend seed CSVs in `data/marts/` + loader scripts

**Dependencies**
- metric dictionary and synthetic-labeling policy.

**Risks**
- Truth drift if synthetic fields are not clearly tagged.

**Completion proof**
- No empty demo tables on major pages.
- All synthetic metrics explicitly tagged in metadata.

---

## Phase 4 — Major avgeek feature expansion

**Objective**
- Add high-leverage, feasible intelligence features with visual and analytical depth.

**Build order (recommended)**
1. Route market-share breakdown by carrier.
2. Hub strength/dependence and airport dominance leaderboard.
3. Concentration risk monitor (route monopoly risk heatmap).
4. Reliability view (on-time/cancellations) at route and airline aggregates.
5. Route lifecycle timeline (launch/cut/resume) with monthly state transitions.

**Likely files/systems**
- backend schemas/services/repositories for new contracts
- frontend intelligence pages + new visual components
- `scripts/build_*` marts generation updates

**Dependencies**
- expanded marts and consistent grain definitions.

**Risks**
- jumping into finance-style metrics (CASM/profitability) without valid source model.

**Completion proof**
- each feature has data-contract tests + visible provenance + caveats.

---

## Phase 5 — Repo cleanup / canonicalization

**Objective**
- reduce truth-surface drift and remove stale/duplicate artifacts after implementation stabilizes.

**Targets**
- consolidate overlapping plan/audit docs into canonical set.
- remove alias duplication where unnecessary (`/about` vs `/data-status` content ownership).
- archive or delete stale verification scripts no longer used by CI/deploy.

**Dependencies**
- phases 0–4 completed and validated.

**Risks**
- deleting files still referenced in docs/scripts.

**Completion proof**
- canonical docs index + link check passes.
- build/tests pass after cleanup.
