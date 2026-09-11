/**
 * Nuclear-shaped MCP JSON-RPC (the four discovery tools).
 *
 * Cursor config:
 *   { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }
 */

import {
  DEFAULT_PROTOCOL_VERSION,
  RPC,
  fail,
  negotiateProtocolVersion,
  ok,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "@/lib/mcp/protocol";
import {
  NUCLEAR_SERVER_INFO,
  NUCLEAR_TOOLS,
  nuclearCall,
  nuclearDescribeType,
  nuclearListMethods,
  nuclearMethodDetails,
} from "./mcp";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function handleNuclearRpc(message: unknown): Promise<JsonRpcResponse | null> {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return fail(null, RPC.INVALID_REQUEST, "Request must be a JSON-RPC 2.0 object.");
  }

  const request = message as JsonRpcRequest;
  const id: JsonRpcId = request.id ?? null;

  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return fail(id, RPC.INVALID_REQUEST, 'Missing "jsonrpc": "2.0" or "method".');
  }

  const isNotification = request.id === undefined || request.id === null;

  switch (request.method) {
    case "initialize": {
      const params = asRecord(request.params);
      return ok(id, {
        protocolVersion: negotiateProtocolVersion(params.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: NUCLEAR_SERVER_INFO,
        instructions:
          "Resonant Nuclear-compatible MCP. Use list_methods to discover domains, method_details " +
          "for parameter info, describe_type for data type shapes, and call to execute methods. " +
          "Metadata.search is Apple Music first. Streaming.searchForTrack resolves a YouTube full " +
          "listen the web player embeds. Atlas / Drift / Taste / Wheat / Cognition map onto Ask. " +
          "Playback.play cannot reach a remote speaker — it returns a playable card. Resonant has no skip.",
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
    case "notifications/progress":
      return null;
    case "ping":
      return ok(id, {});
    case "logging/setLevel":
      return ok(id, {});
    case "resources/list":
      return ok(id, { resources: [] });
    case "resources/templates/list":
      return ok(id, { resourceTemplates: [] });
    case "prompts/list":
      return ok(id, { prompts: [] });
    case "tools/list":
      return ok(id, { tools: NUCLEAR_TOOLS });
    case "tools/call": {
      const params = asRecord(request.params);
      const name = asString(params.name);
      const args = asRecord(params.arguments);
      if (!name) return fail(id, RPC.INVALID_PARAMS, 'tools/call requires "name".');
      try {
        if (name === "list_methods") return ok(id, nuclearListMethods(asString(args.domain)));
        if (name === "method_details") return ok(id, nuclearMethodDetails(asString(args.method)));
        if (name === "describe_type") {
          return ok(id, nuclearDescribeType(asString(args.type, asString(args.typeName, "Track"))));
        }
        if (name === "call") {
          const nested = asRecord(args.params);
          return ok(id, await nuclearCall(asString(args.method), { ...args, ...nested }));
        }
        return fail(id, RPC.INVALID_PARAMS, `Unknown tool "${name}".`);
      } catch (error) {
        return fail(id, RPC.INTERNAL_ERROR, error instanceof Error ? error.message : "Tool execution failed.");
      }
    }
    case "list_methods":
      return ok(id, nuclearListMethods(asString(asRecord(request.params).domain)));
    case "method_details":
      return ok(id, nuclearMethodDetails(asString(asRecord(request.params).method)));
    case "describe_type":
      return ok(id, nuclearDescribeType(asString(asRecord(request.params).type, "Track")));
    case "call": {
      const params = asRecord(request.params);
      const nested = asRecord(params.params);
      return ok(id, await nuclearCall(asString(params.method), { ...params, ...nested }));
    }
    default:
      if (isNotification) return null;
      return fail(id, RPC.METHOD_NOT_FOUND, `Unknown method "${request.method}".`);
  }
}

export function isInitialize(message: unknown): boolean {
  return Boolean(message && typeof message === "object" && !Array.isArray(message) && (message as JsonRpcRequest).method === "initialize");
}

export { DEFAULT_PROTOCOL_VERSION };
