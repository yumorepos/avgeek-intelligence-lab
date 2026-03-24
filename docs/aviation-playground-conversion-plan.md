# Aviation Playground Conversion Plan (Truth-First)

## 1. Executive Summary
This repository is already a **credible route-intelligence MVP scaffold** (Next.js frontend, FastAPI API, SQL schema, ETL scripts), but it is currently split across two realities:
1) a polished demo experience powered by mock API routes in Next.js, and
2) a backend/data pipeline architecture that is only partially wired to real data in runtime.

The best move is a **hybrid evolution**: keep the same repo, reposition the product with modular IA, retain flight-price intelligence as the flagship module, and incrementally add enthusiast modules that can start with transparent static/mock datasets and then graduate to ingested data.

---

## 2. Repo Truth Audit

### 2.1 Actual product scope today
**Already implemented**
- Homepage route explorer with origin search, route cards, metadata notice, and links to route detail (`frontend/app/page.tsx`, `frontend/components/*`).
- Route detail page with score breakdown, fare and reliability chart surfaces, methodology hint, and airport context fetch attempt (`frontend/app/routes/[origin]/[destination]/page.tsx`).
- FastAPI endpoints for health, airport search/context, route explore/detail, and methodology (`backend/app/api/*.py`).
- CSV-based repository fallback layer reading `data/marts/*.csv` if enabled (`backend/app/repositories/analytics.py`).
- SQL schema with route/airport/airline/fare/reliability/score tables (`sql/schema.sql`).
- ETL scripts to normalize source CSVs and build marts (`scripts/ingest_*.py`, `scripts/build_*.py`).

**Partially implemented**
- Backend real Postgres access is not implemented in repository methods; when `database_url` is set, code intentionally raises an unavailable error instead of querying DB.
- Route detail reliability trend exists in schema/response contract but repository currently returns empty reliability array in fallback mode.
- Airport context enplanement exists in schema/contract but fallback repository returns `None` for enplanement.

**Implied in docs but not implemented as claimed**
- README claims “A (Production-Ready)” and “All systems operational”, while also stating mock data mode.
- Data-refresh workflow calls ingest scripts without required `--input` arguments, so current scheduled refresh path is non-runnable as written.
- Frontend includes mock endpoints only for airport search and route explore; route detail/context are not mocked, so demo is asymmetric.

### 2.2 Frontend architecture
- Next.js 14 app router + client-heavy pages.
- API client uses `NEXT_PUBLIC_API_BASE_URL` fallback to `/api`.
- Core reusable components: search panel, route card, metadata notice, simple charts.
- Additional enhanced components and `/test-ui` route indicate design experimentation but create product-surface ambiguity.

### 2.3 Backend/API architecture
- FastAPI app factory with CORS, request logging middleware, global error middleware.
- Routers are cleanly separated by domain (`health`, `airports`, `routes`, `meta`).
- Service layer converts repository payloads to Pydantic contracts.
- Repository layer currently acts as CSV fallback reader and deliberate DB guardrail.

### 2.4 Data model / ETL / SQL surfaces
- SQL schema is strong MVP foundation: dimensions (`airports`, `airlines`, `routes`) + facts (`monthly_fares`, `ontime_stats`, `cancellations`, `airport_enplanements`, `route_scores`) + helper view.
- ETL scripts follow raw → staging/marts pattern and include lightweight DQ warning tracking.
- No committed sample datasets in `data/raw`, `data/staging`, `data/marts` (only `.gitkeep`), so out-of-box demo data comes from frontend mocks, not pipeline outputs.

### 2.5 Current UX strengths
- Clear onboarding copy for interpreting score/deal/provenance.
- Good trust pattern via metadata notice and caveat framing.
- Route cards and detail pages are visually coherent and portfolio-friendly.

