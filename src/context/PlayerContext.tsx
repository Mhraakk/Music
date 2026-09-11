"use client";

/**
 * PLAYER
 *
 * The visual surface's playback state. Deliberately separate from
 * `DriftContext`, which models a session as a coordinate-pair journey chosen up
 * front. Here the entry point is a sleeve: you tap artwork, it plays, and the
 * cognitive engine takes over from wherever that landed you.
 *
 * The engine is still the brain. When a track finishes, the next one comes from
 * `get_next_emotional_drift` over MCP rather than from a queue — so browsing by
 * eye and drifting by feeling are the same session. Volume gestures during
 * vocal fragility windows are still the load-bearing implicit signal, and
 * abandoning a track early still prunes.
 *
 * What changed is that audio is now real. Every position resolves to a
 * 30-second Apple preview at build time, so there is no silent mode to design
 * around and no credentials to configure.
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
import type { BranchState } from "@/lib/drift/algorithm";
import type { ResonanceReading, ResonanceSignal, ResonanceSignalKind } from "@/lib/drift/resonance";
import type { EmotionalVector } from "@/lib/drift/ontology";
import { adjacentCoordinates, type CoordinateId } from "@/lib/drift/topography";
import { getNextEmotionalDrift } from "@/lib/mcp/client";
import type { CognitionTrace } from "@/lib/mcp/cognition";
import { fragilityFromWindows, type FragilityWindow } from "@/context/DriftContext";
import { compactOverlay, publishLoved } from "@/lib/apple/publish";
import { isSoundcloudTrack, youtubeVideoId } from "@/lib/converse/anywhere";
import { loadLoved, toggleLoved } from "@/lib/likes/store";
import { loadRefused, roomsFromRefused, toggleRefused } from "@/lib/refuse/store";

/** Crossfade length. Previews are 30s, so a 6.5s fade would eat a fifth of one. */
const FADE_MS = 2200;

/** A volume drag is one statement, not fifty. */
const GESTURE_SETTLE_MS = 420;

/** Below this the listener is judged to have walked out rather than finished. */
const ABANDON_BEFORE = 0.85;

export type PlayerState = {
  sessionId: string;
  current: LibraryTrack | null;
  playing: boolean;
  /** Normalised position in the current track. */
  progress: number;
  volume: number;
  /** Vocal fragility at the current position. */
  fragilityNow: number;
  /** Positions played this session, oldest first. */
  historyIds: string[];
  reading: ResonanceReading | null;
  /** How the last drift decision was made — local cognition or verified Gemini. */
  cognition: CognitionTrace | null;
  /** Named region the engine is drifting toward. */
  destination: CoordinateId;
  /** True once the listener names a destination; otherwise the engine infers one. */
  destinationLocked: boolean;
  branches: BranchState;
  loading: boolean;
  /** Set when the engine, not the listener, chose the current track. */
  fromEngine: boolean;
  error: string | null;
  /** Session-generated positions, merged on top of the server library. */
  extras: LibraryTrack[];
  /** Vectors of heard positions, oldest first — taste for expansion. */
  tasteVectors: EmotionalVector[];
  /** Remaining songs from an Ask mix. Empty means the engine owns what follows. */
  queue: LibraryTrack[];
  queueTitle: string | null;
  /** True when the current track was started by Ask rather than a sleeve tap. */
  fromAsk: boolean;
  /** How the current recording is sounding — YouTube full listen is Nuclear-style. */
  listenVia: "preview" | "youtube" | "soundcloud" | null;
  /** Duration in seconds when listening via YouTube. */
  nuclearDuration: number | null;
  /** Seek request for the YouTube player, 0–1. */
  nuclearSeekAt: number | null;
  /** Recordings the listener marked on Resonant. Feeds the next drift. */
  likedIds: string[];
  /** Recordings the listener refused. Harvests exclude these. Does not skip. */
  dislikedIds: string[];
  /** Map rooms refused with those recordings. */
  refusedRooms: CoordinateId[];
};

