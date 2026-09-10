import { findMusic } from "@/lib/converse/anywhere";
import { capToDuration } from "@/lib/listen/duration";
import type { LibraryTrack } from "@/lib/library";
import { extractWheatHints, parseTelegramWidget } from "./parse";

export const WHEAT_CHANNEL = "wheat1";
export const WHEAT_URL = "https://t.me/wheat1";

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

export async function harvestWheat(input: {
  text?: string;
  durationMinutes?: number;
  limit?: number;
}): Promise<{
  tracks: LibraryTrack[];
  title: string;
  publicPreview: boolean;
  hints: string[];
  durationSeconds: number;
}> {
  const captions: string[] = [];
  let publicPreview = false;
  const pasted = input.text?.trim();
  if (pasted) captions.push(pasted);

  if (!pasted) {
    const html = await fetchPreview();
    if (html) {
      publicPreview = true;
      captions.push(...parseTelegramWidget(html));
    }
  }

  const hints = captions.flatMap((caption) => extractWheatHints(caption)).slice(0, 16);
  const limit = Math.max(4, Math.min(16, input.limit ?? Math.max(8, hints.length)));
  const tracks: LibraryTrack[] = [];
  const seen = new Set<string>();
  for (const hint of hints) {
    const found = await findMusic(hint.query, 1);
    for (const track of found) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push({
        ...track,
        note: track.note ? `${track.note} · From wheat1` : "From wheat1",
      });
      if (tracks.length >= limit) break;
    }
    if (tracks.length >= limit) break;
  }

  const capped = input.durationMinutes
    ? capToDuration(tracks, input.durationMinutes)
    : tracks.slice(0, limit);
  const durationSeconds = capped.reduce((sum, track) => sum + (track.duration > 45 ? track.duration : 210), 0);

  return {
    tracks: capped,
    title: pasted && pasted.includes("\n") ? "Tonight" : "wheat1",
    publicPreview,
    hints: hints.map((h) => h.query),
    durationSeconds,
  };
}
