import {
  acousticVulnerability,
  cinematicMagnitude,
  cinematicSpace,
  describeVector,
} from "@/lib/drift/ontology";
import { TOPOGRAPHY } from "@/lib/drift/topography";
import type { LibraryTrack } from "@/lib/library";
import { fallbackColor, hexToRgb, overlayMedia, rgbToHsl } from "@/lib/media";
import { findMusic } from "@/lib/converse/anywhere";
import { findRelated } from "@/lib/converse/kin";
import {
  searchUrls,
  spotifyArtistUrl,
  spotifyTrackUrl,
  type AtlasOutbound,
  type AtlasTrackCard,
} from "./types";

const ROOM = TOPOGRAPHY.find((r) => r.id === "cinematic_warmth") ?? TOPOGRAPHY[0];
const TIMEOUT_MS = 4200;

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("user-agent")) headers.set("user-agent", "ResonantAtlas/1.0");
    const response = await fetch(url, { ...init, signal: controller.signal, headers });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type AppleSong = {
  trackId: string;
  title: string;
  artist: string;
  album: string | null;
  previewUrl: string | null;
  artworkUrl: string | null;
  appleUrl: string;
  duration: number;
  artistId: string | null;
  artistUrl: string | null;
};

function appleFromRow(row: Record<string, unknown>): AppleSong | null {
  const title = typeof row.trackName === "string" ? row.trackName : "";
  const artist = typeof row.artistName === "string" ? row.artistName : "";
  const id = row.trackId != null ? String(row.trackId) : "";
  if (!title || !artist || !id) return null;
  const art =
    typeof row.artworkUrl100 === "string"
      ? row.artworkUrl100.replace(/\/\d+x\d+[a-z]*\.jpg$/i, "/600x600bb.jpg")
      : null;
  const artistId = row.artistId != null ? String(row.artistId) : null;
  return {
    trackId: id,
    title,
    artist,
    album: typeof row.collectionName === "string" ? row.collectionName : null,
    previewUrl: typeof row.previewUrl === "string" ? row.previewUrl : null,
    artworkUrl: art,
    appleUrl: typeof row.trackViewUrl === "string" ? row.trackViewUrl : `https://music.apple.com/us/song/${id}`,
    duration: typeof row.trackTimeMillis === "number" ? Math.round(row.trackTimeMillis / 1000) : 30,
    artistId,
    artistUrl: typeof row.artistViewUrl === "string" ? row.artistViewUrl : artistId ? `https://music.apple.com/us/artist/${artistId}` : null,
  };
}

async function appleSong(artist: string, title?: string | null): Promise<AppleSong | null> {
  const query = `${artist} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  if (!query) return null;
  const payload = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`
  )) as { results?: Record<string, unknown>[] } | null;
  const rows = payload?.results ?? [];
  const needle = artist.trim().toLowerCase();
  const titled = title?.trim().toLowerCase();
  const ranked = rows
    .map((row) => appleFromRow(row))
    .filter((row): row is AppleSong => Boolean(row))
    .sort((a, b) => {
      const aA = a.artist.toLowerCase().includes(needle) ? 1 : 0;
      const bA = b.artist.toLowerCase().includes(needle) ? 1 : 0;
      if (aA !== bA) return bA - aA;
      if (!titled) return 0;
      const aT = a.title.toLowerCase().includes(titled) ? 1 : 0;
      const bT = b.title.toLowerCase().includes(titled) ? 1 : 0;
      return bT - aT;
    });
  return ranked[0] ?? null;
}

async function appleArtistUrl(artist: string): Promise<string | null> {
  const payload = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=musicArtist&limit=5`
  )) as { results?: Record<string, unknown>[] } | null;
  const needle = artist.trim().toLowerCase();
  const match =
    (payload?.results ?? []).find((row) => String(row.artistName ?? "").toLowerCase() === needle) ??
    (payload?.results ?? []).find((row) => String(row.artistName ?? "").toLowerCase().includes(needle)) ??
    payload?.results?.[0];
  if (!match) return null;
  if (typeof match.artistLinkUrl === "string") return match.artistLinkUrl;
  if (match.artistId != null) return `https://music.apple.com/us/artist/${match.artistId}`;
  return null;
}

function walkYoutubeHits(node: unknown, into: string[], cap: number) {
  if (into.length >= cap) return;
  if (Array.isArray(node)) {
    for (const item of node) walkYoutubeHits(item, into, cap);
    return;
  }
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  const videoId = typeof rec.videoId === "string" ? rec.videoId : null;
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) && !into.includes(videoId)) into.push(videoId);
  for (const value of Object.values(rec)) walkYoutubeHits(value, into, cap);
}

