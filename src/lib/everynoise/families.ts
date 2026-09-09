import type { AtlasFamily } from "./types";

const ELECTRONIC = [
  "electro",
  "electronica",
  "electronic",
  "electropop",
  "indietronica",
  "folktronica",
  "livetronica",
  "jazztronica",
  "synth",
  "synthwave",
  "synthpop",
  "techno",
  "tech house",
  "deep house",
  "organic house",
  "afro house",
  "progressive house",
  "minimal house",
  "funky house",
  "outsider house",
  "ghetto house",
  "acid house",
  "tropical house",
  "future house",
  "bass house",
  "trance",
  "psytrance",
  "dnb",
  "drum and bass",
  "drum & bass",
  "jungle",
  "neurofunk",
  "liquid funk",
  "idm",
  "intelligent dance",
  "braindance",
  "ambient",
  "downtempo",
  "trip hop",
  "triphop",
  "turntabl",
  "breakbeat",
  "breakcore",
  "uk garage",
  "speed garage",
  "future garage",
  "dubstep",
  "brostep",
  "riddim",
  "bass music",
  "future bass",
  "uk bass",
  "footwork",
  "juke",
  "moombahton",
  "hardstyle",
  "hardcore techno",
  "happy hardcore",
  "rave",
  "acid techno",
  "minimal techno",
  "melodic techno",
  "hard techno",
  "industrial techno",
  "industrial dance",
  "ebm",
  "glitch",
  "glitch hop",
  "vaporwave",
  "chillout",
  "chillwave",
  "psybient",
  "psychill",
  "goa",
  "edm",
  "complextro",
  "leftfield",
  "wonky",
  "ukg",
  "2-step",
  "uk funky",
  "italo disco",
  "nu-disco",
  "hi-nrg",
  "microhouse",
  "jersey club",
  "big beat",
  "bigbeat",
  "nujazz",
  "nu jazz",
  "acid jazz",
  "broken beat",
  "darkwave",
  "electroclash",
  "drill and bass",
  "phonk",
];

const AMBIENT = [
  "ambient",
  "dark ambient",
  "space ambient",
  "compositional ambient",
  "future ambient",
  "ambient techno",
  "ambient house",
  "psybient",
  "psychill",
  "chillout",
  "downtempo",
  "isolationism",
  "drone ambient",
];

const CLUB = [
  "tech house",
  "deep house",
  "funky house",
  "afro house",
  "progressive house",
  "bass house",
  "techno",
  "trance",
  "uk garage",
  "speed garage",
  "jersey club",
  "rave",
  "hardstyle",
  "hard techno",
  "dubstep",
  "bassline",
  "ukg",
  "edm",
  "italo disco",
  "nu-disco",
];

function matches(label: string, needles: string[]): boolean {
  const raw = label.toLowerCase();
  return needles.some((needle) => {
    const n = needle.trim().toLowerCase();
    if (!n) return false;
    if (n.includes(" ")) return raw.includes(n);
    return new RegExp(`(?:^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`).test(raw);
  });
}

export function classifyFamily(label: string): AtlasFamily | "other" {
  if (matches(label, AMBIENT) && !matches(label, CLUB)) return "ambient";
  if (matches(label, CLUB)) return "club";
  if (matches(label, ELECTRONIC)) return "electronic";
  return "other";
}

export function inFamily(label: string, family: AtlasFamily): boolean {
  if (family === "all") return true;
  if (family === "electronic") return matches(label, ELECTRONIC);
  if (family === "ambient") return matches(label, AMBIENT);
  if (family === "club") return matches(label, CLUB);
  return classifyFamily(label) === family;
}
