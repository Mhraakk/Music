"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AtlasArtistRef, AtlasCanvas, AtlasGenre, AtlasPin, AtlasPlaylist, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { AtlasTrackRow } from "./AtlasTrackRow";
import { AtlasPlay } from "./AtlasPlay";
import { AtlasScatter, type ScatterNode } from "./AtlasScatter";
import { useAtlasPreview } from "./useAtlasPreview";
import { nestFor, type AtlasNestId } from "@/lib/atlas/nest";
import { FEELING_ROOMS, type FeelingRoomId } from "@/lib/feelings/taxonomy";

type Payload = {
  ok: boolean;
  genre: AtlasGenre;
  artists: AtlasArtistRef[];
  nearby: AtlasPin[];
  mirrors: AtlasPin[];
  playlists: AtlasPlaylist[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
  canvas: AtlasCanvas;
  nearbyCanvas: AtlasCanvas;
  mirrorCanvas: AtlasCanvas;
  rooms?: FeelingRoomId[];
};

function pinNodes(pins: AtlasPin[], genreHref: (id: string) => string): ScatterNode[] {
  return pins.map((pin) => ({
    id: pin.id,
    label: pin.label,
    href: genreHref(pin.id),
    moreHref: genreHref(pin.id),
    color: pin.color,
    x: pin.x,
    y: pin.y,
    weight: pin.weight,
    previewUrl: pin.previewUrl,
    title: pin.exampleTitle ? `${pin.label} — ${pin.exampleArtist}: ${pin.exampleTitle}` : pin.label,
  }));
}

export function AtlasGenreView({ id, nestId = "atlas" }: { id: string; nestId?: AtlasNestId }) {
  const nest = nestFor(nestId);
  const { preview, stop, now } = useAtlasPreview();
  const [page, setPage] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [scanning, setScanning] = useState(false);
  const [played, setPlayed] = useState<string[]>([]);
  const scanTimer = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setError(null);
    setScanning(false);
    setPlayed([]);
    const path =
      nest.id === "feelings"
        ? `/api/feelings/genre/${encodeURIComponent(id)}?enrich=12`
        : `/api/atlas/genre/${encodeURIComponent(id)}?enrich=12`;
    void fetch(path, { signal: controller.signal })
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
  }, [id, nestId]);

  useEffect(() => {
    return () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, []);

  const artistNodes: ScatterNode[] = useMemo(() => {
    if (!page) return [];
    return page.artists.map((artist) => ({
      id: artist.spotifyArtistId ?? artist.name,
      label: artist.name,
      href: nest.artistHref(artist.name),
      moreHref: nest.artistHref(artist.name),
      color: artist.color ?? "#888",
      x: artist.x,
      y: artist.y,
      weight: artist.weight || 100,
      previewUrl: artist.previewUrl,
      title: artist.exampleTitle ? `${artist.name}: ${artist.exampleTitle}` : artist.name,
      played: played.includes(artist.name),
    }));
  }, [page, played, nest]);

  function markPlayed(name: string) {
    setPlayed((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  function playArtist(artist: AtlasArtistRef) {
    markPlayed(artist.name);
    preview(artist.previewUrl, artist.name);
  }

  function stopScan() {
    setScanning(false);
    if (scanTimer.current) {
      window.clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    stop();
  }

  function scanStep(artists: AtlasArtistRef[], already: string[]) {
    const pool = artists.filter((artist) => artist.scan && artist.previewUrl && !already.includes(artist.name));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) {
      setScanning(false);
      return;
    }
    playArtist(pick);
    const nextPlayed = [...already, pick.name];
    scanTimer.current = window.setTimeout(() => scanStep(artists, nextPlayed), 6000);
  }

  function toggleScan() {
    if (!page) return;
    if (scanning) {
      stopScan();
      return;
    }
    setScanning(true);
    scanStep(page.artists, played);
  }

  if (error) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href={nest.rootHref}>{nest.rootLabel}</Link>
        </p>
        <h1 className="cx-atlas-display">{id}</h1>
        <p className="cx-body">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="cx-atlas">
        <p className="cx-kicker">
          <Link href={nest.rootHref}>{nest.rootLabel}</Link>
        </p>
        <h1 className="cx-atlas-display">Opening…</h1>
      </div>
    );
  }

  const allow = nest.allowGenreIds;
  const nearby = allow ? page.nearby.filter((pin) => allow.has(pin.id)) : page.nearby;
  const mirrors = allow ? page.mirrors.filter((pin) => allow.has(pin.id)) : page.mirrors;

  return (
    <div className="cx-atlas">
      <p className="cx-kicker">
        <Link href={nest.rootHref}>{nest.rootLabel}</Link>
        {nest.id === "feelings" && page.rooms?.length
          ? ` · ${page.rooms
              .map((roomId) => FEELING_ROOMS.find((room) => room.id === roomId)?.title.replace(/\.$/, ""))
              .filter(Boolean)
              .join(" · ")}`
          : page.genre.family !== "other"
            ? ` · ${page.genre.family}`
            : ""}
      </p>
      <h1 className="cx-atlas-display">{page.genre.label}</h1>
      <p className="cx-body cx-atlas-lede">
        Artists on this map, then nearby and mirror branches, then The Sound / Intro / Pulse / Edge / New. Play
        resolves on Apple Music. Genre is navigation only.
      </p>

      <div className="cx-atlas-toolbar">
        <button type="button" className="cx-atlas-tab" onClick={toggleScan} aria-pressed={scanning}>
          {scanning ? "stop" : "scan"}
        </button>
        <button type="button" className="cx-atlas-tab" onClick={() => setView("map")} aria-pressed={view === "map"}>
          Directory
        </button>
        <button type="button" className="cx-atlas-tab" onClick={() => setView("list")} aria-pressed={view === "list"}>
          Examples
        </button>
        {page.playlists.map((playlist) => (
          <Link
            key={`${playlist.kind}-${playlist.id}`}
            href={nest.playlistHref(playlist, page.genre.id)}
            className="cx-atlas-tab"
          >
            {playlist.kind === "sound" ? "playlist" : playlist.kind}
          </Link>
        ))}
      </div>

      <AtlasPlay
        genre={page.genre.id}
        fallbackTracks={page.libraryTracks}
        title={page.genre.label}
        label="Play this branch"
        surface={nest.id}
      />

      {page.playlists.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Playlists on this <em>branch.</em>
            </h2>
          </div>
          <ol className="cx-atlas-list">
            {page.playlists.map((playlist) => (
              <li key={`pl-${playlist.id}`}>
                <div className="cx-atlas-list-row cx-atlas-playlist-row">
                  <Link
                    href={nest.playlistHref(playlist, page.genre.id)}
                    className="cx-atlas-list-label"
                  >
                    {playlist.title}
                  </Link>
                  <span className="cx-atlas-list-eg">{playlist.kind}</span>
                  {playlist.kind !== "new" ? (
                    <a href={playlist.url} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
                      Spotify
                    </a>
                  ) : (
                    <a href={playlist.url} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
                      NRbG
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {view === "map" ? (
        <AtlasScatter
          items={artistNodes}
          canvas={page.canvas}
          fit="canvas"
          tone="paper"
          mode="preview"
          label={`${page.genre.label} artists`}
          onPreview={(item) => {
            const artist = page.artists.find((row) => row.name === item.label);
            if (artist) playArtist(artist);
            else preview(item.previewUrl, item.id);
          }}
        />
      ) : (
        <ol className="cx-atlas-list">
          {page.artists.map((artist) => (
            <li key={`list-${artist.name}`}>
              <div className="cx-atlas-list-row is-plain">
                <button
                  type="button"
                  className="cx-atlas-list-label"
                  onClick={() => playArtist(artist)}
                >
                  {now === artist.name ? "♪ " : ""}
                  {artist.name}
                </button>
                <span className="cx-atlas-list-eg">{artist.exampleTitle ?? "Open artist"}</span>
                <Link href={nest.artistHref(artist.name)} className="cx-outbound-link">
                  »
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}

      {nearby.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Nearby <em>branches.</em>
            </h2>
          </div>
          <AtlasScatter
            items={pinNodes(nearby, nest.genreHref)}
            canvas={page.nearbyCanvas}
            fit="canvas"
            tone="nearby"
            mode="open"
            label="Nearby genres"
            onPreview={(item) => preview(item.previewUrl, item.id)}
          />
        </section>
      )}

      {mirrors.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Mirror <em>branches.</em>
            </h2>
          </div>
          <AtlasScatter
            items={pinNodes(mirrors, nest.genreHref)}
            canvas={page.mirrorCanvas}
            fit="canvas"
            tone="mirror"
            mode="open"
            label="Mirror genres"
            onPreview={(item) => preview(item.previewUrl, item.id)}
          />
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
    </div>
  );
}
