import { classifyFamily } from "./families";
import {
  genreSlug,
  playlistIdFromRef,
  spotifyPlaylistUrl,
  titleCaseGenre,
  type AtlasArtistRef,
  type AtlasCanvas,
  type AtlasGenre,
  type AtlasPin,
  type AtlasPlaylist,
  type AtlasPlaylistKind,
} from "./types";

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

export function parseCanvases(html: string): AtlasCanvas[] {
  const out: AtlasCanvas[] = [];
  for (const match of html.matchAll(/<div class=canvas\b([^>]*)>/gi)) {
    const style = match[1] ?? "";
    const width = style.match(/width:\s*([\d.]+)px/i);
    const height = style.match(/height:\s*([\d.]+)px/i);
    if (!width || !height) continue;
    out.push({ width: Number(width[1]), height: Number(height[1]) });
  }
  return out;
}

export function parseCanvas(html: string): AtlasCanvas {
  return parseCanvases(html)[0] ?? { width: 1600, height: 900 };
}

function pinFromBlock(block: string, fallbackId: string): AtlasPin | null {
  const click = playx(block);
  const slug = slugFromHref(block) || (click ? genreSlug(click.name) : "") || fallbackId;
  const label = click?.name || textLabel(block);
  if (!slug || !label) return null;
  const example = parseExampleTitle(attr(block, "title"));
  return {
    id: slug,
    label,
    color: styleColor(block),
    x: stylePx(block, "left"),
    y: stylePx(block, "top"),
    weight: fontWeight(block),
    exampleArtist: example?.artist ?? null,
    exampleTitle: example?.title ?? null,
    spotifyTrackId: click?.id ?? null,
    previewUrl: attr(block, "preview_url"),
  };
}

export function parseMap(html: string): AtlasGenre[] {
  const { items } = parseScatter(html);
  const out: AtlasGenre[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind !== "item") continue;
    const pin = pinFromBlock(row.block, "");
    if (!pin || seen.has(pin.id)) continue;
    seen.add(pin.id);
    out.push({
      ...pin,
      family: classifyFamily(pin.label),
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
    if (!name || name.length < 1) continue;
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
      weight: fontWeight(row.block),
      scan: /\sscan\s*=\s*(?:true|"true")/i.test(row.block) || /\bscanme\b/i.test(row.block),
    });
  }
  return out;
}

function parsePins(html: string, kind: "nearby" | "mirror"): AtlasPin[] {
  const { items } = parseScatter(html);
  const out: AtlasPin[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind !== kind) continue;
    const pin = pinFromBlock(row.block, "");
    if (!pin || seen.has(pin.id)) continue;
    seen.add(pin.id);
    out.push(pin);
  }
  return out;
}

export function parseNearbyGenres(html: string): AtlasPin[] {
  return parsePins(html, "nearby");
}

export function parseMirrorGenres(html: string): AtlasPin[] {
  return parsePins(html, "mirror");
}

function kindFromText(text: string): AtlasPlaylistKind | null {
  const value = text.trim().toLowerCase();
  if (value === "playlist" || value === "sound") return "sound";
  if (value === "intro") return "intro";
  if (value === "pulse") return "pulse";
  if (value === "edge") return "edge";
  if (value === "new") return "new";
  return null;
}

function kindFromTitle(title: string): AtlasPlaylistKind {
  if (/intro/i.test(title)) return "intro";
  if (/pulse|favorite/i.test(title)) return "pulse";
  if (/edge|discover/i.test(title)) return "edge";
  if (/sound of/i.test(title)) return "sound";
  if (/\bnew\b|nrbg/i.test(title)) return "new";
  return "other";
}

function soundNameFromTitle(title: string): string | null {
  const match = decodeEntities(title).match(/listen to (The Sound of .+?) on Spotify/i);
  return match?.[1]?.trim() ?? null;
}

export function displayPlaylistTitle(
  kind: AtlasPlaylistKind,
  genreLabel: string | null | undefined,
  titleAttr?: string | null
): string {
  const named = soundNameFromTitle(titleAttr ?? "");
  if (named) return named;
  const pretty = genreLabel ? titleCaseGenre(genreLabel) : "this branch";
  if (kind === "sound") return `The Sound of ${pretty}`;
  if (kind === "intro") return `Intro to ${pretty}`;
  if (kind === "pulse") return `The Pulse of ${pretty}`;
  if (kind === "edge") return `The Edge of ${pretty}`;
  if (kind === "new") return `New in ${pretty}`;
  return titleAttr?.trim() || pretty;
}

export function parsePlaylists(html: string, genreLabel?: string | null): AtlasPlaylist[] {
  const out: AtlasPlaylist[] = [];
  const seen = new Set<string>();
  const genreId = genreLabel ? genreSlug(genreLabel) : null;
  const label = genreLabel?.trim() || null;

  const re =
    /<a\b([^>]*href="(https:\/\/open\.spotify\.com\/(?:playlist|user\/[^/]+\/playlist)\/([A-Za-z0-9]+))"[^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const open = match[1] ?? "";
    const rawUrl = match[2];
    const id = playlistIdFromRef(match[3] ?? "") || match[3];
    if (!id || seen.has(id)) continue;
    const inner = decodeEntities(match[4] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const titleAttr = attr(`<a ${open}>`, "title") ?? "";
    const kind = kindFromText(inner) ?? kindFromTitle(titleAttr);
    seen.add(id);
    out.push({
      id,
      title: displayPlaylistTitle(kind, label, titleAttr),
      url: spotifyPlaylistUrl(id),
      kind,
      genreId,
      genreLabel: label,
    });
  }

  const nrbg = html.match(/href="(nrbg\.html\?genre=([^"]+))"/i);
  if (nrbg) {
    const encoded = nrbg[2] ?? "";
    const decoded = decodeURIComponent(encoded.replace(/\+/g, " "));
    const newId = `nrbg-${genreSlug(decoded || label || "branch")}`;
    if (!seen.has(newId)) {
      out.push({
        id: newId,
        title: displayPlaylistTitle("new", decoded || label),
        url: `https://everynoise.com/nrbg.html?genre=${encoded}`,
        kind: "new",
        genreId: genreSlug(decoded || label || "") || genreId,
        genreLabel: decoded || label,
      });
    }
  }

  const order: AtlasPlaylistKind[] = ["sound", "intro", "pulse", "edge", "new", "other"];
  out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
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
