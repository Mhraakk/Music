"use client";

/**
 * TRACK TILE
 *
 * The atom of the interface. Full-bleed artwork, soft corners, no visible
 * chrome at rest — the caption only appears on hover, focus, or while playing.
 *
 * Three details that matter more than they look:
 *
 *  - The tile reserves its own aspect ratio before the image arrives, so the
 *    masonry never reflows mid-scroll. The placeholder is the sleeve's own
 *    average colour, extracted at build time, so the reserved box already
 *    belongs to the artwork it is waiting for.
 *  - Artwork is served through `next/image` with explicit `sizes` matching the
 *    column count, so a phone downloads a phone-sized sleeve.
 *  - It is a real `<button>`. A grid of clickable `<div>`s is unusable by
 *    keyboard, and this grid is the app's primary navigation.
 */

import Image from "next/image";
import { useState } from "react";
import type { LibraryTrack } from "@/lib/library";

/** Matches the column counts in `cosmos.css`, so the browser fetches sensibly. */
const SIZES = "(min-width: 1440px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function TrackTile({
  track,
  active = false,
  playing = false,
  onSelect,
  priority = false,
}: {
  track: LibraryTrack;
  active?: boolean;
  playing?: boolean;
  onSelect: (track: LibraryTrack) => void;
  /** Set on the first screenful so the largest sleeves are not lazy-loaded. */
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      className="cx-tile"
      data-active={active ? "true" : undefined}
      onClick={() => onSelect(track)}
      style={{
        aspectRatio: `1 / ${track.aspect}`,
        backgroundColor: track.tint,
      }}
      aria-label={`${track.title} by ${track.artist}. ${track.shape}.`}
    >
      {track.artworkUrl ? (
        <Image
          src={track.artworkUrl}
          alt=""
          fill
          sizes={SIZES}
          priority={priority}
          data-loaded={loaded ? "true" : "false"}
          onLoad={() => setLoaded(true)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        /*
         * The rare position with no artwork anywhere. Rendered as a flat field
         * derived from its emotional vector plus its own title, so it reads as a
         * deliberate sleeve rather than a broken image.
         */
        <span
          className="absolute inset-0 flex items-end p-3"
          style={{ backgroundColor: track.tint }}
        >
          <span
            className="cx-label"
            style={{ color: track.isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.55)" }}
          >
            {track.artist}
          </span>
        </span>
      )}

      {playing && (
        <span className="cx-tile-badge">
          <PlayingBars />
          Playing
        </span>
      )}

      <span className="cx-tile-caption">
        <span className="block text-[13px] font-medium leading-tight cx-truncate">{track.title}</span>
        <span className="block text-[11px] leading-tight opacity-70 cx-truncate">{track.artist}</span>
      </span>
    </button>
  );
}

/** Three bars, animated only while sounding. Pure CSS, no timer. */
function PlayingBars() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[2px] bg-current"
          style={{
            height: 8,
            animation: `cx-bar 900ms ease-in-out ${i * 140}ms infinite`,
            transformOrigin: "bottom",
          }}
        />
      ))}
      <style>{`@keyframes cx-bar { 0%,100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }`}</style>
    </span>
  );
}
