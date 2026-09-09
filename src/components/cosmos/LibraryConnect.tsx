"use client";

/**
 * Connect the listener's Apple Music Favorite Songs playlist so it can
 * circulate as catalog and as the engine's taste source.
 */

import { useLibrary } from "@/context/LibraryContext";
import { FAVORITE_SONGS_URL } from "@/lib/apple/playlist";

export function LibraryConnect() {
  const { configured, connected, syncing, synced, total, error, connect } = useLibrary();

  const count =
    total && total > synced ? `${synced.toLocaleString()} of ${total.toLocaleString()}` : synced.toLocaleString();

  return (
    <div className="mb-4 rounded-2xl border border-[var(--hairline)] px-4 py-3">
      <p className="cx-meta">Favorite Songs</p>
      <p className="mt-1 text-[14px] font-medium leading-snug">
        {connected && synced > 0
          ? `${count} loved recordings circulating as catalog and as taste.`
          : "Your Apple Music Favorite Songs — tens of thousands of loved tracks — become the database the engine drifts through."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="cx-pill cx-pill-dark h-8 px-3 disabled:opacity-50"
          onClick={() => void connect()}
          disabled={syncing}
        >
          {syncing ? "Circulating…" : connected ? "Refresh library" : "Connect Apple Music"}
        </button>
        <a
          href={FAVORITE_SONGS_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="cx-pill cx-pill-ghost h-8 px-3"
        >
          <span className="cx-meta whitespace-nowrap">Open on Apple Music</span>
        </a>
      </div>
      {!configured && (
        <p className="cx-meta mt-2">
          Needs an Apple MusicKit key (Team ID, Key ID, .p8) on this deployment, then a one-tap sign-in.
          The playlist is private — Apple will not hand it over without you.
        </p>
      )}
      {error && (
        <p className="cx-meta mt-2" style={{ color: "#8c1b22" }}>
          {error}
        </p>
      )}
    </div>
  );
}
