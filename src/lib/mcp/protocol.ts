/**
 * MODEL CONTEXT PROTOCOL — TRANSPORT TYPES
 *
 * JSON-RPC 2.0 shapes plus the subset of MCP the cognitive core needs:
 * `initialize`, `tools/list`, `tools/call` and `ping`. Kept deliberately free of
 * any Sonic Drift domain types so the transport can be tested on its own.
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const DEFAULT_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = {
  name: "sonic-drift-cognitive-core",
  title: "Sonic Drift — Cognitive Music Engine",
  version: "1.0.0",
} as const;

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: { code: number; message: string; data?: unknown };
};

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

/** Standard JSON-RPC 2.0 error codes, plus the MCP convention for bad params. */
export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export function ok(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

export function fail(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

/** A JSON Schema object, loose enough to author inline without fighting types. */
export type JsonSchema = {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
};

export type ToolDescriptor = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
};

/** MCP tool results are content blocks; structured payloads ride alongside. */
export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
};

export function textResult(text: string, structuredContent?: unknown): ToolResult {
  return structuredContent === undefined
    ? { content: [{ type: "text", text }] }
    : { content: [{ type: "text", text }], structuredContent };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function negotiateProtocolVersion(requested: unknown): string {
  if (typeof requested === "string" && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)) {
    return requested;
  }
  return DEFAULT_PROTOCOL_VERSION;
}
