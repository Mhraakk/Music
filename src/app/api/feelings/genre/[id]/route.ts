import { NextResponse } from "next/server";
import { feelingGenrePage } from "@/lib/feelings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const enrich = Number(url.searchParams.get("enrich") ?? 12);
  const page = await feelingGenrePage(id, enrich);
  if (!page) {
    return NextResponse.json({ ok: false, error: "That branch is not in Feelings." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    source: "everynoise",
    nest: "feelings",
    genre: page.genre,
    artists: page.artists,
    nearby: page.nearby,
    mirrors: page.mirrors,
    playlists: page.playlists,
    tracks: page.tracks,
    libraryTracks: page.libraryTracks,
    canvas: page.canvas,
    nearbyCanvas: page.nearbyCanvas,
    mirrorCanvas: page.mirrorCanvas,
    rooms: page.rooms,
  });
}
