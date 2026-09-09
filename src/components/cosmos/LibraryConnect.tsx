"use client";

import { useLibrary } from "@/context/LibraryContext";
import { FAVORITE_SONGS_URL } from "@/lib/apple/playlist";
import { songsLabel } from "@/lib/format";
import { AlbumRow } from "./MasonryGrid";

export function LibraryConnect() {
  const { configured, connected, syncing, synced, total, error, connect, circulating } = useLibrary();

  const count =
    total && total > synced
      ? `${synced.toLocaleString()} of ${total.toLocaleString()} songs`
      : songsLabel(synced);

  return (
    <section className="cx-section">
      <div className="cx-section-head">
        <h2 className="cx-title">Favorite Songs</h2>
        <div className="cx-section-side">
          <p className="cx-body">
            {connected && synced > 0
              ? `${count} from your Apple Music library, circulating here.`
              : "Your Apple Music Favorite Songs become the catalog the engine drifts through."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="cx-pill cx-pill-ghost disabled:opacity-50"
              onClick={() => void connect()}
              disabled={syncing}
            >
              {syncing ? "Connecting…" : connected ? "Refresh library" : "Connect Apple Music"}
            </button>
            <a href={FAVORITE_SONGS_URL} target="_blank" rel="noreferrer noopener" className="cx-see-all">
              Open on Apple Music →
            </a>
          </div>
        </div>
      </div>

      {connected && circulating.length > 0 && <AlbumRow tracks={circulating.slice(0, 16)} />}

      {!configured && (
        <p className="cx-meta mt-3">
          Needs an Apple MusicKit key on this deployment, then a one-tap sign-in. The playlist is
          private — Apple will not hand it over without you.
        </p>
      )}
      {error && (
        <p className="cx-meta mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
