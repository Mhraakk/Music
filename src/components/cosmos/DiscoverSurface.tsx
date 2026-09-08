"use client";

/**
 * DISCOVER SURFACE
 *
 * The client island on the home page: search state, the grid it drives, and the
 * room tint. Everything above it — the masthead, the collection rail, the
 * counts — stays server-rendered.
 *
 * Search runs entirely in the browser against the library passed down from the
 * server. That is a deliberate tradeoff: it costs one payload of catalog
 * metadata up front (no artwork, just fields) and buys instant ranking with no
 * request per keystroke. At 64 positions it is not close to a problem; past a
 * few thousand this would move behind an endpoint.
 */

import { useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { colorDistance, hexToRgb, rgbToHsl } from "@/lib/media";
import { MasonryGrid } from "./MasonryGrid";
import { NowPlayingSheet } from "./NowPlayingSheet";
import { RoomTint } from "./RoomTint";
import { SearchBar, type SearchMode } from "./SearchBar";

export function DiscoverSurface({ tracks }: { tracks: LibraryTrack[] }) {
  const [mode, setMode] = useState<SearchMode>({ kind: "none" });

  const results = useMemo(() => {
    if (mode.kind === "color") {
      const target = rgbToHsl(hexToRgb(mode.hex));
      return tracks
        .map((track) => ({ track, d: colorDistance(target, track.searchHsl) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.track);
    }

    if (mode.kind === "text") {
      const terms = mode.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return tracks;

      return tracks
        .map((track) => {
          // Weighted so an artist or title match outranks an incidental hit in
          // the engine's prose description of the emotional shape.
          const fields: [string, number][] = [
            [track.title.toLowerCase(), 4],
            [track.artist.toLowerCase(), 4],
            [(track.album ?? "").toLowerCase(), 2],
            [track.region.replace(/_/g, " "), 2.5],
            [track.shape.toLowerCase(), 2],
            [track.note.toLowerCase(), 1],
          ];
          let score = 0;
          for (const term of terms) {
            for (const [text, weight] of fields) {
              if (!text) continue;
              if (text === term) score += weight * 2;
              else if (text.startsWith(term)) score += weight * 1.4;
              else if (text.includes(term)) score += weight;
            }
          }
          return { track, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.track);
    }

    return tracks;
  }, [mode, tracks]);

  return (
    <>
      <RoomTint searchColor={mode.kind === "color" ? mode.hex : null} />

      <div className="sticky top-0 z-40 -mx-4 mb-4 bg-[var(--paper)]/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <SearchBar
          mode={mode}
          onChange={setMode}
          resultCount={mode.kind === "none" ? null : results.length}
        />
      </div>

      <MasonryGrid tracks={results} />

      {/* Clearance so the last row is never trapped behind the sheet and nav. */}
      <div className="h-40" aria-hidden />

      <NowPlayingSheet />
    </>
  );
}
