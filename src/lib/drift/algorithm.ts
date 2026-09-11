/**
 * THE DRIFT ALGORITHM
 *
 * There is no next button and no shuffle. A session is a continuous trajectory
 * through the substrate: the listener names an origin and a destination, and the
 * engine computes the arc between them — then keeps rewriting the unplayed part
 * of that arc from implicit behaviour.
 *
 * Three properties are enforced rather than hoped for:
 *
 *   1. SEAMLESSNESS. Consecutive phases are distance-capped, so the arc never
 *      jumps somewhere the crossfade could not honestly cover.
 *   2. TRANSIT DEPTH. The path bows. You cannot travel from Deep Melancholy to
 *      Cinematic Warmth in a straight line without passing through something
 *      shallower than both, so the arc deliberately descends before it arrives.
 *   3. MUTABILITY. Only phases that have not been heard yet are rewritten.
 *      History is never retconned.
 */

import {
  AXIS_KEYS,
  anchorAlignment,
  acousticVulnerability,
  cinematicSpace,
  cinematicMagnitude,
  clamp01,
  describeVector,
  emotionalDistance,
  lerpVector,
  nudge,
  vec,
  type EmotionalVector,
} from "./ontology";
import {
  TOPOGRAPHY,
  adjacentCoordinates,
  coordinateOrDefault,
  nearestCoordinate,
  type CoordinateId,
  type EmotionalCoordinate,
} from "./topography";
import { admissiblePool, type DriftTrack } from "./catalog";
import type { ResonanceMode, ResonanceReading } from "./resonance";

export const MIN_ARC = 5;
export const MAX_ARC = 7;

/** Largest emotional distance a single crossfade is allowed to cover. */
const SEAM_LIMIT = 0.34;

export type PhaseChapter = "depart" | "descend" | "transit" | "surface" | "arrive";

export type DriftPhase = {
  index: number;
  /** The position in the substrate this phase aims at. */
  target: EmotionalVector;
  /** Region of the topography the target falls in. */
  region: CoordinateId;
  /** The track that best occupies the target. */
  trackId: string;
  artist: string;
  title: string;
  chapter: PhaseChapter;
  /** Why this phase exists, in the engine's voice. */
  intent: string;
  /** Emotional distance from the previous phase. 0 for the first. */
  step: number;
  /** Retrieval keys for the chosen track, echoed for the client and the MCP. */
  keys: { avi: number; cinematicMagnitude: number };
};

export type BranchStatus = "open" | "deepened" | "pruned";

export type BranchState = Partial<Record<CoordinateId, { status: BranchStatus; visits: number }>>;

export type DriftArc = {
  id: string;
  origin: CoordinateId;
  destination: CoordinateId;
  phases: DriftPhase[];
  /** One paragraph the UI can print verbatim. */
  narrative: string;
  /** Which cognition produced it. */
  source: "gemini-mcp" | "local-cognition";
};

/* ────────────────────────────── ARC GEOMETRY ────────────────────────────── */

/**
 * Longer emotional journeys need more phases. Five tracks is enough to move
 * between neighbouring regions; crossing the map takes seven.
 */
export function arcLength(origin: EmotionalVector, destination: EmotionalVector): number {
  const d = emotionalDistance(origin, destination);
  const n = Math.round(MIN_ARC + clamp01(d / 0.55) * (MAX_ARC - MIN_ARC));
  return Math.min(MAX_ARC, Math.max(MIN_ARC, n));
}

/**
 * Smoothstep, so departure and arrival are both gentle. A linear parameter
 * would make the first transition the harshest one in the arc.
 */
