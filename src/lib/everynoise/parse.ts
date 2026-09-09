import { classifyFamily } from "./families";
import { genreSlug, type AtlasArtistRef, type AtlasGenre, type AtlasPlaylist } from "./types";

export type ParsedExample = { artist: string; title: string };

export function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

export function parseExampleTitle(raw: string | null | undefined): ParsedExample | null {
  if (!raw) return null;
  const cleaned = decodeEntities(raw).replace(/^e\.g\.\s*/i, "").trim();
  const match = cleaned.match(/^(.+?)\s+"([^"]+)"\s*$/);
  if (!match) return null;
  return { artist: match[1].trim(), title: match[2].trim() };
}

function attr(block: string, name: string): string | null {
  const double = block.match(new RegExp(`${name}="([^"]*)"`, "i"));
  if (double?.[1]) return decodeEntities(double[1]);
  const bare = block.match(new RegExp(`${name}=([^\\s>]+)`, "i"));
  return bare?.[1] ? decodeEntities(bare[1].replace(/^["']|["']$/g, "")) : null;
}

function stylePx(block: string, prop: string): number {
  const match = block.match(new RegExp(`${prop}:\\s*([\\d.]+)px`, "i"));
  return match ? Number(match[1]) : 0;
}

function styleColor(block: string): string {
  const match = block.match(/color:\s*(#[0-9a-f]{3,8})/i);
  return match?.[1] ?? "#516254";
}

function fontWeight(block: string): number {
  const match = block.match(/font-size:\s*([\d.]+)%/i);
  return match ? Number(match[1]) : 100;
}

function playx(block: string): { id: string; name: string } | null {
  const match =
    block.match(/playx\((?:&quot;|")([A-Za-z0-9]+)(?:&quot;|")\s*,\s*(?:&quot;|")([\s\S]*?)(?:&quot;|")/i) ??
    block.match(/playx\(&quot;([A-Za-z0-9]+)&quot;, &quot;([\s\S]*?)&quot;/);
  if (!match) return null;
  return { id: match[1], name: decodeEntities(match[2]) };
}

function textLabel(block: string): string {
  const inner = block.replace(/<a[\s\S]*?<\/a>/gi, "").replace(/<[^>]+>/g, " ");
  return decodeEntities(inner).replace(/\s+/g, " ").trim();
}

function slugFromHref(block: string): string | null {
  const genre = block.match(/engenremap-([a-z0-9]+)\.html/i);
  if (genre?.[1]) return genre[1];
  return null;
}

function artistIdFromHref(block: string): string | null {
  const match = block.match(/artistprofile\.(?:html|cgi)\?id=([A-Za-z0-9]+)/i);
  return match?.[1] ?? null;
}

const DIV_RE = /<div\b[^>]*\bid=(item|nearbyitem|mirroritem)\d+[^>]*>[\s\S]*?<\/div>/gi;

export function parseScatter(html: string): {
  items: { kind: "item" | "nearby" | "mirror"; block: string }[];
} {
  const items: { kind: "item" | "nearby" | "mirror"; block: string }[] = [];
  for (const match of html.matchAll(DIV_RE)) {
    const prefix = (match[1] ?? "item").toLowerCase();
    const kind = prefix === "nearbyitem" ? "nearby" : prefix === "mirroritem" ? "mirror" : "item";
    items.push({ kind, block: match[0] });
  }
  return { items };
}

export function parseMap(html: string): AtlasGenre[] {
  const { items } = parseScatter(html);
  const out: AtlasGenre[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind !== "item") continue;
    const click = playx(row.block);
    const slug = slugFromHref(row.block) || (click ? genreSlug(click.name) : "");
    const label = click?.name || textLabel(row.block);
    if (!slug || !label) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const example = parseExampleTitle(attr(row.block, "title"));
    out.push({
      id: slug,
      label,
      color: styleColor(row.block),
      x: stylePx(row.block, "left"),
      y: stylePx(row.block, "top"),
      weight: fontWeight(row.block),
      exampleArtist: example?.artist ?? null,
      exampleTitle: example?.title ?? null,
      spotifyTrackId: click?.id ?? null,
      previewUrl: attr(row.block, "preview_url"),
      family: classifyFamily(label),
    });
  }
  return out;
}

export function parseGenreArtists(html: string): AtlasArtistRef[] {
  const { items } = parseScatter(html);
  const out: AtlasArtistRef[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind !== "item") continue;
    const click = playx(row.block);
    const name = click?.name || textLabel(row.block);
    if (!name || /»/.test(name) && name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const example = parseExampleTitle(attr(row.block, "title"));
    out.push({
      name,
      spotifyArtistId: artistIdFromHref(row.block),
      spotifyTrackId: click?.id ?? null,
      exampleTitle: example?.title ?? null,
      previewUrl: attr(row.block, "preview_url"),
      color: styleColor(row.block),
      x: stylePx(row.block, "left"),
      y: stylePx(row.block, "top"),
    });
  }
  return out;
}

export function parseNearbyGenres(html: string): { id: string; label: string }[] {
  const { items } = parseScatter(html);
  const out: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind !== "nearby") continue;
    const click = playx(row.block);
    const slug = slugFromHref(row.block) || (click ? genreSlug(click.name) : "");
    const label = click?.name || textLabel(row.block);
    if (!slug || !label || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ id: slug, label });
  }
  return out;
}

export function parsePlaylists(html: string): AtlasPlaylist[] {
  const out: AtlasPlaylist[] = [];
  const seen = new Set<string>();
  const re =
    /href="(https:\/\/open\.spotify\.com\/(?:playlist|user\/[^/]+\/playlist)\/([A-Za-z0-9]+))"[^>]*title="([^"]*)"/gi;
  for (const match of html.matchAll(re)) {
    const url = match[1];
    const id = match[2];
    const title = decodeEntities(match[3] ?? "");
    if (seen.has(id)) continue;
    seen.add(id);
    const kind: AtlasPlaylist["kind"] = /intro/i.test(title)
      ? "intro"
      : /pulse|favorite/i.test(title)
        ? "pulse"
        : /edge|discover/i.test(title)
          ? "edge"
          : /sound of/i.test(title)
            ? "sound"
            : "other";
    out.push({ id, title: title || `Spotify playlist ${id}`, url, kind });
  }
  return out;
}

export function parseLookup(html: string): {
  name: string;
  genres: { id: string; label: string }[];
  spotifyArtistId: string | null;
} {
  const who = html.match(/name=who[^>]*value="([^"]*)"/i)?.[1] ?? "";
  const genres: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="engenremap-([a-z0-9]+)\.html"[^>]*>([^<]+)</gi)) {
    const id = match[1];
    const label = decodeEntities(match[2]).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    genres.push({ id, label });
  }
  const spotifyArtistId = html.match(/artistprofile\.(?:html|cgi)\?id=([A-Za-z0-9]+)/i)?.[1] ?? null;
  return { name: decodeEntities(who), genres, spotifyArtistId };
}

export function nearestGenres(seed: AtlasGenre, all: AtlasGenre[], count = 10): AtlasGenre[] {
  return all
    .filter((g) => g.id !== seed.id)
    .map((g) => ({ g, d: (g.x - seed.x) ** 2 + (g.y - seed.y) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((row) => row.g);
}