async function youtubeMusicUrl(artist: string, title?: string | null): Promise<string | null> {
  const query = `${artist} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  if (!query) return null;
  const payload = await fetchJson("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20241118.01.00", hl: "en" } },
      query,
      params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
    }),
  });
  const ids: string[] = [];
  walkYoutubeHits(payload, ids, 3);
  return ids[0] ? `https://music.youtube.com/watch?v=${ids[0]}` : null;
}

let soundCloudId: { value: string; until: number } | null = null;

async function soundCloudClientId(): Promise<string | null> {
  const env = process.env.SOUNDCLOUD_CLIENT_ID?.trim();
  if (env) return env;
  if (soundCloudId && Date.now() < soundCloudId.until) return soundCloudId.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const home = await fetch("https://soundcloud.com", {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 ResonantAtlas/1.0" },
    });
    if (!home.ok) return null;
    const html = await home.text();
    const scripts = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"' ]+/g)].map((m) => m[0]);
    for (const src of scripts.slice(0, 1)) {
      const jsRes = await fetch(src, { headers: { "user-agent": "Mozilla/5.0 ResonantAtlas/1.0" } });
      const js = jsRes.ok ? await jsRes.text() : "";
      const match = js.match(/client_id:"([A-Za-z0-9]{16,})"/) ?? js.match(/client_id=([A-Za-z0-9]{16,})/);
      if (match?.[1]) {
        soundCloudId = { value: match[1], until: Date.now() + 1000 * 60 * 60 };
        return match[1];
      }
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

async function soundcloudUrl(artist: string, title?: string | null): Promise<string | null> {
  const query = `${artist} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  if (!query) return null;
  const clientId = await soundCloudClientId();
  if (!clientId) return null;
  const payload = (await fetchJson(
    `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${encodeURIComponent(clientId)}&limit=5`
  )) as { collection?: { permalink_url?: string; title?: string; user?: { username?: string } }[] } | null;
  const needle = artist.trim().toLowerCase();
  const hit =
    (payload?.collection ?? []).find((row) => (row.user?.username ?? "").toLowerCase().includes(needle.slice(0, 8))) ??
    payload?.collection?.[0];
  return typeof hit?.permalink_url === "string" ? hit.permalink_url : null;
}

export async function resolveOutbound(input: {
  artist: string;
  title?: string | null;
  spotifyTrackId?: string | null;
  spotifyArtistId?: string | null;
}): Promise<AtlasOutbound> {
  const fallback = searchUrls(input.artist, input.title);
  const [apple, appleArtist, ytm, sc] = await Promise.all([
    appleSong(input.artist, input.title),
    appleArtistUrl(input.artist),
    youtubeMusicUrl(input.artist, input.title),
    soundcloudUrl(input.artist, input.title),
  ]);
  return {
    apple: apple?.appleUrl ?? fallback.apple,
    appleArtist: apple?.artistUrl ?? appleArtist ?? fallback.appleArtist,
    spotify: spotifyTrackUrl(input.spotifyTrackId) ?? fallback.spotify,
    spotifyArtist: spotifyArtistUrl(input.spotifyArtistId) ?? fallback.spotifyArtist,
    youtubeMusic: ytm ?? fallback.youtubeMusic,
    soundcloud: sc ?? fallback.soundcloud,
  };
}

export function applyOutbound(track: LibraryTrack, outbound: AtlasOutbound): LibraryTrack {
  return {
    ...track,
    appleUrl: outbound.apple ?? track.appleUrl,
    openUrl: outbound.apple ?? track.openUrl ?? track.appleUrl,
    spotifyUrl: outbound.spotify ?? track.spotifyUrl,
    youtubeMusicUrl: outbound.youtubeMusic ?? track.youtubeMusicUrl,
    soundcloudUrl: outbound.soundcloud ?? track.soundcloudUrl,
  };
}

export function trackFromApple(
  song: AppleSong,
  outbound: AtlasOutbound,
  note: string
): LibraryTrack {
  const id = `w-it-${song.trackId}`;
  const vector = ROOM.vector;
  const csv = cinematicSpace(vector);
  const tint = fallbackColor(vector);
  overlayMedia(id, {
    artworkUrl: song.artworkUrl,
    thumbUrl: song.artworkUrl,
    previewUrl: song.previewUrl,
    appleUrl: song.appleUrl,
    resolvedAlbum: song.album,
    durationMs: song.duration * 1000,
  });
  return {
    id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    artworkUrl: song.artworkUrl,
    thumbUrl: song.artworkUrl,
    previewUrl: song.previewUrl,
    appleUrl: song.appleUrl,
    tint,
    searchColor: tint,
    searchHsl: rgbToHsl(hexToRgb(tint)),
    isDark: true,
    region: ROOM.id,
    vector,
    avi: acousticVulnerability(vector),
    cinematic: cinematicMagnitude(csv),
    shape: describeVector(vector),
    note,
    aspect: 1,
    origin: "expansion",
    foundVia: "apple",
    openUrl: song.appleUrl,
    videoId: null,
    videoUrl: null,
    spotifyUrl: outbound.spotify,
    youtubeMusicUrl: outbound.youtubeMusic,
    soundcloudUrl: outbound.soundcloud,
  };
}

export async function resolveRecording(input: {
  artist: string;
  title?: string | null;
  spotifyTrackId?: string | null;
  spotifyArtistId?: string | null;
  previewUrl?: string | null;
  note?: string;
}): Promise<{ track: LibraryTrack | null; card: AtlasTrackCard }> {
  const fallback = searchUrls(input.artist, input.title);
  const [apple, appleArtist, ytm, sc] = await Promise.all([
    appleSong(input.artist, input.title),
    appleArtistUrl(input.artist),
    youtubeMusicUrl(input.artist, input.title),
    soundcloudUrl(input.artist, input.title),
  ]);
  const outbound: AtlasOutbound = {
    apple: apple?.appleUrl ?? fallback.apple,
    appleArtist: apple?.artistUrl ?? appleArtist ?? fallback.appleArtist,
    spotify: spotifyTrackUrl(input.spotifyTrackId) ?? fallback.spotify,
    spotifyArtist: spotifyArtistUrl(input.spotifyArtistId) ?? fallback.spotifyArtist,
    youtubeMusic: ytm ?? fallback.youtubeMusic,
    soundcloud: sc ?? fallback.soundcloud,
  };
  if (apple) {
    const track = trackFromApple(apple, outbound, input.note ?? `Resolved from ${input.artist}`);
    return {
      track,
      card: {
        artist: apple.artist,
        title: apple.title,
        album: apple.album,
        artworkUrl: apple.artworkUrl,
        previewUrl: apple.previewUrl ?? input.previewUrl ?? null,
        duration: apple.duration,
        libraryId: track.id,
        outbound,
      },
    };
  }

  const live = await findMusic(`${input.artist} ${input.title ?? ""}`.trim(), 4, {
    appleOnly: true,
    artistFocus: !input.title,
    attachVideo: false,
  });
  const hit = live[0] ?? null;
  const withLinks = hit ? applyOutbound(hit, outbound) : null;
  return {
    track: withLinks,
    card: {
      artist: hit?.artist ?? input.artist,
      title: hit?.title ?? input.title ?? input.artist,
      album: hit?.album ?? null,
      artworkUrl: hit?.artworkUrl ?? null,
      previewUrl: hit?.previewUrl ?? input.previewUrl ?? null,
      duration: hit?.duration ?? 30,
      libraryId: withLinks?.id ?? null,
      outbound,
    },
  };
}

export async function recordingsForArtist(artist: string, limit = 10): Promise<LibraryTrack[]> {
  const related = await findRelated({ artist, limit: Math.max(6, Math.min(12, limit)) });
  const enriched = await Promise.all(
    related.slice(0, limit).map(async (track) => {
      const outbound = await resolveOutbound({ artist: track.artist, title: track.title });
      return applyOutbound(track, outbound);
    })
  );
  return enriched;
}

export function cardFromTrack(track: LibraryTrack): AtlasTrackCard {
  return {
    artist: track.artist,
    title: track.title,
    album: track.album,
    artworkUrl: track.artworkUrl,
    previewUrl: track.previewUrl,
    duration: track.duration,
    libraryId: track.id,
    outbound: {
      apple: track.appleUrl ?? track.openUrl ?? null,
      appleArtist: searchUrls(track.artist).appleArtist,
      spotify: track.spotifyUrl ?? null,
      spotifyArtist: null,
      youtubeMusic: track.youtubeMusicUrl ?? null,
      soundcloud: track.soundcloudUrl ?? null,
    },
  };
}
