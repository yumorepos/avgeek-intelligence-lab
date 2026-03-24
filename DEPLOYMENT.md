# Deployment Guide (Truth-Clean, 2026-03-24)

This repository deploys the **Next.js frontend from `frontend/`**.

It intentionally does **not** use a root `vercel.json`, root `package.json`, or root `package-lock.json`.

---

## 1) Frontend on Vercel (authoritative path)

### Required Vercel project settings

- **Framework Preset:** `Next.js`
- **Root Directory:** `frontend`
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (default Next.js output)

### Node version

- This repo's GitHub workflow tests frontend on Node 18.
- On Vercel, use the default supported Node runtime for Next.js 14 (or set Node 18/20 explicitly in project settings if your org requires pinning).

### Environment variables

#### Minimum (frontend-only demo mode)
- **None required**.
- In this mode, the frontend uses internal Next routes and demo data for demo-only modules.

#### Optional (backend-connected mode)
- `NEXT_PUBLIC_API_BASE_URL` → public backend base URL (for browser/client fetches).
- `BACKEND_URL` → backend base URL used by Next route handlers and optional proxy rewrites.
- `USE_BACKEND_PROXY=true` → enables rewrite proxy from `/api/:path*` to `BACKEND_URL`.

---

## 2) What works in each mode

### Frontend-only demo mode (no backend env vars)
- Main UI pages render.
- Demo-backed modules (airlines/network/seasonality) work from local demo routes/data.
- Backend-only intelligence endpoints return explicit 503 guidance when `BACKEND_URL` is unset.

### Backend-connected mode
- Set `NEXT_PUBLIC_API_BASE_URL` to backend origin for browser API calls.
- Optionally set `BACKEND_URL` + `USE_BACKEND_PROXY=true` to use Next proxy rewrites.

---

## 3) Verification scope and limits

From this container/runtime, external deployment proof is limited by environment constraints:
- npm registry/proxy behavior can block installs (`403 Forbidden` observed in this environment).
- `vercel` CLI may be unavailable in this container.

Therefore, this guide documents exact project settings but does not overclaim live deployment success from this runtime.

---

## 4) Do not reintroduce

- Root `vercel.json` overrides.
- Root npm workspace manifests for frontend deployment.
- Duplicate deployment workflows that conflict with Vercel project Root Directory.
