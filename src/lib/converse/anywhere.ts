/**
 * OPEN MUSIC SEARCH
 *
 * Apple Music first. YouTube is for official videos/trailers, or when the
 * listener named YouTube. Iranian-script hits are skipped unless asked.
 */

import {
  acousticVulnerability,
  cinematicMagnitude,
  cinematicSpace,
  describeVector,
} from "@/lib/drift/ontology";
import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";
import { fallbackColor, hexToRgb, overlayMedia, rgbToHsl } from "@/lib/media";
import type { LibraryTrack } from "@/lib/library";
import { latinCore, namedArtistQuery } from "./intent";
import { matchRoom } from "./rooms";
import { ROOM_LIVE_PROBES } from "./probes";

export type MusicSource = "deezer" | "youtube" | "youtube_music" | "soundcloud" | "apple";

export type FoundHit = {
  source: MusicSource;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  previewUrl: string | null;
  artworkUrl: string | null;
  openUrl: string;
  externalId: string;
  videoId?: string | null;
};

const TIMEOUT_MS = 4500;
const SOURCE_PREFIX: Record<MusicSource, string> = {
  deezer: "dz",
  youtube: "yt",
  youtube_music: "ym",
  soundcloud: "sc",
  apple: "it",
};

const SOURCE_LABEL: Record<MusicSource, string> = {
  deezer: "Deezer",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  soundcloud: "SoundCloud",
  apple: "Apple",
};

const ROOM = TOPOGRAPHY.find((r) => r.id === "cinematic_warmth") ?? TOPOGRAPHY[0];

export function sourceLabel(source: string | undefined): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source as MusicSource] ?? source;
}

