"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AtlasArtistRef, AtlasOutbound, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { usePlayerActions } from "@/context/PlayerContext";
import { AtlasTrackRow } from "./AtlasTrackRow";
import { OutboundLinks, outboundFromAtlas } from "./OutboundLinks";

type Payload = {
  ok: boolean;
  artist: {
    name: string;
    spotifyArtistId: string | null;
    genres: { id: string; label: string }[];
    outbound: AtlasOutbound;
  };
  features: AtlasArtistRef[];
  nearbyGenres: { id: string; label: string }[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
};

export function AtlasArtistView({ name }: { name: string }) {
  const { ingest, playQueue } = usePlayerActions();
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setError(null);
    void fetch(`/api/atlas/artist?name=${encodeURIComponent(name)}&enrich=10`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<Payload>;
      })
      .then(setPage)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Could not open that artist on the atlas.");
      });
    return () => controller.abort();
  }, [name]);

  const playAll = () => {
    if (!page?.libraryTracks.length) return;
    ingest(page.libraryTracks);
    playQueue(page.libraryTracks, page.artist.name);
  };

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">Atlas</p>
        <h1 className="cx-atlas-display">{name}</h1>
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
        <Link href="/atlas">Atlas</Link> · artist
      </p>
      <h1 className="cx-atlas-display">{page.artist.name}</h1>
      <p className="cx-body cx-atlas-lede">
        Features from Every Noise, recordings from Apple Music. Tap a branch or a neighbour
        and the next map opens. Links below are this person on each service.
      </p>

      <div className="cx-atlas-toolbar">
        <button type="button" className="cx-pill cx-pill-primary" onClick={playAll} disabled={!page.libraryTracks.length}>
          Play this artist
        </button>
        <OutboundLinks links={outboundFromAtlas(page.artist.outbound)} artist />
      </div>

      {page.nearbyGenres.length > 0 && (
        <section className="cx-section">
          <p className="cx-kicker">Their branches</p>
          <div className="cx-atlas-chips">
            {page.nearbyGenres.map((genre) => (
              <Link key={genre.id} href={`/atlas/genre/${genre.id}`} className="cx-atlas-chip">
                {genre.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="cx-section">
        <p className="cx-kicker">Recordings</p>
        <div className="cx-atlas-tracks">
          {page.tracks.map((card, index) => (
            <AtlasTrackRow
              key={`${card.libraryId ?? card.title}-${index}`}
              card={card}
              track={page.libraryTracks.find((t) => t.id === card.libraryId) ?? page.libraryTracks[index] ?? null}
            />
          ))}
        </div>
      </section>

      {page.features.length > 0 && (
        <section className="cx-section">
          <p className="cx-kicker">Features on their map</p>
          <div className="cx-atlas-chips">
            {page.features.map((artist) => (
              <Link
                key={`${artist.name}-${artist.spotifyArtistId ?? artist.spotifyTrackId ?? ""}`}
                href={`/atlas/artist?name=${encodeURIComponent(artist.name)}`}
                className="cx-atlas-chip"
              >
                {artist.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
