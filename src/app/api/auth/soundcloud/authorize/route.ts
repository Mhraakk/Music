/**
 * GET /api/auth/soundcloud/authorize
 *
 * Begins the OAuth 2.0 Authorization Code + PKCE flow. The code verifier and
 * the CSRF state are written as short-lived httpOnly cookies and never exposed
 * to the page, so a stolen redirect cannot be replayed into a session.
 */

import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authorizeUrl, createPkcePair, createState, redirectUri, soundCloudConfig } from "@/lib/providers/soundcloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ten minutes is generous for a consent screen and short enough to be safe. */
const HANDSHAKE_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  const config = soundCloudConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        error: "SoundCloud OAuth is not configured.",
        missing: config.missing,
        hint: "Set the missing environment variables, then restart.",
      },
      { status: 503 }
    );
  }

  const { verifier, challenge } = createPkcePair();
  const state = createState();
  const origin = request.nextUrl.origin;
  const callback = redirectUri(origin);

  const response = NextResponse.redirect(authorizeUrl({ redirectUri: callback, state, challenge }));

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: HANDSHAKE_TTL_SECONDS,
  };

  response.cookies.set({ ...cookieOptions, name: COOKIE.verifier, value: verifier });
  response.cookies.set({ ...cookieOptions, name: COOKIE.state, value: state });

  return response;
}
