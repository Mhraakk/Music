/**
 * LIVE ROOM HARVEST
 *
 * Refreshing a map room asks Apple Music again with a rotated probe window.
 * Each probe yields at most two recordings so a tap is not eight songs by
 * the first artist. Seed + exclude make the next tap a different set.
 */

import type { CoordinateId } from "@/lib/drift/topography";
import type { LibraryTrack } from "@/lib/library";
import { findMusic } from "./anywhere";
import { probesForRoom } from "./probes";

export { ROOM_LIVE_PROBES, probesForRoom } from "./probes";

const PER_PROBE = 2;

export async function harvestRoom(
  room: CoordinateId,
  seed = Date.now(),
  limit = 10,
  exclude: ReadonlySet<string> = new Set()
): Promise<LibraryTrack[]> {
  const probes = probesForRoom(room, seed);
  const want = Math.max(5, Math.min(12, limit));
  const seen = new Set<string>(exclude);
  const out: LibraryTrack[] = [];

  for (let i = 0; i < probes.length; i++) {
    if (out.length >= want) break;
    const probe = probes[i]!;
    const found = await findMusic(probe, 8, {
      room,
      appleOnly: true,
      attachVideo: false,
      artistFocus: true,
    });
    if (!found.length) continue;
    const offset = Math.abs(seed + i * 19) % found.length;
    const rotated = [...found.slice(offset), ...found.slice(0, offset)];
    let took = 0;
    for (const track of rotated) {
      const key = `${track.artist}::${track.title}`.toLowerCase();
      if (seen.has(key) || seen.has(track.id)) continue;
      seen.add(key);
      seen.add(track.id);
      out.push({ ...track, region: room, note: `Live from Apple Music · ${probe}` });
      took += 1;
      if (took >= PER_PROBE || out.length >= want) break;
    }
  }

  return out;
}
