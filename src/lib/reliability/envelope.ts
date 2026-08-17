/**
 * RecommendationEnvelope - single contract for UI, agent, and API.
 */

import type { Track } from "@/lib/tracks";
import type { HealthResult } from "./health";

export type RecTier =
  | "primary"
  | "relaxed"
  | "soft-fallback"
  | "absolute"
  | "full-rotate"
  | "emergency"
  | "cached"
  | "seed";

export type ScoredItem = {
  t: Track;
  s: number;
  reason: string;
  debug?: string;
};

export type RecommendationEnvelope = {
  items: ScoredItem[];
  tier: RecTier | string;
  message: string | null;
  health: HealthResult;
  correlationId: string;
  sources: string[];
  warnings: string[];
  metrics: {
    poolSize: number;
    latencyMs: number;
    catalogSize: number;
    exposureSuppressed: number;
  };
  graph?: {
    voice: string;
    avoids: string[];
    liked: number;
    hated: number;
  };
};

export function makeCorrelationId(prefix = "rec"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidEnvelope(v: unknown): v is RecommendationEnvelope {
  if (!v || typeof v !== "object") return false;
  const e = v as RecommendationEnvelope;
  return Array.isArray(e.items) && e.items.length > 0 && typeof e.tier === "string";
}

export function emptyPreventedEnvelope(
  fallbackItems: ScoredItem[],
  reason: string,
  catalogSize: number
): RecommendationEnvelope {
  const health = {
    score: 0.35,
    ok: fallbackItems.length > 0,
    breakdown: {
      count: fallbackItems.length > 0 ? 0.5 : 0,
      diversity: 0.5,
      artistSpread: 0.5,
      novelty: 0.5,
      metadata: 1,
      artwork: 0.8,
      coherence: 0.5,
      tierPenalty: 0.25,
    },
    warnings: ["empty_prevented", reason],
  };
  return {
    items: fallbackItems,
    tier: "emergency",
    message: reason,
    health,
    correlationId: makeCorrelationId(),
    sources: ["local-catalog"],
    warnings: health.warnings,
    metrics: {
      poolSize: fallbackItems.length,
      latencyMs: 0,
      catalogSize,
      exposureSuppressed: 0,
    },
  };
}
