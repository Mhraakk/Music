import { NextResponse, type NextRequest } from "next/server";
import { musicKitConfig } from "@/lib/providers/musickit";
import { MUSIC_USER_COOKIE } from "@/lib/apple/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = MUSIC_USER_COOKIE;
const MAX_AGE = 60 * 60 * 24 * 150;

export async function GET() {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return NextResponse.json({
    configured: musicKitConfig().configured,
    authenticated: Boolean(store.get(COOKIE)?.value),
    missing: musicKitConfig().missing,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { userToken?: string } | null;
  const userToken = body?.userToken?.trim();
  if (!userToken) {
    return NextResponse.json({ error: "userToken required" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE,
    value: userToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

