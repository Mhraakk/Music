import { NextResponse } from "next/server";
import { harvestAtlas, type AtlasPlaylistKind } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: AtlasPlaylistKind[] = ["sound", "intro", "pulse", "edge", "new", "other"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    artist?: string;
    genre?: string;
    query?: string;
    playlist?: string;
    playlistKind?: AtlasPlaylistKind;
    limit?: number;
    durationMinutes?: number;
  };
  const minutes =
    typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
      ? Math.max(8, Math.min(180, body.durationMinutes))
      : undefined;
  const playlistKind = body.playlistKind && KINDS.includes(body.playlistKind) ? body.playlistKind : undefined;
  const result = await harvestAtlas({
    artist: body.artist,
    genre: body.genre,
    query: body.query,
    playlist: body.playlist,
    playlistKind,
    limit: body.limit,
    durationMinutes: minutes,
  });
  return NextResponse.json({
    ok: true,
    title: result.title,
    tracks: result.tracks,
    count: result.tracks.length,
    durationSeconds: result.durationSeconds,
    durationMinutes: minutes ?? null,
  });
}