### 2.6 Current UX weaknesses
- Demo breaks continuity: homepage works with mock endpoints, but route detail requires backend endpoints not mocked in Next.js API layer.
- `/test-ui` route exposes internal component playground in production nav surface.
- Reliability/confidence display mismatch: backend score confidence is textual in scoring pipeline (`high/medium/low`) but route schema and UI expect numeric percentage.

### 2.7 Deployment status
- Frontend build/deploy workflow exists and validates Next build.
- Tests workflow exists for backend and frontend lint/build.
- Backend deployment docs are extensive but largely guidance; no concrete infra-as-code for backend deploy in repo.

### 2.8 Test / CI status
- Backend tests are API-contract and middleware-oriented with stubs.
- Local pytest from repo root fails unless PYTHONPATH is set (workflow sets it explicitly), indicating local dev friction.
- Frontend build succeeds locally.

### 2.9 Documentation quality
- Strong volume and narrative quality.
- However, docs/README surfaces contain inconsistent truth statements (simultaneous MVP caveats and production-grade claims).
- `README_NEW.md` duplicates README narrative with additional stale claims and placeholders.

### 2.10 Trust issues / misleading surfaces
- “Production-ready grade A” claims conflict with mock-data-default, missing data files, and non-functional data-refresh workflow configuration.
- “Built with ❤️ for aviation enthusiasts” is directionally true, but actual implemented product is currently still route-price intelligence plus UI test page.

### 2.11 Reusable for aviation-playground direction
- Modular API/domain separation.
- Route-centric schema foundation.
- Provenance-oriented UX components.
- Existing visual design system and card/chart primitives.

### 2.12 What creates drag
- Naming locked to “flight price intelligence” everywhere.
- Mixed realities (mock frontend vs backend contracts) causing trust debt.
- Overstated README language.
- Duplicate/stale docs and showcase-only routes.

---

## 3. Strategic Recommendation
**Recommended path: Option 4 (Hybrid): reposition/rebrand + modularize within same repo.**

Why this is best:
1. Current architecture is reusable enough to avoid rewrite.
2. Rebrand alone (Option 2) without modular restructuring would keep product narrow.
3. Module split alone (Option 3) without rebrand would keep first impression too narrow.
4. Hybrid lets you preserve SEO/history and keep flight-price module as “anchor credibility” while broadening to enthusiast playground.

Proposed framing:
- Repo remains same for continuity.
- Product brand shifts in UI/docs to broader aviation explorer identity.
- Existing route intelligence becomes module `Price Intelligence` under a larger IA.

---

## 4. Target Product Vision

### 4.1 Product name options
1. **Aviation Playground Lab**
2. **AvGeek Intelligence Studio**
3. **SkyScope Explorer**
4. **FlightGraph Playground**
5. **Aviation Atlas Lab**

### 4.2 Target audience segments
- Avgeeks and casual aviation enthusiasts.
- Travel-curious users who want route/airport context, not just fare shopping.
- Data/product hiring managers evaluating end-to-end analytics craftsmanship.
- Students/learners interested in aviation data literacy.

### 4.3 Core value proposition
“Explore aviation like a data-native enthusiast: routes, airports, airlines, aircraft, reliability, seasonality, and fares in one transparent workspace.”

### 4.4 Differentiation from generic flight search
- Not booking-first; insight-first.
- Emphasizes explainability, provenance, trend context, and operational quality.
- Lets users compare network/reliability/seasonality narratives, not just one-date prices.

### 4.5 Why useful to enthusiasts specifically
- Route/network discovery.
- Airline and airport comparative intelligence.
- Fleet/aircraft educational context.
- Delay/cancellation pattern storytelling.

### 4.6 Why still strong portfolio piece
- Demonstrates data modeling + ETL + API + UX integrity.
- Shows honest uncertainty handling.
- Supports modular roadmap and feature prioritization decisions.

---

## 5. Feature Module Plan

