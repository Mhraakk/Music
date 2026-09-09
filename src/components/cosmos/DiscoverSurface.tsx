"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { LibraryConnect } from "./LibraryConnect";
import { AlbumRow, MasonryGrid } from "./MasonryGrid";
import { RoomTint } from "./RoomTint";
import { SearchBar, type SearchMode } from "./SearchBar";
import { SessionMind } from "./SessionMind";
import type { Collection, Curator } from "@/lib/library";
import { CollectionRail } from "./CollectionRail";
import Link from "next/link";
import Image from "next/image";

const PAGE = 72;

export function DiscoverSurface({
  topPicks,
  newMusic,
  stations,
  artists,
  catalogTotal,
}: {
  topPicks: LibraryTrack[];
  newMusic: LibraryTrack[];
  stations: Omit<Collection, "tracks">[];
  artists: Pick<Curator, "slug" | "name" | "covers" | "tint">[];
  catalogTotal: number;
}) {
  const { extras } = usePlayer();
  const { circulating, searchLocal, colorLocal, synced } = useLibrary();
  const [mode, setMode] = useState<SearchMode>({ kind: "none" });
  const [remote, setRemote] = useState<LibraryTrack[] | null>(null);
  const [total, setTotal] = useState(catalogTotal);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (location.hash === "#search") {
      document.querySelector<HTMLInputElement>("#search input")?.focus();
    }
  }, []);

  useEffect(() => {
    if (mode.kind === "none") {
      setRemote(null);
      setTotal(catalogTotal + synced);
      setOffset(0);
      return;
    }

    const controller = new AbortController();
    setBusy(true);

    const params = new URLSearchParams({ limit: String(PAGE), offset: "0" });
    if (mode.kind === "text") params.set("q", mode.query);
    if (mode.kind === "color") params.set("color", mode.hex);

    void fetch(`/api/catalog?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`catalog ${response.status}`);
        return response.json() as Promise<{ tracks: LibraryTrack[]; total: number }>;
      })
      .then((payload) => {
        const local =
          mode.kind === "text"
            ? searchLocal(mode.query)
            : mode.kind === "color"
              ? colorLocal(mode.hex)
              : [];
        const seen = new Set(local.map((t) => t.id));
        setRemote([...local, ...payload.tracks.filter((t) => !seen.has(t.id))]);
        setTotal(payload.total + synced);
        setOffset(payload.tracks.length);
        setBusy(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBusy(false);
      });

    return () => controller.abort();
  }, [mode, catalogTotal, searchLocal, colorLocal, synced]);

  const fresh = extras.filter((t) => t.origin === "expansion");

  const results = useMemo(() => {
    if (mode.kind !== "none") {
      const remoteIds = new Set((remote ?? []).map((t) => t.id));
      const extraHits = fresh.filter((t) => !remoteIds.has(t.id));
      return [...extraHits, ...(remote ?? [])];
    }
    return [];
  }, [mode.kind, remote, fresh]);

  async function showMore() {
    if (busy) return;
    setBusy(true);
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (mode.kind === "text") params.set("q", mode.query);
    if (mode.kind === "color") params.set("color", mode.hex);
    try {
      const response = await fetch(`/api/catalog?${params}`);
      if (!response.ok) throw new Error(`catalog ${response.status}`);
      const payload = (await response.json()) as { tracks: LibraryTrack[]; total: number };
      setRemote((prev) => {
        const seen = new Set((prev ?? []).map((t) => t.id));
        return [...(prev ?? []), ...payload.tracks.filter((t) => !seen.has(t.id))];
      });
      setTotal(payload.total + synced);
      setOffset(offset + payload.tracks.length);
    } catch {
      /* keep what already rendered */
    } finally {
      setBusy(false);
    }
  }

  const searching = mode.kind !== "none";
  const canShowMore = searching && results.length < total;

  return (
    <>
      <RoomTint searchColor={mode.kind === "color" ? mode.hex : null} />

      <div className="mb-8 max-w-[420px]">
          <SearchBar
            mode={mode}
            onChange={setMode}
            resultCount={searching ? (busy && !remote ? null : results.length) : null}
          />
        </div>

      {searching ? (
        <section className="cx-section">
          <h2 className="cx-title mb-4">Search results</h2>
          <MasonryGrid tracks={results} />
          {canShowMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                className="cx-pill cx-pill-ghost disabled:opacity-50"
                onClick={() => void showMore()}
                disabled={busy}
              >
                {busy ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <SessionMind />

          {fresh.length > 0 && (
            <section className="cx-section">
              <div className="cx-section-head">
                <h2 className="cx-title">New for you</h2>
              </div>
              <AlbumRow tracks={fresh} />
            </section>
          )}

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Top Picks</h2>
            </div>
            <MasonryGrid tracks={topPicks.slice(0, 3)} size="lg" />
            {topPicks.length > 3 && (
              <div className="mt-6">
                <AlbumRow tracks={topPicks.slice(3)} />
              </div>
            )}
          </section>

          <LibraryConnect />

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Stations</h2>
              <Link href="/collections" className="cx-see-all">
                See All
              </Link>
            </div>
            <CollectionRail collections={stations} />
          </section>

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">New Music Mix</h2>
            </div>
            <AlbumRow tracks={[...circulating.slice(0, 4), ...newMusic].filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i).slice(0, 16)} />
          </section>

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Artists</h2>
              <Link href="/curators" className="cx-see-all">
                See All
              </Link>
            </div>
            <div className="cx-artist-rail">
              {artists.map((artist) => (
                <Link key={artist.slug} href={`/curator/${artist.slug}`} className="cx-artist-chip">
                  <span className="cx-avatar" style={{ backgroundColor: artist.tint }}>
                    {artist.covers.slice(0, 4).map((track) => (
                      <span key={track.id} className="relative block overflow-hidden" style={{ backgroundColor: track.tint }}>
                        {track.artworkUrl && (
                          <Image src={track.artworkUrl} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
                        )}
                      </span>
                    ))}
                  </span>
                  <span className="cx-album-title cx-truncate w-full">{artist.name}</span>
                  <span className="cx-album-sub">Artist</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
