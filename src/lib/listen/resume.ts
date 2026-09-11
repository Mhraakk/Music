/**
 * Last-listen snapshot. sessionStorage so a tab refresh can offer tap-to-resume
 * without fighting autoplay policy or leaking across browsers.
 */

import type { LibraryTrack } from "@/lib/library";
import { coordinate, type CoordinateId } from "@/lib/drift/topography";

export const LISTEN_KEY = "resonant.listen.v1";

export type ListenSnapshot = {
  track: LibraryTrack;
  progress: number;
  queue: LibraryTrack[];
  queueTitle: string | null;
  destination: CoordinateId;
  volume: number;
};

function asTrack(raw: unknown): LibraryTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as LibraryTrack;
  if (typeof row.id !== "string" || !row.id) return null;
  if (typeof row.title !== "string" || typeof row.artist !== "string") return null;
  if (!row.vector || typeof row.region !== "string") return null;
  return row;
}

export function parseSnapshot(raw: unknown): ListenSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const track = asTrack(row.track);
  if (!track) return null;
  const dest = typeof row.destination === "string" ? coordinate(row.destination) : null;
  const progress = typeof row.progress === "number" && Number.isFinite(row.progress) ? Math.max(0, Math.min(0.99, row.progress)) : 0;
  const volume = typeof row.volume === "number" && Number.isFinite(row.volume) ? Math.max(0, Math.min(1, row.volume)) : 0.8;
  const queue = Array.isArray(row.queue) ? row.queue.map(asTrack).filter((t): t is LibraryTrack => Boolean(t)) : [];
  const queueTitle = typeof row.queueTitle === "string" && row.queueTitle.trim() ? row.queueTitle : null;
  return {
    track,
    progress,
    queue,
    queueTitle,
    destination: dest?.id ?? track.region,
    volume,
  };
}

export function loadSnapshot(): ListenSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LISTEN_KEY);
    if (!raw) return null;
    return parseSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: ListenSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LISTEN_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

export function clearSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LISTEN_KEY);
  } catch {
    /* ignore */
  }
}
