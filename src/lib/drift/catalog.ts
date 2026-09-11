/**
 * DE-GENRED CATALOG
 *
 * The upstream catalog (`@/lib/tracks`) carries album, year and cover artwork.
 * None of it survives this boundary. A `DriftTrack` has no genre, no BPM, no
 * popularity rank, no release era and no packaging — it is a position in the
 * substrate plus the two derived retrieval keys, and that is all the MCP is
 * ever shown.
 *
 * Two fields are kept for mechanical rather than editorial reasons:
 *   - `duration`, because the crossfade scheduler has to know when to start.
 *   - `chartGravity`, kept *adversarially*: it is fed to the rejection rules so
 *     commercial brightness can be filtered, and is never a positive signal.
 */

import { TRACKS, type Track, type Vec } from "@/lib/tracks";
import {
  acousticVulnerability,
  cinematicSpace,
  clamp01,
  resonanceScore,
  evaluateRejections,
  vec,
  type CinematicSpaceVector,
  type EmotionalVector,
} from "./ontology";
import { nearestCoordinate, type CoordinateId } from "./topography";
import { overlayMedia } from "@/lib/media";
import { admitCandidate } from "./expansion/admit";
import type { HarvestFile } from "./expansion/types";
import harvest from "./harvest.json";

export type DriftTrack = {
  id: string;
  title: string;
  artist: string;
  /** Seconds. Retained only because the crossfade scheduler needs it. */
  duration: number;
  vector: EmotionalVector;
  /** Acoustic Vulnerability Index — first retrieval key. */
  avi: number;
  /** Cinematic Space Vector — second retrieval key. */
  csv: CinematicSpaceVector;
  /** Adversarial input to the rejection rules. Never rewards a track. */
  chartGravity: number;
  /** Composite admission score in [0,1]. Zero means rejected outright. */
  resonance: number;
  /** Region of the topography this position falls in. */
  region: CoordinateId;
  /** The engine's own one-line justification. */
  note: string;
  /**
   * Provider identifiers are resolved at request time, never baked in.
   * `query` is all the resolver needs; the ids are filled by MusicKit /
   * SoundCloud lookups and cached per-process.
   */
  resolution: {
    query: string;
    appleMusicId: string | null;
    soundcloudUrl: string | null;
  };
};

/**
 * LEGACY PROJECTION
 *
 * The upstream vector is a 6-axis model — dark, warm, organic, energy,
 * mainstream, sad — built for a ranker rather than for emotional structure.
 * Each line below states which upstream signals justify the target axis.
 * This is the only place in the codebase permitted to know the old shape.
 */
export function projectLegacyVector(v: Vec, obscurity: number, duration: number): EmotionalVector {
  // Gravity is darkness and sadness together; either alone is just a colour.
  const depth = v.d * 0.55 + v.s * 0.45;

  // Warmth transfers directly — it is the one axis the old model got right.
  const warmth = v.w;

  // Human imperfection lives in organic performance, and deep-catalog material
  // is far less likely to have been edited flat.
  const imperfection = v.o * 0.74 + obscurity * 0.26;

  // Fragility needs sadness *exposed* by acoustic performance, and it cannot
  // survive high energy — a voice pushed loud is no longer breaking.
  const fragility = clamp01(v.s * 0.5 + v.o * 0.35 + (1 - v.e) * 0.15);

  // Cinematic atmosphere is darkness plus stillness: energy collapses a room.
  const cinema = clamp01(v.d * 0.34 + (1 - v.e) * 0.32 + v.s * 0.22 + obscurity * 0.12);

  // Narrative has no direct upstream analogue, so it is triangulated from the
  // three best proxies available: acoustic performance develops where a loop
  // does not, low energy leaves room to develop, and duration is weak evidence
  // that the piece actually goes somewhere. Deliberately conservative — it is
  // floored at 0.2 rather than 0 so absent evidence never reads as a loop.
  const lengthEvidence = clamp01((duration - 120) / 420);
  const narrative = clamp01(0.2 + v.o * 0.3 + (1 - v.e) * 0.22 + lengthEvidence * 0.28);

  // Insistence is energy that is *not* redeemed by human playing, plus a small
  // penalty for chart gravity, which almost always arrives on the grid.
  const insistence = clamp01(v.e * 0.74 + (1 - v.o) * 0.16 + v.m * 0.1);

  return vec({ depth, narrative, fragility, cinema, warmth, imperfection, insistence });
}

function fromLegacy(t: Track): DriftTrack {
  const vector = projectLegacyVector(t.v, t.obscurity, t.duration);
  return build({
    id: `l-${t.id}`,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    vector,
    chartGravity: t.v.m,
    note: t.why,
  });
}