function ease(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * The bow. Zero at both ends, maximal in the middle, scaled by how far the arc
 * has to travel — a short drift barely dips, a cross-map drift goes properly
 * under. `deepen` tightens the bow because the listener is already resonating
 * with where they are; `prune` widens it to get out of the current zone faster.
 */
function bowAmount(distance: number, mode: ResonanceMode): number {
  const base = clamp01(distance / 0.7) * 0.22;
  if (mode === "deepen") return base * 0.55;
  if (mode === "prune") return base * 1.35;
  return base;
}

function chapterFor(index: number, count: number): PhaseChapter {
  if (index === 0) return "depart";
  if (index === count - 1) return "arrive";
  const t = index / (count - 1);
  if (t < 0.36) return "descend";
  if (t < 0.68) return "transit";
  return "surface";
}

/**
 * Sequence of substrate positions from origin to destination. This is the whole
 * of the "playlist" concept in this application: a curve, not a list.
 */
export function driftTargets(
  origin: EmotionalVector,
  destination: EmotionalVector,
  count: number,
  mode: ResonanceMode = "explore"
): EmotionalVector[] {
  const distance = emotionalDistance(origin, destination);
  const bow = bowAmount(distance, mode);
  const out: EmotionalVector[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 1 : i / (count - 1);
    const base = lerpVector(origin, destination, ease(t));
    const dip = Math.sin(Math.PI * t);

    out.push(
      vec({
        ...base,
        // Transit runs deeper, wider and stiller than either endpoint.
        depth: base.depth + dip * bow,
        cinema: base.cinema + dip * bow * 0.8,
        insistence: base.insistence - dip * bow * 0.9,
        // Fragility is allowed to open up mid-arc; it is the axis the engine is
        // ultimately hunting for, and the middle of a drift is where a listener
        // is least defended.
        fragility: base.fragility + dip * bow * 0.55,
      })
    );
  }
  return out;
}

/* ───────────────────────────── TRACK SELECTION ───────────────────────────── */

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export type SelectionContext = {
  target: EmotionalVector;
  /** Previously chosen track, for the seamlessness cap. */
  previous: DriftTrack | null;
  /**
   * Where the arc is ultimately going. Used for radial fit, which is what stops
   * a strongly-resonant track from winning a phase it is pointing away from.
   */
  destination?: EmotionalVector | null;
  used: Set<string>;
  usedArtists: Set<string>;
  branches: BranchState;
  seed: string;
  pool: DriftTrack[];
};

export type ScoredCandidate = { track: DriftTrack; score: number; breakdown: Record<string, number> };

/**
 * Candidate scoring. Note what is absent: no genre match, no BPM proximity, no
 * popularity term, no recency-of-release term. The only inputs are position in
 * the substrate, the two retrieval keys, alignment with the baseline resonance,
 * and structural constraints on the arc.
 */
export function scoreCandidate(track: DriftTrack, ctx: SelectionContext): ScoredCandidate {
  const targetAvi = acousticVulnerability(ctx.target);
  const targetCsv = cinematicMagnitude(cinematicSpace(ctx.target));

  const proximity = 1 - clamp01(emotionalDistance(track.vector, ctx.target) / 0.8);
  const aviFit = 1 - Math.abs(track.avi - targetAvi);
  const csvFit = 1 - Math.abs(cinematicMagnitude(track.csv) - targetCsv);
  const anchor = anchorAlignment(track.vector).alignment;

  const breakdown: Record<string, number> = {
    proximity: proximity * 4.0,
    aviFit: aviFit * 1.5,
    csvFit: csvFit * 1.1,
    anchor: anchor * 1.2,
    resonance: track.resonance * 1.35,
  };

  /**
   * Loved recordings are the listener's own backbone, not a popularity term.
   * When the circulating Favorite Songs window is in the pool, a nearby loved
   * position wins a close call against the calibration catalog.
   */
  if (track.id.startsWith("f-") || (typeof track.note === "string" && track.note.includes("Loved on Resonant"))) {
    breakdown.loved = 1.15;
  }

  /**
   * RADIAL FIT
   *
   * Proximity alone is not enough. A track with high baseline resonance can win
   * a phase on its anchor and resonance bonuses while sitting on the far side of
   * the map from where the arc is heading — which reads to a listener as the
   * drift going backwards.
   *
   * The fix is to measure against the *target's* own distance from the
   * destination rather than the destination directly, so this stays compatible
   * with the bow: mid-arc the target is deliberately far from the destination,
   * and a candidate that is also far is therefore correct. Near arrival the
   * target is close, and a distant candidate is penalised hard.
   */
  if (ctx.destination) {
    const targetRadius = emotionalDistance(ctx.target, ctx.destination);
    const candidateRadius = emotionalDistance(track.vector, ctx.destination);
    breakdown.radialFit = -Math.abs(candidateRadius - targetRadius) * 3.4;
  }

  // Seamlessness: a candidate further than the seam limit from the outgoing
  // track is heavily discouraged, because no crossfade would make it honest.
  if (ctx.previous) {
    const jump = emotionalDistance(track.vector, ctx.previous.vector);
    breakdown.seam = jump > SEAM_LIMIT ? -(jump - SEAM_LIMIT) * 6.5 : (SEAM_LIMIT - jump) * 0.9;
  }

  const branch = ctx.branches[track.region];
  if (branch?.status === "pruned") breakdown.pruned = -4.2;
  else if (branch?.status === "deepened") breakdown.deepened = 1.1;

  if (ctx.used.has(track.id)) breakdown.repeat = -50;
  if (ctx.usedArtists.has(track.artist.toLowerCase())) breakdown.sameArtist = -2.6;

  // Deterministic jitter keyed to the session, so two listeners asking for the
  // same drift do not get an identical arc, but a reload does.
  breakdown.jitter = (hash01(track.id + ctx.seed) - 0.5) * 0.55;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { track, score, breakdown };
}

export function selectForTarget(ctx: SelectionContext): ScoredCandidate | null {
  const ranked = ctx.pool
    .map((t) => scoreCandidate(t, ctx))
    .sort((a, b) => b.score - a.score);

  const fresh = ranked.find((c) => !ctx.used.has(c.track.id));
  return fresh ?? ranked[0] ?? null;
}

function intentFor(chapter: PhaseChapter, target: EmotionalVector, track: DriftTrack): string {
  const shape = describeVector(target);
  switch (chapter) {
    case "depart":
      return `Opening where you already are — ${shape}. ${track.note}`;
    case "descend":
      return `Going under before going across — ${shape}. ${track.note}`;
    case "transit":
      return `Deepest point of the drift — ${shape}. ${track.note}`;
    case "surface":
      return `Coming up toward the destination — ${shape}. ${track.note}`;
    case "arrive":
      return `Landing — ${shape}. ${track.note}`;
  }
}

/* ─────────────────────────────── PLANNING ─────────────────────────────── */

export type PlanInput = {
  origin: CoordinateId | string;
  destination: CoordinateId | string;
  /** Session identifier, used only for deterministic jitter. */
  seed?: string;
  /** Tracks already heard this session, excluded from the arc. */
  exclude?: string[];
  branches?: BranchState;
  mode?: ResonanceMode;
  length?: number;
  /** Per-request Favorite Songs window. Never written into the shared catalog. */
  overlay?: readonly DriftTrack[];
};

export function planDrift(input: PlanInput): DriftArc {
  const originCoord = coordinateOrDefault(input.origin, "deep_melancholy");
  const destCoord = coordinateOrDefault(input.destination, "cinematic_warmth");
  const mode = input.mode ?? "explore";
  const seed = input.seed ?? "drift";
  const branches = input.branches ?? {};

  const count = input.length
    ? Math.min(MAX_ARC, Math.max(MIN_ARC, input.length))
    : arcLength(originCoord.vector, destCoord.vector);

  const targets = driftTargets(originCoord.vector, destCoord.vector, count, mode);
  const pool = admissiblePool(input.overlay);
  const used = new Set(input.exclude ?? []);
  const usedArtists = new Set<string>();

  const phases: DriftPhase[] = [];
  let previous: DriftTrack | null = null;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const picked = selectForTarget({
      target,
      previous,
      destination: destCoord.vector,
      used,
      usedArtists,
      branches,
      seed: `${seed}:${i}`,
      pool,
    });
    if (!picked) break;

    const track = picked.track;
    used.add(track.id);
    usedArtists.add(track.artist.toLowerCase());

    phases.push({
      index: i,
      target,
      region: nearestCoordinate(target).coordinate.id,
      trackId: track.id,
      artist: track.artist,
      title: track.title,
      chapter: chapterFor(i, targets.length),
      intent: intentFor(chapterFor(i, targets.length), target, track),
      step: previous ? emotionalDistance(track.vector, previous.vector) : 0,
      keys: { avi: track.avi, cinematicMagnitude: cinematicMagnitude(track.csv) },
    });
    previous = track;
  }

  return {
    id: `arc_${seed}_${phases.length}`,
    origin: originCoord.id,
    destination: destCoord.id,
    phases,
    narrative: narrate(originCoord, destCoord, phases, mode),
    source: "local-cognition",
  };
}

