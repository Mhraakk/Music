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

export type Scored = { t: Track; s: number; reason: string; debug?: string };

/** Enable with: localStorage.setItem("resonant_debug","1") or ?debug=1 */
function isDebug(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if ((window as any).__RESONANT_DEBUG__) return true;
    if (localStorage.getItem("resonant_debug") === "1") return true;
    if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
  } catch {
    /* ignore */
  }
  return process.env.NODE_ENV === "development";
}

function log(...args: unknown[]) {
  if (isDebug()) console.log("[RESONANT]", ...args);
}

export function keyOf(a: string, t: string) {
  return `${a.toLowerCase().trim()}::${t.toLowerCase().trim()}`;
}

/** Weighted emotional distance — lower = closer */
export function emotionalDist(a: Vec, b: Vec): number {
  const w: Record<keyof Vec, number> = { d: 1.45, w: 1.55, o: 1.05, e: 1.7, m: 0.75, s: 1.55 };
  let sum = 0;
  (Object.keys(w) as (keyof Vec)[]).forEach((k) => {
    const d = a[k] - b[k];
    sum += d * d * w[k];
  });
  return Math.sqrt(sum);
}

/** Session recently-shown IDs (in-memory only; resets on full reload) */
const recentRecIds: string[] = [];
const RECENT_CAP = 10;

/** Bumps on every recommend() so near-ties rotate */
let sessionSeed = 0;

export function clearRecent() {
  recentRecIds.length = 0;
  sessionSeed += 7;
  log("clearRecent() — rotation reset");
}

export function getDebugSnapshot() {
  return {
    catalogSize: TRACKS.length,
    recent: [...recentRecIds],
    sessionSeed,
    debug: isDebug(),
  };
}

function markRecent(ids: string[]) {
  for (const id of ids) {
    const i = recentRecIds.indexOf(id);
    if (i >= 0) recentRecIds.splice(i, 1);
    recentRecIds.unshift(id);
  }
  while (recentRecIds.length > RECENT_CAP) recentRecIds.pop();
}

export function graph(fb: FB) {
  const liked = TRACKS.filter((t) => {
    const k = fb[keyOf(t.artist, t.title)]?.kind;
    return k === "like" || k === "more";
  });
  const hated = TRACKS.filter((t) => fb[keyOf(t.artist, t.title)]?.kind === "dislike");
  const base = liked.length ? liked : TRACKS.filter((t) => t.obscurity > 0.65);
  const n = Math.max(1, base.length);
  const at: Vec = { d: 0, w: 0, o: 0, e: 0, m: 0, s: 0 };
  for (const t of base) {
    at.d += t.v.d;
    at.w += t.v.w;
    at.o += t.v.o;
    at.e += t.v.e;
    at.m += t.v.m;
    at.s += t.v.s;
  }
  (Object.keys(at) as (keyof Vec)[]).forEach((k) => {
    at[k] /= n;
  });

  const avoids: string[] = [];
  for (const t of hated) {
    const r = fb[keyOf(t.artist, t.title)]?.reason;
    if (r === "mainstream") {
      at.m = Math.max(0, at.m - 0.2);
      avoids.push("chart gravity");
    }
    if (r === "cold") {
      at.w = Math.min(1, at.w + 0.16);
      avoids.push("sterile cold");
    }
    if (r === "fast") {
      at.e = Math.max(0, at.e - 0.16);
      avoids.push("sudden speed");
    }
    if (r === "loud") {
      at.e = Math.max(0, at.e - 0.12);
      avoids.push("aggression");
    }
    if (r === "never") avoids.push("hard veto");
    if (r === "wrong-feel") avoids.push("wrong feeling");
  }
  if (at.m < 0.28 && !avoids.includes("chart gravity")) avoids.push("chart gravity");

  const voice =
    at.d > 0.65 && at.s > 0.55
      ? "Nocturnal archivist — weight over sparkle"
      : at.w > 0.7
        ? "Velvet room curator — warmth under the surface"
        : at.o > 0.7
          ? "Tactile collector — grain and breath"
          : "Quiet listener — waits before recommending";

  return {
    attract: at,
    voice,
    avoids: [...new Set(avoids)],
    liked: liked.length,
    hated: hated.length,
  };
}

function feedbackPenalty(f: FE | undefined): { hard: boolean; soft: number; note: string } {
  if (!f) return { hard: false, soft: 0, note: "" };
  if (f.kind === "dislike") {
    if (f.reason === "never") return { hard: true, soft: -100, note: "hard veto" };
    return { hard: false, soft: -5.5, note: `reject:${f.reason || "dislike"}` };
  }
  if (f.kind === "less") return { hard: false, soft: -2.0, note: "less like this" };
  if (f.kind === "heard") return { hard: false, soft: -1.4, note: "already heard" };
  if (f.kind === "more" || f.kind === "like") return { hard: false, soft: 3.5, note: "attraction" };
  return { hard: false, soft: 0, note: "" };
}

