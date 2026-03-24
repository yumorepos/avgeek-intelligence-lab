import { MetadataNotice } from "@/components/MetadataNotice";

const HUBS = [
  { origin: "JFK", destinations: ["LAX", "SFO", "MIA", "ATL"] },
  { origin: "LAX", destinations: ["JFK", "SEA", "ORD", "DEN"] },
  { origin: "ATL", destinations: ["LGA", "MCO", "DFW", "BOS"] },
];

export default function NetworkPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Route Network</p>
        <h1>Hub-to-route exploration</h1>
        <p>Visual-first route discovery module for aviation enthusiasts.</p>
      </section>

      <MetadataNotice
        metadata={{
          data_source: "mock_demo_data",
          is_fallback: true,
          data_complete: false,
          note: "Network module is currently mock-backed for interaction prototyping.",
        }}
      />

      <section className="panel">
        <h2>Major hub network snapshots</h2>
        <div className="route-grid">
          {HUBS.map((hub) => (
            <article className="route-card" key={hub.origin}>
              <h3>{hub.origin}</h3>
              <p className="muted">Top shown destinations</p>
              <div className="chips mt-3 flex flex-wrap gap-2">
                {hub.destinations.map((d) => (
                  <span key={d} className="badge badge-neutral">
                    {hub.origin} → {d}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
