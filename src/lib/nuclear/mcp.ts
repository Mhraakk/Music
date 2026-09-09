/**
 * Nuclear-compatible MCP tools (clean-room).
 *
 * Nuclear desktop exposes four tools — list_methods, method_details,
 * describe_type, call — so an agent discovers domains then acts. Resonant
 * maps that shape onto Apple-first search and YouTube full-listen resolve.
 * Playback lives in the listener's browser; this process cannot drive a
 * remote speaker. Resonant has no skip.
 */

import { findMusic } from "@/lib/converse/anywhere";
import { findRelated } from "@/lib/converse/kin";
import { harvestRoom } from "@/lib/converse/live-room";
import type { CoordinateId } from "@/lib/drift/topography";
import { TOPOGRAPHY } from "@/lib/drift/topography";
import { textResult, errorResult, type ToolDescriptor, type ToolResult } from "@/lib/mcp/protocol";
import { resolveNuclearStream } from "./resolve";

export const NUCLEAR_DOMAINS = [
  "Queue",
  "Playback",
  "Metadata",
  "Favorites",
  "Playlists",
  "Dashboard",
  "Providers",
  "Streaming",
] as const;

export type NuclearDomain = (typeof NUCLEAR_DOMAINS)[number];

const DOMAIN_HELP = NUCLEAR_DOMAINS.join(", ");

type MethodInfo = {
  description: string;
  params: { name: string; type: string; optional?: boolean }[];
  returns: string;
};

const METHODS: Record<NuclearDomain, Record<string, MethodInfo>> = {
  Queue: {
    getQueue: { description: "Web player queue lives in the listener's tab, not on this server.", params: [], returns: "Queue" },
    getCurrentItem: { description: "Current item is owned by the browser player.", params: [], returns: "QueueItem | undefined" },
    addToQueue: {
      description: "Resolve a recording to a playable YouTube listen the Resonant player can embed.",
      params: [
        { name: "tracks", type: "Track[]", optional: true },
        { name: "artist", type: "string", optional: true },
        { name: "title", type: "string", optional: true },
      ],
      returns: "StreamResolutionResult",
    },
    addNext: { description: "Same as addToQueue in the web player.", params: [{ name: "tracks", type: "Track[]" }], returns: "void" },
    clearQueue: { description: "Clearing happens in the listener's tab.", params: [], returns: "void" },
    goToNext: { description: "Resonant has no skip — the engine chooses what follows.", params: [], returns: "void" },
    goToPrevious: { description: "Resonant has no skip.", params: [], returns: "void" },
  },
  Playback: {
    getState: { description: "Transport state lives in the browser player.", params: [], returns: "PlaybackState" },
    play: {
      description: "Resolve a full YouTube listen and return a playable card for the Resonant player.",
      params: [
        { name: "artist", type: "string", optional: true },
        { name: "title", type: "string", optional: true },
        { name: "videoId", type: "string", optional: true },
      ],
      returns: "StreamResolutionResult",
    },
    pause: { description: "Pause is a browser gesture on the mini-player.", params: [], returns: "void" },
    stop: { description: "Stop is a browser gesture on the mini-player.", params: [], returns: "void" },
    toggle: { description: "Play/pause is a browser gesture on the mini-player.", params: [], returns: "void" },
    seekTo: { description: "Seek is a browser gesture on the mini-player.", params: [{ name: "position", type: "number" }], returns: "void" },
    getVolume: { description: "Volume lives in the browser player.", params: [], returns: "number" },
    setVolume: { description: "Volume is a browser gesture.", params: [{ name: "volume", type: "number" }], returns: "void" },
  },
  Metadata: {
    search: {
      description: "Search Apple Music first, then Deezer. Returns real recordings.",
      params: [
        { name: "query", type: "string" },
        { name: "limit", type: "number", optional: true },
      ],
      returns: "SearchResults",
    },
    fetchArtistTopTracks: {
      description: "Apple Music recordings by a named artist.",
      params: [{ name: "artist", type: "string" }],
      returns: "Track[]",
    },
    fetchArtistRelatedArtists: {
      description: "Same artist first, then Deezer-related artists on Apple Music.",
      params: [{ name: "artist", type: "string" }],
      returns: "Track[]",
    },
    fetchArtistAlbums: {
      description: "Album listing is not a separate surface — search returns recordings.",
      params: [{ name: "artist", type: "string" }],
      returns: "AlbumRef[]",
    },
    fetchAlbumDetails: {
      description: "Album detail is not a separate surface.",
      params: [{ name: "query", type: "string" }],
      returns: "Album",
    },
    fetchArtistBio: {
      description: "Resonant does not store biographies.",
      params: [{ name: "artist", type: "string" }],
      returns: "ArtistBio",
    },
  },
  Favorites: {
    getTracks: { description: "Favorite Songs live in the listener's browser (IndexedDB).", params: [], returns: "FavoriteEntry[]" },
    addTrack: { description: "Hearting a track happens on the Listen Now surface.", params: [{ name: "track", type: "Track" }], returns: "void" },
    isTrackFavorite: { description: "Favorite state is client-side.", params: [{ name: "id", type: "string" }], returns: "boolean" },
  },
  Playlists: {
    getIndex: { description: "Resonant is not a playlist manager.", params: [], returns: "PlaylistIndexEntry[]" },
    createPlaylist: { description: "Ask can assemble a set; it is not saved as a Nuclear playlist.", params: [{ name: "name", type: "string" }], returns: "Playlist" },
  },
  Dashboard: {
    fetchTopTracks: {
      description: "Live Apple Music harvest for a map room (Discover refresh).",
      params: [
        { name: "room", type: "string", optional: true },
        { name: "limit", type: "number", optional: true },
      ],
      returns: "AttributedResult",
    },
    fetchNewReleases: {
      description: "Same live harvest, rotated so refresh is actually new.",
      params: [{ name: "room", type: "string", optional: true }],
      returns: "AttributedResult",
    },
    fetchTopArtists: { description: "Use fetchTopTracks — Resonant harvests recordings, not artist charts.", params: [], returns: "AttributedResult" },
    fetchTopAlbums: { description: "Use fetchTopTracks.", params: [], returns: "AttributedResult" },
    fetchEditorialPlaylists: { description: "No editorial playlist feed.", params: [], returns: "AttributedResult" },
  },
  Providers: {
    list: { description: "Metadata and streaming providers Resonant actually uses.", params: [], returns: "ProviderDescriptor[]" },
    get: { description: "One provider by id (apple, youtube, deezer).", params: [{ name: "id", type: "string" }], returns: "ProviderDescriptor" },
  },
  Streaming: {
    searchForTrack: {
      description: "Find YouTube candidates for a named recording (two-phase search).",
      params: [
        { name: "artist", type: "string" },
        { name: "title", type: "string" },
      ],
      returns: "StreamResolutionResult",
    },
    getStreamUrl: {
      description: "Resolve a YouTube embed the Resonant player can play in-browser.",
      params: [
        { name: "candidateId", type: "string", optional: true },
        { name: "videoId", type: "string", optional: true },
      ],
      returns: "Stream",
    },
  },
};

