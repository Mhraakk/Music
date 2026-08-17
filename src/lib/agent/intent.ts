/**
 * Intent → tool plan. Deterministic local NLU for RESONANT commands.
 */
import type { AgentToolName, ToolCall } from "./types";

const DEBUG_PHRASES = /debug|pipeline|inspect|why broken|دیباگ/i;
const TASTE_PHRASES = /taste|profile|what do you know|سلیقه|پروفایل/i;
const NEW_SONGS = /new songs?|recommend|suggest|fresh|آهنگ جدید|پیشنهاد/i;
const DARKER = /darker|noir|تاریک/i;
const WARMER = /warmer|cozier|گرم/i;
const SADDER = /sadder|melanchol|غمگین/i;
const LESS_ELEC = /less electronic|less techno|less edm|کمتر الکترونیک|organic|ارگانیک/i;
const MORE_ENERGY = /more energy|faster|upbeat|پرانرژی/i;
const LESS_ENERGY = /less energy|calmer|slower|آروم|calm/i;
const DEEPER = /deeper|take me deeper|obscure|عمیق|discovery/i;
const WHY = /why (this|that)?\s*(track|song)?|explain|چرا این|دلیل/i;
const JOURNEY = /journey|flow path|continuous flow|مسیر|سفر|take me on/i;
const PLAYLIST = /playlist|لیست پخش|make a list|create a playlist/i;
const EXPORT = /export|confirm export|خروجی|export playlist/i;

export type IntentPlan = { intent: string; tools: ToolCall[]; gloss: string };

export function planFromMessage(message: string): IntentPlan {
  const m = message.trim();
  const lower = m.toLowerCase();

  if (/^confirm(\s+export)?$/i.test(m) || /تایید/.test(m)) {
    return { intent: "confirm_export", gloss: "Confirm playlist export", tools: [{ name: "confirmPlaylistExport", args: { confirmed: true } }] };
  }
  if (EXPORT.test(m) && !/create|make|بساز/.test(lower)) {
    return { intent: "export_playlist", gloss: "Request playlist export (needs confirm)", tools: [{ name: "confirmPlaylistExport", args: { confirmed: false } }] };
  }
  if (DEBUG_PHRASES.test(m)) {
    return { intent: "debug", gloss: "Inspect recommendation pipeline", tools: [{ name: "inspectRecommendationPipeline", args: {} }] };
  }
  if (TASTE_PHRASES.test(m)) {
    return { intent: "taste_profile", gloss: "Read taste profile", tools: [{ name: "getTasteProfile", args: {} }] };
  }
  if (WHY.test(m)) {
    return { intent: "explain", gloss: "Explain recommendation", tools: [{ name: "explainRecommendation", args: {} }] };
  }
  if (JOURNEY.test(m)) {
    return { intent: "journey", gloss: "Build continuous flow journey", tools: [{ name: "buildJourney", args: { setTab: true } }] };
  }
  if (PLAYLIST.test(m)) {
    const fromJourney = JOURNEY.test(m);
    return { intent: "playlist_draft", gloss: "Create playlist draft (not exported)", tools: [{ name: "createPlaylistDraft", args: { fromRecs: !fromJourney, fromJourney } }] };
  }

  const refineArgs: Record<string, boolean> = {};
  if (DARKER.test(m)) refineArgs.darker = true;
  if (WARMER.test(m)) refineArgs.warmer = true;
  if (SADDER.test(m)) refineArgs.sadder = true;
  if (LESS_ELEC.test(m)) refineArgs.lessElectronic = true;
  if (MORE_ENERGY.test(m)) refineArgs.moreEnergy = true;
  if (LESS_ENERGY.test(m)) refineArgs.lessEnergy = true;
  if (DEEPER.test(m)) refineArgs.deeper = true;

  if (Object.keys(refineArgs).length) {
    const tools: ToolCall[] = [{ name: "refineRecommendations", args: refineArgs }];
    if (NEW_SONGS.test(m) || /songs?|آهنگ/.test(lower)) {
      tools.push({ name: "generateRecommendations", args: { limit: 6 } });
    }
    return { intent: "refine", gloss: `Refine: ${Object.keys(refineArgs).join(", ")}`, tools };
  }

  if (NEW_SONGS.test(m)) {
    return { intent: "recommend", gloss: "Generate recommendations", tools: [{ name: "generateRecommendations", args: { limit: 6 } }] };
  }
  if (/^next|^skip|بعدی/.test(lower)) {
    return { intent: "player", gloss: "Next track", tools: [{ name: "controlPlayer", args: { action: "next" } }] };
  }
  if (/^prev|previous|قبلی/.test(lower)) {
    return { intent: "player", gloss: "Previous track", tools: [{ name: "controlPlayer", args: { action: "prev" } }] };
  }
  if (/^pause|توقف/.test(lower)) {
    return { intent: "player", gloss: "Pause", tools: [{ name: "controlPlayer", args: { action: "pause" } }] };
  }
  if (/^play$|^پخش$/.test(lower)) {
    return { intent: "player", gloss: "Play", tools: [{ name: "controlPlayer", args: { action: "play" } }] };
  }

  return {
    intent: "default_recommend",
    gloss: "Default → fresh recommendations",
    tools: [
      { name: "generateRecommendations", args: { limit: 6 } },
      { name: "getTasteProfile", args: {} },
    ],
  };
}

export const TOOL_CATALOG: { name: AgentToolName; description: string }[] = [
  { name: "getTasteProfile", description: "Read emotional taste graph, likes, rejects, compass" },
  { name: "updateTasteMemory", description: "Write like/dislike/heard or clear recent rotation" },
  { name: "generateRecommendations", description: "Rank catalog by compass + feedback" },
  { name: "refineRecommendations", description: "Shift compass and re-rank" },
  { name: "explainRecommendation", description: "Explain why a track passed the emotional test" },
  { name: "inspectRecommendationPipeline", description: "Debug tier, scores, vetoes, catalog size" },
  { name: "buildJourney", description: "Open→Rise→Settle→Land continuous flow" },
  { name: "controlPlayer", description: "Play, pause, next, prev, expand Now Playing" },
  { name: "createPlaylistDraft", description: "Build in-app draft only — no export" },
  { name: "confirmPlaylistExport", description: "Export only after explicit user confirmation" },
];
