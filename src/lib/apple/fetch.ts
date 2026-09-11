/**
 * Fetch one page of the listener's Favorite Songs playlist.
 * Requires a Music User Token (the playlist is not in the public catalog).
 */

import { developerToken, musicKitConfig } from "@/lib/providers/musickit";
import { FAVORITE_SONGS_PLAYLIST_ID } from "./playlist";
import { appleSongToCandidate, parseAppleTrackPage } from "./parse";
import type { ExternalCandidate } from "@/lib/drift/expansion/types";

const API = "https://api.music.apple.com/v1";
const PAGE = 100;

export type FavoritePage = {
  candidates: ExternalCandidate[];
  nextOffset: number | null;
  total: number | null;
  playlistId: string;
};

async function appleGet(path: string, userToken: string): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${developerToken()}`,
      "music-user-token": userToken,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`Apple Music ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function resolvePlaylistId(userToken: string, preferred: string): Promise<string> {
  try {
    await appleGet(`/me/library/playlists/${encodeURIComponent(preferred)}`, userToken);
    return preferred;
  } catch {
    /* fall through and search by name */
  }

  const listed = (await appleGet(`/me/library/playlists?limit=100`, userToken)) as {
    data?: { id?: string; attributes?: { name?: string } }[];
  };
  const hit = (listed.data ?? []).find((p) => /favorite songs|favourite songs/i.test(p.attributes?.name ?? ""));
  if (hit?.id) return hit.id;
  return preferred;
}

export async function fetchFavoritePage(input: {
  userToken: string;
  offset?: number;
  playlistId?: string;
}): Promise<FavoritePage> {
  if (!musicKitConfig().configured) {
    throw new Error("Apple MusicKit is not configured.");
  }

  const playlistId = await resolvePlaylistId(input.userToken, input.playlistId ?? FAVORITE_SONGS_PLAYLIST_ID);
  const offset = Math.max(0, input.offset ?? 0);
  const path =
    `/me/library/playlists/${encodeURIComponent(playlistId)}/tracks` +
    `?limit=${PAGE}&offset=${offset}&include=catalog&l=en-US`;

  let payload: unknown;
  try {
    payload = await appleGet(path, input.userToken);
  } catch {
    payload = await appleGet(
      `/me/library/songs?limit=${PAGE}&offset=${offset}&include=catalog`,
      input.userToken
    );
  }

  const page = parseAppleTrackPage(payload);
  const candidates = page.songs
    .map(appleSongToCandidate)
    .filter((row): row is ExternalCandidate => Boolean(row));

  const nextOffset =
    page.next || candidates.length === PAGE ? offset + candidates.length : null;

  return {
    candidates,
    nextOffset: nextOffset !== null && candidates.length > 0 ? nextOffset : null,
    total: page.total,
    playlistId,
  };
}
