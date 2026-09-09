/**
 * LIVE ROOM HARVEST
 *
 * Refreshing a map room asks Apple Music again with a rotated probe window
 * so Discover actually brings new recordings.
 */

import type { CoordinateId } from "@/lib/drift/topography";
import type { LibraryTrack } from "@/lib/library";
import { findMusic } from "./anywhere";
import { probesForRoom } from "./probes";

export { ROOM_LIVE_PROBES, probesForRoom } from "./probes";

export async function harvestRoom(
  room: CoordinateId,
  seed = Date.now(),
  limit = 10
): Promise<LibraryTrack[]> {
  const probes = probesForRoom(room, seed);
  const cap = Math.max(6, Math.min(12, limit));
  const seen = new Set<string>();
  const out: LibraryTrack[] = [];

  for (const probe of probes) {
    if (out.length >= cap) break;
    const found = await findMusic(probe, cap, { room, appleOnly: true, attachVideo: false });
    for (const track of found) {
      const key = `${track.artist}::${track.title}`.toLowerCase();
      if (seen.has(key) || seen.has(track.id)) continue;
      seen.add(key);
      seen.add(track.id);
      out.push({ ...track, region: room, note: `Live from Apple Music · ${probe}` });
      if (out.length >= cap) break;
    }
  }

  if (out.length <= 1) return out;
  const offset = Math.abs(seed) % out.length;
  return [...out.slice(offset), ...out.slice(0, offset)];
}