export function materializeTrack(input: {
  id: string;
  title: string;
  artist: string;
  duration: number;
  vector: EmotionalVector;
  chartGravity: number;
  note: string;
  appleMusicId?: string | null;
}): DriftTrack {
  const { vector } = input;
  return {
    id: input.id,
    title: input.title,
    artist: input.artist,
    duration: input.duration,
    vector,
    avi: acousticVulnerability(vector),
    csv: cinematicSpace(vector),
    chartGravity: input.chartGravity,
    resonance: resonanceScore(vector, input.chartGravity),
    region: nearestCoordinate(vector).coordinate.id,
    note: input.note,
    resolution: {
      query: `${input.artist} ${input.title}`,
      appleMusicId: input.appleMusicId ?? null,
      soundcloudUrl: null,
    },
  };
}

/** @deprecated Use `materializeTrack`. Kept as a local alias for the seed builder. */
const build = materializeTrack;

/**
 * ANCHOR SEEDS
 *
 * The upstream catalog is strong on weighted noir and almost empty on the warm,
 * hand-played end of the engine's baseline resonance. Without these the map has
 * a hole where Dusted Soul should be, and every drift toward warmth terminates
 * early. Vectors are authored directly rather than projected, because there is
 * no upstream row to project from.
 *
 * 16BL calibrates the substrate as an aesthetic anchor without a seed here —
 * anchors are reference positions, not a recommendation quota to fill.
 */
const ANCHOR_SEEDS: readonly Omit<DriftTrack, "avi" | "csv" | "resonance" | "region" | "resolution">[] = [
  {
    id: "a-1",
    title: "Sure Thing",
    artist: "St Germain",
    duration: 380,
    chartGravity: 0.3,
    vector: vec({
      depth: 0.54,
      narrative: 0.72,
      fragility: 0.44,
      cinema: 0.68,
      warmth: 0.9,
      imperfection: 0.86,
      insistence: 0.42,
    }),
    note: "A blues loop given room to breathe by players who refuse the grid",
  },
  {
    id: "a-2",
    title: "So Flute",
    artist: "St Germain",
    duration: 460,
    chartGravity: 0.34,
    vector: vec({
      depth: 0.46,
      narrative: 0.78,
      fragility: 0.38,
      cinema: 0.62,
      warmth: 0.92,
      imperfection: 0.8,
      insistence: 0.5,
    }),
    note: "Body heat and live breath — motion that never becomes a demand",
  },
  {
    id: "a-3",
    title: "Be No One",
    artist: "Charles Webster",
    duration: 420,
    chartGravity: 0.18,
    vector: vec({
      depth: 0.68,
      narrative: 0.66,
      fragility: 0.76,
      cinema: 0.78,
      warmth: 0.78,
      imperfection: 0.58,
      insistence: 0.36,
    }),
    note: "Restraint as the entire arrangement, with a voice left uncovered",
  },
  {
    id: "a-4",
    title: "Indigo Blues",
    artist: "Llorca",
    duration: 355,
    chartGravity: 0.2,
    vector: vec({
      depth: 0.6,
      narrative: 0.64,
      fragility: 0.62,
      cinema: 0.66,
      warmth: 0.84,
      imperfection: 0.74,
      insistence: 0.44,
    }),
    note: "Dusted soul with the hiss deliberately left in the master",
  },
  {
    id: "a-5",
    title: "One Starry Night",
    artist: "Kevin Yost",
    duration: 400,
    chartGravity: 0.14,
    vector: vec({
      depth: 0.5,
      narrative: 0.68,
      fragility: 0.4,
      cinema: 0.64,
      warmth: 0.88,
      imperfection: 0.78,
      insistence: 0.46,
    }),
    note: "Live keys drifting off the click, and nobody corrected it",
  },
] as const;

/**
 * The full de-genred pool, rejected material included. Consumers must filter —
 * `admissiblePool()` is the safe default.
 */
export const DRIFT_CATALOG: readonly DriftTrack[] = [
  ...TRACKS.map(fromLegacy),
  ...ANCHOR_SEEDS.map((seed) => build(seed)),
];

const BY_ID = new Map(DRIFT_CATALOG.map((t) => [t.id, t]));

/** Runtime + harvest admissions. Never mutates the authored seed. */
const extras: DriftTrack[] = [];
const extraById = new Map<string, DriftTrack>();

export function ingestTracks(tracks: readonly DriftTrack[]): number {
  let added = 0;
  for (const track of tracks) {
    if (BY_ID.has(track.id) || extraById.has(track.id)) continue;
    extras.push(track);
    extraById.set(track.id, track);
    added += 1;
  }
  return added;
}

/** Authored seed plus every admitted harvest / expansion track. */
export function livingCatalog(): DriftTrack[] {
  return extras.length ? [...DRIFT_CATALOG, ...extras] : [...DRIFT_CATALOG];
}

export function driftTrack(id: string): DriftTrack | null {
  return BY_ID.get(id) ?? extraById.get(id) ?? null;
}

