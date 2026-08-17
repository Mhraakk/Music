/**
 * Session Brain: momentum, narrative, budget, temperature, context lock.
 */
import type { Compass, FB } from "@/lib/engine";
import type { Track } from "@/lib/tracks";
import type {
  ContextLockMode,
  DiscoveryTemperature,
  MoodMomentum,
  RecBudget,
} from "./types";

const LOCK_KEY = "resonant-session-v1";

export type SessionState = {
  temperature: DiscoveryTemperature;
  budget: RecBudget;
  contextLock: ContextLockMode;
  recentTrackIds: string[];
  recentCompass: Compass[];
  narrativeBeats: string[];
};

const DEFAULT_BUDGET: RecBudget = { safe: 0.7, explore: 0.2, wildcard: 0.1 };

function load(): SessionState {
  if (typeof window === "undefined") {
    return {
      temperature: 0.45,
      budget: { ...DEFAULT_BUDGET },
      contextLock: "none",
      recentTrackIds: [],
      recentCompass: [],
      narrativeBeats: [],
    };
  }
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) {
      return {
        temperature: 0.45,
        budget: { ...DEFAULT_BUDGET },
        contextLock: "none",
        recentTrackIds: [],
        recentCompass: [],
        narrativeBeats: [],
      };
    }
    const p = JSON.parse(raw) as SessionState;
    return {
      temperature: typeof p.temperature === "number" ? p.temperature : 0.45,
      budget: p.budget || { ...DEFAULT_BUDGET },
      contextLock: p.contextLock || "none",
      recentTrackIds: Array.isArray(p.recentTrackIds) ? p.recentTrackIds.slice(0, 20) : [],
      recentCompass: Array.isArray(p.recentCompass) ? p.recentCompass.slice(0, 12) : [],
      narrativeBeats: Array.isArray(p.narrativeBeats) ? p.narrativeBeats.slice(0, 12) : [],
    };
  } catch {
    return {
      temperature: 0.45,
      budget: { ...DEFAULT_BUDGET },
      contextLock: "none",
      recentTrackIds: [],
      recentCompass: [],
      narrativeBeats: [],
    };
  }
}

let state: SessionState | null = null;

export function getSession(): SessionState {
  if (!state) state = load();
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function setTemperature(t: number) {
  const s = getSession();
  s.temperature = Math.max(0, Math.min(1, t));
  persist();
}

export function setContextLock(mode: ContextLockMode) {
  getSession().contextLock = mode;
  persist();
}

export function setBudget(partial: Partial<RecBudget>) {
  const s = getSession();
  s.budget = { ...s.budget, ...partial };
  const sum = s.budget.safe + s.budget.explore + s.budget.wildcard;
  if (sum > 0) {
    s.budget.safe /= sum;
    s.budget.explore /= sum;
    s.budget.wildcard /= sum;
  }
  persist();
}

export function pushSessionListen(track: Track, compass: Compass, emotionLabel?: string) {
  const s = getSession();
  s.recentTrackIds = [track.id, ...s.recentTrackIds.filter((id) => id !== track.id)].slice(0, 20);
  s.recentCompass = [compass, ...s.recentCompass].slice(0, 12);
  const beat = emotionLabel || track.emotion || track.why.split("—")[0]?.trim() || track.title;
  s.narrativeBeats = [...s.narrativeBeats, beat].slice(-8);
  if (track.obscurity > 0.75) {
    s.budget.explore = Math.min(0.4, s.budget.explore + 0.02);
    s.budget.safe = Math.max(0.45, s.budget.safe - 0.015);
  }
  persist();
}

export function computeMomentum(): MoodMomentum | null {
  const s = getSession();
  if (s.recentCompass.length < 2) return null;
  const a = s.recentCompass[s.recentCompass.length - 1];
  const b = s.recentCompass[0];
  const delta: Partial<Compass> = {
    dark: b.dark - a.dark,
    warm: b.warm - a.warm,
    energy: b.energy - a.energy,
    sad: b.sad - a.sad,
    organic: b.organic - a.organic,
  };
  const strength = Math.min(
    1,
    Math.abs(delta.dark || 0) +
      Math.abs(delta.warm || 0) +
      Math.abs(delta.energy || 0) +
      Math.abs(delta.sad || 0)
  );
  if (strength < 0.08) return null;

  const parts: string[] = [];
  if ((delta.dark || 0) > 0.08) parts.push("darker");
  if ((delta.dark || 0) < -0.08) parts.push("lighter");
  if ((delta.energy || 0) > 0.08) parts.push("more pulse");
  if ((delta.energy || 0) < -0.08) parts.push("slower");
  if ((delta.sad || 0) > 0.08) parts.push("more melancholy");
  if ((delta.warm || 0) > 0.08) parts.push("warmer");
  if ((delta.organic || 0) > 0.08) parts.push("more organic");
  if ((delta.organic || 0) < -0.08) parts.push("more synthetic");

  return {
    delta,
    strength: Number(strength.toFixed(3)),
    label: parts.length ? parts.join(" → ") : "subtle drift",
  };
}

export function sessionNarrative(): string | null {
  const s = getSession();
  if (s.narrativeBeats.length < 2) return null;
  const beats = s.narrativeBeats;
  if (beats.length === 2) return `From ${beats[0]} into ${beats[1]}.`;
  const start = beats[0];
  const mid = beats[Math.floor(beats.length / 2)];
  const end = beats[beats.length - 1];
  return `Tonight moved from ${start}, through ${mid}, and settled on ${end}.`;
}

export function applyContextLock(base: Compass, proposed: Partial<Compass>): Compass {
  const lock = getSession().contextLock;
  if (lock === "none") return { ...base, ...proposed };
  if (lock === "feel_only") {
    return {
      warm: proposed.warm ?? base.warm,
      sad: proposed.sad ?? base.sad,
      dark: proposed.dark ?? base.dark,
      energy: proposed.energy ?? base.energy,
      organic: base.organic,
    };
  }
  if (lock === "genre_only") {
    return {
      warm: base.warm,
      sad: base.sad,
      dark: base.dark,
      energy: proposed.energy ?? base.energy,
      organic: proposed.organic ?? base.organic,
    };
  }
  return { ...base, ...proposed };
}

export function resetSessionRoom() {
  const s = getSession();
  s.recentTrackIds = [];
  s.recentCompass = [];
  s.narrativeBeats = [];
  s.contextLock = "none";
  persist();
}