export function youtubeVideoId(track: Pick<LibraryTrack, "id" | "openUrl" | "videoId">): string | null {
  if (track.videoId && /^[A-Za-z0-9_-]{11}$/.test(track.videoId)) return track.videoId;
  if (track.id.startsWith("w-yt-") || track.id.startsWith("w-ym-")) {
    return track.id.replace(/^w-y[tm]-/, "") || null;
  }
  const url = track.openUrl ?? "";
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function isSoundcloudTrack(track: Pick<LibraryTrack, "id" | "openUrl" | "foundVia">): boolean {
  return track.foundVia === "soundcloud" || track.id.startsWith("w-sc-") || /soundcloud\.com/i.test(track.openUrl ?? "");
}

export function wantsIranian(query: string): boolean {
  return /ایرانی|ايرانى|گلچین ایرانی|persian music|farsi|فارسی/i.test(query);
}

export function wantsYoutube(query: string): boolean {
  return /youtube|youtu\.be|یوتیوب/i.test(query);
}

export function wantsSoundcloud(query: string): boolean {
  return /soundcloud|ساوندک?لاد/i.test(query);
}

function searchQueries(raw: string): string[] {
  const q = raw.trim();
  if (!q) return [];
  const extra: string[] = [];
  const shamsiNineties = /دهه\s*۹۰\s*شمسی|دهه نود شمسی/.test(q);
  if (shamsiNineties) {
    extra.push("2010s pop hits", "2010s hits");
  } else if (
    /دهه\s*۹۰|دهه\s*90|دهه نود|آهنگ(?:‌| )?های\s*۹۰|اهنگ(?:‌| )?های\s*۹۰|نود میلادی/i.test(q) ||
    /\b90s\b|\b1990s\b/.test(q)
  ) {
    extra.push("1990s pop hits", "90s hits");
  }
  if (/دهه\s*۸۰|دهه\s*80|دهه هشتاد/i.test(q) || /\b80s\b|\b1980s\b/.test(q)) {
    extra.push("1980s pop hits", "80s hits");
  }
  if (/دهه\s*۲۰۰۰|دهه\s*2000|دهه هشتاد شمسی|دهه\s*۸۰ شمسی/i.test(q) || /\b2000s\b|\by2k\b/.test(q)) {
    extra.push("2000s pop hits", "2000s hits");
  }

  const named = namedArtistQuery(q);
  const room = named ? null : matchRoom(q);
  if (room && extra.length === 0) {
    extra.push(...(ROOM_LIVE_PROBES[room as CoordinateId] ?? []).slice(0, 2));
  }

  if (wantsIranian(q)) {
    return [...new Set([q, ...extra, named, latinCore(q)].filter((s): s is string => Boolean(s)))].slice(0, 3);
  }
  const out = [...extra, named].filter((s): s is string => Boolean(s)).map((s) => s.trim());
  return [...new Set(out.filter(Boolean))].slice(0, 3);
}

function looksLikeArtistName(query: string): boolean {
  const q = query.trim();
  if (!q || q.split(/\s+/).length > 5) return false;
  return !/\d0s|\d{4}|hits|official|video|trailer|playlist|mix/i.test(q);
}

function preferArtistHits(hits: FoundHit[], artist: string): FoundHit[] {
  const needle = artist.trim().toLowerCase();
  if (needle.length < 3) return hits;
  const matched: FoundHit[] = [];
  const rest: FoundHit[] = [];
  for (const hit of hits) {
    const name = hit.artist.toLowerCase();
    if (name.includes(needle) || needle.includes(name)) matched.push(hit);
    else rest.push(hit);
  }
  return matched.length ? [...matched, ...rest] : hits;
}

function hasPersianScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function junkHit(hit: FoundHit): boolean {
  const blob = `${hit.title} ${hit.artist}`.toLowerCase();
  return /karaoke|santa style|nightcore|8d audio|slowed\s*&\s*reverb|lullaby version|tribute|party tyme|smoking u\b/i.test(
    blob
  );
}

function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("user-agent")) headers.set("user-agent", "ResonantAsk/1.0");
    const response = await fetch(url, { ...init, signal: controller.signal, headers });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 ResonantAsk/1.0" },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchDeezer(query: string, limit: number): Promise<FoundHit[]> {
  const payload = (await fetchJson(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${Math.min(25, limit * 2)}`
  )) as { data?: Record<string, unknown>[] } | null;
  const rows = payload?.data ?? [];
  const hits: FoundHit[] = [];
  for (const row of rows) {
    const title = typeof row.title === "string" ? row.title : "";
    const artistObj = row.artist && typeof row.artist === "object" ? (row.artist as Record<string, unknown>) : {};
    const artist = typeof artistObj.name === "string" ? artistObj.name : "";
    const id = row.id != null ? String(row.id) : "";
    if (!title || !artist || !id) continue;
    const albumObj = row.album && typeof row.album === "object" ? (row.album as Record<string, unknown>) : {};
    hits.push({
      source: "deezer",
      title,
      artist,
      album: typeof albumObj.title === "string" ? albumObj.title : null,
      duration: typeof row.duration === "number" ? row.duration : 30,
      previewUrl: typeof row.preview === "string" && row.preview ? row.preview : null,
      artworkUrl:
        (typeof albumObj.cover_medium === "string" && albumObj.cover_medium) ||
        (typeof albumObj.cover_xl === "string" && albumObj.cover_xl) ||
        null,
      openUrl: typeof row.link === "string" ? row.link : `https://www.deezer.com/track/${id}`,
      externalId: id,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

function appleHitFromRow(row: Record<string, unknown>): FoundHit | null {
  const title = typeof row.trackName === "string" ? row.trackName : "";
  const artist = typeof row.artistName === "string" ? row.artistName : "";
  const id = row.trackId != null ? String(row.trackId) : "";
  if (!title || !artist || !id) return null;
  const art =
    typeof row.artworkUrl100 === "string"
      ? row.artworkUrl100.replace(/\/\d+x\d+[a-z]*\.jpg$/i, "/600x600bb.jpg")
      : null;
  return {
    source: "apple",
    title,
    artist,
    album: typeof row.collectionName === "string" ? row.collectionName : null,
    duration: typeof row.trackTimeMillis === "number" ? Math.round(row.trackTimeMillis / 1000) : 30,
    previewUrl: typeof row.previewUrl === "string" ? row.previewUrl : null,
    artworkUrl: art,
    openUrl: typeof row.trackViewUrl === "string" ? row.trackViewUrl : `https://music.apple.com/us/song/${id}`,
    externalId: id,
  };
}

async function searchApple(query: string, limit: number, artistTerm = false): Promise<FoundHit[]> {
  const attr = artistTerm ? "&attribute=artistTerm" : "";
  const payload = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${Math.min(25, limit * 2)}${attr}`
  )) as { results?: Record<string, unknown>[] } | null;
  const hits: FoundHit[] = [];
  for (const row of payload?.results ?? []) {
    const hit = appleHitFromRow(row);
    if (!hit) continue;
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}

async function appleSongsByArtist(artist: string, limit: number): Promise<FoundHit[]> {
  const people = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=musicArtist&limit=5`
  )) as { results?: Record<string, unknown>[] } | null;
  const rows = people?.results ?? [];
  const needle = artist.toLowerCase();
  const match =
    rows.find((row) => String(row.artistName ?? "").toLowerCase() === needle) ??
    rows.find((row) => String(row.artistName ?? "").toLowerCase().includes(needle)) ??
    rows[0];
  const artistId = match?.artistId != null ? String(match.artistId) : "";
  if (artistId) {
    const lookup = (await fetchJson(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(artistId)}&entity=song&limit=${Math.min(20, limit + 1)}`
    )) as { results?: Record<string, unknown>[] } | null;
    const songs: FoundHit[] = [];
    for (const row of lookup?.results ?? []) {
      if (row.wrapperType === "artist") continue;
      const hit = appleHitFromRow(row);
      if (!hit) continue;
      songs.push(hit);
      if (songs.length >= limit) break;
    }
    if (songs.length) return songs;
  }
  const focused = await searchApple(artist, limit, true);
  return focused.length ? focused : searchApple(artist, limit);
}

function collectVideoIds(node: unknown, into: string[], cap = 24) {
  if (into.length >= cap) return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideoIds(item, into, cap);
    return;
  }
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  const id = rec.videoId;
  if (typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id) && !into.includes(id)) into.push(id);
  const nested = rec.playlistItemData;
  if (nested && typeof nested === "object") {
    const pid = (nested as Record<string, unknown>).videoId;
    if (typeof pid === "string" && /^[A-Za-z0-9_-]{11}$/.test(pid) && !into.includes(pid)) into.push(pid);
  }
  for (const value of Object.values(rec)) collectVideoIds(value, into, cap);
}

function youtubeTitleFromRenderer(node: unknown): { title: string; artist: string } | null {
  if (!node || typeof node !== "object") return null;
  const rec = node as Record<string, unknown>;
  const titleNode = rec.title;
  let title = "";
  if (typeof titleNode === "string") title = titleNode;
  else if (titleNode && typeof titleNode === "object") {
    const t = titleNode as Record<string, unknown>;
    if (typeof t.simpleText === "string") title = t.simpleText;
    else if (Array.isArray(t.runs)) title = t.runs.map((r) => (r && typeof r === "object" ? String((r as { text?: string }).text ?? "") : "")).join("");
  }
  let artist = "";
  for (const key of ["ownerText", "shortBylineText", "longBylineText"]) {
    const by = rec[key];
    if (by && typeof by === "object") {
      const runs = (by as { runs?: { text?: string }[] }).runs;
      if (runs?.[0]?.text) {
        artist = runs[0].text;
        break;
      }
    }
  }
  if (!title) return null;
  return { title, artist: artist || "YouTube" };
}

function walkYoutubeHits(node: unknown, into: FoundHit[], source: "youtube" | "youtube_music", cap: number) {
  if (into.length >= cap) return;
  if (Array.isArray(node)) {
    for (const item of node) walkYoutubeHits(item, into, source, cap);
    return;
  }
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  const videoId = typeof rec.videoId === "string" ? rec.videoId : null;
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    const meta = youtubeTitleFromRenderer(rec);
    if (meta && !into.some((h) => h.externalId === videoId)) {
      into.push({
        source,
        title: meta.title,
        artist: meta.artist,
        album: null,
        duration: 30,
        previewUrl: null,
        artworkUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        openUrl: source === "youtube_music" ? `https://music.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
        externalId: videoId,
      });
    }
  }
  for (const value of Object.values(rec)) walkYoutubeHits(value, into, source, cap);
}

