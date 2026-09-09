#!/usr/bin/env node
/**
 * Harvests Apple Music / iTunes recordings near the engine's aesthetic
 * neighbourhood and writes identity + media to `src/lib/drift/harvest.json`.
 *
 * Vectors are NOT written. The TypeScript expansion engine projects every
 * candidate at load time, so an ontology change re-admits the same recordings
 * without another network pass.
 *
 *   node scripts/harvest-catalog.mjs
 */

import { readFile, writeFile } from "node:fs/promises";

const OUT = "src/lib/drift/harvest.json";
const SEARCH = "https://itunes.apple.com/search";
const PER_SEED = 8;
const PER_ADJACENT = 18;
const MAX_CANDIDATES = 800;

class RateLimited extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalise(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function upsize(url, size) {
  return url.replace(/\/\d+x\d+[a-z]*\.jpg$/i, `/${size}x${size}bb.jpg`);
}

async function itunesGet(url) {
  let throttled = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "sonic-drift-harvest" } });
      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        throttled = true;
        await sleep(1800 * 2 ** attempt + Math.random() * 700);
        continue;
      }
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.results ?? [];
    } catch {
      throttled = true;
      await sleep(1400 * 2 ** attempt + Math.random() * 500);
    }
  }
  if (throttled) throw new RateLimited(url);
  return [];
}

async function search(term, limit = PER_PROBE) {
  const artists = await itunesGet(`${SEARCH}?term=${encodeURIComponent(term)}&entity=musicArtist&limit=8`);
  const artist = artists.find((row) => artistAgrees(term, row.artistName ?? ""));
  if (artist?.artistId) {
    const lookup = await itunesGet(
      `https://itunes.apple.com/lookup?id=${artist.artistId}&entity=song&limit=${limit + 1}`
    );
    const songs = lookup.filter((row) => row.trackId && row.trackName);
    if (songs.length) return songs;
  }
  return itunesGet(`${SEARCH}?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`);
}

async function readSeed() {
  const tracks = await readFile("src/lib/tracks.ts", "utf8");
  const catalog = await readFile("src/lib/drift/catalog.ts", "utf8");
  const ontology = await readFile("src/lib/drift/ontology.ts", "utf8");

  const known = new Set();
  const probes = [];

  const add = (artist, via, kind = "seed") => {
    const key = normalise(artist);
    if (!key || known.has(key)) return;
    known.add(key);
    probes.push({ artist, via, kind });
  };

  /**
   * Adjacent artists — search probes, not a genre list. Each one is tied to
   * an aesthetic anchor so a recording by someone the seed catalog has never
   * heard of still has a neighbourhood.
   */
  const adjacent = [
    ["DJ Krush", "Massive Attack"],
    ["UNKLE", "Massive Attack"],
    ["Tricky", "Massive Attack"],
    ["The Cinematic Orchestra", "Massive Attack"],
    ["Nightmares on Wax", "Massive Attack"],
    ["Lamb", "Portishead"],
    ["Hooverphonic", "Portishead"],
    ["Sneaker Pimps", "Portishead"],
    ["Martina Topley-Bird", "Portishead"],
    ["Larry Heard", "St Germain"],
    ["Kerri Chandler", "St Germain"],
    ["Moodymann", "St Germain"],
    ["Theo Parrish", "Kevin Yost"],
    ["Jazzanova", "Llorca"],
    ["Koop", "Llorca"],
    ["Quantic", "Llorca"],
    ["Bonobo", "Charles Webster"],
    ["Atjazz", "Charles Webster"],
    ["16 Bit Lolita", "16BL"],
    ["Grouper", "Portishead"],
    ["Julianna Barwick", "Portishead"],
    ["Max Richter", "16BL"],
    ["Jóhann Jóhannsson", "16BL"],
    ["Ólafur Arnalds", "16BL"],
    ["Alice Coltrane", "St Germain"],
    ["Pharoah Sanders", "St Germain"],
    ["Four Tet", "Charles Webster"],
    ["Caribou", "Charles Webster"],
    ["The Orb", "16BL"],
    ["Global Communication", "16BL"],
    ["James Blake", "Portishead"],
    ["The xx", "Portishead"],
    ["Beach House", "Portishead"],
    ["Sade", "St Germain"],
    ["Air", "St Germain"],
    ["Zero 7", "Charles Webster"],
    ["Arooj Aftab", "Portishead"],
    ["Hania Rani", "16BL"],
    ["Nils Frahm", "16BL"],
    ["Harold Budd", "16BL"],
  ];
  for (const [artist, via] of adjacent) add(artist, via, "adjacent");
  for (const m of ontology.matchAll(/name:\s*"([^"]+)"/g)) add(m[1], m[1], "adjacent");
  for (const m of tracks.matchAll(/kin:\s*\[([^\]]*)\]/g)) {
    for (const kin of m[1].matchAll(/"([^"]+)"/g)) add(kin[1], kin[1], "adjacent");
  }
  for (const m of tracks.matchAll(/artist:\s*"([^"]+)"/g)) add(m[1], m[1], "seed");
  for (const m of catalog.matchAll(/artist:\s*"([^"]+)"/g)) add(m[1], m[1], "seed");

  const titles = new Set();
  for (const m of tracks.matchAll(/title:\s*"([^"]+)"\s*,\s*artist:\s*"([^"]+)"/g)) {
    titles.add(`${normalise(m[2])}::${normalise(m[1])}`);
  }
  for (const m of catalog.matchAll(/title:\s*"([^"]+)"\s*,\s*artist:\s*"([^"]+)"/g)) {
    titles.add(`${normalise(m[2])}::${normalise(m[1])}`);
  }

  return { probes, titles };
}

