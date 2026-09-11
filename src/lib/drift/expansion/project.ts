/**
 * EMOTIONAL PROJECTION
 *
 * The living catalog cannot be hand-authored. Every new recording has to land
 * on the same seven axes the rest of the engine already reasons about, and it
 * has to land there without introducing a genre field.
 *
 * Two signals are allowed, and both are acoustic or structural:
 *
 *   1. NEIGHBORHOOD — the substrate position of the artist (or the aesthetic
 *      anchor) we searched to find this recording. A Portishead-adjacent
 *      search starts near Portishead; it does not start at "trip hop".
 *   2. AUDIO FEATURES — loudness, silence, spectrum, onset density, derived
 *      from the 30-second preview when ffmpeg can hear it.
 *
 * Duration is weak narrative evidence, the same way the legacy projection uses
 * it. Commercial-looking album titles feed `chartGravity` adversarially.
 * Nothing here is stored as a tag.
 */

import {
  AESTHETIC_ANCHORS,
  AXIS_KEYS,
  centroid,
  clamp01,
  vec,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import type { DriftTrack } from "@/lib/drift/catalog";
import type { AudioFeatures, ExternalCandidate } from "./types";

export function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function normaliseName(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripFeat(name: string): string {
  return name.replace(/\s+(feat\.?|featuring|ft\.?|with)\s+.*/i, "").trim();
}

/**
 * Whether an iTunes hit is actually by the artist we searched. A search for
 * "Tricky" otherwise returns every song *titled* Tricky — Crazy Frog included.
 * Short names ("Air", "Lamb") must match exactly; longer names may appear
 * inside a collaboration credit.
 */
export function artistAgrees(probe: string, result: string): boolean {
  const a = normaliseName(stripFeat(probe));
  const b = normaliseName(stripFeat(result));
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 5) return false;
  const at = a.split(" ");
  const bt = b.split(" ");
  return at.every((token) => bt.includes(token));
}

/** The engine's own resonance — used when a candidate has no neighborhood. */
export function baselinePrior(): EmotionalVector {
  return centroid(AESTHETIC_ANCHORS.map((a) => a.vector));
}

/**
 * Deterministic wander so twenty recordings by one artist do not collapse to
 * a single point. Amount is small: neighborhood must still dominate.
 */
export function wander(v: EmotionalVector, seed: string, amount = 0.08): EmotionalVector {
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) {
    const j = (hash01(`${seed}:${key}`) - 0.5) * 2 * amount;
    out[key] = clamp01(v[key] + j);
  }
  return out;
}

export function blendVectors(a: EmotionalVector, b: EmotionalVector, t: number): EmotionalVector {
  const k = clamp01(t);
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) out[key] = clamp01(a[key] + (b[key] - a[key]) * k);
  return out;
}

/**
 * Map preview-level audio features onto the substrate. The ranges are those of
 * a 30-second AAC, not a mastered album, so the function is conservative —
 * features nudge a neighborhood rather than inventing a personality from a
 * clip that may be the loudest or quietest 30 seconds of the piece.
 */
export function projectFromFeatures(features: AudioFeatures): EmotionalVector {
  const quiet = clamp01((-features.integratedLoudness - 10) / 20);
  const open = clamp01(features.loudnessRange / 14);
  const punch = clamp01(1 - features.dynamicRange / 18);
  const empty = clamp01(features.silenceRatio / 0.35);
  const dark = clamp01(1 - (features.spectralCentroid - 400) / 2800);
  const noise = clamp01(features.spectralFlatness);
  const motion = clamp01(features.spectralFlux);
  const bass = clamp01(features.bassRatio / 0.55);
  const air = clamp01(features.highRatio / 0.35);
  const pulsed = clamp01(features.onsetDensity / 6);
  const lengthEvidence = clamp01((features.durationSec - 120) / 420);

  return vec({
    depth: clamp01(dark * 0.38 + bass * 0.28 + quiet * 0.2 + empty * 0.14),
    narrative: clamp01(0.2 + motion * 0.36 + open * 0.2 + lengthEvidence * 0.24),
    fragility: clamp01(air * 0.28 + quiet * 0.26 + empty * 0.22 + (1 - pulsed) * 0.24),
    cinema: clamp01(empty * 0.34 + open * 0.26 + dark * 0.22 + (1 - pulsed) * 0.18),
    warmth: clamp01((1 - dark) * 0.22 + (1 - air) * 0.28 + (1 - quiet) * 0.18 + (1 - noise) * 0.16 + 0.16),
    imperfection: clamp01(noise * 0.38 + open * 0.28 + (1 - punch) * 0.34),
    insistence: clamp01(pulsed * 0.46 + punch * 0.22 + (1 - empty) * 0.2 + (1 - quiet) * 0.12),
  });
}

