/**
 * MCP SERVER — TOOL REGISTRY AND DISPATCH
 *
 * A real Model Context Protocol server over JSON-RPC 2.0. It speaks
 * `initialize`, `tools/list`, `tools/call` and `ping`, which means the same
 * endpoint the Sonic Drift client calls can be pointed at by any MCP host —
 * Claude Desktop, an IDE, another agent — and it will expose the emotional
 * engine as tools rather than as a private HTTP API.
 *
 * Transport lives in the route handler. This module is transport-agnostic on
 * purpose: stdio or a streamable-HTTP bridge can reuse `handleRpc` verbatim.
 */

import {
  AXES,
  AXIS_KEYS,
  REJECTION_RULES,
  acousticVulnerability,
  anchorAlignment,
  cinematicMagnitude,
  cinematicSpace,
  describeVector,
  evaluateRejections,
  vec,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import { TOPOGRAPHY, adjacentCoordinates, auditTopography } from "@/lib/drift/topography";
import { catalogStats, driftTrack } from "@/lib/drift/catalog";
import { generateTasteExpansion, inspectExpansionEngine } from "@/lib/drift/expansion";
import { toLibraryTrack } from "@/lib/library";
import { materializeFavoriteOverlay, parseFavoriteOverlay } from "@/lib/apple/overlay";
import type { BranchState } from "@/lib/drift/algorithm";
import type { ResonanceSignal, ResonanceSignalKind } from "@/lib/drift/resonance";
import { geminiConfigured, geminiModel } from "./gemini";
import { musicKitConfig } from "@/lib/providers/musickit";
import { soundCloudConfig } from "@/lib/providers/soundcloud";
import { decideNextDrift, planFullDrift, topographySnapshot } from "./cognition";
import { NUCLEAR_TOOLS, nuclearCall, nuclearDescribeType, nuclearListMethods, nuclearMethodDetails } from "@/lib/nuclear/mcp";
import { resolveNuclearStream } from "@/lib/nuclear/resolve";
import { LISTEN_MCP_TOOLS, LISTEN_TOOL_NAMES, callListenTool } from "@/lib/mcp/listen-tools";
import {
  DEFAULT_PROTOCOL_VERSION,
  RPC,
  SERVER_INFO,
  errorResult,
  fail,
  negotiateProtocolVersion,
  ok,
  textResult,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type ToolDescriptor,
  type ToolResult,
} from "./protocol";

/** Per-request context the transport supplies. Never accepted from tool params. */
export type McpContext = {
  soundCloudAccessToken?: string | null;
};

/* ─────────────────────────────── TOOL SCHEMAS ─────────────────────────────── */

const COORDINATE_IDS = TOPOGRAPHY.map((c) => c.id);
const SIGNAL_KINDS: ResonanceSignalKind[] = [
  "volume_raise",
  "volume_lower",
  "dwell_complete",
  "abandon",
  "seek_back",
  "seek_forward",
  "stillness",
  "explicit_like",
  "explicit_dislike",
];

export const TOOLS: readonly ToolDescriptor[] = [
  {
    name: "get_next_emotional_drift",
    title: "Get next emotional drift",
    description:
      "Given a session's emotional arc and the listener's implicit feedback, return the next " +
      "emotional phase with the Apple MusicKit id or SoundCloud URL that occupies it. " +
      "Positive feedback deepens the current pattern, negative feedback prunes the branch, " +
      "partial feedback explores adjacent zones. There is no genre, tempo or popularity input.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Stable session identifier. Seeds deterministic tie-breaking.",
        },
        destination: {
          type: "string",
          description: "Emotional coordinate the listener is drifting toward.",
          enum: COORDINATE_IDS,
        },
        origin: {
          type: "string",
          description: "Coordinate the drift departed from.",
          enum: COORDINATE_IDS,
        },
        history: {
          type: "array",
          description:
            "Track ids already heard this session, oldest first. Used for exclusion. " +
            "A rolling window is expected — a drift has no end, so an unbounded history " +
            "would eventually exhaust the admissible pool.",
          items: { type: "string" },
        },
        trajectory: {
          type: "array",
          description:
            "The engine's own intended path: one target vector per phase so far, oldest " +
            "first. Authoritative for where the session is. Falls back to the substrate " +
            "positions of the heard tracks when omitted, which is less accurate once a " +
            "region runs thin and a compromise occupant has to be served.",
          items: {
            type: "object",
            properties: Object.fromEntries(
              AXES.map((a) => [a.key, { type: "number", minimum: 0, maximum: 1 }])
            ),
          },
        },
        signals: {
          type: "array",
          description:
            "Implicit feedback events. A volume gesture landing on a vocal fragility window " +
            "is the strongest signal available.",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: SIGNAL_KINDS },
              trackId: { type: "string" },
              progress: { type: "number", minimum: 0, maximum: 1 },
              fragility: { type: "number", minimum: 0, maximum: 1 },
              magnitude: { type: "number", minimum: 0, maximum: 1 },
              at: { type: "number", description: "Epoch milliseconds." },
            },
            required: ["kind", "trackId"],
          },
        },
        branches: {
          type: "object",
          description: "Branch memory by coordinate id: open, deepened or pruned.",
          additionalProperties: true,
        },
        libraryOverlay: {
          type: "array",
          description:
            "Circulating Favorite Songs positions from the listener's device. " +
            "The living catalog on a serverless instance cannot keep tens of thousands of loved recordings; " +
            "this window lets the next phase occupy them.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              artist: { type: "string" },
              duration: { type: "number" },
              vector: {
                type: "object",
                properties: Object.fromEntries(
                  AXES.map((a) => [a.key, { type: "number", minimum: 0, maximum: 1 }])
                ),
              },
              note: { type: "string" },
              appleMusicId: { type: "string" },
            },
          },
        },
      },
      required: ["sessionId", "destination"],
    },
  },
  {
    name: "plan_emotional_drift",
    title: "Plan an emotional drift",
    description:
      "Compute a complete 5-7 phase arc between two emotional coordinates. The path bows " +
      "through deeper territory rather than interpolating linearly, because the straight line " +
      "between two feelings does not exist.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        origin: { type: "string", enum: COORDINATE_IDS },
        destination: { type: "string", enum: COORDINATE_IDS },
        exclude: { type: "array", items: { type: "string" }, description: "Track ids to skip." },
        libraryOverlay: {
          type: "array",
          description:
            "Circulating Favorite Songs from the listener's device, so the planned arc can occupy loved recordings without writing them into the shared catalog.",
          items: { type: "object" },
        },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "describe_emotional_topography",
    title: "Describe the emotional topography",
    description:
      "Return the emotional map: every coordinate, its position on the 2D projection, its " +
      "full substrate vector, and its neighbours. This replaces the concept of a playlist index.",
    inputSchema: {
      type: "object",
      properties: {
        coordinate: {
          type: "string",
          description: "Restrict the answer to one coordinate and its neighbours.",
          enum: COORDINATE_IDS,
        },
      },
    },
  },
  {
    name: "evaluate_emotional_resonance",
    title: "Evaluate emotional resonance",
    description:
      "Score an arbitrary substrate position against the engine's baseline resonance and run " +
      "the strict rejection rules over it. Use this to check whether a position would be " +
      "admitted before drifting toward it.",
    inputSchema: {
      type: "object",
      properties: {
        vector: {
          type: "object",
          description: "Substrate position. Missing axes default to 0.5.",
          properties: Object.fromEntries(
            AXES.map((a) => [
              a.key,
              { type: "number", minimum: 0, maximum: 1, description: `${a.label}: 1.0 = ${a.high}` },
            ])
          ),
        },
        chartGravity: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Commercial gravity. Used adversarially by the rejection rules only.",
        },
      },
      required: ["vector"],
    },
  },
  {
    name: "generate_taste_expansion",
    title: "Generate ten new positions",
    description:
      "Search Apple Music for recordings near the listener's current taste — taste is a " +
      "position in the emotional substrate, never a genre — project each hit, run the " +
      "rejection rules, and return up to ten newly admitted positions with artwork and previews.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        history: {
          type: "array",
          items: { type: "string" },
          description: "Track ids already heard. Used to locate taste and to exclude repeats.",
        },
        tasteVectors: {
          type: "array",
          description: "Optional substrate positions of the heard tracks, when the server has not ingested them yet.",
          items: {
            type: "object",
            properties: Object.fromEntries(
              AXES.map((a) => [a.key, { type: "number", minimum: 0, maximum: 1 }])
            ),
          },
        },
        libraryVectors: {
          type: "array",
          description: "Sampled positions from the listener's Favorite Songs library.",
          items: {
            type: "object",
            properties: Object.fromEntries(
              AXES.map((a) => [a.key, { type: "number", minimum: 0, maximum: 1 }])
            ),
          },
        },
        libraryArtists: {
          type: "array",
          description: "Artists already occupying Favorite Songs — used as Apple search probes.",
          items: {
            type: "object",
            properties: { artist: { type: "string" }, via: { type: "string" } },
          },
        },
        exclude: {
          type: "array",
          items: { type: "string" },
          description: "Additional track ids to skip.",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "How many new positions to admit. Defaults to 10.",
        },
        analyze: {
          type: "boolean",
          description: "When true (default) and ffmpeg is present, refine vectors from the 30-second preview.",
        },
      },
    },
  },
  {
    name: "inspect_expansion_engine",
    title: "Inspect the expansion engine",
    description:
      "Run the expansion engine's offline self-test: feature projection, wander " +
      "determinism, taste probes, and a fixture generate-10. No network.",
    inputSchema: { type: "object", properties: {} },
  },
    ...NUCLEAR_TOOLS,
    ...LISTEN_MCP_TOOLS,
    {
      name: "nuclear_search_stream",
    title: "Search a free YouTube listen",
    description: "Find YouTube candidates for an artist and title (Nuclear two-phase search).",
    inputSchema: {
      type: "object",
      properties: {
        artist: { type: "string" },
        title: { type: "string" },
        query: { type: "string" },
      },
    },
  },
];

