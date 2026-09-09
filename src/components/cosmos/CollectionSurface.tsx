"use client";

import type { LibraryTrack } from "@/lib/library";
import { MasonryGrid } from "./MasonryGrid";
import { RoomTint } from "./RoomTint";
import { SongList } from "./SongList";

export function CollectionSurface({ tracks }: { tracks: LibraryTrack[] }) {
  const albums = tracks.slice(0, 12);

  return (
    <>
      <RoomTint />
      {albums.length > 0 && (
        <section className="cx-section">
          <h2 className="cx-title mb-4">Albums</h2>
          <MasonryGrid tracks={albums} />
        </section>
      )}
      <section className="cx-section">
        <h2 className="cx-title mb-4">Songs</h2>
        <SongList tracks={tracks} />
      </section>
    </>
  );
}
