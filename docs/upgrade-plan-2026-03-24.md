# Upgrade Plan (Executed on 2026-03-24)

## Objective
Upgrade repository into a truth-first avgeek intelligence product while fixing deployment reliability and cleaning repository drift.

## Plan

### Phase 1 — Audit and root-cause confirmation
- Inspect canonical app paths (`frontend/app`) and deployment config state.
- Validate whether root-level Vercel settings existed for frontend subdirectory deployment.
- Identify misleading copy, demo-vs-real ambiguity, and dead routes/files.

### Phase 2 — Product truth upgrades
- Reposition UI from "playground" to "Avgeek Intelligence Lab".
- Add explicit module-status coverage summary on homepage.
- Preserve and amplify trust language (directional insights, no forecasting guarantees).
- Add a dedicated data-status page with runtime mode and limitations.

### Phase 3 — Deployment reliability fix
- Add `vercel.json` at repo root to install/build from `frontend` and output `frontend/.next`.
- Keep config minimal and deterministic.

### Phase 4 — Verification
- Run available checks in constrained environment.
- Attempt live URL checks via HTTP probes.
- Attempt screenshot capture; document blockers if browser runtime unavailable.

### Phase 5 — Cleanup
- Remove archive/duplicate/dead files only after confirming they are non-runtime and stale.
- Remove stale screenshot assets and obsolete scripts tied to deleted routes/old domains.
- Update contribution docs to remove links to deleted artifacts.

## Deferred / Not Yet Proven
- Live public deployment rendering is not proven from this environment due network/tunnel restrictions.
- Full frontend build/test is not proven in this environment due npm registry access restrictions.
