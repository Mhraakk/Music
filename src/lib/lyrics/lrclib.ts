/**
 * Synced lyrics for the listening companion.
 *
 * Cyrene's desktop player shows LRC against the current track. Resonant does
 * the same on the web, from lrclib (no NetEase login, no Electron). Parser is
 * original — public LRC timestamps, not Cyrene source.
 */

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

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc.trim()) return [];
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
      if (!time) continue;
      const msPart = time[3] ? Number(time[3].padEnd(3, "0")) : 0;
      stamps.push(Number(time[1]) * 60_000 + Number(time[2]) * 1000 + msPart);
    }
    const text = rest.replace(/<[^>]+>/g, "").trim();
    if (!text || !stamps.length) continue;
    for (const timeMs of stamps) lines.push({ timeMs, text });
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

function fromHit(hit: LrclibHit | null, artist: string, title: string): LyricsResult | null {
  if (!hit) return null;
  const synced = parseLrc(hit.syncedLyrics ?? "");
  const plain = (hit.plainLyrics ?? "").trim();
  const lines = synced.length ? synced : plain ? unsynced(plain) : [];
  if (!lines.length) return null;
  return {
    ok: true,
    artist: hit.artistName || artist,
    title: hit.trackName || title,
    source: "lrclib",
    synced: synced.length > 0,
    lines,
    note: synced.length ? "Synced lyrics for the current listen." : "Unsynced lyrics — no timestamps.",
  };
}

export async function fetchLyrics(input: { artist?: string; title?: string; query?: string }): Promise<LyricsResult> {
  const artist = (input.artist ?? "").trim();
  const title = (input.title ?? "").trim();
  const query = (input.query ?? "").trim();
  const who = artist || query;
  const song = title || query;
  if (!who && !song) {
    return { ok: false, artist: "", title: "", source: null, synced: false, lines: [], note: "Name an artist and title." };
  }

  if (artist && title) {
    const direct = (await lrclib(
      `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
    )) as LrclibHit | null;
    const parsed = fromHit(direct, artist, title);
    if (parsed) return parsed;
  }

  const q = [artist, title].filter(Boolean).join(" ") || query;
  const found = (await lrclib(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`)) as LrclibHit[] | null;
  const first = Array.isArray(found) ? found.find((row) => row.syncedLyrics || row.plainLyrics) : null;
  const parsed = fromHit(first ?? null, artist, title);
  if (parsed) return parsed;

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
