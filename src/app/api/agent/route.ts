import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import type { AgentRequest } from "@/lib/agent/types";
import { TOOL_CATALOG } from "@/lib/agent/intent";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentRequest;
    if (!body?.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (!body.context) {
      return NextResponse.json({ error: "context required" }, { status: 400 });
    }
    const response = runAgent(body);
    return NextResponse.json({
      ...response,
      meta: {
        engine: "resonant-local-orchestrator",
        llm: Boolean(process.env.OPENAI_API_KEY),
        tools: TOOL_CATALOG.map((t) => t.name),
      },
    });
  } catch (e) {
    console.error("[api/agent]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Agent failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "RESONANT Agent",
    version: "1.0",
    tools: TOOL_CATALOG,
    safety: [
      "No auto-export of playlists",
      "No third-party account mutation",
      "confirmPlaylistExport requires explicit confirmation",
      "Taste writes are local feedback memory only",
    ],
  });
}
