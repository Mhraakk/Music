export { DEFAULT_WEIGHTS, getWeights, setWeights, resetWeights, type RankWeights } from "./weights";
export {
  recordExposure,
  recordShown,
  getStats,
  exposurePenalty,
  getExposureSnapshot,
  clearExposure,
  COOLDOWN_SOFT_MS,
  COOLDOWN_STRONG_MS,
  type ExposureEvent,
  type ExposureStats,
} from "./exposure";
export {
  scoreRecommendationHealth,
  HEALTH_THRESHOLD,
  type HealthInput,
  type HealthResult,
  type HealthBreakdown,
} from "./health";
export {
  makeCorrelationId,
  isValidEnvelope,
  emptyPreventedEnvelope,
  type RecommendationEnvelope,
  type ScoredItem,
  type RecTier,
} from "./envelope";
export { logEvent } from "./log";
