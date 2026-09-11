"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasGenre, AtlasOutbound, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { AtlasTrackRow } from "./AtlasTrackRow";
import { AtlasPlay } from "./AtlasPlay";
import { OutboundLinks, outboundFromAtlas } from "./OutboundLinks";
import { AtlasScatter, type ScatterNode } from "./AtlasScatter";
import { useAtlasPreview } from "./useAtlasPreview";

type Payload = {
  ok: boolean;
  artist: {
    name: string;
    spotifyArtistId: string | null;
    genres: { id: string; label: string }[];
    outbound: AtlasOutbound;
    profileUrl?: string | null;
  };
  nearbyGenres: { id: string; label: string }[];
  branches?: AtlasGenre[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
};

export function AtlasArtistView({ name }: { name: string }) {
  const router = useRouter();
  const { preview } = useAtlasPreview();
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    setDraft(name);
    if (!name.trim()) {
      setPage(null);
      setError(null);
      return;
    }
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

  const branchNodes: ScatterNode[] = useMemo(() => {
    const branches = page?.branches ?? [];
    return branches.map((genre) => ({
      id: genre.id,
      label: genre.label,
      href: `/atlas/genre/${genre.id}`,
      color: genre.color,
      x: genre.x,
      y: genre.y,
      weight: genre.weight,
      previewUrl: genre.previewUrl,
      title: genre.exampleTitle ? `${genre.label} — ${genre.exampleArtist}: ${genre.exampleTitle}` : genre.label,
    }));
  }, [page]);

  if (!name.trim()) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href="/atlas">Every Noise at Once</Link> · find artist
        </p>
        <h1 className="cx-atlas-display">Find an <em>artist.</em></h1>
        <form
          className="cx-atlas-search"
          style={{ marginTop: 24, maxWidth: 420 }}
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = draft.trim();
            if (trimmed) router.push(`/atlas/artist?name=${encodeURIComponent(trimmed)}`);
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="DJ Krush"
          />
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href="/atlas">Atlas</Link>
        </p>
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
        <Link href="/atlas">Every Noise at Once</Link> · artist
      </p>
      <h1 className="cx-atlas-display">{page.artist.name}</h1>
      <p className="cx-body cx-atlas-lede">
        Branches from Every Noise lookup. Recordings from Apple Music. Tap a branch to open that map.
      </p>

      <AtlasPlay artist={page.artist.name} fallbackTracks={page.libraryTracks} title={page.artist.name} label="Play this artist" />
      <div className="cx-atlas-toolbar">
        <OutboundLinks
          links={outboundFromAtlas(page.artist.outbound)}
          artist
          layout="atlas"
          artistName={page.artist.name}
        />
        {page.artist.profileUrl ? (
          <a href={page.artist.profileUrl} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
            Every Noise profile
          </a>
        ) : null}
      </div>

      {page.nearbyGenres.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Their <em>branches.</em>
            </h2>
          </div>
          <div className="cx-atlas-chips">
            {page.nearbyGenres.map((genre) => (
              <Link key={genre.id} href={`/atlas/genre/${genre.id}`} className="cx-atlas-chip">
                {genre.label}
              </Link>
            ))}
          </div>
          {branchNodes.length >= 8 ? (
            <AtlasScatter
              items={branchNodes}
              canvas={{ width: 1600, height: 900 }}
              fit="bounds"
              tone="paper"
              mode="open"
              label="Artist branches on the map"
              onPreview={(item) => preview(item.previewUrl, item.id)}
            />
          ) : null}
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