| Module | Status Label | Rationale |
|---|---|---|
| Flight price intelligence | **Improve** | Already core; fix trust gaps, expand explainability, add calibration artifacts. |
| Route explorer | **Improve** | Exists; add filters (distance, demand class, leisure/business profile), map mode. |
| Airport intelligence | **Build next** | API skeleton exists; deepen with traffic trends, dominance, seasonality. |
| Airline intelligence | **Build next** | Schema has airlines/ontime by carrier; expose carrier pages and route reliability by carrier. |
| Aircraft / fleet explorer | **Later roadmap** | New data domain required; good enthusiast differentiator but adds ingestion complexity. |
| Reliability / delay insights | **Improve** | Data marts exist; surface delay/cancel trend UI and confidence details. |
| Route map / network visualization | **Build next** | High delight + portfolio impact; leverage current route keys. |
| Seasonal travel patterns | **Build next** | Can derive from existing monthly fare and reliability tables quickly. |
| Avgeek discovery features | **Later roadmap** | e.g., “airport of the week”, “route trivia”; editorial + content operations needed. |
| Learning / educational features | **Build next** | Low-cost high-value: explain score math, data caveats, glossary modules. |
| Watchlists / saved comparisons | **Later roadmap** | Requires user state/auth; defer until data quality and module breadth stabilize. |
| Editorial / storytelling surfaces | **Build next** | Can be static+interactive narratives with existing data; boosts uniqueness. |
| Generic “book now” metasearch clone | **Avoid** | Competes with incumbents; weak differentiation and high maintenance/API cost. |

---

## 6. Current-to-Future Architecture Mapping

### 6.1 Reusable existing routes/components
- Reuse `/` as new multi-module landing shell.
- Reuse `/routes/[origin]/[destination]` as Price Intelligence detail module.
- Reuse components: `AirportSearchPanel`, `RouteExploreCard`, `SimpleLineChart`, `MetadataNotice`.

### 6.2 Backend endpoints to extend
- Extend `/routes/explore` with filter/sort params and include route metadata dimensions.
- Extend `/routes/{origin}/{destination}` with component-level score explanations and reliability depth.
- Extend `/airports/{iata}/context` for airport profile module.
- Add `/airlines/{carrier}` and `/aircraft/{type}` families later.

### 6.3 Schemas/models/tables to add
- `airport_monthly_ops` (airport-level on-time/cancel aggregates).
- `route_distance` (miles, stage length bucket).
- `airline_route_presence` (carrier share by route-month).
- `seasonal_route_patterns` mart (month-level relative fare + reliability indices).
- Optional later: `aircraft_fleet_snapshot`, `route_aircraft_mix`.

### 6.4 Frontend refactors needed
- Create top-level module navigation and convert homepage from single-workflow to multi-workflow.
- Remove/lock `/test-ui` from public nav or move behind dev-only guard.
- Standardize confidence type across pipeline/backend/frontend (text label vs numeric).
- Add backend parity for demo mode (mock detail/context) or switch all demo to static fixtures.

### 6.5 Docs/README rewrites needed
- Replace “production-ready A grade” language with “MVP+ with transparent known gaps”.
- Add explicit “runtime modes” matrix: Mock demo vs CSV fallback vs Postgres-backed.
- Keep architecture docs but align claims with executable reality.

### 6.6 Naming/branding changes
- Keep repo slug short-term; rebrand product copy across metadata/layout/hero/docs.
- Rename app title in `frontend/app/layout.tsx` and API title in `backend/app/main.py` to broader aviation playground framing while preserving module naming.

### 6.7 Mock API demo structure: help or hurt?
- **Helps** rapid demo reliability and frontend portability.
- **Hurts** trust when only partial endpoints are mocked and behavior diverges from backend contracts.
- Recommendation: formalize as `demo mode` with full endpoint coverage + visible demo badge.

---

## 7. Data Strategy

### 7.1 Canonical currently available sources in repo
- BTS DB1B-like fare extracts (ingest script contract).
- BTS on-time extract contract.
- FAA enplanement extract contract.
- Derived marts: monthly fares, on-time, cancellations, route scores.

