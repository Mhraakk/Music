/**
 * EMOTIONAL TOPOGRAPHY
 *
 * There are no playlists in this application. There is a map.
 *
 * A coordinate is a named region of the substrate with a fixed position on a
 * 2D projection the user can actually point at: x is warmth (cold → warm),
 * y is emotional gravity (light → heavy). The projection is for the hand; the
 * full 7-axis vector is what the engine reasons about.
 *
 * Users do not pick a list. They pick an origin and a destination, and the
 * engine computes the drift between them.
 */

import {
  clamp01,
  emotionalDistance,
  evaluateRejections,
  vec,
  type EmotionalVector,
} from "./ontology";

export type CoordinateId =
  | "deep_melancholy"
  | "cinematic_warmth"
  | "fragile_intimacy"
  | "noir_pressure"
  | "dusted_soul"
  | "patient_bloom"
  | "hollow_architecture"
  | "vulnerable_elevation"
  | "submerged_memory";

export type EmotionalCoordinate = {
  id: CoordinateId;
  label: string;
  /** Position on the hand-facing 2D projection, both in [0,1]. */
  x: number;
  y: number;
  /** What the engine is actually aiming at. */
  vector: EmotionalVector;
  /** One sentence, written for a listener rather than an engineer. */
  description: string;
};

/**
 * Nine regions. Every one of them is verified against the rejection rules by
 * `auditTopography` — a destination the engine would itself refuse to play is a
 * bug, not a mood.
 */
export const TOPOGRAPHY: readonly EmotionalCoordinate[] = [
  {
    id: "deep_melancholy",
    label: "Deep Melancholy",
    x: 0.2,
    y: 0.88,
    vector: vec({
      depth: 0.92,
      narrative: 0.56,
      fragility: 0.78,
      cinema: 0.8,
      warmth: 0.3,
      imperfection: 0.62,
      insistence: 0.16,
    }),
    description: "Grief with the lights off. Nothing here is trying to lift you.",
  },
  {
    id: "cinematic_warmth",
    label: "Cinematic Warmth",
    x: 0.82,
    y: 0.6,
    vector: vec({
      depth: 0.68,
      narrative: 0.74,
      fragility: 0.6,
      cinema: 0.9,
      warmth: 0.84,
      imperfection: 0.6,
      insistence: 0.3,
    }),
    description: "A wide room at golden hour. Weight, but weight you can sit inside.",
  },
  {
    id: "fragile_intimacy",
    label: "Fragile Intimacy",
    x: 0.56,
    y: 0.7,
    vector: vec({
      depth: 0.74,
      narrative: 0.5,
      fragility: 0.95,
      cinema: 0.42,
      warmth: 0.62,
      imperfection: 0.82,
      insistence: 0.12,
    }),
    description: "Close-miked and unprotected. You can hear the breath before the note.",
  },
  {
    id: "noir_pressure",
    label: "Noir Pressure",
    x: 0.26,
    y: 0.96,
    vector: vec({
      depth: 0.96,
      narrative: 0.62,
      fragility: 0.5,
      cinema: 0.92,
      warmth: 0.34,
      imperfection: 0.52,
      insistence: 0.38,
    }),
    description: "Bass as architecture. Tension that never once resolves.",
  },
  {
    id: "dusted_soul",
    label: "Dusted Soul",
    x: 0.9,
    y: 0.44,
    vector: vec({
      depth: 0.54,
      narrative: 0.7,
      fragility: 0.46,
      cinema: 0.66,
      warmth: 0.88,
      imperfection: 0.84,
      insistence: 0.46,
    }),
    description: "Live players, tape hiss left in, a pulse that serves the room.",
  },
  {
    id: "patient_bloom",
    label: "Patient Bloom",
    x: 0.62,
    y: 0.36,
    vector: vec({
      depth: 0.48,
      narrative: 0.92,
      fragility: 0.54,
      cinema: 0.76,
      warmth: 0.7,
      imperfection: 0.66,
      insistence: 0.22,
    }),
    description: "Builds without ever forcing a climax. Arrives somewhere else entirely.",
  },
  {
    id: "hollow_architecture",
    label: "Hollow Architecture",
    x: 0.24,
    y: 0.54,
    vector: vec({
      depth: 0.62,
      narrative: 0.48,
      fragility: 0.36,
      cinema: 0.94,
      warmth: 0.26,
      imperfection: 0.44,
      insistence: 0.2,
    }),
    description: "Enormous, unpeopled, structural. Empty is not the same as inert.",
  },
  {
    id: "vulnerable_elevation",
    label: "Vulnerable Elevation",
    x: 0.74,
    y: 0.22,
    vector: vec({
      depth: 0.42,
      narrative: 0.86,
      fragility: 0.8,
      cinema: 0.68,
      warmth: 0.8,
      imperfection: 0.72,
      insistence: 0.26,
    }),
    description: "The rare lift that stays honest. A small voice against large weather.",
  },
  {
    id: "submerged_memory",
    label: "Submerged Memory",
    x: 0.42,
    y: 0.8,
    vector: vec({
      depth: 0.84,
      narrative: 0.44,
      fragility: 0.66,
      cinema: 0.86,
      warmth: 0.48,
      imperfection: 0.9,
      insistence: 0.14,
    }),
    description: "Degrading in real time. Not nostalgia — the process of forgetting.",
  },
] as const;

const BY_ID = new Map<string, EmotionalCoordinate>(TOPOGRAPHY.map((c) => [c.id, c]));

export function coordinate(id: string): EmotionalCoordinate | null {
  return BY_ID.get(id) ?? null;
}

export function coordinateOrDefault(id: string | null | undefined, fallback: CoordinateId): EmotionalCoordinate {
  return (id ? BY_ID.get(id) : null) ?? BY_ID.get(fallback) ?? TOPOGRAPHY[0];
}

/** The coordinate whose vector sits closest to an arbitrary position. */
export function nearestCoordinate(v: EmotionalVector): { coordinate: EmotionalCoordinate; distance: number } {
  let best = TOPOGRAPHY[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of TOPOGRAPHY) {
    const d = emotionalDistance(v, c.vector);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { coordinate: best, distance: bestDist };
}

/**
 * Regions reachable in one lateral step. Used when partial feedback tells the
 * engine to explore sideways rather than deepen or retreat.
 *
 * Adjacency is measured in the substrate, not on the 2D projection, so two
 * regions that look far apart on screen can still be neighbours if the music
 * between them actually connects.
 */
export function adjacentCoordinates(id: string, count = 3): EmotionalCoordinate[] {
  const origin = BY_ID.get(id);
  if (!origin) return [];
  return TOPOGRAPHY.filter((c) => c.id !== origin.id)
    .map((c) => ({ c, d: emotionalDistance(origin.vector, c.vector) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.c);
}

/** Project an arbitrary substrate position onto the hand-facing 2D map. */
export function projectToMap(v: EmotionalVector): { x: number; y: number } {
  return { x: clamp01(v.warmth), y: clamp01(v.depth) };
}

/**
 * Every coordinate must be a place the engine would willingly play. Exported so
 * the check can run in a test or a health route rather than living as a comment.
 */
export function auditTopography(): { id: CoordinateId; ok: boolean; severity: number; worst: string | null }[] {
  return TOPOGRAPHY.map((c) => {
    const verdict = evaluateRejections(c.vector, 0);
    return {
      id: c.id,
      ok: !verdict.rejected,
      severity: verdict.severity,
      worst: verdict.violations[0]?.id ?? null,
    };
  });
}
