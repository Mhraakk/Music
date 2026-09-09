/**
 * The listener's Favorite Songs playlist on Apple Music.
 * `pl.u-` is a library playlist — catalog search cannot see it.
 */
export const FAVORITE_SONGS_URL =
  "https://music.apple.com/us/playlist/favorite-songs/pl.u-jEUdxzrWgb";
export const FAVORITE_SONGS_PLAYLIST_ID = "pl.u-jEUdxzrWgb";

export function playlistIdFromUrl(raw: string): string | null {
  const match = raw.match(/\/(pl\.u-[A-Za-z0-9-]+)/);
  return match?.[1] ?? null;
}