/* ─────────────────────────────── PARAM PARSING ─────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseSignals(value: unknown): ResonanceSignal[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  const kinds = new Set<string>(SIGNAL_KINDS);
  return value
    .map((raw) => asRecord(raw))
    .filter((raw) => kinds.has(asString(raw.kind)))
    .map((raw) => ({
      kind: asString(raw.kind) as ResonanceSignalKind,
      trackId: asString(raw.trackId, "unknown"),
      progress: asNumber(raw.progress, 0),
      fragility: asNumber(raw.fragility, 0),
      magnitude: asNumber(raw.magnitude, 0.5),
      at: asNumber(raw.at, now),
    }));
}

function parseBranches(value: unknown): BranchState {
  const raw = asRecord(value);
  const out: BranchState = {};
  for (const c of TOPOGRAPHY) {
    const entry = asRecord(raw[c.id]);
    const status = asString(entry.status);
    if (status === "open" || status === "deepened" || status === "pruned") {
      out[c.id] = { status, visits: asNumber(entry.visits, 0) };
    }
  }
  return out;
}

function parseVector(value: unknown): EmotionalVector {
  const raw = asRecord(value);
  const partial: Partial<EmotionalVector> = {};
  for (const axis of AXES) {
    const n = raw[axis.key];
    if (typeof n === "number" && Number.isFinite(n)) partial[axis.key] = n;
  }
  return vec(partial);
}

function parseVectors(value: unknown): EmotionalVector[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => parseVector(raw)).filter((v) => AXIS_KEYS.some((key) => v[key] !== 0.5));
}

function parseArtistProbes(value: unknown): { artist: string; via: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => asRecord(raw))
    .map((raw) => ({ artist: asString(raw.artist), via: asString(raw.via, asString(raw.artist)) }))
    .filter((row) => row.artist);
}

/* ────────────────────────────── TOOL HANDLERS ────────────────────────────── */

