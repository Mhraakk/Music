import { planFromMessage } from "./intent";
import { runTool } from "./tools";
import type {
  AgentContext,
  AgentEffect,
  AgentRequest,
  AgentResponse,
  PlaylistDraft,
  ToolResult,
} from "./types";

function composeReply(intent: string, tools: ToolResult[], gloss: string): string {
  const lines: string[] = [];
  for (const t of tools) {
    if (!t.ok) {
      lines.push(`⚠ ${t.name}: ${t.error || "failed"}`);
      continue;
    }
    switch (t.name) {
      case "getTasteProfile": {
        const d = t.data as { voice: string; likedCount: number; hatedCount: number; avoids: string[] };
        lines.push(`Taste graph: ${d.voice}. +${d.likedCount} attract · −${d.hatedCount} reject.`);
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
            .join("\n") || "No items."
        );
        if (d.tier && d.tier !== "primary") lines.push(`Pipeline tier: ${d.tier}.`);
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
        };
        lines.push(
          `Pipeline debug\n${d.architecture}\nCatalog: ${d.catalogSize} · hard vetoes: ${d.hardVetoes} · tier: ${d.tier}`
        );
        lines.push(d.top.map((x) => `• ${x.title} (${x.score}) ${x.debug || ""}`).join("\n"));
        break;
      }
      case "buildJourney": {
        const d = t.data as { path: { chapter: string; title: string; artist: string }[] };
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
      default:
        lines.push(`${t.name}: ok`);
    }
  }
  if (!lines.length) lines.push(`Understood: ${gloss}.`);
  return lines.join("\n\n");
}

export function runAgent(req: AgentRequest): AgentResponse {
  const ctx = req.context;
  let draft = ctx.draft;
  const allEffects: AgentEffect[] = [];
  const toolResults: ToolResult[] = [];
  let pendingConfirm: AgentResponse["pendingConfirm"] = null;
  let lastRecIds = ctx.lastRecIds;

  if (req.confirmId || /^confirm/i.test(req.message.trim())) {
    const result = runTool(
      { name: "confirmPlaylistExport", args: { confirmed: true, confirmId: req.confirmId } },
      ctx
    );
    toolResults.push(result);
    if (result.effects) allEffects.push(...result.effects);
    return {
      reply: composeReply("confirm_export", toolResults, "confirm export"),
      tools: toolResults,
      effects: allEffects,
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
      draft = (result.data as { draft: PlaylistDraft }).draft;
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

  return {
    reply: composeReply(plan.intent, toolResults, plan.gloss),
    tools: toolResults,
    effects: allEffects,
    draft,
    lastRecIds,
    pendingConfirm,
  };
}
