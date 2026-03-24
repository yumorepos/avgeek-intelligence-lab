# Roadmap (Truth-first)

## Current reality snapshot (2026-03-24)

### Proven now
- Backend supports core route/airport intelligence endpoints.
- Backend now supports flagship wedge endpoints:
  - `/intelligence/routes/changes`
  - `/intelligence/airports/{iata}/role`
  - `/intelligence/airports/{iata}/peers`
- Backend now supports competition endpoints:
  - `/intelligence/routes/competition`
  - `/intelligence/airports/{iata}/competition`
- SQL/data-model foundation now includes schedule snapshots, route change events, airport role metrics, route competition metrics, and airport competition metrics.

### Partial now
- Data depth still depends on loaded local slices.
- Flagship wedge metrics are directional MVP proxies, not forecasting-grade analytics.

### Demo-only now
- Airline Intelligence page (frontend mock API)
- Route Network page (frontend mock API)
- Seasonality page (frontend mock API)

---

## Next steps

1. Increase route-change and competition calibration against larger schedule history.
2. Add coverage metrics endpoint enrichment (loaded periods by dataset and airport).
3. Add backend parity for airline/network/seasonality or keep them explicitly demo-only.
4. Add route-level competitor-overlap trend module (carrier-by-carrier shifts).
5. Add changelog feed artifact for weekly intelligence summaries.