/** Everything that survives the strict rejection rules, living catalog included. */
export function admissiblePool(extra: readonly DriftTrack[] = []): DriftTrack[] {
  const base = livingCatalog().filter((t) => t.resonance > 0 && !t.id.startsWith("f-"));
  if (!extra.length) return base;
  const seen = new Set(base.map((t) => t.id));
  return extra.filter((t) => t.resonance > 0 && !seen.has(t.id)).concat(base);
}

/** What the rejection rules actually removed, for the health route and the UI. */
export function rejectedPool(): { track: DriftTrack; reason: string; severity: number }[] {
  return livingCatalog()
    .filter((t) => t.resonance === 0)
    .map((t) => {
      const verdict = evaluateRejections(t.vector, t.chartGravity);
      return {
        track: t,
        reason: verdict.violations[0]?.statement ?? "unspecified",
        severity: verdict.severity,
      };
    });
}

export function catalogStats() {
  return {
    seed: DRIFT_CATALOG.length,
    harvested: extras.filter((t) => t.id.startsWith("h-")).length,
    expanded: extras.filter((t) => t.id.startsWith("x-")).length,
    favorites: extras.filter((t) => t.id.startsWith("f-")).length,
    living: DRIFT_CATALOG.length + extras.length,
    admitted: admissiblePool().length,
    refused: rejectedPool().length,
  };
}

/**
 * VOCAL FRAGILITY WINDOWS
 *
 * The drift algorithm weights a volume gesture far more heavily when it lands
 * on an exposed moment, so it needs to know where those moments are. Real onset
 * data would come from an audio-analysis pass; until that exists, windows are
 * derived deterministically from the track's own fragility and narrative so the
 * same track always reports the same moments and the feedback ledger stays
 * reproducible across sessions.
 *
 * Positions are normalised progress in [0,1].
 */
export type FragilityWindow = { start: number; end: number; intensity: number };

export function fragilityWindows(track: DriftTrack): FragilityWindow[] {
  const { fragility, narrative } = track.vector;
  if (fragility < 0.34) return [];

  // A fragile piece that travels exposes itself more than once; a static one
  // has a single sustained centre.
  const count = narrative > 0.66 ? 3 : narrative > 0.44 ? 2 : 1;
  const width = clamp01(0.1 + fragility * 0.12);

  const windows: FragilityWindow[] = [];
  for (let i = 0; i < count; i++) {
    // Centres are spread across the middle 70% — openings and run-outs are
    // rarely where a voice breaks.
    const centre = 0.18 + ((i + 1) / (count + 1)) * 0.64;
    // The later a window falls, the more it tends to carry.
    const intensity = clamp01(fragility * (0.78 + (i / Math.max(1, count - 1 || 1)) * 0.22));
    windows.push({
      start: clamp01(centre - width / 2),
      end: clamp01(centre + width / 2),
      intensity,
    });
  }
  return windows;
}

/** Fragility intensity at a given normalised position, 0 when outside a window. */
export function fragilityAt(track: DriftTrack, progress: number): number {
  for (const w of fragilityWindows(track)) {
    if (progress >= w.start && progress <= w.end) {
      // Triangular falloff so the edges of a window are worth less than its centre.
      const mid = (w.start + w.end) / 2;
      const half = Math.max(1e-6, (w.end - w.start) / 2);
      return clamp01(w.intensity * (1 - Math.abs(progress - mid) / half));
    }
  }
  return 0;
}

/**
 * Flat emotional field for a track, as `r g b`. The Sonic Drift surface renders
 * no album artwork at all — packaging is exactly the kind of skeuomorphic
 * metadata the ontology exists to strip, and a gradient-free flat field is what
 * the design system permits. Warmth drives hue, depth drives descent into black.
 */
export function emotionalField(v: EmotionalVector): string {
  const luminance = 0.1 + (1 - v.depth) * 0.34;
  const warm = v.warmth;
  const r = Math.round(255 * luminance * (0.55 + warm * 0.75));
  const g = Math.round(255 * luminance * (0.5 + warm * 0.34 + v.narrative * 0.1));
  const b = Math.round(255 * luminance * (0.72 - warm * 0.3 + v.cinema * 0.16));
  return `${Math.min(255, r)} ${Math.min(255, g)} ${Math.min(255, b)}`;
}

/**
 * Harvest is identity + media only. Vectors are projected here so a change to
 * the ontology re-admits the same recordings without re-querying Apple.
 */
function ingestHarvest() {
  const file = harvest as HarvestFile;
  for (const candidate of file.candidates ?? []) {
    const admission = admitCandidate(candidate, {
      pool: DRIFT_CATALOG,
      build: materializeTrack,
      idPrefix: "h",
    });
    if (!admission) continue;
    ingestTracks([admission.track]);
    overlayMedia(admission.track.id, admission.media);
  }
}

ingestHarvest();
