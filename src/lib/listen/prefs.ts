/**
 * Listener prefs that should survive a reload: volume and named destination.
 * The engine still owns what follows; this only restores the last stated room
 * and loudness so a refresh does not snap back to the defaults.
 */

import { coordinate, type CoordinateId } from "@/lib/drift/topography";

export const PREFS_KEY = "resonant.prefs.v1";

export type ListenerPrefs = {
  volume: number;
  destination: CoordinateId;
  destinationLocked: boolean;
};

export function parsePrefs(raw: unknown, fallback: ListenerPrefs): ListenerPrefs {
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const volume = typeof row.volume === "number" && Number.isFinite(row.volume) ? Math.max(0, Math.min(1, row.volume)) : fallback.volume;
  const dest = typeof row.destination === "string" ? coordinate(row.destination) : null;
  return {
    volume,
    destination: dest?.id ?? fallback.destination,
    destinationLocked: row.destinationLocked === true,
  };
}

export function loadPrefs(fallback: ListenerPrefs): ListenerPrefs {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    return parsePrefs(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function savePrefs(prefs: ListenerPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode */
  }
}
