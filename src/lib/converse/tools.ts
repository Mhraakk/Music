import { collection, collections, libraryTrack, queryCatalog, toLibraryTrack, type LibraryTrack } from "@/lib/library";
import { generateTasteExpansion } from "@/lib/drift/expansion";
import { planFullDrift } from "@/lib/mcp/cognition";
import { materializeFavoriteOverlay, parseFavoriteOverlay } from "@/lib/apple/overlay";
import { TOPOGRAPHY, adjacentCoordinates, type CoordinateId } from "@/lib/drift/topography";
import type { GeminiFunctionDeclaration } from "@/lib/mcp/gemini";
import { looksLikeHexColor, matchRoom } from "./rooms";
import { findMusic, sourceLabel } from "./anywhere";
import { findRelated } from "./kin";
import { harvestAtlas } from "@/lib/everynoise";
import { harvestRoom } from "./live-room";
import { fetchLyrics } from "@/lib/lyrics/lrclib";
import { wantsMetingPlatform } from "@/lib/meting/platforms";
import { harvestWheat } from "@/lib/wheat/service";
import { capToDuration } from "@/lib/listen/duration";
import { resolveRecording } from "@/lib/everynoise/enrich";
import { researchRecording, type RecordingResearch } from "./research";
import type { ConverseEffect, ConverseSession, ConverseTrackCard } from "./types";

export type PlaybackStatus = {
  playing: boolean;
  id: string | null;
  title: string | null;
  artist: string | null;
};

export type ToolContext = {
  session: ConverseSession;
  lastSearch: LibraryTrack[];
  lastPlaylistTitle: string | null;
  ingest: LibraryTrack[];
  effects: ConverseEffect[];
  lastLyrics: Awaited<ReturnType<typeof fetchLyrics>> | null;
  lastStatus: PlaybackStatus | null;
  lastResearch: RecordingResearch | null;
  lastShare: { path: string; url: string; trackId: string } | null;
};

export function createToolContext(session: ConverseSession): ToolContext {
  return {
    session,
    lastSearch: [],
    lastPlaylistTitle: null,
    ingest: [],
    effects: [],
    lastLyrics: null,
    lastStatus: null,
    lastResearch: null,
    lastShare: null,
  };
}

export function card(track: LibraryTrack): ConverseTrackCard {
  const room = TOPOGRAPHY.find((r) => r.id === track.region);
  const source = sourceLabel(track.foundVia) ?? (track.id.startsWith("w-") ? "web" : "Resonant");
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    room: room?.label ?? track.region.replace(/_/g, " "),
    feeling: track.shape,
    duration: track.duration,
    source,
    openUrl: track.openUrl ?? track.appleUrl ?? null,
    playable: Boolean(track.previewUrl) || Boolean(track.openUrl),
    videoUrl: track.videoUrl ?? null,
    catalogUrl: track.metingUrl ?? null,
    catalogLabel: track.metingLabel ?? null,
  };
}

function overlayTracks(session: ConverseSession): LibraryTrack[] {
  const rows = parseFavoriteOverlay(session.overlay);
  return materializeFavoriteOverlay(rows).map((t) => toLibraryTrack(t, null));
}

function knownTracks(ctx: ToolContext): LibraryTrack[] {
  const map = new Map<string, LibraryTrack>();
  for (const track of overlayTracks(ctx.session)) map.set(track.id, track);
  for (const track of ctx.ingest) map.set(track.id, track);
  for (const track of ctx.lastSearch) map.set(track.id, track);
  return [...map.values()];
}

function resolveId(ctx: ToolContext, id: string): LibraryTrack | null {
  const local = knownTracks(ctx).find((t) => t.id === id);
  if (local) return local;
  return libraryTrack(id);
}

function rememberSearch(ctx: ToolContext, tracks: LibraryTrack[]) {
  ctx.lastSearch = tracks;
}

function playable(tracks: LibraryTrack[]): LibraryTrack[] {
  const withPreview = tracks.filter((t) => t.previewUrl);
  return withPreview.length ? withPreview : tracks;
}

