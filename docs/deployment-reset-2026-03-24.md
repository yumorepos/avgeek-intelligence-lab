# Deployment Reset Forensic Audit — 2026-03-24

## Scope of this document

This record is limited to facts verified from repository state and command output in this execution environment. It separates:

- **Repo-level issues** (in-repo deployment complexity that was cleaned up).
- **Environment-level constraints** (container/runtime limits while verifying).
- **Still-unproven items** (things that require external Vercel execution proof).

## A) Verified repo-level deployment complexity that was cleaned up

### Verified pre-cleanup complexity

- The repo previously had multiple deployment/install surfaces in parallel: root `package.json`, root `package-lock.json`, root `vercel.json`, plus `frontend/package.json` and `frontend/package-lock.json`.
- `.github/workflows/deploy.yml` existed alongside Vercel deployment paths.

### Cleanup applied (and now verified absent/present)

- Deleted root `vercel.json`.
- Deleted root `package.json`.
- Deleted root `package-lock.json`.
- Deleted `.github/workflows/deploy.yml`.
- Converted Next config from `frontend/next.config.mjs` to `frontend/next.config.js`.

Current-state checks confirm:

- root `vercel.json`: absent
- root `package.json`: absent
- root `package-lock.json`: absent
- `.github/workflows/deploy.yml`: absent
- `frontend/package.json`: present
- `frontend/package-lock.json`: present
- `frontend/next.config.js`: present

## B) Verified environment/runtime limitations during local proof

### npm and network/proxy behavior (observed)

- `npm ci` in `frontend/` emits `npm warn Unknown env config "http-proxy"`.
- npm config shows `http-proxy`/`https-proxy` values set via env to `http://proxy:8080`.
- `npm ci --verbose` hits `403 Forbidden` against npm registry endpoints, including advisory API and package tarballs.
- Due failed install, `npm run build` fails with `next: not found` in this container.

### Deployment tooling in this container

- `vercel` CLI was previously observed as missing (`vercel: command not found`) in this execution environment.

## C) Still unproven from this environment

- A full dependency install + successful `next build` in-container (blocked by npm registry/proxy 403 behavior).
- A live Vercel deployment run from this container.
- End-to-end public URL rendering proof from this container.

## Notes on prior root-cause wording

This document does **not** claim a current `package.json`/lockfile mismatch in `frontend` because that mismatch has not been reproduced from current repo state. The observed `npm ci` blocker in this pass is network/proxy-related 403 behavior in the execution environment.
