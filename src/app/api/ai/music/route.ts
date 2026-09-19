import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy for the music/taste endpoints of the AI backend.
 *
 * The browser only ever talks to its own origin (satisfying `connect-src
 * 'self'`), and provider secrets stay server-side.
 */
const BACKEND_URL = process.env.AI_BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_KEY = process.env.AI_BACKEND_API_KEY;
const TIMEOUT_MS = 30_000;

/** Only these backend paths may be reached through the proxy. */
const ALLOWED = new Set([
  "sources",
  "music/search",
  "music/library",
  "taste/signal",
  "taste/recommendations",
]);

function isAllowed(path: string): boolean {
  return ALLOWED.has(path) || /^taste\/profile\/[\w.-]{1,128}$/.test(path);
}

async function forward(req: NextRequest, method: "GET" | "POST" | "DELETE") {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!isAllowed(path)) {
    return NextResponse.json({ error: `Unsupported path: ${path}` }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = method === "POST" ? await req.text() : undefined;
    const upstream = await fetch(`${BACKEND_URL}/api/v1/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(BACKEND_API_KEY ? { "X-API-Key": BACKEND_API_KEY } : {}),
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "The music backend timed out."
          : "The music backend is unreachable. Start it with `uvicorn app.main:app` in ./backend.",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  return forward(req, "GET");
}

export async function POST(req: NextRequest) {
  return forward(req, "POST");
}

export async function DELETE(req: NextRequest) {
  return forward(req, "DELETE");
}
