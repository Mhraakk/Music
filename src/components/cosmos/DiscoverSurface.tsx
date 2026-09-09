"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { LibraryConnect } from "./LibraryConnect";
import { AlbumRow, MasonryGrid } from "./MasonryGrid";
import { TrackTile } from "./TrackTile";
import { RoomTint } from "./RoomTint";
import { SearchBar, type SearchMode } from "./SearchBar";
import { SessionMind } from "./SessionMind";
import type { Collection, Curator } from "@/lib/library";
import { CollectionRail } from "./CollectionRail";
import { FeelingMap } from "./FeelingMap";
import type { CoordinateId } from "@/lib/drift/topography";
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
  const { extras, destination } = usePlayer();
  const { ingest, setDestination } = usePlayerActions();
  const { circulating, searchLocal, colorLocal, synced } = useLibrary();
  const [mode, setMode] = useState<SearchMode>({ kind: "none" });
  const [remote, setRemote] = useState<LibraryTrack[] | null>(null);
  const [total, setTotal] = useState(catalogTotal);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [arrived, setArrived] = useState<LibraryTrack[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

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

  async function refreshLive(room: CoordinateId = destination) {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const seed = Date.now();
      const response = await fetch(`/api/discover/fresh?room=${encodeURIComponent(room)}&seed=${seed}&limit=10`);
      const payload = (await response.json()) as { ok?: boolean; tracks?: LibraryTrack[]; error?: string };
      const tracks = payload.tracks ?? [];
      if (!tracks.length) {
        setRefreshNote(payload.error || "Apple Music did not return new recordings just now.");
        return;
      }
      ingest(tracks);
      setArrived(tracks);
      setRefreshNote(`Just arrived from Apple Music · ${tracks.length} recordings`);
    } catch {
      setRefreshNote("Refresh could not reach Apple Music.");
    } finally {
      setRefreshing(false);
    }
  }

  const searching = mode.kind !== "none";
  const canShowMore = searching && results.length < total;
  const arrivedIds = new Set(arrived.map((t) => t.id));
  const otherFresh = fresh.filter((t) => !arrivedIds.has(t.id));

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

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Emotional map</h2>
              <div className="cx-section-side">
                <p className="cx-body">
                  Tap a room. Refresh pulls new recordings from Apple Music for that feeling — not the static shelf.
                </p>
                <button
                  type="button"
                  className="cx-pill cx-pill-ghost"
                  onClick={() => void refreshLive()}
                  disabled={refreshing}
                >
                  {refreshing ? "Harvesting…" : "Refresh live Apple Music"}
                </button>
              </div>
            </div>
            <FeelingMap
              current={destination}
              onPick={(id) => {
                setDestination(id);
                void refreshLive(id);
              }}
            />
            {refreshNote && <p className="cx-meta mt-3">{refreshNote}</p>}
          </section>

          {arrived.length > 0 && (
            <section className="cx-section">
              <div className="cx-section-head">
                <h2 className="cx-title">Just arrived</h2>
              </div>
              {arrived[0]?.note && <p className="cx-meta mb-3">{arrived[0].note}</p>}
              <AlbumRow tracks={arrived} />
            </section>
          )}

          {otherFresh.length > 0 && (
            <section className="cx-section">
              <div className="cx-section-head">
                <h2 className="cx-title">New for you</h2>
              </div>
              <AlbumRow tracks={otherFresh} />
            </section>
          )}

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Top Picks</h2>
              <p className="cx-body">The recordings the engine would put on first — image-led, no charts.</p>
            </div>
            <FeaturedPicks tracks={topPicks.slice(0, 3)} />
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
              <div className="cx-section-side">
                <p className="cx-body">Neighbourhoods on the map. Tap one and the engine stays there.</p>
                <Link href="/collections" className="cx-see-all">
                  See All →
                </Link>
              </div>
            </div>
            <CollectionRail collections={stations} />
          </section>

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">New Music Mix</h2>
              <p className="cx-body">Fresh recordings in circulation — Apple first, then the shelf.</p>
            </div>
            <AlbumRow tracks={[...circulating.slice(0, 4), ...newMusic].filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i).slice(0, 16)} />
          </section>

          <section className="cx-section">
            <div className="cx-section-head">
              <h2 className="cx-title">Artists</h2>
              <div className="cx-section-side">
                <p className="cx-body">People the catalog already occupies — not a genre list.</p>
                <Link href="/curators" className="cx-see-all">
                  See All →
                </Link>
              </div>
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

function FeaturedPicks({ tracks }: { tracks: LibraryTrack[] }) {
  const { current, playing } = usePlayer();
  const { play } = usePlayerActions();
  const [lead, ...rest] = tracks;
  if (!lead) return null;

  return (
    <div className="cx-feature-grid">
      <TrackTile
        track={lead}
        size="lg"
        active={current?.id === lead.id}
        playing={current?.id === lead.id && playing}
        onSelect={play}
        priority
      />
      <div className="cx-feature-stack">
        {rest.map((track) => (
          <TrackTile
            key={track.id}
            track={track}
            size="lg"
            active={current?.id === track.id}
            playing={current?.id === track.id && playing}
            onSelect={play}
          />
        ))}
      </div>
    </div>
  );
}