async function toolGetNextEmotionalDrift(args: Record<string, unknown>, context: McpContext): Promise<ToolResult> {
  const sessionId = asString(args.sessionId, `session_${Date.now()}`);
  const destination = asString(args.destination, "cinematic_warmth");
  const origin = asString(args.origin, "deep_melancholy");
  const heard = asStringArray(args.history);

  /**
   * The arc the cognition layer reasons about is a sequence of emotional
   * vectors, not of songs. A caller that has tracked its own targets should send
   * them; otherwise they are reconstructed from the heard tracks, which is a
   * reasonable approximation until a region runs thin and the engine has to
   * serve an imperfect occupant.
   */
  const supplied = Array.isArray(args.trajectory)
    ? args.trajectory.map((raw) => parseVector(raw))
    : [];
  const trajectory: EmotionalVector[] = supplied.length
    ? supplied
    : heard
        .map((id) => driftTrack(id)?.vector)
        .filter((v): v is EmotionalVector => Boolean(v));

  const overlay = materializeFavoriteOverlay(parseFavoriteOverlay(args.libraryOverlay));

  try {
    const decision = await decideNextDrift({
      sessionId,
      origin,
      destination,
      trajectory,
      exclude: heard,
      signals: parseSignals(args.signals),
      branches: parseBranches(args.branches),
      soundCloudAccessToken: context.soundCloudAccessToken ?? null,
      overlay,
    });

    const summary = [
      `Next phase → ${decision.phase.region.replace(/_/g, " ")}`,
      `${decision.phase.artist} — ${decision.phase.title}`,
      `Mode: ${decision.reading.mode} (valence ${decision.reading.valence.toFixed(2)}, confidence ${decision.reading.confidence.toFixed(2)})`,
      `AVI ${decision.phase.keys.avi.toFixed(2)} · cinematic space ${decision.phase.keys.cinematicMagnitude.toFixed(2)}`,
      `Cognition: ${decision.cognition.source} — ${decision.cognition.note}`,
      `Audio: ${decision.audio.source}${decision.audio.appleMusicId ? ` · apple:${decision.audio.appleMusicId}` : ""}${decision.audio.soundcloudUrl ? ` · ${decision.audio.soundcloudUrl}` : ""}`,
    ].join("\n");

    return textResult(summary, decision);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "Drift computation failed.");
  }
}

