import type { LibraryTrack } from "@/lib/library";
import { capToDuration } from "@/lib/listen/duration";
import { fetchEveryNoise, MAP_TTL_MS, PAGE_TTL_MS } from "./fetch";
import { inFamily } from "./families";
import { playlistsForGenre, playlistFromRef, inferGenreFromPlaylistTitle } from "./indexes";
import {
  nearestGenres,
  parseCanvas,
  parseCanvases,
  parseGenreArtists,
  parseLookup,
  parseMap,
  parseMirrorGenres,
  parseNearbyGenres,
  parsePlaylists,
} from "./parse";
import { cardFromTrack, recordingsForArtist, resolveOutbound, resolveRecording } from "./enrich";
import {
  genreSlug,
  searchUrls,
  spotifyArtistUrl,
  type AtlasArtistRef,
  type AtlasCanvas,
  type AtlasFamily,
  type AtlasGenre,
  type AtlasOutbound,
  type AtlasPin,
  type AtlasPlaylist,
  type AtlasPlaylistKind,
  type AtlasTrackCard,
} from "./types";

let mapMemo: { at: number; genres: AtlasGenre[]; canvas: AtlasCanvas } | null = null;

export async function atlasMapPage(): Promise<{ genres: AtlasGenre[]; canvas: AtlasCanvas }> {
  if (mapMemo && Date.now() - mapMemo.at < MAP_TTL_MS) return mapMemo;
  const html = await fetchEveryNoise("engenremap.html", MAP_TTL_MS);
  const genres = html ? parseMap(html) : [];
  const canvas = html ? parseCanvas(html) : { width: 1610, height: 22683 };
  if (genres.length) mapMemo = { at: Date.now(), genres, canvas };
  return { genres, canvas };
}

export async function atlasMap(): Promise<AtlasGenre[]> {
  const page = await atlasMapPage();
  return page.genres;
}

export async function listAtlasGenres(input: {
  q?: string;
  family?: AtlasFamily;
  limit?: number;
}): Promise<{
  genres: AtlasGenre[];
  listed: AtlasGenre[];
  total: number;
  family: AtlasFamily;
  canvas: AtlasCanvas;
}> {
  const family = input.family ?? "all";
  const { genres: all, canvas } = await atlasMapPage();
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
  const cap = Math.max(12, Math.min(8000, input.limit ?? 8000));
  const genres = filtered.slice(0, cap);
  const listed = filtered
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.min(160, filtered.length));
  return { genres, listed, total: filtered.length, family, canvas };
}

function pinFromGenre(genre: AtlasGenre): AtlasPin {
  return {
    id: genre.id,
    label: genre.label,
    color: genre.color,
    x: genre.x,
    y: genre.y,
    weight: genre.weight,
    exampleArtist: genre.exampleArtist,
    exampleTitle: genre.exampleTitle,
    spotifyTrackId: genre.spotifyTrackId,
    previewUrl: genre.previewUrl,
  };
}