function searchHaystack(track: LibraryTrack, q: string): boolean {
  const blob = `${track.title} ${track.artist} ${track.album ?? ""} ${track.region} ${track.shape} ${track.note}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => blob.includes(term));
}

export function searchTracks(ctx: ToolContext, query: string, limit = 8): LibraryTrack[] {
  const q = query.trim();
  if (!q) return [];

  const room = matchRoom(q);
  const color = looksLikeHexColor(q);
  const overlayHits = overlayTracks(ctx.session).filter((t) => searchHaystack(t, q));

  let engine: LibraryTrack[] = [];
  if (room) {
    const shelf = collection(room);
    engine = shelf?.tracks.slice(0, 24) ?? [];
  }
  if (color) {
    const page = queryCatalog({ color, limit: 24 });
    engine = mergeTracks(engine, page.tracks);
  }
  const textPage = queryCatalog({ q, limit: 24 });
  engine = mergeTracks(engine, textPage.tracks);

  const exclude = new Set(ctx.session.historyIds.slice(-16));
  const merged = mergeTracks(overlayHits, engine).filter((t) => !exclude.has(t.id));
  const ranked = playable(merged).slice(0, Math.max(1, Math.min(12, limit)));
  rememberSearch(ctx, ranked);
  return ranked;
}

function mergeTracks(a: LibraryTrack[], b: LibraryTrack[]): LibraryTrack[] {
  const map = new Map<string, LibraryTrack>();
  for (const t of a) map.set(t.id, t);
  for (const t of b) if (!map.has(t.id)) map.set(t.id, t);
  return [...map.values()];
}

function pushPlay(ctx: ToolContext, tracks: LibraryTrack[], title?: string) {
  const list = tracks.filter((t) => t.previewUrl || t.openUrl || t.id.startsWith("w-"));
  const unique = list.filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i);
  if (!unique.length) return;
  const guests = unique.filter((t) => t.id.startsWith("w-"));
  if (guests.length) {
    ctx.ingest.push(...guests);
    ctx.effects.push({ type: "ingest", tracks: guests });
  }
  const [first, ...rest] = unique;
  ctx.effects.push({ type: "play", track: first });
  if (rest.length) {
    ctx.effects.push({ type: "queue", tracks: rest, title: title?.trim() || ctx.lastPlaylistTitle || "A set for you" });
  }
}

function pushDestination(ctx: ToolContext, id: CoordinateId) {
  if (ctx.effects.some((e) => e.type === "destination" && e.id === id)) return;
  ctx.effects.push({ type: "destination", id });
}

export const CONVERSE_TOOLS: GeminiFunctionDeclaration[] = [
  {
    name: "find_music",
    description:
      "Search Apple Music first for real recordings matching the listener. " +
      "Then Deezer if needed. YouTube only when they asked for YouTube — otherwise YouTube is used for official videos/trailers attached to Apple tracks. " +
      "Do not search Iranian/local mixes unless they asked for Iranian music. " +
      "Use English decade queries for دهه ۹۰ (1990s pop hits). Then play_tracks with the returned ids.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The listener's request in their own words. Do not rewrite it into feeling jargon.",
        },
        limit: { type: "INTEGER", description: "How many songs to return, 4–12. Default 8." },
      },
      required: ["query"],
    },
  },
  {
    name: "browse_atlas",
    description:
      "Open the Every Noise atlas: the full map, a named branch (trip hop), an artist (DJ Krush), or a Sound/Intro/Pulse/Edge playlist. " +
      "Returns real Apple recordings. Genre is navigation only — never written onto catalog records. Then play_tracks.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Free text: everynoise, electronic, a genre label, or an artist." },
        artist: { type: "STRING", description: "Named artist to expand, e.g. DJ Krush." },
        genre: { type: "STRING", description: "Every Noise branch slug or label, e.g. trip hop." },
        limit: { type: "INTEGER", description: "How many songs, 4–12. Default 8." },
        duration_minutes: {
          type: "INTEGER",
          description: "Listening length in minutes (15, 30, 45, 60). Caps the set by duration, not genre.",
        },
        playlist: { type: "STRING", description: "Every Noise / Spotify playlist id, or a title like The Sound of Trip Hop." },
        playlist_kind: {
          type: "STRING",
          description: "sound, intro, pulse, edge, or new.",
        },
      },
    },
  },
  {
    name: "browse_wheat",
    description:
      "Harvest wheat1 (t.me/wheat1) or a pasted night of artist – title lines. Resolves on Apple Music. Then play_tracks.",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "Pasted wheat1 caption or a whole night of artist – title lines." },
        duration_minutes: { type: "INTEGER", description: "Listening length in minutes. Default 30." },
      },
    },
  },
  {
    name: "find_related",
    description:
      "More songs by the same person, then related artists, from Apple Music. " +
      "Use when they want similar songs, kin, 'more like this', or tracks from this artist. " +
      "Pass the artist name from the last search or now playing. Then play_tracks.",
    parameters: {
      type: "OBJECT",
      properties: {
        artist: { type: "STRING", description: "Artist to expand from." },
        title: { type: "STRING", description: "Optional song title they named." },
        limit: { type: "INTEGER", description: "How many songs, 4–12. Default 8." },
      },
      required: ["artist"],
    },
  },
  {
    name: "playback_status",
    description:
      "Report what is sounding now: title, artist, and whether anything is loaded. " +
      "Use when they ask what is playing, الان چی پخش میشه, or now playing. Does not start a new song.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "fetch_lyrics",
    description:
      "Fetch published lyrics for a named recording or whatever is playing now. " +
      "Use when they ask for lyrics, متن آهنگ, or the words. Never invent lyrics. " +
      "The mini-player also shows synced lines against the listen.",
    parameters: {
      type: "OBJECT",
      properties: {
        artist: { type: "STRING", description: "Artist. Defaults to now playing." },
        title: { type: "STRING", description: "Track title. Defaults to now playing." },
        query: { type: "STRING", description: "Free-text fallback if artist/title are missing." },
      },
    },
  },
  {
    name: "search_catalog",
    description:
      "Optional: search only Resonant's own shelf. Never use this as a reason to refuse a request. " +
      "If the listener wants songs that may live outside the shelf, call find_music instead.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Feeling, artist, title, room, or #rrggbb. Persian or English.",
        },
        limit: { type: "INTEGER", description: "How many songs to return, 1–12. Default 8." },
      },
      required: ["query"],
    },
  },
  {
    name: "list_rooms",
    description: "List the nine listening rooms / stations on the emotional map, with song counts.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "play_tracks",
    description:
      "Play one or more catalog ids now. The first starts immediately; the rest become a short asked-for queue. " +
      "Ids must come from find_music, find_related, browse_atlas, browse_wheat, search_catalog, make_playlist, start_station, expand_taste, plan_journey, or resolve_atlas.",
    parameters: {
      type: "OBJECT",
      properties: {
        ids: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Catalog ids, first id plays now.",
        },
        title: { type: "STRING", description: "Optional name for the set if more than one id." },
      },
      required: ["ids"],
    },
  },
  {
    name: "start_station",
    description:
      "Start a map room: lock the destination and harvest live Apple Music for that feeling. There is no skip.",
    parameters: {
      type: "OBJECT",
      properties: {
        room: {
          type: "STRING",
          enum: TOPOGRAPHY.map((c) => c.id),
          description: "Coordinate id of the room.",
        },
      },
      required: ["room"],
    },
  },
  {
    name: "make_playlist",
    description:
      "Assemble a mix matching a feeling, decade, genre, artist, or any request, then start it. " +
      "Prefers find_music (Deezer / YouTube / SoundCloud / Apple). The Resonant catalog is only a fallback.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Feeling or request in the listener's words." },
        room: {
          type: "STRING",
          enum: TOPOGRAPHY.map((c) => c.id),
          description: "Optional room to centre the mix on.",
        },
        title: { type: "STRING", description: "Human name for the mix." },
        count: { type: "INTEGER", description: "How many songs, 4–12. Default 8." },
        duration_minutes: { type: "INTEGER", description: "Optional listening length in minutes." },
      },
      required: ["query"],
    },
  },
  {
    name: "expand_taste",
    description:
      "Find up to ten newly admitted recordings near the listener's current taste via Apple Music, " +
      "then start them as a mix. Taste is a position on the map, never a genre. Use when they want " +
      "new music, more like this, or the catalog feels familiar.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "INTEGER", description: "How many new songs, 1–10. Default 8." },
        play: {
          type: "BOOLEAN",
          description: "If true (default), start the new mix immediately.",
        },
      },
    },
  },
  {
    name: "plan_journey",
    description:
      "Plan a listening arc between two rooms and start the first song, locking the destination. " +
      "The engine walks the rest. Use when they want to go from one feeling to another.",
    parameters: {
      type: "OBJECT",
      properties: {
        origin: { type: "STRING", enum: TOPOGRAPHY.map((c) => c.id) },
        destination: { type: "STRING", enum: TOPOGRAPHY.map((c) => c.id) },
      },
      required: ["destination"],
    },
  },
  {
    name: "set_destination",
    description: "Name where the session should drift without interrupting the current song.",
    parameters: {
      type: "OBJECT",
      properties: {
        room: { type: "STRING", enum: TOPOGRAPHY.map((c) => c.id) },
      },
      required: ["room"],
    },
  },
  {
    name: "play_alternative",
    description:
      "Play a different song than the current one — another match from the last search, or a neighbour room. " +
      "This is how you honour 'something else'. Never skip; choose a new match.",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: { type: "STRING", description: "Optional: softer, heavier, warmer, quieter…" },
      },
    },
  },
  {
    name: "resolve_atlas",
    description:
      "Resolve an Every Noise atlas row (artist + optional title) into a real Apple recording. " +
      "Genre is navigation only and is never written onto the catalog record. Then play_tracks.",
    parameters: {
      type: "OBJECT",
      properties: {
        artist: { type: "STRING", description: "Artist name from the atlas pin." },
        title: { type: "STRING", description: "Optional example recording title." },
        preview_url: { type: "STRING", description: "Optional Spotify preview URL from the atlas." },
        spotify_track_id: { type: "STRING" },
        spotify_artist_id: { type: "STRING" },
      },
      required: ["artist"],
    },
  },
  {
    name: "research_recording",
    description:
      "Cite published liner-notes context (Wikipedia / MusicBrainz) for an artist or recording. " +
      "Never invent a biography. Never return lyrics — use fetch_lyrics for words. " +
      "Does not start playback.",
    parameters: {
      type: "OBJECT",
      properties: {
        artist: { type: "STRING", description: "Artist. Defaults to now playing." },
        title: { type: "STRING", description: "Optional recording title. Defaults to now playing." },
      },
    },
  },
  {
    name: "share_listen",
    description:
      "Build a Resonant deep link /?listen=<id> for the current recording or a catalog id. " +
      "Use when they ask to share this listen. Does not start a new song. There is no skip.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "Catalog id. Defaults to now playing." },
        origin: { type: "STRING", description: "Optional public origin. Ask already sends the page origin." },
      },
    },
  },
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRoom(value: unknown): CoordinateId | null {
  const id = asString(value);
  return TOPOGRAPHY.some((c) => c.id === id) ? (id as CoordinateId) : matchRoom(id);
}

export async function executeConverseTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case "find_music": {
      const query = asString(args.query);
      const tracks = await findMusic(query, asNumber(args.limit, 8));
      rememberSearch(ctx, tracks);
      if (tracks.length) {
        ctx.ingest.push(...tracks);
        ctx.effects.push({ type: "ingest", tracks });
      }
      return {
        query,
        count: tracks.length,
        tracks: tracks.map(card),
        note: tracks.length
          ? wantsMetingPlatform(query)
            ? "Apple Music recordings for that title. catalogUrl is a public NetEase/QQ/KuGou/Kuwo search page — mention it, do not play it in-app."
            : "Real Apple Music recordings first. Name artist, title, and Apple. If videoUrl is set, mention the official video. Call play_tracks. Do not refuse."
          : "No hits yet — try the artist name in English, or a song title.",
      };
    }
    case "browse_atlas": {
      const artist = asString(args.artist);
      const genre = asString(args.genre);
      const query = asString(args.query);
      const playlist = asString(args.playlist);
      const playlistKindRaw = asString(args.playlist_kind).toLowerCase();
      const playlistKind = ["sound", "intro", "pulse", "edge", "new", "other"].includes(playlistKindRaw)
        ? (playlistKindRaw as "sound" | "intro" | "pulse" | "edge" | "new" | "other")
        : undefined;
      const minutes = asNumber(args.duration_minutes, 0);
      const harvested = await harvestAtlas({
        artist: artist || undefined,
        genre: genre || undefined,
        query: !artist && !genre && !playlist ? query || undefined : query || undefined,
        playlist: playlist || undefined,
        playlistKind,
        limit: asNumber(args.limit, 8),
        durationMinutes: minutes >= 8 ? minutes : undefined,
      });
      const tracks = harvested.tracks;
      rememberSearch(ctx, tracks);
      if (tracks.length) {
        ctx.ingest.push(...tracks);
        ctx.effects.push({ type: "ingest", tracks });
      }
      return {
        title: harvested.title,
        count: tracks.length,
        tracks: tracks.map(card),
        note: tracks.length
          ? "Every Noise branches resolved to real Apple recordings. Mention Apple / Spotify / YouTube Music / SoundCloud links on each card. Call play_tracks."
          : "Atlas is quiet — name DJ Krush, trip hop, or another branch.",
      };
    }
    case "browse_wheat": {
      const minutes = asNumber(args.duration_minutes, 30);
      const harvested = await harvestWheat({
        text: asString(args.text) || undefined,
        durationMinutes: minutes >= 8 ? minutes : 30,
        seed: Date.now(),
        limit: 5,
      });
      const tracks = harvested.tracks;
      rememberSearch(ctx, tracks);
      if (tracks.length) {
        ctx.ingest.push(...tracks);
        ctx.effects.push({ type: "ingest", tracks });
      }
      return {
        title: harvested.title,
        count: tracks.length,
        publicPreview: harvested.publicPreview,
        hints: harvested.hints,
        tracks: tracks.map(card),
        note: tracks.length
          ? "wheat1 captions resolved on Apple Music. Call play_tracks."
          : harvested.publicPreview
            ? "wheat1 had no resolvable titles."
            : "Ask them to paste a wheat1 caption. The public preview is closed.",
      };
    }
    case "find_related": {
      const artist = asString(args.artist) || ctx.session.currentArtist || "";
      const title = asString(args.title) || ctx.session.currentTitle || "";
      const tracks = await findRelated({ artist, title, limit: asNumber(args.limit, 8) });
      rememberSearch(ctx, tracks);
      if (tracks.length) {
        ctx.ingest.push(...tracks);
        ctx.effects.push({ type: "ingest", tracks });
      }
      return {
        artist,
        count: tracks.length,
        tracks: tracks.map(card),
        note: tracks.length
          ? "Same person first, then kin, from Apple Music. Call play_tracks. Do not invent other names."
          : "Could not resolve that artist on Apple Music. Call find_music with the artist in English.",
      };
    }
    case "playback_status": {
      const title = ctx.session.currentTitle?.trim() || null;
      const artist = ctx.session.currentArtist?.trim() || null;
      const id = ctx.session.currentTrackId;
      const playing = Boolean(title || artist || id);
      ctx.lastStatus = { playing, id: id ?? null, title, artist };
      return {
        kind: "playback_status",
        playing,
        id: id ?? null,
        title,
        artist,
        note: playing
          ? "This is what is loaded now. Do not start another song unless they ask."
          : "Nothing is loaded. If they want music, call find_music.",
      };
    }
    case "fetch_lyrics": {
      const artist = asString(args.artist) || ctx.session.currentArtist || "";
      const title = asString(args.title) || ctx.session.currentTitle || "";
      const query = asString(args.query);
      const lyrics = await fetchLyrics({ artist, title, query });
      ctx.lastLyrics = lyrics;
      const preview = lyrics.lines.slice(0, 8).map((line) => line.text);
      return {
        ok: lyrics.ok,
        artist: lyrics.artist,
        title: lyrics.title,
        synced: lyrics.synced,
        lines: preview,
        more: Math.max(0, lyrics.lines.length - preview.length),
        note: lyrics.note,
      };
    }
    case "search_catalog": {
      const query = asString(args.query);
      const tracks = searchTracks(ctx, query, asNumber(args.limit, 8));
      return {
        query,
        count: tracks.length,
        tracks: tracks.map(card),
        note: tracks.length
          ? "Optional shelf matches. Prefer find_music for anything outside this shelf."
          : "Nothing on the Resonant shelf. Call find_music with the same request — do not refuse.",
      };
    }
    case "list_rooms": {
      const shelves = collections();
      return {
        rooms: shelves.map((s) => ({
          id: s.id,
          label: s.title,
          description: s.description,
          songs: s.count,
        })),
      };
    }
    case "play_tracks": {
      const ids = asStringArray(args.ids).slice(0, 12);
      const tracks = ids.map((id) => resolveId(ctx, id)).filter((t): t is LibraryTrack => Boolean(t));
      if (!tracks.length) return { ok: false, error: "None of those ids resolved. Call find_music again." };
      const title = asString(args.title);
      if (title) ctx.lastPlaylistTitle = title;
      pushPlay(ctx, tracks, title);
      return { ok: true, playing: card(tracks[0]), queued: tracks.slice(1).map(card), title: title || null };
    }
    case "start_station": {
      const room = asRoom(args.room);
      if (!room) return { ok: false, error: "Unknown room." };
      pushDestination(ctx, room);
      const live = await harvestRoom(room, Date.now(), 5);
      if (live.length) {
        rememberSearch(ctx, live);
        ctx.ingest.push(...live);
        ctx.effects.push({ type: "ingest", tracks: live });
        pushPlay(ctx, live, `${TOPOGRAPHY.find((r) => r.id === room)?.label ?? "Station"} live`);
        return {
          ok: true,
          room: { id: room, label: TOPOGRAPHY.find((r) => r.id === room)?.label, live: true },
          playing: card(live[0]),
          tracks: live.map(card),
          note: "Live Apple Music harvest for this map room — not the static shelf.",
        };
      }
      const shelf = collection(room);
      if (!shelf?.tracks.length) return { ok: false, error: "That room is empty right now." };
      rememberSearch(ctx, shelf.tracks.slice(0, 12));
      pushPlay(ctx, [shelf.tracks[0]]);
      return {
        ok: true,
        room: { id: shelf.id, label: shelf.title, description: shelf.description },
        playing: card(shelf.tracks[0]),
        songs: shelf.count,
      };
    }
    case "make_playlist": {
      const query = asString(args.query);
      const room = asRoom(args.room) ?? matchRoom(query);
      const count = Math.max(4, Math.min(12, asNumber(args.count, 8)));
      const title =
        asString(args.title) ||
        (room ? `${TOPOGRAPHY.find((r) => r.id === room)?.label ?? "Listening"} mix` : query.slice(0, 48) || "A mix for you");
      ctx.lastPlaylistTitle = title;

      const found = await findMusic(query, count);
      let tracks: LibraryTrack[] = found;
      if (tracks.length < count && room) {
        const shelf = collection(room);
        tracks = mergeTracks(tracks, shelf?.tracks.slice(0, count) ?? []);
      }
      if (tracks.length < 4) {
        tracks = mergeTracks(tracks, searchTracks(ctx, query || room || "warm", count));
      }
      tracks = tracks.slice(0, count);
      const minutes = asNumber(args.duration_minutes, 0);
      if (minutes >= 8) tracks = capToDuration(tracks, minutes);
      rememberSearch(ctx, tracks);
      if (!tracks.length) return { ok: false, error: "Search returned nothing. Try another wording." };
      if (room) pushDestination(ctx, room);
      pushPlay(ctx, tracks, title);
      return { ok: true, title, tracks: tracks.map(card) };
    }
    case "expand_taste": {
      const limit = Math.max(1, Math.min(10, asNumber(args.limit, 8)));
      const shouldPlay = asBool(args.play, true);
      try {
        const result = await generateTasteExpansion({
          historyIds: ctx.session.historyIds,
          tasteVectors: ctx.session.tasteVectors,
          libraryVectors: ctx.session.overlay?.map((o) => o.vector),
          libraryArtists: (ctx.session.overlay ?? []).slice(0, 8).map((o) => ({ artist: o.artist, via: "favorite" })),
          excludeIds: ctx.session.historyIds,
          limit,
          analyze: false,
        });
        const tracks = result.tracks.map((item) => toLibraryTrack(item.track));
        if (tracks.length) {
          ctx.ingest.push(...tracks);
          ctx.effects.push({ type: "ingest", tracks });
          rememberSearch(ctx, tracks);
          if (shouldPlay) {
            ctx.lastPlaylistTitle = "New for you";
            pushPlay(ctx, tracks, "New for you");
          }
        }
        return {
          ok: tracks.length > 0,
          note: result.note,
          considered: result.considered,
          refused: result.refused,
          tracks: tracks.map(card),
        };
      } catch (error) {
        const fallback = searchTracks(ctx, "warm cinematic fragile", limit);
        if (fallback.length && shouldPlay) pushPlay(ctx, fallback, "From the catalog");
        return {
          ok: fallback.length > 0,
          note: "Apple expansion was unavailable; used the living catalog instead.",
          error: error instanceof Error ? error.message : "expansion failed",
          tracks: fallback.map(card),
        };
      }
    }
    case "plan_journey": {
      const destination = asRoom(args.destination);
      if (!destination) return { ok: false, error: "Unknown destination room." };
      const origin =
        asRoom(args.origin) ??
        (ctx.session.currentTrackId ? libraryTrack(ctx.session.currentTrackId)?.region : null) ??
        ctx.session.destination;
      const planned = await planFullDrift({
        origin,
        destination,
        sessionId: ctx.session.sessionId || `ask_${Date.now()}`,
        exclude: ctx.session.historyIds,
      });
      const tracks = planned.phases
        .map((p) => libraryTrack(p.trackId))
        .filter((t): t is LibraryTrack => Boolean(t));
      rememberSearch(ctx, tracks);
      pushDestination(ctx, destination);
      if (tracks.length) pushPlay(ctx, tracks.slice(0, 1));
      return {
        ok: true,
        narrative: planned.arc.narrative,
        origin,
        destination,
        playing: tracks[0] ? card(tracks[0]) : null,
        legs: planned.phases.map((p) => ({
          chapter: p.chapter,
          room: p.region,
          title: p.title,
          artist: p.artist,
        })),
      };
    }
    case "set_destination": {
      const room = asRoom(args.room);
      if (!room) return { ok: false, error: "Unknown room." };
      pushDestination(ctx, room);
      const meta = TOPOGRAPHY.find((c) => c.id === room);
      return { ok: true, room: { id: room, label: meta?.label, description: meta?.description } };
    }
    case "play_alternative": {
      const current = ctx.session.currentTrackId;
      const fromSearch = ctx.lastSearch.filter((t) => t.id !== current);
      if (fromSearch.length) {
        pushPlay(ctx, [fromSearch[0]]);
        return { ok: true, playing: card(fromSearch[0]), via: "last search" };
      }
      const here = ctx.session.destination;
      const neighbour = adjacentCoordinates(here, 1)[0];
      const shelf = collection(neighbour?.id ?? here);
      const candidate = (shelf?.tracks ?? []).find((t) => t.id !== current);
      if (!candidate) return { ok: false, error: "No alternative is ready. Name a feeling and I will search." };
      if (neighbour) pushDestination(ctx, neighbour.id);
      pushPlay(ctx, [candidate]);
      return { ok: true, playing: card(candidate), via: neighbour?.label ?? "same room" };
    }
    case "resolve_atlas": {
      const artist = asString(args.artist);
      if (!artist) return { ok: false, error: "Name an artist from the atlas." };
      const title = asString(args.title) || null;
      const resolved = await resolveRecording({
        artist,
        title,
        previewUrl: asString(args.preview_url) || null,
        spotifyTrackId: asString(args.spotify_track_id) || null,
        spotifyArtistId: asString(args.spotify_artist_id) || null,
        note: "Resolved from the Every Noise atlas",
      });
      const track = resolved.track;
      if (!track) {
        return { ok: false, error: "Atlas row did not resolve to an Apple recording.", card: resolved.card };
      }
      rememberSearch(ctx, [track]);
      ctx.ingest.push(track);
      ctx.effects.push({ type: "ingest", tracks: [track] });
      return {
        ok: true,
        tracks: [card(track)],
        note: "Atlas navigation resolved to Apple Music. Call play_tracks. Do not write a genre field onto the record.",
      };
    }
    case "research_recording": {
      const artist = asString(args.artist) || ctx.session.currentArtist || "";
      const title = asString(args.title) || ctx.session.currentTitle || "";
      const research = await researchRecording({ artist, title: title || undefined });
      ctx.lastResearch = research;
      return research;
    }
    case "share_listen": {
      const id = asString(args.id) || ctx.session.currentTrackId || "";
      if (!id) {
        ctx.lastShare = { path: "", url: "", trackId: "" };
        return { ok: false, error: "Nothing to share. Play a recording first." };
      }
      const path = `/?listen=${encodeURIComponent(id)}`;
      const origin = asString(args.origin) || ctx.session.origin || "";
      const url = origin ? `${origin.replace(/\/$/, "")}${path}` : path;
      ctx.lastShare = { path, url, trackId: id };
      ctx.effects.push({ type: "share", path, trackId: id });
      return {
        ok: true,
        path,
        url,
        trackId: id,
        note: "Give the listener this link. It opens Resonant on that recording. Do not add a skip control.",
      };
    }
    default:
      return { ok: false, error: `Unknown tool "${name}".` };
  }
}