const TYPES: Record<string, unknown> = {
  Track: {
    title: "string",
    artist: "string",
    album: "string?",
    duration: "number?",
    videoId: "string?",
    previewUrl: "string?",
    artworkUrl: "string?",
    foundVia: "apple | youtube | deezer | soundcloud",
  },
  Stream: {
    url: "string",
    watchUrl: "string",
    videoId: "string",
    protocol: "youtube-embed | https",
    source: "youtube",
  },
  StreamCandidate: { id: "string", title: "string", stream: "Stream?", failed: "boolean" },
  StreamResolutionResult: { ok: "boolean", query: "string", candidates: "StreamCandidate[]", stream: "Stream | null", note: "string" },
  Queue: { items: "QueueItem[]", currentIndex: "number?" },
  QueueItem: { id: "string", track: "Track" },
  PlaybackState: { status: "playing | paused | stopped", seek: "number", duration: "number" },
  SearchParams: { query: "string", limit: "number?" },
  SearchResults: { tracks: "Track[]" },
  ProviderDescriptor: { id: "string", kind: "metadata | streaming", name: "string" },
  FavoriteEntry: { ref: "Track", addedAtIso: "string" },
  AttributedResult: { providerId: "string", providerName: "string", items: "Track[]" },
};

export const NUCLEAR_SERVER_INFO = {
  name: "resonant-nuclear",
  title: "Resonant — Nuclear-compatible MCP",
  version: "1.0.0",
} as const;

