import type { Compass, FB } from "@/lib/engine";
import { graph, keyOf } from "@/lib/engine";
import { TRACKS } from "@/lib/tracks";
import { getTasteTwin } from "./twin";

export type CounterfactualResult = {
  title: string;
  description: string;
  beforeVoice: string;
  afterVoice: string;
  deltaSummary: string;
};

export function counterfactualRemoveArtist(
  artist: string,
  fb: FB,
  compass: Compass,
  depth: number
): CounterfactualResult {
  const a = artist.toLowerCase();
  const filtered: FB = {};
  for (const [k, v] of Object.entries(fb)) {
    if (!k.startsWith(a + "::")) filtered[k] = v;
  }
  const before = getTasteTwin(fb, compass, depth);
  const after = getTasteTwin(filtered, compass, depth);
  return {
    title: `Without ${artist}`,
    description: "Recompute Taste DNA as if this artist never entered memory",
    beforeVoice: before.voice,
    afterVoice: after.voice,
    deltaSummary:
      before.voice === after.voice
        ? "Little structural change — that artist was not load-bearing."
        : `Voice shifts from “${before.voice}” toward “${after.voice}”.`,
  };
}

export function counterfactualEra(
  era: "70s" | "80s" | "90s" | "00s" | "10s",
  fb: FB,
  compass: Compass,
  depth: number
): CounterfactualResult {
  const ranges: Record<string, [number, number]> = {
    "70s": [1970, 1979],
    "80s": [1980, 1989],
    "90s": [1990, 1999],
    "00s": [2000, 2009],
    "10s": [2010, 2019],
  };
  const [lo, hi] = ranges[era] || [1990, 1999];
  const eraTracks = TRACKS.filter((t) => t.year >= lo && t.year <= hi);
  const synthetic: FB = { ...fb };
  for (const t of eraTracks.slice(0, 6)) {
    synthetic[keyOf(t.artist, t.title)] = { kind: "like" };
  }
  const before = graph(fb);
  const after = graph(synthetic);
  return {
    title: `If you entered the ${era}`,
    description: `Inject ${eraTracks.length} catalog anchors from ${lo}–${hi}`,
    beforeVoice: before.voice,
    afterVoice: after.voice,
    deltaSummary: `Hypothetical ${era} gravity: ${after.voice}`,
  };
}