async function innertubeSearch(kind: "youtube" | "youtube_music", query: string, limit: number): Promise<FoundHit[]> {
  const isMusic = kind === "youtube_music";
  const payload = await fetchJson(
    isMusic
      ? "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
      : "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: isMusic ? "WEB_REMIX" : "WEB",
            clientVersion: isMusic ? "1.20241118.01.00" : "2.20241118.01.00",
            hl: "en",
          },
        },
        query,
        ...(isMusic ? { params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D" } : {}),
      }),
    }
  );
  if (!payload) return [];
  const hits: FoundHit[] = [];
  walkYoutubeHits(payload, hits, kind, limit);
  if (hits.length >= 1) return hits.slice(0, limit);

  const ids: string[] = [];
  collectVideoIds(payload, ids, limit);
  const missing = ids.filter((id) => !hits.some((h) => h.externalId === id)).slice(0, limit);
  const oembeds = await Promise.all(
    missing.map(async (id) => {
      const info = (await fetchJson(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        {},
        5000
      )) as { title?: string; author_name?: string; thumbnail_url?: string } | null;
      if (!info?.title) return null;
      const hit: FoundHit = {
        source: kind,
        title: info.title,
        artist: info.author_name || (isMusic ? "YouTube Music" : "YouTube"),
        album: null,
        duration: 30,
        previewUrl: null,
        artworkUrl: info.thumbnail_url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        openUrl: isMusic ? `https://music.youtube.com/watch?v=${id}` : `https://www.youtube.com/watch?v=${id}`,
        externalId: id,
      };
      return hit;
    })
  );
  for (const hit of oembeds) {
    if (hit && !hits.some((h) => h.externalId === hit.externalId)) hits.push(hit);
  }
  return hits.slice(0, limit);
}

