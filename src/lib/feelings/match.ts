import { FEELING_ROOMS, FEELING_SLUG_SET, feelingRoom, feelingSlug, type FeelingRoomId } from "./taxonomy";

const ROOM_CUES: { id: FeelingRoomId; pattern: RegExp }[] = [
  { id: "after-hours", pattern: /after[\s-]?hours|after[\s-]?part(?:y|ies)?|افترپارتی|بعد از (ساعت )?۳|پس از سه|past 3/i },
  { id: "sunset", pattern: /sunset|dusk|سانست|غروب|لب ساحل|دم غروب/i },
  { id: "warm-up", pattern: /warm[\s-]?up|early party|وارم|اوایل مهمونی|گرم کردن/i },
  { id: "soft-warm", pattern: /soft warmth|نرم و گرم|ریز نرم/i },
  { id: "tender", pattern: /\btender\b|مالیخول|احساسی/i },
  { id: "lie-back", pattern: /lie[\s-]?back|لم دادن|دراز کش|چیل(?:یدن)?|lower tempo/i },
];

/** Longer labels first so "deep sunset lounge" wins over "sunset". */
const SLUG_LABELS: readonly [string, string][] = [
  ["deep sunset lounge", "deepsunsetlounge"],
  ["دیپ سانست لانژ", "deepsunsetlounge"],
  ["ambient dub techno", "ambientdubtechno"],
  ["امبینت داب تکنو", "ambientdubtechno"],
  ["experimental house", "experimentalhouse"],
  ["اکسپریمنتال هاوس", "experimentalhouse"],
  ["minimal tech house", "minimaltechhouse"],
  ["مینیمال تک هاوس", "minimaltechhouse"],
  ["deep disco house", "deepdiscohouse"],
  ["دیپ دیسکو هاوس", "deepdiscohouse"],
  ["deep soul house", "deepsoulhouse"],
  ["دیپ سول هاوس", "deepsoulhouse"],
  ["downtempo fusion", "downtempofusion"],
  ["داون تمپو فیوژن", "downtempofusion"],
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
  ["minimal techno", "minimaltechno"],
  ["مینیمال تکنو", "minimaltechno"],
  ["minimal dub", "minimaldub"],
  ["مینیمال داب", "minimaldub"],
  ["chill lounge", "chilllounge"],
  ["چیل لانژ", "chilllounge"],
  ["chill groove", "chillgroove"],
  ["چیل گروو", "chillgroove"],
  ["world chill", "worldchill"],
  ["ورد چیل", "worldchill"],
  ["deep chill", "deepchill"],
  ["دیپ چیل", "deepchill"],
  ["deep house", "deephouse"],
  ["دیپ هاوس", "deephouse"],
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
