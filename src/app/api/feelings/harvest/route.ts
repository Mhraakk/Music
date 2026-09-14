import { NextResponse } from "next/server";
import type { AtlasPlaylistKind } from "@/lib/everynoise/types";
import { harvestFeeling } from "@/lib/feelings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: AtlasPlaylistKind[] = ["sound", "intro", "pulse", "edge", "new", "other"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    feeling?: string;
    room?: string;
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
  try {
    const result = await harvestFeeling({
      room: body.feeling || body.room,
      artist: body.artist,
      genre: body.genre,
      query: body.query,
      playlist: body.playlist,
      playlistKind,
      limit: body.limit,
      durationMinutes: minutes,
    });
    if (result.refused) {
      return NextResponse.json(
        {
          ok: false,
          title: result.title,
          tracks: [],
          count: 0,
          error: result.refused,
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      title: result.title,
      tracks: result.tracks,
      count: result.tracks.length,
      durationSeconds: result.durationSeconds,
      durationMinutes: minutes ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: null,
        tracks: [],
        count: 0,
        error: error instanceof Error ? error.message : "Could not harvest this feeling.",
      },
      { status: 502 }
    );
  }
}
