export type {
  TasteHorizon, ContextLockMode, DiscoveryTemperature, RecBudget, DimensionKey,
  DimensionConfidence, TasteTwinSnapshot, MoodMomentum, ActiveLearningPair, ParallelUniverseSpec,
} from "./types";
export { PARALLEL_UNIVERSES } from "./types";
export { buildConfidenceMap, overallKnowledge, uncertainDimensions, confidentDimensions } from "./confidence";
export {
  getSession, setTemperature, setContextLock, setBudget, pushSessionListen,
  computeMomentum, sessionNarrative, applyContextLock, resetSessionRoom,
} from "./session";
export { getTasteTwin, answerTasteTwinQuestion, proposeActiveLearningPair } from "./twin";
export { batchEntropy, artistSaturationPenalty } from "./entropy";
export { SCENES, scenesForTrack, tracksInScene, discoverScenes } from "./scenes";
export { influenceChain, textureSearch } from "./graph";
export { counterfactualRemoveArtist, counterfactualEra } from "./counterfactual";
export { autopsyTrack, type AutopsyReport } from "./autopsy";
export { runPortal, PORTAL_LIST, scenePortal, type PortalId, type PortalResult } from "./portals";
export { compassToGps, trackToGps, journeyGps, type GpsPoint } from "./gps";
export {
  getTasteDNA, recomputeDnaFromFeedback, compositeAttract, negativeDnaPenalty,
  recordSkip, dnaSnapshot, applyDecay,
} from "./dna";
export type { TasteDNA, SkipKind, NegativeDna } from "./dna";
