/**
 * Journey Engine v2
 */
import { TRACKS, type Track } from "@/lib/tracks";
import {
  graph,
  keyOf,
  emotionalDist,
  recommend,
  type Compass,
  type FB,
} from "@/lib/engine";
import { getSession } from "@/lib/taste/session";

export type JourneyRole = "open" | "bridge" | "lift" | "deepen" | "peak" | "land";
export type JourneyStep = {
  t: Track; role: JourneyRole; chapter: string; reason: string; transitionScore: number; e: number;
};
export type JourneyPlan = { path: JourneyStep[]; voice: string; arc: string; totalTransition: number };

const ROLE_CHAPTER: Record<JourneyRole, string> = {
  open: "Open", bridge: "Bridge", lift: "Lift", deepen: "Deepen", peak: "Peak", land: "Land",
};
const ROLE_SEQUENCE: JourneyRole[] = ["open", "bridge", "lift", "deepen", "peak", "land"];

export function transitionScore(a: Track, b: Track, role: JourneyRole): number {
  const dist = emotionalDist(a.v, b.v);
  const ideal: Record<JourneyRole, number> = {
    open: 0.35, bridge: 0.4, lift: 0.55, deepen: 0.5, peak: 0.65, land: 0.35,
  };
  const distFit = 1 - Math.min(1, Math.abs(dist - ideal[role]) / 0.8);
  let energyMove = 0;
  if (role === "lift" || role === "peak") energyMove = b.v.e > a.v.e ? 0.35 : -0.15;
  else if (role === "land" || role === "deepen") energyMove = b.v.e <= a.v.e + 0.05 ? 0.25 : -0.1;
  else energyMove = 0.1;
  const sameArtist = a.artist === b.artist ? -0.4 : 0.15;
  const obscurityStep = role === "deepen" || role === "peak" ? b.obscurity * 0.3 : b.obscurity * 0.1;
  return Number((distFit * 0.55 + energyMove + sameArtist + obscurityStep).toFixed(3));
}

function roleReason(role: JourneyRole, t: Track): string {
  switch (role) {
    case "open": return `Opens the room · ${t.why}`;
    case "bridge": return `Bridge texture · ${t.why}`;
    case "lift": return `Lifts energy without breaking mood · ${t.emotion}`;
    case "deepen": return `Goes further in · obscurity ${(t.obscurity * 100).toFixed(0)}%`;
    case "peak": return `Emotional peak · ${t.why}`;
    case "land": return `Lands the arc · ${t.why}`;
  }
}

export function buildJourneyPlan(c: Compass, fb: FB, depth: number, length = 6): JourneyPlan {
  const roles = ROLE_SEQUENCE.slice(0, Math.min(6, Math.max(4, length)));
  const g = graph(fb);
  const ranked = recommend(c, fb, depth);
  const pool = ranked.items.map((x) => x.t);
  const extra = TRACKS.filter((t) => !pool.find((p) => p.id === t.id));
  const candidates = [...pool, ...extra];
  const used = new Set<string>();
  const path: JourneyStep[] = [];
  let prev: Track | null = null;

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    let best: Track | null = null;
    let bestScore = -999;
    for (const t of candidates) {
      if (used.has(t.id)) continue;
      const f = fb[keyOf(t.artist, t.title)];
      if (f?.kind === "dislike" && f.reason === "never") continue;
      let score = 0;
      if (prev) score = transitionScore(prev, t, role);
      else {
        const idx = ranked.items.findIndex((x) => x.t.id === t.id);
        score = idx >= 0 ? 2 - idx * 0.1 : 0.5;
        score += (1 - Math.abs(t.v.d - c.dark)) * 0.3;
      }
      if (role === "deepen" || role === "peak") score += t.obscurity * 0.5 * depth;
      if (role === "lift") score += t.v.e * 0.4;
      if (role === "land") score += (1 - t.v.e) * 0.35 + t.v.w * 0.2;
      if (role === "bridge" && prev) score += 1 - Math.min(1, emotionalDist(t.v, prev.v) / 1.2);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (!best) {
      best = candidates.find((t) => !used.has(t.id)) || TRACKS[i % TRACKS.length];
    }
    used.add(best.id);
    path.push({
      t: best, role, chapter: ROLE_CHAPTER[role], reason: roleReason(role, best),
      transitionScore: prev ? transitionScore(prev, best, role) : 1, e: best.v.e,
    });
    prev = best;
  }

  const totalTransition = path.length > 1
    ? path.slice(1).reduce((s, p) => s + p.transitionScore, 0) / (path.length - 1) : 1;
  const session = getSession();
  const arc = depth > 0.7 ? "Deep discovery arc" : session.temperature > 0.65 ? "Exploratory arc" : "Centered emotional arc";
  return { path, voice: g.voice, arc, totalTransition: Number(totalTransition.toFixed(3)) };
}
