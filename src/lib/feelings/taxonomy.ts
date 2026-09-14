/**
 * FEELINGS — a cut of the Every Noise atlas.
 *
 * Atlas stays the mother map (every branch). Feelings is only the thirty
 * engenremap slugs the listener named. Unknown labels (there is no "melodic
 * house" branch; "reminimal" is not on the map — the live slug is rominimal)
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

/** The thirty live engenremap ids. Do not add a slug that is not on everynoise.com. */
export const FEELING_CANON_SLUGS = [
  "floathouse",
  "microhouse",
  "ambientdubtechno",
  "rominimal",
  "dubtechno",
  "deepsunsetlounge",
  "hypnotictechno",
  "minimaldub",
  "lofihouse",
  "outsiderhouse",
  "futuregarage",
  "deepsoulhouse",
  "detroithouse",
  "chicagohouse",
  "organichouse",
  "deephouse",
  "chillgroove",
  "balearic",
  "deepchill",
  "ambienthouse",
  "deeptechhouse",
  "romanianelectronic",
  "southafricansoulfuldeephouse",
  "jazzhouse",
  "jazztronica",
  "nujazz",
  "deepprogressivehouse",
  "cologneelectronic",
  "ethnotronica",
  "futureambient",
] as const;

export const FEELING_ROOMS: readonly FeelingRoom[] = [
  {
    id: "lie-back",
    title: "Lie back.",
    kicker: "Chill · lower tempo",
    lede: "Deep and ambient, for lying down. Float house, deep chill, ambient house, chill groove, future ambient.",
    slugs: ["floathouse", "deepchill", "ambienthouse", "chillgroove", "futureambient"],
  },
  {
    id: "soft-warm",
    title: "Soft warmth.",
    kicker: "Fine grain · warm",
    lede: "Soft, warm grain. Microhouse, lo-fi house, float house, future garage, ambient dub techno, outsider house.",
    slugs: ["microhouse", "lofihouse", "floathouse", "futuregarage", "ambientdubtechno", "outsiderhouse"],
  },
  {
    id: "warm-up",
    title: "Warm-up.",
    kicker: "Early party · Detroit / Chicago heat",
    lede: "Energy without the crush. Deep house, organic house, balearic, jazz house, deep soul house, Detroit house, Chicago house, South African soulful deep house.",
    slugs: [
      "deephouse",
      "organichouse",
      "balearic",
      "jazzhouse",
      "deepsoulhouse",
      "detroithouse",
      "chicagohouse",
      "southafricansoulfuldeephouse",
    ],
  },
  {
    id: "after-hours",
    title: "After hours.",
    kicker: "Past 3am",
    lede: "Hypnotic, not festival-hot. Microhouse, dub techno, minimal dub, future garage, hypnotic techno, rominimal, deep tech house, Romanian electronic, Cologne electronic.",
    slugs: [
      "microhouse",
      "dubtechno",
      "minimaldub",
      "futuregarage",
      "hypnotictechno",
      "rominimal",
      "deeptechhouse",
      "romanianelectronic",
      "cologneelectronic",
    ],
  },
  {
    id: "sunset",
    title: "Sunset.",
    kicker: "Dusk on the shore",
    lede: "Late light. Deep sunset lounge, balearic, organic house, chill groove, deep chill, ethnotronica, nu jazz, jazztronica.",
    slugs: [
      "deepsunsetlounge",
      "balearic",
      "organichouse",
      "chillgroove",
      "deepchill",
      "ethnotronica",
      "nujazz",
      "jazztronica",
    ],
  },
  {
    id: "tender",
    title: "Tender.",
    kicker: "Melancholy · melodic",
    lede: "A little aching. Future garage, lo-fi house, outsider house, ambient house, jazztronica, nu jazz, deep progressive house. Every Noise has no melodic house branch, so that name is not invented here.",
    slugs: [
      "futuregarage",
      "lofihouse",
      "outsiderhouse",
      "ambienthouse",
      "jazztronica",
      "nujazz",
      "deepprogressivehouse",
    ],
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
  throw new Error("Feelings rooms drifted from the thirty live Every Noise slugs.");
}
