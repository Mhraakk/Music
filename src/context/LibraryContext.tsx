"use client";

/**
 * The listener's Apple Music library, admitted into the substrate and cached
 * locally so tens of thousands of Favorite Songs can circulate without being
 * dumped into React state or the first HTML document.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LibraryTrack } from "@/lib/library";
import type { EmotionalVector } from "@/lib/drift/ontology";
import { FAVORITE_SONGS_PLAYLIST_ID } from "@/lib/apple/playlist";
import {
  circulateFavorites,
  colorRankFavorites,
  favoriteArtistProbes,
  sampleTasteVectors,
  searchFavorites,
} from "@/lib/apple/circulation";
import { loadFavorites, putFavorites, readMeta, writeMeta } from "@/lib/apple/store";
import { authorizeAppleMusic, disconnectAppleMusic } from "@/lib/apple/musickit-client";
import { publishCirculating } from "@/lib/apple/publish";
import { usePlayerActions } from "@/context/PlayerContext";

export type LibraryStatus = {
  configured: boolean;
  connected: boolean;
  syncing: boolean;
  synced: number;
  total: number | null;
  error: string | null;
  missing: string[];
};

export type LibraryState = LibraryStatus & {
  circulating: LibraryTrack[];
  tasteVectors: EmotionalVector[];
  probeArtists: { artist: string; via: string }[];
  excludeIds: string[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  searchLocal: (query: string) => LibraryTrack[];
  colorLocal: (hex: string) => LibraryTrack[];
};

const Context = createContext<LibraryState | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { ingest } = usePlayerActions();
  const favoritesRef = useRef<LibraryTrack[]>([]);
  const [circulating, setCirculating] = useState<LibraryTrack[]>([]);
  const [tasteVectors, setTasteVectors] = useState<EmotionalVector[]>([]);
  const [probeArtists, setProbeArtists] = useState<{ artist: string; via: string }[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<LibraryStatus>({
    configured: false,
    connected: false,
    syncing: false,
    synced: 0,
    total: null,
    error: null,
    missing: [],
  });
  const syncing = useRef(false);

  const applyFavorites = useCallback(
    (tracks: LibraryTrack[]) => {
      favoritesRef.current = tracks;
      const window = circulateFavorites(tracks);
      publishCirculating(window);
      ingest(window);
      setCirculating(window);
      setTasteVectors(sampleTasteVectors(tracks));
      setProbeArtists(favoriteArtistProbes(tracks));
      setExcludeIds(tracks.slice(0, 400).map((t) => t.id));
      setStatus((s) => ({
        ...s,
        synced: tracks.length,
        connected: s.connected || tracks.length > 0,
      }));
    },
    [ingest]
  );

  useEffect(() => {
    void (async () => {
      const [cached, meta, session] = await Promise.all([
        loadFavorites(),
        readMeta(),
        fetch("/api/library/sync")
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (cached.length) applyFavorites(cached);
      setStatus((s) => ({
        ...s,
        configured: Boolean(session?.configured),
        connected: Boolean(session?.authenticated) || cached.length > 0,
        synced: cached.length,
        total: meta?.total ?? session?.stats?.favorites ?? cached.length,
        missing: session?.missing ?? [],
      }));
    })();
  }, [applyFavorites]);

  useEffect(() => {
    const tick = () => {
      const window = circulateFavorites(favoritesRef.current);
      publishCirculating(window);
      setCirculating(window);
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const syncLoop = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    let offset = (await readMeta())?.offset ?? 0;
    let total: number | null = (await readMeta())?.total ?? null;

    try {
      for (let pages = 0; pages < 400; pages++) {
        const response = await fetch("/api/library/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offset, playlistId: FAVORITE_SONGS_PLAYLIST_ID }),
        });
        const payload = (await response.json()) as {
          tracks?: LibraryTrack[];
          nextOffset?: number | null;
          total?: number | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? `sync ${response.status}`);

        if (payload.tracks?.length) {
          await putFavorites(payload.tracks);
          applyFavorites(await loadFavorites());
          total = payload.total ?? total;
          setStatus((s) => ({
            ...s,
            total: total ?? favoritesRef.current.length,
            connected: true,
          }));
        }

        await writeMeta({
          playlistId: FAVORITE_SONGS_PLAYLIST_ID,
          offset: payload.nextOffset ?? offset,
          total,
          synced: favoritesRef.current.length,
          updatedAt: Date.now(),
        });

        if (payload.nextOffset == null) break;
        offset = payload.nextOffset;
      }
    } catch (error) {
      setStatus((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Could not sync Favorite Songs.",
      }));
    } finally {
      syncing.current = false;
      setStatus((s) => ({ ...s, syncing: false }));
    }
  }, [applyFavorites]);

  const connect = useCallback(async () => {
    setStatus((s) => ({ ...s, error: null }));
    try {
      await authorizeAppleMusic();
      setStatus((s) => ({ ...s, connected: true, configured: true }));
      await syncLoop();
    } catch (error) {
      setStatus((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Apple Music authorization failed.",
      }));
    }
  }, [syncLoop]);

  const disconnect = useCallback(async () => {
    await disconnectAppleMusic();
    setStatus((s) => ({ ...s, connected: false, syncing: false }));
  }, []);

  const searchLocal = useCallback(
    (query: string) => searchFavorites(favoritesRef.current, query),
    []
  );
  const colorLocal = useCallback(
    (hex: string) => colorRankFavorites(favoritesRef.current, hex),
    []
  );

  const value = useMemo<LibraryState>(
    () => ({
      ...status,
      circulating,
      tasteVectors,
      probeArtists,
      excludeIds,
      connect,
      disconnect,
      searchLocal,
      colorLocal,
    }),
    [
      status,
      circulating,
      tasteVectors,
      probeArtists,
      excludeIds,
      connect,
      disconnect,
      searchLocal,
      colorLocal,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

const EMPTY: LibraryState = {
  configured: false,
  connected: false,
  syncing: false,
  synced: 0,
  total: null,
  error: null,
  missing: [],
  circulating: [],
  tasteVectors: [],
  probeArtists: [],
  excludeIds: [],
  connect: async () => undefined,
  disconnect: async () => undefined,
  searchLocal: () => [],
  colorLocal: () => [],
};

export function useLibrary(): LibraryState {
  return useContext(Context) ?? EMPTY;
}
