/**
 * APPLE MUSICKIT
 *
 * High-fidelity track resolution and catalog mapping. Two responsibilities:
 *
 *   1. Mint the ES256 developer token MusicKit JS and the Apple Music API both
 *      require. Signed here with `node:crypto` — no JWT dependency.
 *   2. Resolve a de-genred catalog entry to a concrete Apple Music song id.
 *
 * Resolution is a *lookup*, never a recommendation source. Apple's catalog is
 * asked "which song is this", never "what should play next" — the cognitive core
 * owns that decision and Apple's charts are deliberately never consulted.
 */

import { createPrivateKey, sign as cryptoSign, type KeyObject } from "node:crypto";

const API_ROOT = "https://api.music.apple.com/v1";
/** Apple caps developer tokens at six months; twelve hours keeps rotation cheap. */
const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_STOREFRONT = "us";
const RESOLVE_TIMEOUT_MS = 6000;

export type MusicKitConfigState = {
  configured: boolean;
  missing: string[];
};

export function musicKitConfig(): MusicKitConfigState {
  const missing: string[] = [];
  if (!process.env.APPLE_MUSIC_TEAM_ID) missing.push("APPLE_MUSIC_TEAM_ID");
  if (!process.env.APPLE_MUSIC_KEY_ID) missing.push("APPLE_MUSIC_KEY_ID");
  if (!process.env.APPLE_MUSIC_PRIVATE_KEY) missing.push("APPLE_MUSIC_PRIVATE_KEY");
  return { configured: missing.length === 0, missing };
}

export function storefront(): string {
  return process.env.APPLE_MUSIC_STOREFRONT || DEFAULT_STOREFRONT;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Environment variables cannot carry real newlines through most deployment
 * pipelines, so a PEM arriving as a single line with literal `\n` sequences is
 * the normal case rather than the exception.
 */
function loadPrivateKey(): KeyObject {
  const raw = (process.env.APPLE_MUSIC_PRIVATE_KEY ?? "").trim();
  if (!raw) throw new Error("APPLE_MUSIC_PRIVATE_KEY is empty");
  const pem = raw.includes("-----BEGIN")
    ? raw.replace(/\\n/g, "\n")
    : `-----BEGIN PRIVATE KEY-----\n${raw.replace(/\s+/g, "")}\n-----END PRIVATE KEY-----`;
  return createPrivateKey(pem);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * ES256-signed developer token. `ieee-p1363` is essential: Node defaults to DER
 * signatures, which JWT verifiers reject — JOSE requires raw r‖s.
 */
export function developerToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 300) return cachedToken.token;

  const config = musicKitConfig();
  if (!config.configured) {
    throw new Error(`Apple MusicKit not configured: missing ${config.missing.join(", ")}`);
  }

  const header = { alg: "ES256", kid: process.env.APPLE_MUSIC_KEY_ID, typ: "JWT" };
  const expiresAt = now + TOKEN_TTL_SECONDS;
  const payload = { iss: process.env.APPLE_MUSIC_TEAM_ID, iat: now, exp: expiresAt };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key: loadPrivateKey(),
    dsaEncoding: "ieee-p1363",
  });

  const token = `${signingInput}.${base64url(signature)}`;
  cachedToken = { token, expiresAt };
  return token;
}

export type MusicKitSong = {
  appleMusicId: string;
  /** 30-second preview stream. The only audio Apple exposes without a user token. */
  previewUrl: string | null;
  url: string | null;
  durationMs: number | null;
};

/**
 * Resolution is cached for the process lifetime. The mapping from an emotional
 * position to a concrete recording does not change, so re-asking Apple on every
 * drift would burn quota for a constant.
 */
const resolutionCache = new Map<string, MusicKitSong | null>();

export function cachedResolution(query: string): MusicKitSong | null | undefined {
  return resolutionCache.get(query.toLowerCase());
}

export async function resolveSong(query: string): Promise<MusicKitSong | null> {
  const cacheKey = query.toLowerCase();
  const hit = resolutionCache.get(cacheKey);
  if (hit !== undefined) return hit;

  if (!musicKitConfig().configured) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const url = new URL(`${API_ROOT}/catalog/${storefront()}/search`);
    url.searchParams.set("term", query);
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${developerToken()}` },
    });

    if (!response.ok) {
      // Do not cache transport failures — only cache real catalog answers, so a
      // rate-limit blip does not permanently blank a track.
      console.warn(`[musickit] search failed ${response.status} for "${query}"`);
      return null;
    }

    const payload = (await response.json()) as {
      results?: {
        songs?: {
          data?: {
            id: string;
            attributes?: { previews?: { url?: string }[]; url?: string; durationInMillis?: number };
          }[];
        };
      };
    };

    const song = payload.results?.songs?.data?.[0];
    const resolved: MusicKitSong | null = song
      ? {
          appleMusicId: song.id,
          previewUrl: song.attributes?.previews?.[0]?.url ?? null,
          url: song.attributes?.url ?? null,
          durationMs: song.attributes?.durationInMillis ?? null,
        }
      : null;

    resolutionCache.set(cacheKey, resolved);
    return resolved;
  } catch (error) {
    console.warn(`[musickit] resolve error for "${query}"`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
