"use client";

import type { LibraryTrack } from "@/lib/library";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { RefuseGlyph } from "./icons";

export function DislikeControl({
  track,
  label = "Not this recording or mood",
}: {
  track?: LibraryTrack | null;
  label?: string;
}) {
  const { dislikedIds } = usePlayer();
  const { toggleDislike } = usePlayerActions();
  const refused = Boolean(track && dislikedIds.includes(track.id));

  return (
    <button
      type="button"
      className="cx-window-ctrl"
      data-kind="refuse"
      aria-label={refused ? "Refused" : label}
      aria-pressed={refused}
      disabled={!track}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (track) toggleDislike(track);
      }}
    >
      <RefuseGlyph />
    </button>
  );
}
