/**
 * Configurable ranking weights - single source of truth.
 * Do not scatter magic numbers through the ranker.
 */

export type RankWeights = {
  distanceScale: number;
  compassMix: number;
  graphMix: number;
  obscurityBase: number;
  obscurityDepthGain: number;
  mainstreamPenalty: number;
  fbLike: number;
  fbLess: number;
  fbHeard: number;
  fbDislikeSoft: number;
  recentPenaltyBase: number;
  recentPenaltyStep: number;
  exposureCooldownPenalty: number;
  rotationJitter: number;
  diversityMinDist: number;
  artistRepeatSoft: boolean;
};

export const DEFAULT_WEIGHTS: RankWeights = {
  distanceScale: 3.4,
  compassMix: 0.72,
  graphMix: 0.28,
  obscurityBase: 0.7,
  obscurityDepthGain: 1.6,
  mainstreamPenalty: 1.5,
  fbLike: 3.5,
  fbLess: -2.0,
  fbHeard: -1.4,
  fbDislikeSoft: -5.5,
  recentPenaltyBase: 0.85,
  recentPenaltyStep: 0.08,
  exposureCooldownPenalty: 2.2,
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
