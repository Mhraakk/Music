/**
 * THE COGNITIVE CORE
 *
 * Where the emotional decision actually gets made. The contract is
 * propose → verify → fall back, and it is never inverted:
 *
 *   1. Local cognition computes a complete, admissible answer FIRST. This is not
 *      an error path — it is the baseline, and it always exists.
 *   2. Gemini is then asked to improve on it, choosing from a shortlist.
 *   3. Gemini's proposal is verified against the ontology. An unverifiable
 *      proposal is discarded with a recorded reason and the baseline stands.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MODEL IS NEVER TOLD WHAT THE MUSIC IS.
 *
 * Candidates are sent as anonymous references — `c0`, `c1`, `c2` — carrying only
 * substrate axes and the two retrieval keys. No artist, no title, no album, no
 * year, no genre. This is not obfuscation for its own sake: a language model
 * that sees "Burial" reasons about dubstep, and a model that sees "Massive
 * Attack" reasons about trip-hop. Withholding the names makes genre reasoning
 * structurally impossible rather than merely discouraged, and it means the
 * engine cannot inherit the popularity priors baked into the model's training
 * data. The ref → track mapping never leaves this module.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  AXES,
  REJECTION_RULES,
  acousticVulnerability,
  anchorAlignment,
  cinematicMagnitude,
  cinematicSpace,
  describeVector,
  emotionalDistance,
  evaluateRejections,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import { coordinateOrDefault, nearestCoordinate, TOPOGRAPHY } from "@/lib/drift/topography";
import { admissiblePool, driftTrack, fragilityWindows, type DriftTrack } from "@/lib/drift/catalog";
import {
  nextPhase,
  planDrift,
  scoreCandidate,
  type BranchState,
  type DriftArc,
  type DriftPhase,
} from "@/lib/drift/algorithm";
import { readResonance, type ResonanceReading, type ResonanceSignal } from "@/lib/drift/resonance";
import { resolveAudio, type ResolvedAudio } from "@/lib/providers/resolve";
import { geminiConfigured, geminiStructured, type GeminiSchema } from "./gemini";
import type { TasteSnapshot, TasteWire } from "@/lib/taste/memory";

/** How many anonymous candidates the model is allowed to choose between. */
const SHORTLIST_SIZE = 10;

export type CognitionSource = "gemini-mcp" | "local-cognition";

export type CognitionTrace = {
  source: CognitionSource;
  model: string | null;
  latencyMs: number;
  /** Human-readable account of what happened, including any refusal. */
  note: string;
  /** Present when a Gemini proposal was received and checked. */
  verification: {
    proposed: string | null;
    accepted: boolean;
    reason: string;
  } | null;
};

export type DriftDecision = {
  phase: DriftPhase;
  branches: BranchState;
  reading: ResonanceReading;
  cognition: CognitionTrace;
  audio: ResolvedAudio;
  /** Fragility windows for the chosen track, so the client can weight gestures. */
  fragilityWindows: { start: number; end: number; intensity: number }[];
  /** Flat emotional field colour, `r g b`. */
  field: string;
};

export type DriftRequestInput = {
  sessionId: string;
  origin: string;
  destination: string;
  /**
   * The engine's own intended path so far — one target vector per phase, oldest
   * first. Authoritative for "where the session is"; see `NextPhaseInput`.
   */
  trajectory: EmotionalVector[];
  /** Track ids already heard, excluded from selection. */
  exclude: string[];
  signals: ResonanceSignal[];
  branches: BranchState;
  soundCloudAccessToken?: string | null;
  /** Per-request Favorite Songs window. Never written into the shared catalog. */
  overlay?: DriftTrack[];
  taste?: TasteSnapshot | TasteWire | null;
};

/* ──────────────────────────── SHORTLIST BUILDING ──────────────────────────── */

type Candidate = { ref: string; track: DriftTrack };

/**
 * The strongest local candidates for a target, anonymised. Reuses the same
 * scoring function the deterministic path uses, so the model is choosing between
 * options the engine already considers admissible rather than being handed the
 * raw catalog and trusted to filter it.
 */
