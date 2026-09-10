import { ROOM_ALIASES, matchRoom } from "./rooms";
import type { CoordinateId } from "@/lib/drift/topography";
import { hasCatalogScript, stripMetingTokens } from "@/lib/meting/platforms";
import { parseDurationMinutes } from "@/lib/listen/duration";

export type ListenerLanguage = "fa" | "en";

export type LocalIntent =
  | { kind: "station"; room: CoordinateId }
  | { kind: "playlist"; query: string; room: CoordinateId | null; durationMinutes?: number }
  | { kind: "related"; artist: string; title?: string }
  | { kind: "expand" }
  | { kind: "alternative" }
  | { kind: "destination"; room: CoordinateId }
  | { kind: "lyrics"; query: string }
  | { kind: "nowPlaying" }
  | { kind: "play"; query: string; room: CoordinateId | null }
  | { kind: "search"; query: string; room: CoordinateId | null }
  | { kind: "atlas"; query: string; artist?: string; genre?: string; durationMinutes?: number }
  | { kind: "wheat"; query: string; durationMinutes?: number }
  | { kind: "chat"; query: string };

const VERB_STOP = new Set([
  "play",
  "put",
  "on",
  "start",
  "queue",
  "playlist",
  "mix",
  "station",
  "radio",
  "song",
  "songs",
  "track",
  "tracks",
  "listen",
  "find",
  "me",
  "bring",
  "something",
  "please",
  "want",
  "wanted",
  "wanna",
  "need",
  "some",
  "the",
  "a",
  "an",
  "for",
  "my",
  "from",
  "with",
  "and",
  "or",
  "to",
  "of",
  "in",
  "at",
  "by",
  "like",
  "similar",
  "more",
  "hits",
  "hit",
  "official",
  "video",
  "trailer",
  "apple",
  "music",
  "itunes",
  "youtube",
  "deezer",
  "soundcloud",
  "decade",
  "nineties",
  "eighties",
  "this",
  "that",
  "it",
  "one",
  "another",
  "else",
  "new",
  "make",
  "set",
  "list",
  "lyrics",
  "lyric",
  "lrc",
  "words",
  "quiet",
  "night",
  "i",
  "id",
  "i'd",
  "we",
  "you",
]);

const FEELING_STOP = (() => {
  const words = new Set<string>(VERB_STOP);
  for (const aliases of Object.values(ROOM_ALIASES)) {
    for (const alias of aliases) {
      if (/[\u0600-\u06FF]/.test(alias)) continue;
      for (const word of alias.toLowerCase().split(/\s+/)) {
        if (word.length >= 2) words.add(word);
      }
    }
  }
  return words;
})();