export type PlayerActions = {
  /** Play a track the listener picked. Resets the drift to start from here. */
  play: (track: LibraryTrack, options?: { keepQueue?: boolean; fromAsk?: boolean }) => void;
  /** Start a mix Ask assembled. First song plays; the rest queue, then the engine continues. */
  playQueue: (tracks: LibraryTrack[], title?: string) => void;
  toggle: () => void;
  setVolume: (v: number) => void;
  seek: (progress: number) => void;
  stop: () => void;
  /** Admit newly generated positions into the client library. */
  ingest: (tracks: LibraryTrack[]) => void;
  /** Name a destination on the emotional map. The engine drifts toward it. */
  setDestination: (id: CoordinateId) => void;
  /** YouTube full-listen progress (Nuclear-style embed). */
  nuclearTick: (progress: number, durationSec: number) => void;
  nuclearEnded: () => void;
  /** YouTube embed blocked — fall back to the Apple preview if we have one. */
  nuclearFailed: () => void;
  /** Heart the current recording, or a specific one. Does not skip. */
  toggleLike: (track?: LibraryTrack) => void;
  /** Refuse this recording and its mood. Does not skip. */
  toggleDislike: (track?: LibraryTrack) => void;
  /** Pause the main listen so an atlas preview can sound alone. Does not skip. */
  pause: () => void;
};

const StateContext = createContext<PlayerState | null>(null);
const ActionsContext = createContext<PlayerActions | null>(null);

const INITIAL: PlayerState = {
  sessionId: "",
  current: null,
  playing: false,
  progress: 0,
  volume: 0.8,
  fragilityNow: 0,
  historyIds: [],
  reading: null,
  cognition: null,
  destination: "cinematic_warmth",
  destinationLocked: false,
  branches: {},
  loading: false,
  fromEngine: false,
  error: null,
  extras: [],
  tasteVectors: [],
  queue: [],
  queueTitle: null,
  fromAsk: false,
  listenVia: null,
  nuclearDuration: null,
  nuclearSeekAt: null,
  likedIds: [],
  dislikedIds: [],
  refusedRooms: [],
};

/**
 * Fragility windows are derived from the emotional vector in the same way the
 * server does it, so the client can weight a gesture without a round trip.
 * Kept in sync with `fragilityWindows` in `lib/drift/catalog.ts`.
 */
function windowsFor(vector: EmotionalVector): FragilityWindow[] {
  const { fragility, narrative } = vector;
  if (fragility < 0.34) return [];
  const count = narrative > 0.66 ? 3 : narrative > 0.44 ? 2 : 1;
  const width = Math.min(1, 0.1 + fragility * 0.12);
  const windows: FragilityWindow[] = [];
  for (let i = 0; i < count; i++) {
    const centre = 0.18 + ((i + 1) / (count + 1)) * 0.64;
    const intensity = Math.min(1, fragility * (0.78 + (i / Math.max(1, count - 1 || 1)) * 0.22));
    windows.push({
      start: Math.max(0, centre - width / 2),
      end: Math.min(1, centre + width / 2),
      intensity,
    });
  }
  return windows;
}

