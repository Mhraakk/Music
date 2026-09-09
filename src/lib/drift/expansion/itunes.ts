/**
 * APPLE CATALOG SEARCH
 *
 * Retrieval, not recommendation. The engine asks Apple "what recordings exist
 * near this artist", never "what is popular". Charts are not consulted.
 *
 * MusicKit is the high-fidelity path when developer credentials are present.
 * The iTunes Search API is the floor — no key, and the same endpoint already
 * used to resolve artwork at build time.
 */

import { developerToken, musicKitConfig, storefront } from "@/lib/providers/musickit";
import { artistAgrees } from "./project";
import type { ExternalCandidate } from "./types";

const ITUNES = "https://itunes.apple.com/search";
const MUSIC_API = "https://api.music.apple.com/v1";
const SEARCH_TIMEOUT_MS = 7000;

class RateLimited extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function upsizeArtwork(url: string, size: number): string {
  return url.replace(/\/\d+x\d+[a-z]*\.jpg$/i, `/${size}x${size}bb.jpg`);
}

function asCandidate(
  row: {
    appleTrackId: string;
    title: string;
    artist: string;
    album: string | null;
    durationMs: number;
    previewUrl: string | null;
    artworkUrl: string | null;
    appleUrl: string | null;
  },
  probeArtist: string,
  probeVia: string,
  retrievalHint?: string
): ExternalCandidate | null {
  if (!row.appleTrackId || !row.title || !row.artist) return null;
  if (!row.artworkUrl || !row.previewUrl) return null;
  if (!artistAgrees(probeArtist, row.artist)) return null;
  return {
    appleTrackId: String(row.appleTrackId),
    title: row.title,
    artist: row.artist,
    album: row.album,
    durationMs: row.durationMs,
    previewUrl: row.previewUrl,
    artworkUrl: upsizeArtwork(row.artworkUrl, 1000),
    thumbUrl: upsizeArtwork(row.artworkUrl, 200),
    appleUrl: row.appleUrl,
    probeArtist,
    probeVia,
    retrievalHint,
  };
}

type ITunesSong = {
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  collectionName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  primaryGenreName?: string;
};

async function itunesGet(url: string): Promise<ITunesSong[]> {
  let throttled = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "sonic-drift-expansion-engine" },
      });
      clearTimeout(timeout);

      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        throttled = true;
        await sleep(1600 * 2 ** attempt + Math.random() * 700);
        continue;
      }
      if (!response.ok) return [];
      const payload = (await response.json()) as { results?: ITunesSong[] };
      return payload.results ?? [];
    } catch {
      throttled = true;
      await sleep(1200 * 2 ** attempt + Math.random() * 500);
    }
  }
  if (throttled) throw new RateLimited(url);
  return [];
}

function toCandidates(rows: ITunesSong[], probeArtist: string, probeVia: string): ExternalCandidate[] {
  return rows
    .map((row) =>
      asCandidate(
        {
          appleTrackId: row.trackId ? String(row.trackId) : "",
          title: row.trackName ?? "",
          artist: row.artistName ?? "",
          album: row.collectionName ?? null,
          durationMs: row.trackTimeMillis ?? 0,
          previewUrl: row.previewUrl ?? null,
          artworkUrl: row.artworkUrl100 ?? null,
          appleUrl: row.trackViewUrl ?? null,
        },
        probeArtist,
        probeVia,
        row.primaryGenreName
      )
    )
    .filter((row): row is ExternalCandidate => Boolean(row));
}

/**
 * Resolve the artist first, then look up their songs. A raw song search for
 * "Tricky" or "Air" is a title search and returns the wrong catalogue.
 */
async function searchITunes(term: string, limit: number): Promise<ExternalCandidate[]> {
  const artists = await itunesGet(
    `${ITUNES}?term=${encodeURIComponent(term)}&entity=musicArtist&limit=8`
  );
  const artist = artists.find((row) => artistAgrees(term, row.artistName ?? ""));
  if (artist?.artistId) {
    const lookup = await itunesGet(
      `https://itunes.apple.com/lookup?id=${artist.artistId}&entity=song&limit=${Math.min(50, limit + 1)}`
    );
    const songs = toCandidates(
      lookup.filter((row) => row.wrapperType === "track" || row.trackId),
      term,
      term
    );
    if (songs.length) return songs.slice(0, limit);
  }

  const fallback = await itunesGet(
    `${ITUNES}?term=${encodeURIComponent(term)}&entity=song&limit=${Math.min(50, limit)}`
  );
  return toCandidates(fallback, term, term).slice(0, limit);
}

async function searchMusicKit(term: string, limit: number): Promise<ExternalCandidate[]> {
  const url = new URL(`${MUSIC_API}/catalog/${storefront()}/search`);
  url.searchParams.set("term", term);
  url.searchParams.set("types", "songs");
  url.searchParams.set("limit", String(Math.min(25, limit)));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${developerToken()}` },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      results?: {
        songs?: {
          data?: {
            id: string;
            attributes?: {
              name?: string;
              artistName?: string;
              albumName?: string;
              durationInMillis?: number;
              url?: string;
              previews?: { url?: string }[];
              artwork?: { url?: string };
              genreNames?: string[];
            };
          }[];
        };
      };
    };

    return (payload.results?.songs?.data ?? [])
      .map((song) => {
        const art = song.attributes?.artwork?.url?.replace("{w}x{h}", "1000x1000") ?? null;
        return asCandidate(
          {
            appleTrackId: song.id,
            title: song.attributes?.name ?? "",
            artist: song.attributes?.artistName ?? "",
            album: song.attributes?.albumName ?? null,
            durationMs: song.attributes?.durationInMillis ?? 0,
            previewUrl: song.attributes?.previews?.[0]?.url ?? null,
            artworkUrl: art,
            appleUrl: song.attributes?.url ?? null,
          },
          term,
          term,
          song.attributes?.genreNames?.[0]
        );
      })
      .filter((row): row is ExternalCandidate => Boolean(row));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Search Apple's catalog for songs matching a probe. MusicKit when configured,
 * iTunes otherwise. Failures return an empty list rather than throwing, except
 * a fully-throttled iTunes probe, which throws so the caller can stop burning
 * quota.
 */
export async function searchAppleSongs(
  term: string,
  limit = 20
): Promise<ExternalCandidate[]> {
  if (musicKitConfig().configured) {
    const hits = await searchMusicKit(term, limit);
    if (hits.length) return hits;
  }
  return searchITunes(term, limit);
}

export { RateLimited };
