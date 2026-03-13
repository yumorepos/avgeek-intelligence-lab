# Architecture

## System purpose
Flight Price Intelligence Lab is an analytics product MVP that converts public aviation data into route-level insights for exploration and discussion.

It is a **portfolio-strength architecture**, not a production-grade platform yet.

## High-level architecture

```text
Public source extracts (CSV)
        ↓
  data/raw/ ingestion
        ↓
 data/staging/ normalization
        ↓
   data/marts/ aggregates + scoring
        ↓
PostgreSQL schema v1 (or CSV fallback for demos)
        ↓
 FastAPI analytics API
        ↓
 Next.js route intelligence frontend
```

## Components

### Frontend (`frontend/`)
- Next.js + TypeScript UI
- Route Explorer (ranked cards by origin)
- Route Detail (score breakdown + trend charts + airport context)
- Explicit provenance/coverage messaging for trust

### Backend (`backend/`)
- FastAPI service exposing read endpoints:
  - `GET /health`
  - `GET /airports/search?q=`
  - `GET /routes/explore?origin=`
  - `GET /routes/{origin}/{destination}`
  - `GET /airports/{iata}/context`
  - `GET /meta/methodology`
- Typed schemas for stable response contracts
- Metadata contract includes fallback/completeness indicators

### Data pipeline (`scripts/` + `data/`)
- **Raw layer:** source-aligned extracts
- **Staging layer:** contract normalization (route keys, time fields)
- **Marts layer:** product-serving aggregates (`monthly_fares`, `ontime_stats`, `cancellations`, `route_scores`)
- **Load layer:** Postgres upsert flow (`scripts/load_postgres.py`)

### Storage (`sql/`)
- PostgreSQL schema v1 focused on route intelligence use cases
- Dimension + fact structure sufficient for MVP route explorer and route detail experiences

## Runtime modes

### Preferred mode: Postgres-backed
- API reads from relational marts loaded into Postgres
- Most credible local demo when data is loaded correctly

### Demo mode: CSV fallback
- Enabled with `FPI_USE_CSV_FALLBACK=true`
- Useful for local demos when DB is unavailable
- Coverage may be partial (airport metadata/reliability may be thin)

## Design decisions

1. **Explainability over complexity**
   - Deterministic scoring and explicit caveats chosen over opaque model complexity.
2. **Contract-driven API**
   - Frontend consumes typed contracts, reducing presentation drift.
3. **Trust-first product semantics**
   - Provenance and fallback status treated as first-class UX data.
4. **Scoped MVP boundaries**
   - No orchestration/auth/infra expansion until core product signal quality is hardened.

## Current strengths
- End-to-end flow exists from data transformation to UI presentation.
- Architectural separation is clear and maintainable.
- Portfolio narrative aligns with actual implementation.

## Current limitations
- No orchestration/scheduling, retries, or observability stack.
- No production security, auth, or rate-limiting controls.
- Data freshness and slice breadth depend on manual pipeline execution.
- Scoring is heuristic and not yet calibrated for production decisioning.

## What must happen before production-ready claims
- Automated ingestion/orchestration with monitoring and alerting
- Robust data QA and freshness SLAs
- Score calibration and validation framework
- Security/auth + deployment hardening + operational runbooks
