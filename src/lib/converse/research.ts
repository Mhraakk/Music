/**
 * Published liner-notes context for Ask / MCP.
 *
 * Wikipedia + MusicBrainz only. Never invents biographies or lyrics.
 * Atlas genre labels are not written onto catalog records from this path.
 */

export type RecordingResearch = {
  ok: boolean;
  artist: string;
  title: string | null;
  summary: string | null;
  wikipediaUrl: string | null;
  musicbrainzUrl: string | null;
  type: string | null;
  area: string | null;
  lifespan: string | null;
  album: string | null;
  date: string | null;
  note: string;
};

const UA = "Resonant/4.1 (https://github.com/Mhraakk/Music)";
const TIMEOUT_MS = 4200;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function wikipediaTitle(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

async function wikipediaSummary(name: string): Promise<{ extract: string; url: string } | null> {
  const payload = asRecord(
    await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaTitle(name))}`)
  );
  const extract = asString(payload.extract);
  const desktop = asRecord(asRecord(payload.content_urls).desktop);
  const page = asString(desktop.page);
  if (!extract || payload.type === "disambiguation") return null;
  return { extract, url: page || `https://en.wikipedia.org/wiki/${wikipediaTitle(name)}` };
}

type MbArtist = {
  id: string;
  name: string;
  type: string | null;
  area: string | null;
  lifespan: string | null;
};

async function musicBrainzArtist(name: string): Promise<MbArtist | null> {
  const search = asRecord(
    await fetchJson(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:${name}`)}&fmt=json&limit=1`
    )
  );
  const artists = Array.isArray(search.artists) ? search.artists : [];
  const row = asRecord(artists[0]);
  const id = asString(row.id);
  const hitName = asString(row.name);
  if (!id || !hitName) return null;
  const life = asRecord(row["life-span"]);
  const begin = asString(life.begin);
  const end = asString(life.end);
  const area = asRecord(row.area);
  return {
    id,
    name: hitName,
    type: asString(row.type) || null,
    area: asString(area.name) || null,
    lifespan: begin || end ? [begin || "?", end || "present"].join(" to ") : null,
  };
}

async function musicBrainzRecording(
  artist: string,
  title: string
): Promise<{ album: string | null; date: string | null } | null> {
  const search = asRecord(
    await fetchJson(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
        `recording:"${title}" AND artist:"${artist}"`
      )}&fmt=json&limit=1`
    )
  );
  const recordings = Array.isArray(search.recordings) ? search.recordings : [];
  const row = asRecord(recordings[0]);
  if (!asString(row.id)) return null;
  const releases = Array.isArray(row.releases) ? row.releases : [];
  const release = asRecord(releases[0]);
  return {
    album: asString(release.title) || null,
    date: asString(release.date) || asString(row["first-release-date"]) || null,
  };
}

export async function researchRecording(input: {
  artist: string;
  title?: string;
}): Promise<RecordingResearch> {
  const artist = input.artist.trim();
  const title = input.title?.trim() || null;
  if (!artist) {
    return {
      ok: false,
      artist: "",
      title,
      summary: null,
      wikipediaUrl: null,
      musicbrainzUrl: null,
      type: null,
      area: null,
      lifespan: null,
      album: null,
      date: null,
      note: "Name an artist. This tool only cites published pages; it never invents lyrics.",
    };
  }

  const [wiki, mb, recording] = await Promise.all([
    wikipediaSummary(artist),
    musicBrainzArtist(artist),
    title ? musicBrainzRecording(artist, title) : Promise.resolve(null),
  ]);

  const ok = Boolean(wiki?.extract || mb?.id);
  return {
    ok,
    artist: mb?.name || artist,
    title,
    summary: wiki?.extract ?? null,
    wikipediaUrl: wiki?.url ?? null,
    musicbrainzUrl: mb ? `https://musicbrainz.org/artist/${mb.id}` : null,
    type: mb?.type ?? null,
    area: mb?.area ?? null,
    lifespan: mb?.lifespan ?? null,
    album: recording?.album ?? null,
    date: recording?.date ?? null,
    note: ok
      ? "Published Wikipedia / MusicBrainz context only. Do not invent lyrics or treat this as a genre field on a catalog record."
      : "No published page for that name yet. Search Apple Music for recordings instead of inventing a biography.",
  };
}
