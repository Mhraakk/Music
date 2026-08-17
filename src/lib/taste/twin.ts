/**
 * Taste Twin — a speakable model of the listener.
 */
import { graph, type Compass, type FB } from "@/lib/engine";
import {
  buildConfidenceMap,
  overallKnowledge,
  uncertainDimensions,
  confidentDimensions,
} from "./confidence";
import {
  getSession,
  computeMomentum,
  sessionNarrative,
} from "./session";
import type { TasteTwinSnapshot, ActiveLearningPair } from "./types";
import { TRACKS } from "@/lib/tracks";
import { keyOf } from "@/lib/engine";
import { emotionalDist } from "@/lib/engine";

export function getTasteTwin(fb: FB, compass: Compass, depth: number): TasteTwinSnapshot {
  const g = graph(fb);
  const map = buildConfidenceMap(fb, compass);
  const know = overallKnowledge(map);
  const session = getSession();
  const momentum = computeMomentum();
  const narrative = sessionNarrative();

  const confident = confidentDimensions(map, 4).filter((d) => d.confidence >= 0.45);
  const uncertain = uncertainDimensions(map, 3).filter((d) => d.confidence < 0.55);

  let summary: string;
  if (know < 0.25) {
    summary =
      "I'm still early with you — more signal than certainty. Teach me with more / less and I'll sharpen fast.";
  } else if (know < 0.55) {
    summary = `I know the shape of your room (${g.voice}) but a few walls are still soft.`;
  } else {
    summary = `I can navigate your taste with real confidence. ${g.voice}.`;
  }

  return {
    voice: g.voice,
    howWellIKnowYou: know,
    summary,
    confident,
    uncertain,
    avoids: g.avoids,
    attract: g.attract,
    compass,
    depth,
    temperature: session.temperature,
    budget: session.budget,
    contextLock: session.contextLock,
    momentum,
    sessionNarrative: narrative,
  };
}

export function answerTasteTwinQuestion(
  question: string,
  fb: FB,
  compass: Compass,
  depth: number
): string {
  const twin = getTasteTwin(fb, compass, depth);
  const q = question.toLowerCase();

  if (/چقدر|how well|how much.*know|می.?شناسی/.test(q)) {
    const pct = Math.round(twin.howWellIKnowYou * 100);
    return `I'd say ${pct}% — ${twin.summary}\nVoice: ${twin.voice}`;
  }

  if (/مطمئن نیست|unsure|uncertain|doubt|نمی.?دونی/.test(q)) {
    if (!twin.uncertain.length) {
      return "I'm relatively even across dimensions right now. A pairwise choice would still refine me.";
    }
    return (
      "I'm least sure about:\n" +
      twin.uncertain
        .map((d) => `• ${d.label} (confidence ${Math.round(d.confidence * 100)}%)`)
        .join("\n") +
      "\nI should ask you a focused comparison next."
    );
  }

  if (/چرا.*دوست|why.*like|why.*think/.test(q)) {
    const top = twin.confident.slice(0, 3);
    if (!top.length) {
      return `From what little I've seen: ${twin.voice}. Not enough likes yet to argue specifics.`;
    }
    return (
      `Because your signal clusters around:\n` +
      top.map((d) => `• ${d.label} ≈ ${Math.round(d.estimate * 100)}% (conf ${Math.round(d.confidence * 100)}%)`).join("\n") +
      (twin.avoids.length ? `\nAnd you tend to push away: ${twin.avoids.join(", ")}.` : "")
    );
  }

  if (/narrative|امشب|session|خلاصه/.test(q)) {
    return twin.sessionNarrative || "Not enough of a path yet tonight to narrate.";
  }

  if (/momentum|مسیر|direction/.test(q)) {
    return twin.momentum
      ? `Mood momentum: ${twin.momentum.label} (strength ${twin.momentum.strength}).`
      : "No strong directional drift this session yet.";
  }

  return [
    twin.summary,
    `Knowing you: ${Math.round(twin.howWellIKnowYou * 100)}%`,
    twin.confident.length
      ? `Strong: ${twin.confident.map((d) => d.label).join(" · ")}`
      : null,
    twin.uncertain.length
      ? `Soft: ${twin.uncertain.map((d) => d.label).join(" · ")}`
      : null,
    twin.momentum ? `Momentum: ${twin.momentum.label}` : null,
    twin.sessionNarrative,
  ]
    .filter(Boolean)
    .join("\n");
}

export function proposeActiveLearningPair(fb: FB, compass: Compass): ActiveLearningPair | null {
  const map = buildConfidenceMap(fb, compass);
  const target = uncertainDimensions(map, 1)[0];
  if (!target || target.confidence > 0.7) return null;

  const extract =
    target.key === "dark"
      ? (t: (typeof TRACKS)[0]) => t.v.d
      : target.key === "warm"
        ? (t: (typeof TRACKS)[0]) => t.v.w
        : target.key === "organic"
          ? (t: (typeof TRACKS)[0]) => t.v.o
          : target.key === "energy"
            ? (t: (typeof TRACKS)[0]) => t.v.e
            : target.key === "sad"
              ? (t: (typeof TRACKS)[0]) => t.v.s
              : target.key === "obscurity"
                ? (t: (typeof TRACKS)[0]) => t.obscurity
                : (t: (typeof TRACKS)[0]) => 1 - t.v.m;

  const known = new Set(Object.keys(fb).map((k) => k));
  const pool = TRACKS.filter((t) => !known.has(keyOf(t.artist, t.title)));
  if (pool.length < 2) return null;

  const sorted = [...pool].sort((a, b) => extract(a) - extract(b));
  const left = sorted[0];
  const right = sorted[sorted.length - 1];

  return {
    id: `al_${left.id}_${right.id}`,
    prompt: `Which sits closer to your ear right now? (probing ${target.label})`,
    left: { id: left.id, title: left.title, artist: left.artist, why: left.why },
    right: { id: right.id, title: right.title, artist: right.artist, why: right.why },
    dimension: target.key,
    leftSignal: `lower ${target.label}`,
    rightSignal: `higher ${target.label}`,
  };
}
