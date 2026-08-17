import type { Track } from "@/lib/tracks";

export function batchEntropy(tracks: Track[]): {
  uniqueArtists: number;
  meanObscurity: number;
  diversity: number;
} {
  const artists = new Set(tracks.map((t) => t.artist.toLowerCase()));
  const meanObscurity = tracks.length
    ? tracks.reduce((s, t) => s + t.obscurity, 0) / tracks.length
    : 0;
  const diversity = tracks.length ? artists.size / tracks.length : 0;
  return {
    uniqueArtists: artists.size,
    meanObscurity: Number(meanObscurity.toFixed(3)),
    diversity: Number(diversity.toFixed(3)),
  };
}

export function artistSaturationPenalty(
  track: Track,
  alreadyShown: Track[],
  maxPerArtist = 2
): number {
  const count = alreadyShown.filter(
    (t) => t.artist.toLowerCase() === track.artist.toLowerCase()
  ).length;
  if (count < maxPerArtist) return 0;
  return Math.min(3, (count - maxPerArtist + 1) * 1.2);
}
