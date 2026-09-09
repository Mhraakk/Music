"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { useLibrary } from "@/context/LibraryContext";
import { loadFavorites } from "@/lib/apple/store";
import { FAVORITE_SONGS_URL } from "@/lib/apple/playlist";
import { songsLabel } from "@/lib/format";
import { SongList } from "./SongList";

const PAGE = 200;

export function LibrarySongs() {
  const { configured, connected, syncing, synced, total, error, connect } = useLibrary();
  const [songs, setSongs] = useState<LibraryTrack[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadFavorites().then(setSongs);
  }, [synced]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((t) => {
      const hay = `${t.title} ${t.artist} ${t.album ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [songs, query]);

  const visible = filtered.slice(0, PAGE);

  return (
    <main className="cx-page">
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Library</h1>
          <p className="cx-body mt-2 max-w-[48ch]">
            {connected && synced > 0
              ? `${songsLabel(total ?? synced)} in Favorite Songs — title, artist, album, time.`
              : "Connect Apple Music to bring your Favorite Songs here as a real library."}
          </p>
        </div>
        <button
          type="button"
          className="cx-pill cx-pill-primary shrink-0"
          onClick={() => void connect()}
          disabled={syncing}
        >
          {syncing ? "Connecting…" : connected ? "Refresh library" : "Connect Apple Music"}
        </button>
      </header>

      {connected && songs.length > 0 && (
        <div className="mb-5 max-w-md">
          <div className="cx-search">
            <input
              type="search"
              value={query}
              placeholder="Filter songs"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter library"
            />
          </div>
        </div>
      )}

      {!connected && (
        <div className="cx-callout max-w-xl">
          <p className="text-[15px] font-semibold">Your songs, on this device</p>
          <p className="cx-body mt-2">
            Favorite Songs stay in your browser — tens of thousands of loved tracks as catalog and
            as taste. Resonant never dumps them into a shared server library.
          </p>
          <a
            href={FAVORITE_SONGS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="cx-see-all mt-3 inline-block"
          >
            Open Favorite Songs on Apple Music
          </a>
          {!configured && (
            <p className="cx-meta mt-3">
              This deployment still needs a MusicKit key (Team ID, Key ID, .p8) before Connect will
              work.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="cx-meta mb-4" style={{ color: "#8c1b22" }}>
          {error}
        </p>
      )}

      {connected && songs.length > 0 && (
        <>
          <p className="cx-meta mb-3">
            {query
              ? `${songsLabel(visible.length)}${filtered.length > PAGE ? ` of ${filtered.length.toLocaleString()} matches` : ""}`
              : visible.length < songs.length
                ? `Showing ${visible.length.toLocaleString()} of ${songsLabel(songs.length)}`
                : songsLabel(songs.length)}
          </p>
          <SongList tracks={visible} />
        </>
      )}
    </main>
  );
}
