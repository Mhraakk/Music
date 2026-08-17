import { NextResponse } from "next/server";
import { TRACKS } from "@/lib/tracks";
import { recommend, getDebugSnapshot } from "@/lib/engine";
import { catalogIntegrity } from "@/lib/agent/verify";
import { getAgentDefinition } from "@/lib/agent/registry";
import { getWeights } from "@/lib/reliability/weights";

export async function GET() {
  const catalog = catalogIntegrity();
  let recOk = false;
  let itemCount = 0;
  try {
    const res = recommend(
      { warm: 0.55, sad: 0.45, organic: 0.5, energy: 0.35, dark: 0.55 },
      {},
      0.7
    );
    itemCount = res.items.length;
    recOk = itemCount > 0;
  } catch {
    recOk = false;
  }
  const ok = catalog.ok && recOk && TRACKS.length > 0;
  const agent = getAgentDefinition();
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      catalog,
      recommendations: { ok: recOk, itemCount },
      agent: { id: agent.id, version: agent.version },
      weights: getWeights(),
      debug: getDebugSnapshot(),
      providers: { local: { status: "up" } },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
