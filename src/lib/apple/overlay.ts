/**
 * Compact Favorite Songs overlay for a single drift decision.
 *
 * Serverless extras must not keep a listener's loved recordings — that would
 * leak one person's library into the next request on a warm instance. The
 * browser sends the circulating window with each next-phase call; these
 * positions exist only for that decision.
 */

import { materializeTrack, type DriftTrack } from "@/lib/drift/catalog";
import { AXIS_KEYS, vec, type EmotionalVector } from "@/lib/drift/ontology";

export type FavoriteOverlay = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  vector: EmotionalVector;
  note?: string;
  appleMusicId?: string | null;
};

function asVector(raw: unknown): EmotionalVector | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const partial: Partial<EmotionalVector> = {};
  let seen = 0;
  for (const key of AXIS_KEYS) {
    const n = rec[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      partial[key] = n;
      seen += 1;
    }
  }
  return seen >= 3 ? vec(partial) : null;
}

export function parseFavoriteOverlay(raw: unknown): FavoriteOverlay[] {
  if (!Array.isArray(raw)) return [];
  const out: FavoriteOverlay[] = [];
  for (const row of raw.slice(0, 80)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const title = typeof r.title === "string" ? r.title : "";
    const artist = typeof r.artist === "string" ? r.artist : "";
    const vector = asVector(r.vector);
    const note = typeof r.note === "string" ? r.note : undefined;
    const loved = Boolean(note && note.includes("Loved on Resonant"));
    const favoriteId = /^(f-|l-|w-)/.test(id);
    const lovedCatalog = loved && /^(h-|x-|a-)/.test(id);
    if ((!favoriteId && !lovedCatalog && !loved) || !title || !artist || !vector) continue;
    out.push({
      id,
      title,
      artist,
      duration: typeof r.duration === "number" && r.duration > 0 ? r.duration : 240,
      vector,
      note,
      appleMusicId:
        typeof r.appleMusicId === "string"
          ? r.appleMusicId
          : id.startsWith("f-")
            ? id.slice(2)
            : id.startsWith("w-it-")
              ? id.slice(5)
              : null,
    });
  }
  return out;
}

export function materializeFavoriteOverlay(rows: FavoriteOverlay[]): DriftTrack[] {
  return rows
    .map((row) =>
      materializeTrack({
        id: row.id,
        title: row.title,
        artist: row.artist,
        duration: row.duration,
        vector: row.vector,
        chartGravity: 0.12,
        note: row.note ?? "From Favorite Songs",
        appleMusicId: row.appleMusicId ?? null,
      })
    )
    .filter((t) => t.resonance > 0);
}
