"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AtlasGenre, AtlasPlaylist, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { nestFor, type AtlasNestId } from "@/lib/atlas/nest";
import { isFeelingSlug } from "@/lib/feelings/taxonomy";
import { FeelingsDenied } from "./FeelingsDenied";
import { AtlasTrackRow } from "./AtlasTrackRow";
import { AtlasPlay } from "./AtlasPlay";

type Payload = {
  ok: boolean;
  playlist: AtlasPlaylist;
  genre: AtlasGenre | null;
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
};

export function AtlasPlaylistView({
  id,
  kind,
  genre,
  title,
  nestId = "atlas",
}: {
  id: string;
  kind?: string;
  genre?: string;
  title?: string;
  nestId?: AtlasNestId;
}) {
  const nest = nestFor(nestId);
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setError(null);
    const params = new URLSearchParams({ id, enrich: "14" });
    if (kind) params.set("kind", kind);
    if (genre) params.set("genre", genre);
    if (title) params.set("name", title);
    void fetch(`/api/atlas/playlist?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<Payload>;
      })
      .then(setPage)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Could not open that playlist on the atlas.");
      });
    return () => controller.abort();
  }, [id, kind, genre, title]);

  if (nest.id === "feelings" && genre && !isFeelingSlug(genre)) {
    return <FeelingsDenied id={genre} atlasHref={`/atlas/playlist/${encodeURIComponent(id)}?kind=${encodeURIComponent(kind ?? "")}&genre=${encodeURIComponent(genre)}&title=${encodeURIComponent(title ?? "")}`} />;
  }

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href={nest.rootHref}>{nest.rootLabel}</Link>
        </p>
        <h1 className="cx-atlas-display">{title || id}</h1>
        <p className="cx-body">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">{nest.rootLabel}</p>
        <h1 className="cx-atlas-display">Opening…</h1>
      </div>
    );
  }

  if (nest.id === "feelings" && page.genre && !isFeelingSlug(page.genre.id)) {
    return <FeelingsDenied id={page.genre.id} atlasHref={`/atlas/genre/${page.genre.id}`} />;
  }

  const heading = page.playlist.title;
  const genreId = page.genre?.id ?? page.playlist.genreId ?? genre;

  return (
    <div className="cx-atlas">
      <p className="cx-kicker">
        <Link href={nest.rootHref}>{nest.rootLabel}</Link>
        {page.genre ? (
          <>
            {" · "}
            <Link href={nest.genreHref(page.genre.id)}>{page.genre.label}</Link>
          </>
        ) : null}
        {" · "}
        {page.playlist.kind}
      </p>
      <h1 className="cx-atlas-display">{heading}</h1>
      <p className="cx-body cx-atlas-lede">
        Every Noise playlist, resolved on Apple Music. The Spotify list stays outbound. Genre never lands on the
        catalog.
      </p>

      <AtlasPlay
        playlist={page.playlist.id}
        playlistKind={page.playlist.kind}
        genre={genreId}
        fallbackTracks={page.libraryTracks}
        title={heading}
        label="Play this playlist"
        surface={nest.id}
      />

      <div className="cx-atlas-toolbar">
        {page.playlist.kind !== "new" ? (
          <a href={page.playlist.url} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
            Open on Spotify
          </a>
        ) : (
          <a href={page.playlist.url} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
            New releases on Every Noise
          </a>
        )}
        {page.genre ? (
          <Link href={nest.genreHref(page.genre.id)} className="cx-outbound-link">
            Back to {page.genre.label}
          </Link>
        ) : null}
      </div>

      <section className="cx-section">
        <div className="cx-section-head">
          <h2 className="cx-title">
            <em>Recordings.</em>
          </h2>
        </div>
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
    </div>
  );
}
