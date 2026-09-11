/**
 * Nuclear-compatible MCP HTTP surface (Vercel / next start path).
 *
 * Local next start also binds Streamable HTTP at http://127.0.0.1:8800/mcp
 * via instrumentation. Cursor:
 *   { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }
 */

import { NextResponse, type NextRequest } from "next/server";
import { NUCLEAR_SERVER_INFO, NUCLEAR_TOOLS, NUCLEAR_DOMAINS } from "@/lib/nuclear/mcp";
import { handleNuclearRpc, isInitialize } from "@/lib/nuclear/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sessionId(request: NextRequest, payload: unknown): string {
  const existing = request.headers.get("mcp-session-id");
  if (existing?.trim()) return existing.trim();
  if (isInitialize(payload) || (Array.isArray(payload) && payload.some(isInitialize))) return crypto.randomUUID();
  return crypto.randomUUID();
}

function wrap(body: unknown, session: string, status = 200) {
  const headers = {
    "Mcp-Session-Id": session,
    "MCP-Protocol-Version": "2025-06-18",
  };
  if (body === null) {
    return new NextResponse(null, { status: 202, headers });
  }
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error." } },
      { status: 400 }
    );
  }
  const session = sessionId(request, payload);
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map((item) => handleNuclearRpc(item)))).filter((row) => row !== null);
    if (responses.length === 0) return wrap(null, session);
    return wrap(responses, session);
  }
  const response = await handleNuclearRpc(payload);
  return wrap(response, session);
}

export async function GET() {
  return NextResponse.json({
    name: NUCLEAR_SERVER_INFO.name,
    transport: "JSON-RPC 2.0 over HTTP (Streamable HTTP locally on :8800)",
    local: "http://127.0.0.1:8800/mcp",
    note: 'Nuclear-compatible discovery tools. Cursor: { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } } when next start is running locally; on Vercel POST this path.',
    tools: NUCLEAR_TOOLS.map((t) => t.name),
    domains: [...NUCLEAR_DOMAINS],
  });
}

export async function DELETE() {
  return new NextResponse(null, { status: 204 });
}
