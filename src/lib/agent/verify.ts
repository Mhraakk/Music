/**
 * Verification gate — anti-hallucination for RESONANT agent outputs.
 */
import { TRACKS, type Track } from "@/lib/tracks";

const byId = new Map(TRACKS.map((t) => [t.id, t]));
const byKey = new Map(
  TRACKS.map((t) => [`${t.artist.toLowerCase().trim()}::${t.title.toLowerCase().trim()}`, t])
);

export type VerifiedTrackRef = {
  id: string; title: string; artist: string; verified: true; source: "local-catalog";
};

export function verifyTrackId(id: string | undefined | null): Track | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function verifyArtistTitle(artist: string, title: string): Track | null {
  return byKey.get(`${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`) ?? null;
}

export function verifyTrackList<T extends { id: string }>(items: T[]): { verified: T[]; dropped: string[] } {
  const verified: T[] = [];
  const dropped: string[] = [];
  for (const item of items) {
    if (byId.has(item.id)) verified.push(item);
    else dropped.push(item.id);
  }
  return { verified, dropped };
}

export function toVerifiedRef(t: Track): VerifiedTrackRef {
  return { id: t.id, title: t.title, artist: t.artist, verified: true, source: "local-catalog" };
}

export function catalogIntegrity(): { ok: boolean; size: number; uniqueIds: number; duplicateIds: string[] } {
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const t of TRACKS) {
    if (seen.has(t.id)) duplicateIds.push(t.id);
    seen.add(t.id);
  }
  return { ok: TRACKS.length > 0 && duplicateIds.length === 0, size: TRACKS.length, uniqueIds: seen.size, duplicateIds };
}
