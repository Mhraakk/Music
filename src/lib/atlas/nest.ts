import { FEELING_SLUG_SET } from "@/lib/feelings/taxonomy";
import type { AtlasPlaylist } from "@/lib/everynoise/types";

export type AtlasNestId = "atlas" | "feelings";

export type AtlasNest = {
  id: AtlasNestId;
  rootHref: string;
  rootLabel: string;
  genreHref: (id: string) => string;
  artistHref: (name: string) => string;
  playlistHref: (playlist: Pick<AtlasPlaylist, "id" | "kind" | "title">, genreId: string) => string;
  allowGenreIds: ReadonlySet<string> | null;
};

function playlistHref(root: string, playlist: Pick<AtlasPlaylist, "id" | "kind" | "title">, genreId: string): string {
  const kind = playlist.kind === "new" ? "new" : playlist.kind;
  return `${root}/playlist/${encodeURIComponent(playlist.id)}?kind=${encodeURIComponent(kind)}&genre=${encodeURIComponent(genreId)}&title=${encodeURIComponent(playlist.title)}`;
}

export const ATLAS_NEST: AtlasNest = {
  id: "atlas",
  rootHref: "/atlas",
  rootLabel: "Every Noise at Once",
  genreHref: (id) => `/atlas/genre/${id}`,
  artistHref: (name) => `/atlas/artist?name=${encodeURIComponent(name)}`,
  playlistHref: (playlist, genreId) => playlistHref("/atlas", playlist, genreId),
  allowGenreIds: null,
};

export const FEELINGS_NEST: AtlasNest = {
  id: "feelings",
  rootHref: "/feelings",
  rootLabel: "Feelings",
  genreHref: (id) => `/feelings/genre/${id}`,
  artistHref: (name) => `/feelings/artist?name=${encodeURIComponent(name)}`,
  playlistHref: (playlist, genreId) => playlistHref("/feelings", playlist, genreId),
  allowGenreIds: FEELING_SLUG_SET,
};

export function nestFor(id: AtlasNestId | undefined): AtlasNest {
  return id === "feelings" ? FEELINGS_NEST : ATLAS_NEST;
}
