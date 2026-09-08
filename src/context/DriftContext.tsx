"use client";

/**
 * THE DRIFT STATE
 *
 * The global session state is not a queue of tracks. It is a trajectory: an
 * ordered array of emotional vectors, each of which happens to have a recording
 * currently occupying it. Swap the recording and the drift is unchanged; change
 * the vector and everything changes. That asymmetry is the whole architecture.
 *
 * There is no next() and no shuffle() in this context, and no component can add
 * one — the only ways a session advances are:
 *
 *   - a phase reaching its end, or
 *   - the listener choosing a different destination on the map.
 *
 * Everything else the listener does is read as implicit feedback rather than
 * obeyed as a command. A volume change is not a preference setting; it is
 * evidence, and it is weighted by whether it landed on an exposed moment.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { BranchState, DriftPhase } from "@/lib/drift/algorithm";
import type { EmotionalVector } from "@/lib/drift/ontology";
import type { ResonanceReading, ResonanceSignal, ResonanceSignalKind } from "@/lib/drift/resonance";
import type { ResolvedAudio } from "@/lib/providers/resolve";
import type { CognitionTrace } from "@/lib/mcp/cognition";
import { getNextEmotionalDrift, planEmotionalDrift, type NextDriftPayload } from "@/lib/mcp/client";
import { DriftAudioEngine } from "@/lib/audio/driftEngine";

/** Length of every crossfade. Long enough that no seam is audible. */
const DRIFT_MS = 6500;

/**
 * An unresolved phase — no provider matched it, or none is configured — still
 * has to advance, because the emotional structure is the product and the audio
 * is only one rendering of it. Real durations here would be unwatchable (some
 * positions are eight minutes long), so a silent phase runs on a compressed
 * clock while keeping its fragility windows proportionally intact.
 */
const PHANTOM_PHASE_MS = 32_000;

/** A volume drag is one statement, not fifty. Emit once the hand stops moving. */
const GESTURE_SETTLE_MS = 420;

export type FragilityWindow = { start: number; end: number; intensity: number };

export type PhaseRecord = DriftPhase & {
  field: string;
  audio: ResolvedAudio;
  fragilityWindows: FragilityWindow[];
  /** Set when the engine, not the projection, chose this phase. */
  diverged: boolean;
  cognition: CognitionTrace | null;
};

export type DriftStatus = "idle" | "planning" | "sounding" | "refused";

export type DriftState = {
  status: DriftStatus;
  origin: string | null;
  destination: string | null;
  /**
   * The projected path, computed once when the drift is entered. Kept so the UI
   * can show where the engine *intended* to go against where the listener's
   * behaviour actually took it.
   */
  projection: DriftPhase[];
  projectionNarrative: string | null;
  /** The trajectory actually travelled, oldest first. */
  arc: PhaseRecord[];
  phaseIndex: number;
  branches: BranchState;
  signals: ResonanceSignal[];
  reading: ResonanceReading | null;
  volume: number;
  progress: number;
  intensity: number | null;
  /** Vocal fragility at the current position, in [0,1]. */
  fragilityNow: number;
  audioMode: { graph: boolean; analyser: boolean };
  error: string | null;
};

const INITIAL: DriftState = {
  status: "idle",
  origin: null,
  destination: null,
  projection: [],
  projectionNarrative: null,
  arc: [],
  phaseIndex: -1,
  branches: {},
  signals: [],
  reading: null,
  volume: 0.7,
  progress: 0,
  intensity: null,
  fragilityNow: 0,
  audioMode: { graph: false, analyser: false },
  error: null,
};

type Action =
  | { type: "planning"; origin: string; destination: string }
  | { type: "planned"; projection: DriftPhase[]; narrative: string; first: PhaseRecord }
  | { type: "appended"; phase: PhaseRecord; branches: BranchState; reading: ResonanceReading }
  | { type: "signal"; signal: ResonanceSignal }
  | { type: "volume"; volume: number }
  | { type: "tick"; progress: number; intensity: number | null; fragilityNow: number }
  | { type: "audioMode"; graph: boolean; analyser: boolean }
  | { type: "error"; message: string }
  | { type: "reset" };

