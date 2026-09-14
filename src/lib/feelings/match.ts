import { FEELING_ROOMS, FEELING_SLUG_SET, feelingRoom, feelingSlug, type FeelingRoomId } from "./taxonomy";

const ROOM_CUES: { id: FeelingRoomId; pattern: RegExp }[] = [
  { id: "after-hours", pattern: /after[\s-]?hours|after[\s-]?part(?:y|ies)?|افترپارتی|بعد از (ساعت )?۳|پس از سه|past 3/i },
  { id: "sunset", pattern: /sunset|dusk|سانست|غروب|لب ساحل|دم غروب/i },
  { id: "warm-up", pattern: /warm[\s-]?up|early party|وارم|اوایل مهمونی|گرم کردن|دیترویت هاوس|شیکاگو هاوس|detroit house|chicago house/i },
  { id: "soft-warm", pattern: /soft warmth|نرم و گرم|ریز نرم/i },
  { id: "tender", pattern: /\btender\b|melanchol|مالیخول|احساسی/i },
  { id: "lie-back", pattern: /lie[\s-]?back|لم دادن|دراز کش|چیل(?:یدن)?|lower tempo/i },
];

/** Longer labels first so "south african soulful deep house" wins over "deep house". */
const SLUG_LABELS: readonly [string, string][] = [
  ["south african soulful deep house", "southafricansoulfuldeephouse"],
  ["ساوت افریکن سولفول دیپ هاوس", "southafricansoulfuldeephouse"],
  ["deep sunset lounge", "deepsunsetlounge"],
  ["دیپ سانست لانژ", "deepsunsetlounge"],
  ["deep progressive house", "deepprogressivehouse"],
  ["دیپ پراگرسیو هاوس", "deepprogressivehouse"],
  ["ambient dub techno", "ambientdubtechno"],
  ["امبینت داب تکنو", "ambientdubtechno"],
  ["romanian electronic", "romanianelectronic"],
  ["رومینیان الکترونیک", "romanianelectronic"],
  ["cologne electronic", "cologneelectronic"],
  ["کولون الکترونیک", "cologneelectronic"],
  ["hypnotic techno", "hypnotictechno"],
  ["هایپنوتیک تکنو", "hypnotictechno"],
  ["future ambient", "futureambient"],
  ["فیوچر امبینت", "futureambient"],
  ["future garage", "futuregarage"],
  ["فیوچر گاراژ", "futuregarage"],
  ["organic house", "organichouse"],
  ["اورگانیک هاوس", "organichouse"],
  ["ambient house", "ambienthouse"],
  ["امبینت هاوس", "ambienthouse"],
  ["outsider house", "outsiderhouse"],
  ["اوتسایدر هاوس", "outsiderhouse"],
  ["deep soul house", "deepsoulhouse"],
  ["دیپ سول هاوس", "deepsoulhouse"],
  ["detroit house", "detroithouse"],
  ["دیترویت هاوس", "detroithouse"],
  ["chicago house", "chicagohouse"],
  ["شیکاگو هاوس", "chicagohouse"],
  ["deep tech house", "deeptechhouse"],
  ["دیپ تک هاوس", "deeptechhouse"],
  ["chill groove", "chillgroove"],
  ["چیل گروو", "chillgroove"],
  ["deep chill", "deepchill"],
  ["دیپ چیل", "deepchill"],
  ["deep house", "deephouse"],
  ["دیپ هاوس", "deephouse"],
  ["jazz house", "jazzhouse"],
  ["جاز هاوس", "jazzhouse"],
  ["float house", "floathouse"],
  ["فلوات هاوس", "floathouse"],
  ["lo-fi house", "lofihouse"],
  ["lofi house", "lofihouse"],
  ["لو-فای هاوس", "lofihouse"],
  ["لو فای هاوس", "lofihouse"],
  ["micro house", "microhouse"],
  ["microhouse", "microhouse"],
  ["میکرو هاوس", "microhouse"],
  ["dub techno", "dubtechno"],
  ["داب تکنو", "dubtechno"],
  ["minimal dub", "minimaldub"],
  ["مینیمال داب", "minimaldub"],
  ["rominimal", "rominimal"],
  ["رومینیمال", "rominimal"],
  ["jazztronica", "jazztronica"],
  ["جازترونیکا", "jazztronica"],
  ["ethnotronica", "ethnotronica"],
  ["اتناترونیکا", "ethnotronica"],
  ["nu jazz", "nujazz"],
  ["nu-jazz", "nujazz"],
  ["nujazz", "nujazz"],
  ["نیو جاز", "nujazz"],
  ["balearic", "balearic"],
  ["بالیاریک", "balearic"],
];

export function wantsFeelings(text: string): boolean {
  if (/feelings?|احساسات|فیلینگز|فیلینگ/i.test(text)) return true;
  return ROOM_CUES.some((cue) => cue.pattern.test(text));
}

export function matchFeelingRoom(text: string): FeelingRoomId | null {
  const named = feelingRoom(text.trim().toLowerCase());
  if (named) return named.id;
  for (const cue of ROOM_CUES) {
    if (cue.pattern.test(text)) return cue.id;
  }
  return null;
}

export function matchFeelingSlug(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [label, slug] of SLUG_LABELS) {
    if (lower.includes(label)) return slug;
  }
  const compact = feelingSlug(text);
  if (FEELING_SLUG_SET.has(compact)) return compact;
  return null;
}

export function roomsForQuery(text: string): FeelingRoomId[] {
  const room = matchFeelingRoom(text);
  return room ? [room] : FEELING_ROOMS.map((row) => row.id);
}
