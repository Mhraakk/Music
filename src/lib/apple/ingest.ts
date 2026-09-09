/**
 * Admit a page of Favorite Songs into the living catalog.
 *
 * Apple is retrieval. The ontology still owns the door: each recording is
 * projected, rejected if it fails the rules, and only then allowed to circulate.
 */

import { ingestTracks, livingCatalog, materializeTrack } from "@/lib/drift/catalog";
import { overlayMedia } from "@/lib/media";
import { refreshLibrary, toLibraryTrack, type LibraryTrack } from "@/lib/library";
import { admitCandidate, alreadyKnown } from "@/lib/drift/expansion/admit";
import { lookupAppleSong } from "@/lib/drift/expansion/itunes";
import type { ExternalCandidate } from "@/lib/drift/expansion/types";

const FILL_CONCURRENCY = 4;

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function fillMedia(candidate: ExternalCandidate): Promise<ExternalCandidate> {
  if (candidate.previewUrl && candidate.artworkUrl) return candidate;
  const found = await lookupAppleSong(candidate.artist, candidate.title);
  if (!found) return candidate;
  return {
    ...candidate,
    appleTrackId: candidate.appleTrackId || found.appleTrackId,
    previewUrl: candidate.previewUrl ?? found.previewUrl,
    artworkUrl: candidate.artworkUrl ?? found.artworkUrl,
    thumbUrl: candidate.thumbUrl ?? found.thumbUrl,
    appleUrl: candidate.appleUrl ?? found.appleUrl,
    album: candidate.album ?? found.album,
    durationMs: candidate.durationMs || found.durationMs,
  };
}

export type FavoriteIngestResult = {
  tracks: LibraryTrack[];
  considered: number;
  admitted: number;
  refused: number;
  skipped: number;
};

export async function ingestFavoriteCandidates(
  incoming: ExternalCandidate[]
): Promise<FavoriteIngestResult> {
  const pool = livingCatalog();
  const known = pool.map((t) => ({ id: t.id, title: t.title, artist: t.artist }));

  const unique: ExternalCandidate[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const row of incoming) {
    if (!row.title || !row.artist) {
      skipped += 1;
      continue;
    }
    const key = row.appleTrackId || `${row.artist.toLowerCase()}::${row.title.toLowerCase()}`;
    if (seen.has(key) || alreadyKnown(row, known)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  const filled = await mapLimit(unique, FILL_CONCURRENCY, fillMedia);

  const tracks: LibraryTrack[] = [];
  let refused = 0;
  for (const candidate of filled) {
    if (!candidate.artworkUrl && !candidate.previewUrl) {
      refused += 1;
      continue;
    }
    const admission = admitCandidate(candidate, {
      pool,
      build: materializeTrack,
      idPrefix: "f",
    });
    if (!admission) {
      refused += 1;
      continue;
    }
    ingestTracks([admission.track]);
    overlayMedia(admission.track.id, admission.media);
    pool.push(admission.track);
    known.push({ id: admission.track.id, title: admission.track.title, artist: admission.track.artist });
    tracks.push(toLibraryTrack(admission.track));
  }

  if (tracks.length) refreshLibrary();

  return {
    tracks,
    considered: incoming.length,
    admitted: tracks.length,
    refused,
    skipped,
  };
}
