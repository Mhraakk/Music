import type { LibraryTrack } from "@/lib/library";
import { capToDuration } from "@/lib/listen/duration";
import { fetchEveryNoise, MAP_TTL_MS, PAGE_TTL_MS } from "./fetch";
import { inFamily } from "./families";
import {
  nearestGenres,
  parseGenreArtists,
  parseLookup,
  parseMap,
  parseNearbyGenres,
  parsePlaylists,
} from "./parse";
import { cardFromTrack, recordingsForArtist, resolveOutbound, resolveRecording } from "./enrich";
import {
  genreSlug,
  searchUrls,
  spotifyArtistUrl,
  type AtlasArtistRef,
  type AtlasFamily,
  type AtlasGenre,
  type AtlasOutbound,
  type AtlasPlaylist,
  type AtlasTrackCard,
} from "./types";

let mapMemo: { at: number; genres: AtlasGenre[] } | null = null;

export async function atlasMap(): Promise<AtlasGenre[]> {
  if (mapMemo && Date.now() - mapMemo.at < MAP_TTL_MS) return mapMemo.genres;
  const html = await fetchEveryNoise("engenremap.html", MAP_TTL_MS);
  const genres = html ? parseMap(html) : [];
  if (genres.length) mapMemo = { at: Date.now(), genres };
  return genres;
}

export async function listAtlasGenres(input: {
  q?: string;
  family?: AtlasFamily;
  limit?: number;
}): Promise<{ genres: AtlasGenre[]; total: number; family: AtlasFamily }> {
  const family = input.family ?? "electronic";
  const all = await atlasMap();
  const query = input.q?.trim().toLowerCase() ?? "";
  const filtered = all.filter((genre) => {
    if (!inFamily(genre.label, family)) return false;
    if (!query) return true;
    return (
      genre.label.toLowerCase().includes(query) ||
      (genre.exampleArtist ?? "").toLowerCase().includes(query) ||
      (genre.exampleTitle ?? "").toLowerCase().includes(query)
    );
  });
  const ranked = filtered.slice().sort((a, b) => b.weight - a.weight);
  const limit = Math.max(12, Math.min(1200, input.limit ?? 420));
  return { genres: ranked.slice(0, limit), total: filtered.length, family };
}

