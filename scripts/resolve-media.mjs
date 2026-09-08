#!/usr/bin/env node
/**
 * Resolves real album artwork, 30-second previews and dominant artwork colours
 * for every position in the catalog, and writes them to a committed JSON map.
 *
 * WHY THIS EXISTS
 *
 * The upstream catalog's `coverUrl` fields were placeholders: 60 tracks shared
 * 13 URLs between them, and 40 of those 60 pointed at artwork that returns 404.
 * That is survivable for a text-led interface and fatal for an image-led one.
 *
 * The iTunes Search API needs no key, no OAuth and no developer account, so it
 * can resolve the whole catalog at build time. It also returns `previewUrl`,
 * which means the app plays real audio with zero credentials configured —
 * previously every phase was silent until someone set up Apple MusicKit.
 *
 * Dominant colours are extracted here rather than in the browser because
 * reading pixels from a remote image client-side needs CORS headers we do not
 * control, and because search-by-colour has to be able to rank the entire
 * catalog instantly rather than after 65 image decodes.
 *
 *   node scripts/resolve-media.mjs            # resolve anything missing
 *   node scripts/resolve-media.mjs --force    # re-resolve everything
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const OUT = "src/lib/media/catalog-media.json";
const FORCE = process.argv.includes("--force");
const SEARCH = "https://itunes.apple.com/search";

/* ─────────────────────────── catalog extraction ─────────────────────────── */

/**
 * Parsed out of the TypeScript source rather than imported, so this script has
 * no build step and cannot drift out of sync with a compiled copy.
 */
