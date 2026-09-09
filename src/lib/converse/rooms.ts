import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";

/**
 * Listener language for the nine rooms. Aliases include Persian because Ask
 * is meant to be spoken, not queried like a search box. None of these are
 * genres — they name regions on the emotional map.
 */
export const ROOM_ALIASES: Record<CoordinateId, string[]> = {
  deep_melancholy: [
    "deep melancholy",
    "melancholy",
    "melancholic",
    "grief",
    "sad",
    "sorrow",
    "heavy heart",
    "غم",
    "غمگین",
    "غمگینه",
    "مالیخولیا",
    "سوگ",
    "دلتنگ",
    "دلگیر",
    "حزین",
  ],
  cinematic_warmth: [
    "cinematic warmth",
    "cinematic",
    "warm",
    "warmth",
    "golden",
    "sunset",
    "سینمایی",
    "گرم",
    "گرما",
    "طلایی",
    "غروب",
    "گرم سینمایی",
  ],
  fragile_intimacy: [
    "fragile intimacy",
    "fragile",
    "intimacy",
    "intimate",
    "quiet",
    "tender",
    "soft",
    "whisper",
    "شکننده",
    "صمیمی",
    "صمیمیت",
    "آرام",
    "نرم",
    "نجوا",
    "لطیف",
  ],
  noir_pressure: [
    "noir pressure",
    "noir",
    "pressure",
    "dark night",
    "tense",
    "shadow",
    "نوآر",
    "فشار",
    "تاریک",
    "شب",
    "تنش",
    "سایه",
  ],
  dusted_soul: [
    "dusted soul",
    "dusted",
    "worn",
    "weathered",
    "late night room",
    "خاک‌آلود",
    "خاک الود",
    "کهنه",
    "فرسوده",
    "اتاق شب",
  ],
  patient_bloom: [
    "patient bloom",
    "bloom",
    "hope",
    "patient",
    "spring",
    "opening",
    "شکوفه",
    "صبور",
    "امید",
    "بهار",
    "باز شدن",
  ],
  hollow_architecture: [
    "hollow architecture",
    "hollow",
    "architecture",
    "empty space",
    "vast",
    "cathedral",
    "خالی",
    "معماری",
    "فضا",
    "تهی",
    "وسیع",
  ],
  vulnerable_elevation: [
    "vulnerable elevation",
    "vulnerable",
    "elevation",
    "lift",
    "rise",
    "open sky",
    "آسیب‌پذیر",
    "اسیب پذیر",
    "اوج",
    "بالا",
    "آسمان",
  ],
  submerged_memory: [
    "submerged memory",
    "submerged",
    "memory",
    "memories",
    "underwater",
    "past",
    "nostalgia",
    "خاطره",
    "خاطره‌ها",
    "خاطرات",
    "غوطه‌ور",
    "غوطه ور",
    "گذشته",
    "نوستالژی",
  ],
};

export function roomCatalog() {
  return TOPOGRAPHY.map((room) => ({
    id: room.id,
    label: room.label,
    description: room.description,
  }));
}

function tokensOf(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .split(/[\s\u200c،,.!?;:()"'«»|/]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function matchRoom(query: string): CoordinateId | null {
  const q = query.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!q) return null;

  for (const room of TOPOGRAPHY) {
    if (room.id === q.replace(/\s+/g, "_")) return room.id;
    if (room.label.toLowerCase() === q) return room.id;
  }

  const tokens = tokensOf(q);
  let best: { id: CoordinateId; len: number } | null = null;
  for (const [id, aliases] of Object.entries(ROOM_ALIASES) as [CoordinateId, string[]][]) {
    for (const alias of aliases) {
      const a = alias.toLowerCase();
      const phrase = a.includes(" ");
      const hit = phrase
        ? q.includes(a)
        : q === a || tokens.includes(a);
      if (!hit) continue;
      if (!best || a.length > best.len) best = { id, len: a.length };
    }
  }
  return best?.id ?? null;
}

export function looksLikeHexColor(query: string): string | null {
  const m = query.trim().match(/#?[0-9a-fA-F]{6}/);
  if (!m) return null;
  const hex = m[0].startsWith("#") ? m[0] : `#${m[0]}`;
  return hex.toLowerCase();
}
