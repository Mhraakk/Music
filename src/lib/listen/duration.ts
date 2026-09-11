/**
 * Duration-aware listening windows.
 *
 * Every Noise playlists on the public site are often "N minutes of a branch".
 * Resonant keeps that as a time budget, then hands the set to the engine.
 * No genre is written onto catalog records.
 */

import type { LibraryTrack } from "@/lib/library";

export const LISTEN_MINUTES = [15, 30, 45, 60] as const;
export type ListenMinutes = (typeof LISTEN_MINUTES)[number];

export const FALLBACK_SECONDS = 210;

export function parseDurationMinutes(text: string): number | null {
  const match =
    text.match(/(\d{1,3})\s*(?:min(?:ute)?s?|m\b)/i) ||
    text.match(/(\d{1,3})\s*دقیقه/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  if (value < 8 || value > 180) return null;
  return Math.round(value);
}

export function trackSeconds(track: Pick<LibraryTrack, "duration">): number {
  return track.duration > 45 ? track.duration : FALLBACK_SECONDS;
}

export function capToDuration(tracks: LibraryTrack[], minutes: number): LibraryTrack[] {
  const budget = Math.max(8, Math.min(180, minutes)) * 60;
  const picked: LibraryTrack[] = [];
  let sum = 0;
  const seen = new Set<string>();
  for (const track of tracks) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    picked.push(track);
    sum += trackSeconds(track);
    if (sum >= budget || picked.length >= 40) break;
  }
  return picked;
}

export function durationLabel(minutes: number): string {
  return `${minutes} min`;
}

/** Seconds the scrubber should use for the current listen. */
export function playbackSeconds(input: {
  listenVia: "preview" | "youtube" | "soundcloud" | null;
  nuclearDuration: number | null;
  mediaDuration: number | null;
  previewUrl?: string | null;
  duration: number;
}): number {
  if (input.listenVia === "youtube") {
    if (input.nuclearDuration && input.nuclearDuration > 0) return input.nuclearDuration;
    if (input.mediaDuration && input.mediaDuration > 0) return input.mediaDuration;
    // Catalog duration is often a 30s Apple preview. Wait for the iframe.
    return 0;
  }
  if (input.mediaDuration && input.mediaDuration > 0) return input.mediaDuration;
  if (input.listenVia === "soundcloud") return trackSeconds({ duration: input.duration });
  if (input.previewUrl) return 30;
  return input.duration > 0 ? input.duration : FALLBACK_SECONDS;
}
