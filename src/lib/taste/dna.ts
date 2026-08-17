/**
 * M3 — Taste DNA
 */
import type { Vec } from "@/lib/tracks";
import type { Compass, FB } from "@/lib/engine";
import { TRACKS, type Track } from "@/lib/tracks";
import { graph, keyOf, emotionalDist } from "@/lib/engine";
import { getSession } from "./session";

export type SkipKind = "instant" | "early" | "late" | "complete";
export type DnaLayer = { attract: Vec; weight: number; sampleCount: number; updatedAt: number };
export type NegativeDna = { artists: Record<string, number>; emotions: Record<string, number>; repel: Vec; strength: number };
export type TasteDNA = { longTerm: DnaLayer; medium: DnaLayer; session: DnaLayer; negative: NegativeDna; skips: { trackId: string; kind: SkipKind; at: number }[]; version: 1 };

const DNA_KEY = "resonant-dna-v1";
const ZERO: Vec = { d: 0.5, w: 0.5, o: 0.5, e: 0.35, m: 0.3, s: 0.45 };

function blendVec(a: Vec, b: Vec, t: number): Vec {
  return { d: a.d*(1-t)+b.d*t, w: a.w*(1-t)+b.w*t, o: a.o*(1-t)+b.o*t, e: a.e*(1-t)+b.e*t, m: a.m*(1-t)+b.m*t, s: a.s*(1-t)+b.s*t };
}
function meanOf(tracks: Track[]): Vec {
  if (!tracks.length) return { ...ZERO };
  const acc = { d:0,w:0,o:0,e:0,m:0,s:0 };
  for (const t of tracks) { acc.d+=t.v.d; acc.w+=t.v.w; acc.o+=t.v.o; acc.e+=t.v.e; acc.m+=t.v.m; acc.s+=t.v.s; }
  const n = tracks.length;
  return { d:acc.d/n, w:acc.w/n, o:acc.o/n, e:acc.e/n, m:acc.m/n, s:acc.s/n };
}
function emptyDna(): TasteDNA {
  const layer = (w: number): DnaLayer => ({ attract: { ...ZERO }, weight: w, sampleCount: 0, updatedAt: 0 });
  return { longTerm: layer(0.5), medium: layer(0.3), session: layer(0.2), negative: { artists: {}, emotions: {}, repel: { ...ZERO }, strength: 0 }, skips: [], version: 1 };
}
function loadDna(): TasteDNA {
  if (typeof window === "undefined") return emptyDna();
  try { const raw = localStorage.getItem(DNA_KEY); if (!raw) return emptyDna(); return { ...emptyDna(), ...JSON.parse(raw) } as TasteDNA; } catch { return emptyDna(); }
}
let dnaCache: TasteDNA | null = null;
export function getTasteDNA(): TasteDNA { if (!dnaCache) dnaCache = loadDna(); return dnaCache; }
function persistDna() { if (typeof window === "undefined" || !dnaCache) return; try { localStorage.setItem(DNA_KEY, JSON.stringify(dnaCache)); } catch { /* */ } }

export function applyDecay(now = Date.now()): TasteDNA {
  const d = getTasteDNA();
  const day = 86400000;
  const medAge = d.medium.updatedAt ? (now - d.medium.updatedAt) / day : 0;
  const longAge = d.longTerm.updatedAt ? (now - d.longTerm.updatedAt) / day : 0;
  if (medAge > 7) { d.medium.attract = blendVec(d.medium.attract, ZERO, Math.min(0.4, medAge / 30)); d.medium.weight = Math.max(0.15, d.medium.weight * 0.95); }
  if (longAge > 90) d.longTerm.attract = blendVec(d.longTerm.attract, ZERO, 0.05);
  persistDna(); return d;
}

