"use client";

import type { LibraryTrack } from "@/lib/library";
import { usePlayerActions } from "@/context/PlayerContext";
import { PlayIcon } from "./icons";

export function PlayAll({ track, label = "Play" }: { track: LibraryTrack | null | undefined; label?: string }) {
  const { play } = usePlayerActions();
  if (!track) return null;
  return (
    <button type="button" className="cx-pill cx-pill-dark" onClick={() => play(track)}>
      <PlayIcon size={12} />
      {label}
    </button>
  );
}
