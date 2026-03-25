"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MetadataNotice } from "@/components/MetadataNotice";
import { AirlineOverviewResponse, getAirlineOverview } from "@/lib/api";
import { formatPercent } from "@/lib/format";

export default function AirlinesPage() {
  const [data, setData] = useState<AirlineOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(await getAirlineOverview());
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load airline intelligence.");
      }
    };
    void load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Airline Intelligence</p>
        <h1>Carrier-level route performance view</h1>
        <p>Compare carrier footprint, route attractiveness, and reliability context.</p>
      </section>
      <section className="panel">
        <p className="status">
          Demo-only surface: this module currently uses frontend mock API routes, not backend intelligence endpoints.
        </p>
      </section>

      {error ? <p className="status error">Airline intelligence error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>Airline overview</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Carrier</th>
                    <th>Routes</th>
                    <th>Avg route score</th>
                    <th>Avg on-time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.airlines.map((airline) => (
                    <tr key={airline.carrier_code}>
                      <td className="font-semibold"><Link href={`/airlines/${airline.carrier_code}`} className="text-orange-700 hover:underline">{airline.carrier_code} · {airline.airline_name}</Link></td>
                      <td>{airline.route_count}</td>
                      <td>{airline.avg_route_score}</td>
                      <td>{formatPercent(airline.avg_ontime_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
