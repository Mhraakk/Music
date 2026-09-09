export type AtlasFamily = "electronic" | "ambient" | "club" | "all";

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

export type AtlasPlaylist = {
  id: string;
  title: string;
  url: string;
  kind: "sound" | "intro" | "pulse" | "edge" | "other";
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

export function spotifyTrackUrl(id: string | null | undefined): string | null {
  return id ? `https://open.spotify.com/track/${id}` : null;
}

export function spotifyArtistUrl(id: string | null | undefined): string | null {
  return id ? `https://open.spotify.com/artist/${id}` : null;
}

export function spotifyPlaylistUrl(id: string): string {
  return `https://open.spotify.com/playlist/${id}`;
}

export function searchUrls(artist: string, title?: string | null): AtlasOutbound {
  const song = `${artist} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  const person = artist.trim();
  return {
    apple: song
      ? `https://music.apple.com/us/search?term=${encodeURIComponent(song)}`
      : null,
    appleArtist: person
      ? `https://music.apple.com/us/search?term=${encodeURIComponent(person)}`
      : null,
    spotify: song
      ? `https://open.spotify.com/search/${encodeURIComponent(song)}`
      : null,
    spotifyArtist: person
      ? `https://open.spotify.com/search/${encodeURIComponent(person)}`
      : null,
    youtubeMusic: song
      ? `https://music.youtube.com/search?q=${encodeURIComponent(song)}`
      : null,
    soundcloud: song
      ? `https://soundcloud.com/search/sounds?q=${encodeURIComponent(song)}`
      : null,
  };
}
