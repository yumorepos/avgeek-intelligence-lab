"use client";

import { useEffect, useMemo, useState } from "react";
import { MetadataNotice } from "@/components/MetadataNotice";
import { NetworkGeoResponse, getNetworkGeo } from "@/lib/api";

const WIDTH = 920;
const HEIGHT = 420;

function project(lon: number, lat: number) {
  const x = ((lon + 130) / 70) * WIDTH;
  const y = HEIGHT - ((lat - 24) / 26) * HEIGHT;
  return { x, y };
}

export default function NetworkPage() {
  const [data, setData] = useState<NetworkGeoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(await getNetworkGeo());
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load route network.");
      }
    };
    void load();
  }, []);

  const airportPoints = useMemo(() => {
    if (!data) return new Map<string, { x: number; y: number; airport_name: string }>();
    return new Map(data.airports.map((a) => [a.iata, { ...project(a.lon, a.lat), airport_name: a.airport_name }]));
  }, [data]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Route Network</p>
        <h1>Geospatial route map</h1>
        <p>Current demo route graph rendered from route-level origin/destination data.</p>
      </section>

      {error ? <p className="status error">Network error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>U.S. route map (demo projection)</h2>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full border border-orange-200 rounded-xl bg-gradient-to-br from-sky-50 to-white">
              {data.routes.map((route) => {
                const from = airportPoints.get(route.origin);
                const to = airportPoints.get(route.destination);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${route.origin}-${route.destination}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="rgb(234 88 12)"
                    strokeOpacity={Math.max(0.2, route.score / 100)}
                    strokeWidth={1.5 + route.score / 50}
                  />
                );
              })}

              {data.airports.map((airport) => {
                const p = project(airport.lon, airport.lat);
                return (
                  <g key={airport.iata}>
                    <circle cx={p.x} cy={p.y} r={5} fill="rgb(194 65 12)" />
                    <text x={p.x + 7} y={p.y - 7} fontSize="12" fill="rgb(55 65 81)">
                      {airport.iata}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="muted mt-4">Line thickness/opacity scales with route score in current demo dataset.</p>
          </section>
        </>
      ) : null}
    </main>
  );
}