function narrate(
  origin: EmotionalCoordinate,
  destination: EmotionalCoordinate,
  phases: DriftPhase[],
  mode: ResonanceMode
): string {
  if (phases.length === 0) return "No admissible path — every candidate was refused by the rejection rules.";
  const deepest = phases.reduce((a, b) => (b.target.depth > a.target.depth ? b : a));
  const modeLine =
    mode === "deepen"
      ? "Tightened, because you are resonating with where you already are."
      : mode === "prune"
        ? "Widened, because the last branch was not landing."
        : "Neutral width — the engine is still reading you.";
  return (
    `${phases.length} phases from ${origin.label} to ${destination.label}. ` +
    `The path bows through ${deepest.region.replace(/_/g, " ")} at its deepest point rather than ` +
    `travelling straight, because the straight line between these two feelings does not exist. ${modeLine}`
  );
}

/* ────────────────────────── MID-FLIGHT REDIRECTION ────────────────────────── */

export type RedirectInput = {
  arc: DriftArc;
  /** Index of the phase currently sounding. Everything at or below is immutable. */
  playingIndex: number;
  reading: ResonanceReading;
  branches?: BranchState;
  exclude?: string[];
  seed?: string;
};

export type RedirectResult = {
  arc: DriftArc;
  branches: BranchState;
  /** What the engine decided and why, for the UI. */
  decision: string;
};

