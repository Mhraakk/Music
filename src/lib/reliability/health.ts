/**
 * Recommendation Health Score
 */
import type { Track } from "@/lib/tracks";
export type HealthInput = {
  items: { t: Track; s: number }[];
  tier: string;
  catalogSize: number;
  hardVetoes?: number;
};
export type HealthBreakdown = {
  count: number;
  diversity: number;
  artistSpread: number;
  novelty: number;
  metadata: number;
  artwork: number;
  coherence: number;
  tierPenalty: number;
};
export type HealthResult = {
  score: number;
  ok: boolean;
  breakdown: HealthBreakdown;
  warnings: string[];
};
const THRESHOLD = 0.45;
function uniqueRatio(ids: string[]): number {
  if (!ids.length) return 0;
  return new Set(ids).size / ids.length;
}
export function scoreRecommendationHealth(input: HealthInput): HealthResult {
  const { items, tier, catalogSize } = input;
  const warnings: string[] = [];
  const count = items.length;
  const countScore = Math.min(1, count / Math.min(6, Math.max(3, catalogSize)));
  const artists = items.map((x) => x.t.artist.toLowerCase());
  const artistSpread = uniqueRatio(artists);
  if (artistSpread < 0.5 && count >= 3) warnings.push("artist_clustering");
  const obscurities = items.map((x) => x.t.obscurity);
  const novelty =
    obscurities.length === 0 ? 0 : obscurities.reduce((a, b) => a + b, 0) / obscurities.length;
  const metadata =
    items.length === 0
      ? 0
      : items.filter((x) => x.t.title && x.t.artist && x.t.duration > 0).length / items.length;
  const artwork =
    items.length === 0
      ? 0
      : items.filter((x) => x.t.coverUrl && x.t.coverUrl.startsWith("http")).length / items.length;
  if (artwork < 0.8) warnings.push("missing_artwork");
  let coherence = 0.7;
  if (items.length >= 2) {
    const energies = items.map((x) => x.t.v.e);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((a, e) => a + (e - mean) * (e - mean), 0) / energies.length;
    const std = Math.sqrt(variance);
    coherence = std < 0.05 ? 0.45 : std > 0.45 ? 0.55 : 0.85;
  }
  const tierPenalty =
    tier === "primary" || tier === "relaxed"
      ? 0
      : tier === "soft-fallback"
        ? 0.08
        : tier === "absolute" || tier === "full-rotate"
          ? 0.15
          : tier === "emergency"
            ? 0.25
            : 0.1;
  if (count === 0) warnings.push("empty_batch");
  const breakdown: HealthBreakdown = {
    count: countScore,
    diversity: artistSpread,
    artistSpread,
    novelty: Math.min(1, novelty + 0.15),
    metadata,
    artwork,
    coherence,
    tierPenalty,
  };
  const raw =
    breakdown.count * 0.22 +
    breakdown.diversity * 0.18 +
    breakdown.novelty * 0.12 +
    breakdown.metadata * 0.15 +
    breakdown.artwork * 0.12 +
    breakdown.coherence * 0.21 -
    breakdown.tierPenalty;
  const score = Math.max(0, Math.min(1, raw));
  const ok = score >= THRESHOLD && count > 0;
  if (!ok) warnings.push("health_below_threshold");
  return { score, ok, breakdown, warnings };
}
export const HEALTH_THRESHOLD = THRESHOLD;
