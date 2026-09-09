"use client";

/**
 * DISCOVER SURFACE
 *
 * Search and the wall. The living catalog stays on the server; this island
 * asks `/api/catalog` when the listener searches or asks for more, and only
 * the featured wall is rendered into the first HTML.
 */

import { useEffect, useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { usePlayer } from "@/context/PlayerContext";
import { MasonryGrid } from "./MasonryGrid";
import { NowPlayingSheet } from "./NowPlayingSheet";
import { RoomTint } from "./RoomTint";
import { SearchBar, type SearchMode } from "./SearchBar";
import { SessionMind } from "./SessionMind";
import { TasteExpand } from "./TasteExpand";

const PAGE = 72;

export function DiscoverSurface({ wall, total: catalogTotal }: { wall: LibraryTrack[]; total: number }) {
  const { extras } = usePlayer();
  const [mode, setMode] = useState<SearchMode>({ kind: "none" });
  const [remote, setRemote] = useState<LibraryTrack[] | null>(null);
  const [total, setTotal] = useState(catalogTotal);
  const [offset, setOffset] = useState(wall.length);
  const [more, setMore] = useState<LibraryTrack[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode.kind === "none") {
      setRemote(null);
      setTotal(catalogTotal);
      setOffset(wall.length + more.length);
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
        setRemote(payload.tracks);
        setTotal(payload.total);
        setOffset(payload.tracks.length);
        setBusy(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBusy(false);
      });

    return () => controller.abort();
  }, [mode, catalogTotal]);

  const fresh = extras.filter((t) => t.origin === "expansion");

  const results = useMemo(() => {
    if (mode.kind !== "none") {
      const remoteIds = new Set((remote ?? []).map((t) => t.id));
      const extraHits = fresh.filter((t) => !remoteIds.has(t.id));
      return [...extraHits, ...(remote ?? [])];
    }
    const rest = [...wall, ...more].filter((t) => !fresh.some((e) => e.id === t.id));
    return [...fresh, ...rest];
  }, [mode.kind, remote, wall, more, fresh]);

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
      if (mode.kind === "none") {
        setMore((prev) => {
          const seen = new Set([...wall, ...prev].map((t) => t.id));
          return [...prev, ...payload.tracks.filter((t) => !seen.has(t.id))];
        });
      } else {
        setRemote((prev) => {
          const seen = new Set((prev ?? []).map((t) => t.id));
          return [...(prev ?? []), ...payload.tracks.filter((t) => !seen.has(t.id))];
        });
      }
      setTotal(payload.total);
      setOffset(offset + payload.tracks.length);
    } catch {
      /* keep the wall that already rendered */
    } finally {
      setBusy(false);
    }
  }

  const canShowMore = results.length < total;

  return (
    <>
      <RoomTint searchColor={mode.kind === "color" ? mode.hex : null} />

      <div className="sticky top-0 z-40 -mx-4 mb-4 bg-[var(--paper)]/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <SearchBar
          mode={mode}
          onChange={setMode}
          resultCount={mode.kind === "none" ? null : busy && !remote ? null : results.length}
        />
        <div className="mt-3">
          <TasteExpand />
        </div>
      </div>

      <SessionMind />

      <MasonryGrid tracks={results} />

      {canShowMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="cx-pill cx-pill-ghost h-10 px-4 disabled:opacity-50"
            onClick={() => void showMore()}
            disabled={busy}
          >
            {busy ? "Loading…" : "Show more of the map"}
          </button>
        </div>
      )}

      <div className="h-40" aria-hidden />

      <NowPlayingSheet />
    </>
  );
}
