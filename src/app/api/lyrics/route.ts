import { NextResponse, type NextRequest } from "next/server";
import { fetchLyrics } from "@/lib/lyrics/lrclib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await fetchLyrics({
    artist: searchParams.get("artist") ?? "",
    title: searchParams.get("title") ?? "",
    query: searchParams.get("query") ?? "",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await fetchLyrics({
    artist: typeof body.artist === "string" ? body.artist : "",
    title: typeof body.title === "string" ? body.title : "",
    query: typeof body.query === "string" ? body.query : "",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