function buildShortlist(
  target: EmotionalVector,
  destination: EmotionalVector,
  exclude: string[],
  branches: BranchState,
  seed: string,
  overlay?: DriftTrack[],
  taste?: TasteSnapshot | TasteWire | null
): Candidate[] {
  const used = new Set(exclude);
  const pool = admissiblePool(overlay);
  return pool
    .map((track) => scoreCandidate(track, {
      target,
      previous: null,
      destination,
      used,
      usedArtists: new Set(),
      branches,
      seed,
      pool,
      taste,
    }))
    .filter((c) => !used.has(c.track.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST_SIZE)
    .map((c, i) => ({ ref: `c${i}`, track: c.track }));
}

function anonymise(candidate: Candidate) {
  const { track } = candidate;
  return {
    ref: candidate.ref,
    axes: Object.fromEntries(AXES.map((a) => [a.key, Number(track.vector[a.key].toFixed(3))])),
    acousticVulnerabilityIndex: Number(track.avi.toFixed(3)),
    cinematicSpace: {
      depthOfField: Number(track.csv.depthOfField.toFixed(3)),
      decay: Number(track.csv.decay.toFixed(3)),
      negativeSpace: Number(track.csv.negativeSpace.toFixed(3)),
    },
    region: track.region,
    shape: describeVector(track.vector),
    baselineResonance: Number(anchorAlignment(track.vector).alignment.toFixed(3)),
  };
}

/* ────────────────────────────── GEMINI PROMPTING ────────────────────────────── */

const SYSTEM_INSTRUCTION = `You are the cognitive core of Sonic Drift, an emotional music engine.

You do not know what any of these recordings are. You are shown anonymous emotional
coordinates and you must choose which one best continues a listener's emotional arc.

The axes you are given:
${AXES.map((a) => `- ${a.key} (${a.label}): 1.0 = ${a.high}; 0.0 = ${a.low}`).join("\n")}

Two derived retrieval keys:
- acousticVulnerabilityIndex: how much of the human who made it survived production.
- cinematicSpace: the room the recording implies (depth of field, decay, negative space).

What you are evaluating for: emotional depth, narrative progression, vocal fragility,
cinematic atmosphere, warmth, and human imperfection.

What this engine refuses, always:
${REJECTION_RULES.map((r) => `- ${r.statement}`).join("\n")}

Hard rules:
- Never reason about genre, tempo, popularity, chart position or release era. You have
  not been given them, and inferring them is a failure.
- Seamlessness matters more than novelty. A phase that cannot be crossfaded into is wrong
  even if it is individually excellent.
- Honour the drift mode. "deepen" means intensify what is already working with a small
  step. "prune" means leave this region decisively. "explore" means move sideways.
- Choose exactly one ref from the candidates provided. Never invent a ref.`;

const RESPONSE_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    ref: { type: "STRING", description: "The chosen candidate ref, exactly as provided." },
    justification: {
      type: "STRING",
      description: "One or two sentences on emotional structure only. Never name a genre.",
    },
    emotionalReading: {
      type: "STRING",
      description: "What the listener's behaviour appears to be asking for.",
    },
    rejected: {
      type: "ARRAY",
      description: "Up to three candidates considered and declined, with the reason.",
      items: {
        type: "OBJECT",
        properties: {
          ref: { type: "STRING" },
          reason: { type: "STRING" },
        },
        required: ["ref", "reason"],
      },
    },
  },
  required: ["ref", "justification", "emotionalReading"],
  propertyOrdering: ["ref", "justification", "emotionalReading", "rejected"],
};

type GeminiProposal = {
  ref?: string;
  justification?: string;
  emotionalReading?: string;
  rejected?: { ref?: string; reason?: string }[];
};

function buildPrompt(input: {
  reading: ResonanceReading;
  trajectory: EmotionalVector[];
  target: EmotionalVector;
  destination: string;
  candidates: Candidate[];
}): string {
  const dest = coordinateOrDefault(input.destination, "cinematic_warmth");
  const arc = input.trajectory.slice(-4).map((v, i) => {
    const region = nearestCoordinate(v).coordinate;
    return `  ${i + 1}. ${region.label} — ${describeVector(v)} (AVI ${acousticVulnerability(v).toFixed(2)})`;
  });

  return [
    `SESSION ARC (most recent last)${arc.length ? ":" : ": nothing heard yet."}`,
    ...arc,
    "",
    `STATED DESTINATION: ${dest.label} — ${dest.description}`,
    "",
    `IMPLICIT FEEDBACK: ${input.reading.rationale}`,
    `  valence ${input.reading.valence.toFixed(2)} (negative = rejecting), confidence ${input.reading.confidence.toFixed(2)}`,
    `  observed: ${input.reading.contributions.map((c) => c.note).join("; ") || "nothing yet"}`,
    `DRIFT MODE: ${input.reading.mode}`,
    "",
    `ENGINE TARGET POSITION: ${describeVector(input.target)}`,
    `  AVI ${acousticVulnerability(input.target).toFixed(2)}, cinematic space ${cinematicMagnitude(cinematicSpace(input.target)).toFixed(2)}`,
    "",
    "CANDIDATES:",
    JSON.stringify(input.candidates.map(anonymise), null, 1),
    "",
    "Choose the one ref that best continues this arc under the drift mode above.",
  ].join("\n");
}