### 7.2 Missing data needed for new modules
- Route distance / geography metadata.
- Airport operations aggregates by month (arrivals/departures, delays).
- Airline descriptive metadata (names, alliances, hubs).
- Aircraft/fleet reference data (for fleet explorer).

### 7.3 What can be demoed with static/mock data
- Network map interactions.
- Airline profile cards with selected carriers.
- Educational pages (methodology, glossary, caveat explorer).
- Avgeek trivia/editorial surfaces.

### 7.4 What needs real ingestion first
- Reliability insights credibility improvements.
- Seasonal patterns by route.
- Airport intelligence comparisons.

### 7.5 What should be postponed
- Real-time tracking.
- Forecasting claims beyond heuristic baseline.
- Fleet-level live operations.
- Personalization/auth-heavy features.

### 7.6 Risk/complexity burden by area
- **Low**: educational/storytelling modules, derived seasonal indices from existing marts.
- **Medium**: airport + airline intelligence from existing BTS/FAA with new marts.
- **High**: aircraft/fleet ingestion and real-time status integrations (new providers, licensing, ops complexity).

---

## 8. UX / IA Plan

### 8.1 Homepage concept
Aviation Playground home with:
- Hero: “Explore aviation through data, not just bookings.”
- Module tiles: Price Intelligence, Route Map, Airport Profiles, Airline Insights, Learn.
- “What this demo mode includes” trust panel.

### 8.2 Navigation structure
- `Explore` (map + route discovery)
- `Price Intelligence` (existing core)
- `Airports`
- `Airlines`
- `Learn`
- `About Data` (provenance and caveats)

### 8.3 Key user journeys
1. Curious avgeek → picks airport → explores top routes + reliability + network context.
2. Learner → opens methodology + glossary + example route story.
3. Recruiter/interviewer → sees architecture/data lineage + live module demos.

### 8.4 Hero positioning
“An aviation enthusiast playground built like a real analytics product.”

### 8.5 First 3 screens priority
1. Home module hub with trust-mode banner.
2. Enhanced route explorer (existing module strengthened).
3. Airport intelligence screen (next highest differentiation with available data).

### 8.6 Enthusiast delight vs professionalism balance
- Delight via maps, comparisons, discovery prompts.
- Professionalism via provenance badges, confidence labels, and “how computed” links.

### 8.7 Interactive vs explanatory split
- Interactive: route compare, map, filter, seasonal sliders.
- Explanatory: methodology, caveats, data coverage, module maturity tags.

### 8.8 Remove if generic
- Any booking-style CTA that implies transaction flow.
- Internal UI playground surface in production (`/test-ui`) unless explicitly labeled as component lab.

---

## 9. Phased Implementation Roadmap

### Phase 0: Truth cleanup + naming cleanup
- **Goals:** remove overclaims, define runtime mode matrix, align brand language.
- **Files likely affected:** `README.md`, `README_NEW.md`, `docs/architecture.md`, `docs/roadmap.md`, `frontend/app/layout.tsx`.
- **Difficulty:** Low.
- **Dependencies:** none.
- **Biggest risks:** perceived downgrade if narrative tone shifts abruptly.
- **Visible impact:** immediate trust increase.

### Phase 1: Quickest high-impact repositioning
- **Goals:** introduce module-based homepage IA while preserving route explorer as default module.
- **Files:** `frontend/app/page.tsx`, shared nav/header components (new), `globals.css`.
- **Difficulty:** Medium.
- **Dependencies:** Phase 0 truth cleanup.
- **Risks:** IA bloat without enough implemented modules.
- **User impact:** first impression shifts from narrow tool to broader playground.

