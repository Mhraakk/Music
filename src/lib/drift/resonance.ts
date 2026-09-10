/**
 * IMPLICIT RESONANCE
 *
 * Volume on an exposed moment is still the load-bearing implicit signal.
 * An explicit like is extra evidence, never a skip, never a next-track.
 *
 * The load-bearing signal is a volume gesture landing on an exposed moment. If
 * someone reaches for the dial while a voice is audibly breaking, that is a far
 * stronger statement than any rating widget could collect — they either leaned
 * in or pulled away, and both are unambiguous.
 *
 * Everything here is pure: signals in, a reading out. No storage, no clocks
 * beyond the timestamps the caller supplies.
 */

import { clamp01 } from "./ontology";

export type ResonanceSignalKind =
  | "volume_raise"
  | "volume_lower"
  | "dwell_complete"
  | "abandon"
  | "seek_back"
  | "seek_forward"
  | "stillness"
  | "explicit_like";

export type ResonanceSignal = {
  kind: ResonanceSignalKind;
  trackId: string;
  /** Normalised position in the track when the signal fired, [0,1]. */
  progress: number;
  /** Vocal fragility intensity at that exact position, [0,1]. */
  fragility: number;
  /** Gesture size where it applies — e.g. absolute volume delta. [0,1] */
  magnitude: number;
  /** Epoch ms, supplied by the caller so this module stays pure. */
  at: number;
};

/** What the drift algorithm is allowed to do next. */
export type ResonanceMode = "deepen" | "prune" | "explore";

export type ResonanceReading = {
  /** -1 (actively rejecting) → +1 (actively resonating). */
  valence: number;
  /** How much evidence backs the valence, [0,1]. */
  confidence: number;
  mode: ResonanceMode;
  /** Plain-language account of what the listener actually did. */
  rationale: string;
  /** Per-signal contributions, strongest first. Surfaced in the UI. */
  contributions: { kind: ResonanceSignalKind; weight: number; note: string }[];
};

/**
 * Base valence per signal kind, before fragility amplification and decay.
 * Negative signals are weighted slightly harder than their positive mirrors:
 * abandoning a track is a clearer statement than finishing one.
 */
const BASE_WEIGHT: Record<ResonanceSignalKind, number> = {
  volume_raise: 0.62,
  volume_lower: -0.5,
  dwell_complete: 0.55,
  abandon: -0.82,
  seek_back: 0.48,
  seek_forward: -0.58,
  // Passivity is the weakest evidence available. It is not nothing — someone who
  // never reaches for the dial is not objecting — but it must not accumulate
  // into a conviction strong enough to redirect a drift the listener asked for.
  stillness: 0.14,
  explicit_like: 0.78,
};

/** Signals whose meaning depends on landing inside a fragility window. */
const FRAGILITY_SENSITIVE = new Set<ResonanceSignalKind>([
  "volume_raise",
  "volume_lower",
  "seek_back",
  "seek_forward",
]);

/**
 * A gesture on an exposed moment counts for up to ~2.3x a gesture on a
 * structurally anonymous one. Outside a window a volume change is mostly
 * environmental — a door closing, a room getting louder — so it is damped
 * rather than trusted.
 */
function fragilityAmplifier(fragility: number): number {
  return 0.45 + Math.pow(clamp01(fragility), 0.85) * 1.85;
}

/** Recent behaviour describes the listener now; older behaviour describes a mood that has passed. */
function decay(signal: ResonanceSignal, now: number): number {
  const ageMinutes = Math.max(0, (now - signal.at) / 60000);
  // Half-life of roughly six minutes — about one track and a half.
  return Math.pow(0.5, ageMinutes / 6);
}

/**
 * ORDINAL DECAY
 *
 * Temporal decay alone is not enough. A listener who enjoyed five tracks and
 * then walked out of the sixth after fifteen seconds has told the engine
 * something urgent, but five accumulated positives will out-mass one fresh
 * negative and the engine will cheerfully keep deepening into a room the
 * listener is already leaving.
 *
 * So position in the sequence is weighted independently of wall-clock age: the
 * most recent gesture counts fully, the one before it a little over half, and
 * so on. Older behaviour still contributes a baseline, but it cannot outvote
 * the present. Tuned so that two consecutive unambiguous negatives — walking
 * out early, then pulling the level back on an exposed moment — prune the
 * branch even against a run of five earlier positives.
 */
