/**
 * Server catalog ranking for Joyful. Safe for Listen Now RSC — no Apple harvest.
 */

import { library, type LibraryTrack } from "@/lib/library";
import { rankJoyful } from "./joyful";
import type { TasteSnapshot, TasteWire } from "./memory";

export function joyfulFromCatalog(
  limit = 12,
  memory?: TasteSnapshot | TasteWire | null,
  excludeIds?: Iterable<string>
): LibraryTrack[] {
  return rankJoyful(
    library().filter((track) => track.origin !== "favorite"),
    { memory, excludeIds, limit }
  );
}
