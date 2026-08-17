/**
 * Agent orchestrator — plans tools from NL, executes, composes reply.
 * Safety: never auto-export; never mutate external accounts.
 */
import { planFromMessage } from "./intent";
import { runTool } from "./tools";
import { sanitizeEffects } from "./safety";
import { getAgentDefinition } from "./registry";
import type {
  AgentContext,
  AgentEffect,
  AgentRequest,
  AgentResponse,
  PlaylistDraft,
  ToolResult,
} from "./types";

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function composeReply(
  intent: string,
  tools: ToolResult[],
  gloss: string
): string {
  const lines: string[] = [];

  for (const t of tools) {
    if (!t.ok) {
      lines.push(`⚠ ${t.name}: ${t.error || "failed"}`);
      continue;
    }
    switch (t.name) {
      case "getTasteProfile": {
        const d = t.data as {
          voice: string;
          likedCount: number;
          hatedCount: number;
          avoids: string[];
        };
        lines.push(
          `Taste graph: ${d.voice}. +${d.likedCount} attract · −${d.hatedCount} reject.`
        );
        if (d.avoids?.length) lines.push(`Avoids: ${d.avoids.join(" · ")}.`);
        break;
      }
      case "generateRecommendations":
      case "refineRecommendations": {
        const d = t.data as {
          items: { title: string; artist: string; reason: string }[];
          applied?: string[];
          tier?: string;
          message?: string | null;
        };
        if (d.applied?.length) lines.push(`Shifted compass: ${d.applied.join(", ")}.`);
        if (d.message) lines.push(d.message);
        lines.push(
          (d.items || [])
            .slice(0, 6)
            .map((x, i) => `${i + 1}. ${x.title} — ${x.artist}\n   ${x.reason}`)
            .join("\n") || "No items (should not happen)."
        );
        if (d.tier && d.tier !== "primary") lines.push(`Pipeline tier: ${d.tier}.`);
        const h = (t.data as { health?: { score: number; ok: boolean } }).health;
        if (h) lines.push(`Health ${Math.round(h.score * 100)}%${h.ok ? "" : " · weak batch"}`);
        const ps = (t.data as { poolStats?: Record<string, number> }).poolStats;
        if (ps) lines.push("Pools: " + Object.entries(ps).map(([k, v]) => `${k}:${v}`).join(" · "));
        break;
      }
      case "explainRecommendation": {
        const d = t.data as {
          track: { title: string; artist: string };
          why: string;
          emotion: string;
          rankReason?: string;
          emotionalDistance: number;
          graphVoice: string;
        };
        lines.push(
          `“${d.track.title}” by ${d.track.artist}\n${d.why}\nEmotion: ${d.emotion} · distance ${d.emotionalDistance}`
        );
        if (d.rankReason) lines.push(`Rank signal: ${d.rankReason}`);
        lines.push(`Graph: ${d.graphVoice}`);
        break;
      }
      case "inspectRecommendationPipeline": {
        const d = t.data as {
          catalogSize: number;
          hardVetoes: number;
          tier: string;
          top: { title: string; score: number; debug?: string }[];
          architecture: string;
          health?: { score: number; ok: boolean; warnings?: string[] };
          correlationId?: string;
          metrics?: { latencyMs?: number; poolSize?: number };
        };
        lines.push(
          `Pipeline debug\n${d.architecture}\nCatalog: ${d.catalogSize} · hard vetoes: ${d.hardVetoes} · tier: ${d.tier}`
        );
        if (d.health) {
          lines.push(
            `Health: ${(d.health.score * 100).toFixed(0)}% ${d.health.ok ? "ok" : "weak"}` +
              (d.health.warnings?.length ? ` · ${d.health.warnings.join(", ")}` : "")
          );
        }
        if (d.metrics) {
          lines.push(
            `Pool: ${d.metrics.poolSize ?? "—"} · latency: ${d.metrics.latencyMs ?? "—"}ms` +
              (d.correlationId ? ` · ${d.correlationId}` : "")
          );
        }
        lines.push(
          d.top.map((x) => `• ${x.title} (${x.score}) ${x.debug || ""}`).join("\n")
        );
        break;
      }
      case "buildJourney": /* roles + transition */ {
        const d = t.data as {
          path: { chapter: string; title: string; artist: string }[];
        };
        lines.push(
          "Journey built — Open → Rise → Settle → Land:\n" +
            d.path.map((p) => `${p.chapter}: ${p.title} — ${p.artist}`).join("\n")
        );
        break;
      }
      case "controlPlayer": {
        const d = t.data as { action: string };
        lines.push(`Player: ${d.action}`);
        break;
      }
      case "createPlaylistDraft": {
        const d = t.data as {
          draft: PlaylistDraft;
          tracks: { title: string; artist: string }[];
          note: string;
        };
        lines.push(
          `Draft “${d.draft.title}” (${d.tracks.length} tracks).\n${d.note}\n` +
            d.tracks.map((x, i) => `${i + 1}. ${x.artist} — ${x.title}`).join("\n")
        );
        break;
      }
      case "confirmPlaylistExport": {
        if (t.needsConfirm) {
          const d = t.data as { summary: string };
          lines.push(`${d.summary}\nReply **confirm** to export link pack (no account write).`);
        } else {
          const d = t.data as { title: string; textList: string; warning: string };
          lines.push(`Exported “${d.title}” as link pack.\n${d.textList}\n${d.warning}`);
        }
        break;
      }
      case "updateTasteMemory": {
        const d = t.data as { action?: string; track?: string; kind?: string };
        if (d.action === "clearRecent") lines.push("Cleared recent rotation memory.");
        else lines.push(`Taste memory: ${d.kind} on ${d.track}`);
        break;
      }
      case "getTasteTwin": {
        const d = t.data as {
          howWellPct: number;
          summary: string;
          voice: string;
          confident: { label: string; confidence: number }[];
          uncertain: { label: string; confidence: number }[];
          momentum: { label: string } | null;
          sessionNarrative: string | null;
        };
        lines.push(`${d.summary}\nKnowing you: ${d.howWellPct}% · ${d.voice}`);
        if (d.confident?.length) {
          lines.push(
            "Strong reads: " +
              d.confident.map((x) => `${x.label} (${Math.round(x.confidence * 100)}%)`).join(" · ")
          );
        }
        if (d.uncertain?.length) {
          lines.push(
            "Still soft: " +
              d.uncertain.map((x) => `${x.label} (${Math.round(x.confidence * 100)}%)`).join(" · ")
          );
        }
        if (d.momentum) lines.push(`Momentum: ${d.momentum.label}`);
        if (d.sessionNarrative) lines.push(d.sessionNarrative);
        break;
      }
      case "askTasteTwin": {
        const d = t.data as { answer: string };
        lines.push(d.answer);
        break;
      }
      case "setDiscoveryTemperature": {
        const d = t.data as { temperature: number; label: string };
        lines.push(`Discovery temperature → ${d.label} (${Math.round(d.temperature * 100)}%).`);
        break;
      }
      case "setContextLock": {
        const d = t.data as { mode: string; meaning: string };
        lines.push(`Context lock: ${d.mode}\n${d.meaning}`);
        break;
      }
      case "parallelUniverse": {
        const d = t.data as {
          universe: string;
          description: string;
          items: { title: string; artist: string; reason: string }[];
        };
        lines.push(
          `Parallel universe: ${d.universe}\n${d.description}\n` +
            (d.items || [])
              .map((x, i) => `${i + 1}. ${x.title} — ${x.artist}\n   ${x.reason}`)
              .join("\n")
        );
        break;
      }
      case "proposeActiveLearning": {
        const d = t.data as {
          pair: null | {
            prompt: string;
            left: { title: string; artist: string };
            right: { title: string; artist: string };
          };
          note?: string;
        };
        if (!d.pair) lines.push(d.note || "No active-learning pair needed.");
        else {
          lines.push(
            `${d.pair.prompt}\nA) ${d.pair.left.title} — ${d.pair.left.artist}\nB) ${d.pair.right.title} — ${d.pair.right.artist}\nReply with a like on the one that fits.`
          );
        }
        break;
      }
      case "sessionNarrative": {
        const d = t.data as {
          narrative: string;
          momentum: { label: string } | null;
          temperature: number;
        };
        lines.push(d.narrative);
        if (d.momentum) lines.push(`Momentum: ${d.momentum.label}`);
        lines.push(`Temperature: ${Math.round((d.temperature || 0) * 100)}%`);
        break;
      }
      case "resetSessionRoom": {
        lines.push("Room reset. Session bias cleared — long-term taste kept.");
        break;
      }
      case "autopsyTrack": {
        const d = t.data as { rank: number | null; score: number | null; tier: string; track: { title: string }; components: { distance: number; temperatureNote: string }; beatenBy: { title: string }[] };
        lines.push(`Autopsy: ${d.track.title}\nrank ${d.rank} · score ${d.score} · tier ${d.tier}\ndist ${d.components.distance}\n${d.components.temperatureNote}`);
        if (d.beatenBy?.length) lines.push("Beaten by: " + d.beatenBy.map((b) => b.title).join(", "));
        break;
      }
      case "counterfactual": {
        const d = t.data as { hypothesis: string; beforeVoice: string; afterVoice: string; deltaSummary: string; wouldSurface: { title: string; artist: string }[] };
        lines.push(`${d.hypothesis}\n${d.beforeVoice} → ${d.afterVoice}\n${d.deltaSummary}`);
        lines.push((d.wouldSurface || []).map((x, i) => `${i + 1}. ${x.title} — ${x.artist}`).join("\n"));
        break;
      }
      case "textureSearch": {
        const d = t.data as { query: string; items: { title: string; artist: string; why: string }[] };
        lines.push(`Texture: ${d.query}\n` + (d.items || []).map((x, i) => `${i + 1}. ${x.title} — ${x.artist}\n   ${x.why}`).join("\n"));
        break;
      }
      case "sceneDiscover": {
        const d = t.data as { scenes: { name: string; description: string; tracks: { title: string }[] }[] };
        lines.push((d.scenes || []).map((s) => `• ${s.name}: ${s.description}\n  ${s.tracks.map((x) => x.title).join(", ")}`).join("\n\n"));
        break;
      }
      case "influenceGraph": {
        const d = t.data as { seed: { title: string; artist: string } | null; ancestors: string[]; descendants: string[]; neighbors: { title: string; artist: string }[] };
        lines.push(d.seed ? `Seed: ${d.seed.artist} — ${d.seed.title}` : "No seed");
        if (d.ancestors?.length) lines.push("Ancestors: " + d.ancestors.join(" · "));
        if (d.descendants?.length) lines.push("Descendants: " + d.descendants.join(" · "));
        if (d.neighbors?.length) lines.push("Neighbors: " + d.neighbors.map((n) => n.title).join(", "));
        break;
      }
      case "runPortal": {
        const d = t.data as { title: string; description: string; items: { title: string; artist: string }[] };
        lines.push(`${d.title}\n${d.description}\n` + (d.items || []).map((x, i) => `${i + 1}. ${x.title} — ${x.artist}`).join("\n"));
        break;
      }
      case "getTasteDNA": {
        const d = t.data as { longTermSamples: number; mediumSamples: number; sessionSamples: number; negativeStrength: number; negativeArtists: string[]; note?: string };
        lines.push(`Taste DNA\nlong ${d.longTermSamples} · medium ${d.mediumSamples} · session ${d.sessionSamples}\nnegative ${Math.round((d.negativeStrength || 0) * 100)}%`);
        if (d.negativeArtists?.length) lines.push("Avoids: " + d.negativeArtists.join(", "));
        if (d.note) lines.push(d.note);
        break;
      }
      case "getRecommendationHealth": {
        const d = t.data as { health?: { score: number; ok: boolean }; tier?: string; metrics?: { poolSize: number }; message?: string };
        lines.push(`Health ${d.health ? Math.round(d.health.score * 100) : "—"}% · tier ${d.tier || "—"} · pool ${d.metrics?.poolSize ?? "—"}`);
        if (d.message) lines.push(d.message);
        break;
      }
      case "reportRecommendationFailure": {
        const d = t.data as { recovery?: string; nextTools?: string[] };
        lines.push("Logged. Recovery: " + (d.recovery || "regenerate"));
        if (d.nextTools) lines.push("Next: " + d.nextTools.join(" → "));
        break;
      }
      case "recordSkip": {
        const d = t.data as { kind?: string; note?: string };
        lines.push(`Skip recorded as ${d.kind}. ${d.note || ""}`);
        break;
      }
      default:
        lines.push(`${t.name}: ok`);
    }
  }

  if (!lines.length) lines.push(`Understood: ${gloss}.`);
  return lines.join("\n\n");
}

