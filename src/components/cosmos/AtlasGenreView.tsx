"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AtlasArtistRef, AtlasCanvas, AtlasGenre, AtlasPin, AtlasPlaylist, AtlasTrackCard } from "@/lib/everynoise/types";
import type { LibraryTrack } from "@/lib/library";
import { AtlasTrackRow } from "./AtlasTrackRow";
import { AtlasPlay } from "./AtlasPlay";
import { AtlasScatter, type ScatterNode } from "./AtlasScatter";
import { useAtlasPreview } from "./useAtlasPreview";

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
};

function pinNodes(pins: AtlasPin[]): ScatterNode[] {
  return pins.map((pin) => ({
    id: pin.id,
    label: pin.label,
    href: `/atlas/genre/${pin.id}`,
    moreHref: `/atlas/genre/${pin.id}`,
    color: pin.color,
    x: pin.x,
    y: pin.y,
    weight: pin.weight,
    previewUrl: pin.previewUrl,
    title: pin.exampleTitle ? `${pin.label} — ${pin.exampleArtist}: ${pin.exampleTitle}` : pin.label,
  }));
}

export function AtlasGenreView({ id }: { id: string }) {
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
      href: `/atlas/artist?name=${encodeURIComponent(artist.name)}`,
      moreHref: `/atlas/artist?name=${encodeURIComponent(artist.name)}`,
      color: artist.color ?? "#888",
      x: artist.x,
      y: artist.y,
      weight: artist.weight || 100,
      previewUrl: artist.previewUrl,
      title: artist.exampleTitle ? `${artist.name}: ${artist.exampleTitle}` : artist.name,
      played: played.includes(artist.name),
    }));
  }, [page, played]);

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
        <Link href="/atlas">Every Noise at Once</Link>
        {page.genre.family !== "other" ? ` · ${page.genre.family}` : ""}
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
          map
        </button>
        <button type="button" className="cx-atlas-tab" onClick={() => setView("list")} aria-pressed={view === "list"}>
          list
        </button>
        {page.playlists.map((playlist) => (
          <Link
            key={`${playlist.kind}-${playlist.id}`}
            href={
              playlist.kind === "new"
                ? `/atlas/playlist/${encodeURIComponent(playlist.id)}?kind=new&genre=${encodeURIComponent(page.genre.id)}&title=${encodeURIComponent(playlist.title)}`
                : `/atlas/playlist/${encodeURIComponent(playlist.id)}?kind=${encodeURIComponent(playlist.kind)}&genre=${encodeURIComponent(page.genre.id)}&title=${encodeURIComponent(playlist.title)}`
            }
            className="cx-atlas-tab"
          >
            {playlist.kind === "sound" ? "playlist" : playlist.kind}
          </Link>
        ))}
      </div>

      <AtlasPlay genre={page.genre.id} fallbackTracks={page.libraryTracks} title={page.genre.label} label="Play this branch" />

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
                    href={`/atlas/playlist/${encodeURIComponent(playlist.id)}?kind=${encodeURIComponent(playlist.kind)}&genre=${encodeURIComponent(page.genre.id)}&title=${encodeURIComponent(playlist.title)}`}
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
                <Link href={`/atlas/artist?name=${encodeURIComponent(artist.name)}`} className="cx-outbound-link">
                  »
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}

      {page.nearby.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Nearby <em>branches.</em>
            </h2>
          </div>
          <AtlasScatter
            items={pinNodes(page.nearby)}
            canvas={page.nearbyCanvas}
            fit="canvas"
            tone="nearby"
            mode="open"
            label="Nearby genres"
            onPreview={(item) => preview(item.previewUrl, item.id)}
          />
        </section>
      )}

      {page.mirrors.length > 0 && (
        <section className="cx-section">
          <div className="cx-section-head">
            <h2 className="cx-title">
              Mirror <em>branches.</em>
            </h2>
          </div>
          <AtlasScatter
            items={pinNodes(page.mirrors)}
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