function reducer(state: DriftState, action: Action): DriftState {
  switch (action.type) {
    case "planning":
      return {
        ...state,
        status: "planning",
        origin: action.origin,
        destination: action.destination,
        error: null,
      };

    case "planned":
      return {
        ...state,
        status: "sounding",
        projection: action.projection,
        projectionNarrative: action.narrative,
        arc: [action.first],
        phaseIndex: 0,
        progress: 0,
      };

    case "appended":
      return {
        ...state,
        status: "sounding",
        arc: [...state.arc, action.phase],
        phaseIndex: state.arc.length,
        branches: action.branches,
        reading: action.reading,
        progress: 0,
      };

    case "signal":
      // Bounded: the reading applies ordinal decay, so signals beyond the most
      // recent dozen cannot influence the outcome and only cost payload size.
      return { ...state, signals: [...state.signals, action.signal].slice(-12) };

    case "volume":
      return { ...state, volume: action.volume };

    case "tick":
      return {
        ...state,
        progress: action.progress,
        intensity: action.intensity,
        fragilityNow: action.fragilityNow,
      };

    case "audioMode":
      return { ...state, audioMode: { graph: action.graph, analyser: action.analyser } };

    case "error":
      return { ...state, status: "refused", error: action.message };

    case "reset":
      return { ...INITIAL, volume: state.volume };
  }
}

/** Fragility at a normalised position, with triangular falloff inside each window. */
export function fragilityFromWindows(windows: FragilityWindow[], progress: number): number {
  for (const w of windows) {
    if (progress >= w.start && progress <= w.end) {
      const mid = (w.start + w.end) / 2;
      const half = Math.max(1e-6, (w.end - w.start) / 2);
      return Math.max(0, Math.min(1, w.intensity * (1 - Math.abs(progress - mid) / half)));
    }
  }
  return 0;
}

export type DriftActions = {
  /** Select a coordinate pair. The only navigational act available. */
  enterDrift: (origin: string, destination: string) => Promise<void>;
  /** Retarget mid-flight. Reads as abandonment of the sounding phase. */
  redirect: (destination: string) => Promise<void>;
  setVolume: (volume: number) => void;
  /** Scrub within the current phase. Produces seek signals, never a skip. */
  seek: (progress: number) => void;
  reset: () => void;
};

const StateContext = createContext<DriftState | null>(null);
const ActionsContext = createContext<DriftActions | null>(null);

