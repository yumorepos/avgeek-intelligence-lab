# Truth-First Assessment (2026-03-24)

## Current Product Verdict
- The canonical product is the Next.js app in `frontend/app`, with strongest depth in route, airport-role, and competition intelligence pages.
- Product trust exists but was diluted by "playground" positioning and unclear status labeling for demo vs backend-backed modules.
- Several modules (`/airlines`, `/network`, `/seasonality`) remain demo-only and must stay labeled as such.

## Deployment Verdict
- Public URL reachability could not be directly validated from this environment at the time of assessment (environment tunnel/proxy limits were observed).
- The repository now uses a frontend-only deployment model: Vercel should target `frontend/` with no root `vercel.json` override.

## Architecture Verdict
- Canonical frontend is `frontend/` (Next.js 14).
- Canonical backend is `backend/` (FastAPI).
- Data mart scripts are under `scripts/`; SQL schema is under `sql/schema.sql`.
- Root contained multiple historical phase-report documents and duplicate/stale artifacts that did not contribute to runtime behavior.

## Data / Trust Verdict
- Trust surfaces are present (`MetadataNotice`, methodology pages) but needed stronger front-door framing and explicit data-status landing.
- Demo-only modules are valid but must be explicitly separated from backend intelligence to prevent misleading claims.

## Cleanup Candidates (Validated)
Safe removals identified as non-runtime, stale, or duplicate reporting artifacts:
- `README_NEW.md` (duplicate readme variant)
- `README_BADGES.md`, `SCREENSHOT_GUIDE.md` (auxiliary stale docs)
- `PHASE2_COMPLETE.md`, `PHASE2_SPRINT1_COMPLETE.md`, `PHASE2_SPRINT2_COMPLETE.md`, `PHASE2_SPRINT3_COMPLETE.md`, `SPRINT1_VERIFICATION_COMPLETE.md`, `VERIFICATION_REPORT.md`, `DEPLOYMENT_FIX.md`, `NEXT_STEPS.md` (historical progress logs)
- `frontend/app/test-ui/page.tsx` (non-product dev showcase route)
- `scripts/take-screenshots.js`, `scripts/capture-new-screenshots.js` (stale scripts tied to old URLs/routes)
- stale `docs/images/*.png` tied to removed `/test-ui` and old deployments

## Highest-Leverage Actions Executed
1. Consolidated deployment guidance around frontend-only Vercel root directory (`frontend`) and removal of conflicting root deployment surfaces.
2. Reframed homepage and navigation around "Avgeek Intelligence Lab" with explicit trust and module-status messaging.
3. Added `/about` data-status page to centralize runtime-mode and limitations disclosure.
4. Removed stale/archive/dead files proven non-runtime and outdated.
