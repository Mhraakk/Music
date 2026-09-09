import { NextResponse, type NextRequest } from "next/server";
import { resolveNuclearStream } from "@/lib/nuclear/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await resolveNuclearStream({
    artist: searchParams.get("artist") ?? "",
    title: searchParams.get("title") ?? "",
    query: searchParams.get("query") ?? "",
    videoId: searchParams.get("videoId") ?? searchParams.get("v"),
    limit: Number(searchParams.get("limit") ?? 5) || 5,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await resolveNuclearStream({
    artist: typeof body.artist === "string" ? body.artist : "",
    title: typeof body.title === "string" ? body.title : "",
    query: typeof body.query === "string" ? body.query : "",
    videoId: typeof body.videoId === "string" ? body.videoId : null,
    limit: typeof body.limit === "number" ? body.limit : 5,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
