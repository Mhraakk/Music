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
import { admissiblePool, catalogStats, type DriftTrack } from "@/lib/drift/catalog";
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
  /** `seed` is authored; `harvest` came from Apple at build time; `expansion` was generated this session; `favorite` is from the listener's Apple Music Favorite Songs. */
  origin: "seed" | "harvest" | "expansion" | "favorite";
  /** Where Ask found this recording. Absent on shelf tracks. */
  foundVia?: "deezer" | "youtube" | "youtube_music" | "soundcloud" | "apple";
  /** Outbound page on that service. */
  openUrl?: string | null;
  /** Official music video / trailer on YouTube, when we resolved one. */
  videoId?: string | null;
  videoUrl?: string | null;
  /** Outbound service pages resolved for this recording. Never invented. */
  spotifyUrl?: string | null;
  youtubeMusicUrl?: string | null;
  soundcloudUrl?: string | null;
  /** Public search page on a named 网易/QQ/酷狗/酷我 catalog. Never an in-app stream. */
  metingUrl?: string | null;
  metingPlatform?: "netease" | "tencent" | "kugou" | "kuwo" | null;
  metingLabel?: string | null;
};

function aspectFor(track: DriftTrack, media: TrackMedia | null): number {
  /**
   * Letterboxed artwork must stay square. A fair amount of Apple artwork is a
   * non-square photograph padded to square with solid black or white bars;
   * cropping that into a taller tile keeps the bars and reads as a broken image
   * rather than as a sleeve. At 1:1 the bars are simply part of the cover, which
   * is what the label intended.
   */
  if (media?.letterboxed) return 1;

  // Otherwise, cinematic and spacious positions get taller crops while tight
  // intimate ones stay square, so the columns have some rhythm instead of
  // reading as a spreadsheet. Deterministic, so the grid never reshuffles.
  const cinematic = cinematicMagnitude(track.csv);
  if (cinematic > 0.72) return 1.34;
  if (cinematic > 0.6) return 1.18;
  if (track.vector.fragility > 0.72) return 1.1;
  return 1;
}

function originFor(id: string): LibraryTrack["origin"] {
  if (id.startsWith("x-") || id.startsWith("w-")) return "expansion";
  if (id.startsWith("h-")) return "harvest";
  if (id.startsWith("f-")) return "favorite";
  return "seed";
}

/** Authored + harvest + session expansions. Favorites circulate from the client. */
function engineLibrary(): LibraryTrack[] {
  return library().filter((t) => t.origin !== "favorite");
}

export function toLibraryTrack(track: DriftTrack, mediaOverride?: TrackMedia | null): LibraryTrack {
  const media: TrackMedia | null = mediaOverride === undefined ? trackMedia(track.id) : mediaOverride;
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
    aspect: aspectFor(track, media),
    origin: originFor(track.id),
  };
}

let cache: LibraryTrack[] | null = null;

/** Every admissible position, media-joined. Rejected material never appears. */
export function library(): LibraryTrack[] {
  if (!cache) cache = admissiblePool().map((track) => toLibraryTrack(track));
  return cache;
}

/** Drop the memo after the living catalog changes. */
export function refreshLibrary(): LibraryTrack[] {
  cache = null;
  return library();
}

export function libraryStats() {
  return catalogStats();
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
        [track.shape.toLowerCase(), 2],
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
  const all = engineLibrary();

  return TOPOGRAPHY.map((coordinate) => {
    const ranked = all
      .map((track) => ({ track, d: emotionalDistance(track.vector, coordinate.vector) }))
      .sort((a, b) => a.d - b.d)
      .filter((x) => x.d < 0.34)
      .map((x) => x.track);

    // Never ship an empty shelf: if the radius is too tight for a sparse
    // region, fall back to its nearest positions regardless of distance.
    const tracks = (ranked.length >= 6 ? ranked : all
      .map((track) => ({ track, d: emotionalDistance(track.vector, coordinate.vector) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map((x) => x.track)
    ).slice(0, 48);

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
  const all = engineLibrary();
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
export function featured(limit = 48, offset = 0): LibraryTrack[] {
  return engineLibrary()
    .slice()
    .sort((a, b) => b.avi - a.avi)
    .slice(offset, offset + limit);
}

export type CatalogQuery = {
  q?: string;
  color?: string;
  ids?: string[];
  limit?: number;
  offset?: number;
};

export type CatalogPage = {
  tracks: LibraryTrack[];
  total: number;
  mode: "featured" | "text" | "color" | "ids";
};

/**
 * One read model for the catalog API and the discover surface. Search ranks
 * the living catalog; featured is vulnerability-first, never popularity.
 */
export function queryCatalog(input: CatalogQuery): CatalogPage {
  const limit = Math.max(1, Math.min(120, input.limit ?? 72));
  const offset = Math.max(0, input.offset ?? 0);

  if (input.ids?.length) {
    const tracks = input.ids
      .slice(0, 40)
      .map((id) => libraryTrack(id))
      .filter((t): t is LibraryTrack => Boolean(t));
    return { tracks, total: tracks.length, mode: "ids" };
  }

  if (input.color) {
    const ranked = searchByColor(input.color, 240).map((x) => x.track);
    return {
      tracks: ranked.slice(offset, offset + limit),
      total: ranked.length,
      mode: "color",
    };
  }

  if (input.q?.trim()) {
    const ranked = searchByText(input.q, 240);
    return {
      tracks: ranked.slice(offset, offset + limit),
      total: ranked.length,
      mode: "text",
    };
  }

  const total = engineLibrary().length;
  return { tracks: featured(limit, offset), total, mode: "featured" };
}
