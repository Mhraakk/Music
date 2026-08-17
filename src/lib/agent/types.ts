import type { Compass, FE, FB } from "@/lib/engine";
import type { Track } from "@/lib/tracks";

export type { Compass, FE, FB, Track };

/** All agent tools — contracts only; execution lives in tools.ts */
export type AgentToolName =
  | "getTasteProfile"
  | "updateTasteMemory"
  | "generateRecommendations"
  | "refineRecommendations"
  | "explainRecommendation"
  | "inspectRecommendationPipeline"
  | "buildJourney"
  | "controlPlayer"
  | "createPlaylistDraft"
  | "confirmPlaylistExport";

export type ToolCall = {
  name: AgentToolName;
  args: Record<string, unknown>;
};

export type ToolResult = {
  name: AgentToolName;
  ok: boolean;
  data?: unknown;
  error?: string;
  effects?: AgentEffect[];
  needsConfirm?: boolean;
  confirmId?: string;
};

export type AgentEffect =
  | { type: "setCompass"; compass: Partial<Compass>; depth?: number }
  | { type: "setFeedback"; key: string; fe: FE | null }
  | { type: "pushMemory"; label: string }
  | { type: "play"; trackId: string; queueIds?: string[] }
  | { type: "player"; action: "toggle" | "next" | "prev" | "pause" | "play" | "expand" | "collapse" }
  | { type: "setTab"; tab: "graph" | "flow" | "self" }
  | { type: "clearRecent" };

export type AgentMessage = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  at: number;
  tools?: ToolResult[];
  pendingConfirm?: { confirmId: string; summary: string; payload: unknown };
};

export type PlaylistDraft = {
  id: string;
  title: string;
  trackIds: string[];
  createdAt: number;
  exported?: boolean;
};

export type AgentRequest = {
  message: string;
  context: AgentContext;
  confirmId?: string;
};

export type AgentContext = {
  compass: Compass;
  depth: number;
  fb: FB;
  currentTrackId: string | null;
  queueIds: string[];
  playing: boolean;
  draft: PlaylistDraft | null;
  lastRecIds: string[];
  tab: "graph" | "flow" | "self";
};

export type AgentResponse = {
  reply: string;
  tools: ToolResult[];
  effects: AgentEffect[];
  draft?: PlaylistDraft | null;
  lastRecIds?: string[];
  pendingConfirm?: { confirmId: string; summary: string; payload: unknown } | null;
};
