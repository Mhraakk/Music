import { NextResponse } from "next/server";
import { resolveRecording } from "@/lib/everynoise/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve an atlas row (artist + title, never a genre field) into a playable
 * recording and ingestable library track. Genre is navigation-only.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    artist?: string;
    title?: string | null;
    previewUrl?: string | null;
    spotifyTrackId?: string | null;
    spotifyArtistId?: string | null;
  };
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  if (!artist) {
    return NextResponse.json({ ok: false, error: "Name an artist." }, { status: 400 });
  }
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  try {
    const result = await resolveRecording({
      artist,
      title,
      previewUrl: typeof body.previewUrl === "string" ? body.previewUrl : null,
      spotifyTrackId: typeof body.spotifyTrackId === "string" ? body.spotifyTrackId : null,
      spotifyArtistId: typeof body.spotifyArtistId === "string" ? body.spotifyArtistId : null,
      note: "Resolved from the Every Noise atlas",
    });
    return NextResponse.json({
      ok: Boolean(result.track),
      track: result.track,
      card: result.card,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        track: null,
        error: error instanceof Error ? error.message : "Could not resolve that recording.",
      },
      { status: 502 }
    );
  }
}
