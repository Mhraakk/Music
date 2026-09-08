/**
 * ZERO-GENRE ONTOLOGY
 *
 * There is no genre field anywhere in this module, and nothing downstream may
 * introduce one. A track is not "trip hop" or "deep house"; it is a position in
 * a 7-axis emotional substrate, retrieved by two derived keys:
 *
 *   - Acoustic Vulnerability Index (AVI)  — scalar, how audibly human it is
 *   - Cinematic Space Vector (CSV)        — 3-tuple, the room it implies
 *
 * BPM, popularity, release-era and genre tags are deliberately absent. The only
 * numeric survivor from conventional metadata is `chartGravity`, kept solely so
 * the rejection math can push against commercial brightness.
 */

/** Raw substrate axis. These are the evaluation metrics, not descriptors. */
export type AxisKey =
  | "depth"
  | "narrative"
  | "fragility"
  | "cinema"
  | "warmth"
  | "imperfection"
  | "insistence";

export type AxisSpec = {
  key: AxisKey;
  /** Short label for the topography UI. */
  label: string;
  /** What a value near 1.0 actually means acoustically. */
  high: string;
  /** What a value near 0.0 actually means acoustically. */
  low: string;
  /**
   * Weight used when measuring emotional distance. Axes the engine considers
   * load-bearing for identity (depth, fragility, warmth) dominate; axes that
   * describe motion rather than feeling matter less.
   */
  weight: number;
};

/**
 * Six axes map 1:1 onto the engine's stated evaluation metrics. The seventh,
 * `insistence`, exists only so rhythm-dominance can be measured and rejected —
 * it is the axis the engine pushes against rather than toward.
 */
export const AXES: readonly AxisSpec[] = [
  {
    key: "depth",
    label: "Emotional Depth",
    high: "gravity that does not resolve",
    low: "surface affect",
    weight: 1.6,
  },
  {
    key: "narrative",
    label: "Narrative Progression",
    high: "arrives somewhere it did not begin",
    low: "returns to its own first bar",
    weight: 1.25,
  },
  {
    key: "fragility",
    label: "Vocal Fragility",
    high: "a voice audibly close to breaking",
    low: "no exposed human throat",
    weight: 1.5,
  },
  {
    key: "cinema",
    label: "Cinematic Atmosphere",
    high: "implies a room, a lens, a weather",
    low: "flat proximate mix",
    weight: 1.35,
  },
  {
    key: "warmth",
    label: "Warmth",
    high: "tape, wood, valve, body heat",
    low: "cold circuitry",
    weight: 1.45,
  },
  {
    key: "imperfection",
    label: "Human Imperfection",
    high: "timing drift, breath, room noise",
    low: "quantised to the grid",
    weight: 1.2,
  },
  {
    key: "insistence",
    label: "Rhythmic Insistence",
    high: "rhythm dominates the emotional content",
    low: "pulse serves the atmosphere",
    weight: 0.9,
  },
] as const;

export const AXIS_KEYS: readonly AxisKey[] = AXES.map((a) => a.key);

export const AXIS_BY_KEY: Record<AxisKey, AxisSpec> = AXES.reduce(
  (acc, a) => {
    acc[a.key] = a;
    return acc;
  },
  {} as Record<AxisKey, AxisSpec>
);

/** A position in the emotional substrate. Every value is clamped to [0,1]. */
export type EmotionalVector = Record<AxisKey, number>;

/**
 * The room a track implies. Derived, never authored — this is one of the two
 * retrieval keys the MCP is allowed to query on.
 */
export type CinematicSpaceVector = {
  /** Perceived distance between the nearest and furthest element. */
  depthOfField: number;
  /** How long the space holds a sound after it stops. */
  decay: number;
  /** Proportion of the mix that is deliberately empty. */
  negativeSpace: number;
};

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function vec(partial: Partial<EmotionalVector>): EmotionalVector {
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) out[key] = clamp01(partial[key] ?? 0.5);
  return out;
}

/**
 * ACOUSTIC VULNERABILITY INDEX
 *
 * The first retrieval key. A single scalar answering: how much of the human who
 * made this survived the production process? Fragility and imperfection are the
 * evidence, depth is the corroboration, and rhythmic insistence is the thing
 * that buries it — a track quantised into a loop cannot be vulnerable no matter
 * how sad its pad is.
 */
