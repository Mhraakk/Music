/**
 * Deterministic rotation so a refresh with a new seed is actually new,
 * without Math.random in the harvest path.
 */

import { adjacentCoordinates, TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  let a = (Math.abs(seed) || 1) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    const j = a % (i + 1);
    const swap = out[i];
    out[i] = out[j]!;
    out[j] = swap!;
  }
  return out;
}

export function rotate<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return items.slice();
  const start = Math.abs(seed) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

export function parseIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export function nextOpenRoom(room: CoordinateId, refused: ReadonlySet<string>): CoordinateId {
  if (!refused.has(room)) return room;
  const next = adjacentCoordinates(room, TOPOGRAPHY.length - 1).find((c) => !refused.has(c.id));
  return next?.id ?? room;
}
