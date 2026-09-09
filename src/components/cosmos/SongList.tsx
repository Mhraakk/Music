"use client";

import Image from "next/image";
import type { LibraryTrack } from "@/lib/library";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { clock } from "@/lib/format";

export function SongList({ tracks, showAlbum = true }: { tracks: LibraryTrack[]; showAlbum?: boolean }) {
  const { current, playing } = usePlayer();
  const { play } = usePlayerActions();

  if (tracks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="cx-heading">No songs</p>
        <p className="cx-body mt-2">This list is empty.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="cx-songs">
        <thead>
          <tr>
            <th style={{ width: 44 }}>#</th>
            <th>Title</th>
            <th className="hidden sm:table-cell">Artist</th>
            {showAlbum && <th className="hidden md:table-cell">Album</th>}
            <th className="text-right" style={{ width: 64 }}>
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => {
            const active = current?.id === track.id;
            return (
              <tr
                key={track.id}
                className="cx-song"
                data-active={active ? "true" : undefined}
                onClick={() => play(track)}
              >
                <td className="cx-mono">{active && playing ? "▶" : i + 1}</td>
                <td>
                  <span className="cx-song-title">
                    <span className="cx-song-art" style={{ backgroundColor: track.tint }}>
                      {track.artworkUrl && (
                        <Image src={track.artworkUrl} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="cx-truncate block font-medium">{track.title}</span>
                      <span className="cx-truncate block text-[12px] text-[var(--ink-3)] sm:hidden">
                        {track.artist}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="hidden sm:table-cell">
                  <span className="cx-truncate block max-w-[28ch]">{track.artist}</span>
                </td>
                {showAlbum && (
                  <td className="hidden md:table-cell">
                    <span className="cx-truncate block max-w-[32ch] text-[var(--ink-3)]">
                      {track.album ?? "—"}
                    </span>
                  </td>
                )}
                <td className="cx-mono text-right">{clock(track.duration)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
