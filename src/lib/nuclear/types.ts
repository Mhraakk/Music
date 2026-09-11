/**
 * NUCLEAR-SHAPED STREAMING CONTRACT
 *
 * Clean-room types for free-source listening. Nuclear (AGPL) does two-phase
 * resolve: candidates, then a stream. Resonant reimplements that shape so Ask
 * and the player can play a full YouTube recording in the listener's browser
 * — datacenter IPs cannot extract googlevideo URLs, so the playable form is
 * the official embed, which YouTube serves to the listener directly.
 */

export type NuclearProtocol = "youtube-embed" | "https";

export type NuclearStream = {
  url: string;
  watchUrl: string;
  videoId: string;
  protocol: NuclearProtocol;
  durationMs?: number;
  source: "youtube";
};

export type NuclearCandidate = {
  id: string;
  title: string;
  thumbnail?: string | null;
  durationMs?: number;
  failed: boolean;
  source: "youtube";
  stream?: NuclearStream;
};

export type NuclearResolveResult = {
  ok: boolean;
  query: string;
  candidates: NuclearCandidate[];
  stream: NuclearStream | null;
  note: string;
};
