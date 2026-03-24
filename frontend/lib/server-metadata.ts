import { promises as fs } from "node:fs";
import path from "node:path";

const CANDIDATES = [
  "data/marts/route_scores.csv",
  "data/marts/monthly_fares.csv",
  "data/marts/ontime_stats.csv",
  "data/raw/faa_enplanements_raw.csv",
];

export async function resolveLastRefreshedAt(): Promise<string | null> {
  const root = process.cwd().replace(/\/frontend$/, "");
  const mtimes: number[] = [];

  for (const rel of CANDIDATES) {
    const absolute = path.join(root, rel);
    try {
      const stat = await fs.stat(absolute);
      mtimes.push(stat.mtimeMs);
    } catch {
      // missing file is acceptable in demo mode
    }
  }

  if (mtimes.length === 0) {
    return null;
  }

  return new Date(Math.max(...mtimes)).toISOString();
}

export async function demoMetadata(note: string) {
  return {
    data_source: "mock_demo_data",
    is_fallback: true,
    data_complete: false,
    note,
    last_refreshed_at: await resolveLastRefreshedAt(),
  };
}