export function acousticVulnerability(v: EmotionalVector): number {
  const evidence = v.fragility * 0.42 + v.imperfection * 0.31 + v.depth * 0.16 + v.warmth * 0.11;
  // Insistence does not merely subtract; it masks. Multiplicative suppression
  // keeps a loop-dominant track from ever reading as vulnerable.
  const masking = 1 - Math.pow(v.insistence, 1.7) * 0.55;
  return clamp01(evidence * masking);
}

/** The second retrieval key. */
export function cinematicSpace(v: EmotionalVector): CinematicSpaceVector {
  return {
    depthOfField: clamp01(v.cinema * 0.62 + v.depth * 0.28 + (1 - v.insistence) * 0.1),
    decay: clamp01(v.cinema * 0.48 + (1 - v.insistence) * 0.32 + v.imperfection * 0.2),
    negativeSpace: clamp01((1 - v.insistence) * 0.46 + v.cinema * 0.34 + v.depth * 0.2),
  };
}

/** Scalar magnitude of the Cinematic Space Vector, for ranking and display. */
export function cinematicMagnitude(csv: CinematicSpaceVector): number {
  return clamp01(csv.depthOfField * 0.42 + csv.decay * 0.28 + csv.negativeSpace * 0.3);
}

/**
 * Weighted emotional distance. Not Euclidean in raw space — each axis is scaled
 * by its identity weight first, so a drift that loses all its warmth is further
 * away than one that merely gains a pulse.
 */
export function emotionalDistance(a: EmotionalVector, b: EmotionalVector): number {
  let sum = 0;
  let norm = 0;
  for (const spec of AXES) {
    const d = (a[spec.key] - b[spec.key]) * spec.weight;
    sum += d * d;
    norm += spec.weight * spec.weight;
  }
  return Math.sqrt(sum / norm);
}

/** Linear interpolation between two positions in the substrate. */
export function lerpVector(a: EmotionalVector, b: EmotionalVector, t: number): EmotionalVector {
  const k = clamp01(t);
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) out[key] = clamp01(a[key] + (b[key] - a[key]) * k);
  return out;
}

/** Centroid of a set of positions. Used to summarise a listening session. */
export function centroid(vectors: EmotionalVector[]): EmotionalVector {
  if (vectors.length === 0) return vec({});
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) {
    let sum = 0;
    for (const v of vectors) sum += v[key];
    out[key] = clamp01(sum / vectors.length);
  }
  return out;
}

/**
 * Nudge a vector toward a target by `amount`, without ever crossing it.
 * The drift algorithm uses this for both deepening and pruning (negative amount).
 */
export function nudge(v: EmotionalVector, toward: EmotionalVector, amount: number): EmotionalVector {
  const out = {} as EmotionalVector;
  for (const key of AXIS_KEYS) {
    out[key] = clamp01(v[key] + (toward[key] - v[key]) * amount);
  }
  return out;
}

/* ─────────────────────────── STRICT REJECTIONS ─────────────────────────── */

export type RejectionId =
  | "edm_drop_architecture"
  | "festival_anthem"
  | "loop_minimal_techno"
  | "rhythm_dominant_jazz"
  | "bright_commercial_house"
  | "emotionless_ambient";

export type RejectionRule = {
  id: RejectionId;
  /** Human-readable statement of what is being refused. */
  statement: string;
  /**
   * Returns a violation severity in [0,1], or 0 when the track is clear.
   * Anything above `REJECTION_THRESHOLD` removes the track from every pool.
   */
  test: (v: EmotionalVector, chartGravity: number) => number;
};

export const REJECTION_THRESHOLD = 0.5;

/**
 * These are not tag blocklists — the ontology has no tags to block. Each rule is
 * a predicate over the substrate, so an untagged, unknown, never-before-seen
 * track is filtered on its acoustics alone.
 */
