/**
 * THE LIBRARY
 *
 * Joins the de-genred catalog to its resolved media and exposes the read models
 * the visual surface needs: a browsable grid, colour search, text search,
 * collections and curators.
 *
 * Everything here is derived. There are no hand-written collections and no
 * invented user accounts — a collection is a region of the emotional
 * topography, and a curator is one of the engine's aesthetic anchors with the
 * positions that actually sit closest to it. That keeps the surface honest: if
 * the substrate changes, the shelves change with it.
 */

import {
  acousticVulnerability,
  anchorAlignment,
  cinematicMagnitude,
  describeVector,
  emotionalDistance,
  AESTHETIC_ANCHORS,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import { admissiblePool, type DriftTrack } from "@/lib/drift/catalog";
import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";
import {
  colorDistance,
  fallbackColor,
  hexToRgb,
  rgbToHsl,
  trackMedia,
  type Hsl,
  type TrackMedia,
} from "@/lib/media";

export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  /** Artwork, or null when no provider had it. */
  artworkUrl: string | null;
  thumbUrl: string | null;
  previewUrl: string | null;
  appleUrl: string | null;
  /** Flat colour used behind the artwork while it loads, and instead of it if absent. */
  tint: string;
  searchColor: string;
  searchHsl: Hsl;
  isDark: boolean;
  region: CoordinateId;
  vector: EmotionalVector;
  avi: number;
  cinematic: number;
  shape: string;
  note: string;
  /**
   * Tile aspect for the masonry grid. Album art is square, so a grid of pure
   * squares would read as a spreadsheet; varying the crop by emotional
   * character gives the column rhythm that makes this kind of grid feel alive.
   */
  aspect: number;
};

function aspectFor(track: DriftTrack): number {
  // Cinematic, spacious positions get taller crops; tight intimate ones stay
  // square. Deterministic, so the grid does not reshuffle between renders.
  const cinematic = cinematicMagnitude(track.csv);
  if (cinematic > 0.72) return 1.34;
  if (cinematic > 0.6) return 1.18;
  if (track.vector.fragility > 0.72) return 1.1;
  return 1;
}

function toLibraryTrack(track: DriftTrack): LibraryTrack {
  const media: TrackMedia | null = trackMedia(track.id);
  const tint = media?.averageColor ?? fallbackColor(track.vector);
  const searchColor = media?.searchColor ?? tint;

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: media?.resolvedAlbum ?? null,
    duration: media?.durationMs ? Math.round(media.durationMs / 1000) : track.duration,
    artworkUrl: media?.artworkUrl ?? null,
    thumbUrl: media?.thumbUrl ?? media?.artworkUrl ?? null,
    previewUrl: media?.previewUrl ?? null,
    appleUrl: media?.appleUrl ?? null,
    tint,
    searchColor,
    searchHsl: media?.searchHsl ?? rgbToHsl(hexToRgb(searchColor)),
    isDark: media?.isDark ?? true,
    region: track.region,
    vector: track.vector,
    avi: track.avi,
    cinematic: cinematicMagnitude(track.csv),
    shape: describeVector(track.vector),
    note: track.note,
    aspect: aspectFor(track),
  };
}

let cache: LibraryTrack[] | null = null;

/** Every admissible position, media-joined. Rejected material never appears. */
export function library(): LibraryTrack[] {
  if (!cache) cache = admissiblePool().map(toLibraryTrack);
  return cache;
}

export function libraryTrack(id: string): LibraryTrack | null {
  return library().find((t) => t.id === id) ?? null;
}

/* ─────────────────────────────── colour search ─────────────────────────────── */

export type ColorMatch = { track: LibraryTrack; distance: number };

/**
 * The signature interaction: pick a colour, get the catalog ranked by how close
 * each sleeve is to it. Ranking rather than filtering, because a hard threshold
 * on an obscure hue returns an empty grid, which reads as a broken feature.
 */
