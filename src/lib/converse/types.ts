import type { LibraryTrack } from "@/lib/library";
import type { CoordinateId } from "@/lib/drift/topography";
import type { FavoriteOverlay } from "@/lib/apple/overlay";
import type { EmotionalVector } from "@/lib/drift/ontology";

export type ConverseRole = "user" | "assistant";

export type ConverseMessage = {
  role: ConverseRole;
  text: string;
};

export type ConverseSession = {
  sessionId: string;
  currentTrackId: string | null;
  currentTitle?: string | null;
  currentArtist?: string | null;
  destination: CoordinateId;
  destinationLocked: boolean;
  historyIds: string[];
  overlay?: FavoriteOverlay[];
  tasteVectors?: EmotionalVector[];
};

export type ConverseEffect =
  | { type: "play"; track: LibraryTrack }
  | { type: "queue"; tracks: LibraryTrack[]; title: string }
  | { type: "ingest"; tracks: LibraryTrack[] }
  | { type: "destination"; id: CoordinateId };

export type ConverseSource = "gemini" | "openai" | "local";

export type ConverseResult = {
  ok: true;
  source: ConverseSource;
  reply: string;
  model: string | null;
  effects: ConverseEffect[];
  suggestions: string[];
  note?: string;
};

export type ConverseFailure = {
  ok: false;
  error: string;
  source: ConverseSource | null;
};

export type ConverseStatus = {
  configured: boolean;
  acceptsClientKey: true;
  acceptsOpenAiKey: true;
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  model: string | null;
  openaiModel: string | null;
  rooms: { id: CoordinateId; label: string; description: string }[];
  note: string;
};

/** Compact card shown to Gemini. */
export type ConverseTrackCard = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  room: string;
  feeling: string;
  duration: number;
  source: string;
  openUrl: string | null;
  playable: boolean;
  videoUrl?: string | null;
  catalogUrl?: string | null;
  catalogLabel?: string | null;
};
