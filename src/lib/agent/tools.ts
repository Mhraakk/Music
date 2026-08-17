/** Agent tool handlers — catalog-verified, never empty recommendations */
import { TRACKS } from "@/lib/tracks";
import {
  recommend,
  flow,
  graph,
  keyOf,
  clearRecent,
  emotionalDist,
  type Compass,
  type FB,
} from "@/lib/engine";
import type { AgentContext, ToolCall, ToolResult, PlaylistDraft } from "./types";

function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function runTool(call: ToolCall, ctx: AgentContext): ToolResult {
  const name = call.name;
  const args = (call.args || {}) as Record<string, unknown>;
  const fb = (ctx.fb || {}) as FB;
  const compass = (ctx.compass || {
    warm: 0.55,
    sad: 0.45,
    organic: 0.5,
    energy: 0.35,
    dark: 0.55,
  }) as Compass;
  const depth = typeof ctx.depth === "number" ? ctx.depth : 0.7;

  try {
    switch (name) {
      case "getTasteProfile": {
        const g = graph(fb);
        return {
          name,
          ok: true,
          data: {
            voice: g.voice,
            likedCount: g.liked,
            hatedCount: g.hated,
            avoids: g.avoids,
            attract: g.attract,
          },
        };
      }

      case "updateTasteMemory": {
        if (args.action === "clearRecent") {
          clearRecent();
          return { name, ok: true, data: { action: "clearRecent" }, effects: [] };
        }
        const trackId = String(args.trackId || "");
        const t = TRACKS.find((x) => x.id === trackId);
        if (!t) return { name, ok: false, error: "Track not in catalog" };
        const kind = String(args.kind || "more");
        const key = keyOf(t.artist, t.title);
        return {
          name,
          ok: true,
          data: { track: `${t.artist} — ${t.title}`, kind },
          effects: [{ type: "setFeedback", key, kind, reason: args.reason as string | undefined }],
        };
      }

      case "generateRecommendations":
      case "refineRecommendations": {
        let c = { ...compass };
        const applied: string[] = [];
        if (typeof args.darker === "number" || args.make === "darker") {
          c.dark = Math.min(1, c.dark + 0.15);
          applied.push("darker");
        }
        if (args.lessElectronic || args.make === "less-electronic") {
          c.organic = Math.min(1, c.organic + 0.12);
          applied.push("more organic");
        }
        if (typeof args.energy === "number") {
          c.energy = Math.max(0, Math.min(1, Number(args.energy)));
          applied.push(`energy→${c.energy}`);
        }
        const res = recommend(c, fb, depth);
        const items = (res.items || []).map((x) => ({
          id: x.t.id,
          title: x.t.title,
          artist: x.t.artist,
          reason: x.reason,
          coverUrl: x.t.coverUrl,
        }));
        return {
          name,
          ok: true,
          data: {
            items,
            applied,
            tier: res.tier,
            message: res.message,
          },
          effects: applied.length
            ? [{ type: "setCompass", compass: c }]
            : [],
        };
      }

      case "explainRecommendation": {
        const id = String(args.trackId || ctx.lastRecIds?.[0] || "");
        const t = TRACKS.find((x) => x.id === id) || TRACKS[0];
        const g = graph(fb);
        const tg = {
          d: compass.dark,
          w: compass.warm,
          o: compass.organic,
          e: compass.energy,
          m: 0.2,
          s: compass.sad,
        };
        return {
          name,
          ok: true,
          data: {
            track: { title: t.title, artist: t.artist },
            why: t.why,
            emotion: t.emotion,
            emotionalDistance: Number(emotionalDist(t.v, tg).toFixed(3)),
            graphVoice: g.voice,
          },
        };
      }

      case "inspectRecommendationPipeline": {
        const res = recommend(compass, fb, depth);
        return {
          name,
          ok: true,
          data: {
            catalogSize: TRACKS.length,
            hardVetoes: 0,
            tier: res.tier,
            top: (res.items || []).map((x) => ({
              title: x.t.title,
              score: Number(x.s.toFixed(2)),
              debug: x.debug,
            })),
            architecture: "local-catalog · never-empty · soft feedback · prefer-unrated",
          },
        };
      }

      case "buildJourney": {
        const j = flow(compass, fb, depth);
        return {
          name,
          ok: true,
          data: {
            path: j.path.map((p) => ({
              id: p.t.id,
              chapter: p.chapter,
              title: p.t.title,
              artist: p.t.artist,
            })),
          },
        };
      }

      case "controlPlayer": {
        const action = String(args.action || "play");
        return {
          name,
          ok: true,
          data: { action },
          effects: [{ type: "player", action }],
        };
      }

      case "createPlaylistDraft": {
        const res = recommend(compass, fb, depth);
        const tracks = (res.items || []).map((x) => ({
          id: x.t.id,
          title: x.t.title,
          artist: x.t.artist,
        }));
        const draft: PlaylistDraft = {
          id: uid(),
          title: String(args.title || "RESONANT draft"),
          trackIds: tracks.map((t) => t.id),
          createdAt: Date.now(),
        };
        return {
          name,
          ok: true,
          data: {
            draft,
            tracks,
            note: "Draft only — export requires explicit confirm.",
          },
        };
      }

      case "confirmPlaylistExport": {
        if (args.confirmed !== true) {
          return {
            name,
            ok: true,
            needsConfirm: true,
            confirmId: uid(),
            data: {
              summary: "Export playlist as search-link pack (no account write)?",
            },
          };
        }
        const ids = (ctx.draft?.trackIds || ctx.lastRecIds || []).slice(0, 12);
        const rows = ids
          .map((id) => TRACKS.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => `${t!.artist} — ${t!.title}`);
        return {
          name,
          ok: true,
          data: {
            title: ctx.draft?.title || "RESONANT export",
            textList: rows.join("\n"),
            warning: "Link-pack only. No Spotify/Apple account was modified.",
          },
        };
      }

      default:
        return { name, ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      name,
      ok: false,
      error: e instanceof Error ? e.message : "tool failed",
    };
  }
}

export const TOOL_HANDLERS = { runTool };
