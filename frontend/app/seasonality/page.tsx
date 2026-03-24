const SEASONALITY_ROWS = [
  { month: "Jan", index: 0.88, interpretation: "Lower-than-median fares in sample routes" },
  { month: "Mar", index: 0.97, interpretation: "Near baseline" },
  { month: "Jun", index: 1.12, interpretation: "Higher seasonal demand pressure" },
  { month: "Aug", index: 1.09, interpretation: "Summer premium still elevated" },
  { month: "Nov", index: 0.91, interpretation: "Shoulder-season reprieve" },
];

export default function SeasonalityPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Seasonality</p>
        <h1>Monthly pricing pattern explorer</h1>
        <p>Route-relative seasonality snapshots with caveat-first interpretation.</p>
      </section>

      <section className="panel">
        <h2>Observed seasonal index (prototype)</h2>
        <p className="muted">Index &lt; 1.0 indicates below-route baseline pricing; index &gt; 1.0 indicates above baseline.</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-orange-200">
                <th className="py-3">Month</th>
                <th className="py-3">Seasonal index</th>
                <th className="py-3">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {SEASONALITY_ROWS.map((row) => (
                <tr key={row.month} className="border-b border-gray-100">
                  <td className="py-3 font-semibold">{row.month}</td>
                  <td className="py-3">{row.index.toFixed(2)}</td>
                  <td className="py-3 text-gray-600">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
