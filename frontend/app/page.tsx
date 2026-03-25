"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AirportSearchPanel } from "@/components/AirportSearchPanel";
import { MetadataNotice } from "@/components/MetadataNotice";
import { RouteExploreCard } from "@/components/RouteExploreCard";
import { AirportSearchResponse, RouteExploreResponse, exploreRoutes, searchAirports } from "@/lib/api";

const MODULES = [
  {
    href: "/intelligence/route-changes",
    title: "Route Changes Intelligence",
    desc: "Launch, cut, resume, and frequency-shift events with confidence tagging.",
    status: "Backend-supported",
  },
  {
    href: "/intelligence/airports",
    title: "Airport Role Intelligence",
    desc: "Role labels, concentration, diversity, and peer comparison from latest snapshots.",
    status: "Backend-supported",
  },
  {
    href: "/intelligence/competition",
    title: "Competition Intelligence",
    desc: "Route + airport concentration and entrant-pressure diagnostics with trust controls.",
    status: "Backend-supported",
  },
  {
    href: "/",
    title: "Route Price Intelligence",
    desc: "Directional route attractiveness and reliability context (not a booking or forecasting engine).",
    status: "Live now",
  },
  {
    href: "/airports",
    title: "Airport Profiles",
    desc: "Airport context and top outbound route signals for exploration.",
    status: "Live now",
  },
  {
    href: "/airlines",
    title: "Airline Intelligence",
    desc: "Carrier footprint and trends currently powered by demo data only.",
    status: "Demo-only",
  },
  {
    href: "/network",
    title: "Network Explorer",
    desc: "Hub-and-spoke route exploration currently powered by demo data only.",
    status: "Demo-only",
  },
  {
    href: "/seasonality",
    title: "Seasonality Explorer",
    desc: "Monthly seasonality index currently powered by demo data only.",
    status: "Demo-only",
  },
];

const STATUS_COUNTS = {
  backend: MODULES.filter((m) => m.status === "Backend-supported").length,
  live: MODULES.filter((m) => m.status === "Live now").length,
  demo: MODULES.filter((m) => m.status === "Demo-only").length,
};

export default function HomePage() {
  const [query, setQuery] = useState("JFK");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("JFK");

  const [airportData, setAirportData] = useState<AirportSearchResponse | null>(null);
  const [routesData, setRoutesData] = useState<RouteExploreResponse | null>(null);

  const [searchError, setSearchError] = useState<string | null>(null);
  const [routesError, setRoutesError] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const loadAirports = useCallback(async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const data = await searchAirports(query.trim());
      setAirportData(data);
      if (data.results.length > 0 && !data.results.find((airport) => airport.iata === selectedOrigin)) {
        setSelectedOrigin(data.results[0].iata);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Airport search failed.");
      setAirportData(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedOrigin]);

  useEffect(() => {
    void loadAirports();
  }, [loadAirports]);

  useEffect(() => {
    if (!selectedOrigin) {
      setRoutesData(null);
      return;
    }

    const loadRoutes = async () => {
      setIsLoadingRoutes(true);
      setRoutesError(null);

      try {
        const data = await exploreRoutes(selectedOrigin);
        setRoutesData(data);
      } catch (error) {
        setRoutesError(error instanceof Error ? error.message : "Route exploration failed.");
        setRoutesData(null);
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    void loadRoutes();
  }, [selectedOrigin]);

  const hasSearchResults = useMemo(() => (airportData?.results.length ?? 0) > 0, [airportData?.results.length]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Truth-first intelligence for avgeeks</p>
        <h1>Avgeek Intelligence Lab</h1>
        <p>
          This product separates backend-supported intelligence from demo-only modules, and exposes methodology, freshness,
          and data limitations on every core workflow.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Current intelligence coverage</h2>
          <p className="muted">Real status snapshot from current product surface (not roadmap claims).</p>
        </div>
        <div className="metrics-grid">
          <article>
            <h3>Backend-supported modules</h3>
            <p className="text-3xl font-bold text-orange-700">{STATUS_COUNTS.backend}</p>
          </article>
          <article>
            <h3>Live core modules</h3>
            <p className="text-3xl font-bold text-orange-700">{STATUS_COUNTS.live}</p>
          </article>
          <article>
            <h3>Demo-only modules</h3>
            <p className="text-3xl font-bold text-orange-700">{STATUS_COUNTS.demo}</p>
          </article>
        </div>
        <p className="muted mt-4">
          Want the full trust surface? See <Link href="/data-status" className="text-orange-700 font-semibold">Data Status</Link> and <Link href="/learn" className="text-orange-700 font-semibold">Methodology</Link>.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Module hub</h2>
          <p className="muted">Use status badges to distinguish real backend intelligence from demo exploration.</p>
        </div>
        <div className="route-grid mt-0">
          {MODULES.map((mod) => (
            <Link href={mod.href} key={mod.href} className="route-card">
              <h3>{mod.title}</h3>
              <p>{mod.desc}</p>
              <span className={`badge w-fit ${mod.status === "Demo-only" ? "badge-warning" : "badge-success"}`}>{mod.status}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Route Price Intelligence</h2>
        <p className="muted">Directional route scoring for exploratory analysis; never a booking recommendation or guarantee.</p>
      </section>

      <AirportSearchPanel
        query={query}
        onQueryChange={setQuery}
        airports={airportData?.results ?? []}
        selectedOrigin={selectedOrigin}
        onSelectOrigin={setSelectedOrigin}
        onSearch={loadAirports}
        isSearching={isSearching}
      />

      {searchError ? <p className="status error">Airport search error: {searchError}</p> : null}
      {!isSearching && !searchError && !hasSearchResults ? (
        <p className="status">No airports matched your query. Try a major hub (JFK, LAX, SFO) or a city/airport name.</p>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h2>Routes from {selectedOrigin || "—"}</h2>
          <p className="muted">Ranked routes with score, fare narrative, reliability cues, and provenance metadata.</p>
        </div>

        {isLoadingRoutes ? <p className="status">Loading routes and score summaries…</p> : null}
        {routesError ? <p className="status error">Route explorer error: {routesError}</p> : null}
        {!isLoadingRoutes && !routesError && routesData && routesData.routes.length === 0 ? (
          <p className="status">No routes available for this origin in the currently loaded data slice.</p>
        ) : null}

        {routesData ? <MetadataNotice metadata={routesData.metadata} /> : null}

        <div className="route-grid">
          {routesData?.routes.map((route) => (
            <RouteExploreCard key={route.destination.iata} origin={routesData.origin} route={route} />
          ))}
        </div>
      </section>
    </main>
  );
}
