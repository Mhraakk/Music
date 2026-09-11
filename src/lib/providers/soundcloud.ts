/**
 * SOUNDCLOUD OAUTH 2.0
 *
 * User identity and base audio fetching. Authorization Code flow with PKCE —
 * SoundCloud's current API requires PKCE, and it is the correct choice regardless
 * because the code verifier never leaves the server.
 *
 * Token handling rules enforced here:
 *   - Tokens live in httpOnly cookies. Client JavaScript never sees them.
 *   - The `state` parameter is bound to the verifier cookie and checked on
 *     callback, so a forged callback cannot complete a session.
 *   - Refresh happens server-side, transparently, on 401.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const AUTHORIZE_URL = "https://secure.soundcloud.com/authorize";
const TOKEN_URL = "https://secure.soundcloud.com/oauth/token";
const API_ROOT = "https://api.soundcloud.com";
const TIMEOUT_MS = 8000;

export const COOKIE = {
  accessToken: "sd_sc_at",
  refreshToken: "sd_sc_rt",
  expiresAt: "sd_sc_exp",
  verifier: "sd_sc_pkce",
  state: "sd_sc_state",
  identity: "sd_sc_id",
} as const;

export type SoundCloudConfigState = {
  configured: boolean;
  missing: string[];
};

export function soundCloudConfig(): SoundCloudConfigState {
  const missing: string[] = [];
  if (!process.env.SOUNDCLOUD_CLIENT_ID) missing.push("SOUNDCLOUD_CLIENT_ID");
  if (!process.env.SOUNDCLOUD_CLIENT_SECRET) missing.push("SOUNDCLOUD_CLIENT_SECRET");
  return { configured: missing.length === 0, missing };
}

/**
 * The redirect URI must match SoundCloud's registration byte for byte. It is
 * derived from an explicit env var when present and from the incoming request
 * origin otherwise, so local development works without configuration.
 */
export function redirectUri(requestOrigin: string): string {
  const configured = process.env.SOUNDCLOUD_REDIRECT_URI;
  if (configured) return configured;
  return `${requestOrigin.replace(/\/$/, "")}/api/auth/soundcloud/callback`;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createState(): string {
  return base64url(randomBytes(24));
}

/** Constant-time comparison, because `state` is a security boundary. */
export function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authorizeUrl(input: { redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", process.env.SOUNDCLOUD_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms. */
  expiresAt: number;
  scope: string | null;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenSet> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json; charset=utf-8",
      },
      body: new URLSearchParams(body).toString(),
    });

    const payload = (await response.json().catch(() => ({}))) as TokenResponse;

    if (!response.ok || !payload.access_token) {
      const detail = payload.error_description || payload.error || `http ${response.status}`;
      throw new Error(`SoundCloud token exchange failed: ${detail}`);
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
      scope: payload.scope ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function exchangeCode(input: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<TokenSet> {
  return postToken({
    grant_type: "authorization_code",
    client_id: process.env.SOUNDCLOUD_CLIENT_ID ?? "",
    client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET ?? "",
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
    code: input.code,
  });
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return postToken({
    grant_type: "refresh_token",
    client_id: process.env.SOUNDCLOUD_CLIENT_ID ?? "",
    client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
  });
}

export type SoundCloudIdentity = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  permalinkUrl: string | null;
};

export async function fetchIdentity(accessToken: string): Promise<SoundCloudIdentity | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ROOT}/me`, {
      signal: controller.signal,
      headers: {
        authorization: `OAuth ${accessToken}`,
        accept: "application/json; charset=utf-8",
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      id?: number;
      username?: string;
      full_name?: string;
      avatar_url?: string;
      permalink_url?: string;
    };
    if (typeof payload.id !== "number") return null;
    return {
      id: payload.id,
      username: payload.username ?? `user-${payload.id}`,
      displayName: payload.full_name || payload.username || `user-${payload.id}`,
      avatarUrl: payload.avatar_url ?? null,
      permalinkUrl: payload.permalink_url ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type SoundCloudTrack = {
  soundcloudUrl: string;
  streamUrl: string | null;
  durationMs: number | null;
};

const trackCache = new Map<string, SoundCloudTrack | null>();

/**
 * Base audio fetch. Note the deliberate absence of any ranking: `limit=1` on an
 * exact-ish query, because this is resolution rather than discovery. SoundCloud's
 * own popularity ordering is never used to choose *what* plays.
 */
export async function resolveTrack(query: string, accessToken: string): Promise<SoundCloudTrack | null> {
  const cacheKey = query.toLowerCase();
  const hit = trackCache.get(cacheKey);
  if (hit !== undefined) return hit;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(`${API_ROOT}/tracks`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("access", "playable");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        authorization: `OAuth ${accessToken}`,
        accept: "application/json; charset=utf-8",
      },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as
      | { collection?: unknown[] }
      | { permalink_url?: string; stream_url?: string; duration?: number }[];

    const first = Array.isArray(payload)
      ? payload[0]
      : ((payload as { collection?: unknown[] }).collection?.[0] as
          | { permalink_url?: string; stream_url?: string; duration?: number }
          | undefined);

    const resolved: SoundCloudTrack | null = first?.permalink_url
      ? {
          soundcloudUrl: first.permalink_url,
          streamUrl: first.stream_url ?? null,
          durationMs: first.duration ?? null,
        }
      : null;

    trackCache.set(cacheKey, resolved);
    return resolved;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
