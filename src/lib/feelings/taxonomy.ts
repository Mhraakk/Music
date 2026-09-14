/**
 * FEELINGS — a cut of the Every Noise atlas.
 *
 * Atlas stays the mother map. Feelings is only the live engenremap slugs the
 * listener named for chill/sunset, the close soft quartet, warm-up, after
 * hours, and the four borderline branches that sit on the map. Unknown labels
 * are omitted rather than invented.
 *
 * Genre is navigation only. Harvest still writes no genre field onto catalog records.
 */

export type FeelingRoomId =
  | "lie-back"
  | "soft-warm"
  | "warm-up"
  | "after-hours"
  | "sunset"
  | "tender";

export type FeelingRoom = {
  id: FeelingRoomId;
  title: string;
  kicker: string;
  lede: string;
  /** Exact Every Noise slugs. Order is the listener's taxonomy. */
  slugs: readonly string[];
};

/** Chill + sunset share this set, then the four borderline map neighbours. */
const CHILL_SUNSET = [
  "deepsunsetlounge",
  "deepchill",
  "chilllounge",
  "downtempofusion",
  "worldchill",
  "chillgroove",
  "ambienthouse",
  "futureambient",
] as const;

/** The four that sit together on the map, plus experimental house on the border. */
const SOFT_TENDER = ["floathouse", "futuregarage", "outsiderhouse", "lofihouse", "experimentalhouse"] as const;

/** Live engenremap ids. Do not add a slug that is not on everynoise.com. */
export const FEELING_CANON_SLUGS = [
  "deepsunsetlounge",
  "deepchill",
  "chilllounge",
  "downtempofusion",
  "worldchill",
  "floathouse",
  "futuregarage",
  "outsiderhouse",
  "lofihouse",
  "organichouse",
  "deephouse",
  "deepsoulhouse",
  "deepdiscohouse",
  "minimaltechhouse",
  "dubtechno",
  "ambientdubtechno",
  "microhouse",
  "minimaldub",
  "minimaltechno",
  "ambienthouse",
  "futureambient",
  "experimentalhouse",
  "chillgroove",
] as const;

export const FEELING_ROOMS: readonly FeelingRoom[] = [
  {
    id: "lie-back",
    title: "Lie back.",
    kicker: "Chill · lower tempo",
    lede: "Deep sunset lounge, deep chill, chill lounge, downtempo fusion, world chill. Border: chill groove, ambient house, future ambient.",
    slugs: CHILL_SUNSET,
  },
  {
    id: "soft-warm",
    title: "Soft warmth.",
    kicker: "Close on the map",
    lede: "Float house, future garage, outsider house, lo-fi house sit together. Experimental house is the border.",
    slugs: SOFT_TENDER,
  },
  {
    id: "warm-up",
    title: "Warm-up.",
    kicker: "Early party · start",
    lede: "Energy without the crush. Organic house, deep house, deep soul house, deep disco house, minimal tech house.",
    slugs: ["organichouse", "deephouse", "deepsoulhouse", "deepdiscohouse", "minimaltechhouse"],
  },
  {
    id: "after-hours",
    title: "After hours.",
    kicker: "Soft afterparty",
    lede: "Hypnotic, not festival-hot. Dub techno, ambient dub techno, microhouse, minimal dub, minimal techno.",
    slugs: ["dubtechno", "ambientdubtechno", "microhouse", "minimaldub", "minimaltechno"],
  },
  {
    id: "sunset",
    title: "Sunset.",
    kicker: "Dusk on the shore",
    lede: "The same chill cut at late light. Deep sunset lounge, deep chill, chill lounge, downtempo fusion, world chill. Border: chill groove, ambient house, future ambient.",
    slugs: CHILL_SUNSET,
  },
  {
    id: "tender",
    title: "Tender.",
    kicker: "Soft · aching",
    lede: "The same close quartet. Float house, future garage, outsider house, lo-fi house. Experimental house stays on the border.",
    slugs: SOFT_TENDER,
  },
] as const;

export const FEELING_SLUGS: readonly string[] = [...new Set(FEELING_ROOMS.flatMap((room) => [...room.slugs]))];

export const FEELING_SLUG_SET = new Set(FEELING_SLUGS);

export function feelingSlug(id: string): string {
  return id
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function isFeelingSlug(id: string | null | undefined): boolean {
  if (!id) return false;
  return FEELING_SLUG_SET.has(feelingSlug(id));
}

export function feelingRoom(id: string | null | undefined): FeelingRoom | null {
  if (!id) return null;
  return FEELING_ROOMS.find((room) => room.id === id) ?? null;
}

export function roomsForSlug(slug: string): FeelingRoom[] {
  return FEELING_ROOMS.filter((room) => room.slugs.includes(slug));
}

if (
  FEELING_SLUGS.length !== FEELING_CANON_SLUGS.length ||
  FEELING_CANON_SLUGS.some((slug) => !FEELING_SLUG_SET.has(slug))
) {
  throw new Error("Feelings rooms drifted from the named live Every Noise slugs.");
}