let soundCloudIdCache: { value: string; until: number } | null = null;

async function soundCloudClientId(): Promise<string | null> {
  const env = process.env.SOUNDCLOUD_CLIENT_ID?.trim();
  if (env) return env;
  if (soundCloudIdCache && Date.now() < soundCloudIdCache.until) return soundCloudIdCache.value;
  const html = await fetchText("https://soundcloud.com", 2500);
  if (!html) return null;
  const scripts = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"' ]+/g)].map((m) => m[0]);
  for (const src of scripts.slice(0, 1)) {
    const js = await fetchText(src, 2000);
    if (!js) continue;
    const match = js.match(/client_id:"([A-Za-z0-9]{16,})"/) ?? js.match(/client_id=([A-Za-z0-9]{16,})/);
    if (match?.[1]) {
      soundCloudIdCache = { value: match[1], until: Date.now() + 1000 * 60 * 60 };
      return match[1];
    }
  }
  return null;
}

async function searchSoundCloud(query: string, limit: number): Promise<FoundHit[]> {
  const clientId = await soundCloudClientId();
  if (!clientId) return [];
  const payload = (await fetchJson(
    `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${encodeURIComponent(clientId)}&limit=${Math.min(20, limit * 2)}`
  )) as { collection?: Record<string, unknown>[] } | null;
  const hits: FoundHit[] = [];
  for (const row of payload?.collection ?? []) {
    const title = typeof row.title === "string" ? row.title : "";
    const user = row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : {};
    const artist = typeof user.username === "string" ? user.username : "";
    const id = row.id != null ? String(row.id) : "";
    const permalink = typeof row.permalink_url === "string" ? row.permalink_url : "";
    if (!title || !artist || !id || !permalink) continue;
    const art =
      (typeof row.artwork_url === "string" && row.artwork_url.replace("-large.", "-t500x500.")) ||
      (typeof user.avatar_url === "string" ? user.avatar_url : null);
    hits.push({
      source: "soundcloud",
      title,
      artist,
      album: null,
      duration: typeof row.duration === "number" ? Math.round(row.duration / 1000) : 30,
      previewUrl: null,
      artworkUrl: art,
      openUrl: permalink,
      externalId: id,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

function keyOf(hit: FoundHit): string {
  return `${hit.artist}::${hit.title}`.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

function toLibraryTrack(hit: FoundHit): LibraryTrack {
  const id = `w-${SOURCE_PREFIX[hit.source]}-${hit.externalId}`;
  const vector = ROOM.vector;
  const csv = cinematicSpace(vector);
  const tint = fallbackColor(vector);
  overlayMedia(id, {
    artworkUrl: hit.artworkUrl,
    thumbUrl: hit.artworkUrl,
    previewUrl: hit.previewUrl,
    appleUrl: hit.openUrl,
    resolvedAlbum: hit.album,
    durationMs: hit.duration * 1000,
  });
  return {
    id,
    title: hit.title,
    artist: hit.artist,
    album: hit.album,
    duration: hit.duration,
    artworkUrl: hit.artworkUrl,
    thumbUrl: hit.artworkUrl,
    previewUrl: hit.previewUrl,
    appleUrl: hit.openUrl,
    tint,
    searchColor: tint,
    searchHsl: rgbToHsl(hexToRgb(tint)),
    isDark: true,
    region: ROOM.id,
    vector,
    avi: acousticVulnerability(vector),
    cinematic: cinematicMagnitude(csv),
    shape: describeVector(vector),
    note: `Found on ${SOURCE_LABEL[hit.source]}`,
    aspect: 1,
    origin: "expansion",
    foundVia: hit.source,
    openUrl: hit.openUrl,
    videoId: hit.videoId ?? null,
    videoUrl: hit.videoId ? `https://www.youtube.com/watch?v=${hit.videoId}` : null,
  };
}

function interleave(groups: FoundHit[][], limit: number): FoundHit[] {
  const seen = new Set<string>();
  const out: FoundHit[] = [];
  let i = 0;
  while (out.length < limit) {
    let added = false;
    for (const group of groups) {
      const hit = group[i];
      if (!hit) continue;
      const key = keyOf(hit);
      if (seen.has(key) || seen.has(hit.externalId)) continue;
      seen.add(key);
      seen.add(hit.externalId);
      out.push(hit);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
    i += 1;
  }
  return out;
}

function orderGroups(
  query: string,
  apple: FoundHit[],
  deezer: FoundHit[],
  youtubeMusic: FoundHit[],
  soundcloud: FoundHit[],
  youtube: FoundHit[]
): FoundHit[][] {
  if (wantsYoutube(query) && !/apple|itunes|اپل/i.test(query)) {
    return [youtube, youtubeMusic, apple, deezer, soundcloud];
  }
  if (wantsSoundcloud(query)) {
    return [soundcloud, apple, deezer, youtubeMusic, youtube];
  }
  if (/deezer|دیزر/i.test(query)) {
    return [deezer, apple, youtubeMusic, youtube, soundcloud];
  }
  return [apple, deezer, youtubeMusic, soundcloud, youtube];
}

export async function officialVideo(artist: string, title: string): Promise<string | null> {
  const query = `${artist} ${title} official video`.replace(/\s+/g, " ").trim();
  const hits = await innertubeSearch("youtube", query, 3).catch(() => [] as FoundHit[]);
  const official = hits.find((h) => /official|vevo|topic/i.test(`${h.title} ${h.artist}`));
  return official?.externalId ?? hits[0]?.externalId ?? null;
}

async function attachTrailers(tracks: LibraryTrack[], cap = 4): Promise<LibraryTrack[]> {
  const targets = tracks.filter((t) => t.foundVia === "apple" && !t.videoId).slice(0, cap);
  await Promise.all(
    targets.map(async (track) => {
      const id = await withBudget(officialVideo(track.artist, track.title), 4000, null);
      if (!id) return;
      track.videoId = id;
      track.videoUrl = `https://www.youtube.com/watch?v=${id}`;
    })
  );
  return tracks;
}

export type FindMusicOptions = {
  appleOnly?: boolean;
  room?: CoordinateId;
  attachVideo?: boolean;
  artistFocus?: boolean;
};

export async function findMusic(query: string, limit = 10, options: FindMusicOptions = {}): Promise<LibraryTrack[]> {
  const cap = Math.max(4, Math.min(12, limit));
  const queries = searchQueries(query);
  if (!queries.length) return [];
  const original = query.trim();
  const catalogQueries = queries.slice(0, 2);
  const namedQuery = queries[0];
  const iranianOk = wantsIranian(original);
  const youtubeNamed = wantsYoutube(original);
  const soundcloudNamed = wantsSoundcloud(original);
  const skipWeb = options.appleOnly === true;
  const artistFocus = options.artistFocus === true || looksLikeArtistName(namedQuery);

  const [apple, deezer, youtube, youtubeMusic, soundcloud] = await Promise.all([
    Promise.all(
      catalogQueries.map((q) =>
        (artistFocus && looksLikeArtistName(q) ? appleSongsByArtist(q, cap) : searchApple(q, cap)).catch(
          () => [] as FoundHit[]
        )
      )
    ).then((groups) => groups.flat()),
    skipWeb
      ? Promise.resolve([] as FoundHit[])
      : Promise.all(catalogQueries.map((q) => searchDeezer(q, cap).catch(() => [] as FoundHit[]))).then((groups) =>
          groups.flat()
        ),
    youtubeNamed && !skipWeb
      ? innertubeSearch("youtube", namedQuery, cap).catch(() => [] as FoundHit[])
      : Promise.resolve([] as FoundHit[]),
    youtubeNamed && !skipWeb
      ? innertubeSearch("youtube_music", namedQuery, cap).catch(() => [] as FoundHit[])
      : Promise.resolve([] as FoundHit[]),
    soundcloudNamed && !skipWeb
      ? withBudget(searchSoundCloud(namedQuery, cap).catch(() => [] as FoundHit[]), 5000, [] as FoundHit[])
      : Promise.resolve([] as FoundHit[]),
  ]);

  const keep = (hit: FoundHit) => {
    if (junkHit(hit)) return false;
    if (!iranianOk && (hasPersianScript(hit.title) || hasPersianScript(hit.artist))) return false;
    return true;
  };

  const mixed = interleave(
    orderGroups(original, apple, deezer, youtubeMusic, soundcloud, youtube).map((g) =>
      preferArtistHits(g.filter(keep), artistFocus ? namedQuery : "")
    ),
    cap
  );

  const withPreview = mixed.filter((h) => h.previewUrl);
  const ordered = youtubeNamed || soundcloudNamed
    ? mixed
    : withPreview.length
      ? [...withPreview, ...mixed.filter((h) => !h.previewUrl)]
      : mixed;

  const unique: FoundHit[] = [];
  const seen = new Set<string>();
  for (const hit of ordered) {
    const key = keyOf(hit);
    if (seen.has(key) || seen.has(hit.externalId)) continue;
    seen.add(key);
    seen.add(hit.externalId);
    unique.push(hit);
    if (unique.length >= cap) break;
  }

  const tracks = unique.map(toLibraryTrack);
  if (options.attachVideo === false) return tracks;
  return attachTrailers(tracks, 3);
}