function inferDestination(origin: CoordinateId): CoordinateId {
  const next = adjacentCoordinates(origin, 1)[0];
  return next?.id ?? "cinematic_warmth";
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PlayerProvider({
  children,
  sessionId,
  tracks = [],
}: {
  children: ReactNode;
  sessionId?: string;
  /**
   * Optional seed of already-rendered sleeves. Engine-chosen ids that are not
   * in this list are resolved through `/api/catalog` so the homepage does not
   * have to inline the living catalog.
   */
  tracks?: LibraryTrack[];
}) {
  const [state, setState] = useState<PlayerState>({
    ...INITIAL,
    sessionId: sessionId ?? "",
  });

  const byId = useMemo(() => {
    const map = new Map(tracks.map((t) => [t.id, t]));
    for (const extra of state.extras) map.set(extra.id, extra);
    return map;
  }, [tracks, state.extras]);
  const extrasRef = useRef<LibraryTrack[]>([]);
  extrasRef.current = state.extras;

  const lookup = useCallback((id: string) => byId.get(id) ?? null, [byId]);

  const rememberTrack = useCallback((track: LibraryTrack) => {
    trackVectorCache.set(track.id, track.vector);
  }, []);

  const resolveTrack = useCallback(
    async (id: string): Promise<LibraryTrack | null> => {
      const local = lookup(id);
      if (local) return local;
      try {
        const { readFavorite } = await import("@/lib/apple/store");
        const cached = await readFavorite(id);
        if (cached) {
          rememberTrack(cached);
          const extras = [...extrasRef.current.filter((t) => t.id !== cached.id), cached];
          extrasRef.current = extras;
          setState((s) => ({ ...s, extras }));
          return cached;
        }
      } catch {
        /* IndexedDB unavailable */
      }
      try {
        const response = await fetch(`/api/catalog?ids=${encodeURIComponent(id)}`);
        if (!response.ok) return null;
        const payload = (await response.json()) as { tracks?: LibraryTrack[] };
        const track = payload.tracks?.[0] ?? null;
        if (track) {
          rememberTrack(track);
          const extras = [...extrasRef.current.filter((t) => t.id !== track.id), track];
          extrasRef.current = extras;
          setState((s) => ({ ...s, extras }));
        }
        return track;
      } catch {
        return null;
      }
    },
    [lookup, rememberTrack]
  );

  /**
   * Two audio elements so a track can fade into the next while the outgoing one
   * is still sounding. A single element would have to stop before it started.
   */
  const lanes = useRef<[HTMLAudioElement, HTMLAudioElement] | null>(null);
  const activeLane = useRef<0 | 1>(0);
  const fadeTimers = useRef<number[]>([]);
  const gestureTimer = useRef<number | null>(null);
  const gestureFrom = useRef<number | null>(null);
  const advancing = useRef(false);
  const handover = useRef(false);

  /** Async advancement reads these rather than the render's closed-over state. */
  const live = useRef({
    current: null as LibraryTrack | null,
    progress: 0,
    fragilityNow: 0,
    historyIds: [] as string[],
    signals: [] as ResonanceSignal[],
    branches: {} as BranchState,
    volume: 0.8,
    windows: [] as FragilityWindow[],
    destination: "cinematic_warmth" as CoordinateId,
    destinationLocked: false,
    tasteVectors: [] as EmotionalVector[],
    sessionId: sessionId ?? "",
    queue: [] as LibraryTrack[],
    queueTitle: null as string | null,
    listenVia: null as PlayerState["listenVia"],
    fromEngine: false,
    fromAsk: false,
  });
  const dislikedRef = useRef<string[]>([]);
  const playGen = useRef(0);
  const skipYoutubeFor = useRef<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      live.current.sessionId = sessionId;
      return;
    }
    setState((s) => {
      if (s.sessionId) {
        live.current.sessionId = s.sessionId;
        return s;
      }
      const id = newSessionId();
      live.current.sessionId = id;
      return { ...s, sessionId: id };
    });
  }, [sessionId]);

  const ensureLanes = useCallback((): [HTMLAudioElement, HTMLAudioElement] => {
    if (!lanes.current) {
      const make = () => {
        const el = new Audio();
        el.preload = "auto";
        // Previews are cross-origin; anonymous mode keeps them cacheable and
        // avoids sending credentials to Apple's CDN.
        el.crossOrigin = "anonymous";
        return el;
      };
      lanes.current = [make(), make()];
    }
    return lanes.current;
  }, []);

  const clearFades = useCallback(() => {
    for (const t of fadeTimers.current) window.clearInterval(t);
    fadeTimers.current = [];
  }, []);

  /**
   * Equal-power fade on element volume. Web Audio would give a cleaner curve,
   * but routing a cross-origin media element through an AudioContext needs CORS
   * headers Apple's preview CDN does not always send, and a failed graph means
   * no audio at all. Element volume always works.
   */
  const fadeLane = useCallback((el: HTMLAudioElement, to: number, ms: number) => {
    const from = el.volume;
    const steps = 24;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      const t = i / steps;
      const shaped = to > from ? Math.sin((t * Math.PI) / 2) : 1 - Math.cos(((1 - t) * Math.PI) / 2);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * shaped));
      if (i >= steps) {
        el.volume = Math.max(0, Math.min(1, to));
        window.clearInterval(timer);
        if (to === 0) {
          el.pause();
          el.removeAttribute("src");
        }
      }
    }, ms / steps);
    fadeTimers.current.push(timer);
  }, []);

  const recordSignal = useCallback((kind: ResonanceSignalKind, overrides: Partial<ResonanceSignal> = {}) => {
    const track = live.current.current;
    const trackId = overrides.trackId ?? track?.id;
    if (!trackId) return;
    const signal: ResonanceSignal = {
      kind,
      trackId,
      progress: live.current.progress,
      fragility: live.current.fragilityNow,
      magnitude: 0.5,
      at: Date.now(),
      ...overrides,
    };
    live.current.signals = [...live.current.signals, signal].slice(-12);
  }, []);

  /** Start a track. Prefer a Nuclear-style full YouTube listen when we can. */
  const sound = useCallback(
    async (track: LibraryTrack, fromEngine: boolean, fromAsk = false) => {
      const gen = ++playGen.current;
      clearFades();
      const pair = ensureLanes();
      const incoming: 0 | 1 = activeLane.current === 0 ? 1 : 0;
      const outgoing = activeLane.current;

      handover.current = false;
      live.current.current = track;
      live.current.windows = windowsFor(track.vector);
      live.current.progress = 0;
      live.current.fragilityNow = 0;
      live.current.listenVia = null;
      live.current.fromEngine = fromEngine;
      live.current.fromAsk = fromAsk;
      if (skipYoutubeFor.current && skipYoutubeFor.current !== track.id) skipYoutubeFor.current = null;
      const skipYoutube = skipYoutubeFor.current === track.id;

      setState((s) => ({
        ...s,
        current: track,
        progress: 0,
        fromEngine,
        fromAsk,
        loading: true,
        error: null,
        listenVia: null,
        nuclearDuration: null,
        nuclearSeekAt: null,
      }));

      let hydrated = track;
      if (!skipYoutube && !youtubeVideoId(track)) {
        try {
          const response = await fetch(
            `/api/stream/nuclear?artist=${encodeURIComponent(track.artist)}&title=${encodeURIComponent(track.title)}`
          );
          const payload = (await response.json()) as { stream?: { videoId?: string; watchUrl?: string } };
          if (gen !== playGen.current) return;
          if (payload.stream?.videoId) {
            hydrated = {
              ...track,
              videoId: payload.stream.videoId,
              videoUrl: payload.stream.watchUrl ?? `https://www.youtube.com/watch?v=${payload.stream.videoId}`,
            };
          }
        } catch {
          /* Apple preview still plays */
        }
      }
      if (gen !== playGen.current) return;

      const yt = skipYoutube ? null : youtubeVideoId(hydrated);
      if (yt) {
        pair.forEach((el) => {
          el.pause();
          el.removeAttribute("src");
        });
        live.current.current = hydrated;
        live.current.listenVia = "youtube";
        setState((s) => ({
          ...s,
          current: hydrated,
          playing: true,
          loading: false,
          error: null,
          listenVia: "youtube",
        }));
        return;
      }

      if (isSoundcloudTrack(hydrated) && !hydrated.previewUrl) {
        pair.forEach((el) => {
          el.pause();
          el.removeAttribute("src");
        });
        live.current.listenVia = "soundcloud";
        setState((s) => ({
          ...s,
          current: hydrated,
          playing: true,
          loading: false,
          error: null,
          listenVia: "soundcloud",
        }));
        return;
      }

      if (!hydrated.previewUrl) {
        pair.forEach((el) => {
          el.pause();
          el.removeAttribute("src");
        });
        setState((s) => ({
          ...s,
          playing: false,
          loading: false,
          error: "No preview — open it on YouTube, SoundCloud or Deezer from the card.",
          listenVia: null,
        }));
        return;
      }

      live.current.listenVia = "preview";
      const el = pair[incoming];
      el.src = hydrated.previewUrl;
      el.currentTime = 0;
      el.volume = 0;

      try {
        await el.play();
      } catch {
        if (gen !== playGen.current) return;
        setState((s) => ({
          ...s,
          playing: false,
          loading: false,
          error: "Playback needs a tap first — browsers block autoplay.",
          listenVia: "preview",
        }));
        return;
      }

      if (gen !== playGen.current) return;
      fadeLane(el, live.current.volume, FADE_MS);
      if (pair[outgoing].src) fadeLane(pair[outgoing], 0, FADE_MS);

      activeLane.current = incoming;
      setState((s) => ({ ...s, current: hydrated, playing: true, loading: false, listenVia: "preview" }));
    },
    [clearFades, ensureLanes, fadeLane]
  );

  /** Ask the engine for the next position and play it. */
  const advance = useCallback(
    async (reason: ResonanceSignalKind) => {
      if (advancing.current) return;
      advancing.current = true;

      try {
        recordSignal(reason, reason === "dwell_complete" ? { progress: 1, fragility: 0 } : {});

        const current = live.current.current;
        if (!current) return;

        setState((s) => ({ ...s, loading: true }));

        const queued = live.current.queue[0];
        if (queued) {
          live.current.queue = live.current.queue.slice(1);
          live.current.historyIds = [...live.current.historyIds, queued.id].slice(-48);
          live.current.tasteVectors = [...live.current.tasteVectors, queued.vector].slice(-24);
          rememberTrack(queued);
          setState((s) => ({
            ...s,
            historyIds: live.current.historyIds,
            tasteVectors: live.current.tasteVectors,
            queue: live.current.queue,
            queueTitle: live.current.queue.length ? live.current.queueTitle : null,
          }));
          await sound(queued, false, true);
          return;
        }
        live.current.queueTitle = null;
        setState((s) => ({ ...s, queue: [], queueTitle: null }));

        // Rolling window: a session has no end, so an unbounded exclusion list
        // would eventually exhaust the pool and force repeats.
        const recentIds = [...new Set([...live.current.historyIds.slice(-24), ...dislikedRef.current])];
        const destination = live.current.destination;
        const outcome = await getNextEmotionalDrift({
          sessionId: live.current.sessionId || newSessionId(),
          origin: current.region,
          destination,
          history: recentIds,
          trajectory: recentIds
            .map((id) => trackVectorCache.get(id))
            .filter((v): v is EmotionalVector => Boolean(v)),
          signals: live.current.signals,
          branches: live.current.branches,
          libraryOverlay: compactOverlay(),
        });

        if (!outcome.ok) {
          handover.current = false;
          setState((s) => ({ ...s, loading: false, playing: false, error: outcome.error }));
          return;
        }

        const { phase, branches, reading, cognition } = outcome.value;
        const next = await resolveTrack(phase.trackId);

        live.current.branches = branches;
        setState((s) => ({ ...s, branches, reading, cognition }));

        if (!next) {
          handover.current = false;
          setState((s) => ({ ...s, loading: false, playing: false, error: "Engine returned an unknown position." }));
          return;
        }

        live.current.historyIds = [...live.current.historyIds, next.id];
        live.current.tasteVectors = [...live.current.tasteVectors, next.vector].slice(-24);
        rememberTrack(next);
        setState((s) => ({
          ...s,
          historyIds: live.current.historyIds,
          tasteVectors: live.current.tasteVectors,
        }));

        await sound(next, true);
      } finally {
        advancing.current = false;
      }
    },
    [recordSignal, rememberTrack, resolveTrack, sound]
  );

  /**
   * Playback and advancement are mutually recursive — finishing a track
   * triggers the next, and starting one schedules the finish. Routing one
   * direction through a ref keeps the interval and the `ended` listener stable
   * instead of being torn down and rebuilt on every progress tick.
   */
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  /* ───────────────────────────── actions ───────────────────────────── */

  const ingest = useCallback((incoming: LibraryTrack[]) => {
    if (!incoming.length) return;
    const map = new Map(extrasRef.current.map((t) => [t.id, t]));
    for (const track of incoming) {
      map.set(track.id, track);
      trackVectorCache.set(track.id, track.vector);
    }
    const all = [...map.values()];
    const expansions = all.filter((t) => t.origin === "expansion" || t.id.startsWith("x-") || t.id.startsWith("w-"));
    const favorites = all.filter((t) => t.origin === "favorite" || t.id.startsWith("f-")).slice(-80);
    const extras = [...expansions, ...favorites];
    extrasRef.current = extras;
    setState((s) => ({ ...s, extras }));
    try {
      window.localStorage.setItem(EXPANSION_KEY, JSON.stringify(expansions));
    } catch {
      /* quota or private mode — the session still has them in memory */
    }
  }, []);

  const applyRefuseState = useCallback((records: { id: string; region: CoordinateId }[]) => {
    const dislikedIds = records.map((row) => row.id);
    const refusedRooms = roomsFromRefused(records);
    dislikedRef.current = dislikedIds;
    setState((s) => ({ ...s, dislikedIds, refusedRooms, branches: { ...live.current.branches } }));
  }, []);

  const toggleLike = useCallback(
    (track?: LibraryTrack) => {
      const target = track ?? live.current.current;
      if (!target) return;
      void (async () => {
        if (dislikedRef.current.includes(target.id)) {
          const { records } = await toggleRefused(target);
          const prior = live.current.branches[target.region];
          if (!records.some((row) => row.region === target.region) && prior?.status === "pruned") {
            live.current.branches = {
              ...live.current.branches,
              [target.region]: { status: "open", visits: prior.visits },
            };
          }
          applyRefuseState(records);
        }
        const { tracks, liked } = await toggleLoved(target);
        publishLoved(tracks);
        setState((s) => ({ ...s, likedIds: tracks.map((row) => row.id) }));
        ingest(tracks);
        if (liked) {
          recordSignal("explicit_like", { magnitude: 1, trackId: target.id });
        }
      })();
    },
    [applyRefuseState, ingest, recordSignal]
  );

  const toggleDislike = useCallback(
    (track?: LibraryTrack) => {
      const target = track ?? live.current.current;
      if (!target) return;
      void (async () => {
        const { records, refused } = await toggleRefused(target);
        if (refused) {
          const lovedTracks = await loadLoved();
          if (lovedTracks.some((row) => row.id === target.id)) {
            const { tracks } = await toggleLoved(target);
            publishLoved(tracks);
            setState((s) => ({ ...s, likedIds: tracks.map((row) => row.id) }));
          }
          const prior = live.current.branches[target.region];
          live.current.branches = {
            ...live.current.branches,
            [target.region]: { status: "pruned", visits: (prior?.visits ?? 0) + 1 },
          };
          live.current.queue = live.current.queue.filter((row) => row.id !== target.id);
          recordSignal("explicit_dislike", { magnitude: 1, trackId: target.id });
          setState((s) => ({
            ...s,
            queue: live.current.queue,
            queueTitle: live.current.queue.length ? live.current.queueTitle : null,
            branches: { ...live.current.branches },
          }));
        } else {
          const prior = live.current.branches[target.region];
          if (!records.some((row) => row.region === target.region) && prior?.status === "pruned") {
            live.current.branches = {
              ...live.current.branches,
              [target.region]: { status: "open", visits: prior.visits },
            };
          }
        }
        applyRefuseState(records);
      })();
    },
    [applyRefuseState, recordSignal]
  );

  useEffect(() => {
    let cancelled = false;
    void loadLoved().then((tracks) => {
      if (cancelled) return;
      publishLoved(tracks);
      ingest(tracks);
      setState((s) => ({ ...s, likedIds: tracks.map((row) => row.id) }));
    });
    void loadRefused().then((records) => {
      if (cancelled) return;
      for (const row of records) {
        const prior = live.current.branches[row.region];
        live.current.branches = {
          ...live.current.branches,
          [row.region]: { status: "pruned", visits: (prior?.visits ?? 0) + 1 },
        };
      }
      applyRefuseState(records);
    });
    return () => {
      cancelled = true;
    };
  }, [applyRefuseState, ingest]);

  const play = useCallback(
    (track: LibraryTrack, options?: { keepQueue?: boolean; fromAsk?: boolean }) => {
      // Choosing something new mid-track is a statement about what was playing.
      if (live.current.current && live.current.progress < ABANDON_BEFORE) {
        recordSignal("abandon", { progress: live.current.progress });
      }
      if (!options?.keepQueue) {
        live.current.queue = [];
        live.current.queueTitle = null;
      }
      live.current.historyIds = [...live.current.historyIds, track.id].slice(-48);
      live.current.tasteVectors = [...live.current.tasteVectors, track.vector].slice(-24);
      rememberTrack(track);
      if (!live.current.destinationLocked) {
        live.current.destination = inferDestination(track.region);
      }
      setState((s) => ({
        ...s,
        historyIds: live.current.historyIds,
        tasteVectors: live.current.tasteVectors,
        destination: live.current.destination,
        queue: live.current.queue,
        queueTitle: live.current.queueTitle,
      }));
      void sound(track, false, options?.fromAsk === true);
    },
    [recordSignal, rememberTrack, sound]
  );

  const playQueue = useCallback(
    (tracks: LibraryTrack[], title?: string) => {
      if (!tracks.length) return;
      const [first, ...rest] = tracks;
      live.current.queue = rest;
      live.current.queueTitle = rest.length ? title?.trim() || "A set for you" : null;
      play(first, { keepQueue: true, fromAsk: true });
    },
    [play]
  );

  const setDestination = useCallback((id: CoordinateId) => {
    live.current.destination = id;
    live.current.destinationLocked = true;
    setState((s) => ({ ...s, destination: id, destinationLocked: true }));
  }, []);

  const toggle = useCallback(() => {
    if (live.current.listenVia === "youtube" || live.current.listenVia === "soundcloud") {
      setState((s) => ({ ...s, playing: !s.playing }));
      return;
    }
    const pair = lanes.current;
    if (!pair || !live.current.current) return;
    const el = pair[activeLane.current];
    if (el.paused) {
      void el.play().catch(() => undefined);
      setState((s) => ({ ...s, playing: true }));
    } else {
      el.pause();
      setState((s) => ({ ...s, playing: false }));
    }
  }, []);

  const pause = useCallback(() => {
    if (live.current.listenVia === "youtube" || live.current.listenVia === "soundcloud") {
      setState((s) => ({ ...s, playing: false }));
      return;
    }
    const pair = lanes.current;
    pair?.[activeLane.current]?.pause();
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      const previous = live.current.volume;
      live.current.volume = clamped;

      const pair = lanes.current;
      if (pair) pair[activeLane.current].volume = clamped;
      setState((s) => ({ ...s, volume: clamped }));

      // Collapse a drag into one signal, captured at the fragility of the
      // moment the hand first moved rather than where it stopped.
      if (gestureFrom.current === null) gestureFrom.current = previous;
      if (gestureTimer.current !== null) window.clearTimeout(gestureTimer.current);
      const fragilityAtGesture = live.current.fragilityNow;

      gestureTimer.current = window.setTimeout(() => {
        const from = gestureFrom.current;
        gestureFrom.current = null;
        gestureTimer.current = null;
        if (from === null) return;
        const delta = clamped - from;
        if (Math.abs(delta) < 0.06) return;
        recordSignal(delta > 0 ? "volume_raise" : "volume_lower", {
          magnitude: Math.abs(delta),
          fragility: fragilityAtGesture,
        });
      }, GESTURE_SETTLE_MS);
    },
    [recordSignal]
  );

  const seek = useCallback(
    (progress: number) => {
      const target = Math.max(0, Math.min(0.99, progress));
      const from = live.current.progress;
      if (live.current.listenVia === "youtube") {
        live.current.progress = target;
        setState((s) => ({ ...s, progress: target, nuclearSeekAt: target }));
        recordSignal(target < from ? "seek_back" : "seek_forward", {
          progress: target,
          fragility: fragilityFromWindows(live.current.windows, target),
        });
        return;
      }
      const pair = lanes.current;
      if (!pair) return;
      const el = pair[activeLane.current];
      if (!el.duration || !Number.isFinite(el.duration)) return;
      el.currentTime = target * el.duration;
      recordSignal(target < from ? "seek_back" : "seek_forward", {
        progress: target,
        fragility: fragilityFromWindows(live.current.windows, target),
      });
    },
    [recordSignal]
  );

  const nuclearTick = useCallback((progress: number, durationSec: number) => {
    if (live.current.listenVia !== "youtube") return;
    const fragilityNow = fragilityFromWindows(live.current.windows, progress);
    live.current.progress = progress;
    live.current.fragilityNow = fragilityNow;
    setState((s) => ({
      ...s,
      progress,
      fragilityNow,
      nuclearDuration: durationSec,
      nuclearSeekAt: null,
    }));
  }, []);

  const nuclearEnded = useCallback(() => {
    if (handover.current) return;
    handover.current = true;
    void advanceRef.current("dwell_complete");
  }, []);

  const nuclearFailed = useCallback(() => {
    const track = live.current.current;
    if (!track) return;
    if (skipYoutubeFor.current === track.id) return;
    skipYoutubeFor.current = track.id;
    void sound(track, live.current.fromEngine, live.current.fromAsk);
  }, [sound]);

  const stop = useCallback(() => {
    playGen.current += 1;
    clearFades();
    lanes.current?.forEach((el) => {
      el.pause();
      el.removeAttribute("src");
    });
    live.current.current = null;
    live.current.listenVia = null;
    setState((s) => ({
      ...INITIAL,
      volume: s.volume,
      historyIds: s.historyIds,
      extras: s.extras,
      sessionId: s.sessionId,
    }));
  }, [clearFades]);

  /* ─────────────────────── progress + advancement ─────────────────────── */

  useEffect(() => {
    const timer = window.setInterval(() => {
      const pair = lanes.current;
      const track = live.current.current;
      if (!pair || !track) return;
      if (live.current.listenVia === "youtube" || live.current.listenVia === "soundcloud") return;

      const el = pair[activeLane.current];
      if (!el.duration || !Number.isFinite(el.duration)) return;

      const progress = Math.max(0, Math.min(1, el.currentTime / el.duration));
      const fragilityNow = fragilityFromWindows(live.current.windows, progress);
      live.current.progress = progress;
      live.current.fragilityNow = fragilityNow;

      setState((s) => (s.progress === progress ? s : { ...s, progress, fragilityNow }));

      // Begin the handover before the outgoing track ends, so the two overlap
      // rather than abutting.
      const remaining = el.duration - el.currentTime;
      if (!handover.current && !el.paused && remaining <= FADE_MS / 1000 + 0.25) {
        handover.current = true;
        void advanceRef.current("dwell_complete");
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  /** A track that ends without the timer catching it must still advance. */
  useEffect(() => {
    const pair = ensureLanes();
    const onEnded = () => {
      if (handover.current) return;
      handover.current = true;
      void advanceRef.current("dwell_complete");
    };
    pair.forEach((el) => el.addEventListener("ended", onEnded));
    return () => pair.forEach((el) => el.removeEventListener("ended", onEnded));
  }, [ensureLanes]);

  /** Leaving the tab mid-track is implicit feedback too. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && live.current.progress < ABANDON_BEFORE) {
        recordSignal("abandon", { progress: live.current.progress });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [recordSignal]);

  useEffect(() => {
    return () => {
      clearFades();
      if (gestureTimer.current !== null) window.clearTimeout(gestureTimer.current);
      lanes.current?.forEach((el) => {
        el.pause();
        el.removeAttribute("src");
      });
      lanes.current = null;
    };
  }, [clearFades]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPANSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LibraryTrack[];
      if (Array.isArray(parsed) && parsed.length) ingest(parsed);
    } catch {
      /* ignore a corrupt cache */
    }
  }, [ingest]);

  const actions = useMemo<PlayerActions>(
    () => ({
      play,
      playQueue,
      toggle,
      pause,
      setVolume,
      seek,
      stop,
      ingest,
      setDestination,
      nuclearTick,
      nuclearEnded,
      nuclearFailed,
      toggleLike,
      toggleDislike,
    }),
    [play, playQueue, toggle, pause, setVolume, seek, stop, ingest, setDestination, nuclearTick, nuclearEnded, nuclearFailed, toggleLike, toggleDislike]
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

/**
 * The engine reasons about emotional vectors, but the wire only carries track
 * ids. This maps back, so the trajectory sent on each advance is the engine's
 * own intended path rather than a reconstruction.
 */
const trackVectorCache = new Map<string, EmotionalVector>();
const EXPANSION_KEY = "resonant.expansion.v1";

export function usePlayer(): PlayerState {
  const state = useContext(StateContext);
  if (!state) throw new Error("usePlayer must be used inside a PlayerProvider.");
  return state;
}

export function usePlayerActions(): PlayerActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("usePlayerActions must be used inside a PlayerProvider.");
  return actions;
}


