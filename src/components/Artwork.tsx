"use client";
import { useState } from "react";
import type { Track } from "@/lib/tracks";
import { fallbackArt } from "@/lib/tracks";

type Props = {
  track: Track;
  size?: number | string;
  className?: string;
  rounded?: string;
  priority?: boolean;
};

export function Artwork({ track, size = 56, className = "", rounded = "rounded-xl", priority }: Props) {
  const [failed, setFailed] = useState(false);
  const dim = typeof size === "number" ? `${size}px` : size;

  if (failed || !track.coverUrl) {
    return (
      <div
        className={`${rounded} shrink-0 ring-1 ring-white/10 ${className}`}
        style={{ width: dim, height: dim, background: fallbackArt(track) }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={track.coverUrl}
      alt={`${track.album} — ${track.artist}`}
      width={typeof size === "number" ? size : 400}
      height={typeof size === "number" ? size : 400}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`${rounded} object-cover shrink-0 ring-1 ring-white/10 ${className}`}
      style={{ width: dim, height: dim }}
    />
  );
}
