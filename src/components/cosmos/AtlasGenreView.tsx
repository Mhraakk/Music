"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AtlasArtistRef, AtlasGenre, AtlasPlaylist, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { usePlayerActions } from "@/context/PlayerContext";
import { AtlasTrackRow } from "./AtlasTrackRow";

type Payload = {
  ok: boolean;
  genre: AtlasGenre;
  artists: AtlasArtistRef[];
  nearby: { id: string; label: string }[];
  playlists: AtlasPlaylist[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
};

export function AtlasGenreView({ id }: { id: string }) {
  const { ingest, playQueue } = usePlayerActions();
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setError(null);
    void fetch(`/api/atlas/genre/${encodeURIComponent(id)}?enrich=12`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<Payload>;
      })
      .then(setPage)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("This branch is not on the map.");
      });
    return () => controller.abort();
  }, [id]);

  const playAll = () => {
    if (!page?.libraryTracks.length) return;
    ingest(page.libraryTracks);
    playQueue(page.libraryTracks, page.genre.label);
  };

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">Atlas</p>
        <h1 className="cx-atlas-display">{id}</h1>
        <p className="cx-body">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">Atlas</p>
        <h1 className="cx-atlas-display">Opening…</h1>
      </div>
    );
  }

  return (
    <div className="cx-atlas">
      <p className="cx-kicker">
        <Link href="/atlas">Atlas</Link> · {page.genre.family}
      </p>
      <h1 className="cx-atlas-display">{page.genre.label}</h1>
      <p className="cx-body cx-atlas-lede">
        Artists on this Every Noise map. Play uses Apple Music first. Each row keeps the Spotify recording
        plus Apple, YouTube Music, and SoundCloud for that same piece.
      </p>

      <div className="cx-atlas-toolbar">
        <button type="button" className="cx-pill cx-pill-primary" onClick={playAll} disabled={!page.libraryTracks.length}>
          Play this branch
        </button>
        {page.playlists.map((playlist) => (
          <a key={playlist.id} href={playlist.url} target="_blank" rel="noreferrer noopener" className="cx-pill cx-pill-ghost">
            Spotify {playlist.kind}
          </a>
        ))}
      </div>

      {page.nearby.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Nearby <em>branches.</em>
            </h2>
          </div>
          <div className="cx-atlas-chips">
            {page.nearby.map((genre) => (
              <Link key={genre.id} href={`/atlas/genre/${genre.id}`} className="cx-atlas-chip">
                {genre.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="cx-section">
        <div className="cx-section-head">
          <h2 className="cx-title">
            <em>Recordings.</em>
          </h2>
        </div>
        <div className="cx-atlas-tracks">
          {page.tracks.map((card, index) => (
            <AtlasTrackRow
              key={`${card.artist}-${card.title}-${index}`}
              card={card}
              track={page.libraryTracks.find((t) => t.id === card.libraryId) ?? null}
            />
          ))}
        </div>
      </section>

      <section className="cx-section">
        <div className="cx-section-head">
          <h2 className="cx-title">
            Artists on this <em>map.</em>
          </h2>
        </div>
        <div className="cx-atlas-chips">
          {page.artists.map((artist) => (
            <Link
              key={`${artist.name}-${artist.spotifyArtistId ?? ""}`}
              href={`/atlas/artist?name=${encodeURIComponent(artist.name)}`}
              className="cx-atlas-chip"
            >
              {artist.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