export function searchByColor(hex: string, limit = 48): ColorMatch[] {
  const target = rgbToHsl(hexToRgb(hex));
  return library()
    .map((track) => ({ track, distance: colorDistance(target, track.searchHsl) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/* ──────────────────────────────── text search ──────────────────────────────── */

/**
 * Searches what the ontology actually holds: artist, title, album, the region
 * name and the engine's own description of the emotional shape. There is no
 * genre index to search, so "warm" and "fragile" are first-class queries in a
 * way that "deep house" deliberately is not.
 */
export function searchByText(query: string, limit = 48): LibraryTrack[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  return library()
    .map((track) => {
      const haystacks: [string, number][] = [
        [track.title.toLowerCase(), 4],
        [track.artist.toLowerCase(), 4],
        [(track.album ?? "").toLowerCase(), 2],
        [track.region.replace(/_/g, " "), 2.5],
        [track.shape, 2],
        [track.note.toLowerCase(), 1],
      ];
      let score = 0;
      for (const term of terms) {
        for (const [text, weight] of haystacks) {
          if (!text) continue;
          if (text === term) score += weight * 2;
          else if (text.startsWith(term)) score += weight * 1.4;
          else if (text.includes(term)) score += weight;
        }
      }
      return { track, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.track);
}

/* ──────────────────────────────── collections ──────────────────────────────── */

export type Collection = {
  id: CoordinateId;
  title: string;
  description: string;
  shape: string;
  count: number;
  /** Cover mosaic — the four closest positions to the region's centre. */
  covers: LibraryTrack[];
  tracks: LibraryTrack[];
  tint: string;
  avi: number;
};

/**
 * One collection per region of the topography. Membership is by proximity to
 * the region's centre rather than by nearest-region assignment, so a position
 * can legitimately appear in two neighbouring collections — which is true of
 * the music and useful for browsing.
 */
export function collections(): Collection[] {
  const all = library();

  return TOPOGRAPHY.map((coordinate) => {
    const ranked = all
      .map((track) => ({ track, d: emotionalDistance(track.vector, coordinate.vector) }))
      .sort((a, b) => a.d - b.d)
      .filter((x) => x.d < 0.34)
      .map((x) => x.track);

    // Never ship an empty shelf: if the radius is too tight for a sparse
    // region, fall back to its nearest positions regardless of distance.
    const tracks = ranked.length >= 6 ? ranked : all
      .map((track) => ({ track, d: emotionalDistance(track.vector, coordinate.vector) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map((x) => x.track);

    return {
      id: coordinate.id,
      title: coordinate.label,
      description: coordinate.description,
      shape: describeVector(coordinate.vector),
      count: tracks.length,
      covers: tracks.slice(0, 4),
      tracks,
      tint: tracks[0]?.tint ?? "#141210",
      avi: acousticVulnerability(coordinate.vector),
    };
  });
}

export function collection(id: string): Collection | null {
  return collections().find((c) => c.id === id) ?? null;
}

/* ───────────────────────────────── curators ───────────────────────────────── */

export type Curator = {
  slug: string;
  name: string;
  /** The anchor's note, used as a bio. */
  bio: string;
  shape: string;
  /** Positions whose nearest anchor is this one. */
  tracks: LibraryTrack[];
  covers: LibraryTrack[];
  /** Regions this anchor's material falls across. */
  regions: CoordinateId[];
  tint: string;
};

export function curatorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * A curator is an aesthetic anchor — a calibration position in the substrate —
 * presented as a profile, with the catalog positions for which it is the
 * nearest anchor. Nothing here is invented: no follower counts, no fake
 * accounts, no editorial copy that the engine cannot justify.
 */
export function curators(): Curator[] {
  const all = library();
  const byAnchor = new Map<string, LibraryTrack[]>();

  for (const track of all) {
    const nearest = anchorAlignment(track.vector).nearest;
    const bucket = byAnchor.get(nearest);
    if (bucket) bucket.push(track);
    else byAnchor.set(nearest, [track]);
  }

  return AESTHETIC_ANCHORS.map((anchor) => {
    const tracks = (byAnchor.get(anchor.name) ?? [])
      .slice()
      .sort((a, b) => emotionalDistance(a.vector, anchor.vector) - emotionalDistance(b.vector, anchor.vector));

    return {
      slug: curatorSlug(anchor.name),
      name: anchor.name,
      bio: anchor.note,
      shape: describeVector(anchor.vector),
      tracks,
      covers: tracks.slice(0, 3),
      regions: [...new Set(tracks.map((t) => t.region))],
      tint: tracks[0]?.tint ?? "#141210",
    };
  }).filter((c) => c.tracks.length > 0);
}

export function curator(slug: string): Curator | null {
  return curators().find((c) => c.slug === slug) ?? null;
}

/* ───────────────────────────────── shelves ───────────────────────────────── */

/**
 * The default grid ordering. Sorted by vulnerability rather than by any notion
 * of popularity, which the ontology does not store — the most audibly human
 * material surfaces first.
 */
export function featured(limit = 48): LibraryTrack[] {
  return library()
    .slice()
    .sort((a, b) => b.avi - a.avi)
    .slice(0, limit);
}
