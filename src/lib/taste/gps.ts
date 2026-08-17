/**
 * Musical GPS — abstract position in emotional space + trajectory.
 */
import type { Compass } from "@/lib/engine";
import type { Track } from "@/lib/tracks";
import { computeMomentum, getSession } from "./session";

export type GpsPoint = {
  x: number;
  y: number;
  z: number;
  label: string;
};

export function compassToGps(c: Compass): GpsPoint {
  const x = Math.max(0, Math.min(1, (c.dark * 0.55 + (1 - c.warm) * 0.45)));
  const y = Math.max(0, Math.min(1, c.energy * 0.7 + c.sad * 0.3));
  const z = Math.max(0, Math.min(1, c.organic));
  const tags: string[] = [];
  if (c.dark > 0.6) tags.push("Nocturnal");
  if (c.warm > 0.6) tags.push("Warm");
  if (c.organic > 0.6) tags.push("Organic");
  if (c.organic < 0.35) tags.push("Synthetic");
  if (c.sad > 0.55) tags.push("Melancholic");
  if (c.energy < 0.35) tags.push("Still");
  if (c.energy > 0.6) tags.push("Pulse");
  return { x, y, z, label: tags.slice(0, 3).join(" / ") || "Open field" };
}

export function trackToGps(t: Track): GpsPoint {
  return compassToGps({ dark: t.v.d, warm: t.v.w, organic: t.v.o, energy: t.v.e, sad: t.v.s });
}

export function journeyGps(path: Track[], compass: Compass) {
  const here = compassToGps(compass);
  const points = path.map(trackToGps);
  const momentum = computeMomentum();
  const session = getSession();
  let heading = "holding";
  if (momentum) heading = momentum.label;
  return {
    here,
    heading,
    temperature: session.temperature,
    path: points,
    destinationHint: points.length ? points[points.length - 1].label : here.label,
  };
}
