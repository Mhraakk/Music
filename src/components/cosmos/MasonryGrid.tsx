"use client";

/**
 * MASONRY GRID
 *
 * The browse surface. Wraps the CSS-column masonry defined in `cosmos.css` and
 * connects each tile to the player.
 *
 * Selecting a tile does not enqueue it — it starts a drift from there. The
 * engine takes over once the track ends, so the grid is an entry point into a
 * session rather than a playlist being assembled.
 */

import type { LibraryTrack } from "@/lib/library";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { TrackTile } from "./TrackTile";

/** Sleeves above the fold, roughly, at the widest column count. */
const PRIORITY_COUNT = 10;

export function MasonryGrid({ tracks }: { tracks: LibraryTrack[] }) {
  const { current, playing } = usePlayer();
  const { play } = usePlayerActions();

  if (tracks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="cx-heading">Nothing here</p>
        <p className="cx-body mt-2">
          Every candidate was refused by the engine&apos;s rejection rules, or your search matched
          nothing in the substrate.
        </p>
      </div>
    );
  }

  return (
    <div className="cx-masonry">
      {tracks.map((track, i) => (
        <TrackTile
          key={track.id}
          track={track}
          active={current?.id === track.id}
          playing={current?.id === track.id && playing}
          onSelect={play}
          priority={i < PRIORITY_COUNT}
        />
      ))}
    </div>
  );
}
