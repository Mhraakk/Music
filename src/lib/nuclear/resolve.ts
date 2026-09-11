/**
 * Resolve a free full-length listen for a named recording.
 *
 * Phase 1: find YouTube candidates (Innertube search + official video).
 * Phase 2: return an embeddable stream the listener's browser can play.
 */

import { officialVideo, youtubeVideoHits } from "@/lib/converse/anywhere";
import type { NuclearCandidate, NuclearResolveResult, NuclearStream } from "./types";

function asVideoId(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
}

function toStream(videoId: string): NuclearStream {
  return {
    url: `https://www.youtube-nocookie.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    protocol: "youtube-embed",
    source: "youtube",
  };
}

function toCandidate(id: string, title: string, thumbnail?: string | null, durationMs?: number): NuclearCandidate {
  return {
    id,
    title,
    thumbnail: thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    durationMs,
    failed: false,
    source: "youtube",
    stream: toStream(id),
  };
}

export async function resolveNuclearStream(input: {
  artist?: string;
  title?: string;
  query?: string;
  videoId?: string | null;
  limit?: number;
}): Promise<NuclearResolveResult> {
  const artist = input.artist?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const query = (input.query?.trim() || `${artist} ${title}`.trim() || "").replace(/\s+/g, " ");
  const known = asVideoId(input.videoId);
  const cap = Math.max(1, Math.min(8, input.limit ?? 5));

  if (known) {
    const stream = toStream(known);
    return {
      ok: true,
      query: query || known,
      candidates: [toCandidate(known, query || known)],
      stream,
      note: "YouTube full listen in the player — Nuclear-style free stream via embed.",
    };
  }

  if (!query) {
    return { ok: false, query: "", candidates: [], stream: null, note: "Name an artist and title." };
  }

  const official = artist && title ? await officialVideo(artist, title).catch(() => null) : null;
  const officialId = asVideoId(official);

  const searches = [
    youtubeVideoHits(`${query} official audio`, cap),
    youtubeVideoHits(`${query} official video`, cap),
  ];
  const groups = await Promise.all(searches);
  const hits = [...groups.flat()];

  const seen = new Set<string>();
  const candidates: NuclearCandidate[] = [];
  if (officialId) {
    seen.add(officialId);
    candidates.push(toCandidate(officialId, query));
  }
  for (const hit of hits) {
    const id = asVideoId(hit.externalId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    candidates.push(
      toCandidate(id, `${hit.artist} — ${hit.title}`.replace(/^YouTube — /i, ""), hit.artworkUrl, hit.duration * 1000)
    );
    if (candidates.length >= cap) break;
  }

  const top = candidates[0] ?? null;
  return {
    ok: Boolean(top),
    query,
    candidates,
    stream: top?.stream ?? null,
    note: top
      ? "Full YouTube listen resolved. The player embeds it in the listener's browser."
      : "No YouTube candidate yet — Apple preview still plays if present.",
  };
}
