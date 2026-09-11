export type AtlasFamily = "electronic" | "ambient" | "club" | "all";

export type AtlasCanvas = {
  width: number;
  height: number;
};

export type AtlasGenre = {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  weight: number;
  exampleArtist: string | null;
  exampleTitle: string | null;
  spotifyTrackId: string | null;
  previewUrl: string | null;
  family: AtlasFamily | "other";
};

export type AtlasPin = {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  weight: number;
  exampleArtist: string | null;
  exampleTitle: string | null;
  spotifyTrackId: string | null;
  previewUrl: string | null;
};

export type AtlasPlaylistKind = "sound" | "intro" | "pulse" | "edge" | "new" | "other";

export type AtlasPlaylist = {
  id: string;
  title: string;
  url: string;
  kind: AtlasPlaylistKind;
  genreId: string | null;
  genreLabel: string | null;
};

export type AtlasArtistRef = {
  name: string;
  spotifyArtistId: string | null;
  spotifyTrackId: string | null;
  exampleTitle: string | null;
  previewUrl: string | null;
  color: string | null;
  x: number;
  y: number;
  weight: number;
  scan: boolean;
};

export type AtlasOutbound = {
  apple: string | null;
  appleArtist: string | null;
  spotify: string | null;
  spotifyArtist: string | null;
  youtubeMusic: string | null;
  soundcloud: string | null;
};

export type AtlasTrackCard = {
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  duration: number;
  libraryId: string | null;
  outbound: AtlasOutbound;
};

export type AtlasArtistCard = {
  name: string;
  spotifyArtistId: string | null;
  genres: { id: string; label: string }[];
  outbound: AtlasOutbound;
  features: AtlasArtistRef[];
};

export function genreSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function titleCaseGenre(label: string): string {
  return label.replace(/(^|[\s+/_-])([a-z])/g, (_, edge: string, letter: string) => `${edge}${letter.toUpperCase()}`);
}

export function spotifyTrackUrl(id: string | null | undefined): string | null {
  return id ? `https://open.spotify.com/track/${id}` : null;
}

export function spotifyArtistUrl(id: string | null | undefined): string | null {
  return id ? `https://open.spotify.com/artist/${id}` : null;
}

export function spotifyPlaylistUrl(id: string): string {
  return `https://open.spotify.com/playlist/${id}`;
}

export function playlistIdFromRef(value: string): string {
  const trimmed = value.trim();
  const uri = trimmed.match(/spotify:playlist:([A-Za-z0-9]+)/i);
  if (uri?.[1]) return uri[1];
  const page = trimmed.match(/open\.spotify\.com\/(?:user\/[^/]+\/)?playlist\/([A-Za-z0-9]+)/i);
  if (page?.[1]) return page[1];
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return "";
}

export function isSearchUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\/search(\?|\/)/i.test(url) || /[?&]term=/i.test(url) || /search\.html/i.test(url);
}

export function searchUrls(artist: string, title?: string | null): AtlasOutbound {
  const song = `${artist} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  const person = artist.trim();
  return {
    apple: song ? `https://music.apple.com/us/search?term=${encodeURIComponent(song)}` : null,
    appleArtist: person ? `https://music.apple.com/us/search?term=${encodeURIComponent(person)}` : null,
    spotify: song ? `https://open.spotify.com/search/${encodeURIComponent(song)}` : null,
    spotifyArtist: person ? `https://open.spotify.com/search/${encodeURIComponent(person)}` : null,
    youtubeMusic: song ? `https://music.youtube.com/search?q=${encodeURIComponent(song)}` : null,
    soundcloud: song ? `https://soundcloud.com/search/sounds?q=${encodeURIComponent(song)}` : null,
  };
}
