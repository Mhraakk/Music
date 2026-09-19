import { NextResponse } from "next/server";

const BACKEND_URL = process.env.AI_BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body = await upstream.json();
    return NextResponse.json({ reachable: true, ...body }, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { reachable: false, status: "down", detail: "AI backend not reachable" },
      { status: 503 }
    );
  }
}
