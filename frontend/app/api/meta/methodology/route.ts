import { NextResponse } from "next/server";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET() {
  return NextResponse.json({
    score_version: "v1_heuristic",
    metric_descriptions: {
      reliability_score: "Scaled 0-100 from route-level on-time and cancellation behavior.",
      fare_volatility: "Relative variability in observed route fares across available months.",
      route_attractiveness_score: "Composite score blending fare and reliability indicators.",
      deal_signal: "Categorical signal: strong_deal, deal, neutral, or expensive.",
    },
    caveats: [
      "Coverage is limited to loaded BTS and FAA slices in the local mart dataset.",
      "Scores are heuristic and intended for MVP decision support, not financial-grade forecasting.",
      "Sparse routes may have low confidence due to limited monthly observations.",
    ],
    source_coverage_notes: [
      "Fares: BTS DB1B-derived monthly aggregates.",
      "Reliability: BTS On-Time Performance-derived on-time and cancellation marts.",
      "Airport context: FAA annual enplanements when available.",
    ],
    metadata: await demoMetadata("Methodology payload is static for demo mode."),
  });
}
