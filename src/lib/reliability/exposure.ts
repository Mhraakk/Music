/**
 * Recommendation Exposure Ledger
 */
export type ExposureEvent = {
  trackId: string;
  at: number;
  context: "recommend" | "flow" | "agent" | "queue" | "other";
  rank?: number;
  outcome?: "shown" | "played" | "skipped" | "liked" | "disliked" | "hidden";
};
export type ExposureStats = {
  trackId: string;
  showCount: number;
  lastShownAt: number;
  skipCount: number;
  likeCount: number;
  dislikeCount: number;
};
const STORAGE_KEY = "resonant-exposure-v1";
const MAX_EVENTS = 400;
export const COOLDOWN_SOFT_MS = 7 * 24 * 60 * 60 * 1000;
export const COOLDOWN_STRONG_MS = 30 * 24 * 60 * 60 * 1000;
function loadEvents(): ExposureEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExposureEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.trackId === "string" && typeof e.at === "number");
  } catch {
    return [];
  }
}
function saveEvents(events: ExposureEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {}
}
let memory: ExposureEvent[] | null = null;
function events(): ExposureEvent[] {
  if (memory === null) memory = loadEvents();
  return memory;
}
export function recordExposure(ev: ExposureEvent) {
  const list = events();
  list.unshift(ev);
  while (list.length > MAX_EVENTS) list.pop();
  memory = list;
  saveEvents(list);
}
export function recordShown(trackIds: string[], context: ExposureEvent["context"] = "recommend") {
  const at = Date.now();
  trackIds.forEach((trackId, i) => {
    recordExposure({ trackId, at, context, rank: i + 1, outcome: "shown" });
  });
}
export function getStats(trackId: string): ExposureStats {
  const list = events().filter((e) => e.trackId === trackId);
  let lastShownAt = 0, showCount = 0, skipCount = 0, likeCount = 0, dislikeCount = 0;
  for (const e of list) {
    if (e.outcome === "shown" || !e.outcome) {
      showCount++;
      if (e.at > lastShownAt) lastShownAt = e.at;
    }
    if (e.outcome === "skipped") skipCount++;
    if (e.outcome === "liked") likeCount++;
    if (e.outcome === "disliked") dislikeCount++;
  }
  return { trackId, showCount, lastShownAt, skipCount, likeCount, dislikeCount };
}
export function exposurePenalty(trackId: string, now = Date.now()): number {
  const s = getStats(trackId);
  if (!s.lastShownAt) return 0;
  const age = now - s.lastShownAt;
  if (age < COOLDOWN_SOFT_MS) {
    const multi = Math.min(3, 1 + s.showCount * 0.15);
    return 2.2 * multi * (1 - age / COOLDOWN_SOFT_MS);
  }
  if (age < COOLDOWN_STRONG_MS && s.showCount >= 3) {
    return 0.8 * (1 - age / COOLDOWN_STRONG_MS);
  }
  return 0;
}
export function getExposureSnapshot(limit = 20) {
  return { eventCount: events().length, recent: events().slice(0, limit) };
}
export function clearExposure() {
  memory = [];
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}
