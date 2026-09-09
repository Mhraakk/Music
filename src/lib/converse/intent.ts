import { matchRoom } from "./rooms";
import type { CoordinateId } from "@/lib/drift/topography";

export type ListenerLanguage = "fa" | "en";

export type LocalIntent =
  | { kind: "station"; room: CoordinateId }
  | { kind: "playlist"; query: string; room: CoordinateId | null }
  | { kind: "expand" }
  | { kind: "alternative" }
  | { kind: "destination"; room: CoordinateId }
  | { kind: "play"; query: string; room: CoordinateId | null }
  | { kind: "search"; query: string; room: CoordinateId | null }
  | { kind: "chat"; query: string };

export function detectLanguage(text: string): ListenerLanguage {
  return /[\u0600-\u06FF]/.test(text) ? "fa" : "en";
}

const GREETING = /^(سلام|درود|هی+|hello|hi+|hey)[\s!?.]*$/i;

export function wantsPlayback(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(play|put on|start|queue|playlist|mix|station|song|track|listen|find me|bring)\b/.test(t) ||
    /پخش|بذار|بگذار|بیار|پیدا کن|معرفی کن|پلی\s?لیست|پلی‌لیست|میکس|آهنگ|اهنگ|ایستگاه|رادیو|گوش\s?بده|یه چیزی|یه آهنگ/.test(
      text
    )
  );
}

export function isGreeting(text: string): boolean {
  return GREETING.test(text.trim());
}

export function interpretLocal(text: string): LocalIntent {
  const trimmed = text.trim();
  const q = trimmed.toLowerCase();
  if (isGreeting(trimmed)) return { kind: "chat", query: trimmed };
  const room = matchRoom(trimmed);

  if (
    /\b(something else|another one|not this|different|softer than)\b/.test(q) ||
    /یکی\s?دیگه|چیز\s?دیگه|یه\s?چیز\s?دیگه|نه این|عوضش کن|ولی نرم|نرم‌تر|نرم تر/.test(trimmed)
  ) {
    return { kind: "alternative" };
  }

  if (
    (/\b(more like this|discover|expand|new songs|generate)\b/.test(q) ||
      /شبیه این|آهنگ جدید|اهنگ جدید|کشف|بیشتر از این/.test(trimmed)) &&
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
  if (playlist) return { kind: "playlist", query: trimmed, room };
  if (destOnly && room) return { kind: "destination", room };
  if (play) return { kind: "play", query: trimmed, room };
  if (room && !/دهه|\b\d0s\b|youtube|یوتیوب|ساوند|deezer|دیزر|soundcloud/i.test(trimmed)) {
    return { kind: "station", room };
  }
  if (trimmed.length >= 2 && (play || /[a-z\u0600-\u06FF]{2,}/i.test(trimmed))) {
    if (play) return { kind: "play", query: trimmed, room };
    return { kind: "search", query: trimmed, room };
  }
  return { kind: "chat", query: trimmed };
}
