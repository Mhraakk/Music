/**
 * PREVIEW ANALYSIS
 *
 * Optional. The projection works from neighborhood alone; this module exists so
 * a 30-second Apple preview can argue with that prior when ffmpeg is actually
 * on the machine. Vercel serverless images do not ship ffmpeg, so generate-10
 * must succeed without it.
 *
 * Filters used: ebur128 (loudness), astats (RMS / peak / flatness),
 * silencedetect, and a crude onset proxy from astats crest-factor resets.
 */

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { AudioFeatures } from "./types";

const ANALYZE_TIMEOUT_MS = 12000;
const DOWNLOAD_TIMEOUT_MS = 8000;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}

function parseNumber(source: string, pattern: RegExp, fallback: number): number {
  const match = source.match(pattern);
  if (!match?.[1]) return fallback;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

let ffmpegAvailable: boolean | null = null;

export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    const result = await run("ffmpeg", ["-version"], 3000);
    ffmpegAvailable = result.code === 0;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

function parseFeatures(log: string, durationSec: number): AudioFeatures {
  const integratedLoudness = parseNumber(log, /I:\s+(-?[\d.]+)\s+LUFS/, -14);
  const loudnessRange = parseNumber(log, /LRA:\s+([\d.]+)\s+LU/, 6);
  const peak = parseNumber(log, /Peak:\s+(-?[\d.]+)\s+dBFS/, -1);
  const rmsDb = parseNumber(log, /RMS level dB:\s+(-?[\d.]+)/i, -18);
  const peakDb = parseNumber(log, /Peak level dB:\s+(-?[\d.]+)/i, peak);
  const flatness = parseNumber(log, /Flat factor:\s+([\d.]+)/i, 0);
  const centroid = parseNumber(log, /Mean_centroid:\s+([\d.]+)/i, 1400);
  const dc = parseNumber(log, /DC offset:\s+(-?[\d.]+)/i, 0);

  const silenceStarts = [...log.matchAll(/silence_start:\s+([\d.]+)/g)].map((m) => Number(m[1]));
  const silenceEnds = [...log.matchAll(/silence_end:\s+([\d.]+)/g)].map((m) => Number(m[1]));
  let silence = 0;
  const pairs = Math.min(silenceStarts.length, silenceEnds.length);
  for (let i = 0; i < pairs; i++) silence += Math.max(0, silenceEnds[i] - silenceStarts[i]);
  // A trailing silence_start without an end runs to the clip's close.
  if (silenceStarts.length > silenceEnds.length) {
    silence += Math.max(0, durationSec - silenceStarts[silenceStarts.length - 1]);
  }

  const rms = clamp(Math.pow(10, rmsDb / 20), 0, 1);
  const dynamicRange = clamp(Math.abs(peakDb - rmsDb), 0, 24);

  // Onset proxy: silencedetect gaps plus crest. A clip that never goes quiet
  // and stays hot is rhythm-forward; one that breathes is not.
  const onsetDensity = clamp(
    (1 - Math.min(1, silence / Math.max(1, durationSec))) * (6 - Math.min(5, dynamicRange / 4)),
    0,
    10
  );

  return {
    integratedLoudness: clamp(integratedLoudness, -40, 0),
    loudnessRange: clamp(loudnessRange, 0, 24),
    peak: clamp(peakDb, -40, 0),
    rms,
    dynamicRange,
    silenceRatio: clamp(silence / Math.max(1, durationSec), 0, 1),
    spectralCentroid: clamp(centroid || 800 + (1 - rms) * 800, 200, 6000),
    spectralFlatness: clamp(flatness / 10 + Math.abs(dc) * 4, 0, 1),
    spectralFlux: clamp(loudnessRange / 16 + (1 - rms) * 0.2, 0, 1),
    bassRatio: clamp(0.22 + (integratedLoudness + 18) / 40 + (1 - clamp(centroid / 2500, 0, 1)) * 0.3, 0, 1),
    highRatio: clamp(clamp(centroid / 3200, 0, 1) * 0.55, 0, 1),
    onsetDensity,
    durationSec,
  };
}

/**
 * Download a preview and read it. Returns null on any failure — callers must
 * treat analysis as enrichment, never as a gate.
 */
export async function extractAudioFeatures(previewUrl: string, durationSec = 30): Promise<AudioFeatures | null> {
  if (!(await hasFfmpeg())) return null;

  const dir = await mkdtemp(join(tmpdir(), "drift-feat-"));
  const file = join(dir, "preview.bin");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const response = await fetch(previewUrl, {
      signal: controller.signal,
      headers: { "user-agent": "sonic-drift-expansion-engine" },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 2000) return null;
    await writeFile(file, bytes);

    const result = await run(
      "ffmpeg",
      [
        "-hide_banner",
        "-nostats",
        "-i",
        file,
        "-af",
        "ebur128=metadata=1,astats=metadata=1:reset=1,silencedetect=noise=-42dB:d=0.28",
        "-f",
        "null",
        "-",
      ],
      ANALYZE_TIMEOUT_MS
    );

    const log = `${result.stderr}\n${result.stdout}`;
    return parseFeatures(log, durationSec);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
