"use client";

import { useEffect, useMemo, useState } from "react";

import { MetadataNotice } from "@/components/MetadataNotice";
import { AirportPeersResponse, AirportRoleResponse, getAirportPeers, getAirportRole } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { resolveAirportDefaults } from "@/lib/airport-defaults";

export default function AirportRoleIntelPage() {
  const [iata, setIata] = useState("");
  const [role, setRole] = useState<AirportRoleResponse | null>(null);
  const [peers, setPeers] = useState<AirportPeersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const defaults = await resolveAirportDefaults(5, { requireIntelligenceAirport: true });
      setIata(defaults.defaultAirport);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!iata) return;

    const load = async () => {
      try {
        setError(null);
        const [roleData, peerData] = await Promise.all([getAirportRole(iata), getAirportPeers(iata, 6)]);
        setRole(roleData);
        setPeers(peerData);
      } catch (e) {
        setRole(null);
        setPeers(null);
        setError(e instanceof Error ? e.message : "Failed to load airport role intelligence.");
      }
    };
    void load();
  }, [iata]);

  const why = useMemo(() => {
    if (!role?.metrics) return "No role metrics available for this airport in loaded data.";
    return `${role.airport.iata} is currently labeled ${role.metrics.role_label}, with ${role.metrics.outbound_routes} outbound routes and ${formatPercent(role.metrics.dominant_carrier_share)} dominant carrier share.`;
  }, [role]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Flagship Wedge · Airport Competitiveness</p>
        <h1>Airport role and peer intelligence</h1>
        <p>Backend-supported airport positioning profile with closest peers from latest role snapshots.</p>
      </section>

      <section className="panel">
        <h2>Airport</h2>
        <input value={iata} onChange={(e) => setIata(e.target.value.toUpperCase())} className="airport-input mt-3" maxLength={3} />
      </section>

      {error ? <p className="status error">Airport role error: {error}</p> : null}

      {role ? (
        <>
          <MetadataNotice metadata={role.metadata} />
          <section className="panel">
            <h2>Why this matters</h2>
            <p>{why}</p>
            <p className="muted mt-2">{role.intelligence_meta.coverage_summary}</p>
          </section>

          <section className="panel">
            <h2>Role metrics</h2>
            {role.metrics ? (
              <dl className="kv-grid mt-4">
                <div><dt>Role label</dt><dd>{role.metrics.role_label}</dd></div>
                <div><dt>Outbound routes</dt><dd>{role.metrics.outbound_routes}</dd></div>
                <div><dt>Destination diversity index</dt><dd>{role.metrics.destination_diversity_index.toFixed(3)}</dd></div>
                <div><dt>Carrier concentration HHI</dt><dd>{role.metrics.carrier_concentration_hhi.toFixed(1)}</dd></div>
                <div><dt>Dominant carrier share</dt><dd>{formatPercent(role.metrics.dominant_carrier_share)}</dd></div>
              </dl>
            ) : (
              <p className="muted">No role metrics for current airport.</p>
            )}
          </section>
        </>
      ) : null}

      {peers ? (
        <section className="panel">
          <h2>Peer airports</h2>
          <p className="muted">{peers.comparison_basis}</p>
          {peers.peers.length > 0 ? (
            <div className="route-grid mt-4">
              {peers.peers.map((peer) => (
                <article className="route-card" key={peer.iata}>
                  <h3>{peer.iata}</h3>
                  <p>Role: {peer.role_label ?? "N/A"}</p>
                  <p>Outbound routes: {peer.outbound_routes ?? "N/A"}</p>
                  <p>Diversity index: {peer.destination_diversity_index?.toFixed(3) ?? "N/A"}</p>
                  <p>Dominant carrier share: {peer.dominant_carrier_share !== null && peer.dominant_carrier_share !== undefined ? formatPercent(peer.dominant_carrier_share) : "N/A"}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted mt-4">No peer airport records available for this airport in loaded data.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
