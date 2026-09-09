import { NextResponse } from "next/server";
import { harvestAtlas } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    artist?: string;
    genre?: string;
    query?: string;
    limit?: number;
  };
  const result = await harvestAtlas({
    artist: body.artist,
    genre: body.genre,
    query: body.query,
    limit: body.limit,
  });
  return NextResponse.json({
    ok: true,
    title: result.title,
    tracks: result.tracks,
    count: result.tracks.length,
  });
}
