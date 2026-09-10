"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasFamily, AtlasGenre } from "@/lib/everynoise/types";
import { usePlayerActions } from "@/context/PlayerContext";
import type { LibraryTrack } from "@/lib/library";

const FAMILIES: { id: AtlasFamily; label: string }[] = [
  { id: "electronic", label: "Electronic" },
  { id: "ambient", label: "Ambient" },
  { id: "club", label: "Club" },
  { id: "all", label: "Every branch" },
];

export function AtlasSurface() {
  const router = useRouter();
  const { ingest, playQueue } = usePlayerActions();
  const [family, setFamily] = useState<AtlasFamily>("electronic");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genres, setGenres] = useState<AtlasGenre[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistDraft, setArtistDraft] = useState("");
  const [harvesting, setHarvesting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ family, limit: "480" });
    if (debounced) params.set("q", debounced);
    void fetch(`/api/atlas?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`atlas ${response.status}`);
        return response.json() as Promise<{ genres: AtlasGenre[]; total: number }>;
      })
      .then((payload) => {
        setGenres(payload.genres ?? []);
        setTotal(payload.total ?? 0);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("The map is still waking. Try again in a moment.");
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [family, debounced]);

  const bounds = useMemo(() => {
    if (!genres.length) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = genres.map((g) => g.x);
    const ys = genres.map((g) => g.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [genres]);

  const plotted = useMemo(() => {
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    return genres.slice(0, 360).map((genre) => ({
      ...genre,
      nx: (genre.x - bounds.minX) / spanX,
      ny: (genre.y - bounds.minY) / spanY,
    }));
  }, [genres, bounds]);

  const openArtist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(`/atlas/artist?name=${encodeURIComponent(trimmed)}`);
  };

  const harvestFamily = async () => {
    setHarvesting(true);
    try {
      const response = await fetch("/api/atlas/harvest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: debounced || family, limit: 10 }),
      });
      const payload = (await response.json()) as { tracks?: LibraryTrack[]; title?: string };
      const tracks = payload.tracks ?? [];
      if (tracks.length) {
        ingest(tracks);
        playQueue(tracks, payload.title ?? "Atlas");
      }
    } finally {
      setHarvesting(false);
    }
  };

  return (
    <div className="cx-atlas">
      <header className="cx-atlas-hero">
        <h1 className="cx-atlas-display">
          Every <em>branch.</em>
        </h1>
        <p className="cx-body cx-atlas-lede">
          Six thousand rooms from everynoise.com. Navigation only. Tap a branch, then an artist on Apple, Spotify, YouTube Music, and SoundCloud.
        </p>
      </header>

      <div className="cx-atlas-toolbar">
        <div className="cx-atlas-tabs" role="tablist" aria-label="Family">
          {FAMILIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={family === item.id}
              className="cx-atlas-tab"
              onClick={() => setFamily(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="cx-atlas-search">
          <span className="sr-only">Search branches</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="trip hop, techno, DJ Krush…"
          />
        </label>
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
            placeholder="Open DJ Krush"
          />
        </form>
        <button type="button" className="cx-pill cx-pill-primary" onClick={() => void harvestFamily()} disabled={harvesting}>
          {harvesting ? "Gathering…" : "Play this family"}
        </button>
      </div>

      <p className="cx-meta">
        {busy ? "Reading the map…" : `${total.toLocaleString()} branches in view`}
        {error ? ` · ${error}` : ""}
      </p>

      <div className="cx-atlas-field" aria-label="Genre map">
        {plotted.map((genre) => (
          <Link
            key={genre.id}
            href={`/atlas/genre/${genre.id}`}
            className="cx-atlas-node"
            style={{ left: `${genre.nx * 100}%`, top: `${genre.ny * 100}%` }}
            title={genre.exampleTitle ? `${genre.exampleArtist}: ${genre.exampleTitle}` : genre.label}
          >
            <span className="cx-atlas-dot" style={{ background: genre.color }} />
            <span>{genre.label}</span>
          </Link>
        ))}
      </div>

      <ol className="cx-atlas-list">
        {genres.slice(0, 80).map((genre) => (
          <li key={`list-${genre.id}`}>
            <Link href={`/atlas/genre/${genre.id}`} className="cx-atlas-list-row">
              <span className="cx-atlas-dot" style={{ background: genre.color }} />
              <span className="cx-atlas-list-label">{genre.label}</span>
              <span className="cx-atlas-list-eg">
                {genre.exampleArtist && genre.exampleTitle
                  ? `${genre.exampleArtist}: ${genre.exampleTitle}`
                  : "Open branch"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