export async function atlasGenre(
  id: string,
  enrichLimit = 12
): Promise<{
  genre: AtlasGenre | null;
  artists: AtlasArtistRef[];
  nearby: AtlasPin[];
  mirrors: AtlasPin[];
  playlists: AtlasPlaylist[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
  canvas: AtlasCanvas;
  nearbyCanvas: AtlasCanvas;
  mirrorCanvas: AtlasCanvas;
} | null> {
  const slug = genreSlug(id);
  if (!slug) return null;
  const html = await fetchEveryNoise(`engenremap-${slug}.html`, PAGE_TTL_MS);
  if (!html) return null;
  const { genres: map } = await atlasMapPage();
  const found = map.find((g) => g.id === slug);
  const pageTitle = html.match(/<title>Every Noise at Once\s*[·\-:–]\s*([^<]+)<\/title>/i)?.[1]?.trim();
  const genre: AtlasGenre = found
    ? { ...found }
    : {
        id: slug,
        label: pageTitle || slug,
        color: "#516254",
        x: 0,
        y: 0,
        weight: 100,
        exampleArtist: null,
        exampleTitle: null,
        spotifyTrackId: null,
        previewUrl: null,
        family: "other",
      };
  const artists = parseGenreArtists(html);
  const nearbyParsed = parseNearbyGenres(html);
  const nearby =
    nearbyParsed.length > 0
      ? nearbyParsed
      : genre.x || genre.y
        ? nearestGenres(genre, map, 12).map(pinFromGenre)
        : [];
  const mirrors = parseMirrorGenres(html);
  const canvases = parseCanvases(html);
  const htmlPlaylists = parsePlaylists(html, genre.label);
  const playlists = await playlistsForGenre(genre.label, htmlPlaylists);
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
  return {
    genre,
    artists,
    nearby,
    mirrors,
    playlists,
    tracks,
    libraryTracks,
    canvas: canvases[0] ?? { width: 1532, height: 936 },
    nearbyCanvas: canvases[1] ?? { width: 387, height: 336 },
    mirrorCanvas: canvases[2] ?? { width: 387, height: 336 },
  };
}

export async function atlasArtist(
  name: string,
  enrichLimit = 10
): Promise<{
  artist: {
    name: string;
    spotifyArtistId: string | null;
    genres: { id: string; label: string }[];
    outbound: AtlasOutbound;
    profileUrl: string | null;
  };
  features: AtlasArtistRef[];
  nearbyGenres: { id: string; label: string }[];
  branches: AtlasGenre[];
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
} | null> {
  const who = name.trim();
  if (!who) return null;
  const lookupHtml = await fetchEveryNoise(`lookup.cgi?who=${encodeURIComponent(who)}`, PAGE_TTL_MS);
  const lookup = lookupHtml ? parseLookup(lookupHtml) : { name: who, genres: [], spotifyArtistId: null };
  const displayName = lookup.name || who;
  const map = await atlasMap();
  const branches = lookup.genres
    .map((row) => map.find((g) => g.id === row.id))
    .filter((row): row is AtlasGenre => Boolean(row));

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
      profileUrl: lookup.spotifyArtistId
        ? `https://everynoise.com/artistprofile.html?id=${lookup.spotifyArtistId}`
        : null,
    },
    features: [],
    nearbyGenres: lookup.genres,
    branches,
    tracks: libraryTracks.map(cardFromTrack),
    libraryTracks,
  };
}

async function recordingsFromArtists(
  artists: AtlasArtistRef[],
  note: string,
  limit: number
): Promise<LibraryTrack[]> {
  const tracks: LibraryTrack[] = [];
  const seen = new Set<string>();
  for (const artist of artists) {
    if (tracks.length >= limit) break;
    const resolved = await resolveRecording({
      artist: artist.name,
      title: artist.exampleTitle,
      spotifyTrackId: artist.spotifyTrackId,
      spotifyArtistId: artist.spotifyArtistId,
      previewUrl: artist.previewUrl,
      note,
    });
    if (!resolved.track || seen.has(resolved.track.id)) continue;
    seen.add(resolved.track.id);
    tracks.push(resolved.track);
  }
  return tracks;
}

