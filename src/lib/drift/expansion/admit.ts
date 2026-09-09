/**
 * ADMISSION
 *
 * Project a candidate, run the rejection rules, and — only if it survives —
 * materialise a DriftTrack and its media. This is the only door from Apple's
 * catalog into the substrate.
 */

import {
  describeVector,
  evaluateRejections,
  resonanceScore,
} from "@/lib/drift/ontology";
import { nearestCoordinate } from "@/lib/drift/topography";
import type { DriftTrack } from "@/lib/drift/catalog";
import type { TrackMedia } from "@/lib/media";
import { fallbackColor, hexToRgb, rgbToHsl } from "@/lib/media";
import {
  chartGravityFor,
  isUnprojectable,
  projectCandidate,
} from "./project";
import type { Admission, AudioFeatures, ExternalCandidate } from "./types";

export type MaterializeFn = (input: {
  id: string;
  title: string;
  artist: string;
  duration: number;
  vector: DriftTrack["vector"];
  chartGravity: number;
  note: string;
  appleMusicId?: string | null;
}) => DriftTrack;

export function mediaFromCandidate(candidate: ExternalCandidate, vector: DriftTrack["vector"]): TrackMedia {
  const tint = fallbackColor(vector);
  const hsl = rgbToHsl(hexToRgb(tint));
  return {
    artworkUrl: candidate.artworkUrl,
    thumbUrl: candidate.thumbUrl ?? candidate.artworkUrl,
    previewUrl: candidate.previewUrl,
    appleTrackId: Number.parseInt(candidate.appleTrackId, 10) || null,
    appleUrl: candidate.appleUrl,
    resolvedArtist: candidate.artist,
    resolvedTitle: candidate.title,
    resolvedAlbum: candidate.album,
    durationMs: candidate.durationMs,
    searchColor: tint,
    searchHsl: hsl,
    averageColor: tint,
    palette: [tint],
    isDark: hsl.l < 0.42,
    letterboxed: false,
  };
}

export function admitCandidate(
  candidate: ExternalCandidate,
  ctx: {
    pool: readonly DriftTrack[];
    build: MaterializeFn;
    features?: AudioFeatures | null;
    idPrefix?: "h" | "x";
  }
): Admission | null {
  if (isUnprojectable(candidate)) return null;

  const projection = projectCandidate(candidate, ctx.pool, ctx.features ?? null);
  const chartGravity = chartGravityFor(candidate);
  const verdict = evaluateRejections(projection.vector, chartGravity);
  if (verdict.rejected) return null;
  if (resonanceScore(projection.vector, chartGravity) <= 0) return null;

  const duration = candidate.durationMs > 0 ? Math.round(candidate.durationMs / 1000) : 240;
  const near = projection.neighborhood.label;
  const track = ctx.build({
    id: `${ctx.idPrefix ?? "h"}-${candidate.appleTrackId}`,
    title: candidate.title,
    artist: candidate.artist,
    duration,
    vector: projection.vector,
    chartGravity,
    note: `Near ${near} — ${describeVector(projection.vector)}`,
    appleMusicId: candidate.appleTrackId,
  });

  // A second gate: materialise computes resonance from the same rules, but a
  // future change to `build` must not be able to sneak a refused track through.
  if (track.resonance <= 0) return null;

  return {
    track,
    media: mediaFromCandidate(candidate, projection.vector),
    projection: projection.method,
  };
}

export function alreadyKnown(
  candidate: ExternalCandidate,
  known: { id: string; title: string; artist: string }[]
): boolean {
  const idHit = known.some(
    (t) => t.id === `h-${candidate.appleTrackId}` || t.id === `x-${candidate.appleTrackId}`
  );
  if (idHit) return true;

  const title = candidate.title.trim().toLowerCase();
  const artist = candidate.artist.trim().toLowerCase();
  return known.some(
    (t) => t.title.trim().toLowerCase() === title && t.artist.trim().toLowerCase() === artist
  );
}

/** Rank admitted positions and pick `limit` with artist and region diversity. */
export function pickDiverse(admitted: Admission[], limit: number, seed = "expand"): Admission[] {
  const usedArtists = new Set<string>();
  const usedRegions = new Map<string, number>();
  const chosen: Admission[] = [];

  for (const item of admitted) {
    if (chosen.length >= limit) break;
    const artist = item.track.artist.toLowerCase();
    if (usedArtists.has(artist)) continue;
    if (chosen.some((c) => c.track.title.toLowerCase() === item.track.title.toLowerCase())) continue;
    const regionCount = usedRegions.get(item.track.region) ?? 0;
    if (regionCount >= 4) continue;
    usedArtists.add(artist);
    usedRegions.set(item.track.region, regionCount + 1);
    chosen.push(item);
  }

  if (chosen.length < limit) {
    for (const item of admitted) {
      if (chosen.length >= limit) break;
      if (chosen.some((c) => c.track.id === item.track.id)) continue;
      const artist = item.track.artist.toLowerCase();
      const title = item.track.title.toLowerCase();
      if (usedArtists.has(artist)) continue;
      if (chosen.some((c) => c.track.title.toLowerCase() === title)) continue;
      usedArtists.add(artist);
      chosen.push(item);
    }
  }

  if (chosen.length < limit) {
    const second = new Set<string>();
    for (const item of admitted) {
      if (chosen.length >= limit) break;
      if (chosen.some((c) => c.track.id === item.track.id)) continue;
      if (chosen.some((c) => c.track.title.toLowerCase() === item.track.title.toLowerCase())) continue;
      const artist = item.track.artist.toLowerCase();
      if (second.has(artist)) continue;
      second.add(artist);
      chosen.push(item);
    }
  }

  void seed;
  return chosen.slice(0, limit);
}
