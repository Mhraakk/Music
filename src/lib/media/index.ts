/**
 * CATALOG MEDIA
 *
 * Real album artwork, 30-second previews and artwork-derived colours for every
 * position in the catalog, resolved at build time by `scripts/resolve-media.mjs`
 * and committed as JSON.
 *
 * WHY IT IS PRECOMPUTED
 *
 * The interface is image-led, so artwork is not decoration — it is the primary
 * content, and it has to be present in the first paint of a server-rendered
 * grid. Resolving 65 lookups per request is not viable, and the upstream
 * catalog's own `coverUrl` fields were placeholders: 13 URLs shared across 60
 * tracks, 40 of which 404'd.
 *
 * It also means the app plays audio with no credentials at all. Apple MusicKit
 * and SoundCloud remain the high-fidelity paths, but the iTunes preview is the
 * floor, and the floor is no longer silence.
 */

import raw from "./catalog-media.json";
import type { EmotionalVector } from "@/lib/drift/ontology";

export type TrackMedia = {
  artworkUrl: string | null;
  thumbUrl?: string | null;
  previewUrl: string | null;
  appleTrackId?: number | null;
  appleUrl?: string | null;
  resolvedArtist?: string | null;
  resolvedTitle?: string | null;
  resolvedAlbum?: string | null;
  durationMs?: number | null;
  matchScore?: number;
  /** Hex. The colour a person would say the sleeve is — drives colour search. */
  searchColor?: string;
  searchHsl?: { h: number; s: number; l: number };
  /** Hex. Mean colour — drives the ambient wash behind the player. */
  averageColor?: string;
  palette?: string[];
  isDark?: boolean;
  /**
   * True when the sleeve is a non-square image padded to square with solid
   * bars. Such artwork must be rendered at 1:1 — cropping it to a taller tile
   * keeps the bars and reads as a broken image.
   */
  letterboxed?: boolean;
  unresolved?: boolean;
};

type MediaFile = {
  generatedAt: string;
  source: string;
  counts: { positions: number; artwork: number; previews: number };
  media: Record<string, TrackMedia>;
};

const FILE = raw as MediaFile;
const overlay = new Map<string, TrackMedia>();

export const MEDIA_GENERATED_AT = FILE.generatedAt;
export const MEDIA_COUNTS = FILE.counts;

/** Runtime / harvest artwork. Wins over the committed media map. */
export function overlayMedia(id: string, media: TrackMedia): void {
  overlay.set(id, media);
}

export function trackMedia(id: string): TrackMedia | null {
  const live = overlay.get(id);
  if (live?.artworkUrl) return live;
  const entry = FILE.media[id];
  return entry?.artworkUrl ? entry : null;
}

export function hasArtwork(id: string): boolean {
  return Boolean(overlay.get(id)?.artworkUrl || FILE.media[id]?.artworkUrl);
}

export function previewUrl(id: string): string | null {
  return overlay.get(id)?.previewUrl ?? FILE.media[id]?.previewUrl ?? null;
}

/* ────────────────────────────── colour utilities ────────────────────────────── */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

/**
 * Perceptual-ish distance between two colours, in [0,1].
 *
 * Deliberately not Euclidean RGB: for "find me sleeves this colour", hue is
 * what a person is pointing at, and two greys of different lightness feel far
 * closer than red and green of identical lightness.
 *
 * Three terms, and the middle one is the one that matters:
 *
 *  - HUE, compared on the circle, and discounted when either colour is too
 *    desaturated to meaningfully have a hue.
 *  - CHROMA, weighted heavily. Without this, monochrome artwork ranks near the
 *    top of *every* colour search: a colour with no hue is never "wrong" about
 *    hue, so discounting the hue term alone rewards greyscale for being
 *    unfalsifiable. A black-and-white sleeve is genuinely far from an amber
 *    query, and this is the term that says so.
 *  - LIGHTNESS, weighted least, since a lighter and darker version of the same
 *    colour are still recognisably that colour.
 */
export function colorDistance(a: Hsl, b: Hsl): number {
  const hueGap = Math.abs(a.h - b.h);
  const hueDelta = Math.min(hueGap, 360 - hueGap) / 180;
  const bothHaveHue = Math.min(a.s, b.s);

  const hue = hueDelta * (0.18 + bothHaveHue * 0.82) * 0.58;
  const chroma = Math.abs(a.s - b.s) * 0.66;
  const lightness = Math.abs(a.l - b.l) * 0.3;

  return Math.min(1, hue + chroma + lightness);
}

/**
 * Fallback sleeve for the rare position with no artwork. Derived from the
 * emotional vector so it still belongs in the grid rather than reading as a
 * broken image: warmth drives hue, depth drives descent toward black.
 */
export function fallbackColor(v: EmotionalVector): string {
  const luminance = 0.14 + (1 - v.depth) * 0.34;
  const r = Math.round(255 * luminance * (0.6 + v.warmth * 0.8));
  const g = Math.round(255 * luminance * (0.52 + v.warmth * 0.34 + v.narrative * 0.12));
  const b = Math.round(255 * luminance * (0.76 - v.warmth * 0.3 + v.cinema * 0.18));
  const hex = [r, g, b]
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/** A short, stable set of swatches for the colour picker, spanning the catalog. */
export const COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#0b0a0c", label: "Black" },
  { hex: "#54778d", label: "Slate blue" },
  { hex: "#012665", label: "Deep blue" },
  { hex: "#2d726f", label: "Teal" },
  { hex: "#73885a", label: "Moss" },
  { hex: "#d29c69", label: "Sand" },
  { hex: "#e76f3b", label: "Amber" },
  { hex: "#8c1b22", label: "Oxblood" },
  { hex: "#f0eaae", label: "Bone" },
  { hex: "#f6f7f3", label: "White" },
];
