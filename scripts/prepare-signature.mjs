#!/usr/bin/env node
/**
 * Prepares the author's signature images for the app.
 *
 * These are personal photographs rather than catalog artwork, so they do not go
 * through the media resolver. They still need the same treatment the sleeves
 * get: EXIF rotation applied, a sane maximum dimension, and a dominant colour
 * extracted so the gallery can tint its room the way the rest of the app does.
 *
 * EXIF rotation matters here — one of the three is a 4032x3024 phone photo that
 * is portrait on screen only because of its orientation tag. Writing it out
 * without `.rotate()` would silently turn it on its side.
 *
 *   node scripts/prepare-signature.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const SOURCE_DIR = "/home/ubuntu/.cursor/projects/workspace/assets";
const OUT_DIR = "public/signature";
const MANIFEST = "src/lib/signature/manifest.json";

/** Long edge cap. Beyond this the extra pixels are repository weight, not detail. */
const MAX_EDGE = 1800;

const PLATES = [
  {
    slug: "lovers-eye",
    file: "01a08227-ac5c-7956-9a33-5951d92f15b4.jpg",
  },
  {
    slug: "door-light",
    file: "01a08227-ada3-70a0-a2bf-3e877b05c7fd.jpg",
  },
  {
    slug: "causeway",
    file: "01a08227-add2-7c85-b7f1-49515080b1cc.jpg",
  },
];

function toHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("")}`;
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
 * Same approach as the catalog resolver: quantise, discount near-greys, and
 * pick on frequency weighted by saturation. Two of these three photographs are
 * almost monochrome, so the average colour is reported alongside — for those,
 * the average is the honest answer and the gallery uses it for the room.
 */
async function extractColours(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Map();
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;
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

  const pick =
    palette
      .map((c) => ({
        ...c,
        weight: c.share * (0.12 + c.s * 1.9) * Math.max(0.08, 1 - Math.abs(c.l - 0.5) * 1.35),
      }))
      .sort((a, b) => b.weight - a.weight)[0] ?? palette[0];

  const average = { r: sumR / count, g: sumG / count, b: sumB / count };
  const averageHsl = rgbToHsl(average.r, average.g, average.b);

  return {
    accent: toHex(pick),
    average: toHex(average),
    palette: palette.slice(0, 4).map(toHex),
    isDark: averageHsl.l < 0.42,
    lightness: Number(averageHsl.l.toFixed(3)),
  };
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir("src/lib/signature", { recursive: true });

const manifest = [];

for (const plate of PLATES) {
  const source = await readFile(`${SOURCE_DIR}/${plate.file}`);

  // `.rotate()` with no argument applies the EXIF orientation tag and strips it,
  // so downstream consumers see pixels already the right way up.
  const pipeline = sharp(source).rotate();
  const meta = await pipeline.metadata();

  const rotatedWidth = meta.orientation && meta.orientation >= 5 ? meta.height : meta.width;
  const rotatedHeight = meta.orientation && meta.orientation >= 5 ? meta.width : meta.height;
  const longEdge = Math.max(rotatedWidth, rotatedHeight);
  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;

  const width = Math.round(rotatedWidth * scale);
  const height = Math.round(rotatedHeight * scale);

  const output = await sharp(source)
    .rotate()
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const target = `${OUT_DIR}/${plate.slug}.jpg`;
  await writeFile(target, output);

  const colours = await extractColours(output);

  manifest.push({
    slug: plate.slug,
    src: `/signature/${plate.slug}.jpg`,
    width,
    height,
    bytes: output.length,
    ...colours,
  });

  console.log(
    `  ${plate.slug.padEnd(12)} ${String(width).padStart(4)}x${String(height).padEnd(4)} ` +
      `${(output.length / 1024).toFixed(0).padStart(4)}KB  accent ${colours.accent} ` +
      `avg ${colours.average} ${colours.isDark ? "dark" : "light"}`
  );
}

await writeFile(
  MANIFEST,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Generated by scripts/prepare-signature.mjs. Dimensions are post-EXIF-rotation.",
      plates: manifest,
    },
    null,
    2
  )}\n`
);

console.log(`\nwrote ${manifest.length} plates to ${OUT_DIR} and ${MANIFEST}`);
