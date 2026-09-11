import { findMusic } from "@/lib/converse/anywhere";
import { capToDuration } from "@/lib/listen/duration";
import type { LibraryTrack } from "@/lib/library";
import { parseIdList, rotate, seededShuffle } from "@/lib/fresh/rotate";
import { extractWheatHints, parseTelegramWidget } from "./parse";
import { hintQuery, pickWheatNight, roomForQuery, type NightHint } from "./night-pool";

export const WHEAT_CHANNEL = "wheat1";
export const WHEAT_URL = "https://t.me/wheat1";

export type WheatHarvestInput = {
  text?: string;
  durationMinutes?: number;
  limit?: number;
  seed?: number;
  exclude?: string[];
  excludeQueries?: string[];
  refuseRooms?: string[];
};

async function fetchPreview(): Promise<string | null> {
  const urls = [
    `https://t.me/s/${WHEAT_CHANNEL}`,
    `https://t.me/${WHEAT_CHANNEL}?embed=1`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          accept: "text/html",
        },
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) continue;
      if (!response.ok) continue;
      const html = await response.text();
      if (html.includes("err_message")) continue;
      if (html.includes("tgme_widget_message_text") || html.includes("tgme_widget_message_document_title")) {
        return html;
      }
    } catch {
      /* try the next public surface */
    }
  }
  return null;
}

export async function harvestWheat(input: WheatHarvestInput): Promise<{
  tracks: LibraryTrack[];
  title: string;
  publicPreview: boolean;
  hints: string[];
  durationSeconds: number;
  fresh: boolean;
}> {
  const seed = Number.isFinite(input.seed) ? Number(input.seed) : Date.now();
  const exclude = new Set((input.exclude ?? []).map((id) => id.trim()).filter(Boolean));
  const queryExclude = new Set(
    (input.excludeQueries ?? []).map((query) => query.trim().toLowerCase()).filter(Boolean)
  );
  const refuseRooms = new Set((input.refuseRooms ?? []).map((id) => id.trim()).filter(Boolean));
  const limit = Math.max(1, Math.min(8, input.limit ?? 5));

  const captions: string[] = [];
  let publicPreview = false;
  let fresh = false;
  const pasted = input.text?.trim();
  if (pasted) captions.push(pasted);

  if (!pasted) {
    const html = await fetchPreview();
    if (html) {
      publicPreview = true;
      captions.push(...parseTelegramWidget(html));
    }
  }

  let hintQueries = captions.flatMap((caption) => extractWheatHints(caption)).map((h) => h.query);
  let pooled: NightHint[] = [];

  if (hintQueries.length) {
    hintQueries = rotate(seededShuffle(hintQueries, seed), seed).slice(0, 16);
  } else {
    pooled = pickWheatNight(seed, Math.max(limit + 8, 12), queryExclude, refuseRooms);
    hintQueries = pooled.map(hintQuery);
    fresh = true;
  }

  const tracks: LibraryTrack[] = [];
  const seen = new Set<string>(exclude);
  for (const query of hintQueries) {
    const found = await findMusic(query, 4);
    const track = pickForHint(query, found);
    if (!track) continue;
    const key = `${track.artist}::${track.title}`.toLowerCase();
    if (seen.has(track.id) || seen.has(key)) continue;
    const room = pooled.find((row) => hintQuery(row) === query)?.room ?? roomForQuery(query);
    if (room && refuseRooms.has(room) && !pasted) continue;
    seen.add(track.id);
    seen.add(key);
    tracks.push({
      ...track,
      region: room ?? track.region,
      note: track.note ? `${track.note} · From wheat1` : "From wheat1",
    });
    if (tracks.length >= limit) break;
  }

  const capped = input.durationMinutes
    ? capToDuration(tracks, input.durationMinutes)
    : tracks.slice(0, limit);
  const durationSeconds = capped.reduce((sum, track) => sum + (track.duration > 45 ? track.duration : 210), 0);

  return {
    tracks: capped,
    title: pasted && pasted.includes("\n") ? "Tonight" : fresh ? "Tonight" : "wheat1",
    publicPreview,
    hints: hintQueries,
    durationSeconds,
    fresh,
  };
}

export function wheatExcludeFromSearch(
  search: URLSearchParams
): Pick<WheatHarvestInput, "seed" | "limit" | "exclude" | "excludeQueries" | "refuseRooms"> {
  const seed = Number(search.get("seed") ?? Date.now());
  const limit = Number(search.get("limit") ?? 5);
  return {
    seed: Number.isFinite(seed) ? seed : Date.now(),
    limit: Number.isFinite(limit) ? limit : 5,
    exclude: parseIdList(search.get("exclude")),
    excludeQueries: parseIdList(search.get("excludeQueries")).map((part) => part.replace(/\|/g, " ")),
    refuseRooms: parseIdList(search.get("refuseRooms")),
  };
}

function pickForHint(query: string, found: LibraryTrack[]): LibraryTrack | undefined {
  const q = query.toLowerCase();
  return (
    found.find((track) => {
      const artist = track.artist.toLowerCase();
      const title = track.title.toLowerCase();
      return q.includes(artist.slice(0, 12)) || q.includes(title.slice(0, 12));
    }) ?? found[0]
  );
}
