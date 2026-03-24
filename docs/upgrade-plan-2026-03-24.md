# Upgrade Plan (Executed on 2026-03-24)

## Objective
Upgrade repository into a truth-first avgeek intelligence product while fixing deployment reliability and cleaning repository drift.

## Plan

### Phase 1 — Audit and root-cause confirmation
- Inspect canonical app paths (`frontend/app`) and deployment config state.
- Validate deployment entry points and identify conflicting root/frontend install/build surfaces.
- Identify misleading copy, demo-vs-real ambiguity, and dead routes/files.

### Phase 2 — Product truth upgrades
- Reposition UI from "playground" to "Avgeek Intelligence Lab".
- Add explicit module-status coverage summary on homepage.
- Preserve and amplify trust language (directional insights, no forecasting guarantees).
- Add a dedicated data-status page with runtime mode and limitations.

### Phase 3 — Deployment reliability fix
- Remove conflicting root deployment artifacts (`vercel.json`, root npm manifests, redundant deploy workflow).
- Keep Vercel deployment model simple: `frontend/` as the only app build root.
- Avoid custom overrides unless a verified blocker requires them.

### Phase 4 — Verification
- Run available checks in constrained environment.
- Attempt frontend install/build verification and document exact blockers.
- Attempt live URL checks and document external limitations without overclaiming.

### Phase 5 — Cleanup
- Remove archive/duplicate/dead files only after confirming they are non-runtime and stale.
- Remove stale screenshot assets and obsolete scripts tied to deleted routes/old domains.
- Update contribution/deployment docs to remove contradictory historical guidance.

## Deferred / Not Yet Proven
- Live public deployment rendering is not proven from this environment due network/tunnel restrictions.
- Full frontend build/test is not proven in this environment when npm registry/proxy restrictions prevent dependency installation.
