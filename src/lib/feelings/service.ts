import type { AtlasGenre, AtlasPin, AtlasPlaylistKind } from "@/lib/everynoise/types";
import { atlasGenre, atlasMapPage, harvestAtlas } from "@/lib/everynoise";
import type { LibraryTrack } from "@/lib/library";
import {
  FEELING_ROOMS,
  FEELING_SLUG_SET,
  feelingRoom,
  feelingSlug,
  isFeelingSlug,
  type FeelingRoom,
  type FeelingRoomId,
} from "./taxonomy";
import { matchFeelingRoom, matchFeelingSlug } from "./match";

export type FeelingRoomView = {
  id: FeelingRoomId;
  title: string;
  kicker: string;
  lede: string;
  genres: AtlasGenre[];
};

export async function listFeelingRooms(): Promise<{
  rooms: FeelingRoomView[];
  canvas: { width: number; height: number };
  slugs: string[];
}> {
  const { genres, canvas } = await atlasMapPage();
  const byId = new Map(genres.map((genre) => [genre.id, genre]));
  const rooms = FEELING_ROOMS.map((room) => ({
    id: room.id,
    title: room.title,
    kicker: room.kicker,
    lede: room.lede,
    genres: room.slugs.map((slug) => byId.get(slug)).filter((row): row is AtlasGenre => Boolean(row)),
  }));
  return { rooms, canvas, slugs: [...FEELING_SLUG_SET] };
}

export function filterFeelingPins<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => isFeelingSlug(row.id));
}

export async function feelingGenrePage(id: string, enrich = 12) {
  const slug = feelingSlug(id);
  if (!isFeelingSlug(slug)) return null;
  const page = await atlasGenre(slug, enrich);
  if (!page?.genre) return null;
  const genreId = page.genre.id;
  return {
    ...page,
    nearby: filterFeelingPins(page.nearby) as AtlasPin[],
    mirrors: filterFeelingPins(page.mirrors) as AtlasPin[],
    rooms: FEELING_ROOMS.filter((room) => room.slugs.includes(genreId)).map((room) => room.id),
  };
}

function uniqueTracks(rows: LibraryTrack[], limit: number): LibraryTrack[] {
  const seen = new Set<string>();
  const tracks: LibraryTrack[] = [];
  for (const track of rows) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    tracks.push(track);
    if (tracks.length >= limit) break;
  }
  return tracks;
}

function interleave(buckets: LibraryTrack[][], limit: number): LibraryTrack[] {
  const seen = new Set<string>();
  const tracks: LibraryTrack[] = [];
  let index = 0;
  while (tracks.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      const track = bucket[index];
      if (!track || seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
      added = true;
      if (tracks.length >= limit) break;
    }
    if (!added && buckets.every((bucket) => index >= bucket.length)) break;
    index += 1;
    if (!added && index > 24) break;
  }
  return tracks;
}

export async function harvestFeeling(input: {
  room?: string;
  genre?: string;
  artist?: string;
  query?: string;
  playlist?: string;
  playlistKind?: AtlasPlaylistKind;
  limit?: number;
  durationMinutes?: number;
}): Promise<{ tracks: LibraryTrack[]; title: string; durationSeconds: number; refused?: string }> {
  const limit = Math.max(4, Math.min(12, input.limit ?? 8));
  const namedRoom: FeelingRoom | null = feelingRoom(input.room ?? "");
  const querySlug = matchFeelingSlug(input.query ?? "");
  if (namedRoom && !input.genre?.trim() && !querySlug) {
    const per = Math.max(2, Math.ceil(limit / namedRoom.slugs.length));
    const pages = await Promise.all(
      namedRoom.slugs.map((slug) =>
        harvestAtlas({
          genre: slug,
          limit: per,
          durationMinutes: input.durationMinutes,
        })
      )
    );
    const tracks = interleave(
      pages.map((page) => page.tracks),
      limit
    );
    const durationSeconds = tracks.reduce((sum, track) => sum + (track.duration > 45 ? track.duration : 210), 0);
    return { tracks, title: namedRoom.title.replace(/\.$/, ""), durationSeconds };
  }

  const genreRaw = input.genre?.trim() || querySlug || "";
  const genre = genreRaw ? feelingSlug(genreRaw) : "";
  if (genre && !isFeelingSlug(genre)) {
    return {
      tracks: [],
      title: "Feelings",
      durationSeconds: 0,
      refused: "That branch is not in Feelings. Atlas holds the full map.",
    };
  }

  if (genre || input.artist?.trim() || input.playlist?.trim() || input.playlistKind) {
    return harvestAtlas({
      artist: input.artist,
      genre: genre || undefined,
      query: input.query,
      playlist: input.playlist,
      playlistKind: input.playlistKind,
      limit,
      durationMinutes: input.durationMinutes,
    });
  }

  const roomFromQuery = feelingRoom(matchFeelingRoom(input.query ?? "") ?? "");
  if (roomFromQuery) {
    return harvestFeeling({
      room: roomFromQuery.id,
      limit,
      durationMinutes: input.durationMinutes,
    });
  }

  return { tracks: uniqueTracks([], limit), title: "Feelings", durationSeconds: 0 };
}
