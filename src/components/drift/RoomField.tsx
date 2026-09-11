"use client";

/**
 * THE ROOM
 *
 * The design system requires the flat background to shift with the warmth and
 * cinematic depth of whatever is sounding. That colour is computed server-side
 * per position (warmth drives hue, emotional depth drives descent toward black)
 * and arrives on each phase as `field`.
 *
 * Applying it means writing one CSS custom property on the scoped root, which
 * `drift.css` consumes as a flat `background-color` with a 2.4s linear
 * transition — slower than any track change, so the room is always still
 * catching up with the music rather than snapping to it.
 *
 * Renders nothing. The alternative — making the layout a client component so it
 * could hold this in state — would drag the entire page out of RSC for the sake
 * of one custom property.
 */

import { useEffect } from "react";
import { useCurrentPhase } from "@/context/DriftContext";

export function RoomField() {
  const phase = useCurrentPhase();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".sonic-drift");
    if (!root) return;

    // Idle rooms return to near-black rather than holding the last colour, so
    // an ended session does not look like a paused one.
    root.style.setProperty("--field", phase?.field ?? "12 11 10");
  }, [phase?.field]);

  return null;
}