/**
 * Rewrite the unheard tail of an arc from a resonance reading.
 *
 *   deepen  — pull the remaining targets back toward what is currently working
 *             and shorten the remaining travel.
 *   prune   — mark the current region refused and push the tail toward the
 *             furthest admissible neighbour.
 *   explore — retarget the tail at an adjacent region instead of the original
 *             destination.
 */
export function redirectDrift(input: RedirectInput): RedirectResult {
  const { arc, reading } = input;
  const branches: BranchState = { ...(input.branches ?? {}) };
  const playingIndex = Math.max(0, Math.min(input.playingIndex, arc.phases.length - 1));
  const current = arc.phases[playingIndex];

  if (!current) {
    return { arc, branches, decision: "Nothing sounding — arc unchanged." };
  }

  const heard = arc.phases.slice(0, playingIndex + 1);
  const remaining = arc.phases.length - heard.length;
  const currentRegion = current.region;
  const prior = branches[currentRegion];

  let destination: EmotionalCoordinate;
  let origin: EmotionalVector = current.target;
  let decision: string;

  if (reading.mode === "deepen") {
    branches[currentRegion] = { status: "deepened", visits: (prior?.visits ?? 0) + 1 };
    const dest = coordinateOrDefault(arc.destination, "cinematic_warmth");
    // Bias the destination itself toward what is resonating, so deepening does
    // not merely slow the drift — it changes where it is going.
    destination = {
      ...dest,
      vector: nudge(dest.vector, current.target, 0.42 * reading.confidence),
    };
    decision = `Deepening ${currentRegion.replace(/_/g, " ")} — destination pulled toward the current pattern.`;
  } else if (reading.mode === "prune") {
    branches[currentRegion] = { status: "pruned", visits: (prior?.visits ?? 0) + 1 };
    const openNeighbours = adjacentCoordinates(currentRegion, TOPOGRAPHY.length - 1).filter(
      (c) => branches[c.id]?.status !== "pruned"
    );
    // Furthest still-open neighbour: pruning should feel like leaving, not like
    // shuffling within the same room.
    destination =
      openNeighbours[openNeighbours.length - 1] ?? coordinateOrDefault(arc.destination, "patient_bloom");
    origin = nudge(current.target, destination.vector, 0.3);
    decision = `Pruned ${currentRegion.replace(/_/g, " ")} — rerouting to ${destination.label}.`;
  } else {
    const neighbours = adjacentCoordinates(currentRegion, 3).filter(
      (c) => branches[c.id]?.status !== "pruned"
    );
    const pick = neighbours[Math.floor(hash01(`${input.seed ?? arc.id}:${playingIndex}`) * Math.max(1, neighbours.length))];
    destination = pick ?? coordinateOrDefault(arc.destination, "patient_bloom");
    branches[currentRegion] = { status: prior?.status ?? "open", visits: (prior?.visits ?? 0) + 1 };
    decision = `Exploring sideways into ${destination.label} — signal was partial.`;
  }

  if (remaining <= 0) {
    // The arc has run out. Extend rather than stop: a drift has no end state.
    const extension = planDrift({
      origin: nearestCoordinate(origin).coordinate.id,
      destination: destination.id,
      seed: `${input.seed ?? arc.id}:ext:${playingIndex}`,
      exclude: [...(input.exclude ?? []), ...arc.phases.map((p) => p.trackId)],
      branches,
      mode: reading.mode,
    });
    const phases = [
      ...heard,
      ...extension.phases.map((p, i) => ({ ...p, index: heard.length + i })),
    ];
    return {
      arc: { ...arc, destination: destination.id, phases, narrative: extension.narrative },
      branches,
      decision: `${decision} Arc extended — a drift does not terminate.`,
    };
  }

  // Re-plan only the tail, then graft it on with corrected indices.
  const tail = planDrift({
    origin: nearestCoordinate(origin).coordinate.id,
    destination: destination.id,
    seed: `${input.seed ?? arc.id}:re:${playingIndex}`,
    exclude: [...(input.exclude ?? []), ...heard.map((p) => p.trackId)],
    branches,
    mode: reading.mode,
    length: Math.min(MAX_ARC, Math.max(MIN_ARC, remaining + 1)),
  });

  // planDrift always re-emits a departure phase; drop it, we already have one.
  const grafted = tail.phases.slice(1, remaining + 1).map((p, i) => ({
    ...p,
    index: heard.length + i,
  }));

  return {
    arc: {
      ...arc,
      destination: destination.id,
      phases: [...heard, ...grafted],
      narrative: tail.narrative,
    },
    branches,
    decision,
  };
}

