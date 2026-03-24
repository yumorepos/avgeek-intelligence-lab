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

      {error ? <p className="status error">Airline intelligence error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>Airline overview</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="py-3">Carrier</th>
                    <th className="py-3">Routes</th>
                    <th className="py-3">Avg route score</th>
                    <th className="py-3">Avg on-time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.airlines.map((airline) => (
                    <tr key={airline.carrier_code} className="border-b border-gray-100">
                      <td className="py-3 font-semibold"><Link href={`/airlines/${airline.carrier_code}`} className="text-orange-700 hover:underline">{airline.carrier_code} · {airline.airline_name}</Link></td>
                      <td className="py-3">{airline.route_count}</td>
                      <td className="py-3">{airline.avg_route_score}</td>
                      <td className="py-3">{formatPercent(airline.avg_ontime_rate)}</td>
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
