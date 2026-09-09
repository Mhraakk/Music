"use client";

import { useEffect, useRef } from "react";
import type { LyricLine } from "@/lib/lyrics/lrclib";

export function LyricsStage({
  lines,
  elapsedMs,
  synced,
}: {
  lines: LyricLine[];
  elapsedMs: number;
  synced: boolean;
}) {
  const active = useRef<HTMLLIElement | null>(null);
  let current = -1;
  if (synced) {
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].timeMs <= elapsedMs) current = i;
    }
  } else if (lines.length) {
    current = Math.min(lines.length - 1, Math.max(0, Math.floor(elapsedMs / 4000)));
  }

  useEffect(() => {
    active.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current]);

  if (!lines.length) return null;

  return (
    <div className="cx-lyrics" aria-label="Lyrics">
      <ol>
        {lines.map((line, i) => (
          <li
            key={`${line.timeMs}-${i}`}
            ref={i === current ? active : undefined}
            data-active={i === current ? "true" : "false"}
          >
            {line.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
