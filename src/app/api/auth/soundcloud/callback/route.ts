/**
 * GET /api/auth/soundcloud/callback
 *
 * Completes the PKCE exchange. The incoming `state` is compared in constant time
 * against the cookie written at authorize time; a mismatch is treated as a
 * forgery and the flow is abandoned before any token request is made.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE,
  exchangeCode,
  fetchIdentity,
  redirectUri,
  soundCloudConfig,
  statesMatch,
} from "@/lib/providers/soundcloud";
import { encodeIdentity } from "@/lib/providers/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failureRedirect(request: NextRequest, reason: string) {
  const url = new URL("/drift", request.nextUrl.origin);
  url.searchParams.set("auth_error", reason);
  const response = NextResponse.redirect(url);
  // The handshake is over either way — do not leave a verifier lying around.
  response.cookies.delete(COOKIE.verifier);
  response.cookies.delete(COOKIE.state);
  return response;
}

export async function GET(request: NextRequest) {
  if (!soundCloudConfig().configured) {
    return failureRedirect(request, "not_configured");
  }

  const params = request.nextUrl.searchParams;
  const denied = params.get("error");
  if (denied) return failureRedirect(request, denied);

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(COOKIE.state)?.value;
  const verifier = request.cookies.get(COOKIE.verifier)?.value;

  if (!code) return failureRedirect(request, "missing_code");
  if (!verifier) return failureRedirect(request, "handshake_expired");
  if (!statesMatch(state ?? undefined, expectedState)) return failureRedirect(request, "state_mismatch");

  try {
    const tokens = await exchangeCode({
      code,
      redirectUri: redirectUri(request.nextUrl.origin),
      verifier,
    });

    const identity = await fetchIdentity(tokens.accessToken);

    const response = NextResponse.redirect(new URL("/drift", request.nextUrl.origin));
    const secure = process.env.NODE_ENV === "production";
    const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
    const maxAge = Math.max(60, Math.floor((tokens.expiresAt - Date.now()) / 1000));

    response.cookies.set({ ...base, name: COOKIE.accessToken, value: tokens.accessToken, maxAge });
    response.cookies.set({ ...base, name: COOKIE.expiresAt, value: String(tokens.expiresAt), maxAge });
    if (tokens.refreshToken) {
      response.cookies.set({
        ...base,
        name: COOKIE.refreshToken,
        value: tokens.refreshToken,
        maxAge: 60 * 60 * 24 * 60,
      });
    }
    if (identity) {
      // Identity is readable by the page so the UI can greet the listener; it
      // holds no credential material.
      response.cookies.set({
        name: COOKIE.identity,
        value: encodeIdentity(identity),
        httpOnly: false,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }

    response.cookies.delete(COOKIE.verifier);
    response.cookies.delete(COOKIE.state);
    return response;
  } catch (error) {
    console.error("[soundcloud/callback]", error);
    return failureRedirect(request, "exchange_failed");
  }
}
