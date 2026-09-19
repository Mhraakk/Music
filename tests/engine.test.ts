import { describe, it, expect } from "vitest";
import { keyOf, emotionalDist, recommend, graph, clearRecent, type FB } from "@/lib/engine";
import { TRACKS, type Vec } from "@/lib/tracks";

const NEUTRAL = { warm: 0.5, sad: 0.5, organic: 0.5, energy: 0.5, dark: 0.5 };

describe("keyOf", () => {
  it("normalizes case and whitespace", () => {
    expect(keyOf("  Aphex Twin ", " Rhubarb ")).toBe("aphex twin::rhubarb");
  });
});

describe("emotionalDist", () => {
  const a: Vec = { d: 0.5, w: 0.5, o: 0.5, e: 0.5, m: 0.5, s: 0.5 };
  it("is zero for identical vectors", () => {
    expect(emotionalDist(a, a)).toBe(0);
  });
  it("is symmetric and non-negative", () => {
    const b: Vec = { d: 0.1, w: 0.9, o: 0.2, e: 0.8, m: 0.3, s: 0.7 };
    expect(emotionalDist(a, b)).toBeGreaterThan(0);
    expect(emotionalDist(a, b)).toBeCloseTo(emotionalDist(b, a), 10);
  });
});

describe("recommend", () => {
  it("returns a non-empty result for a neutral compass", () => {
    clearRecent();
    const res = recommend(NEUTRAL, {}, 0.5);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.length).toBeLessThanOrEqual(8);
  });

  it("respects the limit argument", () => {
    clearRecent();
    const res = recommend(NEUTRAL, {}, 0.5, 5);
    expect(res.items.length).toBeLessThanOrEqual(5);
  });

  it("never returns an empty room even when everything is hard-vetoed", () => {
    const fb: FB = {};
    for (const t of TRACKS) {
      fb[keyOf(t.artist, t.title)] = { kind: "dislike", reason: "never" };
    }
    const res = recommend(NEUTRAL, fb, 0.5);
    expect(res.items.length).toBeGreaterThan(0);
  });

  it("only returns tracks that exist in the catalog", () => {
    clearRecent();
    const ids = new Set(TRACKS.map((t) => t.id));
    const res = recommend(NEUTRAL, {}, 0.7, 8);
    for (const item of res.items) {
      expect(ids.has(item.t.id)).toBe(true);
    }
  });
});

describe("graph", () => {
  it("counts liked and hated tracks from feedback", () => {
    const first = TRACKS[0];
    const second = TRACKS[1];
    const fb: FB = {
      [keyOf(first.artist, first.title)]: { kind: "like" },
      [keyOf(second.artist, second.title)]: { kind: "dislike", reason: "cold" },
    };
    const g = graph(fb);
    expect(g.liked).toBe(1);
    expect(g.hated).toBe(1);
    expect(typeof g.voice).toBe("string");
  });
});
