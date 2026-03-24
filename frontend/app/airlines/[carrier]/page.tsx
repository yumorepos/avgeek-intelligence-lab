"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MetadataNotice } from "@/components/MetadataNotice";
import { SimpleLineChart } from "@/components/SimpleLineChart";
import { AirlineDetailResponse, getAirlineDetail } from "@/lib/api";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";

type Props = {
  params: {
    carrier: string;
  };
};

export default function AirlineDetailPage({ params }: Props) {
  const carrier = params.carrier.toUpperCase();
  const [data, setData] = useState<AirlineDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(await getAirlineDetail(carrier));
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load airline detail.");
      }
    };
    void load();
  }, [carrier]);

  const farePoints = useMemo(
    () => data?.monthly_trend.map((t) => ({ label: formatMonth(t.year, t.month), value: t.avg_fare_usd })) ?? [],
    [data?.monthly_trend],
  );

  const ontimePoints = useMemo(
    () => data?.monthly_trend.map((t) => ({ label: formatMonth(t.year, t.month), value: t.avg_ontime_rate })) ?? [],
    [data?.monthly_trend],
  );

  return (
    <main className="page-shell">
      <Link href="/airlines" className="back-link">
        ← Back to Airline Intelligence
      </Link>

      <section className="hero compact">
        <p className="eyebrow">Airline drilldown</p>
        <h1>{carrier}</h1>
        <p>Carrier-level trend and route breakdown</p>
      </section>

      {error ? <p className="status error">Airline detail error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />

          <section className="panel">
            <h2>
              {data.carrier_code} · {data.airline_name}
            </h2>
            <p className="muted">Route-level drilldown with monthly trend aggregation.</p>
          </section>

          <section className="chart-grid">
            <SimpleLineChart title="Average fare trend" points={farePoints} colorClassName="line-primary" valueFormatter={formatCurrency} />
            <SimpleLineChart title="Average on-time trend" points={ontimePoints} colorClassName="line-secondary" valueFormatter={formatPercent} />
          </section>

          <section className="panel">
            <h2>Routes</h2>
            <div className="route-grid">
              {data.routes.map((route) => (
                <article className="route-card" key={`${route.origin}-${route.destination}`}>
                  <h3>
                    {route.origin} → {route.destination}
                  </h3>
                  <p>Route score: {route.route_score}</p>
                  <p>Latest fare: {formatCurrency(route.latest_fare)}</p>
                  <p className="muted">Deal signal: {route.latest_deal_signal}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
