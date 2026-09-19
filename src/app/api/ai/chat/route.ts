import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy to the FastAPI AI backend.
 *
 * Going through Next keeps the browser talking only to its own origin, which
 * satisfies the app's `connect-src 'self'` CSP and keeps the backend API key
 * server-side.
 */
const BACKEND_URL = process.env.AI_BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_KEY = process.env.AI_BACKEND_API_KEY;
const TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BACKEND_API_KEY ? { "X-API-Key": BACKEND_API_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await upstream.text();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "The AI backend timed out."
          : "The AI backend is unreachable. Start it with `uvicorn app.main:app` in ./backend.",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
