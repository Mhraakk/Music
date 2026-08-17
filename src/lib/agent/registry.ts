/**
 * Versioned agent registry
 */
import { TOOL_CATALOG } from "./intent";
import { SAFETY_RULES } from "./safety";

export const RESONANT_COMPANION = {
  id: "resonant-companion",
  version: "1.1.0",
  name: "RESONANT Intelligence",
  role: "coordinator",
  description:
    "In-app control surface for recommendations, taste memory, journeys, player, and playlist drafts. Not a generic chatbot.",
  tools: TOOL_CATALOG.map((t) => t.name),
  toolCatalog: TOOL_CATALOG,
  safety: [...SAFETY_RULES],
  constraints: {
    obscurityFloor: 0.55,
    neverInventMetadata: true,
    catalogOnly: true,
    maxRecsPerTurn: 8,
    exportRequiresConfirm: true,
    accountMutation: false,
  },
  specialists: [
    { id: "verification", when: "before any track leaves a tool" },
    { id: "recommendation", when: "generate / refine recommendations" },
    { id: "journey-architect", when: "buildJourney" },
    { id: "taste-profiler", when: "getTasteProfile / updateTasteMemory" },
    { id: "observer", when: "inspectRecommendationPipeline / debug" },
  ],
  createdAt: "2026-08-17",
} as const;

export type AgentDefinition = typeof RESONANT_COMPANION;

export function getAgentDefinition() {
  return RESONANT_COMPANION;
}
