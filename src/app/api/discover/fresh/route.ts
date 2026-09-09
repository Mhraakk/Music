/**
 * Discover live harvest — Apple Music recordings for a map room.
 * Seed rotates the probe window so refresh is actually new.
 */

import { NextResponse, type NextRequest } from "next/server";
import { harvestRoom } from "@/lib/converse/live-room";
import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROOMS = new Set(TOPOGRAPHY.map((c) => c.id));

export async function GET(request: NextRequest) {
  const roomParam = request.nextUrl.searchParams.get("room") ?? "cinematic_warmth";
  const room = (ROOMS.has(roomParam as CoordinateId) ? roomParam : "cinematic_warmth") as CoordinateId;
  const seed = Number(request.nextUrl.searchParams.get("seed") ?? Date.now());
  const limit = Math.max(6, Math.min(12, Number(request.nextUrl.searchParams.get("limit") ?? 10) || 10));

  try {
    const tracks = await harvestRoom(room, Number.isFinite(seed) ? seed : Date.now(), limit);
    return NextResponse.json({
      ok: true,
      room,
      seed: Number.isFinite(seed) ? seed : Date.now(),
      count: tracks.length,
      tracks,
      note: "Live Apple Music harvest for this map room.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Harvest failed." },
      { status: 500 }
    );
  }
}