async function readCatalog() {
  const legacy = await readFile("src/lib/tracks.ts", "utf8");
  const entries = [];

  const rowRe =
    /id:\s*"(\d+)"\s*,\s*title:\s*"([^"]+)"\s*,\s*artist:\s*"([^"]+)"\s*,\s*album:\s*"([^"]+)"/g;
  for (const m of legacy.matchAll(rowRe)) {
    entries.push({ id: `l-${m[1]}`, title: m[2], artist: m[3], album: m[4] });
  }

  const drift = await readFile("src/lib/drift/catalog.ts", "utf8");
  const seedRe = /id:\s*"(a-\d+)"\s*,\s*title:\s*"([^"]+)"\s*,\s*artist:\s*"([^"]+)"/g;
  for (const m of drift.matchAll(seedRe)) {
    entries.push({ id: m[1], title: m[2], artist: m[3], album: null });
  }

  return entries;
}

/* ─────────────────────────────── resolution ─────────────────────────────── */

function normalise(text) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token overlap, so "Be No One" still matches Apple's "Be No-One". */
function similarity(a, b) {
  const left = new Set(normalise(a).split(" ").filter(Boolean));
  const right = new Set(normalise(b).split(" ").filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

/**
 * Thrown when the endpoint throttles us. Distinct from "no results" because the
 * two must be persisted differently: a genuine miss is a fact about the catalog,
 * whereas a throttled request is a fact about the last thirty seconds. An
 * earlier version conflated them and permanently recorded 29 tracks as having
 * no artwork, including several verified by hand to resolve fine.
 */
class RateLimited extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(term, limit = 6) {
  const url = `${SEARCH}?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
  let throttled = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "sonic-drift-media-resolver" } });

      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        throttled = true;
        // Exponential with jitter — a fixed backoff makes every retry collide
        // with the same quota window.
        await sleep(2000 * 2 ** attempt + Math.random() * 800);
        continue;
      }

      if (!response.ok) return [];
      const payload = await response.json();
      return payload.results ?? [];
    } catch {
      throttled = true;
      await sleep(1500 * 2 ** attempt + Math.random() * 600);
    }
  }

  if (throttled) throw new RateLimited(term);
  return [];
}

/**
 * Progressively looser queries. Exact artist+title first; then title alone
 * scoped by artist match, which rescues cases where Apple's artist string
 * differs ("Bohren & Der Club of Gore" vs "Bohren & der Club of Gore").
 */
async function resolveOne(entry) {
  const attempts = [
    `${entry.artist} ${entry.title}`,
    entry.album ? `${entry.artist} ${entry.album}` : null,
    `${entry.title} ${entry.artist.split(/[&,]/)[0].trim()}`,
  ].filter(Boolean);

  let best = null;
  let bestScore = 0;

  for (const term of attempts) {
    const results = await search(term);
    for (const candidate of results) {
      if (!candidate.artworkUrl100) continue;
      const artistScore = similarity(entry.artist, candidate.artistName ?? "");
      const titleScore = similarity(entry.title, candidate.trackName ?? "");
      // Artist correctness matters more: the wrong artist's album art is a
      // visible lie, whereas a sibling mix of the right track is acceptable.
      const score = artistScore * 0.6 + titleScore * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (bestScore >= 0.75) break;
  }

  if (!best || bestScore < 0.34) return null;

  return {
    artworkUrl: best.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, "/1000x1000bb.jpg"),
    thumbUrl: best.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, "/200x200bb.jpg"),
    previewUrl: best.previewUrl ?? null,
    appleTrackId: best.trackId ?? null,
    appleUrl: best.trackViewUrl ?? null,
    resolvedArtist: best.artistName ?? null,
    resolvedTitle: best.trackName ?? null,
    resolvedAlbum: best.collectionName ?? null,
    durationMs: best.trackTimeMillis ?? null,
    matchScore: Number(bestScore.toFixed(3)),
  };
}

/* ───────────────────────────── colour extraction ───────────────────────────── */

function toHex({ r, g, b }) {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

/**
 * Reduces artwork to a small palette plus one colour to search by.
 *
 * `sharp.stats().dominant` alone is a poor search key: it reports the most
 * *frequent* colour, which on a typical sleeve is the near-black or near-white
 * background rather than the colour a person would say the cover is. So the
 * palette is quantised to a coarse grid, near-greyscale bins are discounted,
 * and the winner is chosen on frequency weighted by saturation.
 */
async function extractColours(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());

  const image = sharp(buffer).resize(64, 64, { fit: "cover" });
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const bins = new Map();
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;

    // 32-level quantisation: coarse enough to group a gradient into one bin.
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bin = bins.get(key);
    if (bin) {
      bin.n += 1;
      bin.r += r;
      bin.g += g;
      bin.b += b;
    } else {
      bins.set(key, { n: 1, r, g, b });
    }
  }

  const palette = [...bins.values()]
    .map((bin) => {
      const r = bin.r / bin.n;
      const g = bin.g / bin.n;
      const b = bin.b / bin.n;
      const { h, s, l } = rgbToHsl(r, g, b);
      return { r, g, b, h, s, l, share: bin.n / count };
    })
    .sort((a, b) => b.share - a.share);

  const searchable = palette
    .map((c) => {
      // Mid-lightness, saturated colours are what someone means when they pick
      // a swatch. Extremes carry no hue information worth searching on.
      const lightnessFit = 1 - Math.abs(c.l - 0.5) * 1.35;
      return { ...c, weight: c.share * (0.12 + c.s * 1.9) * Math.max(0.08, lightnessFit) };
    })
    .sort((a, b) => b.weight - a.weight);

  const pick = searchable[0] ?? palette[0];
  const average = { r: sumR / count, g: sumG / count, b: sumB / count };

  return {
    // Drives search-by-colour ranking.
    searchColor: toHex(pick),
    searchHsl: { h: Math.round(pick.h), s: Number(pick.s.toFixed(3)), l: Number(pick.l.toFixed(3)) },
    // Drives the ambient wash behind the now-playing sheet.
    averageColor: toHex(average),
    palette: palette.slice(0, 4).map((c) => toHex(c)),
    isDark: rgbToHsl(average.r, average.g, average.b).l < 0.42,
  };
}

/* ──────────────────────────────────── main ──────────────────────────────────── */

const catalog = await readCatalog();
console.log(`catalog: ${catalog.length} positions`);

let existing = {};
if (!FORCE) {
  try {
    existing = JSON.parse(await readFile(OUT, "utf8")).media ?? {};
    console.log(`existing map: ${Object.keys(existing).length} resolved`);
  } catch {
    console.log("no existing map — resolving from scratch");
  }
}

const media = { ...existing };
let resolved = 0;
let missed = 0;
let skipped = 0;

let throttledOut = 0;

for (const entry of catalog) {
  if (media[entry.id]?.artworkUrl && !FORCE) {
    skipped += 1;
    continue;
  }

  let match;
  try {
    match = await resolveOne(entry);
  } catch (error) {
    if (error instanceof RateLimited) {
      // Leave the entry absent rather than recording a miss, so the next run
      // picks it up. Then wait out the quota window before trying the next one.
      throttledOut += 1;
      delete media[entry.id];
      console.log(`  throttled  ${entry.artist} — ${entry.title} (will retry on next run)`);
      await sleep(15_000);
      continue;
    }
    throw error;
  }

  if (!match) {
    missed += 1;
    console.log(`  MISS   ${entry.artist} — ${entry.title}`);
    media[entry.id] = { artworkUrl: null, previewUrl: null, unresolved: true };
    continue;
  }

  let colours = null;
  try {
    colours = await extractColours(match.thumbUrl);
  } catch (error) {
    console.log(`  warn   colour extraction failed for ${entry.title}: ${error.message}`);
  }

  media[entry.id] = { ...match, ...(colours ?? {}) };
  resolved += 1;
  console.log(
    `  ok     ${entry.artist} — ${entry.title}` +
      `  [${match.matchScore}] ${colours?.searchColor ?? "no colour"}` +
      `${match.previewUrl ? " · preview" : " · NO PREVIEW"}`
  );

  // Courtesy delay: the public endpoint has no documented quota and rate-limits
  // hard enough to poison a whole run if hammered.
  await new Promise((r) => setTimeout(r, 260));
}

await mkdir(path.dirname(OUT), { recursive: true });

const withPreview = Object.values(media).filter((m) => m.previewUrl).length;
const withArtwork = Object.values(media).filter((m) => m.artworkUrl).length;

await writeFile(
  OUT,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "itunes-search-api",
      note:
        "Generated by scripts/resolve-media.mjs. Artwork and previews are Apple-hosted; " +
        "colours are extracted locally. Re-run with --force to refresh.",
      counts: { positions: catalog.length, artwork: withArtwork, previews: withPreview },
      media,
    },
    null,
    2
  )}\n`
);

console.log(
  `\nresolved ${resolved}, missed ${missed}, skipped ${skipped}, throttled ${throttledOut}` +
    `\nartwork ${withArtwork}/${catalog.length} · previews ${withPreview}/${catalog.length}` +
    `\nwrote ${OUT}`
);

if (throttledOut > 0) {
  console.log(`\n${throttledOut} position(s) were throttled rather than missing — re-run to resolve them.`);
}
