/**
 * Server-only Joyful harvest. Do not import from client components.
 */

import { harvestRoom } from "@/lib/converse/live-room";
import type { LibraryTrack } from "@/lib/library";
import { JOYFUL_ROOMS, rankJoyful } from "./joyful";
import type { TasteSnapshot, TasteWire } from "./memory";

export async function harvestJoyful(input: {
  seed?: number;
  limit?: number;
  exclude?: Iterable<string>;
  memory?: TasteSnapshot | TasteWire | null;
}): Promise<LibraryTrack[]> {
  const seed = input.seed ?? Date.now();
  const limit = Math.max(6, Math.min(16, input.limit ?? 8));
  const exclude = new Set(input.exclude ?? []);
  const perRoom = Math.max(3, Math.ceil(limit / JOYFUL_ROOMS.length) + 1);
  const collected: LibraryTrack[] = [];
  const seen = new Set<string>(exclude);

  for (let i = 0; i < JOYFUL_ROOMS.length; i++) {
    const room = JOYFUL_ROOMS[(seed + i) % JOYFUL_ROOMS.length]!;
    const harvested = await harvestRoom(room, seed + i * 17, perRoom, seen);
    for (const track of harvested) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      collected.push(track);
    }
  }

  const ranked = rankJoyful(collected, { memory: input.memory, excludeIds: exclude, limit });
  return ranked.length ? ranked : collected.slice(0, limit);
}
