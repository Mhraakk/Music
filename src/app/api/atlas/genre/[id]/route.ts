import { NextResponse } from "next/server";
import { atlasGenre } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const enrich = Number(url.searchParams.get("enrich") ?? 12);
  const page = await atlasGenre(id, enrich);
  if (!page) {
    return NextResponse.json({ ok: false, error: "Unknown branch." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    source: "everynoise",
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
  });
}
