/**
 * First-class MCP wrappers for the same tools Ask uses.
 *
 * Cursor / Claude Desktop talking to POST /api/mcp get find_music, atlas,
 * lyrics, research, share — not only the drift cognition surface.
 * Playback still lives in the listener's browser; these calls return cards.
 */

import { CONVERSE_TOOLS, createToolContext, executeConverseTool } from "@/lib/converse/tools";
import { publicAppOrigin } from "@/lib/listen/public-origin";
import type { ConverseSession } from "@/lib/converse/types";
import type { GeminiSchema } from "@/lib/mcp/gemini";
import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";
import { textResult, type JsonSchema, type ToolDescriptor, type ToolResult } from "@/lib/mcp/protocol";

const SESSION_PROPS: Record<string, JsonSchema> = {
  sessionId: { type: "string", description: "Optional session id for drift / taste." },
  currentTrackId: { type: "string", description: "Now-playing catalog id, when the host knows it." },
  currentTitle: { type: "string" },
  currentArtist: { type: "string" },
  destination: {
    type: "string",
    description: "Map room id.",
    enum: TOPOGRAPHY.map((c) => c.id),
  },
  destinationLocked: { type: "boolean" },
  historyIds: { type: "array", items: { type: "string" }, description: "Recently heard catalog ids." },
  origin: { type: "string", description: "Public origin for share links, e.g. https://example.com" },
};

function geminiToJson(schema: GeminiSchema): JsonSchema {
  const type =
    schema.type === "OBJECT"
      ? "object"
      : schema.type === "ARRAY"
        ? "array"
        : schema.type === "INTEGER"
          ? "integer"
          : schema.type === "NUMBER"
            ? "number"
            : schema.type === "BOOLEAN"
              ? "boolean"
              : "string";
  const out: JsonSchema = { type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, geminiToJson(value)])
    );
  }
  if (schema.items) out.items = geminiToJson(schema.items);
  return out;
}

function titleCase(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const LISTEN_MCP_TOOLS: ToolDescriptor[] = CONVERSE_TOOLS.map((tool) => {
  const schema = geminiToJson(tool.parameters);
  return {
    name: tool.name,
    title: titleCase(tool.name),
    description: `${tool.description} Optional session fields let the host pass now-playing without a browser.`,
    inputSchema: {
      type: "object",
      description: schema.description,
      properties: { ...(schema.properties ?? {}), ...SESSION_PROPS },
      required: schema.required,
    },
  };
});

export const LISTEN_TOOL_NAMES = new Set(LISTEN_MCP_TOOLS.map((t) => t.name));

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

function asRoom(value: unknown): CoordinateId | null {
  const id = asString(value);
  return TOPOGRAPHY.some((c) => c.id === id) ? (id as CoordinateId) : null;
}

export function sessionFromArgs(args: Record<string, unknown>): ConverseSession {
  return {
    sessionId: asString(args.sessionId, `mcp_${Date.now()}`),
    currentTrackId: asString(args.currentTrackId) || null,
    currentTitle: asString(args.currentTitle) || null,
    currentArtist: asString(args.currentArtist) || null,
    destination: asRoom(args.destination) ?? "cinematic_warmth",
    destinationLocked: args.destinationLocked === true,
    historyIds: asStringArray(args.historyIds),
    origin: publicAppOrigin(asString(args.origin)) || null,
  };
}

export async function callListenTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const ctx = createToolContext(sessionFromArgs(args));
  const payload = await executeConverseTool(name, args, ctx);
  return textResult(JSON.stringify(payload, null, 2), { ...payload, effects: ctx.effects });
}
