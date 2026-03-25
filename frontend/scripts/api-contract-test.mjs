import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const PORT = 3101;
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxMs = 30000) {
  const started = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(`${BASE}/api/meta/methodology`);
      if (res.ok) return;
    } catch {
      // retry
    }
    if (Date.now() - started > maxMs) {
      throw new Error("Timed out waiting for Next.js dev server");
    }
    await wait(500);
  }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  assert.equal(res.status, 200, `Expected 200 for ${path}, got ${res.status}`);
  return res.json();
}

async function getStatus(path, expectedStatus) {
  const res = await fetch(`${BASE}${path}`);
  assert.equal(res.status, expectedStatus, `Expected ${expectedStatus} for ${path}, got ${res.status}`);
  return res.json();
}

function assertMetadata(meta, endpoint) {
  assert.ok(meta, `${endpoint}: missing metadata`);
  for (const key of ["data_source", "is_fallback", "data_complete", "note", "last_refreshed_at"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(meta, key), `${endpoint}: missing metadata.${key}`);
  }
}

async function run() {
  const dev = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
    shell: true,
  });

  try {
    await waitForServer();

    const airports = await get("/api/airports/search?q=JFK");
    assert.ok(Array.isArray(airports.results), "airports.search: results must be array");
    assertMetadata(airports.metadata, "airports.search");

    const explore = await get("/api/routes/explore?origin=JFK");
    assert.equal(explore.origin, "JFK");
    assert.ok(Array.isArray(explore.routes), "routes.explore: routes must be array");
    assertMetadata(explore.metadata, "routes.explore");

    const detail = await get("/api/routes/JFK/LAX");
    assert.ok(Array.isArray(detail.monthly_fare_trend), "routes.detail: monthly_fare_trend must be array");
    assertMetadata(detail.metadata, "routes.detail");

    const airportCtx = await get("/api/airports/JFK/context");
    assert.equal(airportCtx.airport.iata, "JFK");
    assert.ok(Array.isArray(airportCtx.related_routes), "airports.context: related_routes must be array");
    assertMetadata(airportCtx.metadata, "airports.context");

    const methodology = await get("/api/meta/methodology");
    assert.equal(methodology.score_version, "v1_heuristic");
    assertMetadata(methodology.metadata, "meta.methodology");

    const airlines = await get("/api/airlines/overview");
    assert.ok(Array.isArray(airlines.airlines), "airlines.overview: airlines must be array");
    assertMetadata(airlines.metadata, "airlines.overview");

    const airlineDetail = await get("/api/airlines/AA/detail");
    assert.equal(airlineDetail.carrier_code, "AA");
    assert.ok(Array.isArray(airlineDetail.routes), "airlines.detail: routes must be array");
    assert.ok(Array.isArray(airlineDetail.monthly_trend), "airlines.detail: monthly_trend must be array");
    assertMetadata(airlineDetail.metadata, "airlines.detail");

    const network = await get("/api/network/hubs");
    assert.ok(Array.isArray(network.hubs), "network.hubs: hubs must be array");
    assertMetadata(network.metadata, "network.hubs");

    const networkGeo = await get("/api/network/geo");
    assert.ok(Array.isArray(networkGeo.airports), "network.geo: airports must be array");
    assert.ok(Array.isArray(networkGeo.routes), "network.geo: routes must be array");
    assertMetadata(networkGeo.metadata, "network.geo");

    const seasonality = await get("/api/seasonality/index");
    assert.ok(Array.isArray(seasonality.rows), "seasonality.index: rows must be array");
    assertMetadata(seasonality.metadata, "seasonality.index");

    // Truth-drift guard: flagship wedge endpoints are backend-only when frontend runs standalone.
    const routeChanges = await getStatus("/api/intelligence/routes/changes?airport_iata=JFK", 503);
    assert.match(routeChanges.detail, /Backend-only endpoint/i);
    const routeCompetition = await getStatus("/api/intelligence/routes/competition?airport_iata=JFK", 503);
    assert.match(routeCompetition.detail, /Backend-only endpoint/i);
    const routeInsights = await getStatus("/api/intelligence/routes/insights?airport_iata=JFK", 503);
    assert.match(routeInsights.detail, /Backend-only endpoint/i);
    const insightQuality = await getStatus("/api/meta/insight-quality", 503);
    assert.match(insightQuality.detail, /Backend-only endpoint/i);
    const supportedAirports = await getStatus("/api/intelligence/airports/supported", 503);
    assert.match(supportedAirports.detail, /Backend-only endpoint/i);

    console.log("✅ Frontend API contract tests passed");
  } finally {
    dev.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error("❌ Frontend API contract tests failed:", error);
  process.exitCode = 1;
});
