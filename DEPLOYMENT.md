# Deployment Guide (Authoritative)

This repository runs as a split deployment:

1. **Frontend**: Next.js app on Vercel from `frontend/`
2. **Backend**: FastAPI service on Render (or any Python web host) from `backend/`

---

## 1) Backend deployment (Render recommended)

### Service settings
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

A `render.yaml` blueprint is included at repo root and points to the same commands.

### Backend environment variables
- `FPI_DATABASE_URL` (optional, PostgreSQL URL)
- `FPI_USE_CSV_FALLBACK=true` for CSV mode when DB is unavailable
- `FPI_CORS_ORIGINS` as comma-separated list, for example:
  - `https://<your-vercel-domain>,http://localhost:3000`

### Backend readiness
- `GET /health` → service + runtime mode
- `GET /health/readiness` → returns 503 if no DB and no CSV fallback, or if CSV fallback is enabled but marts are empty

---

## 2) Frontend deployment (Vercel)

### Vercel project settings
- Framework preset: `Next.js`
- Root Directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`

### Required frontend env vars for backend-connected mode
- `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-host>`
- `BACKEND_URL=https://<your-backend-host>`
- `USE_BACKEND_PROXY=true`

Notes:
- `NEXT_PUBLIC_API_BASE_URL` is used by browser-side requests.
- `BACKEND_URL` + `USE_BACKEND_PROXY=true` enables Next route-handler proxying for `/api/*` backend endpoints.

---

## 3) Post-deploy verification checklist

1. Backend smoke test
   - `GET https://<backend>/health`
   - `GET https://<backend>/health/readiness`
   - `GET https://<backend>/intelligence/routes/insights?airport_iata=JFK&limit=5`

2. Frontend smoke test
   - Open homepage and `/intelligence/competition`
   - Confirm `/api/intelligence/routes/insights?...` no longer returns `503 Backend-only endpoint`

3. CORS validation
   - Verify frontend can call backend APIs directly from browser console/network tab
   - Ensure deployed Vercel domain is present in `FPI_CORS_ORIGINS`

---

## 4) Do not reintroduce

- Root `vercel.json` overrides for frontend-only deployment
- Root npm workspace manifests for Vercel build path
- Conflicting deployment docs with different env names
