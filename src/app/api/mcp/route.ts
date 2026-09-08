/**
 * MCP TRANSPORT — POST /api/mcp
 *
 * Streamable-HTTP style transport for the Sonic Drift cognitive core. Accepts a
 * single JSON-RPC 2.0 message or a batch, and returns 202 with no body for
 * notifications, per the JSON-RPC spec.
 *
 * GET returns a discovery document so the endpoint is inspectable in a browser
 * without speaking JSON-RPC at it.
 */

import { NextResponse, type NextRequest } from "next/server";
import { handleRpc, engineStatus, TOOLS } from "@/lib/mcp/server";
import { readAccessToken } from "@/lib/providers/session";

/** node:crypto and provider token minting require the Node runtime. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // The SoundCloud token is taken from the httpOnly cookie, never from tool
  // arguments — an MCP client must not be able to inject someone else's session.
  const soundCloudAccessToken = await readAccessToken().catch(() => null);
  const context = { soundCloudAccessToken };

  if (Array.isArray(payload)) {
    const responses = await Promise.all(payload.map((message) => handleRpc(message, context)));
    const answered = responses.filter((r) => r !== null);
    if (answered.length === 0) return new NextResponse(null, { status: 202 });
    return NextResponse.json(answered);
  }

  const response = await handleRpc(payload, context);
  if (response === null) return new NextResponse(null, { status: 202 });

  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({
    transport: "streamable-http (single-shot JSON-RPC 2.0)",
    endpoint: "/api/mcp",
    usage: 'POST {"jsonrpc":"2.0","id":1,"method":"tools/list"}',
    tools: TOOLS,
    status: engineStatus(),
  });
}
