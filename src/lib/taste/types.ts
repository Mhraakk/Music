import type { Compass } from "@/lib/engine";
import type { Vec } from "@/lib/tracks";

export type TasteHorizon = "long" | "medium" | "session";

export type ContextLockMode =
  | "none"
  | "feel_only"
  | "genre_only"
  | "era_lock"
  | "vocal_lock";

export type DiscoveryTemperature = number;

export type RecBudget = {
  safe: number;
  explore: number;
  wildcard: number;
};

export type DimensionKey =
  | "dark"
  | "warm"
  | "organic"
  | "energy"
  | "sad"
  | "obscurity"
  | "mainstream_tolerance";

export type DimensionConfidence = {
  key: DimensionKey;
  confidence: number;
  estimate: number;
  samples: number;
  label: string;
};

export type TasteTwinSnapshot = {
  voice: string;
  howWellIKnowYou: number;
  summary: string;
  confident: DimensionConfidence[];
  uncertain: DimensionConfidence[];
  avoids: string[];
  attract: Vec;
  compass: Compass;
  depth: number;
  temperature: DiscoveryTemperature;
  budget: RecBudget;
  contextLock: ContextLockMode;
  momentum: MoodMomentum | null;
  sessionNarrative: string | null;
};

export type MoodMomentum = {
  delta: Partial<Compass>;
  label: string;
  strength: number;
};

export type ActiveLearningPair = {
  id: string;
  prompt: string;
  left: { id: string; title: string; artist: string; why: string };
  right: { id: string; title: string; artist: string; why: string };
  dimension: DimensionKey;
  leftSignal: string;
  rightSignal: string;
};

export type ParallelUniverseSpec = {
  name: string;
  organicShift: number;
  energyShift: number;
  darkShift: number;
  warmShift: number;
  description: string;
};

export const PARALLEL_UNIVERSES: ParallelUniverseSpec[] = [
  {
    name: "Jazz nocturne",
    organicShift: 0.25,
    energyShift: -0.1,
    darkShift: 0.05,
    warmShift: 0.1,
    description: "Same nocturnal weight — brushed metal and breath instead of circuits",
  },
  {
    name: "Minimal electronic",
    organicShift: -0.3,
    energyShift: 0.05,
    darkShift: 0.08,
    warmShift: -0.12,
    description: "Same melancholy geometry — cleaner edges, less dust",
  },
  {
    name: "Post-rock expanse",
    organicShift: 0.15,
    energyShift: 0.15,
    darkShift: 0.05,
    warmShift: -0.05,
    description: "Same emotional arc — wider horizon, slower bloom",
  },
  {
    name: "Dub-tech Berlin",
    organicShift: -0.15,
    energyShift: -0.05,
    darkShift: 0.12,
    warmShift: -0.08,
    description: "Same night pressure — delay as architecture",
  },
];
