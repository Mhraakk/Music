/**
 * Configurable ranking weights — single source of truth.
 * Do not scatter magic numbers through the ranker.
 */

export type RankWeights = {
  /** Emotional distance contribution (higher = distance hurts more) */
  distanceScale: number;
  /** How much compass dominates graph attract in target vector */
  compassMix: number;
  graphMix: number;
  /** Obscurity reward scaled by discovery depth */
  obscurityBase: number;
  obscurityDepthGain: number;
  /** Mainstream (v.m) penalty */
  mainstreamPenalty: number;
  /** Feedback soft signals */
  fbLike: number;
  fbLess: number;
  fbHeard: number;
  fbDislikeSoft: number;
  /** Session / ledger repetition */
  recentPenaltyBase: number;
  recentPenaltyStep: number;
  exposureCooldownPenalty: number;
  /** Near-tie rotation amplitude */
  rotationJitter: number;
  /** Diversity: min emotional distance between picks */
  diversityMinDist: number;
  /** Artist repeat soft block while filling */
  artistRepeatSoft: boolean;
};

/** Production defaults — tuned for current catalog + Vec space */
export const DEFAULT_WEIGHTS: RankWeights = {
  distanceScale: 3.4,
  compassMix: 0.72,
  graphMix: 0.28,
  obscurityBase: 0.7,
  obscurityDepthGain: 1.6,
  mainstreamPenalty: 1.5,
  fbLike: 3.2,
  fbLess: -1.6,
  fbHeard: -1.1,
  fbDislikeSoft: -3.0,
  recentPenaltyBase: 0.55,
  recentPenaltyStep: 0.06,
  exposureCooldownPenalty: 1.4,
  rotationJitter: 0.9,
  diversityMinDist: 0.24,
  artistRepeatSoft: true,
};

let activeWeights: RankWeights = { ...DEFAULT_WEIGHTS };

export function getWeights(): RankWeights {
  return activeWeights;
}

export function setWeights(partial: Partial<RankWeights>): RankWeights {
  activeWeights = { ...activeWeights, ...partial };
  return activeWeights;
}

export function resetWeights(): RankWeights {
  activeWeights = { ...DEFAULT_WEIGHTS };
  return activeWeights;
}
