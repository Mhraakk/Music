import { NextResponse } from "next/server";
import { atlasPlaylist, type AtlasPlaylistKind } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: AtlasPlaylistKind[] = ["sound", "intro", "pulse", "edge", "new", "other"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const name = url.searchParams.get("name") ?? "";
  const genre = url.searchParams.get("genre") ?? "";
  const kindRaw = (url.searchParams.get("kind") ?? "") as AtlasPlaylistKind;
  const kind = KINDS.includes(kindRaw) ? kindRaw : undefined;
  const enrich = Number(url.searchParams.get("enrich") ?? 12);
  if (!id.trim() && !name.trim() && !genre.trim()) {
    return NextResponse.json({ ok: false, error: "Name a playlist or a branch." }, { status: 400 });
  }
  const page = await atlasPlaylist({
    id: id || undefined,
    name: name || undefined,
    kind,
    genre: genre || undefined,
    enrichLimit: enrich,
  });
  if (!page) {
    return NextResponse.json({ ok: false, error: "Could not open that playlist." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    source: "everynoise",
    playlist: page.playlist,
    genre: page.genre,
    tracks: page.tracks,
    libraryTracks: page.libraryTracks,
  });
}