export function recomputeDnaFromFeedback(fb: FB): TasteDNA {
  const d = getTasteDNA();
  const liked: Track[] = []; const hated: Track[] = [];
  for (const t of TRACKS) {
    const k = fb[keyOf(t.artist, t.title)]?.kind;
    if (k === "like" || k === "more") liked.push(t);
    if (k === "dislike" || k === "less") hated.push(t);
  }
  if (liked.length) {
    const m = meanOf(liked);
    d.longTerm.attract = blendVec(d.longTerm.attract, m, Math.min(0.35, 0.08 * liked.length));
    d.longTerm.sampleCount += liked.length; d.longTerm.updatedAt = Date.now();
    d.medium.attract = blendVec(d.medium.attract, m, 0.45); d.medium.sampleCount = liked.length; d.medium.updatedAt = Date.now();
  }
  const session = getSession();
  const sessionTracks = session.recentTrackIds.map((id) => TRACKS.find((t) => t.id === id)).filter(Boolean) as Track[];
  if (sessionTracks.length) { d.session.attract = meanOf(sessionTracks); d.session.sampleCount = sessionTracks.length; d.session.updatedAt = Date.now(); }
  const artists: Record<string, number> = {}; const emotions: Record<string, number> = {};
  for (const t of hated) { const a = t.artist.toLowerCase(); artists[a] = Math.min(1, (artists[a] || 0) + 0.35); emotions[t.emotion] = Math.min(1, (emotions[t.emotion] || 0) + 0.25); }
  d.negative.artists = artists; d.negative.emotions = emotions;
  if (hated.length) { d.negative.repel = meanOf(hated); d.negative.strength = Math.min(1, hated.length * 0.2); }
  else d.negative.strength = Math.max(0, d.negative.strength * 0.9);
  persistDna(); return d;
}

export function compositeAttract(fb: FB, compass: Compass): Vec {
  applyDecay(); recomputeDnaFromFeedback(fb);
  const d = getTasteDNA(); const g = graph(fb);
  let v = blendVec(d.longTerm.attract, d.medium.attract, 0.4);
  v = blendVec(v, d.session.attract, 0.25); v = blendVec(v, g.attract, 0.35);
  return { d: v.d*0.55+compass.dark*0.45, w: v.w*0.55+compass.warm*0.45, o: v.o*0.55+compass.organic*0.45, e: v.e*0.55+compass.energy*0.45, m: v.m*0.7, s: v.s*0.55+compass.sad*0.45 };
}

export function negativeDnaPenalty(t: Track): number {
  const d = getTasteDNA(); if (d.negative.strength < 0.05) return 0;
  let p = 0; const a = d.negative.artists[t.artist.toLowerCase()]; if (a) p += a * 2.2;
  const e = d.negative.emotions[t.emotion]; if (e) p += e * 1.1;
  p += emotionalDist(t.v, d.negative.repel) < 0.35 ? d.negative.strength * 1.4 : 0;
  return Math.min(4, p);
}

export function recordSkip(trackId: string, progress: number) {
  const d = getTasteDNA();
  let kind: SkipKind = "complete";
  if (progress < 0.08) kind = "instant"; else if (progress < 0.35) kind = "early"; else if (progress < 0.85) kind = "late";
  d.skips = [{ trackId, kind, at: Date.now() }, ...d.skips].slice(0, 40);
  const t = TRACKS.find((x) => x.id === trackId);
  if (t && (kind === "instant" || kind === "early")) {
    const a = t.artist.toLowerCase();
    d.negative.artists[a] = Math.min(1, (d.negative.artists[a] || 0) + (kind === "instant" ? 0.25 : 0.12));
    d.negative.strength = Math.min(1, d.negative.strength + 0.05);
  }
  persistDna(); return kind;
}

export function dnaSnapshot(fb: FB, compass: Compass) {
  const d = recomputeDnaFromFeedback(fb);
  return {
    longTermSamples: d.longTerm.sampleCount, mediumSamples: d.medium.sampleCount, sessionSamples: d.session.sampleCount,
    negativeStrength: Number(d.negative.strength.toFixed(2)), negativeArtists: Object.keys(d.negative.artists).slice(0, 6),
    recentSkips: d.skips.slice(0, 5), composite: compositeAttract(fb, compass),
  };
}