export type Neighborhood = {
  vector: EmotionalVector;
  source: "artist" | "probe" | "anchor" | "baseline";
  label: string;
};

function artistMatches(trackArtist: string, query: string): boolean {
  const a = normaliseName(trackArtist);
  const b = normaliseName(query);
  if (!a || !b) return false;
  if (a === b) return true;
  // "Bohren" matches "Bohren & der Club of Gore"; not the reverse unless short.
  if (a.includes(b) && b.length >= 4) return true;
  if (b.includes(a) && a.length >= 4) return true;
  return false;
}

/**
 * Find the authored (or already-living) positions that this candidate is
 * allowed to sit near. Artist first, then the probe that found it, then a
 * named aesthetic anchor, then the engine baseline.
 */
export function findNeighborhood(
  candidate: ExternalCandidate,
  pool: readonly DriftTrack[]
): Neighborhood {
  const sameArtist = pool.filter((t) => artistMatches(t.artist, candidate.artist));
  if (sameArtist.length) {
    return {
      vector: centroid(sameArtist.map((t) => t.vector)),
      source: "artist",
      label: candidate.artist,
    };
  }

  const probeArtist = pool.filter((t) => artistMatches(t.artist, candidate.probeArtist));
  if (probeArtist.length) {
    return {
      vector: centroid(probeArtist.map((t) => t.vector)),
      source: "probe",
      label: candidate.probeArtist,
    };
  }

  const viaTrack = pool.find((t) => t.id === candidate.probeVia);
  if (viaTrack) {
    return { vector: viaTrack.vector, source: "probe", label: viaTrack.artist };
  }

  const viaAnchor = AESTHETIC_ANCHORS.find(
    (a) => normaliseName(a.name) === normaliseName(candidate.probeVia)
  );
  if (viaAnchor) {
    return { vector: viaAnchor.vector, source: "anchor", label: viaAnchor.name };
  }

  return { vector: baselinePrior(), source: "baseline", label: "engine baseline" };
}

export type Projection = {
  vector: EmotionalVector;
  method: "neighborhood" | "features" | "blend" | "baseline";
  neighborhood: Neighborhood;
};

/**
 * Produce a substrate position for a candidate. Features, when present, are
 * blended in at 0.42 so a preview can disagree with its neighborhood without
 * being able to invent a completely different record.
 */
export function projectCandidate(
  candidate: ExternalCandidate,
  pool: readonly DriftTrack[],
  features: AudioFeatures | null
): Projection {
  const neighborhood = findNeighborhood(candidate, pool);
  const durationSec = candidate.durationMs > 0 ? candidate.durationMs / 1000 : 240;
  const lengthEvidence = clamp01((durationSec - 120) / 420);

  const seeded = wander(
    vec({
      ...neighborhood.vector,
      narrative: clamp01(neighborhood.vector.narrative * 0.72 + (0.2 + lengthEvidence * 0.28) * 0.28),
    }),
    candidate.appleTrackId,
    neighborhood.source === "baseline" ? 0.12 : 0.07
  );

  if (features) {
    const heard = projectFromFeatures({ ...features, durationSec });
    const mixed = blendVectors(seeded, heard, neighborhood.source === "baseline" ? 0.62 : 0.42);
    return {
      vector: mixed,
      method: neighborhood.source === "baseline" ? "features" : "blend",
      neighborhood,
    };
  }

  return {
    vector: seeded,
    method: neighborhood.source === "baseline" ? "baseline" : "neighborhood",
    neighborhood,
  };
}

/**
 * Commercial gravity, used only by the rejection rules. Apple does not give us
 * a popularity rank on the unauthenticated search endpoint, so the signal is
 * inferred from packaging language that almost always arrives with chart
 * product — and stays low for everything else.
 */
export function chartGravityFor(candidate: ExternalCandidate): number {
  const pack = `${candidate.album ?? ""} ${candidate.title}`.toLowerCase();
  if (/greatest hits|now that's|party anthem|radio edit|deluxe edition/.test(pack)) return 0.62;
  if (/soundtrack|ost|theme from/.test(pack)) return 0.34;
  if (/live at|unplugged|demo|session|rehearsal/.test(pack)) return 0.12;
  return 0.16;
}

/** Recordings the engine should not even attempt to project. */
export function isUnprojectable(candidate: ExternalCandidate): boolean {
  const title = candidate.title.toLowerCase();
  if (
    /karaoke|tribute to|originally performed|ringtone|8-bit|8 bit|midi version|sped up|slowed|nightcore|tiktok/.test(
      title
    )
  ) {
    return true;
  }
  const seconds = candidate.durationMs / 1000;
  if (seconds > 0 && (seconds < 70 || seconds > 22 * 60)) return true;
  return false;
}
