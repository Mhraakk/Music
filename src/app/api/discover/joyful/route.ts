/**
 * Joyful harvest — Apple Music recordings near morning gold.
 * Walks cinematic warmth, dusted soul, and patient bloom. Not a tenth room.
 */

import { NextResponse, type NextRequest } from "next/server";
import { harvestJoyful } from "@/lib/taste/joyful-harvest";
import { parseTasteWire } from "@/lib/taste/memory";
import { parseIdList } from "@/lib/fresh/rotate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const seed = Number(request.nextUrl.searchParams.get("seed") ?? Date.now());
  const limit = Math.max(6, Math.min(16, Number(request.nextUrl.searchParams.get("limit") ?? 8) || 8));
  const exclude = parseIdList(request.nextUrl.searchParams.get("exclude"));
  const memory = parseTasteWire(request.nextUrl.searchParams.get("taste"));

  try {
    const tracks = await harvestJoyful({
      seed: Number.isFinite(seed) ? seed : Date.now(),
      limit,
      exclude,
      memory,
    });
    return NextResponse.json({
      ok: true,
      count: tracks.length,
      tracks,
      note: "Little golds from Apple Music. Hearts teach the next harvest.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Joyful harvest failed." },
      { status: 500 }
    );
  }
}
