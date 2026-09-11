/**
 * JOYFUL — LITTLE GOLDS
 *
 * Not a tenth map room and not a happy-hits playlist. Joyful is a coded
 * neighbourhood: analog heat, morning light, dusted soul. Festival-hot
 * insistence is already refused by the ontology. Hearts pull the gold toward
 * whatever warmth this listener actually marked.
 *
 * Client-safe: ranking only. Apple harvest lives in joyful-harvest.ts.
 */

import { emotionalDistance, vec, type EmotionalVector } from "@/lib/drift/ontology";
import type { LibraryTrack } from "@/lib/library";
import type { CoordinateId } from "@/lib/drift/topography";
import { tasteScore, type TasteSnapshot, type TasteWire } from "./memory";

/** Morning gold. Warmth-forward, moderate depth, low insistence. */
export const JOYFUL_VECTOR: EmotionalVector = vec({
  depth: 0.42,
  narrative: 0.58,
  fragility: 0.38,
  cinema: 0.62,
  warmth: 0.86,
  imperfection: 0.48,
  insistence: 0.34,
});

/** Warm rooms the harvest walks. Still nine coordinates on the map. */
export const JOYFUL_ROOMS: readonly CoordinateId[] = [
  "cinematic_warmth",
  "dusted_soul",
  "patient_bloom",
];

export function joyfulDistance(vector: EmotionalVector, memory?: TasteSnapshot | TasteWire | null): number {
  const gold = emotionalDistance(vector, JOYFUL_VECTOR);
  if (!memory?.centroid) return gold;
  const personal = emotionalDistance(vector, memory.centroid);
  return gold * 0.65 + personal * 0.35;
}

export function rankJoyful(
  tracks: readonly LibraryTrack[],
  opts: {
    memory?: TasteSnapshot | TasteWire | null;
    excludeIds?: Iterable<string>;
    limit?: number;
  } = {}
): LibraryTrack[] {
  const exclude = new Set(opts.excludeIds ?? []);
  const limit = Math.max(4, Math.min(24, opts.limit ?? 8));
  return tracks
    .filter((track) => !exclude.has(track.id) && track.vector.warmth >= 0.42 && track.vector.insistence <= 0.62)
    .map((track) => ({
      track,
      d: joyfulDistance(track.vector, opts.memory),
      fit: tasteScore(track.vector, opts.memory, track.artist),
    }))
    .sort((a, b) => a.d - 0.28 * a.fit - (b.d - 0.28 * b.fit))
    .slice(0, limit)
    .map((row) => row.track);
}
