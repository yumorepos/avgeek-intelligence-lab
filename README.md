# ✈️ Aviation Playground Lab (formerly Flight Price Intelligence Lab)

> A modular aviation enthusiast playground with a strong **flight price intelligence** core.

## Current Reality (Truth-First)

This repository supports three runtime modes:

1. **Mock demo mode (default frontend `/api`)**
   - Fast local demo with deterministic mock data.
   - Now includes parity for airport search, route explore, route detail, airport context, and methodology.
2. **Backend CSV fallback mode** (`FPI_USE_CSV_FALLBACK=true`)
   - FastAPI serves local marts CSV data with explicit coverage caveats.
3. **Backend API mode** (`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`)
   - Frontend uses FastAPI endpoints.

If you want Next.js to proxy `/api/*` to backend, set `USE_BACKEND_PROXY=true` and `BACKEND_URL=http://127.0.0.1:8000`.

This project is **MVP+ portfolio-grade**, not production-hardened.

---

## Product Modules

- **Price Intelligence** (flagship): route scoring, deal signal, fare/reliability context
- **Airport Intelligence**: airport context and outbound route cues
- **Airline Intelligence**: carrier footprint + route score/reliability overview
- **Route Network**: geospatial route visualization from current route data
- **Seasonality**: monthly fare pattern interpretation surface
- **Learn**: methodology, caveats, and source coverage notes

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Lucide
- **Backend:** FastAPI, Pydantic
- **Data/ETL:** Python scripts (BTS/FAA normalization + marts)
- **Storage model:** PostgreSQL schema v1 + CSV fallback
- **CI:** GitHub Actions (backend tests/lint, frontend lint/build, Trivy scan)

---

## Quick Start

### A) Frontend demo mode (fastest)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

### B) Full stack
```bash
# Terminal 1
cd backend
pip install -r requirements.txt
FPI_USE_CSV_FALLBACK=true uvicorn app.main:app --reload

# Terminal 2
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

---

## Data Pipeline Notes

The pipeline scripts are local-file oriented and require explicit input files for ingestion scripts.
See:
- `scripts/ingest_bts_db1b.py`
- `scripts/ingest_bts_ontime.py`
- `scripts/ingest_faa_enplanements.py`

The marts and schema are still highly reusable for expanded aviation modules.

---



## Data Refresh Workflow Inputs

The scheduled `data-refresh.yml` workflow expects these repository/environment variables to point to readable source files:
- `BTS_DB1B_INPUT`
- `BTS_ONTIME_INPUT`
- `FAA_ENPLANEMENTS_INPUT`

The workflow validates these paths before ingestion and then passes them explicitly to ingest scripts.

## Honest Limitations

- No real-time flight or price ingestion in this repo.
- Postgres repository path is scaffolded but fallback-first in current environment.
- Data quality/coverage depends on loaded local slices.
- Advanced modules (airline/fleet/reliability deep-dive) are staged roadmap items.

---

## Roadmap Summary

1. Truth/claim alignment ✅
2. IA modular repositioning ✅
3. Demo parity across core endpoints ✅
4. New enthusiast modules (airport/network/seasonality/learn) ✅ baseline
5. Ongoing hardening and data depth ⏳

---

## License

MIT
