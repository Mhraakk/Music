import type { CoordinateId } from "@/lib/drift/topography";

/**
 * Apple Music search probes for each map room. Artist names, never chart
 * slots — the engine asks Apple "what recordings exist near this person".
 */
export const ROOM_LIVE_PROBES: Record<CoordinateId, string[]> = {
  deep_melancholy: ["Portishead", "This Mortal Coil", "Grouper", "Nico"],
  cinematic_warmth: ["Bonobo", "Zero 7", "The Cinematic Orchestra", "Air"],
  fragile_intimacy: ["The xx", "José González", "Nick Drake", "Sufjan Stevens"],
  noir_pressure: ["Massive Attack", "Tricky", "UNKLE", "DJ Krush"],
  dusted_soul: ["Charles Webster", "Atjazz", "D'Angelo", "Sade"],
  patient_bloom: ["Boards of Canada", "Tycho", "Khruangbin", "Four Tet"],
  hollow_architecture: ["Stars of the Lid", "Tim Hecker", "William Basinski", "Brian Eno"],
  vulnerable_elevation: ["Sigur Rós", "Jon Hopkins", "Ólafur Arnalds", "Max Richter"],
  submerged_memory: ["Burial", "The Caretaker", "William Basinski", "Boards of Canada"],
};

export function probesForRoom(room: CoordinateId, seed = 0): string[] {
  const all = ROOM_LIVE_PROBES[room] ?? ROOM_LIVE_PROBES.cinematic_warmth;
  const start = Math.abs(seed) % all.length;
  return [...all.slice(start), ...all.slice(0, start)];
}