async function toolPlanEmotionalDrift(args: Record<string, unknown>, context: McpContext): Promise<ToolResult> {
  const planned = await planFullDrift({
    origin: asString(args.origin, "deep_melancholy"),
    destination: asString(args.destination, "cinematic_warmth"),
    sessionId: asString(args.sessionId, `session_${Date.now()}`),
    exclude: asStringArray(args.exclude),
    soundCloudAccessToken: context.soundCloudAccessToken ?? null,
    overlay: materializeFavoriteOverlay(parseFavoriteOverlay(args.libraryOverlay)),
  });

  const summary = [
    planned.arc.narrative,
    "",
    ...planned.phases.map(
      (p) =>
        `${p.index + 1}. [${p.chapter}] ${p.region.replace(/_/g, " ")} — ${p.artist} — ${p.title} ` +
        `(AVI ${p.keys.avi.toFixed(2)}, step ${p.step.toFixed(2)})`
    ),
  ].join("\n");

  return textResult(summary, planned);
}

function toolDescribeTopography(args: Record<string, unknown>): ToolResult {
  const focus = asString(args.coordinate);
  const snapshot = topographySnapshot();

  if (focus) {
    const target = snapshot.find((c) => c.id === focus);
    if (!target) return errorResult(`Unknown coordinate "${focus}".`);
    const neighbours = adjacentCoordinates(focus, 3);
    return textResult(
      [
        `${target.label} — ${target.description}`,
        `Shape: ${target.shape}`,
        `AVI ${target.avi} · cinematic space ${target.cinematicMagnitude}`,
        `Neighbours: ${neighbours.map((n) => n.label).join(", ")}`,
      ].join("\n"),
      { coordinate: target, neighbours: neighbours.map((n) => ({ id: n.id, label: n.label })) }
    );
  }

  return textResult(
    [
      `${snapshot.length} emotional coordinates. There are no playlists.`,
      ...snapshot.map((c) => `- ${c.label} (${c.id}) @ x=${c.x} y=${c.y} — ${c.shape}`),
    ].join("\n"),
    { coordinates: snapshot, audit: auditTopography() }
  );
}

