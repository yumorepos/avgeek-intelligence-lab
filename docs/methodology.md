# Methodology (MVP Data Pipeline Phase)

## Product intent
Provide route-level flight intelligence from public, explainable datasets without pretending real-time API coverage.

## Approved MVP sources
1. BTS On-Time Performance
2. BTS DB1B
3. FAA airport enplanement data

OpenSky is intentionally excluded from MVP implementation.

## Pipeline methodology

### Step A: Source ingestion (raw)
- Read local source extracts in CSV form.
- Apply minimal canonical field naming and type normalization.
- Preserve source semantics and avoid heavy transformation at this stage.

### Step B: Standardization (staging)
- Normalize route key format (`ORIGIN-DEST`).
- Validate year/month fields.
- Keep one normalized record per source observation for traceability.

### Step C: Analytical aggregation (marts)
- Build mart tables at the same grain as schema v1:
  - `monthly_fares`: route + year + month
  - `ontime_stats`: route + airline + year + month
  - `cancellations`: route + airline + year + month
  - `route_scores`: route + year + month
- Keep transformations transparent and inspectable.

### Step D: Database load
- Upsert dimensions first (`airports`, `airlines`, `routes`).
- Upsert facts second (`monthly_fares`, `ontime_stats`, `cancellations`, `airport_enplanements`, `route_scores`).
- Support dry-run validation before write execution.

## Data contracts and conventions
- `airport_iata`, `origin_iata`, `destination_iata`: uppercase 3-letter IATA codes
- `carrier_code`: uppercase 2–3 alphanumeric carrier code
- `year`: four-digit integer; `month`: integer 1–12
- `route_key`: `ORIGIN-DEST` used in file-based layers

## Data quality rules (MVP)
Rows are skipped (with warnings) when they break essential contract rules:
- missing/invalid airport codes
- missing carrier code for on-time dataset
- invalid year/month
- missing or malformed fare records
- malformed route keys (including same-origin/destination)

Rows with sparse optional fields are retained when possible and flagged:
- missing `ARR_DEL15`
- missing `CANCELLED`

## Route scoring methodology (first-pass heuristic, implemented)

### Scope and grain
- Output table: `data/marts/route_scores.csv`
- Grain: **one row per route + year + month**
- Version label: `score_version = v1_heuristic`

### Core principle
The score answers: **"Is this route historically attractive based on price, stability, and reliability?"**

This is an MVP heuristic layer (not ML, not a final production model).

### 1) `cheapest_month`
- For each route, group all available monthly fare observations by calendar month (1–12).
- Compute each month’s historical average fare for that route.
- `cheapest_month` is the month with the lowest historical average fare.
- Tie-breakers:
  1. lower average fare
  2. higher number of observations
  3. lower month number for deterministic output

### 2) `fare_volatility`
- Per route, compute historical fare volatility from monthly average fares.
- Formula (requires at least 3 fare observations):
  - `fare_volatility = (population_std_dev(fare) / mean(fare)) * 100`
- Interpretation:
  - Lower = more stable pricing history
  - Higher = less predictable pricing

If fewer than 3 fare observations exist, this field is left blank (insufficient history).

### 3) `reliability_score`
- Aggregate on-time and cancellation counts to route-month across airlines.
- Build a raw reliability metric:
  - `raw_reliability = clamp((ontime_rate - cancellation_rate) * 100, 0, 100)`
- Apply confidence shrinkage when flight counts are thin:
  - `flight_confidence = min(flights_total / 50, 1)`
  - `reliability_score = 50 + (raw_reliability - 50) * flight_confidence`

Meaning:
- 50 is neutral baseline when evidence is weak.
- As observations grow, score moves closer to measured performance.

If no flights are observed for the route-month, this field is blank.

### 4) `deal_signal`
`deal_signal` is a simple route-relative price label using current month fare vs route median fare.

- `price_index = current_month_fare / route_historical_median_fare`
- Labels (requires at least 4 fare observations):
  - `strong_deal` (`price_index <= 0.85`) → human label: **Great deal**
  - `deal` (`<= 0.97`) → **Fair price**
  - `neutral` (`<= 1.10`) → **Typical price**
  - `expensive` (`> 1.10`) → **Above typical**

When history is too sparse or fare is missing:
- `deal_signal` defaults to `neutral`
- `deal_signal_label` explains why (`Insufficient fare history` or `No fare data`)

### 5) `route_attractiveness_score`
Weighted heuristic blend of three components:
- price attractiveness (45%)
- reliability (35%)
- fare stability/volatility (20%)

Component formulas:
- `price_score`: linear mapping where 0.8x baseline fare = 100, 1.2x+ = 0
- `reliability_score`: from section above
- `stability_score`: linear mapping where 0% volatility = 100, 40%+ volatility = 0

Then:
1. Skip missing components and renormalize remaining weights.
2. Compute weighted base score.
3. Apply confidence shrinkage toward neutral:
   - uses available fare history depth and flight count evidence
4. Final output bounded conceptually to 0–100 and centered on 50 when evidence is weak.

### Confidence + transparency fields
- `score_confidence`: `low`, `medium`, `high`
- `history_months_available`: count of fare observations for the route
- `flights_observed`: route-month flight evidence used in reliability logic

## Sparse data handling and caveats
- **Sparse fare history:** volatility may be blank; deal labels become conservative.
- **Sparse operational history:** reliability and final attractiveness shrink toward neutral.
- **Missing months:** no synthetic interpolation is performed in MVP.
- **No ML and no fake precision:** formulas are deterministic and intentionally simple.

## Implemented now vs planned

### Implemented now
- Batch foundation for raw ingestion, staging normalization, marts builds, and DB loading.
- First-pass transparent route scoring heuristics in `build_route_scores.py`.
- Score versioning and confidence metadata in route score mart output.

### Still placeholder or partial
- `avg_arrival_delay_minutes` remains blank in `ontime_stats` until source mapping is finalized.
- Thresholds/weights are heuristic defaults and expected to be tuned with user feedback.

### Not implemented yet
- Production calibration/monitoring framework for score drift.
- API/UI explanation cards consuming all score metadata end-to-end.
- Real-time or near-real-time source refresh orchestration.
