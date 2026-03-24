# Deployment Reset Forensic Audit — 2026-03-24

## Verified repository structure

- Root contained `package.json`, `package-lock.json`, and `vercel.json` in addition to `frontend/`.
- `frontend/` contains the Next.js application and lockfile.
- `.github/workflows` contained `deploy.yml`, `tests.yml`, and `data-refresh.yml`.

## Verified deployment conflicts and root causes

1. **Conflicting deployment entry points were present**
   - Root-level `package.json` defined a workspace and delegated scripts into `frontend`, while `frontend/package.json` also defined a full Next.js app.
   - Root-level `vercel.json` forced `@vercel/next` builds from `frontend/package.json`, which can conflict with Vercel's standard Next.js auto-detection and project Root Directory settings.

2. **`npm ci` failure root cause in CI (from provided failing log + repo state)**
   - The failure signature (`Missing: <pkg> from lock file`) is consistent with running `npm ci` against a `package.json` / lockfile pair that are out of sync.
   - With both root and frontend npm manifests present, any CI step executed from the wrong directory (root instead of `frontend`) can reproduce this mismatch pattern.

3. **Vercel deployment failure root cause**
   - Deployment complexity existed in multiple places at once: Vercel config (`vercel.json`), repo-level manifests, and a separate GitHub deploy workflow.
   - This increases risk of inconsistent build roots and install contexts between GitHub Actions and Vercel.

## Hard cleanup completed

- Deleted root `vercel.json`.
- Deleted root `package.json`.
- Deleted root `package-lock.json`.
- Deleted redundant GitHub deploy workflow `.github/workflows/deploy.yml`.
- Converted Next config from `frontend/next.config.mjs` to `frontend/next.config.js` so `frontend` now has an explicit `next.config.js` file.

## Single source of truth status

- `frontend/package.json` exists.
- `frontend/package-lock.json` exists.
- `frontend/next.config.js` exists.
- Build script in `frontend/package.json` remains `next build`.

## Verification attempts and environment limits

- `npm run build` in `frontend` currently fails before install because dependencies are not installed (`next: not found`).
- `npm ci` could not be completed in this execution environment due npm registry access/policy limits (403/hanging network behavior).
- `vercel` CLI is not installed in this environment (`vercel: command not found`), so live deployment could not be executed from this container.

