import type { Compass, FB } from "@/lib/engine";
import { graph, keyOf, emotionalDist } from "@/lib/engine";
import { TRACKS, type Track } from "@/lib/tracks";

export type AutopsyReport = {
  trackId: string;
  title: string;
  artist: string;
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  nearestLiked: { title: string; artist: string; dist: number } | null;
  warnings: string[];
};

export function autopsyTrack(
  trackId: string,
  compass: Compass,
  fb: FB,
  depth: number
): AutopsyReport | null {
  const t = TRACKS.find((x) => x.id === trackId);
  if (!t) return null;
  const g = graph(fb);
  const target = {
    d: compass.dark * 0.7 + g.attract.d * 0.3,
    w: compass.warm * 0.7 + g.attract.w * 0.3,
    o: compass.organic * 0.7 + g.attract.o * 0.3,
    e: compass.energy * 0.7 + g.attract.e * 0.3,
    m: 0.25,
    s: compass.sad * 0.7 + g.attract.s * 0.3,
  };
  const dist = emotionalDist(t.v, target);
  const obscurityBoost = t.obscurity * depth;
  const fe = fb[keyOf(t.artist, t.title)];
  const feedbackPenalty =
    fe?.kind === "dislike" ? (fe.reason === "never" ? 10 : 2) : fe?.kind === "like" ? -1.5 : 0;

  const liked = TRACKS.filter((x) => {
    const k = fb[keyOf(x.artist, x.title)]?.kind;
    return k === "like" || k === "more";
  });
  let nearestLiked: AutopsyReport["nearestLiked"] = null;
  if (liked.length) {
    const near = liked
      .map((x) => ({ x, d: emotionalDist(x.v, t.v) }))
      .sort((a, b) => a.d - b.d)[0];
    nearestLiked = { title: near.x.title, artist: near.x.artist, dist: Number(near.d.toFixed(3)) };
  }

  return {
    trackId: t.id,
    title: t.title,
    artist: t.artist,
    scoreBreakdown: {
      emotionalFit: Number((1 - Math.min(1, dist)).toFixed(3)),
      obscurityBoost: Number(obscurityBoost.toFixed(3)),
      feedbackPenalty,
      distance: Number(dist.toFixed(3)),
    },
    reasons: [t.why, `emotion=${t.emotion}`, `obscurity=${(t.obscurity * 100).toFixed(0)}%`],
    nearestLiked,
    warnings: feedbackPenalty >= 10 ? ["hard-vetoed by user"] : [],
  };
}
