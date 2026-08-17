import { TRACKS, type Track } from "@/lib/tracks";
import { emotionalDist } from "@/lib/engine";

export type GraphNode = { id: string; label: string; kind: "track" | "artist" };
export type GraphEdge = { from: string; to: string; weight: number; reason: string };

export function influenceChain(trackId: string): {
  seed: Track | null;
  chain: Track[];
  edges: GraphEdge[];
} {
  const seed = TRACKS.find((t) => t.id === trackId) || null;
  if (!seed) return { seed: null, chain: [], edges: [] };
  const chain: Track[] = [seed];
  const edges: GraphEdge[] = [];
  let cur = seed;
  for (let i = 0; i < 4; i++) {
    const next = TRACKS.filter((t) => t.id !== cur.id)
      .map((t) => ({ t, d: emotionalDist(t.v, cur.v) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!next) break;
    chain.push(next.t);
    edges.push({
      from: cur.id,
      to: next.t.id,
      weight: 1 - Math.min(1, next.d),
      reason: "emotional proximity",
    });
    cur = next.t;
  }
  return { seed, chain, edges };
}

export function textureSearch(query: string, limit = 8): Track[] {
  const q = query.toLowerCase().trim();
  if (!q) return TRACKS.slice(0, limit);
  return TRACKS.filter(
    (t) =>
      t.why.toLowerCase().includes(q) ||
      t.emotion.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.kin.some((k) => k.toLowerCase().includes(q))
  ).slice(0, limit);
}