export const REJECTION_RULES: readonly RejectionRule[] = [
  {
    id: "edm_drop_architecture",
    statement: "EDM — music whose structure exists to service a drop",
    test: (v) => {
      // Extreme insistence with no narrative payoff and nothing fragile left.
      const insistent = Math.max(0, v.insistence - 0.66) / 0.34;
      const hollow = 1 - Math.max(v.fragility, v.imperfection);
      return clamp01(insistent * 0.7 + hollow * insistent * 0.3);
    },
  },
  {
    id: "festival_anthem",
    statement: "Festival and club anthems — designed for crowds, not for rooms",
    test: (v) => {
      const loud = Math.max(0, v.insistence - 0.55) / 0.45;
      const shallow = Math.max(0, 0.45 - v.depth) / 0.45;
      const airless = Math.max(0, 0.4 - v.cinema) / 0.4;
      return clamp01(loud * 0.45 + shallow * 0.35 + airless * 0.2);
    },
  },
  {
    id: "loop_minimal_techno",
    statement: "Loop-based minimal techno — repetition without transformation",
    test: (v) => {
      const looped = Math.max(0, 0.45 - v.narrative) / 0.45;
      const pulsed = Math.max(0, v.insistence - 0.42) / 0.58;
      const sterile = Math.max(0, 0.5 - v.imperfection) / 0.5;
      return clamp01(looped * 0.42 + pulsed * 0.33 + sterile * 0.25);
    },
  },
  {
    id: "rhythm_dominant_jazz",
    statement: "Rhythm-dominant experimental jazz — technique displacing feeling",
    test: (v) => {
      const busy = Math.max(0, v.insistence - 0.5) / 0.5;
      // Genuinely acoustic, not merely un-quantised. Using raw imperfection
      // here would let rhythm-forward electronic music trip a rule about
      // players, which is both wrong and a confusing thing to report.
      const acoustic = Math.max(0, v.imperfection - 0.5) / 0.5;
      const unfeeling = Math.max(0, 0.6 - v.depth) / 0.6;
      // Requires all three at once: acoustic, busy, emotionally uncommitted.
      return clamp01(Math.min(busy, acoustic, unfeeling) * 1.75);
    },
  },
  {
    id: "bright_commercial_house",
    statement: "Overly bright commercial house — warmth as a marketing surface",
    test: (v, chartGravity) => {
      const bright = Math.max(0, v.warmth - 0.62) / 0.38;
      const shallow = Math.max(0, 0.34 - v.depth) / 0.34;
      const commercial = clamp01(chartGravity / 0.6);
      return clamp01(bright * 0.3 + shallow * 0.34 + commercial * 0.36);
    },
  },
  {
    id: "emotionless_ambient",
    statement: "Emotionless ambient — atmosphere with nobody inside it",
    test: (v) => {
      const empty = Math.max(0, 0.4 - v.fragility) / 0.4;
      const inert = Math.max(0, 0.42 - v.narrative) / 0.42;
      const cold = Math.max(0, 0.45 - v.warmth) / 0.45;
      const undeep = Math.max(0, 0.5 - v.depth) / 0.5;
      // Emptiness and inertness must co-occur: a still piece with an exposed
      // human in it is not emotionless, and neither is a fragile piece that
      // simply holds one position.
      return clamp01(Math.min(empty, inert) * 0.6 + cold * 0.18 + undeep * 0.22);
    },
  },
] as const;

export type RejectionVerdict = {
  rejected: boolean;
  /** Every rule that fired, strongest first. */
  violations: { id: RejectionId; statement: string; severity: number }[];
  /** Highest severity across all rules. */
  severity: number;
};

export function evaluateRejections(v: EmotionalVector, chartGravity = 0): RejectionVerdict {
  const violations = REJECTION_RULES.map((rule) => ({
    id: rule.id,
    statement: rule.statement,
    severity: clamp01(rule.test(v, chartGravity)),
  }))
    .filter((x) => x.severity > 0.001)
    .sort((a, b) => b.severity - a.severity);

  const severity = violations.length ? violations[0].severity : 0;
  return {
    rejected: severity >= REJECTION_THRESHOLD,
    violations,
    severity,
  };
}

/* ──────────────────────── AESTHETIC ANCHOR RESONANCE ──────────────────────── */

export type AestheticAnchor = {
  name: string;
  /** Why this artist is a calibration point rather than a recommendation. */
  note: string;
  vector: EmotionalVector;
};

/**
 * The engine's baseline resonance. These are not artists to recommend — they are
 * the reference positions the substrate is calibrated against, spanning the two
 * poles the engine cares about: weighted noir (Massive Attack, Portishead) and
 * warm human house (St Germain, Charles Webster, Kevin Yost, Llorca, 16BL).
 */
