"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasCanvas, AtlasFamily, AtlasGenre } from "@/lib/everynoise/types";
import { AtlasPlay } from "./AtlasPlay";
import { AtlasScatter, type ScatterNode } from "./AtlasScatter";
import { useAtlasPreview } from "./useAtlasPreview";

const FAMILIES: { id: AtlasFamily; label: string }[] = [
  { id: "all", label: "Every branch" },
  { id: "electronic", label: "Electronic" },
  { id: "ambient", label: "Ambient" },
  { id: "club", label: "Club" },
];

const EMPTY_CANVAS: AtlasCanvas = { width: 1610, height: 22683 };

export function AtlasSurface() {
  const router = useRouter();
  const { preview } = useAtlasPreview();
  const [family, setFamily] = useState<AtlasFamily>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genres, setGenres] = useState<AtlasGenre[]>([]);
  const [listed, setListed] = useState<AtlasGenre[]>([]);
  const [canvas, setCanvas] = useState<AtlasCanvas>(EMPTY_CANVAS);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistDraft, setArtistDraft] = useState("");
  const [view, setView] = useState<"map" | "list">("map");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ family, limit: "8000" });
    if (debounced) params.set("q", debounced);
    else params.set("fields", "map");
    void fetch(`/api/atlas?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`atlas ${response.status}`);
        return response.json() as Promise<{
          genres: AtlasGenre[];
          listed?: AtlasGenre[];
          total: number;
          canvas?: AtlasCanvas;
        }>;
      })
      .then((payload) => {
        setGenres(payload.genres ?? []);
        setListed(payload.listed ?? payload.genres ?? []);
        setTotal(payload.total ?? 0);
        if (payload.canvas?.width && payload.canvas?.height) setCanvas(payload.canvas);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("The map is still waking. Try again in a moment.");
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [family, debounced]);

  const nodes: ScatterNode[] = useMemo(
    () =>
      genres.map((genre) => ({
        id: genre.id,
        label: genre.label,
        href: `/atlas/genre/${genre.id}`,
        color: genre.color,
        x: genre.x,
        y: genre.y,
        weight: genre.weight,
        previewUrl: genre.previewUrl,
        title: genre.exampleTitle ? `${genre.label} — ${genre.exampleArtist}: ${genre.exampleTitle}` : genre.label,
      })),
    [genres]
  );

  const onPreview = useCallback(
    (item: ScatterNode) => {
      preview(item.previewUrl, item.id);
    },
    [preview]
  );

  const fit = family === "all" && !debounced ? "canvas" : "bounds";

  const openArtist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(`/atlas/artist?name=${encodeURIComponent(trimmed)}`);
  };

  const listRows = debounced ? genres : listed;

  return (
    <div className="cx-atlas">
      <header className="cx-atlas-hero">
        <h1 className="cx-atlas-display">
          Every <em>branch.</em>
        </h1>
        <p className="cx-body cx-atlas-lede">
          The everynoise.com map, inside Resonant. Tap a branch, an artist, or The Sound / Intro / Pulse / Edge.
          Apple Music first. Genre never lands on the catalog.
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
            placeholder="find artist"
          />
        </form>
        <div className="cx-atlas-tabs" role="tablist" aria-label="Map or list">
          <button type="button" className="cx-atlas-tab" role="tab" aria-selected={view === "map"} onClick={() => setView("map")}>
            map
          </button>
          <button type="button" className="cx-atlas-tab" role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>
            list
          </button>
        </div>
        <AtlasPlay query={debounced || (family === "all" ? "" : family)} fallbackTracks={[]} title="Atlas" label="Play this view" />
      </div>

      <p className="cx-meta">
        {busy ? "Reading the map…" : `${total.toLocaleString()} branches on everynoise.com`}
        {!busy && genres.length !== total ? ` · ${genres.length.toLocaleString()} in this frame` : ""}
        {error ? ` · ${error}` : ""}
      </p>

      {view === "map" ? (
        <AtlasScatter
          items={nodes}
          canvas={canvas}
          fit={fit}
          tone="paper"
          mode="open"
          label="Every Noise genre map"
          onPreview={onPreview}
        />
      ) : (
        <AtlasBranchList genres={listRows} />
      )}
    </div>
  );
}

function AtlasBranchList({ genres }: { genres: AtlasGenre[] }) {
  const [shown, setShown] = useState(80);

  useEffect(() => {
    setShown(80);
  }, [genres]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1200) {
        setShown((n) => Math.min(n + 80, genres.length));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [genres.length]);

  const slice = genres.slice(0, shown);

  return (
    <ol className="cx-atlas-list">
      {slice.map((genre) => (
        <li key={`list-${genre.id}`}>
          <Link href={`/atlas/genre/${genre.id}`} className="cx-atlas-list-row" prefetch={false}>
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
  );
}