/**
 * GET /api/musickit/token
 *
 * Mints the ES256 developer token MusicKit JS needs to configure itself in the
 * browser. The signing key never leaves the server; only the short-lived token
 * is handed out.
 */

import { NextResponse } from "next/server";
import { developerToken, musicKitConfig, storefront } from "@/lib/providers/musickit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = musicKitConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        error: "Apple MusicKit is not configured.",
        missing: config.missing,
        hint: "Sonic Drift stays fully usable without it — phases resolve through SoundCloud or drift silently.",
      },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json({ token: developerToken(), storefront: storefront() });
  } catch (error) {
    console.error("[musickit/token]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not mint a developer token." },
      { status: 500 }
    );
  }
}
