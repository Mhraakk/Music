import type { AtlasFamily } from "./types";

const ELECTRONIC = [
  "electro",
  "electron",
  "synth",
  "techno",
  "tech house",
  "house",
  "trance",
  "dnb",
  "drum and bass",
  "drum & bass",
  "jungle",
  "idm",
  "intelligent dance",
  "ambient",
  "downtempo",
  "trip hop",
  "triphop",
  "turntabl",
  "breakbeat",
  "breakcore",
  "garage",
  "dubstep",
  "bass music",
  "future bass",
  "uk bass",
  "footwork",
  "juke",
  "moombahton",
  "hardstyle",
  "hardcore techno",
  "rave",
  "acid house",
  "acid techno",
  "minimal techno",
  "minimal house",
  "progressive house",
  "progressive trance",
  "deep house",
  "organic house",
  "afro house",
  "melodic techno",
  "industrial",
  "ebm",
  "glitch",
  "vaporwave",
  "synthwave",
  "chillout",
  "chillwave",
  "psybient",
  "psychill",
  "goa",
  "psytrance",
  "edm",
  "dance",
  "club",
  "disco",
  "leftfield",
  "wonky",
  "grime",
  "ukg",
  "2-step",
  "speed garage",
  "neurofunk",
  "liquid funk",
  "drill and bass",
  "braindance",
  "microhouse",
  "outsider house",
  "ghetto house",
  "jersey club",
  "ballroom",
  "vogue",
  "hard techno",
  "schranz",
  "gabber",
  "happy hardcore",
  "nightcore",
  "donk",
  "bassline",
  "uk funky",
  "funky house",
  "italo",
  "hi-nrg",
  "freestyle",
  "city pop",
  "citypop",
  "new age",
  "downtempo fusion",
  "instrumental hip hop",
  "abstract hip hop",
  "experimental hip hop",
  "wonky",
  "glitch hop",
  "livetronica",
  "folktronica",
  "indietronica",
  "electropop",
  "synthpop",
  "darkwave",
  "ebm",
  "electroclash",
  "big beat",
  "bigbeat",
  "nujazz",
  "nu jazz",
  "acid jazz",
  "broken beat",
  "future garage",
  "wave",
  "phonk",
  "trap edm",
  "brostep",
  "riddim",
  "complextro",
  " moomba",
];

const AMBIENT = [
  "ambient",
  "drone",
  "new age",
  "soundscape",
  "psybient",
  "psychill",
  "lowercase",
  "isolationism",
  "dark ambient",
  "space ambient",
  "compositional ambient",
  "atmospheric",
  "chillout",
  "downtempo",
];

const CLUB = [
  "house",
  "techno",
  "trance",
  "garage",
  "club",
  "rave",
  "hardstyle",
  "hardcore",
  "dubstep",
  "bassline",
  "ukg",
  "jersey",
  "ballroom",
  "disco",
  "edm",
];

function hay(label: string): string {
  return ` ${label.toLowerCase()} `;
}

function matches(label: string, needles: string[]): boolean {
  const h = hay(label);
  return needles.some((n) => h.includes(n) || label.toLowerCase().includes(n.trim()));
}

export function classifyFamily(label: string): AtlasFamily | "other" {
  if (matches(label, AMBIENT) && matches(label, ELECTRONIC)) return "ambient";
  if (matches(label, CLUB) && matches(label, ELECTRONIC)) return "club";
  if (matches(label, ELECTRONIC)) return "electronic";
  if (matches(label, AMBIENT)) return "ambient";
  if (matches(label, CLUB)) return "club";
  return "other";
}

export function inFamily(label: string, family: AtlasFamily): boolean {
  if (family === "all") return true;
  const classified = classifyFamily(label);
  if (family === "electronic") return classified === "electronic" || classified === "ambient" || classified === "club";
  return classified === family;
}
