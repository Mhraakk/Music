"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasCanvas, AtlasGenre } from "@/lib/everynoise/types";
import { FEELINGS_NEST } from "@/lib/atlas/nest";
import type { FeelingRoomId } from "@/lib/feelings/taxonomy";
import { AtlasPlay } from "./AtlasPlay";
import { AtlasScatter, type ScatterNode } from "./AtlasScatter";
import { useAtlasPreview } from "./useAtlasPreview";

type RoomView = {
  id: FeelingRoomId;
  title: string;
  kicker: string;
  lede: string;
  genres: AtlasGenre[];
};

type Payload = {
  ok: boolean;
  rooms: RoomView[];
  canvas: AtlasCanvas;
  slugs: string[];
};

export function FeelingsSurface() {
  const router = useRouter();
  const { preview } = useAtlasPreview();
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artistDraft, setArtistDraft] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/feelings", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<Payload>;
      })
      .then(setPage)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Feelings could not read the atlas map just now.");
      });
    return () => controller.abort();
  }, []);

  const allNodes: ScatterNode[] = useMemo(() => {
    if (!page) return [];
    const seen = new Set<string>();
    const nodes: ScatterNode[] = [];
    for (const room of page.rooms) {
      for (const genre of room.genres) {
        if (seen.has(genre.id)) continue;
        seen.add(genre.id);
        nodes.push({
          id: genre.id,
          label: genre.label,
          href: FEELINGS_NEST.genreHref(genre.id),
          color: genre.color,
          x: genre.x,
          y: genre.y,
          weight: genre.weight,
          previewUrl: genre.previewUrl,
          title: genre.exampleTitle ? `${genre.label} — ${genre.exampleArtist}: ${genre.exampleTitle}` : genre.label,
        });
      }
    }
    return nodes;
  }, [page]);

  const openArtist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(FEELINGS_NEST.artistHref(trimmed));
  };

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href="/atlas">Atlas</Link> · Feelings
        </p>
        <h1 className="cx-atlas-display">Feelings</h1>
        <p className="cx-body">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">Feelings</p>
        <h1 className="cx-atlas-display">Opening…</h1>
      </div>
    );
  }

  return (
    <div className="cx-atlas">
      <header className="cx-atlas-hero">
        <p className="cx-kicker">
          <Link href="/atlas">Atlas</Link> · a named cut
        </p>
        <h1 className="cx-atlas-display">
          <em>Feelings.</em>
        </h1>
        <p className="cx-body cx-atlas-lede">
          Atlas is the mother map — every Every Noise branch. Feelings keeps only thirty live slugs across six rooms.
          Tap a branch for artists, scan, The Sound / Intro / Pulse / Edge / New, then Apple Music. Genre never lands
          on the catalog.
        </p>
      </header>

      <div className="cx-atlas-toolbar">
        <form
          className="cx-atlas-search"
          onSubmit={(event) => {
            event.preventDefault();
            openArtist(artistDraft);
          }}
        >
          <span className="sr-only">Open an artist</span>
          <input
            type="text"
            value={artistDraft}
            onChange={(event) => setArtistDraft(event.target.value)}
            placeholder="find artist"
          />
        </form>
      </div>

      {allNodes.length > 0 ? (
        <AtlasScatter
          items={allNodes}
          canvas={page.canvas}
          fit="bounds"
          tone="paper"
          mode="open"
          label="Feelings branches"
          onPreview={(item) => preview(item.previewUrl, item.id)}
        />
      ) : null}

      <div className="cx-feeling-rooms">
        {page.rooms.map((room) => (
          <section key={room.id} className="cx-feeling-room" id={room.id}>
            <p className="cx-kicker">{room.kicker}</p>
            <h2 className="cx-title">{room.title}</h2>
            <p className="cx-body">{room.lede}</p>
            <AtlasPlay
              feeling={room.id}
              fallbackTracks={[]}
              title={room.title.replace(/\.$/, "")}
              label="Play this feeling"
            />
            <div className="cx-atlas-chips">
              {room.genres.map((genre) => (
                <Link
                  key={`${room.id}-${genre.id}`}
                  href={FEELINGS_NEST.genreHref(genre.id)}
                  className="cx-atlas-chip"
                  style={{ color: genre.color }}
                  title={
                    genre.exampleTitle
                      ? `${genre.label} — ${genre.exampleArtist}: ${genre.exampleTitle}`
                      : genre.label
                  }
                >
                  {genre.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
