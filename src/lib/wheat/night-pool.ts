/**
 * A rotating night of artist – title lines in the wheat1 listening room.
 * Not scraped from t.me/wheat1 — the public preview is closed. Each tap
 * picks a fresh five. Rooms are map coordinates, never genres.
 */

import type { CoordinateId } from "@/lib/drift/topography";
import { seededShuffle } from "@/lib/fresh/rotate";

export type NightHint = {
  artist: string;
  title: string;
  room: CoordinateId;
};

export const NIGHT_POOL: readonly NightHint[] = [
  { artist: "Portishead", title: "Glory Box", room: "deep_melancholy" },
  { artist: "This Mortal Coil", title: "Song to the Siren", room: "deep_melancholy" },
  { artist: "Grouper", title: "Heavy Water", room: "deep_melancholy" },
  { artist: "Nico", title: "These Days", room: "deep_melancholy" },
  { artist: "Cocteau Twins", title: "Cherry-Coloured Funk", room: "deep_melancholy" },
  { artist: "Low", title: "Lullaby", room: "deep_melancholy" },

  { artist: "Bonobo", title: "Kerala", room: "cinematic_warmth" },
  { artist: "Zero 7", title: "In the Waiting Line", room: "cinematic_warmth" },
  { artist: "The Cinematic Orchestra", title: "To Build a Home", room: "cinematic_warmth" },
  { artist: "Air", title: "All I Need", room: "cinematic_warmth" },
  { artist: "Nightmares on Wax", title: "Les Nuits", room: "cinematic_warmth" },
  { artist: "Thievery Corporation", title: "Lebanese Blonde", room: "cinematic_warmth" },

  { artist: "The xx", title: "Intro", room: "fragile_intimacy" },
  { artist: "José González", title: "Heartbeats", room: "fragile_intimacy" },
  { artist: "Nick Drake", title: "Pink Moon", room: "fragile_intimacy" },
  { artist: "Sufjan Stevens", title: "Mystery of Love", room: "fragile_intimacy" },
  { artist: "Elliott Smith", title: "Between the Bars", room: "fragile_intimacy" },
  { artist: "Iron & Wine", title: "Naked as We Came", room: "fragile_intimacy" },

  { artist: "Massive Attack", title: "Teardrop", room: "noir_pressure" },
  { artist: "Tricky", title: "Hell Is Round the Corner", room: "noir_pressure" },
  { artist: "UNKLE", title: "Rabbit in Your Headlights", room: "noir_pressure" },
  { artist: "DJ Krush", title: "Duality", room: "noir_pressure" },
  { artist: "DJ Shadow", title: "Midnight in a Perfect World", room: "noir_pressure" },
  { artist: "Howie B", title: "Angels Go Bald: Too", room: "noir_pressure" },

  { artist: "D'Angelo", title: "Untitled (How Does It Feel)", room: "dusted_soul" },
  { artist: "Sade", title: "No Ordinary Love", room: "dusted_soul" },
  { artist: "Charles Webster", title: "Ready", room: "dusted_soul" },
  { artist: "Atjazz", title: "It's Complete", room: "dusted_soul" },
  { artist: "Maxwell", title: "Ascension (Don't Ever Wonder)", room: "dusted_soul" },
  { artist: "Erykah Badu", title: "Didn't Cha Know", room: "dusted_soul" },

  { artist: "Boards of Canada", title: "Roygbiv", room: "patient_bloom" },
  { artist: "Four Tet", title: "Baby", room: "patient_bloom" },
  { artist: "Tycho", title: "Awake", room: "patient_bloom" },
  { artist: "Khruangbin", title: "White Gloves", room: "patient_bloom" },
  { artist: "Caribou", title: "Odessa", room: "patient_bloom" },
  { artist: "Floating Points", title: "Silhouettes", room: "patient_bloom" },

  { artist: "Stars of the Lid", title: "Requiem for Dying Mothers", room: "hollow_architecture" },
  { artist: "Tim Hecker", title: "Rainbow Blood", room: "hollow_architecture" },
  { artist: "William Basinski", title: "dlp 1.1", room: "hollow_architecture" },
  { artist: "Brian Eno", title: "An Ending (Ascent)", room: "hollow_architecture" },
  { artist: "Gas", title: "Pop", room: "hollow_architecture" },
  { artist: "Biosphere", title: "Poa Alpina", room: "hollow_architecture" },

  { artist: "Sigur Rós", title: "Svefn-g-englar", room: "vulnerable_elevation" },
  { artist: "Jon Hopkins", title: "Open Eye Signal", room: "vulnerable_elevation" },
  { artist: "Ólafur Arnalds", title: "Near Light", room: "vulnerable_elevation" },
  { artist: "Max Richter", title: "On the Nature of Daylight", room: "vulnerable_elevation" },
  { artist: "A Winged Victory for the Sullen", title: "Steep Hills of Vicodin Tears", room: "vulnerable_elevation" },
  { artist: "Hammock", title: "I Can Almost See You", room: "vulnerable_elevation" },

  { artist: "Burial", title: "Archangel", room: "submerged_memory" },
  { artist: "The Caretaker", title: "Libet's Delay", room: "submerged_memory" },
  { artist: "Aphex Twin", title: "Xtal", room: "submerged_memory" },
  { artist: "The Orb", title: "Little Fluffy Clouds", room: "submerged_memory" },
  { artist: "Global Communication", title: "14 31", room: "submerged_memory" },
  { artist: "The Future Sound of London", title: "Papua New Guinea", room: "submerged_memory" },
];

export function hintQuery(hint: NightHint): string {
  return `${hint.artist} ${hint.title}`;
}

export function pickWheatNight(
  seed: number,
  limit: number,
  excludeQueries: ReadonlySet<string> = new Set(),
  refuseRooms: ReadonlySet<string> = new Set()
): NightHint[] {
  const want = Math.max(1, Math.min(NIGHT_POOL.length, limit));
  const blocked = new Set([...excludeQueries].map((q) => q.toLowerCase()));
  const shuffled = seededShuffle(NIGHT_POOL, seed);
  const picked: NightHint[] = [];
  for (const hint of shuffled) {
    if (refuseRooms.has(hint.room)) continue;
    const query = hintQuery(hint).toLowerCase();
    const artist = hint.artist.toLowerCase();
    const title = hint.title.toLowerCase();
    if (blocked.has(query) || blocked.has(artist) || blocked.has(title)) continue;
    picked.push(hint);
    if (picked.length >= want) break;
  }
  if (picked.length >= want) return picked;
  for (const hint of shuffled) {
    if (refuseRooms.has(hint.room)) continue;
    if (picked.some((row) => row.artist === hint.artist && row.title === hint.title)) continue;
    if (blocked.has(hintQuery(hint).toLowerCase())) continue;
    picked.push(hint);
    if (picked.length >= want) break;
  }
  return picked;
}

export function roomForQuery(query: string): CoordinateId | undefined {
  const q = query.toLowerCase();
  const exact = NIGHT_POOL.find(
    (hint) => q.includes(hint.artist.toLowerCase()) && q.includes(hint.title.toLowerCase().slice(0, 12))
  );
  if (exact) return exact.room;
  return NIGHT_POOL.find((hint) => q.includes(hint.artist.toLowerCase()))?.room;
}
