/**
 * Browser-only handle to the circulating Favorite Songs window.
 * PlayerProvider sits above LibraryProvider, so the overlay is published
 * here rather than passed through React.
 */

import type { LibraryTrack } from "@/lib/library";
import type { FavoriteOverlay } from "./overlay";

let circulating: LibraryTrack[] = [];

export function publishCirculating(tracks: LibraryTrack[]): void {
  circulating = tracks;
}

export function publishedCirculating(): LibraryTrack[] {
  return circulating;
}

export function compactOverlay(tracks: LibraryTrack[] = circulating): FavoriteOverlay[] {
  return tracks.slice(0, 72).map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    vector: track.vector,
    note: track.note,
    appleMusicId: track.id.startsWith("f-") ? track.id.slice(2) : null,
  }));
}
