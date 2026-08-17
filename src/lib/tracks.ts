export type Vec = { d: number; w: number; o: number; e: number; m: number; s: number };
export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  obscurity: number;
  why: string;
  emotion: string;
  duration: number;
  coverUrl: string;
  ambient: string;
  kin: string[];
  v: Vec;
};

export const TRACKS: Track[] = [
  {
    id: "1",
    title: "Midnight Black",
    artist: "Bohren & der Club of Gore",
    album: "Black Earth",
    year: 2002,
    obscurity: 0.88,
    why: "Weight without aggression — noir bass as atmosphere",
    emotion: "heavy-still",
    duration: 512,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music71/v4/af/13/a6/af13a652-a60d-69d0-5197-cb3a08f17660/cover.jpg/400x400bb.jpg",
    ambient: "40, 22, 12",
    kin: ["Kilimanjaro Darkjazz", "Dale Cooper Quartet"],
    v: { d: 0.92, w: 0.38, o: 0.28, e: 0.12, m: 0.12, s: 0.75 },
  },
  {
    id: "2",
    title: "Sliced",
    artist: "Roman Flügel",
    album: "Fatty Folders",
    year: 2011,
    obscurity: 0.78,
    why: "Warm restraint — body moves, mind stays soft",
    emotion: "warm-glide",
    duration: 398,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music5/v4/e7/59/dd/e759dd7a-258f-50e4-440d-7e7f557a3ca9/cover.jpg/400x400bb.jpg",
    ambient: "180, 90, 40",
    kin: ["Lawrence", "Move D"],
    v: { d: 0.32, w: 0.86, o: 0.42, e: 0.52, m: 0.22, s: 0.25 },
  },
  {
    id: "3",
    title: "Archangel",
    artist: "Burial",
    album: "Untrue",
    year: 2007,
    obscurity: 0.55,
    why: "Vinyl rain as memory, not nostalgia product",
    emotion: "melancholy-rain",
    duration: 239,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9d/0f/1c/9d0f1c2b-2fae-d8ac-3920-ce9ec5bc85b5/7982.jpg/400x400bb.jpg",
    ambient: "30, 45, 70",
    kin: ["The Caretaker"],
    v: { d: 0.88, w: 0.28, o: 0.18, e: 0.42, m: 0.38, s: 0.85 },
  },
  {
    id: "4",
    title: "Drip",
    artist: "Grandbrothers",
    album: "Dilation",
    year: 2015,
    obscurity: 0.8,
    why: "Prepared piano as weather, not melody showcase",
    emotion: "reflective-space",
    duration: 341,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music/y2004/m11/d15/h16/s05.gzbjswtx.jpg/400x400bb.jpg",
    ambient: "90, 70, 50",
    kin: ["Nils Frahm", "Hauschka"],
    v: { d: 0.28, w: 0.52, o: 0.95, e: 0.32, m: 0.32, s: 0.45 },
  },
  {
    id: "5",
    title: "Washer",
    artist: "Slint",
    album: "Spiderland",
    year: 1991,
    obscurity: 0.7,
    why: "Fragile mass — loud silence, not aggression",
    emotion: "fragile-mass",
    duration: 533,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a1/d0/8b/a1d08b04-058e-c82a-06b2-2b722ee50574/mzi.ufdnaayh.jpg/400x400bb.jpg",
    ambient: "55, 40, 35",
    kin: ["Codeine", "Mogwai"],
    v: { d: 0.82, w: 0.22, o: 0.72, e: 0.22, m: 0.18, s: 0.8 },
  },
  {
    id: "6",
    title: "Resonance",
    artist: "Hraach",
    album: "Resonance",
    year: 2019,
    obscurity: 0.82,
    why: "Intimate room temperature, not festival heat",
    emotion: "warm-close",
    duration: 412,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/84/00/37/840037ad-91c7-d8c7-35e4-94798742501f/artwork.jpg/400x400bb.jpg",
    ambient: "200, 110, 55",
    kin: ["Armen Miran", "Viken Arman"],
    v: { d: 0.28, w: 0.9, o: 0.52, e: 0.48, m: 0.18, s: 0.3 },
  },
  {
    id: "7",
    title: "Mystery of Love",
    artist: "Mr. Fingers",
    album: "Ammnesia",
    year: 1985,
    obscurity: 0.7,
    why: "Origin warmth — house DNA without chart polish",
    emotion: "origin-warm",
    duration: 421,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/f1/e8/c1/f1e8c10a-df1a-2a90-4dc6-0c903d6432ac/827170141889.jpg/400x400bb.jpg",
    ambient: "210, 100, 45",
    kin: ["Larry Heard", "Frankie Knuckles"],
    v: { d: 0.18, w: 0.92, o: 0.45, e: 0.55, m: 0.42, s: 0.15 },
  },
  {
    id: "8",
    title: "Prowler",
    artist: "Mount Fuji Doomjazz Corporation",
    album: "Doomjazz Future Corpses!",
    year: 2009,
    obscurity: 0.91,
    why: "Tension that never resolves into climax",
    emotion: "tense-fog",
    duration: 478,
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/c6/7b/c2/c67bc2a7-0bf9-9a8f-96f4-c882dc4be487/4024572464677.jpg/400x400bb.jpg",
    ambient: "25, 18, 14",
    kin: ["Bohren", "Heroin And Your Veins"],
    v: { d: 0.94, w: 0.32, o: 0.22, e: 0.18, m: 0.08, s: 0.7 },
  },
];

export function links(a: string, t: string) {
  const q = encodeURIComponent(`${a} ${t}`);
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    apple: `https://music.apple.com/search?term=${q}`,
    youtube: `https://music.youtube.com/search?q=${q}`,
    soundcloud: `https://soundcloud.com/search?q=${q}`,
  };
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fallbackArt(t: Track) {
  const hue = Math.floor((t.v.d * 40 + t.v.w * 30 + t.v.s * 20) % 360);
  return `linear-gradient(145deg, hsl(${hue} 35% 18%), hsl(${(hue + 40) % 360} 40% 8%)`;
}
