/**
 * Browser-only handle to the circulating Favorite Songs window.
 * PlayerProvider sits above LibraryProvider, so the overlay is published
 * here rather than passed through React.
 */

import type { LibraryTrack } from "@/lib/library";
import type { FavoriteOverlay } from "./overlay";

let circulating: LibraryTrack[] = [];
let loved: LibraryTrack[] = [];

export function publishCirculating(tracks: LibraryTrack[]): void {
  circulating = tracks;
}

export function publishLoved(tracks: LibraryTrack[]): void {
  loved = tracks;
}

export function publishedCirculating(): LibraryTrack[] {
  return circulating;
}

function withLovedNote(track: LibraryTrack): LibraryTrack {
  if (track.note.includes("Loved on Resonant")) return track;
  return { ...track, note: track.note ? `${track.note} · Loved on Resonant` : "Loved on Resonant" };
}

export function compactOverlay(tracks: LibraryTrack[] = circulating): FavoriteOverlay[] {
  const map = new Map<string, LibraryTrack>();
  for (const track of loved) map.set(track.id, withLovedNote(track));
  for (const track of tracks) {
    if (!map.has(track.id)) map.set(track.id, track);
  }
  return [...map.values()].slice(0, 72).map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    vector: track.vector,
    note: track.note,
    appleMusicId: track.id.startsWith("f-")
      ? track.id.slice(2)
      : track.id.startsWith("w-it-")
        ? track.id.slice(5)
        : null,
  }));
}