const ORDINAL_DECAY = 0.55;

function noteFor(signal: ResonanceSignal): string {
  const where =
    signal.fragility > 0.55
      ? "on an exposed moment"
      : signal.fragility > 0.2
        ? "near an exposed moment"
        : "in structurally anonymous space";
  switch (signal.kind) {
    case "volume_raise":
      return `turned it up ${where}`;
    case "volume_lower":
      return `pulled the level back ${where}`;
    case "dwell_complete":
      return "stayed to the end";
    case "abandon":
      return `left at ${Math.round(signal.progress * 100)}%`;
    case "seek_back":
      return `went back ${where}`;
    case "seek_forward":
      return `skipped ahead ${where}`;
    case "stillness":
      return "listened without touching anything";
    case "explicit_like":
      return "marked this as a favorite";
  }
}

export function scoreSignal(signal: ResonanceSignal, now: number): number {
  let weight = BASE_WEIGHT[signal.kind];

  if (FRAGILITY_SENSITIVE.has(signal.kind)) {
    weight *= fragilityAmplifier(signal.fragility);
  }

  // Gesture size matters for volume moves; the rest are binary events.
  if (signal.kind === "volume_raise" || signal.kind === "volume_lower") {
    weight *= 0.4 + clamp01(signal.magnitude) * 1.2;
  }

  // Leaving early says more than leaving late.
  if (signal.kind === "abandon") {
    weight *= 0.35 + (1 - clamp01(signal.progress)) * 1.3;
  }

  return weight * decay(signal, now);
}

export function readResonance(signals: ResonanceSignal[], now = Date.now()): ResonanceReading {
  if (signals.length === 0) {
    return {
      valence: 0,
      confidence: 0,
      mode: "explore",
      rationale: "No behaviour observed yet — the engine is exploring outward.",
      contributions: [],
    };
  }

  // Newest first, so ordinal rank means "how far back in the session".
  const byRecency = [...signals].sort((a, b) => b.at - a.at);

  const contributions = byRecency
    .map((s, rank) => ({
      kind: s.kind,
      weight: scoreSignal(s, now) * Math.pow(ORDINAL_DECAY, rank),
      note: noteFor(s),
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  let total = 0;
  let mass = 0;
  for (const c of contributions) {
    total += c.weight;
    mass += Math.abs(c.weight);
  }

  // Valence is the *direction* of the evidence, normalised by its own mass, so
  // ten mild positives do not outrank one emphatic rejection by volume alone.
  const valence = mass > 0 ? clamp01(Math.abs(total) / mass) * Math.sign(total) : 0;

  // Confidence saturates: three decisive gestures are close to as certain as
  // the engine ever gets, and it should start acting before it has twenty.
  // Measured on undecayed mass so a long session does not read as uncertain.
  const rawMass = signals.reduce((sum, s) => sum + Math.abs(scoreSignal(s, now)), 0);
  const confidence = clamp01(1 - Math.exp(-rawMass / 1.6));

  const mode: ResonanceMode =
    confidence < 0.28 ? "explore" : valence >= 0.34 ? "deepen" : valence <= -0.3 ? "prune" : "explore";

  const lead = contributions[0];
  const rationale =
    mode === "deepen"
      ? `Resonating — ${lead.note}. Deepening the current pattern.`
      : mode === "prune"
        ? `Not landing — ${lead.note}. Pruning this branch.`
        : `Partial signal — ${lead.note}. Exploring adjacent zones.`;

  return { valence, confidence, mode, rationale, contributions: contributions.slice(0, 4) };
}

/**
 * Volume gestures arrive as a stream of absolute levels. This collapses a
 * continuous drag into at most one signal, so dragging a slider from 0.3 to 0.8
 * is a single emphatic statement rather than fifty tiny ones.
 */
export const VOLUME_GESTURE_EPSILON = 0.06;

export function volumeGesture(input: {
  from: number;
  to: number;
  trackId: string;
  progress: number;
  fragility: number;
  at: number;
}): ResonanceSignal | null {
  const delta = input.to - input.from;
  if (Math.abs(delta) < VOLUME_GESTURE_EPSILON) return null;
  return {
    kind: delta > 0 ? "volume_raise" : "volume_lower",
    trackId: input.trackId,
    progress: clamp01(input.progress),
    fragility: clamp01(input.fragility),
    magnitude: clamp01(Math.abs(delta)),
    at: input.at,
  };
}
