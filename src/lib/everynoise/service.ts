import type { LibraryTrack } from "@/lib/library";
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

export async function harvestAtlas(input: {
  artist?: string;
  genre?: string;
  query?: string;
  limit?: number;
}): Promise<{ tracks: LibraryTrack[]; title: string }> {
  const limit = Math.max(4, Math.min(16, input.limit ?? 10));
  if (input.artist?.trim()) {
    const page = await atlasArtist(input.artist, limit);
    return { tracks: page?.libraryTracks.slice(0, limit) ?? [], title: page?.artist.name ?? input.artist };
  }
  if (input.genre?.trim()) {
    const page = await atlasGenre(genreSlug(input.genre), limit);
    return { tracks: page?.libraryTracks.slice(0, limit) ?? [], title: page?.genre?.label ?? input.genre };
  }
  const query = input.query?.trim();
  if (query) {
    const listed = await listAtlasGenres({ q: query, family: "all", limit: 8 });
    const first = listed.genres[0];
    if (first) {
      const page = await atlasGenre(first.id, limit);
      return { tracks: page?.libraryTracks.slice(0, limit) ?? [], title: first.label };
    }
    const artist = await atlasArtist(query, limit);
    return { tracks: artist?.libraryTracks.slice(0, limit) ?? [], title: query };
  }
  const listed = await listAtlasGenres({ family: "electronic", limit: 6 });
  const pages = await Promise.all(listed.genres.slice(0, 3).map((g) => atlasGenre(g.id, 4)));
  const tracks: LibraryTrack[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const track of page?.libraryTracks ?? []) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
      if (tracks.length >= limit) break;
    }
    if (tracks.length >= limit) break;
  }
  return { tracks, title: "Electronic atlas" };
}