export const NUCLEAR_TOOLS: ToolDescriptor[] = [
  {
    name: "list_methods",
    title: "List API methods",
    description: `List available methods in a Resonant API domain. Available domains: ${DOMAIN_HELP}. Streaming is Resonant's full-listen domain (YouTube embed).`,
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: DOMAIN_HELP } },
      required: ["domain"],
    },
  },
  {
    name: "method_details",
    title: "Method details",
    description: "Get description, parameter names and types, and return type. Use Domain.method format, e.g. Metadata.search or Streaming.searchForTrack.",
    inputSchema: {
      type: "object",
      properties: { method: { type: "string", description: "Domain.method, e.g. Queue.addToQueue" } },
      required: ["method"],
    },
  },
  {
    name: "describe_type",
    title: "Describe a type",
    description: "JSON shape of a data type. Use when method_details references Track, Stream, StreamCandidate, SearchResults, etc.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", description: "Type name, e.g. Track" } },
      required: ["type"],
    },
  },
  {
    name: "call",
    title: "Call an API method",
    description: "Call a method in Domain.method format. Pass parameters as a JSON object with named fields. Omit or pass {} for methods with no parameters.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string" },
        params: { type: "object", additionalProperties: true },
      },
      required: ["method"],
    },
  },
];

function asDomain(value: string): NuclearDomain | null {
  const hit = NUCLEAR_DOMAINS.find((d) => d.toLowerCase() === value.trim().toLowerCase());
  return hit ?? null;
}

function splitMethod(raw: string): { domain: NuclearDomain; method: string } | null {
  const trimmed = raw.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0) return null;
  const domain = asDomain(trimmed.slice(0, dot));
  const method = trimmed.slice(dot + 1).trim();
  if (!domain || !method) return null;
  return { domain, method };
}

export function nuclearListMethods(domain: string): ToolResult {
  const key = asDomain(domain);
  if (!key) {
    return errorResult(`Unknown domain "${domain}". Available domains: ${DOMAIN_HELP}.`);
  }
  const methods = Object.keys(METHODS[key]);
  const payload = {
    domain: key,
    description: key === "Streaming" ? "YouTube full-listen resolve for the web player." : `${key} domain.`,
    methods,
    qualified: methods.map((m) => `${key}.${m}`),
  };
  return textResult(JSON.stringify(payload, null, 2), payload);
}

export function nuclearMethodDetails(method: string): ToolResult {
  const parts = splitMethod(method);
  if (!parts) {
    return errorResult(`Invalid method format '${method}': expected 'Domain.method', e.g. 'Queue.addToQueue'.`);
  }
  const info = METHODS[parts.domain][parts.method];
  if (!info) {
    return errorResult(`Unknown method "${method}". Call list_methods with domain "${parts.domain}".`);
  }
  const payload = {
    domain: parts.domain,
    method: parts.method,
    description: info.description,
    params: info.params,
    returns: info.returns,
  };
  return textResult(JSON.stringify(payload, null, 2), payload);
}

export function nuclearDescribeType(typeName: string): ToolResult {
  const key = typeName.trim();
  const hit = TYPES[key] ?? TYPES[key.replace(/\s+/g, "")];
  if (!hit) {
    return errorResult(`Unknown type "${typeName}". Try ${Object.keys(TYPES).join(", ")}.`);
  }
  return textResult(JSON.stringify(hit, null, 2), hit);
}

