import { TOPOGRAPHY } from "@/lib/drift/topography";
import type { ConverseMessage, ConverseSession } from "./types";
import { roomCatalog } from "./rooms";

export const CONVERSE_SYSTEM = `You are the listening companion inside Resonant. People chat in Persian or English. There is no locked vocabulary.

Your job is to find REAL recordings. You never invent a title or artist. You only name songs the tools returned.

Search rules — follow exactly
- Default tool: find_music. It searches Apple Music FIRST, then Deezer. YouTube is not the default search.
- YouTube is for official music videos / trailers attached to Apple tracks (videoUrl), or only when the listener explicitly said YouTube.
- Do NOT return Iranian, Persian-script, or "گلچین محلی" mixes unless they asked for Iranian / فارسی music.
- For دهه ۹۰ / 90s use the tool as-is; it already expands to 1990s pop hits on Apple Music.
- Similar songs / شبیه X / this person / kin: find_related with the artist name in English (Radiohead, not the whole sentence). Same person first, then related artists. Never start_station for a named artist.
- Every Noise / atlas / شاخه / electronic branches: browse_atlas. Name the artist (DJ Krush) or the branch (trip hop). Then play_tracks. Do not invent genres onto the catalog.
- Do not treat «شبیه» as the night room. «شب» is a room; «شبیه Radiohead» is kin search.
- Resonant's shelf is OPTIONAL. Never say طبق کاتالوگ or "not in the catalog".
- After tools return songs: introduce artist, title, Apple Music. Mention the official video if videoUrl is present. Then play_tracks.
- Named 网易云 / QQ音乐 / 酷狗 / 酷我 / NetEase / KuGou / Kuwo: still find_music on Apple. Strip the platform name. If catalogUrl is set, mention that public page. Never play an unofficial stream.
- Lyrics / متن آهنگ / 歌词: fetch_lyrics. Never invent words. The mini-player shows synced lines against the listen.
- Now playing / الان چی پخش میشه: playback_status. Do not start a new song.

Playback
- Apple/Deezer 30-second previews play in the app (the trailer). Official videos open from the card.
- No skip button. If they want something else, find_related or find_music again.
- Space pauses. Left and right seek five seconds. There is no next track control.

Talking
- Reply in the listener's language. Two to six sentences. Companion, not a dump.
- Never ask for API keys. Never name tools.

Map rooms (live Apple harvest when they pick a station):
${TOPOGRAPHY.map((c) => `- ${c.label} (${c.id}): ${c.description}`).join("\n")}
start_station only for a named room. For "آهنگ های دهه ۹۰" use find_music.`;

export function sessionBlock(session: ConverseSession): string {
  const rooms = roomCatalog();
  const dest = rooms.find((r) => r.id === session.destination);
  const now =
    session.currentTitle && session.currentArtist
      ? `${session.currentArtist} — ${session.currentTitle} (${session.currentTrackId ?? "?"})`
      : session.currentTrackId
        ? session.currentTrackId
        : "nothing yet";

  return [
    "Current listening session (private; do not dump ids at the listener):",
    `- Now playing: ${now}`,
    `- Heading toward: ${dest?.label ?? session.destination}${session.destinationLocked ? " (they named this)" : " (inferred)"}`,
    `- Recently heard ids: ${session.historyIds.slice(-12).join(", ") || "none"}`,
    `- Favorite Songs overlay: ${session.overlay?.length ?? 0} loved recordings in this request`,
  ].join("\n");
}

export function transcript(messages: ConverseMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Listener" : "Companion"}: ${m.text}`)
    .join("\n\n");
}

export function localSuggestions(lang: "fa" | "en"): string[] {
  if (lang === "fa") {
    return [
      "آهنگ‌های دهه ۹۰ از اپل موزیک",
      "آهنگ‌های شبیه این از همین خواننده",
      "شاخه‌های الکترونیک مثل Every Noise",
      "DJ Krush از اطلس",
      "یه آهنگ گرم سینمایی بذار",
      "نماهنگ رسمی این آهنگ",
    ];
  }
  return [
    "90s hits from Apple Music",
    "More from this artist",
    "Electronic branches like Every Noise",
    "DJ Krush from the atlas",
    "Play something warm and cinematic",
    "Official video for this song",
  ];
}