export function DriftProvider({ children, sessionId }: { children: ReactNode; sessionId: string }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const engineRef = useRef<DriftAudioEngine | null>(null);
  const phantomTimer = useRef<number | null>(null);
  const gestureTimer = useRef<number | null>(null);
  const gestureFrom = useRef<number | null>(null);
  const phantomStart = useRef<number>(0);
  const advancing = useRef(false);
  const interacted = useRef(false);

  /**
   * The reducer's state is not visible to the async advance path, which can be
   * mid-flight across several renders, so the fields it needs are mirrored into
   * a ref. Reading stale history would make the engine repeat itself.
   */
  const live = useRef({
    arc: [] as PhaseRecord[],
    phaseIndex: -1,
    signals: [] as ResonanceSignal[],
    branches: {} as BranchState,
    destination: null as string | null,
    origin: null as string | null,
    projection: [] as DriftPhase[],
    progress: 0,
    fragilityNow: 0,
  });

  useEffect(() => {
    live.current = {
      arc: state.arc,
      phaseIndex: state.phaseIndex,
      signals: state.signals,
      branches: state.branches,
      destination: state.destination,
      origin: state.origin,
      projection: state.projection,
      progress: state.progress,
      fragilityNow: state.fragilityNow,
    };
  }, [state]);

  const engine = useCallback((): DriftAudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new DriftAudioEngine();
      engineRef.current.init();
      const s = engineRef.current.state;
      dispatch({ type: "audioMode", graph: s.graph, analyser: s.analyser });
    }
    return engineRef.current;
  }, []);

  const recordSignal = useCallback(
    (kind: ResonanceSignalKind, overrides: Partial<ResonanceSignal> = {}) => {
      const current = live.current.arc[live.current.phaseIndex];
      if (!current) return;
      const signal: ResonanceSignal = {
        kind,
        trackId: current.trackId,
        progress: live.current.progress,
        fragility: live.current.fragilityNow,
        magnitude: 0.5,
        at: Date.now(),
        ...overrides,
      };
      dispatch({ type: "signal", signal });
      live.current.signals = [...live.current.signals, signal].slice(-12);
    },
    []
  );

  const clearPhantom = useCallback(() => {
    if (phantomTimer.current !== null) {
      window.clearTimeout(phantomTimer.current);
      phantomTimer.current = null;
    }
  }, []);

  /* ─────────────────────────── phase playback ─────────────────────────── */

  const soundPhase = useCallback(
    async (phase: PhaseRecord) => {
      clearPhantom();
      const audio = engine();

      const lane = await audio.driftTo(phase.audio.streamUrl, DRIFT_MS);

      if (lane === null) {
        // Silent phase — run the compressed phantom clock.
        phantomStart.current = Date.now();
        phantomTimer.current = window.setTimeout(() => {
          void advance("dwell_complete");
        }, PHANTOM_PHASE_MS);
      }
    },
    // `advance` is defined below and referenced lazily; see the ref indirection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearPhantom, engine]
  );

  /**
   * Ask the cognitive core for the next emotional position. This is the only
   * path by which a session moves forward.
   */
  const advanceRef = useRef<(reason: ResonanceSignalKind) => Promise<void>>(async () => undefined);

  const advance = useCallback(
    async (reason: ResonanceSignalKind) => {
      if (advancing.current) return;
      advancing.current = true;
      clearPhantom();

      try {
        recordSignal(reason, reason === "dwell_complete" ? { progress: 1, fragility: 0 } : {});

        const heard = live.current.arc.map((p) => p.trackId);
        const outcome = await getNextEmotionalDrift({
          sessionId,
          origin: live.current.origin ?? "deep_melancholy",
          destination: live.current.destination ?? "cinematic_warmth",
          history: heard,
          signals: live.current.signals,
          branches: live.current.branches,
        });

        if (!outcome.ok) {
          dispatch({ type: "error", message: outcome.error });
          return;
        }

        const payload: NextDriftPayload = outcome.value;
        const nextIndex = live.current.arc.length;
        const projected = live.current.projection[nextIndex];

        const record: PhaseRecord = {
          ...payload.phase,
          index: nextIndex,
          field: payload.field,
          audio: payload.audio,
          fragilityWindows: payload.fragilityWindows,
          diverged: Boolean(projected && projected.trackId !== payload.phase.trackId),
          cognition: payload.cognition,
        };

        live.current.arc = [...live.current.arc, record];
        live.current.phaseIndex = nextIndex;
        live.current.branches = payload.branches;

        dispatch({
          type: "appended",
          phase: record,
          branches: payload.branches,
          reading: payload.reading,
        });

        await soundPhase(record);
      } catch (error) {
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "The drift could not continue.",
        });
      } finally {
        advancing.current = false;
      }
    },
    [clearPhantom, recordSignal, sessionId, soundPhase]
  );

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  /* ─────────────────────────────── actions ─────────────────────────────── */

  const enterDrift = useCallback(
    async (origin: string, destination: string) => {
      interacted.current = true;
      clearPhantom();
      dispatch({ type: "planning", origin, destination });
      live.current.origin = origin;
      live.current.destination = destination;

      const outcome = await planEmotionalDrift({ sessionId, origin, destination });
      if (!outcome.ok) {
        dispatch({ type: "error", message: outcome.error });
        return;
      }

      const { arc, phases } = outcome.value;
      const first = phases[0];
      if (!first) {
        dispatch({ type: "error", message: "No admissible path exists between those coordinates." });
        return;
      }

      const record: PhaseRecord = {
        ...first,
        field: first.field,
        audio: first.audio,
        fragilityWindows: [],
        diverged: false,
        cognition: null,
      };

      live.current.arc = [record];
      live.current.phaseIndex = 0;
      live.current.projection = arc.phases;
      live.current.signals = [];
      live.current.branches = {};

      dispatch({ type: "planned", projection: arc.phases, narrative: arc.narrative, first: record });
      await soundPhase(record);
    },
    [clearPhantom, sessionId, soundPhase]
  );

  const redirect = useCallback(
    async (destination: string) => {
      // Choosing a new destination mid-phase is not a neutral act — the listener
      // is walking out of the current room, and the engine should hear that.
      const progress = live.current.progress;
      if (live.current.arc.length && progress < 0.9) {
        recordSignal("abandon", { progress });
      }
      live.current.destination = destination;
      const origin = live.current.arc[live.current.phaseIndex]?.region ?? live.current.origin ?? "deep_melancholy";
      await enterDrift(origin, destination);
    },
    [enterDrift, recordSignal]
  );

  const setVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      engine().setVolume(clamped);
      dispatch({ type: "volume", volume: clamped });

      // Collapse a continuous drag into a single statement, captured at the
      // fragility of the moment the hand first moved.
      if (gestureFrom.current === null) gestureFrom.current = state.volume;
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
    [engine, recordSignal, state.volume]
  );

  const seek = useCallback(
    (progress: number) => {
      const target = Math.max(0, Math.min(0.98, progress));
      const from = live.current.progress;
      const current = live.current.arc[live.current.phaseIndex];
      if (!current) return;

      if (current.audio.streamUrl) {
        // Real audio: no direct element handle here, so a seek is expressed by
        // restarting the phantom clock and letting the element run on. Scrubbing
        // resolved audio is intentionally left to the browser's own controls.
        phantomStart.current = Date.now() - target * PHANTOM_PHASE_MS;
      } else {
        phantomStart.current = Date.now() - target * PHANTOM_PHASE_MS;
        clearPhantom();
        phantomTimer.current = window.setTimeout(
          () => void advanceRef.current("dwell_complete"),
          Math.max(1000, PHANTOM_PHASE_MS * (1 - target))
        );
      }

      recordSignal(target < from ? "seek_back" : "seek_forward", {
        progress: target,
        fragility: fragilityFromWindows(current.fragilityWindows, target),
      });
    },
    [clearPhantom, recordSignal]
  );

  const reset = useCallback(() => {
    clearPhantom();
    engineRef.current?.pause();
    live.current = {
      arc: [],
      phaseIndex: -1,
      signals: [],
      branches: {},
      destination: null,
      origin: null,
      projection: [],
      progress: 0,
      fragilityNow: 0,
    };
    dispatch({ type: "reset" });
  }, [clearPhantom]);

  /* ────────────────────── progress + fragility sampling ────────────────────── */

  useEffect(() => {
    if (state.status !== "sounding") return;

    const timer = window.setInterval(() => {
      const audio = engineRef.current;
      const current = live.current.arc[live.current.phaseIndex];
      if (!current) return;

      const resolved = Boolean(current.audio.streamUrl);
      const progress = resolved
        ? (audio?.progress() ?? 0)
        : Math.min(1, (Date.now() - phantomStart.current) / PHANTOM_PHASE_MS);

      const fragilityNow = fragilityFromWindows(current.fragilityWindows, progress);
      const intensity = audio?.intensity() ?? null;

      live.current.progress = progress;
      live.current.fragilityNow = fragilityNow;
      dispatch({ type: "tick", progress, intensity, fragilityNow });

      // Begin the crossfade before the outgoing phase ends, so the two positions
      // genuinely overlap rather than abutting.
      if (resolved) {
        const remaining = audio?.remaining();
        if (remaining !== null && remaining !== undefined && remaining <= DRIFT_MS / 1000) {
          void advanceRef.current("dwell_complete");
        }
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [state.status]);

  /**
   * Leaving the tab mid-phase is implicit feedback too — a listener who walks
   * away from an exposed moment has said something about it.
   */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && live.current.progress < 0.85) {
        recordSignal("abandon", { progress: live.current.progress });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [recordSignal]);

  useEffect(() => {
    return () => {
      if (phantomTimer.current !== null) window.clearTimeout(phantomTimer.current);
      if (gestureTimer.current !== null) window.clearTimeout(gestureTimer.current);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const actions = useMemo<DriftActions>(
    () => ({ enterDrift, redirect, setVolume, seek, reset }),
    [enterDrift, redirect, setVolume, seek, reset]
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useDrift(): DriftState {
  const state = useContext(StateContext);
  if (!state) throw new Error("useDrift must be used inside a DriftProvider.");
  return state;
}

export function useDriftActions(): DriftActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("useDriftActions must be used inside a DriftProvider.");
  return actions;
}

/** The sounding phase, or null before a drift has been entered. */
export function useCurrentPhase(): PhaseRecord | null {
  const state = useDrift();
  return state.arc[state.phaseIndex] ?? null;
}

/**
 * The session's emotional trajectory as vectors alone. This is the shape the
 * engine actually reasons about, exposed for any visualisation that wants the
 * feeling rather than the filenames.
 */
export function useEmotionalTrajectory(): EmotionalVector[] {
  const state = useDrift();
  return useMemo(() => state.arc.map((p) => p.target), [state.arc]);
}
