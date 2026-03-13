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
