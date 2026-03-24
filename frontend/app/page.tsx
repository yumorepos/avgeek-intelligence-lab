"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AirportSearchPanel } from "@/components/AirportSearchPanel";
import { MetadataNotice } from "@/components/MetadataNotice";
import { RouteExploreCard } from "@/components/RouteExploreCard";
import { AirportSearchResponse, RouteExploreResponse, exploreRoutes, searchAirports } from "@/lib/api";

const MODULES = [
  {
    href: "/",
    title: "Price Intelligence",
    desc: "Explore route-level attractiveness, deal signal, fare trend, and reliability context.",
    status: "Live now",
  },
  {
    href: "/airports",
    title: "Airport Intelligence",
    desc: "Compare airport traffic context and top outbound route signals.",
    status: "Live now",
  },
  {
    href: "/airlines",
    title: "Airline Intelligence",
    desc: "Compare carrier footprint, route-quality score, and reliability context.",
    status: "Live now",
  },
  {
    href: "/network",
    title: "Route Network",
    desc: "Browse route network patterns from major U.S. hubs.",
    status: "Live now",
  },
  {
    href: "/seasonality",
    title: "Seasonality",
    desc: "Inspect monthly pricing seasonality and interpretation caveats.",
    status: "Live now",
  },
  {
    href: "/learn",
    title: "Learn",
    desc: "Review methodology, confidence semantics, and demo-mode limitations.",
    status: "Live now",
  },
];

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
        <p className="eyebrow">Aviation Playground Lab</p>
        <h1>Explore aviation through transparent data modules</h1>
        <p>
          This project runs in explicit runtime modes (mock demo, CSV fallback, or backend API) and surfaces provenance on every core screen.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Module hub</h2>
          <p className="muted">Price Intelligence remains the flagship module; additional modules broaden avgeek exploration.</p>
        </div>
        <div className="route-grid mt-0">
          {MODULES.map((mod) => (
            <Link href={mod.href} key={mod.href} className="route-card">
              <h3>{mod.title}</h3>
              <p>{mod.desc}</p>
              <span className="badge badge-success w-fit">{mod.status}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Price Intelligence · Route Explorer</h2>
        <p className="muted">Directional route scoring for exploratory analysis; not a booking or forecasting guarantee.</p>
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
          <p className="muted">Ranked routes with latest score, fare insight, and reliability cues.</p>
        </div>

        {isLoadingRoutes ? <p className="status">Loading routes and score summaries…</p> : null}
        {routesError ? <p className="status error">Route explorer error: {routesError}</p> : null}
        {!isLoadingRoutes && !routesError && routesData && routesData.routes.length === 0 ? (
          <p className="status">No routes available for this origin in the loaded MVP slice yet.</p>
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
