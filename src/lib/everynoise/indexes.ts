import { fetchEveryNoise, MAP_TTL_MS } from "./fetch";
import { displayPlaylistTitle } from "./parse";
import { genreSlug, playlistIdFromRef, titleCaseGenre, type AtlasPlaylist, type AtlasPlaylistKind } from "./types";

type IndexEntry = { title: string; id: string };

type Indexes = {
  sound: Map<string, IndexEntry>;
  particle: Map<string, IndexEntry>;
  intro: Map<string, IndexEntry>;
  byId: Map<string, { title: string; kind: AtlasPlaylistKind }>;
};

function parseIndex(body: string | null): Map<string, IndexEntry> {
  const map = new Map<string, IndexEntry>();
  if (!body) return map;
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    for (const [title, uri] of Object.entries(json)) {
      if (typeof uri !== "string") continue;
      const id = playlistIdFromRef(uri);
      if (!id) continue;
      map.set(title.toLowerCase(), { title, id });
    }
  } catch {
    return map;
  }
  return map;
}

function kindFromIndexTitle(title: string): AtlasPlaylistKind {
  if (/^the sound of /i.test(title)) return "sound";
  if (/^intro to /i.test(title)) return "intro";
  if (/^the pulse of /i.test(title)) return "pulse";
  if (/^the edge of /i.test(title)) return "edge";
  return "other";
}

let memo: { at: number; indexes: Indexes } | null = null;

export async function playlistIndexes(): Promise<Indexes> {
  if (memo && Date.now() - memo.at < MAP_TTL_MS) return memo.indexes;
  const [soundBody, particleBody, introBody] = await Promise.all([
    fetchEveryNoise("playlistindex-thesoundsofspotify.json", MAP_TTL_MS),
    fetchEveryNoise("playlistindex-particledetector.json", MAP_TTL_MS),
    fetchEveryNoise("playlistindex-particleintroductor.json", MAP_TTL_MS),
  ]);
  const sound = parseIndex(soundBody);
  const particle = parseIndex(particleBody);
  const intro = parseIndex(introBody);
  const byId = new Map<string, { title: string; kind: AtlasPlaylistKind }>();
  for (const bucket of [sound, particle, intro]) {
    for (const entry of bucket.values()) {
      if (byId.has(entry.id)) continue;
      byId.set(entry.id, { title: entry.title, kind: kindFromIndexTitle(entry.title) });
    }
  }
  const indexes = { sound, particle, intro, byId };
  if (sound.size || particle.size || intro.size) memo = { at: Date.now(), indexes };
  return indexes;
}

function lookup(map: Map<string, IndexEntry>, title: string): IndexEntry | null {
  return map.get(title.toLowerCase()) ?? null;
}

export function playlistTitlesForGenre(label: string): Record<AtlasPlaylistKind, string> {
  const pretty = titleCaseGenre(label);
  return {
    sound: `The Sound of ${pretty}`,
    intro: `Intro to ${pretty}`,
    pulse: `The Pulse of ${pretty}`,
    edge: `The Edge of ${pretty}`,
    new: `New in ${pretty}`,
    other: pretty,
  };
}

