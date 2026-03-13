import { DataProvenance } from "@/lib/api";

type Props = {
  metadata: DataProvenance;
};

export function MetadataNotice({ metadata }: Props) {
  if (!metadata.is_fallback && metadata.data_complete) {
    return null;
  }

  return (
    <section className="notice notice-warning">
      <h3>Data provenance and coverage</h3>
      <div className="provenance-meta">
        <span className="chip">Source: {metadata.data_source}</span>
        <span className={`chip ${metadata.is_fallback ? "chip-warning" : ""}`}>{metadata.is_fallback ? "Fallback mode" : "Primary mode"}</span>
        <span className={`chip ${!metadata.data_complete ? "chip-warning" : ""}`}>{metadata.data_complete ? "Coverage: complete" : "Coverage: partial"}</span>
      </div>
      <p className="muted">Use this as directional route intelligence. In fallback mode, coverage can be thinner by route/month.</p>
      {metadata.note ? <p className="muted">{metadata.note}</p> : null}
    </section>
  );
}
