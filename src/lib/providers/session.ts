/**
 * SOUNDCLOUD SESSION (SERVER ONLY)
 *
 * Reads the httpOnly cookie set at callback time and transparently refreshes an
 * expired access token. Client code never receives a token — it receives at most
 * the public identity fields.
 */

import { cookies } from "next/headers";
import {
  COOKIE,
  refreshTokens,
  soundCloudConfig,
  type SoundCloudIdentity,
  type TokenSet,
} from "./soundcloud";

/** Refresh a little early so a token cannot expire mid-drift. */
const REFRESH_MARGIN_MS = 60_000;

export type SessionState = {
  authenticated: boolean;
  identity: SoundCloudIdentity | null;
  configured: boolean;
};

function decodeIdentity(raw: string | undefined): SoundCloudIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof parsed?.id === "number" ? (parsed as SoundCloudIdentity) : null;
  } catch {
    return null;
  }
}

export function encodeIdentity(identity: SoundCloudIdentity): string {
  return Buffer.from(JSON.stringify(identity), "utf8").toString("base64url");
}

/** Public-facing session state, safe to serialise into an RSC payload. */
export async function readSession(): Promise<SessionState> {
  const store = await cookies();
  const configured = soundCloudConfig().configured;
  const identity = decodeIdentity(store.get(COOKIE.identity)?.value);
  const hasToken = Boolean(store.get(COOKIE.accessToken)?.value);
  return { authenticated: hasToken && Boolean(identity), identity, configured };
}

/**
 * Access token for provider calls, refreshed if it has expired. Returns `null`
 * whenever the caller must proceed unauthenticated — never throws, because an
 * expired SoundCloud session must not be able to break a drift.
 */
export async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  const accessToken = store.get(COOKIE.accessToken)?.value;
  const refreshToken = store.get(COOKIE.refreshToken)?.value;
  const expiresAt = Number(store.get(COOKIE.expiresAt)?.value ?? 0);

  if (accessToken && Date.now() < expiresAt - REFRESH_MARGIN_MS) return accessToken;
  if (!refreshToken || !soundCloudConfig().configured) return accessToken ?? null;

  try {
    const refreshed = await refreshTokens(refreshToken);
    // Route handlers may write cookies; Server Components may not. Attempting it
    // from an RSC render throws, so the write is best-effort and the fresh token
    // is still returned to the caller either way.
    try {
      applyTokenCookies(store, refreshed);
    } catch {
      /* read-only cookie store — token is still valid for this request */
    }
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

type WritableCookieStore = {
  set: (options: {
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
  }) => void;
};

export function applyTokenCookies(store: WritableCookieStore, tokens: TokenSet): void {
  const secure = process.env.NODE_ENV === "production";
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  const maxAge = Math.max(60, Math.floor((tokens.expiresAt - Date.now()) / 1000));

  store.set({ ...base, name: COOKIE.accessToken, value: tokens.accessToken, maxAge });
  store.set({ ...base, name: COOKIE.expiresAt, value: String(tokens.expiresAt), maxAge });
  if (tokens.refreshToken) {
    store.set({
      ...base,
      name: COOKIE.refreshToken,
      value: tokens.refreshToken,
      maxAge: 60 * 60 * 24 * 60,
    });
  }
}