### Phase 2: Strongest reusable feature upgrades
- **Goals:** close demo parity gaps; add mock parity for detail/context or full backend integration path.
- **Files:** `frontend/app/api/**`, `frontend/lib/api.ts`, `backend/app/repositories/analytics.py`, `backend/app/services/analytics.py`.
- **Difficulty:** Medium-High.
- **Dependencies:** Phase 1 module framing.
- **Risks:** contract drift between mock and backend.
- **User impact:** fewer broken paths, higher confidence.

### Phase 3: New enthusiast modules
- **Goals:** ship airport intelligence + route network + seasonal insights.
- **Files:** new frontend routes under `frontend/app/airports`, `frontend/app/network`, `frontend/app/seasonality`; new backend APIs and marts.
- **Difficulty:** High.
- **Dependencies:** Phase 2 contract stabilization.
- **Risks:** data quality inconsistencies; scope creep.
- **User impact:** true “playground” differentiation appears.

### Phase 4: Polish, proof, trust, portfolio packaging
- **Goals:** module maturity badges, benchmark screenshots, case-study docs, score validation appendix.
- **Files:** docs, README, portfolio docs, test coverage extensions, CI quality gates.
- **Difficulty:** Medium.
- **Dependencies:** Phases 0–3.
- **Risks:** polishing before data quality is genuinely improved.
- **User impact:** compelling portfolio narrative with evidence.

---

## 10. Portfolio Value Assessment

### Data analyst roles
Strongly improved if airport/seasonality modules and explicit metric definitions are added.

### Product/data roles
Improved significantly due to modular roadmap, trust UX, and decision-support framing.

### Frontend/full-stack roles
Improved via richer IA, interactive map work, API contract evolution, and mode handling.

### Travel/aviation analytics roles
Improved the most if reliability + airport + airline modules become operational.

### General portfolio differentiation
Moves from “solid project” to “memorable domain platform” when aviation enthusiast angle is implemented with evidence-based UX.

---

## 11. Risks and Anti-Goals

### Main risks
1. Over-expanding into too many modules before data contracts stabilize.
2. Repeating overclaim patterns in docs/marketing copy.
3. Building visually impressive but data-thin modules without provenance cues.
4. Letting mock mode and backend mode diverge.
5. Delaying simple trust fixes while chasing advanced features.

### Anti-goals
- Becoming a generic flight-booking clone.
- Introducing ML/forecasting claims without calibration and backtesting evidence.
- Full rewrite that discards current architecture assets.

---

## 12. Final Verdict

### Is pivot strategically worth doing?
**Yes.** The existing codebase is strong enough to support this pivot incrementally, and the aviation enthusiast positioning increases uniqueness while preserving the credible route-intelligence core.

### Best framing sentence
“An aviation enthusiast playground built on transparent route-price intelligence, reliability analytics, and explorable network insights.”

### Top 5 things to avoid
1. Shipping new modules without clear data provenance.
2. Keeping contradictory production-ready claims.
3. Leaving partial mock coverage that breaks key journeys.
4. Adding auth/personalization too early.
5. Treating `/test-ui` as user-facing product.

### Most likely impressive-fast MVP
A 3-module release: **Price Intelligence (upgraded) + Airport Intelligence (new) + Route Network Map (new)** with explicit demo/live mode badges and trustworthy caveat surfaces.

---

## 13. Top 10 Next Actions
1. Rewrite README truth surfaces and remove contradictory production claims.
2. Define and document runtime modes (mock, CSV fallback, Postgres).
3. Add missing Next.js mock endpoints for route detail + airport context for full demo parity.
4. Normalize score confidence type across pipeline/backend/frontend.
5. Hide or dev-gate `/test-ui` from production-facing UX.
6. Add module navigation and rebrand homepage to “aviation playground” framing.
7. Implement airport intelligence API enhancements using existing marts/raw contracts.
8. Add seasonal route patterns mart and corresponding UI.
9. Introduce route network visualization page (can start with static geo + current route keys).
10. Add CI checks that validate workflow scripts are executable with documented defaults (including data-refresh command correctness).