/* ──────────────────────────────── VERIFICATION ──────────────────────────────── */

/** Largest emotional jump a verified proposal may introduce. Matches the arc seam limit. */
const VERIFY_SEAM_LIMIT = 0.42;

type Verification = { accepted: boolean; reason: string; track: DriftTrack | null };

/**
 * A proposal is only accepted if it is a real shortlisted ref, is admissible
 * under the rejection rules, and does not break seamlessness against the last
 * thing heard. Anything else keeps the deterministic baseline.
 */
function verifyProposal(
  proposal: GeminiProposal,
  shortlist: Candidate[],
  previous: EmotionalVector | null
): Verification {
  const ref = typeof proposal.ref === "string" ? proposal.ref.trim() : "";
  if (!ref) return { accepted: false, reason: "proposal contained no ref", track: null };

  const match = shortlist.find((c) => c.ref === ref);
  if (!match) return { accepted: false, reason: `ref "${ref}" was not on the shortlist`, track: null };

  const verdict = evaluateRejections(match.track.vector, match.track.chartGravity);
  if (verdict.rejected) {
    return {
      accepted: false,
      reason: `chosen position violates "${verdict.violations[0]?.id}"`,
      track: null,
    };
  }

  if (previous) {
    const jump = emotionalDistance(match.track.vector, previous);
    if (jump > VERIFY_SEAM_LIMIT) {
      return {
        accepted: false,
        reason: `jump of ${jump.toFixed(2)} exceeds the seam limit of ${VERIFY_SEAM_LIMIT}`,
        track: null,
      };
    }
  }

  return { accepted: true, reason: "verified against ontology and seam limit", track: match.track };
}

/* ─────────────────────────────── THE DRIFT STEP ─────────────────────────────── */

/**
 * `get_next_emotional_drift` in all but name — the MCP tool is a thin wrapper
 * around this.
 */
export async function decideNextDrift(input: DriftRequestInput): Promise<DriftDecision> {
  const reading = readResonance(input.signals);

  // 1. Deterministic baseline. Always computed, always admissible.
  const baseline = nextPhase({
    trajectory: input.trajectory,
    destination: input.destination,
    reading,
    branches: input.branches,
    exclude: input.exclude,
    seed: input.sessionId,
    overlay: input.overlay,
    taste: input.taste,
  });

  if (!baseline) {
    throw new Error("No admissible position remains — every candidate was refused.");
  }

  let phase = baseline.phase;
  const branches = baseline.branches;
  let cognition: CognitionTrace = {
    source: "local-cognition",
    model: null,
    latencyMs: 0,
    note: geminiConfigured()
      ? "Local cognition used."
      : "Gemini not configured — deterministic local cognition owns this drift.",
    verification: null,
  };

  // 2. Ask Gemini to improve on the baseline, from an anonymised shortlist.
  if (geminiConfigured()) {
    const shortlist = buildShortlist(
      phase.target,
      coordinateOrDefault(input.destination, "cinematic_warmth").vector,
      input.exclude,
      branches,
      input.sessionId,
      input.overlay,
      input.taste
    );

    if (shortlist.length === 0) {
      cognition = { ...cognition, note: "No shortlist available — baseline retained." };
    } else {
      const outcome = await geminiStructured<GeminiProposal>({
        system: SYSTEM_INSTRUCTION,
        prompt: buildPrompt({
          reading,
          trajectory: input.trajectory,
          target: phase.target,
          destination: input.destination,
          candidates: shortlist,
        }),
        schema: RESPONSE_SCHEMA,
        temperature: reading.mode === "deepen" ? 0.3 : 0.55,
      });

      if (!outcome.ok) {
        cognition = {
          source: "local-cognition",
          model: null,
          latencyMs: outcome.latencyMs,
          note: `Gemini unavailable (${outcome.reason}) — baseline retained.`,
          verification: null,
        };
      } else {
        const previous = input.trajectory.length ? input.trajectory[input.trajectory.length - 1] : null;
        const verification = verifyProposal(outcome.value, shortlist, previous);

        if (verification.accepted && verification.track) {
          const track = verification.track;
          phase = {
            ...phase,
            trackId: track.id,
            artist: track.artist,
            title: track.title,
            intent: outcome.value.justification?.trim() || phase.intent,
            keys: { avi: track.avi, cinematicMagnitude: cinematicMagnitude(track.csv) },
          };
          cognition = {
            source: "gemini-mcp",
            model: outcome.model,
            latencyMs: outcome.latencyMs,
            note: outcome.value.emotionalReading?.trim() || "Gemini selected this phase.",
            verification: { proposed: outcome.value.ref ?? null, accepted: true, reason: verification.reason },
          };
        } else {
          cognition = {
            source: "local-cognition",
            model: outcome.model,
            latencyMs: outcome.latencyMs,
            note: `Gemini proposal refused — ${verification.reason}. Baseline retained.`,
            verification: { proposed: outcome.value.ref ?? null, accepted: false, reason: verification.reason },
          };
        }
      }
    }
  }

  // 3. Turn the emotional decision into something playable.
  const track =
    input.overlay?.find((t) => t.id === phase.trackId) ?? driftTrack(phase.trackId);
  const audio = track
    ? await resolveAudio(track, input.soundCloudAccessToken)
    : {
        appleMusicId: null,
        appleMusicUrl: null,
        soundcloudUrl: null,
        streamUrl: null,
        source: "unresolved" as const,
        note: "Phase has no catalog entry.",
      };

  return {
    phase,
    branches,
    reading,
    cognition,
    audio,
    fragilityWindows: track ? fragilityWindows(track) : [],
    field: track ? fieldFor(track.vector) : "12 10 9",
  };
}

