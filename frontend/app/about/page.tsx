export default function AboutDataStatusPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Trust surface</p>
        <h1>Data status and product limits</h1>
        <p>This page intentionally distinguishes proven capability from demo scaffolding.</p>
      </section>

      <section className="panel">
        <h2>Runtime modes</h2>
        <ul className="list-disc pl-5 mt-4 space-y-2">
          <li><strong>Frontend demo mode:</strong> Next.js API routes and fixtures for local/demo exploration.</li>
          <li><strong>Backend CSV fallback mode:</strong> FastAPI reads local marts CSV files when configured.</li>
          <li><strong>Backend PostgreSQL mode:</strong> FastAPI can read relational marts when database environment variables are configured.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Proven intelligence modules</h2>
        <ul className="list-disc pl-5 mt-4 space-y-2">
          <li>Route change intelligence (`/intelligence/route-changes`).</li>
          <li>Airport role and peer intelligence (`/intelligence/airports`).</li>
          <li>Competition + insight quality intelligence (`/intelligence/competition`).</li>
          <li>Route price explorer with provenance notices (`/`).</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Not yet proven as live intelligence</h2>
        <ul className="list-disc pl-5 mt-4 space-y-2">
          <li>Airline, network, and seasonality pages are still labeled demo-only in UI.</li>
          <li>No real-time flight feed is included in this repository.</li>
          <li>All route scores remain directional heuristics, not forecasts or fare guarantees.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>How to verify freshness</h2>
        <p className="muted mt-3">
          Use metadata notices on module pages. They report source mode, fallback status, and last refresh timestamps when available.
        </p>
      </section>
    </main>
  );
}