export async function atlasGenre(id: string, enrichLimit = 12): Promise<{
  genre: AtlasGenre | null;
  artists: AtlasArtistRef[];
  nearby: { id: string; label: string }[];
  playlists: AtlasPlaylist[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
} | null> {
  const slug = genreSlug(id);
  if (!slug) return null;
  const html = await fetchEveryNoise(`engenremap-${slug}.html`, PAGE_TTL_MS);
  if (!html) return null;
  const map = await atlasMap();
  const genre = map.find((g) => g.id === slug) ?? {
    id: slug,
    label: slug,
    color: "#516254",
    x: 0,
    y: 0,
    weight: 100,
    exampleArtist: null,
    exampleTitle: null,
    spotifyTrackId: null,
    previewUrl: null,
    family: "other" as const,
  };
  const artists = parseGenreArtists(html);
  const nearbyParsed = parseNearbyGenres(html);
  const nearby =
    nearbyParsed.length > 0
      ? nearbyParsed
      : genre.x || genre.y
        ? nearestGenres(genre, map, 12).map((g) => ({ id: g.id, label: g.label }))
        : [];
  const playlists = parsePlaylists(html);
  const seeds = artists.slice(0, Math.max(6, Math.min(16, enrichLimit)));
  const resolved = await Promise.all(
    seeds.map((artist) =>
      resolveRecording({
        artist: artist.name,
        title: artist.exampleTitle,
        spotifyTrackId: artist.spotifyTrackId,
        spotifyArtistId: artist.spotifyArtistId,
        previewUrl: artist.previewUrl,
        note: `${artist.name} on the ${genre.label} map`,
      })
    )
  );
  const libraryTracks = resolved.map((row) => row.track).filter((t): t is LibraryTrack => Boolean(t));
  const tracks = resolved.map((row) => row.card);
  return { genre, artists, nearby, playlists, tracks, libraryTracks };
}

export async function atlasArtist(name: string, enrichLimit = 10): Promise<{
  artist: {
    name: string;
    spotifyArtistId: string | null;
    genres: { id: string; label: string }[];
    outbound: AtlasOutbound;
  };
  features: AtlasArtistRef[];
  nearbyGenres: { id: string; label: string }[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
} | null> {
  const who = name.trim();
  if (!who) return null;
  const lookupHtml = await fetchEveryNoise(`lookup.cgi?who=${encodeURIComponent(who)}`, PAGE_TTL_MS);
  const lookup = lookupHtml ? parseLookup(lookupHtml) : { name: who, genres: [], spotifyArtistId: null };
  const displayName = lookup.name || who;

  const firstGenre = lookup.genres[0];
  const genrePage = firstGenre ? await atlasGenre(firstGenre.id, 8) : null;
  const features = (genrePage?.artists ?? []).filter((a) => a.name.toLowerCase() !== displayName.toLowerCase()).slice(0, 36);

  const [libraryTracks, outbound] = await Promise.all([
    recordingsForArtist(displayName, enrichLimit),
    resolveOutbound({
      artist: displayName,
      spotifyArtistId: lookup.spotifyArtistId,
    }),
  ]);

  const artistOutbound: AtlasOutbound = {
    ...searchUrls(displayName),
    ...outbound,
    spotifyArtist: spotifyArtistUrl(lookup.spotifyArtistId) ?? outbound.spotifyArtist,
  };

  return {
    artist: {
      name: displayName,
      spotifyArtistId: lookup.spotifyArtistId,
      genres: lookup.genres,
      outbound: artistOutbound,
    },
    features,
    nearbyGenres: lookup.genres,
    tracks: libraryTracks.map(cardFromTrack),
    libraryTracks,
  };
}

function harvestLimit(input: { limit?: number; durationMinutes?: number }): number {
  if (input.durationMinutes && input.durationMinutes > 0) {
    return Math.max(8, Math.min(36, Math.ceil((input.durationMinutes * 60) / 150)));
  }
  return Math.max(4, Math.min(16, input.limit ?? 10));
}

function finishHarvest(tracks: LibraryTrack[], title: string, durationMinutes?: number): {
  tracks: LibraryTrack[];
  title: string;
  durationSeconds: number;
} {
  const unique: LibraryTrack[] = [];
  const seen = new Set<string>();
  for (const track of tracks) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    unique.push(track);
  }
  const capped = durationMinutes ? capToDuration(unique, durationMinutes) : unique;
  const durationSeconds = capped.reduce((sum, track) => sum + (track.duration > 45 ? track.duration : 210), 0);
  return { tracks: capped, title, durationSeconds };
}

export async function harvestAtlas(input: {
  artist?: string;
  genre?: string;
  query?: string;
  limit?: number;
  durationMinutes?: number;
}): Promise<{ tracks: LibraryTrack[]; title: string; durationSeconds: number }> {
  const limit = harvestLimit(input);
  const minutes = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : undefined;
  if (input.artist?.trim()) {
    const page = await atlasArtist(input.artist, limit);
    return finishHarvest(page?.libraryTracks ?? [], page?.artist.name ?? input.artist, minutes);
  }
  if (input.genre?.trim()) {
    const page = await atlasGenre(genreSlug(input.genre), limit);
    const extra: LibraryTrack[] = [...(page?.libraryTracks ?? [])];
    if (minutes && extra.length < 4) {
      for (const artist of (page?.artists ?? []).slice(0, 6)) {
        const more = await recordingsForArtist(artist.name, 4);
        extra.push(...more);
        if (extra.length >= limit) break;
      }
    }
    return finishHarvest(extra, page?.genre?.label ?? input.genre, minutes);
  }
  const query = input.query?.trim();
  if (query) {
    const listed = await listAtlasGenres({ q: query, family: "all", limit: 8 });
    const first = listed.genres[0];
    if (first) {
      const page = await atlasGenre(first.id, limit);
      return finishHarvest(page?.libraryTracks ?? [], first.label, minutes);
    }
    const artist = await atlasArtist(query, limit);
    return finishHarvest(artist?.libraryTracks ?? [], query, minutes);
  }
  const listed = await listAtlasGenres({ family: "electronic", limit: 6 });
  const pages = await Promise.all(listed.genres.slice(0, 3).map((g) => atlasGenre(g.id, Math.max(4, Math.ceil(limit / 3)))));
  const tracks: LibraryTrack[] = [];
  for (const page of pages) {
    tracks.push(...(page?.libraryTracks ?? []));
  }
  return finishHarvest(tracks, "Electronic atlas", minutes);
}