function fieldFor(v: EmotionalVector): string {
  // Kept local to avoid importing the catalog's presentation helper into the
  // cognition path; identical maths, one dependency fewer.
  const luminance = 0.1 + (1 - v.depth) * 0.34;
  const r = Math.round(255 * luminance * (0.55 + v.warmth * 0.75));
  const g = Math.round(255 * luminance * (0.5 + v.warmth * 0.34 + v.narrative * 0.1));
  const b = Math.round(255 * luminance * (0.72 - v.warmth * 0.3 + v.cinema * 0.16));
  return `${Math.min(255, r)} ${Math.min(255, g)} ${Math.min(255, b)}`;
}

/* ────────────────────────────── ARC PLANNING ────────────────────────────── */

export type PlannedArc = {
  arc: DriftArc;
  phases: (DriftPhase & { field: string; audio: ResolvedAudio })[];
};

/**
 * Full-arc planning for the initial drift. Runs entirely on local cognition —
 * the model is consulted for *transitions*, where implicit feedback exists to
 * reason about, not for a cold-start arc where there is no behaviour to read.
 */
export async function planFullDrift(input: {
  origin: string;
  destination: string;
  sessionId: string;
  exclude?: string[];
  branches?: BranchState;
  soundCloudAccessToken?: string | null;
  overlay?: DriftTrack[];
  taste?: TasteSnapshot | TasteWire | null;
}): Promise<PlannedArc> {
  const arc = planDrift({
    origin: input.origin,
    destination: input.destination,
    seed: input.sessionId,
    exclude: input.exclude,
    branches: input.branches,
    overlay: input.overlay,
    taste: input.taste,
  });

  const phases = await Promise.all(
    arc.phases.map(async (phase) => {
      const track =
        input.overlay?.find((t) => t.id === phase.trackId) ?? driftTrack(phase.trackId);
      const audio = track
        ? await resolveAudio(track, input.soundCloudAccessToken)
        : {
            appleMusicId: null,
            appleMusicUrl: null,
            soundcloudUrl: null,
            streamUrl: null,
            source: "unresolved" as const,
            note: "Phase has no catalog entry.",
          };
      return { ...phase, field: track ? fieldFor(track.vector) : "12 10 9", audio };
    })
  );

  return { arc, phases };
}

/** Topography snapshot, safe to serialise into an RSC payload. */
export function topographySnapshot() {
  return TOPOGRAPHY.map((c) => ({
    id: c.id,
    label: c.label,
    x: c.x,
    y: c.y,
    description: c.description,
    vector: c.vector,
    avi: Number(acousticVulnerability(c.vector).toFixed(3)),
    cinematicMagnitude: Number(cinematicMagnitude(cinematicSpace(c.vector)).toFixed(3)),
    shape: describeVector(c.vector),
  }));
}
