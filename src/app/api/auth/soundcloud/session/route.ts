/**
 * GET  /api/auth/soundcloud/session — public session state, no credentials.
 * POST /api/auth/soundcloud/session — sign out, clearing every session cookie.
 */

import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/providers/soundcloud";
import { readSession } from "@/lib/providers/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readSession());
}

export async function POST() {
  const response = NextResponse.json({ authenticated: false, identity: null });
  for (const name of Object.values(COOKIE)) response.cookies.delete(name);
  return response;
}
