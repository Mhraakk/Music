/**
 * TASTE AS A POSITION
 *
 * "Favourite styles" in this engine are not genres. They are a centroid in the
 * substrate, the anchors that sit nearest to it, and the artists already in
 * the living catalog who occupy that neighbourhood.
 *
 * A listener with no history inherits the engine's own baseline resonance —
 * the seven aesthetic anchors — rather than the authored catalog's mean,
 * which is noir-heavy and would keep generating the same dark room forever.
 */

import {
  AESTHETIC_ANCHORS,
  AXIS_KEYS,
  centroid,
  clamp01,
  describeVector,
  emotionalDistance,
  vec,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import { nearestCoordinate, type CoordinateId } from "@/lib/drift/topography";
import { driftTrack, type DriftTrack } from "@/lib/drift/catalog";
import type { TasteProfile } from "./types";
import { baselinePrior, normaliseName } from "./project";

function mix(a: EmotionalVector, b: EmotionalVector, t: number): EmotionalVector {
  const k = clamp01(t);
  return vec({
    depth: a.depth * (1 - k) + b.depth * k,
    narrative: a.narrative * (1 - k) + b.narrative * k,
    fragility: a.fragility * (1 - k) + b.fragility * k,
    cinema: a.cinema * (1 - k) + b.cinema * k,
    warmth: a.warmth * (1 - k) + b.warmth * k,
    imperfection: a.imperfection * (1 - k) + b.imperfection * k,
    insistence: a.insistence * (1 - k) + b.insistence * k,
  });
}

export function parseVector(raw: unknown): EmotionalVector | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const partial: Partial<EmotionalVector> = {};
  let seen = 0;
  for (const key of AXIS_KEYS) {
    const n = rec[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      partial[key] = n;
      seen += 1;
    }
  }
  return seen >= 3 ? vec(partial) : null;
}

function vectorsFromHistory(historyIds: string[], supplied: EmotionalVector[]): EmotionalVector[] {
  if (supplied.length) return supplied.slice(-12);
  return historyIds
    .map((id) => driftTrack(id)?.vector)
    .filter((v): v is EmotionalVector => Boolean(v))
    .slice(-12);
}

function nearestAnchors(target: EmotionalVector, n = 3): string[] {
  return AESTHETIC_ANCHORS.slice()
    .sort((a, b) => emotionalDistance(a.vector, target) - emotionalDistance(b.vector, target))
    .slice(0, n)
    .map((a) => a.name);
}

function nearestRegions(target: EmotionalVector, n = 3): CoordinateId[] {
  const here = nearestCoordinate(target).coordinate.id;
  const rest = [
    here,
    ...AESTHETIC_ANCHORS.map((a) => nearestCoordinate(a.vector).coordinate.id),
  ];
  return [...new Set(rest)].slice(0, n);
}

/**
 * Artists already admitted near the taste centroid, closest first. These are
 * the only search probes the engine is willing to send to Apple — artist
 * names, never genre strings.
 */
export function artistsNear(
  target: EmotionalVector,
  pool: readonly DriftTrack[],
  limit = 8
): { artist: string; via: string }[] {
  /**
   * Prefer the authored seed. Harvested neighbours inherit a wandered
   * copy of an anchor vector, so ranking the whole living pool by distance
   * just returns whoever iTunes stuffed into that neighbourhood — including
   * songs that only *share a title* with the artist we meant.
   */
  const seed = pool.filter((t) => t.id.startsWith("l-") || t.id.startsWith("a-"));
  const ranked = (seed.length >= 6 ? seed : pool)
    .map((track) => ({ track, d: emotionalDistance(track.vector, target) }))
    .sort((a, b) => a.d - b.d);

  const seen = new Set<string>();
  const out: { artist: string; via: string }[] = [];
  for (const { track } of ranked) {
    const key = normaliseName(track.artist);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ artist: track.artist, via: track.id });
    if (out.length >= limit) break;
  }
  return out;
}

export function profileTaste(input: {
  historyIds?: string[];
  tasteVectors?: EmotionalVector[];
  libraryVectors?: EmotionalVector[];
  libraryArtists?: { artist: string; via: string }[];
  pool: readonly DriftTrack[];
}): TasteProfile {
  const heard = vectorsFromHistory(input.historyIds ?? [], input.tasteVectors ?? []);
  const library = (input.libraryVectors ?? []).filter((v) => v);
  const centre = library.length
    ? heard.length
      ? mix(centroid(library), centroid(heard), 0.18)
      : centroid(library)
    : heard.length
      ? centroid(heard)
      : baselinePrior();
  const source: TasteProfile["source"] = library.length ? "library" : heard.length ? "history" : "baseline";

  const anchors = nearestAnchors(centre);
  const regions = nearestRegions(centre);
  const nearArtists = artistsNear(centre, input.pool, 10);
  const libraryArtists = input.libraryArtists ?? [];

  const probeArtists = [
    ...libraryArtists,
    ...nearArtists.filter(
      (p) => !libraryArtists.some((l) => normaliseName(l.artist) === normaliseName(p.artist))
    ),
    ...anchors
      .filter(
        (name) =>
          !libraryArtists.some((l) => normaliseName(l.artist) === normaliseName(name)) &&
          !nearArtists.some((p) => normaliseName(p.artist) === normaliseName(name))
      )
      .map((name) => ({ artist: name, via: name })),
  ].slice(0, 10);

  const note = library.length
    ? `Favorite Songs have settled ${describeVector(centre)}, nearest ${anchors[0]}.`
    : heard.length
      ? `Listening has settled ${describeVector(centre)}, nearest ${anchors[0]}.`
      : `No history yet — searching from the engine's own resonance, nearest ${anchors[0]}.`;

  return {
    centroid: centre,
    nearestAnchors: anchors,
    nearestRegions: regions,
    probeArtists,
    source,
    note,
  };
}

/** How well a candidate position sits in the listener's current taste. */
export function tasteFit(vector: EmotionalVector, taste: TasteProfile): number {
  const proximity = 1 - clamp01(emotionalDistance(vector, taste.centroid) / 0.72);
  const region = taste.nearestRegions.includes(nearestCoordinate(vector).coordinate.id) ? 0.12 : 0;
  return clamp01(proximity + region);
}
