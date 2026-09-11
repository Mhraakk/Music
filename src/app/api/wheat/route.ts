import { NextResponse, type NextRequest } from "next/server";
import { harvestWheat, wheatExcludeFromSearch, WHEAT_URL } from "@/lib/wheat/service";
import { hintQuery, pickWheatNight } from "@/lib/wheat/night-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function payload(result: Awaited<ReturnType<typeof harvestWheat>>) {
  return {
    ok: true,
    channel: "wheat1",
    url: WHEAT_URL,
    publicPreview: result.publicPreview,
    title: result.title,
    tracks: result.tracks,
    count: result.tracks.length,
    hints: result.hints,
    durationSeconds: result.durationSeconds,
    fresh: result.fresh,
    note: result.publicPreview
      ? "Latest public posts from wheat1, resolved on Apple Music."
      : result.fresh
        ? "A fresh night of five, resolved on Apple Music. Paste wheat1 for the real channel."
        : "wheat1 captions resolved on Apple Music.",
  };
}

export async function GET(request: NextRequest) {
  const extras = wheatExcludeFromSearch(request.nextUrl.searchParams);
  if (request.nextUrl.searchParams.get("hintsOnly") === "1") {
    const picked = pickWheatNight(
      extras.seed ?? Date.now(),
      extras.limit ?? 5,
      new Set((extras.excludeQueries ?? []).map((query) => query.toLowerCase())),
      new Set(extras.refuseRooms ?? [])
    );
    return NextResponse.json({
      ok: true,
      channel: "wheat1",
      url: WHEAT_URL,
      publicPreview: false,
      title: "Tonight",
      tracks: [],
      count: 0,
      hints: picked.map(hintQuery),
      durationSeconds: 0,
      fresh: true,
    });
  }
  const result = await harvestWheat({
    durationMinutes: 30,
    ...extras,
    limit: extras.limit ?? 5,
  });
  return NextResponse.json(payload(result));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    durationMinutes?: number;
    limit?: number;
    seed?: number;
    exclude?: string[];
    excludeQueries?: string[];
    refuseRooms?: string[];
  };
  const minutes =
    typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
      ? Math.max(8, Math.min(180, body.durationMinutes))
      : 30;
  const result = await harvestWheat({
    text: body.text,
    durationMinutes: minutes,
    limit: body.limit ?? 5,
    seed: body.seed,
    exclude: body.exclude,
    excludeQueries: body.excludeQueries,
    refuseRooms: body.refuseRooms,
  });
  return NextResponse.json(payload(result));
}
