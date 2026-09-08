/**
 * MCP CLIENT (BROWSER)
 *
 * The Sonic Drift UI is itself an MCP client. It does not call a private REST
 * endpoint that happens to wrap the engine — it speaks JSON-RPC 2.0 to the same
 * `/api/mcp` surface any other MCP host would use. There is exactly one
 * cognitive interface, and the app has no privileged access to it.
 */

import type { EmotionalVector } from "@/lib/drift/ontology";
import type { BranchState, DriftPhase } from "@/lib/drift/algorithm";
import type { ResonanceSignal } from "@/lib/drift/resonance";
import type { ResolvedAudio } from "@/lib/providers/resolve";
import type { ResonanceReading } from "@/lib/drift/resonance";
import type { CognitionTrace } from "./cognition";

const ENDPOINT = "/api/mcp";

let requestId = 0;

export type McpCallOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

async function callTool<T>(name: string, args: Record<string, unknown>): Promise<McpCallOutcome<T>> {
  requestId += 1;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `transport returned ${response.status}` };
    }

    const payload = (await response.json()) as {
      error?: { message?: string };
      result?: { isError?: boolean; content?: { text?: string }[]; structuredContent?: T };
    };

    if (payload.error) {
      return { ok: false, error: payload.error.message ?? "cognitive core returned an error" };
    }
    if (payload.result?.isError) {
      return { ok: false, error: payload.result.content?.[0]?.text ?? "tool reported failure" };
    }
    if (payload.result?.structuredContent === undefined) {
      return { ok: false, error: "tool returned no structured content" };
    }

    return { ok: true, value: payload.result.structuredContent };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "transport failure" };
  }
}

/** Mirrors the `DriftDecision` returned by the cognition layer. */
export type NextDriftPayload = {
  phase: DriftPhase;
  branches: BranchState;
  reading: ResonanceReading;
  cognition: CognitionTrace;
  audio: ResolvedAudio;
  fragilityWindows: { start: number; end: number; intensity: number }[];
  field: string;
};

export function getNextEmotionalDrift(args: {
  sessionId: string;
  origin: string;
  destination: string;
  history: string[];
  signals: ResonanceSignal[];
  branches: BranchState;
}): Promise<McpCallOutcome<NextDriftPayload>> {
  return callTool<NextDriftPayload>("get_next_emotional_drift", args);
}

export type PlannedArcPayload = {
  arc: {
    id: string;
    origin: string;
    destination: string;
    phases: DriftPhase[];
    narrative: string;
    source: string;
  };
  phases: (DriftPhase & { field: string; audio: ResolvedAudio })[];
};

export function planEmotionalDrift(args: {
  sessionId: string;
  origin: string;
  destination: string;
  exclude?: string[];
}): Promise<McpCallOutcome<PlannedArcPayload>> {
  return callTool<PlannedArcPayload>("plan_emotional_drift", args);
}

export function evaluateEmotionalResonance(args: {
  vector: Partial<EmotionalVector>;
  chartGravity?: number;
}): Promise<McpCallOutcome<{ admitted: boolean; violations: { id: string; statement: string }[] }>> {
  return callTool("evaluate_emotional_resonance", args);
}
