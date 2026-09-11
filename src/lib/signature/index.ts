/**
 * THE SIGNATURE
 *
 * Three photographs the author chose to sign the work with. A colophon rather
 * than a feature: the maker's mark at the end of the object.
 *
 * They are not decoration bolted onto the side. Each plate is given a position
 * in the same seven-axis emotional substrate the catalog uses, so the gallery
 * can be read with the engine's own vocabulary — nearest region, Acoustic
 * Vulnerability Index, cinematic space — and the room tints to each plate the
 * way it tints to a playing sleeve. The signature sits inside the ontology, not
 * beside it.
 *
 * Vectors are authored, not derived. There is no audio to analyse and no honest
 * way to compute emotional structure from pixels; what is written below is a
 * reading of each image, and it is stated as such.
 */

import manifest from "./manifest.json";
import {
  acousticVulnerability,
  cinematicMagnitude,
  cinematicSpace,
  describeVector,
  vec,
  type EmotionalVector,
} from "@/lib/drift/ontology";
import { nearestCoordinate, type CoordinateId } from "@/lib/drift/topography";

/**
 * The author's name, shown as the byline. Left null deliberately — inventing a
 * name for someone else's signature would be a fabrication. Set it here and the
 * byline appears; leave it and the three plates speak for themselves.
 */
export const SIGNATURE_AUTHOR: string | null = null;

type Plate = {
  slug: string;
  src: string;
  width: number;
  height: number;
  bytes: number;
  accent: string;
  average: string;
  palette: string[];
  isDark: boolean;
  lightness: number;
};

const PLATES = (manifest as { plates: Plate[] }).plates;

type Reading = {
  slug: string;
  title: string;
  /** One line, in the engine's register rather than a caption. */
  line: string;
  vector: EmotionalVector;
};

/**
 * The readings. Order is deliberate and is the order they are shown in: an eye
 * that looks back, then a surface that gives almost nothing, then a path that
 * disappears. Intimacy, withholding, distance.
 */
const READINGS: Reading[] = [
  {
    slug: "lovers-eye",
    title: "Lover's eye",
    line:
      "A Georgian mourning ring: one eye, painted small enough to be worn and private enough " +
      "that only the wearer knew whose it was. The whole face withheld so the looking could stay.",
    vector: vec({
      depth: 0.72,
      narrative: 0.36,
      fragility: 0.94,
      cinema: 0.34,
      warmth: 0.62,
      imperfection: 0.84,
      insistence: 0.05,
    }),
  },
  {
    slug: "door-light",
    title: "One line of light",
    line:
      "A car door at night, almost entirely nothing. A single seam catches the streetlight and " +
      "that is the entire photograph. Most of the frame refuses to resolve.",
    vector: vec({
      depth: 0.78,
      narrative: 0.22,
      fragility: 0.18,
      cinema: 0.92,
      warmth: 0.2,
      imperfection: 0.34,
      insistence: 0.06,
    }),
  },
  {
    slug: "causeway",
    title: "The causeway",
    line:
      "A dam path running out into weather, lamps that will not be lit, water going grey on one " +
      "side. It travels somewhere and the somewhere is not visible.",
    vector: vec({
      depth: 0.74,
      narrative: 0.84,
      fragility: 0.48,
      cinema: 0.95,
      warmth: 0.36,
      imperfection: 0.6,
      insistence: 0.08,
    }),
  },
];

export type SignaturePlate = Plate &
  Reading & {
    region: CoordinateId;
    regionLabel: string;
    avi: number;
    cinematic: number;
    shape: string;
    /** Colour the room takes while this plate is in view. */
    tint: string;
  };

/**
 * The plates, joined to their readings and placed on the map.
 *
 * Two of the three are close to monochrome, where a saturation-weighted accent
 * is noise — the average colour is the honest one for tinting. The accent is
 * only trusted when the image actually has a colour to speak of.
 */
export function signaturePlates(): SignaturePlate[] {
  return READINGS.map((reading) => {
    const plate = PLATES.find((p) => p.slug === reading.slug);
    if (!plate) throw new Error(`Signature plate "${reading.slug}" is missing from the manifest.`);

    const { coordinate } = nearestCoordinate(reading.vector);

    return {
      ...plate,
      ...reading,
      region: coordinate.id,
      regionLabel: coordinate.label,
      avi: acousticVulnerability(reading.vector),
      cinematic: cinematicMagnitude(cinematicSpace(reading.vector)),
      shape: describeVector(reading.vector),
      tint: plate.average,
    };
  });
}
