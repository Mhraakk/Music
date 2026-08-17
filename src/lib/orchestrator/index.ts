/**
 * Recommendation Orchestrator — decides HOW candidates are gathered and ranked.
 * Never returns an empty list. Produces top-K (default 12) with pool provenance.
 */
import { TRACKS } from "@/lib/tracks";
import { recommend, graph, type Compass, type FB, type Scored } from "@/lib/engine";
import {
  scoreRecommendationHealth,
  makeCorrelationId,
  logEvent,
  type RecommendationEnvelope,
} from "@/lib/reliability";
import { retrievePools, type PoolName } from "./pools";

export type OrchestratedItem = Scored & {
  sources: PoolName[];
  poolReason?: string;
};

export type OrchestratorResult = RecommendationEnvelope & {
  items: OrchestratedItem[];
  poolStats: Record<string, number>;
  limit: number;
};

const SOURCE_LABEL: Record<PoolName, string> = {
  "taste-neighbor": "near your taste core",
  obscure: "long-tail discovery",
  session: "continues this session",
  serendipity: "hidden link · controlled surprise",
  memory: "anchored in what you reinforced",
  "micro-texture": "same texture band",
};

/**
 * Full orchestrated recommendation path.
 * 1) Multi-pool retrieval  2) Engine rank with large limit
 * 3) Annotate pool sources  4) Health gate
 */
export function orchestrateRecommendations(
  c: Compass,
  fb: FB,
  depth: number,
  opts?: { limit?: number; excludeIds?: string[] }
): OrchestratorResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const limit = Math.min(Math.max(opts?.limit ?? 12, 3), 16);
  const correlationId = makeCorrelationId("orc");

  const { merged, stats } = retrievePools(c, fb, depth);
  const sourceById = new Map(merged.map((m) => [m.t.id, m.sources]));

  // Single engine pass with expanded limit — never-empty, weighted, exposure-aware
  // excludeIds hard-blocks already-shown tracks for Show More / Fresh cycles
  const ranked = recommend(c, fb, depth, limit, opts?.excludeIds);

  const items: OrchestratedItem[] = ranked.items.map((x) => {
    const sources = sourceById.get(x.t.id) || (["taste-neighbor"] as PoolName[]);
    const srcLabel = SOURCE_LABEL[sources[0]] || "catalog";
    return {
      ...x,
      sources,
      poolReason: sources.map((s) => SOURCE_LABEL[s]).join(" · "),
      reason: x.reason.includes(srcLabel) ? x.reason : `${x.reason} · ${srcLabel}`,
    };
  });

  // If engine returned fewer than limit, fill from multi-pool (non-vetoed, non-excluded)
  const seen = new Set(items.map((i) => i.t.id));
  const hardExclude = new Set(opts?.excludeIds || []);
  if (items.length < limit) {
    const fill = [...merged]
      .filter((m) => !seen.has(m.t.id) && !hardExclude.has(m.t.id))
      .filter((m) => {
        const key = `${m.t.artist.toLowerCase().trim()}::${m.t.title.toLowerCase().trim()}`;
        const fe = fb[key];
        return !(fe?.kind === "dislike" && fe.reason === "never");
      })
      .slice(0, limit - items.length);
    for (const m of fill) {
      items.push({
        t: m.t,
        s: 0.5,
        reason: `${m.t.why} · ${SOURCE_LABEL[m.sources[0]]}`,
        debug: `pool_fill=${m.sources.join("+")}`,
        sources: m.sources,
        poolReason: m.sources.map((s) => SOURCE_LABEL[s]).join(" · "),
      });
      seen.add(m.t.id);
    }
  }

  if (items.length === 0) {
    TRACKS.slice(0, limit).forEach((t, i) => {
      items.push({
        t,
        s: 1 - i * 0.01,
        reason: "Emergency catalog fill",
        debug: "ORCH_EMERGENCY",
        sources: ["taste-neighbor"],
      });
    });
  }

  const g = graph(fb);
  let tier = ranked.tier;
  let message =
    ranked.message ||
    `Multi-pool orchestration · ${merged.length} candidates → top ${items.length}`;

  let health =
    ranked.health ||
    scoreRecommendationHealth({
      items,
      tier,
      catalogSize: TRACKS.length,
    });

  if (!health.ok && tier === "primary") {
    tier = "relaxed";
    message =
      "That combination was unusually narrow. I kept the mood and pulled more pool sources.";
    health = scoreRecommendationHealth({ items, tier, catalogSize: TRACKS.length });
  }

  const latencyMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;

  logEvent("orchestrator.complete", {
    correlationId,
    tier,
    itemCount: items.length,
    poolStats: stats,
    healthScore: health.score,
    latencyMs: Math.round(latencyMs),
  });

  return {
    items,
    tier,
    message,
    health,
    correlationId,
    sources: [...new Set(items.flatMap((i) => i.sources))],
    warnings: [...(health.warnings || [])],
    metrics: {
      poolSize: merged.length,
      latencyMs: Math.round(latencyMs),
      catalogSize: TRACKS.length,
      exposureSuppressed: ranked.metrics?.exposureSuppressed ?? 0,
    },
    graph: {
      voice: g.voice,
      avoids: g.avoids,
      liked: g.liked,
      hated: g.hated,
    },
    poolStats: stats,
    limit,
  };
}

export { retrievePools };
export type { PoolName };