function str(params: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function num(params: Record<string, unknown>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function firstTrack(params: Record<string, unknown>): { artist: string; title: string; videoId: string } {
  const tracks = params.tracks;
  const row =
    Array.isArray(tracks) && tracks[0] && typeof tracks[0] === "object"
      ? (tracks[0] as Record<string, unknown>)
      : params;
  const artist = str(row, "artist");
  const title = str(row, "title", "name");
  const videoId = str(row, "videoId", "candidateId", "id");
  return { artist, title, videoId };
}

const PROVIDERS = [
  { id: "apple", kind: "metadata", name: "Apple Music" },
  { id: "deezer", kind: "metadata", name: "Deezer" },
  { id: "youtube", kind: "streaming", name: "YouTube (embed full listen)" },
];

function browserOwned(action: string): ToolResult {
  return textResult(
    `${action} lives in the Resonant web player in the listener's browser. This MCP server cannot reach that tab's speakers.`,
    { ok: false, browserOwned: true }
  );
}

function noSkip(): ToolResult {
  return errorResult("Resonant has no skip. The engine chooses what follows when a listen ends.");
}

export async function nuclearCall(method: string, params: Record<string, unknown>): Promise<ToolResult> {
  const parts = splitMethod(method);
  if (!parts) {
    return errorResult(`Invalid method format '${method}': expected 'Domain.method'.`);
  }
  const name = `${parts.domain}.${parts.method}`;
  const query = str(params, "query");
  const artist = str(params, "artist") || firstTrack(params).artist;
  const title = str(params, "title") || firstTrack(params).title;
  const candidateId = str(params, "candidateId", "videoId") || firstTrack(params).videoId;
  const limit = num(params, "limit", 8);

  switch (name) {
    case "Metadata.search": {
      const tracks = await findMusic(query || `${artist} ${title}`.trim(), limit);
      return textResult(
        tracks.length ? tracks.map((t) => `${t.artist} — ${t.title}`).join("\n") : "No recordings.",
        { tracks }
      );
    }
    case "Metadata.fetchArtistTopTracks": {
      const who = artist || query;
      if (!who) return errorResult("Name an artist.");
      const tracks = await findMusic(who, limit, { appleOnly: true, artistFocus: true, attachVideo: true });
      return textResult(tracks.map((t) => `${t.artist} — ${t.title}`).join("\n") || "No recordings.", { tracks });
    }
    case "Metadata.fetchArtistRelatedArtists": {
      const who = artist || query;
      if (!who) return errorResult("Name an artist.");
      const tracks = await findRelated({ artist: who, title, limit });
      return textResult(tracks.map((t) => `${t.artist} — ${t.title}`).join("\n") || "No recordings.", { tracks });
    }
    case "Metadata.fetchArtistAlbums":
    case "Metadata.fetchAlbumDetails": {
      const tracks = await findMusic(query || `${artist} ${title}`.trim() || artist, limit, { appleOnly: true });
      return textResult(tracks.map((t) => `${t.artist} — ${t.title}`).join("\n") || "No recordings.", { tracks });
    }
    case "Metadata.fetchArtistBio":
      return textResult("Resonant does not store artist biographies. Search returns recordings instead.", {
        name: artist || query,
        bio: null,
      });

    case "Streaming.searchForTrack":
    case "Playback.play":
    case "Queue.addToQueue":
    case "Queue.addNext": {
      const resolved = await resolveNuclearStream({ artist, title, query: query || undefined, videoId: candidateId || undefined });
      return textResult(resolved.note, resolved);
    }
    case "Streaming.getStreamUrl": {
      const resolved = await resolveNuclearStream({ videoId: candidateId, artist, title });
      return textResult(resolved.note, resolved);
    }

    case "Queue.goToNext":
    case "Queue.goToPrevious":
      return noSkip();
    case "Queue.getQueue":
    case "Queue.getCurrentItem":
    case "Queue.clearQueue":
      return browserOwned(name);
    case "Playback.getState":
    case "Playback.pause":
    case "Playback.stop":
    case "Playback.toggle":
    case "Playback.seekTo":
    case "Playback.getVolume":
    case "Playback.setVolume":
      return browserOwned(name);

    case "Dashboard.fetchTopTracks":
    case "Dashboard.fetchNewReleases":
    case "Dashboard.fetchTopAlbums":
    case "Dashboard.fetchTopArtists": {
      const rooms = TOPOGRAPHY.map((r) => r.id);
      const requested = str(params, "room");
      const room = (rooms.includes(requested as CoordinateId) ? requested : "cinematic_warmth") as CoordinateId;
      const tracks = await harvestRoom(room, Date.now(), Math.max(6, Math.min(12, limit)));
      return textResult(
        tracks.map((t) => `${t.artist} — ${t.title}`).join("\n") || "No harvest.",
        { providerId: "apple", providerName: "Apple Music", room, items: tracks }
      );
    }
    case "Dashboard.fetchEditorialPlaylists":
      return textResult("No editorial playlist feed. Use Dashboard.fetchTopTracks for a live Apple harvest.", {
        items: [],
      });

    case "Providers.list":
      return textResult(PROVIDERS.map((p) => `${p.id} (${p.kind})`).join("\n"), { providers: PROVIDERS });
    case "Providers.get": {
      const id = str(params, "id") || "apple";
      const provider = PROVIDERS.find((p) => p.id === id);
      if (!provider) return errorResult(`Unknown provider "${id}".`);
      return textResult(JSON.stringify(provider, null, 2), provider);
    }

    case "Favorites.getTracks":
    case "Favorites.addTrack":
    case "Favorites.isTrackFavorite":
      return textResult("Favorite Songs live in the listener's browser (IndexedDB on Listen Now), not on this MCP server.", {
        browserOwned: true,
      });
    case "Playlists.getIndex":
    case "Playlists.createPlaylist":
      return textResult("Resonant is not a playlist library. Ask can assemble a set for this session.", { browserOwned: true });

    default:
      return errorResult(`Cannot call "${name}".`);
  }
}
