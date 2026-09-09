/**
 * KIN — same person, then people next to them.
 *
 * Apple Music / iTunes for the named artist. Deezer related-artists for kin.
 * Never invent names: every card is a recording those APIs actually returned.
 */

import type { LibraryTrack } from "@/lib/library";
import { findMusic } from "./anywhere";

type DeezerArtist = { id?: number; name?: string };

async function deezerJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "ResonantAsk/1.0" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function relatedArtistNames(artist: string): Promise<string[]> {
  const search = (await deezerJson(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}&limit=3`
  )) as { data?: DeezerArtist[] } | null;
  const seed = (search?.data ?? []).find((row) =>
    (row.name ?? "").toLowerCase().includes(artist.toLowerCase().slice(0, 8))
  ) ?? search?.data?.[0];
  if (!seed?.id) return [];
  const related = (await deezerJson(`https://api.deezer.com/artist/${seed.id}/related?limit=6`)) as
    | { data?: DeezerArtist[] }
    | null;
  return (related?.data ?? [])
    .map((row) => (typeof row.name === "string" ? row.name : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function merge(tracks: LibraryTrack[]): LibraryTrack[] {
  const seen = new Set<string>();
  const out: LibraryTrack[] = [];
  for (const track of tracks) {
    const key = `${track.artist}::${track.title}`.toLowerCase();
    if (seen.has(key) || seen.has(track.id)) continue;
    seen.add(key);
    seen.add(track.id);
    out.push(track);
  }
  return out;
}

export async function findRelated(input: {
  artist: string;
  title?: string;
  limit?: number;
}): Promise<LibraryTrack[]> {
  const artist = input.artist.trim();
  if (!artist) return [];
  const cap = Math.max(6, Math.min(12, input.limit ?? 8));

  const own = await findMusic(artist, cap, { appleOnly: true, attachVideo: true, artistFocus: true });
  const kinNames = await relatedArtistNames(artist);
  const kinGroups = await Promise.all(
    kinNames.slice(0, 3).map((name) =>
      findMusic(name, 4, { appleOnly: true, attachVideo: false, artistFocus: true })
    )
  );

  const ownFirst = own.map((t) => ({
    ...t,
    note: `More from ${artist} on Apple Music`,
  }));
  const kin = kinGroups.flat().map((t) => ({
    ...t,
    note: `Kin of ${artist} on Apple Music`,
  }));

  return merge([...ownFirst, ...kin]).slice(0, cap);
}
