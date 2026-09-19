export type SourceStatus = {
  id: string;
  label: string;
  kind: "internet" | "personal";
  configured: boolean;
  detail: string;
  required_secrets: string[];
};

export type SourcesSummary = {
  total: number;
  configured: number;
  internet: SourceStatus[];
  personal: SourceStatus[];
  missing_secrets: string[];
};

export type ResultTrack = {
  source: string;
  source_id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  artwork_url: string | null;
  preview_url: string | null;
  external_url: string | null;
  isrc: string | null;
  genres: string[];
  sources: string[];
  in_library: boolean;
  key: string;
  score?: number;
  reasons?: string[];
  vector?: Record<string, number>;
};

export type TasteProfile = {
  attract: Record<string, number>;
  avoid: Record<string, number> | null;
  obscurity_preference: number;
  top_artists: { name: string; weight: number }[];
  top_genres: { name: string; weight: number }[];
  source_mix: Record<string, number>;
  signal_count: number;
  confidence: number;
  vetoed: number;
  voice: string;
};

export const SOURCE_LABELS: Record<string, string> = {
  itunes: "Apple / iTunes",
  deezer: "Deezer",
  musicbrainz: "MusicBrainz",
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
  telegram: "Telegram",
  local: "Local catalogue",
};

export const AXIS_LABELS: Record<string, string> = {
  d: "dark",
  w: "warm",
  o: "organic",
  e: "energy",
  m: "mainstream",
  s: "sad",
};
