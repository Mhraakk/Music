"use client";

import type { LibraryTrack } from "@/lib/library";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { HeartGlyph } from "./icons";

export function LoveControl({
  track,
  label = "Love this recording",
}: {
  track?: LibraryTrack | null;
  label?: string;
}) {
  const { likedIds } = usePlayer();
  const { toggleLike } = usePlayerActions();
  const liked = Boolean(track && likedIds.includes(track.id));

  return (
    <button
      type="button"
      className="cx-window-ctrl"
      aria-label={liked ? "Loved" : label}
      aria-pressed={liked}
      disabled={!track}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (track) toggleLike(track);
      }}
    >
      <HeartGlyph filled={liked} />
    </button>
  );
}
