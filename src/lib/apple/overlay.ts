/**
 * Compact Favorite Songs overlay for a single drift decision.
 *
 * Serverless extras do not keep the listener's tens of thousands of loved
 * recordings. The browser sends the circulating window with each next-phase
 * request so the engine can occupy those positions this step, then the client
 * resolves artwork and preview from IndexedDB.
 */

import { ingestTracks, materializeTrack, type DriftTrack } from "@/lib/drift/catalog";
import { refreshLibrary } from "@/lib/library";
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
  for (const row of raw.slice(0, 64)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const title = typeof r.title === "string" ? r.title : "";
    const artist = typeof r.artist === "string" ? r.artist : "";
    const vector = asVector(r.vector);
    if (!id.startsWith("f-") || !title || !artist || !vector) continue;
    out.push({
      id,
      title,
      artist,
      duration: typeof r.duration === "number" && r.duration > 0 ? r.duration : 240,
      vector,
      note: typeof r.note === "string" ? r.note : undefined,
      appleMusicId: typeof r.appleMusicId === "string" ? r.appleMusicId : id.slice(2),
    });
  }
  return out;
}

export function ingestFavoriteOverlay(rows: FavoriteOverlay[]): number {
  if (!rows.length) return 0;
  const tracks: DriftTrack[] = rows.map((row) =>
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
  );
  const added = ingestTracks(tracks.filter((t) => t.resonance > 0));
  if (added) refreshLibrary();
  return added;
}