function toolEvaluateResonance(args: Record<string, unknown>): ToolResult {
  const vector = parseVector(args.vector);
  const chartGravity = asNumber(args.chartGravity, 0);
  const verdict = evaluateRejections(vector, chartGravity);
  const anchor = anchorAlignment(vector);
  const csv = cinematicSpace(vector);

  const structured = {
    vector,
    acousticVulnerabilityIndex: acousticVulnerability(vector),
    cinematicSpace: csv,
    cinematicMagnitude: cinematicMagnitude(csv),
    baselineResonance: anchor,
    shape: describeVector(vector),
    admitted: !verdict.rejected,
    violations: verdict.violations,
  };

  const summary = [
    `Shape: ${structured.shape}`,
    `AVI ${structured.acousticVulnerabilityIndex.toFixed(3)} · cinematic space ${structured.cinematicMagnitude.toFixed(3)}`,
    `Nearest baseline anchor: ${anchor.nearest} (${anchor.alignment.toFixed(3)}) — ${anchor.note}`,
    verdict.rejected
      ? `REFUSED: ${verdict.violations[0]?.statement} (severity ${verdict.severity.toFixed(2)})`
      : `Admitted. Strongest sub-threshold concern: ${verdict.violations[0]?.id ?? "none"}`,
  ].join("\n");

  return textResult(summary, structured);
}

async function toolGenerateTasteExpansion(args: Record<string, unknown>): Promise<ToolResult> {
  const result = await generateTasteExpansion({
    historyIds: asStringArray(args.history),
    tasteVectors: parseVectors(args.tasteVectors),
    libraryVectors: parseVectors(args.libraryVectors),
    libraryArtists: parseArtistProbes(args.libraryArtists),
    excludeIds: asStringArray(args.exclude),
    limit: asNumber(args.limit, 10),
    analyze: args.analyze === false ? false : true,
  });

  const libraryTracks = result.tracks.map((item) => toLibraryTrack(item.track));
  const summary = [
    result.note,
    `Taste: ${result.taste.note}`,
    `Probes: ${result.probes.join(", ") || "none"}`,
    ...result.tracks.map(
      (item, i) =>
        `${i + 1}. ${item.track.artist} — ${item.track.title} ` +
        `(${item.track.region.replace(/_/g, " ")}, AVI ${item.track.avi.toFixed(2)}, ${item.projection})`
    ),
  ].join("\n");

  return textResult(summary, { ...result, libraryTracks });
}

function toolInspectExpansionEngine(): ToolResult {
  const inspection = inspectExpansionEngine();
  const summary = [
    `${inspection.passed}/${inspection.passed + inspection.failed} expansion checks passed.`,
    ...inspection.checks.map((c) => `${c.ok ? "ok" : "FAIL"}  ${c.label}${c.detail ? ` — ${c.detail}` : ""}`),
  ].join("\n");
  return textResult(summary, inspection);
}