export const AESTHETIC_ANCHORS: readonly AestheticAnchor[] = [
  {
    name: "Massive Attack",
    note: "weight and breath in the same bar",
    vector: vec({
      depth: 0.88,
      narrative: 0.72,
      fragility: 0.66,
      cinema: 0.86,
      warmth: 0.44,
      imperfection: 0.58,
      insistence: 0.34,
    }),
  },
  {
    name: "Portishead",
    note: "a voice recorded close enough to hear it fail",
    vector: vec({
      depth: 0.9,
      narrative: 0.68,
      fragility: 0.92,
      cinema: 0.84,
      warmth: 0.4,
      imperfection: 0.74,
      insistence: 0.3,
    }),
  },
  {
    name: "St Germain",
    note: "acoustic players inside a programmed room",
    vector: vec({
      depth: 0.56,
      narrative: 0.7,
      fragility: 0.44,
      cinema: 0.66,
      warmth: 0.88,
      imperfection: 0.8,
      insistence: 0.42,
    }),
  },
  {
    name: "Charles Webster",
    note: "restraint as the whole arrangement",
    vector: vec({
      depth: 0.66,
      narrative: 0.66,
      fragility: 0.62,
      cinema: 0.74,
      warmth: 0.8,
      imperfection: 0.56,
      insistence: 0.4,
    }),
  },
  {
    name: "Kevin Yost",
    note: "live keys refusing to quantise",
    vector: vec({
      depth: 0.52,
      narrative: 0.64,
      fragility: 0.4,
      cinema: 0.62,
      warmth: 0.86,
      imperfection: 0.76,
      insistence: 0.44,
    }),
  },
  {
    name: "Llorca",
    note: "dusted soul with the tape hiss left in",
    vector: vec({
      depth: 0.58,
      narrative: 0.62,
      fragility: 0.5,
      cinema: 0.64,
      warmth: 0.84,
      imperfection: 0.72,
      insistence: 0.46,
    }),
  },
  {
    name: "16BL",
    note: "deep-room patience, never a peak",
    vector: vec({
      depth: 0.7,
      narrative: 0.6,
      fragility: 0.46,
      cinema: 0.78,
      warmth: 0.72,
      imperfection: 0.54,
      insistence: 0.44,
    }),
  },
] as const;

export type AnchorAlignment = {
  /** Closest anchor by weighted distance. */
  nearest: string;
  /** 1.0 = sitting on an anchor, 0.0 = outside the engine's aesthetic entirely. */
  alignment: number;
  note: string;
};

/**
 * How close a position sits to the engine's baseline resonance. Uses the single
 * nearest anchor rather than the mean, because the anchor set is intentionally
 * bimodal — averaging noir and warm house would produce a centre that resembles
 * neither and that the engine should not aim at.
 */
export function anchorAlignment(v: EmotionalVector): AnchorAlignment {
  let best = AESTHETIC_ANCHORS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const anchor of AESTHETIC_ANCHORS) {
    const d = emotionalDistance(v, anchor.vector);
    if (d < bestDist) {
      bestDist = d;
      best = anchor;
    }
  }
  return {
    nearest: best.name,
    alignment: clamp01(1 - bestDist / 0.62),
    note: best.note,
  };
}

/**
 * Composite admission score. A track earns its place by being vulnerable, by
 * implying a room, by aligning with the baseline resonance — and by surviving
 * the rejection rules, which are a hard gate rather than a penalty.
 */
export function resonanceScore(v: EmotionalVector, chartGravity = 0): number {
  const verdict = evaluateRejections(v, chartGravity);
  if (verdict.rejected) return 0;
  const avi = acousticVulnerability(v);
  const csv = cinematicMagnitude(cinematicSpace(v));
  const anchor = anchorAlignment(v).alignment;
  const raw = avi * 0.36 + csv * 0.3 + anchor * 0.34;
  // Sub-threshold violations still cost something.
  return clamp01(raw * (1 - verdict.severity * 0.4));
}

/** Compact human sentence describing a position. Used in UI and MCP payloads. */
export function describeVector(v: EmotionalVector): string {
  const parts: string[] = [];
  parts.push(v.depth > 0.66 ? "heavy" : v.depth < 0.36 ? "light" : "measured");
  parts.push(v.warmth > 0.66 ? "warm" : v.warmth < 0.36 ? "cold" : "temperate");
  if (v.fragility > 0.6) parts.push("audibly fragile");
  if (v.cinema > 0.7) parts.push("wide room");
  if (v.imperfection > 0.65) parts.push("unquantised");
  if (v.narrative > 0.7) parts.push("travels");
  else if (v.narrative < 0.34) parts.push("holds still");
  if (v.insistence > 0.55) parts.push("pulse-forward");
  return parts.join(", ");
}
