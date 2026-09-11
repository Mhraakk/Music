"use client";

import { memo } from "react";
import type { LibraryTrack } from "@/lib/library";
import { useNowPlaying, usePlayerActions, useTaste } from "@/context/PlayerContext";
import { TrackTile } from "./TrackTile";

const PRIORITY_COUNT = 10;

export const MasonryGrid = memo(function MasonryGrid({
  tracks,
  size = "md",
}: {
  tracks: LibraryTrack[];
  size?: "md" | "lg";
}) {
  const { currentId, playing } = useNowPlaying();
  const { likedIds } = useTaste();
  const { play } = usePlayerActions();

  if (tracks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="cx-heading">No songs here</p>
        <p className="cx-body mt-2">Nothing matched. Try another search, or pick a station.</p>
      </div>
    );
  }

  return (
    <div className={size === "lg" ? "cx-hero-row" : "cx-album-grid"}>
      {tracks.map((track, i) => (
        <TrackTile
          key={track.id}
          track={track}
          size={size}
          active={currentId === track.id}
          playing={currentId === track.id && playing}
          liked={likedIds.includes(track.id)}
          onSelect={play}
          priority={i < PRIORITY_COUNT}
        />
      ))}
    </div>
  );
});

export const AlbumRow = memo(function AlbumRow({ tracks, size = "md" }: { tracks: LibraryTrack[]; size?: "md" | "lg" }) {
  const { currentId, playing } = useNowPlaying();
  const { likedIds } = useTaste();
  const { play } = usePlayerActions();

  if (tracks.length === 0) return null;

  return (
    <div className="cx-rail">
      {tracks.map((track, i) => (
        <div key={track.id} className="w-[148px] md:w-[168px]">
          <TrackTile
            track={track}
            size={size}
            active={currentId === track.id}
            playing={currentId === track.id && playing}
            liked={likedIds.includes(track.id)}
            onSelect={play}
            priority={i < 6}
          />
        </div>
      ))}
    </div>
  );
});