/* ──────────────────────────── SINGLE-STEP DRIFT ──────────────────────────── */

export type NextPhaseInput = {
  /**
   * The engine's own intended path — the target of each phase so far, oldest
   * first. This, not the list of tracks that ended up occupying those targets,
   * is what "where the session is" means.
   *
   * The distinction matters once a region runs thin. If the catalog cannot offer
   * a warm enough occupant for a warm target, the honest answer is to serve the
   * nearest admissible track and *keep aiming warm*. Treating the compromise
   * occupant as the new position instead lets pool scarcity rewrite the
   * engine's intent, and the trajectory collapses back the way it came.
   */
  trajectory: EmotionalVector[];
  destination: CoordinateId | string;
  reading: ResonanceReading;
  branches?: BranchState;
  exclude?: string[];
  seed?: string;
  /** Per-request Favorite Songs window. Never written into the shared catalog. */
  overlay?: readonly DriftTrack[];
};

export type NextPhaseResult = {
  phase: DriftPhase;
  branches: BranchState;
  reasoning: string;
};

/**
 * The one-step form, used by the `get_next_emotional_drift` MCP tool. Given
 * where a session has been and how the listener has behaved, produce the single
 * next position — no queue, no lookahead the listener can inspect and pre-judge.
 */
export function nextPhase(input: NextPhaseInput): NextPhaseResult | null {
  const branches: BranchState = { ...(input.branches ?? {}) };
  const destination = coordinateOrDefault(input.destination, "cinematic_warmth");
  const pool = admissiblePool(input.overlay);
  if (pool.length === 0) return null;

  const here = input.trajectory.length
    ? input.trajectory[input.trajectory.length - 1]
    : coordinateOrDefault(null, "deep_melancholy").vector;

  const { mode, confidence } = input.reading;

  /**
   * Step size. Note that confidence *increases* the deepen step rather than
   * shrinking it: "deepen" means intensify, and because the deepen aim is a
   * pure amplification of the current position with no lateral component, a
   * longer step goes further into the same emotional character rather than
   * wandering out of it. Damping it instead would freeze the drift on the
   * listener's strongest moment, which is the opposite of deepening.
   */
  const travel = mode === "deepen" ? 0.2 + confidence * 0.25 : mode === "prune" ? 0.62 : 0.34;

  let aim: EmotionalVector;
  if (mode === "deepen") {
    // Intensify what is working: push the strongest axes of the current
    // position further out rather than moving toward a different region.
    const amplified = vec(
      AXIS_KEYS.reduce((acc, key) => {
        const v = here[key];
        acc[key] = key === "insistence" ? v * 0.85 : v > 0.55 ? v + (1 - v) * 0.4 : v;
        return acc;
      }, {} as EmotionalVector)
    );
    const intensified = lerpVector(here, amplified, 0.75);
    /**
     * Deepening changes *how* the drift travels, not *whether* it arrives.
     * Dropping the destination here meant a long run of positive signals could
     * strand a session: a listener who asked for Cinematic Warmth and then sat
     * still accumulated consistent positives, and the engine intensified
     * whatever region it happened to be in until it never left. Strong
     * resonance earns a richer, slower route to the stated destination — it
     * does not earn an abandoned trip.
     *
     * Confidence sets how much of the current pattern is preserved, mirroring
     * `redirectDrift`, which pulls the destination toward the resonating
     * position rather than discarding it. Even at full confidence a tenth of
     * the aim still points at where the listener said they were going.
     */
    aim = lerpVector(destination.vector, intensified, 0.55 + confidence * 0.35);
  } else if (mode === "prune") {
    const region = nearestCoordinate(here).coordinate.id;
    branches[region] = { status: "pruned", visits: (branches[region]?.visits ?? 0) + 1 };
    const open = adjacentCoordinates(region, TOPOGRAPHY.length - 1).filter(
      (c) => branches[c.id]?.status !== "pruned"
    );
    aim = (open[open.length - 1] ?? destination).vector;
  } else {
    const region = nearestCoordinate(here).coordinate.id;
    const neighbours = adjacentCoordinates(region, 3).filter((c) => branches[c.id]?.status !== "pruned");
    const lateral = neighbours[Math.floor(hash01(`${input.seed ?? "x"}:${input.trajectory.length}`) * Math.max(1, neighbours.length))];
    // Split the difference between a lateral hop and the stated destination, so
    // exploration never abandons where the listener said they were going.
    aim = lerpVector((lateral ?? destination).vector, destination.vector, 0.4);
  }

  const target = lerpVector(here, aim, travel);
  const used = new Set(input.exclude ?? []);
  const picked = selectForTarget({
    target,
    previous: null,
    destination: aim,
    used,
    usedArtists: new Set(),
    branches,
    seed: `${input.seed ?? "next"}:${input.trajectory.length}`,
    pool,
  });
  if (!picked) return null;

  const track = picked.track;
  const region = nearestCoordinate(target).coordinate.id;
  const chapter: PhaseChapter = mode === "deepen" ? "transit" : mode === "prune" ? "depart" : "surface";

  return {
    phase: {
      index: input.trajectory.length,
      target,
      region,
      trackId: track.id,
      artist: track.artist,
      title: track.title,
      chapter,
      intent: intentFor(chapter, target, track),
      step: emotionalDistance(target, here),
      keys: { avi: track.avi, cinematicMagnitude: cinematicMagnitude(track.csv) },
    },
    branches,
    reasoning:
      `${input.reading.rationale} Travel ${travel.toFixed(2)} toward ${region.replace(/_/g, " ")}; ` +
      `selected on AVI ${track.avi.toFixed(2)} and cinematic space ${cinematicMagnitude(track.csv).toFixed(2)}.`,
  };
}