export async function atlasPlaylist(input: {
  id?: string;
  name?: string;
  kind?: AtlasPlaylistKind;
  genre?: string;
  enrichLimit?: number;
}): Promise<{
  playlist: AtlasPlaylist;
  genre: AtlasGenre | null;
  tracks: AtlasTrackCard[];
  libraryTracks: LibraryTrack[];
} | null> {
  let genreLabel = input.genre?.trim() || null;
  if (genreLabel && /[A-Z]/.test(genreLabel) === false && !genreLabel.includes(" ")) {
    const map = await atlasMap();
    const hit = map.find((g) => g.id === genreSlug(genreLabel ?? ""));
    if (hit) genreLabel = hit.label;
  }
  const playlist = await playlistFromRef({
    id: input.id,
    name: input.name,
    kind: input.kind,
    genreLabel,
  });
  if (!playlist) return null;

  const inferred = playlist.genreLabel
    ? { genreLabel: playlist.genreLabel, genreId: playlist.genreId ?? genreSlug(playlist.genreLabel) }
    : inferGenreFromPlaylistTitle(playlist.title);
  const slug = inferred?.genreId || (genreLabel ? genreSlug(genreLabel) : "");
  const page = slug ? await atlasGenre(slug, input.enrichLimit ?? 12) : null;
  let libraryTracks = page?.libraryTracks ?? [];
  const limit = Math.max(6, Math.min(20, input.enrichLimit ?? 12));
  if (libraryTracks.length < 4 && page?.artists.length) {
    const pool =
      playlist.kind === "intro"
        ? page.artists.slice(0, Math.max(6, limit))
        : playlist.kind === "pulse" || playlist.kind === "edge"
          ? rotate(page.artists, playlist.id.length).slice(0, limit + 4)
          : page.artists.slice(0, limit + 4);
    const extra = await recordingsFromArtists(pool, `${playlist.title}`, limit);
    libraryTracks = uniqueTracks([...libraryTracks, ...extra]);
  }
  return {
    playlist: {
      ...playlist,
      genreId: playlist.genreId ?? page?.genre?.id ?? inferred?.genreId ?? null,
      genreLabel: playlist.genreLabel ?? page?.genre?.label ?? inferred?.genreLabel ?? null,
    },
    genre: page?.genre ?? null,
    tracks: libraryTracks.map(cardFromTrack),
    libraryTracks,
  };
}

function rotate<T>(items: T[], seed: number): T[] {
  if (!items.length) return items;
  const offset = Math.abs(seed) % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function uniqueTracks(tracks: LibraryTrack[]): LibraryTrack[] {
  const seen = new Set<string>();
  const out: LibraryTrack[] = [];
  for (const track of tracks) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    out.push(track);
  }
  return out;
}

function harvestLimit(input: { limit?: number; durationMinutes?: number }): number {
  if (input.durationMinutes && input.durationMinutes > 0) {
    return Math.max(8, Math.min(36, Math.ceil((input.durationMinutes * 60) / 150)));
  }
  return Math.max(4, Math.min(16, input.limit ?? 10));
}

function finishHarvest(
  tracks: LibraryTrack[],
  title: string,
  durationMinutes?: number
): {
  tracks: LibraryTrack[];
  title: string;
  durationSeconds: number;
} {
  const unique = uniqueTracks(tracks);
  const capped = durationMinutes ? capToDuration(unique, durationMinutes) : unique;
  const durationSeconds = capped.reduce((sum, track) => sum + (track.duration > 45 ? track.duration : 210), 0);
  return { tracks: capped, title, durationSeconds };
}

export async function harvestAtlas(input: {
  artist?: string;
  genre?: string;
  query?: string;
  playlist?: string;
  playlistKind?: AtlasPlaylistKind;
  limit?: number;
  durationMinutes?: number;
}): Promise<{ tracks: LibraryTrack[]; title: string; durationSeconds: number }> {
  const limit = harvestLimit(input);
  const minutes = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : undefined;
  if (input.playlist?.trim() || input.playlistKind) {
    const page = await atlasPlaylist({
      id: input.playlist,
      kind: input.playlistKind,
      genre: input.genre,
      name: input.query,
      enrichLimit: limit,
    });
    return finishHarvest(page?.libraryTracks ?? [], page?.playlist.title ?? "Playlist", minutes);
  }
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
  const listed = await listAtlasGenres({ family: "all", limit: 8 });
  const pages = await Promise.all(
    listed.listed.slice(0, 3).map((g) => atlasGenre(g.id, Math.max(4, Math.ceil(limit / 3))))
  );
  const tracks: LibraryTrack[] = [];
  for (const page of pages) {
    tracks.push(...(page?.libraryTracks ?? []));
  }
  return finishHarvest(tracks, "Every Noise atlas", minutes);
}