export function runAgent(req: AgentRequest): AgentResponse {
  const agent = getAgentDefinition();
  const ctx = req.context;
  let draft = ctx.draft;
  const allEffects: AgentEffect[] = [];
  const toolResults: ToolResult[] = [];
  let pendingConfirm: AgentResponse["pendingConfirm"] = null;
  let lastRecIds = ctx.lastRecIds;
  const correlationId = `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  // Confirm path — only explicit confirm turns may set confirmed=true
  if (req.confirmId || /^confirm(\s+export)?$/i.test(req.message.trim())) {
    const result = runTool(
      { name: "confirmPlaylistExport", args: { confirmed: true, confirmId: req.confirmId } },
      ctx
    );
    toolResults.push(result);
    if (result.effects) allEffects.push(...result.effects);
    const effects = sanitizeEffects(allEffects);
    if (typeof console !== "undefined") {
      console.info("[RESONANT.agent]", {
        event: "agent.complete",
        correlationId,
        agentId: agent.id,
        version: agent.version,
        intent: "confirm_export",
        toolCount: toolResults.length,
      });
    }
    return {
      reply: composeReply("confirm_export", toolResults, "confirm export"),
      tools: toolResults,
      effects,
      draft,
      lastRecIds,
      pendingConfirm: null,
    };
  }

  const plan = planFromMessage(req.message);

  for (const call of plan.tools) {
    const liveCtx: AgentContext = { ...ctx, draft, lastRecIds };
    const result = runTool(call, liveCtx);
    toolResults.push(result);

    if (result.effects) allEffects.push(...result.effects);

    if (result.name === "createPlaylistDraft" && result.ok) {
      const d = (result.data as { draft: PlaylistDraft }).draft;
      draft = d;
    }

    if (
      (result.name === "generateRecommendations" || result.name === "refineRecommendations") &&
      result.ok
    ) {
      const items = (result.data as { items: { id: string }[] }).items || [];
      lastRecIds = items.map((x) => x.id);
    }
    if (result.name === "buildJourney" && result.ok) {
      const path = (result.data as { path: { id: string }[] }).path || [];
      lastRecIds = path.map((x) => x.id);
    }

    if (result.needsConfirm && result.confirmId) {
      pendingConfirm = {
        confirmId: result.confirmId,
        summary: (result.data as { summary?: string })?.summary || "Confirm action?",
        payload: result.data,
      };
    }
  }

  const effects = sanitizeEffects(allEffects);
  if (typeof console !== "undefined") {
    console.info("[RESONANT.agent]", {
      event: "agent.complete",
      correlationId,
      agentId: agent.id,
      version: agent.version,
      intent: plan.intent,
      gloss: plan.gloss,
      toolCount: toolResults.length,
      effectCount: effects.length,
      hasPendingConfirm: Boolean(pendingConfirm),
    });
  }

  return {
    reply: composeReply(plan.intent, toolResults, plan.gloss),
    tools: toolResults,
    effects,
    draft,
    lastRecIds,
    pendingConfirm,
  };
}

export { uid };
