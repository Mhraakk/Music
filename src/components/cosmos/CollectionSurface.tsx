"use client";

/**
 * COLLECTION SURFACE
 *
 * The minimal client island for a collection or curator page: the grid, the
 * room tint and the now-playing sheet. No search — a collection is already a
 * filtered view, and offering a second filter on top of it would be a
 * needlessly nested mental model.
 */

import type { LibraryTrack } from "@/lib/library";
import { MasonryGrid } from "./MasonryGrid";
import { NowPlayingSheet } from "./NowPlayingSheet";
import { RoomTint } from "./RoomTint";

export function CollectionSurface({ tracks }: { tracks: LibraryTrack[] }) {
  return (
    <>
      <RoomTint />
      <MasonryGrid tracks={tracks} />
      {/* Clearance so the last row is never trapped behind the sheet and nav. */}
      <div className="h-40" aria-hidden />
      <NowPlayingSheet />
    </>
  );
}
