/**
 * FEELINGS — a cut of the Every Noise atlas.
 *
 * Atlas stays the mother map (every branch). Feelings is only the live
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

/** Live engenremap ids. Do not add a slug that is not on everynoise.com. */
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
  "chilllounge",
  "downtempofusion",
  "deepdowntempofusion",
  "worldchill",
  "deepdiscohouse",
  "minimaltechhouse",
  "minimaltechno",
  "experimentalhouse",
] as const;

export const FEELING_ROOMS: readonly FeelingRoom[] = [
  {
    id: "lie-back",
    title: "Lie back.",
    kicker: "Chill · lower tempo",
    lede: "Deep and ambient, for lying down. Deep chill, chill lounge, downtempo fusion, deep downtempo fusion, world chill, chill groove, future ambient, ambient house.",
    slugs: [
      "deepchill",
      "chilllounge",
      "downtempofusion",
      "deepdowntempofusion",
      "worldchill",
      "chillgroove",
      "futureambient",
      "ambienthouse",
    ],
  },
  {
    id: "soft-warm",
    title: "Soft warmth.",
    kicker: "Fine grain · close on the map",
    lede: "The four that sit together: float house, future garage, outsider house, lo-fi house. Then experimental house, ambient dub techno, microhouse.",
    slugs: [
      "floathouse",
      "futuregarage",
      "outsiderhouse",
      "lofihouse",
      "experimentalhouse",
      "ambientdubtechno",
      "microhouse",
    ],
  },
  {
    id: "warm-up",
    title: "Warm-up.",
    kicker: "Early party · start",
    lede: "Energy without the crush. Organic house, deep house, deep soul house, deep disco house, minimal tech house, jazz house, Detroit house, Chicago house, South African soulful deep house, balearic.",
    slugs: [
      "organichouse",
      "deephouse",
      "deepsoulhouse",
      "deepdiscohouse",
      "minimaltechhouse",
      "jazzhouse",
      "detroithouse",
      "chicagohouse",
      "southafricansoulfuldeephouse",
      "balearic",
    ],
  },
  {
    id: "after-hours",
    title: "After hours.",
    kicker: "Past 3am · soft afterparty",
    lede: "Hypnotic, not festival-hot. Dub techno, ambient dub techno, microhouse, minimal dub, minimal techno, rominimal, hypnotic techno, deep tech house, Romanian electronic, Cologne electronic.",
    slugs: [
      "dubtechno",
      "ambientdubtechno",
      "microhouse",
      "minimaldub",
      "minimaltechno",
      "rominimal",
      "hypnotictechno",
      "deeptechhouse",
      "romanianelectronic",
      "cologneelectronic",
    ],
  },
  {
    id: "sunset",
    title: "Sunset.",
    kicker: "Dusk on the shore",
    lede: "Late light. Deep sunset lounge, deep chill, chill lounge, downtempo fusion, deep downtempo fusion, world chill, balearic, organic house, ethnotronica, nu jazz, jazztronica.",
    slugs: [
      "deepsunsetlounge",
      "deepchill",
      "chilllounge",
      "downtempofusion",
      "deepdowntempofusion",
      "worldchill",
      "balearic",
      "organichouse",
      "ethnotronica",
      "nujazz",
      "jazztronica",
    ],
  },
  {
    id: "tender",
    title: "Tender.",
    kicker: "Soft · melancholy",
    lede: "The same close quartet, then a little ache. Float house, future garage, outsider house, lo-fi house, jazztronica, nu jazz, deep progressive house, ambient house. Every Noise has no melodic house branch, so that name is not invented here.",
    slugs: [
      "floathouse",
      "futuregarage",
      "outsiderhouse",
      "lofihouse",
      "jazztronica",
      "nujazz",
      "deepprogressivehouse",
      "ambienthouse",
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
  throw new Error("Feelings rooms drifted from the named live Every Noise slugs.");
}
