import { TRACKS, type Track, type Vec } from "./tracks";

export type Reason = "mainstream" | "fast" | "cold" | "loud" | "never" | "wrong-feel";
export const REASONS: { id: Reason; label: string }[] = [
  { id: "mainstream", label: "Too mainstream" },
  { id: "fast", label: "Too fast" },
  { id: "cold", label: "Too cold" },
  { id: "loud", label: "Too aggressive" },
  { id: "wrong-feel", label: "Wrong feeling" },
  { id: "never", label: "Never again" },
];

export type FE = { kind: string; reason?: string };
export type FB = Record<string, FE>;
export type Compass = { warm: number; sad: number; organic: number; energy: number; dark: number };

export function keyOf(a: string, t: string) {
  return `${a.toLowerCase().trim()}::${t.toLowerCase().trim()}`;
}

function ed(a: Vec, b: Vec) {
  const w: Record<string, number> = { d: 1.4, w: 1.5, o: 1, e: 1.6, m: 0.8, s: 1.5 };
  let s = 0;
  for (const k of Object.keys(w)) s += ((a as any)[k] - (b as any)[k]) ** 2 * w[k];
  return Math.sqrt(s);
}

export function graph(fb: FB) {
  const liked = TRACKS.filter((t) => ["like", "more"].includes(fb[keyOf(t.artist, t.title)]?.kind || ""));
  const hated = TRACKS.filter((t) => fb[keyOf(t.artist, t.title)]?.kind === "dislike");
  const base = liked.length ? liked : TRACKS.filter((t) => t.obscurity > 0.72);
  const n = base.length || 1;
  const at: Vec = { d: 0, w: 0, o: 0, e: 0, m: 0, s: 0 };
  for (const t of base) {
    at.d += t.v.d; at.w += t.v.w; at.o += t.v.o; at.e += t.v.e; at.m += t.v.m; at.s += t.v.s;
  }
  for (const k of Object.keys(at) as (keyof Vec)[]) at[k] /= n;
  const avoids: string[] = [];
  for (const t of hated) {
    const r = fb[keyOf(t.artist, t.title)]?.reason;
    if (r === "mainstream") { at.m = Math.max(0, at.m - 0.18); avoids.push("chart gravity"); }
    if (r === "cold") { at.w = Math.min(1, at.w + 0.14); avoids.push("sterile cold"); }
    if (r === "fast") { at.e = Math.max(0, at.e - 0.14); avoids.push("sudden speed"); }
    if (r === "never") avoids.push("hard veto");
  }
  if (at.m < 0.28 && !avoids.includes("chart gravity")) avoids.push("chart gravity");
  const voice =
    at.d > 0.65 && at.s > 0.55 ? "Nocturnal archivist — weight over sparkle"
    : at.w > 0.7 ? "Velvet room curator — warmth under the surface"
    : at.o > 0.7 ? "Tactile collector — grain and breath"
    : "Quiet listener — waits before recommending";
  return { attract: at, voice, avoids: [...new Set(avoids)], liked: liked.length, hated: hated.length };
}

export function recommend(c: Compass, fb: FB, depth: number) {
  const g = graph(fb);
  const tg: Vec = {
    d: c.dark * 0.5 + g.attract.d * 0.5,
    w: c.warm * 0.5 + g.attract.w * 0.5,
    o: c.organic * 0.5 + g.attract.o * 0.5,
    e: c.energy * 0.5 + g.attract.e * 0.5,
    m: Math.min(0.22, g.attract.m),
    s: c.sad * 0.5 + g.attract.s * 0.5,
  };
  const scored = TRACKS.map((t) => {
    const f = fb[keyOf(t.artist, t.title)];
    if (f?.kind === "dislike") return { t, s: -8, reason: "held by rejection memory" };
    let s = 4 - ed(t.v, tg) * 2.4 + t.obscurity * (1 + depth) - t.v.m * 1.8;
    if (f?.kind === "more" || f?.kind === "like") s += 3;
    if (f?.kind === "heard") s -= 1.2;
    const bits = [t.why];
    if (t.v.m < 0.25) bits.push("low chart gravity");
    if (Math.abs(t.v.w - tg.w) < 0.15 && t.v.w > 0.55) bits.push("warmth matches your compass");
    return { t, s, reason: bits.slice(0, 2).join(" · ") };
  }).sort((a, b) => b.s - a.s);
  const good = scored.filter((x) => x.s > -3);
  if (good.length) return { items: good.slice(0, 6), message: null as string | null, graph: g };
  return {
    items: TRACKS.map((t) => ({ t, s: -ed(t.v, g.attract), reason: "Fallback — nearest honest room" }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6),
    message: "No exact match. Graph opened the nearest honest room.",
    graph: g,
  };
}

export function flow(c: Compass, fb: FB, depth: number) {
  const g = graph(fb);
  const goal: Vec = {
    d: c.dark * 0.5 + g.attract.d * 0.5,
    w: c.warm * 0.5 + g.attract.w * 0.5,
    o: c.organic * 0.5 + g.attract.o * 0.5,
    e: c.energy * 0.5 + g.attract.e * 0.5,
    m: Math.min(0.22, g.attract.m),
    s: c.sad * 0.5 + g.attract.s * 0.5,
  };
  const eAt = (i: number) => {
    const t = i / 5;
    if (t < 0.35) return goal.e * (0.65 + t * 0.9);
    if (t < 0.65) return Math.min(1, goal.e * 1.1);
    return goal.e * (1.1 - (t - 0.65) * 0.85);
  };
  const used = new Set<string>();
  const path: { t: Track; reason: string; chapter: string; e: number }[] = [];
  let prev: Track | null = null;
  for (let i = 0; i < 6; i++) {
    const eT = Math.min(1, Math.max(0, eAt(i)));
    const slot = { ...goal, e: eT };
    const scored = TRACKS.map((t) => {
      if (used.has(t.id)) return { t, s: -1e9 };
      const f = fb[keyOf(t.artist, t.title)];
      if (f?.kind === "dislike") return { t, s: -1e8 };
      let s = 5 - ed(t.v, slot) * 2.8 + t.obscurity * (0.9 + depth) - t.v.m * 1.8;
      if (f?.kind === "more" || f?.kind === "like") s += 2;
      if (prev) {
        const j = ed(t.v, prev.v);
        s += Math.max(0, 2.5 - j * 3);
        if (j > 1.1) s -= 3;
      }
      s -= Math.abs(t.v.e - eT) * 2;
      return { t, s };
    }).sort((a, b) => b.s - a.s);
    const pick = scored.find((x) => x.s > -1e7) || { t: TRACKS[i % TRACKS.length], s: 0 };
    used.add(pick.t.id);
    path.push({
      t: pick.t,
      reason: pick.t.why + (prev ? ` · continues from ${prev.artist.split(" ")[0]}` : ""),
      chapter: i === 0 ? "Open" : i === 5 ? "Land" : i < 3 ? "Rise" : "Settle",
      e: eT,
    });
    prev = pick.t;
  }
  return { path, graph: g };
}
