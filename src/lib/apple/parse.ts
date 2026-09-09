/**
 * Turn an Apple Music API song (library or catalog) into an expansion candidate.
 * Genre names from Apple are discarded — they never enter the substrate.
 */

import { upsizeArtwork } from "@/lib/drift/expansion/itunes";
import type { ExternalCandidate } from "@/lib/drift/expansion/types";

type AppleSongNode = {
  id?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    durationInMillis?: number;
    url?: string;
    previews?: { url?: string }[];
    artwork?: { url?: string };
    playParams?: { catalogId?: string; id?: string };
  };
  relationships?: {
    catalog?: { data?: AppleSongNode[] };
  };
};

function artworkUrl(node: AppleSongNode | undefined, size: number): string | null {
  const template = node?.attributes?.artwork?.url;
  if (!template) return null;
  return template.replace("{w}x{h}", `${size}x${size}`);
}

export function appleSongToCandidate(node: AppleSongNode): ExternalCandidate | null {
  const catalog = node.relationships?.catalog?.data?.[0];
  const src = catalog?.attributes ? catalog : node;
  const title = src.attributes?.name?.trim() || node.attributes?.name?.trim();
  const artist = src.attributes?.artistName?.trim() || node.attributes?.artistName?.trim();
  if (!title || !artist) return null;

  const appleTrackId =
    catalog?.id ||
    src.attributes?.playParams?.catalogId ||
    node.attributes?.playParams?.catalogId ||
    node.id;
  if (!appleTrackId) return null;

  const art = artworkUrl(src, 1000) ?? artworkUrl(node, 1000);
  const preview = src.attributes?.previews?.[0]?.url ?? node.attributes?.previews?.[0]?.url ?? null;

  return {
    appleTrackId: String(appleTrackId),
    title,
    artist,
    album: src.attributes?.albumName ?? node.attributes?.albumName ?? null,
    durationMs: src.attributes?.durationInMillis ?? node.attributes?.durationInMillis ?? 0,
    previewUrl: preview,
    artworkUrl: art ? upsizeArtwork(art, 1000) : null,
    thumbUrl: art ? upsizeArtwork(art, 200) : art,
    appleUrl: src.attributes?.url ?? node.attributes?.url ?? null,
    probeArtist: artist,
    probeVia: "favorite-songs",
  };
}

export function parseAppleTrackPage(payload: unknown): {
  songs: AppleSongNode[];
  next: string | null;
  total: number | null;
} {
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const data = Array.isArray(rec.data) ? (rec.data as AppleSongNode[]) : [];
  const next =
    rec.next && typeof rec.next === "string"
      ? rec.next
      : rec.meta && typeof rec.meta === "object"
        ? null
        : null;
  const meta = rec.meta && typeof rec.meta === "object" ? (rec.meta as Record<string, unknown>) : {};
  const total = typeof meta.total === "number" ? meta.total : null;
  return { songs: data, next, total };
}
