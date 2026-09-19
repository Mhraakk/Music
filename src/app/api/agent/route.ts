import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import type { AgentRequest } from "@/lib/agent/types";
import { TOOL_CATALOG } from "@/lib/agent/intent";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";
import { hasLLM } from "@/lib/env";

export async function POST(req: NextRequest) {
  const key = clientKey(req.headers);
  const limit = rateLimit(`agent:${key}`, { limit: 30, windowMs: 10_000 });
  if (!limit.ok) {
    logger.warn("api.agent.rate_limited", { key, retryAfter: limit.retryAfter });
    return NextResponse.json(
      { error: "Rate limit exceeded. Slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
          "RateLimit-Limit": String(limit.limit),
          "RateLimit-Remaining": String(limit.remaining),
        },
      }
    );
  }

  try {
    const body = (await req.json()) as AgentRequest;
    if (!body?.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (!body.context) {
      return NextResponse.json({ error: "context required" }, { status: 400 });
    }
    const response = runAgent(body);
    logger.info("api.agent.ok", { key });
    return NextResponse.json({
      ...response,
      meta: {
        engine: "resonant-local-orchestrator",
        llm: hasLLM,
        tools: TOOL_CATALOG.map((t) => t.name),
      },
    });
  } catch (e) {
    logger.error("api.agent.error", { message: e instanceof Error ? e.message : String(e) });
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