export async function playlistsForGenre(label: string, htmlPlaylists: AtlasPlaylist[]): Promise<AtlasPlaylist[]> {
  const indexes = await playlistIndexes();
  const titles = playlistTitlesForGenre(label);
  const byKind = new Map<AtlasPlaylistKind, AtlasPlaylist>();
  for (const row of htmlPlaylists) byKind.set(row.kind, row);

  const fill = (kind: AtlasPlaylistKind, entry: IndexEntry | null) => {
    const existing = byKind.get(kind);
    if (existing) {
      if (entry && existing.title.startsWith("listen to")) {
        existing.title = entry.title;
      } else if (entry && kind !== "new") {
        existing.title = entry.title;
      }
      return;
    }
    if (!entry) return;
    byKind.set(kind, {
      id: entry.id,
      title: entry.title,
      url: `https://open.spotify.com/playlist/${entry.id}`,
      kind,
      genreId: htmlPlaylists[0]?.genreId ?? null,
      genreLabel: label,
    });
  };

  fill("sound", lookup(indexes.sound, titles.sound));
  fill("intro", lookup(indexes.intro, titles.intro));
  fill("pulse", lookup(indexes.particle, titles.pulse));
  fill("edge", lookup(indexes.particle, titles.edge));

  const order: AtlasPlaylistKind[] = ["sound", "intro", "pulse", "edge", "new", "other"];
  return [...byKind.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export async function playlistFromRef(input: {
  id?: string | null;
  name?: string | null;
  kind?: AtlasPlaylistKind | null;
  genreLabel?: string | null;
}): Promise<AtlasPlaylist | null> {
  const indexes = await playlistIndexes();
  const id = input.id ? playlistIdFromRef(input.id) : "";
  if ((input.id ?? "").startsWith("nrbg-") && (input.genreLabel || input.kind === "new")) {
    const slug = input.genreLabel ? genreSlug(input.genreLabel) : input.id!.replace(/^nrbg-/, "");
    return {
      id: input.id!,
      title: displayPlaylistTitle("new", input.genreLabel ?? slug),
      url: `https://everynoise.com/nrbg.html?genre=${encodeURIComponent(input.genreLabel ?? slug)}`,
      kind: "new",
      genreId: slug,
      genreLabel: input.genreLabel ?? null,
    };
  }
  if (id && !id.startsWith("nrbg-")) {
    const hit = indexes.byId.get(id);
    if (hit) {
      const inferred = inferGenreFromPlaylistTitle(hit.title);
      return {
        id,
        title: hit.title,
        url: `https://open.spotify.com/playlist/${id}`,
        kind: input.kind && input.kind !== "other" ? input.kind : hit.kind,
        genreId: inferred?.genreId ?? null,
        genreLabel: inferred?.genreLabel ?? input.genreLabel ?? null,
      };
    }
    if (input.genreLabel) {
      return {
        id,
        title: displayPlaylistTitle(input.kind ?? "other", input.genreLabel),
        url: `https://open.spotify.com/playlist/${id}`,
        kind: input.kind && input.kind !== "other" ? input.kind : "sound",
        genreId: genreSlug(input.genreLabel),
        genreLabel: input.genreLabel,
      };
    }
  }

  if (input.name?.trim()) {
    const needle = input.name.trim().toLowerCase();
    for (const bucket of [indexes.sound, indexes.intro, indexes.particle]) {
      const entry = bucket.get(needle);
      if (entry) {
        const meta = indexes.byId.get(entry.id);
        const inferred = inferGenreFromPlaylistTitle(entry.title);
        return {
          id: entry.id,
          title: entry.title,
          url: `https://open.spotify.com/playlist/${entry.id}`,
          kind: meta?.kind ?? "other",
          genreId: inferred?.genreId ?? null,
          genreLabel: inferred?.genreLabel ?? null,
        };
      }
    }
  }

  if (input.genreLabel && input.kind && input.kind !== "other" && input.kind !== "new") {
    const titles = playlistTitlesForGenre(input.genreLabel);
    const named = titles[input.kind];
    const bucket = input.kind === "sound" ? indexes.sound : input.kind === "intro" ? indexes.intro : indexes.particle;
    const entry = lookup(bucket, named);
    if (entry) {
      return {
        id: entry.id,
        title: entry.title,
        url: `https://open.spotify.com/playlist/${entry.id}`,
        kind: input.kind,
        genreId: genreSlug(input.genreLabel),
        genreLabel: input.genreLabel,
      };
    }
    return {
      id: `local-${input.kind}-${genreSlug(input.genreLabel)}`,
      title: displayPlaylistTitle(input.kind, input.genreLabel),
      url: `https://everynoise.com/engenremap-${genreSlug(input.genreLabel)}.html`,
      kind: input.kind,
      genreId: genreSlug(input.genreLabel),
      genreLabel: input.genreLabel,
    };
  }

  if (input.kind === "new" && input.genreLabel) {
    const slug = genreSlug(input.genreLabel);
    return {
      id: `nrbg-${slug}`,
      title: displayPlaylistTitle("new", input.genreLabel),
      url: `https://everynoise.com/nrbg.html?genre=${encodeURIComponent(input.genreLabel)}`,
      kind: "new",
      genreId: slug,
      genreLabel: input.genreLabel,
    };
  }

  return null;
}

export function inferGenreFromPlaylistTitle(title: string): { genreLabel: string; genreId: string } | null {
  const match = title.match(/^(?:The Sound of|Intro to|The Pulse of|The Edge of)\s+(.+)$/i);
  if (!match?.[1]) return null;
  const genreLabel = match[1].trim();
  return { genreLabel, genreId: genreSlug(genreLabel) };
}
