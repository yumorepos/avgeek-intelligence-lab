# ✈️ Avgeek Intelligence Lab

> Truth-first aviation intelligence project focused on **Airport / Route Competitiveness Intelligence**.

## Current Reality (verified 2026-03-24)

This repo currently supports three runtime modes:

1. **Frontend mock mode (`/api`)**
   - Default when running only `frontend`.
   - Some legacy modules are still mock/demo-only.
2. **Backend CSV fallback mode** (`FPI_USE_CSV_FALLBACK=true`)
   - FastAPI reads local marts CSV files.
3. **Backend PostgreSQL mode** (`FPI_DATABASE_URL` or `DATABASE_URL`)
   - FastAPI reads relational marts.

This project is **not production-hardened** and should be treated as an enthusiast intelligence MVP.

---

## Reality Matrix (truth surface)

| Module | Runtime mode | Data source | Truth status |
|---|---|---|---|
| Price Intelligence (`/`, `/routes/*`) | Backend + frontend parity | Backend marts / demo fallback | **Partial, real backend exists** |
| Airport Intelligence (`/airports`) | Backend + frontend parity | Backend marts / demo fallback | **Partial, real backend exists** |
| **Route Changes Intel** (`/intelligence/route-changes`) | **Backend-first** | `route_change_events` mart | **Real backend-supported wedge** |
| **Airport Role Intel** (`/intelligence/airports`) | **Backend-first** | `airport_role_metrics` mart | **Real backend-supported wedge** |
| **Competition Intel** (`/intelligence/competition`) | **Backend-first** | `route_competition_metrics`, `airport_competition_metrics` | **Real backend-supported wedge** |
| Airline Intelligence (`/airlines`) | Frontend mock APIs | `frontend/lib/demo-data.ts` | **Demo-only** |
| Route Network (`/network`) | Frontend mock APIs | `frontend/lib/demo-data.ts` | **Demo-only** |
| Seasonality (`/seasonality`) | Frontend mock APIs | `frontend/lib/demo-data.ts` | **Demo-only** |
| Learn (`/learn`) | Frontend static/methodology endpoint | static + metadata | **Partial documentation surface** |

---

## Flagship Wedge (implemented)

### Airport / Route Competitiveness Intelligence
- Route launch/cut/resume/frequency-change intelligence endpoint:
- `GET /intelligence/routes/changes`
- Airport role metrics endpoint:
  - `GET /intelligence/airports/{iata}/role`
- Airport peer comparison endpoint:
  - `GET /intelligence/airports/{iata}/peers`
- Route competition endpoint:
  - `GET /intelligence/routes/competition`
- Airport competition endpoint:
  - `GET /intelligence/airports/{iata}/competition`
- Route insight endpoint:
  - `GET /intelligence/routes/insights`
- Airport insight endpoint:
  - `GET /intelligence/airports/{iata}/insights`
- Insight quality endpoint:
  - `GET /meta/insight-quality`

Data-model foundation now includes:
- `schedule_snapshots`
- `route_change_events`
- `airport_role_metrics`
- `route_competition_metrics`
- `airport_competition_metrics`

---

## Important limitations

- No real-time aviation feed in this repo.
- Frequency and role metrics are MVP directional signals based on loaded slices.
- If required marts are missing, backend responses may be sparse/empty.
- Demo-only modules are explicitly labeled in UI and should not be interpreted as live intelligence.

---

## Quick Start

### A) Backend + frontend (recommended for flagship wedge)
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

### B) Frontend-only demo mode
```bash
cd frontend
npm install
npm run dev
```

---

## Data Pipeline

Core ingestion/build scripts:
- `scripts/ingest_bts_db1b.py`
- `scripts/ingest_bts_ontime.py`
- `scripts/ingest_faa_enplanements.py`
- `scripts/build_monthly_fares.py`
- `scripts/build_ontime_stats.py`
- `scripts/build_schedule_snapshots.py`
- `scripts/build_route_change_events.py`
- `scripts/build_airport_role_metrics.py`
- `scripts/build_route_scores.py`
- `scripts/build_route_competition_metrics.py`
- `scripts/build_airport_competition_metrics.py`

---

## Next wedge expansions

After hardening current flagship wedge:
1. Carrier competition intelligence
2. Reliability disruption monitor
3. Alliance/fleet intelligence (later)

## License

MIT
