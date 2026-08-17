/**
 * Multi-pool candidate retrieval (local catalog).
 * Each pool contributes tracks + a source tag for explainability.
 */
import { TRACKS, type Track } from "@/lib/tracks";
import { graph, keyOf, emotionalDist, type Compass, type FB } from "@/lib/engine";
import { getSession } from "@/lib/taste/session";

export type PoolName =
  | "taste-neighbor"
  | "obscure"
  | "session"
  | "serendipity"
  | "memory"
  | "micro-texture";

export type PooledTrack = {
  t: Track;
  sources: PoolName[];
};

function uniquePush(map: Map<string, PooledTrack>, t: Track, source: PoolName) {
  const cur = map.get(t.id);
  if (cur) {
    if (!cur.sources.includes(source)) cur.sources.push(source);
  } else {
    map.set(t.id, { t, sources: [source] });
  }
}

/** Build overlapping pools; union becomes the orchestrator candidate set */
export function retrievePools(c: Compass, fb: FB, depth: number): {
  pools: Record<PoolName, Track[]>;
  merged: PooledTrack[];
  stats: Record<PoolName, number>;
} {
  const g = graph(fb);
  const attract = g.attract;
  const session = getSession();
  const map = new Map<string, PooledTrack>();

  const target = {
    d: c.dark * 0.72 + attract.d * 0.28,
    w: c.warm * 0.72 + attract.w * 0.28,
    o: c.organic * 0.72 + attract.o * 0.28,
    e: c.energy * 0.72 + attract.e * 0.28,
    m: Math.min(0.3, attract.m * 0.8),
    s: c.sad * 0.72 + attract.s * 0.28,
  };
  const byDist = [...TRACKS]
    .map((t) => ({ t, d: emotionalDist(t.v, target) }))
    .sort((a, b) => a.d - b.d);
  const tasteNeighbor = byDist.slice(0, Math.min(18, TRACKS.length)).map((x) => x.t);
  tasteNeighbor.forEach((t) => uniquePush(map, t, "taste-neighbor"));

  const obscure = [...TRACKS]
    .filter((t) => t.obscurity >= 0.55 + depth * 0.25)
    .sort((a, b) => b.obscurity - a.obscurity)
    .slice(0, 14);
  obscure.forEach((t) => uniquePush(map, t, "obscure"));

  const recentIds = session.recentTrackIds.slice(0, 8);
  const sessionTracks: Track[] = [];
  for (const id of recentIds) {
    const t = TRACKS.find((x) => x.id === id);
    if (t) {
      sessionTracks.push(t);
      uniquePush(map, t, "session");
      TRACKS.filter((n) => n.id !== t.id)
        .map((n) => ({ n, d: emotionalDist(n.v, t.v) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .forEach(({ n }) => {
          sessionTracks.push(n);
          uniquePush(map, n, "session");
        });
    }
  }

  const serendipity = byDist
    .filter((x) => x.d > 0.55 && x.d < 1.35)
    .filter((x) => {
      const t = x.t;
      return (
        Math.abs(t.v.d - target.d) < 0.18 ||
        Math.abs(t.v.w - target.w) < 0.18 ||
        Math.abs(t.v.s - target.s) < 0.18
      );
    })
    .slice(0, 12)
    .map((x) => x.t);
  serendipity.forEach((t) => uniquePush(map, t, "serendipity"));

  const memory: Track[] = [];
  for (const t of TRACKS) {
    const k = fb[keyOf(t.artist, t.title)]?.kind;
    if (k === "like" || k === "more") {
      memory.push(t);
      uniquePush(map, t, "memory");
    }
  }
  if (memory.length === 0) {
    byDist.slice(0, 6).forEach(({ t }) => {
      memory.push(t);
      uniquePush(map, t, "memory");
    });
  }

  const micro = TRACKS.filter((t) => Math.abs(t.v.o - c.organic) < 0.22).slice(0, 12);
  micro.forEach((t) => uniquePush(map, t, "micro-texture"));

  const pools: Record<PoolName, Track[]> = {
    "taste-neighbor": tasteNeighbor,
    obscure,
    session: sessionTracks,
    serendipity,
    memory,
    "micro-texture": micro,
  };

  const stats = Object.fromEntries(
    (Object.keys(pools) as PoolName[]).map((k) => [k, pools[k].length])
  ) as Record<PoolName, number>;

  return { pools, merged: [...map.values()], stats };
}
