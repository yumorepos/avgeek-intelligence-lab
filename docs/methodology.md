# Methodology

## Methodology intent
This project provides **decision-support signals** for route exploration, not guaranteed forecasts.

The methodology is intentionally simple, transparent, and inspectable so users can understand what the score means and where it can fail.

## What the route score means

`route_attractiveness_score` is a 0–100 heuristic score answering:

> "Based on available historical data, how attractive does this route look right now from a fare + reliability perspective?"

Higher is generally better, but interpretation depends on confidence and data coverage.

### Inputs used
- Relative fare attractiveness
- Reliability behavior (on-time and cancellations)
- Fare stability (volatility)

### Aggregation style
- Weighted blend (price, reliability, stability)
- Missing components are reweighted
- Confidence shrinkage pulls uncertain routes toward neutral behavior

## What the deal signal means

`deal_signal` is a categorical label comparing latest observed fare to the route's own historical baseline:
- `strong_deal`
- `deal`
- `neutral`
- `expensive`

It is **route-relative**, not global. A route labeled `deal` can still be expensive in absolute dollar terms versus another route.

## Confidence and sparse-data behavior

When evidence is weak (few fare months or low flight observations), the methodology intentionally avoids fake precision:
- route score moves toward neutral
- volatility may be missing
- deal labels become conservative

This behavior is a design choice to preserve trust.

## Data provenance and fallback honesty

Every core response includes metadata:
- `data_source`
- `is_fallback`
- `data_complete`
- optional note

If fallback mode is enabled, users should assume partial coverage and treat outputs as exploratory.

## What data can claim

The product can credibly claim:
- historical route-level fare/reliability summaries within loaded data slices
- explainable score decomposition at MVP fidelity
- transparent caveats about incomplete evidence

## What data cannot claim

The product cannot credibly claim (yet):
- real-time price intelligence
- production-grade forecasting accuracy
- complete market coverage across all routes/airlines/time windows
- suitability for high-stakes operational decisions without additional validation

## Why this is still credible in MVP form

- Signals are based on real public datasets, not fabricated values
- Scoring logic is explicit and documented
- Confidence and fallback limitations are surfaced in UI/API
- The system avoids overpromising and encourages careful interpretation

## Known methodology limitations

- Heuristic thresholds/weights are not yet calibrated through formal backtesting
- Reliability depth can vary by route/month
- Missing observations are not synthetically imputed
- Some optional metrics remain placeholders until source mapping is finalized

## Near-term methodology upgrades (without redesign)

1. Add richer score-explanation payloads per route (component contribution percentages)
2. Add minimum-data badges for each route card/detail view
3. Tune thresholds/weights using retrospective evaluation
4. Add documented confidence taxonomy (low/medium/high definitions)

## Competitiveness intelligence (v0)

The repository now includes an early competitiveness layer:
- `schedule_snapshots` (frequency proxy)
- `route_change_events` (launch/cut/resume/frequency-change detection)
- `airport_role_metrics` (role and peer comparison proxies)

These are **directional MVP metrics**, not final network-strategy truth. Interpret with loaded-coverage caveats.

### Carrier competition model (v0_competition)

Route-level metrics:
- `active_carriers`: carriers with non-zero observed scheduled flights in route-month.
- `dominant_carrier_share`: largest carrier flight share in route-month.
- `carrier_concentration_hhi`: `sum((share_pct)^2)` concentration proxy.
- `entrant_pressure_signal`: compares active-carrier set with prior observed period (`pressure_up`, `pressure_down`, `rotation`, `stable`).
- `competition_label`: `monopoly`, `concentrated`, `contested`, `fragmented`.

Airport-level metrics:
- `active_carriers` across outbound schedule footprint.
- `dominant_carrier_share` and airport-level concentration proxy.
- `contested_route_share` from route competition labels.
- `competition_label`: `single_carrier_dominant`, `highly_concentrated`, `competitive_but_concentrated`, `broadly_competitive`.

Confidence and coverage:
- Confidence is higher with larger observed flight volume.
- Low-volume slices and missing months degrade confidence and interpretability.
- Competition metrics are constrained by loaded schedule slices; they are not full-market census outputs.

## Insight layer (v0_competition_insights)

Insight rules are deterministic and suppress low-confidence outputs:
- `competition increasing`: HHI decreases materially and entrant pressure rises.
- `market consolidation`: HHI increases materially with carrier exits.
- `new entrant pressure`: entrants appear with upward pressure signal.
- `unstable competition`: elevated entrant/exit churn.
- `stable dominance`: dominant share remains above threshold.

Each insight includes:
- human-readable explanation,
- supporting metric snapshot,
- confidence based on flights observed + multi-period consistency.

Calibration decisions (current):
- HHI delta trigger is data-aware: 75th percentile of observed absolute route HHI deltas, clamped to `[150, 350]`.
- Dominance thresholds remain fixed (`0.60` route, `0.50` airport) pending broader historical calibration.
- Churn triggers remain fixed (`2` route, `8` airport aggregate) pending larger benchmark windows.
