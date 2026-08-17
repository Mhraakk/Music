/**
 * Scene Discovery — cultural/era clusters derived from catalog.
 */
import { TRACKS, type Track } from "@/lib/tracks";
import { emotionalDist } from "@/lib/engine";

export type Scene = {
  id: string;
  name: string;
  era: string;
  place: string;
  description: string;
  match: (t: Track) => boolean;
};

export const SCENES: Scene[] = [
  {
    id: "bristol-90s",
    name: "Bristol 1990s",
    era: "1994–1999",
    place: "Bristol",
    description: "Trip-hop pressure, vinyl dust, nocturnal bass",
    match: (t) =>
      /burial|portishead|massive|tricky|boards/i.test(t.artist) ||
      /rain|vinyl|memory|hollow/i.test(t.emotion + t.why),
  },
  {
    id: "darkjazz",
    name: "Darkjazz / Noir club",
    era: "2000s–",
    place: "Europe",
    description: "Weight without aggression — slow brass fog",
    match: (t) =>
      /bohren|kilimanjaro|dale cooper|heroin/i.test(t.artist + t.kin.join(" ")) ||
      /heavy-still|tense-fog|noir/i.test(t.emotion + t.why),
  },
  {
    id: "prepared-piano",
    name: "Prepared / intimate piano",
    era: "2010s–",
    place: "Studio",
    description: "Close-mic keys, room air, restrained bloom",
    match: (t) =>
      /frahm|richter|hauschka|grandbrother|ólafur/i.test(t.artist + t.kin.join(" ")) ||
      /piano|reflective|intimate|fragile/i.test(t.emotion + t.why),
  },
  {
    id: "organic-electronic",
    name: "Organic electronic",
    era: "2010s–",
    place: "Club / after-hours",
    description: "Warm restraint — body moves, mind soft",
    match: (t) =>
      /flügel|lawrence|move d|armen|viken|larry heard/i.test(t.artist + t.kin.join(" ")) ||
      (t.v.o > 0.45 && t.v.e > 0.35 && t.v.w > 0.5),
  },
  {
    id: "post-rock",
    name: "Post-rock expanse",
    era: "1990s–",
    place: "Wide rooms",
    description: "Patient bloom, fragile mass, horizon energy",
    match: (t) =>
      /mogwai|codeine|godspeed/i.test(t.artist + t.kin.join(" ")) ||
      /fragile-mass|patient-bloom|expanse/i.test(t.emotion + t.why),
  },
  {
    id: "ambient-memory",
    name: "Ambient memory systems",
    era: "2000s–",
    place: "Interior",
    description: "Decay as narrative, soft hypnosis",
    match: (t) =>
      /caretaker|boards|stars of the lid/i.test(t.artist + t.kin.join(" ")) ||
      /memory|hollow|hypnosis|ambient/i.test(t.emotion + t.why),
  },
];

export function scenesForTrack(t: Track): Scene[] {
  return SCENES.filter((s) => s.match(t));
}

export function tracksInScene(sceneId: string, limit = 8): Track[] {
  const scene = SCENES.find((s) => s.id === sceneId);
  if (!scene) return [];
  return TRACKS.filter(scene.match).slice(0, limit);
}

export function discoverScenes(seed: Track | null, limit = 4): { scene: Scene; tracks: Track[] }[] {
  const ranked = SCENES.map((scene) => {
    const tracks = TRACKS.filter(scene.match);
    let score = tracks.length;
    if (seed) {
      const dists = tracks.map((t) => emotionalDist(t.v, seed.v));
      const mean = dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 2;
      score += Math.max(0, 2 - mean);
    }
    return { scene, tracks: tracks.slice(0, 6), score };
  })
    .filter((x) => x.tracks.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked.map(({ scene, tracks }) => ({ scene, tracks }));
}
