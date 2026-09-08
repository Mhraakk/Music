"use client";

/**
 * ROOM TINT
 *
 * Carries a colour into the page background: the playing sleeve's average
 * colour, or the searched colour when colour search is active, with search
 * winning because it is the more deliberate act.
 *
 * `cosmos.css` consumes `--tint` and `--tint-strength` as a single flat layer
 * over the paper. Strength is kept low — the room should take on a cast, not
 * become the colour, or the artwork it sits behind loses its own identity.
 *
 * Renders nothing. Making the layout a client component so it could hold this
 * in state would drag the whole page out of RSC for two custom properties.
 */

import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { hexToRgb } from "@/lib/media";

/** Playing tint is a suggestion; a searched colour is an instruction. */
const PLAYING_STRENGTH = 0.16;
const SEARCH_STRENGTH = 0.3;

export function RoomTint({ searchColor }: { searchColor?: string | null }) {
  const { current } = usePlayer();
  const source = searchColor ?? current?.tint ?? null;
  const strength = searchColor ? SEARCH_STRENGTH : current ? PLAYING_STRENGTH : 0;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cosmos");
    if (!root) return;

    if (!source) {
      root.style.setProperty("--tint-strength", "0");
      return;
    }

    const { r, g, b } = hexToRgb(source);
    root.style.setProperty("--tint", `${r} ${g} ${b}`);
    root.style.setProperty("--tint-strength", String(strength));
  }, [source, strength]);

  return null;
}
