/**
 * Synced lyrics for the listening companion.
 *
 * Cyrene's desktop player shows LRC against the current track. Resonant does
 * the same on the web, from lrclib (no NetEase login, no Electron). Parser is
 * original — public LRC timestamps plus `[offset:±ms]`, not Cyrene source.
 */

import { stripMetingTokens } from "@/lib/meting/platforms";

export type LyricLine = {
  timeMs: number;
  text: string;
};

export type LyricsResult = {
  ok: boolean;
  artist: string;
  title: string;
  source: "lrclib" | null;
  synced: boolean;
  lines: LyricLine[];
  note: string;
};

const TIME_TAG = /^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/;
const OFFSET_TAG = /^offset\s*:\s*([+-]?\d+)$/i;

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc.trim()) return [];
  let offsetMs = 0;
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    let rest = raw.trim();
    const stamps: number[] = [];
    while (rest.startsWith("[")) {
      const close = rest.indexOf("]");
      if (close <= 0) break;
      const tag = rest.slice(1, close);
      rest = rest.slice(close + 1).trim();
      const time = TIME_TAG.exec(tag);
      if (time) {
        const msPart = time[3] ? Number(time[3].padEnd(3, "0")) : 0;
        stamps.push(Number(time[1]) * 60_000 + Number(time[2]) * 1000 + msPart);
        continue;
      }
      const offset = OFFSET_TAG.exec(tag);
      if (offset) offsetMs = Number(offset[1]);
    }
    const text = rest.replace(/<[^>]+>/g, "").trim();
    if (!text || !stamps.length) continue;
    for (const timeMs of stamps) lines.push({ timeMs: Math.max(0, timeMs - offsetMs), text });
  }
  lines.sort((a, b) => a.timeMs - b.timeMs);
  return lines;
}

function unsynced(text: string): LyricLine[] {
  return text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row, i) => ({ timeMs: i * 4000, text: row }));
}

type LrclibHit = {
  artistName?: string;
  trackName?: string;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
};

async function lrclib(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Resonant/4.0 (https://github.com/Mhraakk/Music)",
        accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function tidyNames(artist: string, title: string): { artist: string; title: string } {
  const who = artist.trim();
  let song = title.trim();
  const prefix = `${who} - `;
  if (who && song.toLowerCase().startsWith(prefix.toLowerCase())) {
    song = song.slice(prefix.length).trim();
  }
  return { artist: who, title: song };
}

function fromHit(hit: LrclibHit | null, artist: string, title: string): LyricsResult | null {
  if (!hit) return null;
  const synced = parseLrc(hit.syncedLyrics ?? "");
  const plain = (hit.plainLyrics ?? "").trim();
  const lines = synced.length ? synced : plain ? unsynced(plain) : [];
  if (!lines.length) return null;
  const names = tidyNames(hit.artistName || artist, hit.trackName || title);
  return {
    ok: true,
    artist: names.artist,
    title: names.title,
    source: "lrclib",
    synced: synced.length > 0,
    lines,
    note: synced.length ? "Synced lyrics for the current listen." : "Unsynced lyrics — no timestamps.",
  };
}

function cleanQuery(raw: string): string {
  return stripMetingTokens(raw)
    .replace(/\b(lyrics?|lyric|lrc)\b/gi, " ")
    .replace(/متن(\s+این)?(\s+آهنگ)?/g, " ")
    .replace(/لیریک|کلمات آهنگ|كلمات آهنگ/g, " ")
    .replace(/歌词|歌詞/g, " ")
    .replace(/این آهنگ|همین آهنگ/g, " ")
    .replace(/\b(please|show|me|for|this|that|song|track|words)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guesses(q: string): { artist: string; title: string }[] {
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [];
  const out = [{ artist: parts[0], title: parts.slice(1).join(" ") }];
  if (parts.length >= 3) out.push({ artist: parts.slice(0, 2).join(" "), title: parts.slice(2).join(" ") });
  return out;
}

function scoreHit(hit: LrclibHit, q: string): number {
  const artist = (hit.artistName ?? "").trim();
  const title = (hit.trackName ?? "").trim();
  const core = tidyNames(artist, title).title;
  const ql = q.toLowerCase();
  let score = 0;
  if (hit.syncedLyrics) score += 8;
  else if (hit.plainLyrics) score += 1;
  if (artist && title && artist.toLowerCase() !== title.toLowerCase()) score += 4;
  if (core && artist && !title.toLowerCase().startsWith(artist.toLowerCase())) score += 2;
  if (artist && ql.includes(artist.toLowerCase())) score += 2;
  if (core && ql.includes(core.toLowerCase())) score += 3;
  return score;
}

async function getByName(artist: string, title: string): Promise<LyricsResult | null> {
  if (!artist || !title) return null;
  const direct = (await lrclib(
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
  )) as LrclibHit | null;
  return fromHit(direct, artist, title);
}

export async function fetchLyrics(input: { artist?: string; title?: string; query?: string }): Promise<LyricsResult> {
  const artist = (input.artist ?? "").trim();
  const title = (input.title ?? "").trim();
  const query = (input.query ?? "").trim();
  const cleaned = cleanQuery(query);
  const who = artist || cleaned || query;
  const song = title || cleaned || query;
  if (!who && !song) {
    return { ok: false, artist: "", title: "", source: null, synced: false, lines: [], note: "Name an artist and title." };
  }

  const named = await getByName(artist, title);
  if (named?.synced) return named;

  if (!(artist && title) && cleaned) {
    for (const guess of guesses(cleaned)) {
      const hit = await getByName(guess.artist, guess.title);
      if (hit?.synced) return hit;
    }
  }

  const q = [artist, title].filter(Boolean).join(" ") || cleaned || query;
  const found = (await lrclib(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`)) as LrclibHit[] | null;
  const ranked = Array.isArray(found)
    ? [...found].filter((row) => row.syncedLyrics || row.plainLyrics).sort((a, b) => scoreHit(b, q) - scoreHit(a, q))
    : [];
  const parsed = fromHit(ranked[0] ?? null, artist, title);
  if (parsed) return parsed;
  if (named) return named;

  return {
    ok: false,
    artist,
    title,
    source: null,
    synced: false,
    lines: [],
    note: "No lyrics published for that recording yet.",
  };
}
