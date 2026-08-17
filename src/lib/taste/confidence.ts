/**
 * Taste Confidence Map
 */
import type { Compass, FB } from "@/lib/engine";
import { TRACKS } from "@/lib/tracks";
import { keyOf } from "@/lib/engine";
import type { DimensionConfidence, DimensionKey } from "./types";

const DIM_LABELS: Record<DimensionKey, string> = {
  dark: "darkness / nocturne",
  warm: "warmth / intimacy",
  organic: "organic vs electronic texture",
  energy: "energy / pulse",
  sad: "melancholy",
  obscurity: "appetite for the long tail",
  mainstream_tolerance: "tolerance for chart gravity",
};

export function buildConfidenceMap(fb: FB, compass: Compass): DimensionConfidence[] {
  const liked = TRACKS.filter((t) => {
    const k = fb[keyOf(t.artist, t.title)]?.kind;
    return k === "more" || k === "like";
  });
  const hated = TRACKS.filter((t) => fb[keyOf(t.artist, t.title)]?.kind === "dislike");
  const heard = TRACKS.filter((t) => fb[keyOf(t.artist, t.title)]?.kind === "heard");
  const n = liked.length + hated.length + heard.length * 0.3;

  function axisConfidence(
    key: DimensionKey,
    extract: (t: (typeof TRACKS)[0]) => number,
    compassVal?: number
  ): DimensionConfidence {
    if (liked.length + hated.length === 0) {
      return {
        key,
        confidence: Math.min(0.25, n * 0.05),
        estimate: compassVal ?? 0.5,
        samples: Math.round(n),
        label: DIM_LABELS[key],
      };
    }
    const likeVals = liked.map(extract);
    const hateVals = hated.map(extract);
    const likeMean = likeVals.length
      ? likeVals.reduce((a, b) => a + b, 0) / likeVals.length
      : compassVal ?? 0.5;
    let separation = 0.3;
    if (hateVals.length && likeVals.length) {
      const hateMean = hateVals.reduce((a, b) => a + b, 0) / hateVals.length;
      separation = Math.min(1, Math.abs(likeMean - hateMean) * 2);
    }
    const sampleFactor = Math.min(1, (liked.length + hated.length) / 8);
    const confidence = Math.min(0.95, 0.2 + sampleFactor * 0.5 + separation * 0.35);
    return {
      key,
      confidence: Number(confidence.toFixed(3)),
      estimate: Number(likeMean.toFixed(3)),
      samples: liked.length + hated.length,
      label: DIM_LABELS[key],
    };
  }

  return [
    axisConfidence("dark", (t) => t.v.d, compass.dark),
    axisConfidence("warm", (t) => t.v.w, compass.warm),
    axisConfidence("organic", (t) => t.v.o, compass.organic),
    axisConfidence("energy", (t) => t.v.e, compass.energy),
    axisConfidence("sad", (t) => t.v.s, compass.sad),
    axisConfidence("obscurity", (t) => t.obscurity, 0.7),
    axisConfidence("mainstream_tolerance", (t) => 1 - t.v.m, 0.7),
  ];
}

export function overallKnowledge(map: DimensionConfidence[]): number {
  if (!map.length) return 0;
  const avg = map.reduce((a, d) => a + d.confidence, 0) / map.length;
  return Number(avg.toFixed(3));
}

export function uncertainDimensions(map: DimensionConfidence[], max = 3): DimensionConfidence[] {
  return [...map].sort((a, b) => a.confidence - b.confidence).slice(0, max);
}

export function confidentDimensions(map: DimensionConfidence[], max = 4): DimensionConfidence[] {
  return [...map].sort((a, b) => b.confidence - a.confidence).slice(0, max);
}
