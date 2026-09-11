/**
 * POST /api/library/sync
 *
 * Two ways in:
 *   - `{ candidates }` — admit a page the client already retrieved
 *   - `{ offset }` — pull the next page of Favorite Songs with the stored
 *     Music User Token and admit it
 *
 * GET returns connection + catalog counts.
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { catalogStats } from "@/lib/drift/catalog";
import { musicKitConfig } from "@/lib/providers/musickit";
import { FAVORITE_SONGS_PLAYLIST_ID } from "@/lib/apple/playlist";
import { fetchFavoritePage } from "@/lib/apple/fetch";
import { ingestFavoriteCandidates } from "@/lib/apple/ingest";
import type { ExternalCandidate } from "@/lib/drift/expansion/types";
import { MUSIC_USER_COOKIE } from "@/lib/apple/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asCandidates(raw: unknown): ExternalCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title : "";
      const artist = typeof r.artist === "string" ? r.artist : "";
      const appleTrackId = typeof r.appleTrackId === "string" ? r.appleTrackId : "";
      if (!title || !artist) return null;
      return {
        appleTrackId: appleTrackId || `${artist}:${title}`,
        title,
        artist,
        album: typeof r.album === "string" ? r.album : null,
        durationMs: typeof r.durationMs === "number" ? r.durationMs : 0,
        previewUrl: typeof r.previewUrl === "string" ? r.previewUrl : null,
        artworkUrl: typeof r.artworkUrl === "string" ? r.artworkUrl : null,
        thumbUrl: typeof r.thumbUrl === "string" ? r.thumbUrl : null,
        appleUrl: typeof r.appleUrl === "string" ? r.appleUrl : null,
        probeArtist: artist,
        probeVia: "favorite-songs",
      } satisfies ExternalCandidate;
    })
    .filter((row): row is ExternalCandidate => Boolean(row));
}

export async function GET() {
  const store = await cookies();
  const stats = catalogStats();
  return NextResponse.json({
    configured: musicKitConfig().configured,
    authenticated: Boolean(store.get(MUSIC_USER_COOKIE)?.value),
    missing: musicKitConfig().missing,
    playlistId: FAVORITE_SONGS_PLAYLIST_ID,
    stats,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    offset?: number;
    playlistId?: string;
    candidates?: unknown;
  };

  const posted = asCandidates(body.candidates);
  if (posted.length) {
    const result = await ingestFavoriteCandidates(posted.slice(0, 100));
    return NextResponse.json({
      ...result,
      nextOffset: null,
      total: null,
      playlistId: FAVORITE_SONGS_PLAYLIST_ID,
      stats: catalogStats(),
    });
  }

  const store = await cookies();
  const userToken = store.get(MUSIC_USER_COOKIE)?.value;
  if (!musicKitConfig().configured) {
    return NextResponse.json(
      { error: "Apple MusicKit is not configured.", missing: musicKitConfig().missing },
      { status: 503 }
    );
  }
  if (!userToken) {
    return NextResponse.json({ error: "Connect Apple Music first." }, { status: 401 });
  }

  try {
    const page = await fetchFavoritePage({
      userToken,
      offset: typeof body.offset === "number" ? body.offset : 0,
      playlistId: typeof body.playlistId === "string" ? body.playlistId : undefined,
    });
    const result = await ingestFavoriteCandidates(page.candidates);
    return NextResponse.json({
      ...result,
      nextOffset: page.nextOffset,
      total: page.total,
      playlistId: page.playlistId,
      stats: catalogStats(),
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error && typeof error.status === "number"
        ? error.status
        : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apple Music sync failed." },
      { status: status === 401 || status === 403 ? 401 : 502 }
    );
  }
}