async function callTool(name: string, args: Record<string, unknown>, context: McpContext): Promise<ToolResult> {
  switch (name) {
    case "get_next_emotional_drift":
      return toolGetNextEmotionalDrift(args, context);
    case "plan_emotional_drift":
      return toolPlanEmotionalDrift(args, context);
    case "describe_emotional_topography":
      return toolDescribeTopography(args);
    case "evaluate_emotional_resonance":
      return toolEvaluateResonance(args);
    case "generate_taste_expansion":
      return toolGenerateTasteExpansion(args);
    case "inspect_expansion_engine":
      return toolInspectExpansionEngine();
    case "list_methods":
      return nuclearListMethods(asString(args.domain, "Metadata"));
    case "method_details":
      return nuclearMethodDetails(asString(args.method));
    case "describe_type":
      return nuclearDescribeType(asString(args.type, asString(args.typeName, "Track")));
    case "call": {
      const nested = asRecord(args.params);
      return nuclearCall(asString(args.method), { ...args, ...nested });
    }
    case "nuclear_search_stream": {
      const resolved = await resolveNuclearStream({
        artist: asString(args.artist),
        title: asString(args.title),
        query: asString(args.query) || undefined,
      });
      return textResult(resolved.note, resolved);
    }
    default:
      if (LISTEN_TOOL_NAMES.has(name)) return callListenTool(name, args);
      return errorResult(`Unknown tool "${name}".`);
  }
}

/* ──────────────────────────────── DISPATCH ──────────────────────────────── */

/** Engine capability and configuration report, also served by the health route. */
export function engineStatus() {
  const stats = catalogStats();
  return {
    server: SERVER_INFO,
    protocolVersion: DEFAULT_PROTOCOL_VERSION,
    cognition: {
      gemini: geminiConfigured(),
      model: geminiConfigured() ? geminiModel() : null,
      fallback: "deterministic local cognition",
    },
    providers: {
      appleMusicKit: musicKitConfig(),
      soundCloud: soundCloudConfig(),
    },
    ontology: {
      axes: AXES.map((a) => a.key),
      genreFields: 0,
      catalogSize: stats.living,
      living: stats.living,
      seed: stats.seed,
      harvested: stats.harvested,
      expanded: stats.expanded,
      favorites: stats.favorites,
      admitted: stats.admitted,
      refused: stats.refused,
      rejectionRules: REJECTION_RULES.map((r) => r.id),
    },
    topography: {
      coordinates: TOPOGRAPHY.length,
      audit: auditTopography(),
    },
    tools: TOOLS.map((t) => t.name),
  };
}

/**
 * Handle one JSON-RPC message. Returns `null` for notifications, which by spec
 * must not receive a response.
 */
export async function handleRpc(message: unknown, context: McpContext): Promise<JsonRpcResponse | null> {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return fail(null, RPC.INVALID_REQUEST, "Request must be a JSON-RPC 2.0 object.");
  }

  const request = message as JsonRpcRequest;
  const id: JsonRpcId = request.id ?? null;

  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return fail(id, RPC.INVALID_REQUEST, 'Missing "jsonrpc": "2.0" or "method".');
  }

  // Notifications carry no id and must be acknowledged with silence.
  const isNotification = request.id === undefined || request.id === null;

  switch (request.method) {
    case "initialize": {
      const params = asRecord(request.params);
      return ok(id, {
        protocolVersion: negotiateProtocolVersion(params.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Sonic Drift reasons about music as emotional structure. Candidates are anonymous " +
          "substrate coordinates: no genre, tempo or popularity is available to you or to the " +
          "engine. Call get_next_emotional_drift to advance a session, or generate_taste_expansion " +
          "to admit ten new Apple Music positions near the listener's taste. Nuclear-shaped tools " +
          "(list_methods, call) search Apple Music and resolve YouTube full listens. " +
          "Ask tools (find_music, browse_atlas, fetch_lyrics, research_recording, share_listen) " +
          "are also first-class on this endpoint. No skip.",
      });
    }

    case "notifications/initialized":
    case "notifications/cancelled":
      return null;

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const params = asRecord(request.params);
      const name = asString(params.name);
      if (!name) return fail(id, RPC.INVALID_PARAMS, 'tools/call requires "name".');
      try {
        const result = await callTool(name, asRecord(params.arguments), context);
        return ok(id, result);
      } catch (error) {
        return fail(
          id,
          RPC.INTERNAL_ERROR,
          error instanceof Error ? error.message : "Tool execution failed."
        );
      }
    }

    default:
      if (isNotification) return null;
      return fail(id, RPC.METHOD_NOT_FOUND, `Unknown method "${request.method}".`);
  }
}
