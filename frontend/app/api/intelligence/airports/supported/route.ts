import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(_request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      {
        detail:
          "Backend-only endpoint. Set NEXT_PUBLIC_API_BASE_URL to backend or configure BACKEND_URL+USE_BACKEND_PROXY for frontend proxy mode.",
      },
      { status: 503 },
    );
  }

  const upstream = `${BACKEND_URL}/intelligence/airports/supported`;
  const response = await fetch(upstream, { cache: "no-store" });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
