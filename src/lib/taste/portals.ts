/**
 * Discovery Portals — one-action worlds, not generic tabs.
 */
import type { Compass } from "@/lib/engine";
import { recommend, type FB } from "@/lib/engine";
import { TRACKS, type Track } from "@/lib/tracks";
import { setTemperature } from "./session";
import { PARALLEL_UNIVERSES } from "./types";
import { tracksInScene, SCENES } from "./scenes";

export type PortalId =
  | "deeper" | "stranger" | "older" | "future" | "same_feeling" | "opposite_energy" | "reset_room";

export type PortalResult = {
  id: PortalId;
  title: string;
  description: string;
  items: Track[];
  compass?: Partial<Compass>;
  depth?: number;
  temperature?: number;
};

export function runPortal(id: PortalId, compass: Compass, fb: FB, depth: number): PortalResult {
  switch (id) {
    case "deeper": {
      const d = Math.min(1, depth + 0.2);
      setTemperature(Math.min(1, 0.45 + d * 0.4));
      const res = recommend(compass, fb, d);
      return { id, title: "Go Deeper", description: "Farther from the obvious, still connected to your room", items: res.items.map((x) => x.t), depth: d, temperature: 0.45 + d * 0.4 };
    }
    case "stranger": {
      setTemperature(0.85);
      const res = recommend(compass, fb, Math.min(1, depth + 0.25));
      const items = [...res.items.map((x) => x.t)].sort((a, b) => b.obscurity - a.obscurity);
      return { id, title: "Stranger", description: "Controlled surprise — low probability, hidden link", items, depth: Math.min(1, depth + 0.25), temperature: 0.85 };
    }
    case "older": {
      const older = [...TRACKS].filter((t) => t.year < 2005).slice(0, 8);
      const res = recommend({ ...compass, warm: Math.min(1, compass.warm + 0.05) }, fb, depth);
      const merged = [...older, ...res.items.map((x) => x.t).filter((t) => !older.find((o) => o.id === t.id))].slice(0, 8);
      return { id, title: "Older", description: "Pull toward earlier catalog gravity", items: merged };
    }
    case "future": {
      const newer = [...TRACKS].filter((t) => t.year >= 2012).slice(0, 8);
      return { id, title: "Future", description: "Later descendants of your current texture", items: newer.length ? newer : recommend(compass, fb, depth).items.map((x) => x.t) };
    }
    case "same_feeling": {
      const c: Compass = { ...compass, organic: compass.organic > 0.5 ? Math.max(0.15, compass.organic - 0.35) : Math.min(0.85, compass.organic + 0.35) };
      const res = recommend(c, fb, depth);
      return { id, title: "Same Feeling / Different Genre", description: "Emotional structure held — texture world changed", items: res.items.map((x) => x.t), compass: c };
    }
    case "opposite_energy": {
      const c: Compass = { ...compass, energy: 1 - compass.energy, dark: Math.min(1, compass.dark + (compass.energy > 0.5 ? 0.1 : -0.05)) };
      const res = recommend(c, fb, depth);
      return { id, title: "Opposite Energy", description: "Invert pulse while keeping the rest of the room", items: res.items.map((x) => x.t), compass: c };
    }
    case "reset_room": {
      const res = recommend({ warm: 0.55, sad: 0.45, organic: 0.5, energy: 0.35, dark: 0.55 }, {}, 0.55);
      return { id, title: "Reset the Room", description: "Session bias cleared path — open catalog center", items: res.items.map((x) => x.t), compass: { warm: 0.55, sad: 0.45, organic: 0.5, energy: 0.35, dark: 0.55 }, depth: 0.55, temperature: 0.45 };
    }
    default:
      return { id: "deeper", title: "Go Deeper", description: "", items: recommend(compass, fb, depth).items.map((x) => x.t) };
  }
}

export const PORTAL_LIST: { id: PortalId; label: string }[] = [
  { id: "deeper", label: "Deeper" },
  { id: "stranger", label: "Stranger" },
  { id: "older", label: "Older" },
  { id: "future", label: "Future" },
  { id: "same_feeling", label: "Same Feeling" },
  { id: "opposite_energy", label: "Opposite Energy" },
  { id: "reset_room", label: "Reset Room" },
];

export function scenePortal(sceneId: string): Track[] {
  return tracksInScene(sceneId, 8);
}

export { SCENES, PARALLEL_UNIVERSES };