function buildTarget(c: Compass, g: ReturnType<typeof graph>): Vec {
  return {
    d: c.dark * 0.72 + g.attract.d * 0.28,
    w: c.warm * 0.72 + g.attract.w * 0.28,
    o: c.organic * 0.72 + g.attract.o * 0.28,
    e: c.energy * 0.72 + g.attract.e * 0.28,
    m: Math.min(0.3, g.attract.m * 0.8),
    s: c.sad * 0.72 + g.attract.s * 0.28,
  };
}

function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function scoreTrack(t: Track, tg: Vec, fb: FB, depth: number, seed: number): Scored {
  const f = fb[keyOf(t.artist, t.title)];
  const pen = feedbackPenalty(f);

  if (pen.hard) {
    return { t, s: -999, reason: "held by rejection memory", debug: "HARD_EXCLUDE" };
  }

  const dist = emotionalDist(t.v, tg);
  let s = 8.0 - dist * 3.4;
  s += t.obscurity * (0.7 + depth * 1.6);
  s -= t.v.m * 1.5;
  s += pen.soft;

  const recentIdx = recentRecIds.indexOf(t.id);
  if (recentIdx >= 0) {
    s -= 0.85 + (RECENT_CAP - recentIdx) * 0.08;
  }

  s += (hash01(t.id + String(seed) + String(Math.round(tg.w * 50 + tg.d * 50 + tg.e * 50))) - 0.5) * 0.9;

  const bits: string[] = [t.why];
  if (pen.note && pen.soft > 0) bits.unshift(pen.note);
  if (t.v.m < 0.22) bits.push("low chart gravity");
  if (Math.abs(t.v.w - tg.w) < 0.14 && t.v.w > 0.5) bits.push("warmth matches compass");
  if (Math.abs(t.v.d - tg.d) < 0.14 && t.v.d > 0.55) bits.push("darkness matches");
  if (depth > 0.65 && t.obscurity > 0.8) bits.push("deep discovery");

  return {
    t,
    s,
    reason: bits.slice(0, 2).join(" · "),
    debug: `dist=${dist.toFixed(2)} obsc=${t.obscurity.toFixed(2)} fb=${pen.note || "none"} → ${s.toFixed(2)}`,
  };
}

function diversify(scored: Scored[], limit: number): Scored[] {
  const out: Scored[] = [];
  const usedArtists = new Set<string>();
  const used = new Set<string>();

  for (const item of scored) {
    if (out.length >= limit) break;
    if (used.has(item.t.id)) continue;
    if (item.s < -80) continue;
    const artist = item.t.artist.toLowerCase();
    if (usedArtists.has(artist) && out.length < limit - 1) continue;

    let tooClose = false;
    for (const p of out) {
      if (emotionalDist(item.t.v, p.t.v) < 0.24) {
        tooClose = true;
        break;
      }
    }
    if (tooClose && out.length >= 2) continue;

    out.push(item);
    used.add(item.t.id);
    usedArtists.add(artist);
  }

  if (out.length < limit) {
    for (const item of scored) {
      if (out.length >= limit) break;
      if (used.has(item.t.id)) continue;
      if (item.s < -90) continue;
      out.push(item);
      used.add(item.t.id);
    }
  }

  if (out.length === 0) {
    const offset = sessionSeed % TRACKS.length;
    const rotated = [...TRACKS.slice(offset), ...TRACKS.slice(0, offset)];
    return rotated.slice(0, limit).map((t, i) => ({
      t,
      s: 1 - i * 0.01,
      reason: "Catalog open — no signal left to filter",
      debug: "ABSOLUTE_FALLBACK",
    }));
  }

  return out;
}

/**
 * Main recommendation entry.
 * Never returns empty. Always returns up to 6 scored items.
 */
