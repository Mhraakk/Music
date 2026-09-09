/**
 * CIRCULATION
 *
 * The Favorite Songs library is too large to dump onto the wall. It rotates:
 * a time-sliced window of loved recordings, mixed with the engine's calibration
 * set, so the discover surface keeps moving through tens of thousands of
 * positions without pretending they are a playlist.
 */

import { colorDistance, hexToRgb, rgbToHsl } from "@/lib/media";
import type { LibraryTrack } from "@/lib/library";
import type { EmotionalVector } from "@/lib/drift/ontology";
import { centroid } from "@/lib/drift/ontology";

const WINDOW_MS = 15 * 60 * 1000;

export function circulateFavorites(
  favorites: readonly LibraryTrack[],
  take = 72,
  now = Date.now()
): LibraryTrack[] {
  const playable = favorites.filter((t) => t.artworkUrl);
  if (!playable.length) return [];
  const slice = Math.floor(now / WINDOW_MS);
  const start = (slice * 31) % playable.length;
  const rotated = playable.slice(start).concat(playable.slice(0, start));
  return rotated.slice(0, Math.min(take, rotated.length));
}

export function sampleTasteVectors(favorites: readonly LibraryTrack[], n = 128): EmotionalVector[] {
  if (!favorites.length) return [];
  if (favorites.length <= n) return favorites.map((t) => t.vector);
  const step = favorites.length / n;
  const out: EmotionalVector[] = [];
  for (let i = 0; i < n; i++) out.push(favorites[Math.floor(i * step)].vector);
  return out;
}

export function favoriteArtistProbes(
  favorites: readonly LibraryTrack[],
  limit = 10
): { artist: string; via: string }[] {
  const counts = new Map<string, { artist: string; n: number; via: string }>();
  for (const track of favorites) {
    const key = track.artist.trim().toLowerCase();
    if (!key) continue;
    const cur = counts.get(key);
    if (cur) cur.n += 1;
    else counts.set(key, { artist: track.artist, n: 1, via: track.id });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((row) => ({ artist: row.artist, via: row.via }));
}

export function libraryCentroid(favorites: readonly LibraryTrack[]): EmotionalVector | null {
  const sample = sampleTasteVectors(favorites);
  return sample.length ? centroid(sample) : null;
}

export function searchFavorites(favorites: readonly LibraryTrack[], query: string, limit = 72): LibraryTrack[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return favorites
    .map((track) => {
      const fields: [string, number][] = [
        [track.title.toLowerCase(), 4],
        [track.artist.toLowerCase(), 4],
        [(track.album ?? "").toLowerCase(), 2],
        [track.region.replace(/_/g, " "), 2.5],
        [track.shape.toLowerCase(), 2],
        [track.note.toLowerCase(), 1],
      ];
      let score = 0;
      for (const term of terms) {
        for (const [text, weight] of fields) {
          if (!text) continue;
          if (text === term) score += weight * 2;
          else if (text.startsWith(term)) score += weight * 1.4;
          else if (text.includes(term)) score += weight;
        }
      }
      return { track, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.track);
}

export function colorRankFavorites(favorites: readonly LibraryTrack[], hex: string, limit = 72): LibraryTrack[] {
  const target = rgbToHsl(hexToRgb(hex));
  return favorites
    .map((track) => ({ track, d: colorDistance(target, track.searchHsl) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.track);
}
