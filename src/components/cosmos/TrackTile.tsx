"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { PauseIcon, PlayIcon } from "./icons";

const SIZES =
  "(min-width: 1440px) 16vw, (min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw";

export function TrackTile({
  track,
  active = false,
  playing = false,
  onSelect,
  priority = false,
  size = "md",
}: {
  track: LibraryTrack;
  active?: boolean;
  playing?: boolean;
  onSelect: (track: LibraryTrack) => void;
  priority?: boolean;
  size?: "md" | "lg";
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <button
      type="button"
      className="cx-album"
      data-active={active ? "true" : undefined}
      data-size={size}
      onClick={() => onSelect(track)}
      aria-label={`${track.title} by ${track.artist}`}
    >
      <span className="cx-album-art" style={{ backgroundColor: track.tint }}>
        {track.artworkUrl ? (
          <Image
            ref={imgRef}
            src={track.artworkUrl}
            alt=""
            fill
            sizes={size === "lg" ? "(min-width: 700px) 28vw, 90vw" : SIZES}
            priority={priority}
            data-loaded={loaded ? "true" : "false"}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="absolute inset-0 flex items-end p-3">
            <span className="cx-label" style={{ color: track.isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.55)" }}>
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
        {!playing && track.origin === "expansion" && <span className="cx-tile-badge">New</span>}
        {!playing && track.origin === "favorite" && <span className="cx-tile-badge">Yours</span>}

        <span className="cx-play-fab" aria-hidden>
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </span>
      </span>

      <span className="cx-album-meta">
        <span className="cx-album-title cx-truncate">{track.title}</span>
        <span className="cx-album-sub cx-truncate">{track.artist}</span>
      </span>
    </button>
  );
}

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
