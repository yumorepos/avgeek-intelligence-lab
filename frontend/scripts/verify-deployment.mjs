const FRONTEND_BASE = process.env.FRONTEND_BASE ?? "https://avgeek-intelligence-lab.vercel.app";
const BACKEND_BASE = process.env.BACKEND_BASE ?? "https://avgeek-intelligence-lab.onrender.com";

const pageChecks = [
  "/intelligence/airports?airport=JFK",
  "/intelligence/competition?airport=JFK",
  "/intelligence/route-changes?airport=JFK",
];

const apiChecks = [
  "/api/intelligence/airports/supported",
];

async function checkPage(path) {
  const url = `${FRONTEND_BASE}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  const hasLocalhost = body.includes("http://localhost:8000");
  const hasAirportNotFound = body.includes("Airport not found");

  return {
    kind: "page",
    path,
    url,
    status: res.status,
    ok: res.ok && !hasLocalhost && !hasAirportNotFound,
    detail: hasLocalhost
      ? "page payload still contains localhost:8000 hint"
      : hasAirportNotFound
        ? "page payload still contains Airport not found"
        : "ok",
  };
}

async function checkApi(path) {
  const url = `${FRONTEND_BASE}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  const hasBackendOnly = body.includes("Backend-only endpoint");
  const hasLocalhost = body.includes("http://localhost:8000");
  const hasAirportNotFound = body.includes("Airport not found");

  return {
    kind: "api",
    path,
    url,
    status: res.status,
    ok: res.ok && !hasBackendOnly && !hasLocalhost && !hasAirportNotFound,
    detail: hasBackendOnly
      ? "still returning Backend-only endpoint"
      : hasLocalhost
        ? "response still references localhost:8000"
        : hasAirportNotFound
          ? "response still contains Airport not found"
        : "ok",
  };
}

async function checkBackendReadiness() {
  const url = `${BACKEND_BASE}/health/readiness`;
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }
  const ready = res.ok && parsed?.status === "ready";
  return {
    kind: "backend",
    path: "/health/readiness",
    url,
    status: res.status,
    ok: ready,
    detail: ready ? "ok" : `backend not ready: ${body.slice(0, 180)}`,
  };
}

async function checkSupportedAirportsReady() {
  const url = `${BACKEND_BASE}/intelligence/airports/supported`;
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  const hasAirports = Array.isArray(parsed?.airports) && parsed.airports.length > 0;
  const ready = parsed?.readiness?.is_ready === true;
  return {
    kind: "backend",
    path: "/intelligence/airports/supported",
    url,
    status: res.status,
    ok: res.ok && ready && hasAirports,
    detail: res.ok && ready && hasAirports ? "ok" : `supported airports not ready: ${body.slice(0, 180)}`,
  };
}

async function main() {
  const results = [];
  results.push(await checkBackendReadiness());
  results.push(await checkSupportedAirportsReady());
  for (const path of pageChecks) {
    results.push(await checkPage(path));
  }
  for (const path of apiChecks) {
    results.push(await checkApi(path));
  }

  console.table(
    results.map((r) => ({
      type: r.kind,
      status: r.status,
      ok: r.ok,
      path: r.path,
      detail: r.detail,
    }))
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error("Verification failed for:");
    failed.forEach((f) => console.error(`- ${f.url} (${f.status}) ${f.detail}`));
    process.exit(1);
  }

  console.log("Deployment verification passed.");
}

main().catch((error) => {
  console.error("Verification script error:", error);
  process.exit(1);
});
