import { NextResponse } from "next/server";
import { atlasArtist } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const enrich = Number(url.searchParams.get("enrich") ?? 10);
  if (!name.trim()) {
    return NextResponse.json({ ok: false, error: "Name an artist." }, { status: 400 });
  }
  const page = await atlasArtist(name, enrich);
  if (!page) {
    return NextResponse.json({ ok: false, error: "Could not resolve that artist." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    source: "everynoise",
    artist: page.artist,
    features: page.features,
    nearbyGenres: page.nearbyGenres,
    tracks: page.tracks,
    libraryTracks: page.libraryTracks,
  });
}