function skipTitle(title) {
  return /karaoke|tribute to|originally performed|ringtone|8-bit|8 bit|sped up|slowed|nightcore|tiktok/i.test(title);
}

function stripFeat(name) {
  return String(name).replace(/\s+(feat\.?|featuring|ft\.?|with)\s+.*/i, "").trim();
}

function artistAgrees(probe, result) {
  const a = normalise(stripFeat(probe));
  const b = normalise(stripFeat(result));
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 5) return false;
  const at = a.split(" ");
  const bt = b.split(" ");
  return at.every((token) => bt.includes(token));
}

async function main() {
  const { probes, titles } = await readSeed();
  const seen = new Set();
  const candidates = [];
  let throttled = 0;

  console.log(`Harvesting from ${probes.length} artist probes…`);

  for (const [i, probe] of probes.entries()) {
    if (candidates.length >= MAX_CANDIDATES) break;
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${probes.length}] ${probe.artist} `);

    let hits = [];
    try {
      hits = await search(probe.artist, probe.kind === "seed" ? PER_SEED : PER_ADJACENT);
    } catch (error) {
      if (error instanceof RateLimited) {
        throttled += 1;
        console.log("throttled");
        await sleep(4000);
        continue;
      }
      console.log("error");
      continue;
    }

    let added = 0;
    for (const row of hits) {
      if (!row.trackId || !row.previewUrl || !row.artworkUrl100 || !row.trackName || !row.artistName) continue;
      if (!artistAgrees(probe.artist, row.artistName)) continue;
      if (skipTitle(row.trackName)) continue;
      const seconds = (row.trackTimeMillis ?? 0) / 1000;
      if (seconds && (seconds < 70 || seconds > 22 * 60)) continue;
      const key = String(row.trackId);
      if (seen.has(key)) continue;
      const identity = `${normalise(row.artistName)}::${normalise(row.trackName)}`;
      if (titles.has(identity)) continue;

      seen.add(key);
      candidates.push({
        appleTrackId: key,
        title: row.trackName,
        artist: row.artistName,
        album: row.collectionName ?? null,
        durationMs: row.trackTimeMillis ?? 0,
        previewUrl: row.previewUrl,
        artworkUrl: upsize(row.artworkUrl100, 1000),
        thumbUrl: upsize(row.artworkUrl100, 200),
        appleUrl: row.trackViewUrl ?? null,
        probeArtist: probe.artist,
        probeVia: probe.via,
      });
      added += 1;
    }

    console.log(`+${added}  (living ${candidates.length})`);
    await sleep(280 + Math.random() * 220);
  }

  const file = {
    generatedAt: new Date().toISOString(),
    source: "itunes-search-api",
    probes: probes.map((p) => p.artist),
    candidates,
  };

  await writeFile(OUT, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`\nWrote ${candidates.length} candidates from ${probes.length} probes (${throttled} throttled) to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