export function recommend(c: Compass, fb: FB, depth: number) {
  sessionSeed += 1;
  const g = graph(fb);
  const tg = buildTarget(c, g);
  const hardCount = TRACKS.filter((t) => {
    const f = fb[keyOf(t.artist, t.title)];
    return f?.kind === "dislike" && f.reason === "never";
  }).length;

  log("recommend()", {
    compass: c,
    depth,
    liked: g.liked,
    hated: g.hated,
    hardVetoes: hardCount,
    catalog: TRACKS.length,
    recent: [...recentRecIds],
    seed: sessionSeed,
  });

  const scored = TRACKS.map((t) => scoreTrack(t, tg, fb, depth, sessionSeed)).sort(
    (a, b) => b.s - a.s
  );

  let candidates = scored.filter((x) => x.s > -2.0);
  let message: string | null = null;
  let tier = "primary";

  if (candidates.length < 3) {
    candidates = scored.filter((x) => x.s > -7);
    message = "Opened the room a little wider — fewer exact matches.";
    tier = "relaxed";
  }

  if (candidates.length < 2) {
    candidates = scored
      .filter((x) => x.s > -50)
      .map((x) => ({
        ...x,
        reason: x.reason.includes("Fallback") ? x.reason : `Nearest honest room · ${x.t.why}`,
      }));
    message = "Rejection memory was dense. Graph returned nearest honest rooms.";
    tier = "soft-fallback";
  }

  if (candidates.length === 0) {
    candidates = TRACKS.map((t) => {
      const f = fb[keyOf(t.artist, t.title)];
      const hard = f?.kind === "dislike" && f.reason === "never";
      return {
        t,
        s: hard ? -999 : 2 - emotionalDist(t.v, tg),
        reason: "Catalog open — no signal left to filter",
        debug: hard ? "HARD" : "ABS",
      };
    })
      .filter((x) => x.s > -100)
      .sort((a, b) => b.s - a.s);
    message = "Graph reset to open catalog. Teach it again with more / less.";
    tier = "absolute";
  }

  if (candidates.length === 0) {
    const offset = sessionSeed % TRACKS.length;
    const rotated = [...TRACKS.slice(offset), ...TRACKS.slice(0, offset)];
    candidates = rotated.map((t, i) => ({
      t,
      s: 1 - i * 0.01,
      reason: "All signals exhausted — rotating open catalog",
      debug: "FULL_ROTATE",
    }));
    message = "Every track was hard-vetoed. Showing open rotation so the room is never empty.";
    tier = "full-rotate";
  }

  const items = diversify(candidates, 6);
  markRecent(items.map((x) => x.t.id));

  if (items.length === 0) {
    const fallback = TRACKS.slice(0, 6).map((t, i) => ({
      t,
      s: 0.5 - i * 0.01,
      reason: "Emergency catalog fill",
      debug: "EMERGENCY",
    }));
    log("recommend result EMERGENCY", { count: fallback.length });
    return { items: fallback, message: "Emergency catalog fill.", graph: g, tier: "emergency" };
  }

  log("recommend result", {
    tier,
    count: items.length,
    top: items.map((x) => `${x.t.title} (${x.s.toFixed(2)}) ${x.debug || ""}`),
    message,
  });

  return { items, message, graph: g, tier };
}

export function flow(c: Compass, fb: FB, depth: number) {
  sessionSeed += 1;
  const g = graph(fb);
  const goal = buildTarget(c, g);

  const eAt = (i: number) => {
    const t = i / 5;
    if (t < 0.35) return goal.e * (0.55 + t * 1.1);
    if (t < 0.65) return Math.min(1, goal.e * 1.15);
    return goal.e * (1.15 - (t - 0.65) * 0.9);
  };

  const used = new Set<string>();
  const path: { t: Track; reason: string; chapter: string; e: number }[] = [];
  let prev: Track | null = null;

  for (let i = 0; i < 6; i++) {
    const eT = Math.min(1, Math.max(0, eAt(i)));
    const slot: Vec = { ...goal, e: eT };

    const scored = TRACKS.map((t) => {
      if (used.has(t.id)) return { t, s: -1e9, reason: "", debug: "used" };
      const f = fb[keyOf(t.artist, t.title)];
      const pen = feedbackPenalty(f);
      if (pen.hard) return { t, s: -1e8, reason: "", debug: "hard" };

      let s = 6.0 - emotionalDist(t.v, slot) * 3.0 + t.obscurity * (0.7 + depth) - t.v.m * 1.4;
      s += pen.soft;
      if (prev) {
        const jump = emotionalDist(t.v, prev.v);
        s += Math.max(0, 2.0 - jump * 2.5);
        if (jump > 1.2) s -= 2.2;
      }
      s -= Math.abs(t.v.e - eT) * 1.7;
      s += (hash01(t.id + String(sessionSeed + i)) - 0.5) * 0.5;
      return { t, s, reason: t.why, debug: `s=${s.toFixed(2)}` };
    }).sort((a, b) => b.s - a.s);

    let pick =
      scored.find((x) => x.s > -1e7) ||
      scored.find((x) => !used.has(x.t.id)) ||
      { t: TRACKS[(i + sessionSeed) % TRACKS.length], s: 0, reason: "path fill", debug: "fill" };

    if (path.length >= 1) {
      const alt = scored.find(
        (x) =>
          x.s > -1e7 &&
          !used.has(x.t.id) &&
          x.t.artist.toLowerCase() !== pick.t.artist.toLowerCase()
      );
      if (alt && alt.s > pick.s - 1.0) pick = alt;
    }

    used.add(pick.t.id);
    path.push({
      t: pick.t,
      reason: pick.t.why + (prev ? ` · continues from ${prev.artist.split(" ")[0]}` : ""),
      chapter: i === 0 ? "Open" : i === 5 ? "Land" : i < 3 ? "Rise" : "Settle",
      e: eT,
    });
    prev = pick.t;
  }

  log(
    "flow path",
    path.map((p) => `${p.chapter}: ${p.t.title}`)
  );
  return { path, graph: g };
}
