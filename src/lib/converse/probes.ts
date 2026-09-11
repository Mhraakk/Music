import type { CoordinateId } from "@/lib/drift/topography";
import { rotate } from "@/lib/fresh/rotate";

/**
 * Apple Music search probes for each map room. Artist names, never chart
 * slots — the engine asks Apple "what recordings exist near this person".
 * Eight names so a refresh has somewhere new to land.
 */
export const ROOM_LIVE_PROBES: Record<CoordinateId, string[]> = {
  deep_melancholy: [
    "Portishead",
    "This Mortal Coil",
    "Grouper",
    "Nico",
    "Cocteau Twins",
    "Low",
    "Have A Nice Life",
    "Chelsea Wolfe",
  ],
  cinematic_warmth: [
    "Bonobo",
    "Zero 7",
    "The Cinematic Orchestra",
    "Air",
    "Tycho",
    "Khruangbin",
    "Nightmares on Wax",
    "Thievery Corporation",
  ],
  fragile_intimacy: [
    "The xx",
    "José González",
    "Nick Drake",
    "Sufjan Stevens",
    "Elliott Smith",
    "Iron & Wine",
    "Big Thief",
    "Phoebe Bridgers",
  ],
  noir_pressure: [
    "Massive Attack",
    "Tricky",
    "UNKLE",
    "DJ Krush",
    "DJ Shadow",
    "Howie B",
    "Smith & Mighty",
    "Burial",
  ],
  dusted_soul: [
    "Charles Webster",
    "Atjazz",
    "D'Angelo",
    "Sade",
    "Maxwell",
    "Erykah Badu",
    "Larry Heard",
    "Kerri Chandler",
  ],
  patient_bloom: [
    "Boards of Canada",
    "Tycho",
    "Khruangbin",
    "Four Tet",
    "Caribou",
    "Floating Points",
    "Nils Frahm",
    "Helios",
  ],
  hollow_architecture: [
    "Stars of the Lid",
    "Tim Hecker",
    "William Basinski",
    "Brian Eno",
    "Fennesz",
    "Gas",
    "Biosphere",
    "Eluvium",
  ],
  vulnerable_elevation: [
    "Sigur Rós",
    "Jon Hopkins",
    "Ólafur Arnalds",
    "Max Richter",
    "A Winged Victory for the Sullen",
    "Hammock",
    "Jónsi",
    "Explosions in the Sky",
  ],
  submerged_memory: [
    "Burial",
    "The Caretaker",
    "William Basinski",
    "Boards of Canada",
    "The Orb",
    "Global Communication",
    "The Future Sound of London",
    "Gas",
  ],
};

export function probesForRoom(room: CoordinateId, seed = 0): string[] {
  const all = ROOM_LIVE_PROBES[room] ?? ROOM_LIVE_PROBES.cinematic_warmth;
  return rotate(all, seed);
}