export function latinCore(raw: string): string {
  return stripMetingTokens(raw)
    .replace(/[\u0600-\u06FF]+/g, " ")
    .replace(/youtube music|youtube|youtu\.be|soundcloud|deezer|itunes|apple music/gi, " ")
    .replace(/[^\w\s'&.\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namedArtistQuery(text: string): string | null {
  const latin = latinCore(text);
  if (!latin) return null;
  const words = latin
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => {
      if (!word || FEELING_STOP.has(word.toLowerCase())) return false;
      return word.length > 1 || /^\d+$/.test(word);
    });
  if (!words.length) return null;
  const joined = words.join(" ").trim();
  if (joined.length < 2) return null;
  if (/^\d0s$|^\d{4}s?$|hits|pop hits/i.test(joined)) return null;
  return joined;
}

export function extractKinArtist(text: string): string | "THIS" | null {
  const trimmed = text.trim();
  const match =
    trimmed.match(/\b(?:songs?|tracks?|music|artists?)\s+(?:like|similar to)\s+(.+)/i) ||
    trimmed.match(/\bsimilar to\s+(.+)/i) ||
    trimmed.match(/شبیه(?:\s+به)?\s+(.+)/i) ||
    trimmed.match(/\bmore from\s+(.+)/i) ||
    trimmed.match(/بیشتر از\s+(.+)/i) ||
    trimmed.match(/از همین خواننده\s*(.*)/i);
  if (!match) return null;
  const rest = (match[1] ?? "").replace(/[?.!]+$/g, "").trim();
  if (!rest || /^(این|همین|this|it|that)\b/i.test(rest)) return "THIS";
  return namedArtistQuery(rest) || latinCore(rest) || rest;
}

export function detectLanguage(text: string): ListenerLanguage {
  return /[\u0600-\u06FF]/.test(text) ? "fa" : "en";
}

const GREETING = /^(سلام|درود|هی+|hello|hi+|hey)[\s!?.]*$/i;

export function wantsLyrics(text: string): boolean {
  return (
    /\b(lyrics?|lyric|lrc)\b/i.test(text) ||
    /متن(\s+این)?(\s+آهنگ)?|لیریک|کلمات آهنگ|كلمات آهنگ/.test(text) ||
    /歌词|歌詞/.test(text)
  );
}

/** Cyrene-fit: ask what is sounding now. Not a play request. */
export function wantsNowPlaying(text: string): boolean {
  const t = text.trim();
  if (/\b(what(?:'s| is) (?:this|playing|on)|now playing|currently playing|what song is (?:this|playing))\b/i.test(t)) {
    return true;
  }
  if (/بذار|بگذار|پخش کن|پیدا کن/.test(t)) return false;
  return /الان چ[یا]|الآن چ[یا]|چی داره پخش|داره پخش میش|چی میخونه|چی میاد/.test(t);
}

/** Named recording inside a lyrics ask, or null to use whatever is playing. */
export function lyricsSubject(text: string): string | null {
  const stripped = stripMetingTokens(text)
    .replace(/\b(lyrics?|lyric|lrc)\b/gi, " ")
    .replace(/متن(\s+این)?(\s+آهنگ)?/g, " ")
    .replace(/لیریک|کلمات آهنگ|كلمات آهنگ/g, " ")
    .replace(/歌词|歌詞/g, " ")
    .replace(/این آهنگ|همین آهنگ/g, " ")
    .replace(/\b(please|show|me|the|for|this|that|song|track|words|of)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return namedArtistQuery(stripped) || latinCore(stripped) || stripped;
}

export function wantsAtlas(text: string): boolean {
  return /everynoise|every\s*noise|اطلس|شاخه|engenremap|نقشه ژانر|genre map|electronic atlas/i.test(
    text
  );
}

export function wantsWheat(text: string): boolean {
  return /wheat1|\bt\.me\/wheat|کانال تلگرام|telegram channel/i.test(text);
}

export function wantsPlayback(text: string): boolean {
  if (wantsLyrics(text) && !/\b(play|put on|start)\b/i.test(text) && !/پخش|بذار|بگذار/.test(text)) return false;
  const t = text.toLowerCase();
  return (
    /\b(play|put on|start|queue|playlist|mix|station|song|track|listen|find me|bring)\b/.test(t) ||
    /پخش|بذار|بگذار|بیار|پیدا کن|معرفی کن|پلی\s?لیست|پلی‌لیست|میکس|آهنگ|اهنگ|ایستگاه|رادیو|گوش\s?بده|یه چیزی|یه آهنگ/.test(
      text
    ) ||
    /播放|来一首|放一首|听一下/.test(text)
  );
}

export function isGreeting(text: string): boolean {
  return GREETING.test(text.trim());
}

export function interpretLocal(text: string): LocalIntent {
  const trimmed = text.trim();
  const q = trimmed.toLowerCase();
  if (isGreeting(trimmed)) return { kind: "chat", query: trimmed };
  if (wantsNowPlaying(trimmed)) return { kind: "nowPlaying" };
  if (wantsLyrics(trimmed)) return { kind: "lyrics", query: trimmed };
  if (wantsWheat(trimmed)) {
    return { kind: "wheat", query: trimmed, durationMinutes: parseDurationMinutes(trimmed) ?? 30 };
  }
  if (wantsAtlas(trimmed)) {
    const named = namedArtistQuery(
      trimmed.replace(/everynoise|every\s*noise|اطلس|شاخه(?:‌های)?|engenremap|نقشه ژانر|genre map|electronic atlas/gi, " ")
    );
    return {
      kind: "atlas",
      query: trimmed,
      artist: named ?? undefined,
      genre: named ? undefined : trimmed,
      durationMinutes: parseDurationMinutes(trimmed) ?? undefined,
    };
  }
  const named = namedArtistQuery(trimmed);
  const room = named ? null : matchRoom(trimmed);

  if (
    /\b(something else|another one|not this|different|softer than)\b/.test(q) ||
    /یکی\s?دیگه|چیز\s?دیگه|یه\s?چیز\s?دیگه|نه این|عوضش کن|ولی نرم|نرم‌تر|نرم تر/.test(trimmed)
  ) {
    return { kind: "alternative" };
  }

  const kin = extractKinArtist(trimmed);
  if (kin) {
    return { kind: "related", artist: kin === "THIS" ? "" : kin };
  }

  if (
    (/\b(more like this|discover|expand|new songs|generate)\b/.test(q) ||
      /آهنگ جدید|اهنگ جدید|کشف|بیشتر از این/.test(trimmed)) &&
    !named &&
    !/youtube|یوتیوب|ساوند|deezer|دیزر|soundcloud|دهه|\b\d0s\b/i.test(trimmed)
  ) {
    return { kind: "expand" };
  }

  const playlist =
    /\b(playlist|mix|set list|make me a)\b/.test(q) || /پلی\s?لیست|پلی‌لیست|میکس|لیست آهنگ|یه لیست/.test(trimmed);
  const station = /\b(station|radio)\b/.test(q) || /ایستگاه|رادیو/.test(trimmed);
  const play = wantsPlayback(trimmed);
  const destOnly =
    /\b(take me to|head toward|go to|drift toward)\b/.test(q) || /ببر(م)? به|بریم سمت/.test(trimmed);

  if (station && room) return { kind: "station", room };
  if (playlist) return { kind: "playlist", query: trimmed, room, durationMinutes: parseDurationMinutes(trimmed) ?? undefined };
  if (destOnly && room) return { kind: "destination", room };
  if (play) return { kind: "play", query: trimmed, room };
  if (room && !/دهه|\b\d0s\b|youtube|یوتیوب|ساوند|deezer|دیزر|soundcloud/i.test(trimmed)) {
    return { kind: "station", room };
  }
  if (trimmed.length >= 2 && (play || /[a-z\u0600-\u06FF]{2,}/i.test(trimmed) || hasCatalogScript(trimmed))) {
    if (play) return { kind: "play", query: trimmed, room };
    return { kind: "search", query: trimmed, room };
  }
  return { kind: "chat", query: trimmed };
}
