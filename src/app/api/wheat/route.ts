import { NextResponse } from "next/server";
import { harvestWheat, WHEAT_URL } from "@/lib/wheat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await harvestWheat({ limit: 8, durationMinutes: 30 });
  return NextResponse.json({
    ok: true,
    channel: "wheat1",
    url: WHEAT_URL,
    publicPreview: result.publicPreview,
    title: result.title,
    tracks: result.tracks,
    count: result.tracks.length,
    hints: result.hints,
    durationSeconds: result.durationSeconds,
    note: result.publicPreview
      ? "Latest public posts from wheat1, resolved on Apple Music."
      : "wheat1 is not publicly previewable here. Paste a post caption and we resolve it on Apple Music.",
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    durationMinutes?: number;
    limit?: number;
  };
  const minutes =
    typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
      ? Math.max(8, Math.min(180, body.durationMinutes))
      : 30;
  const result = await harvestWheat({
    text: body.text,
    durationMinutes: minutes,
    limit: body.limit,
  });
  return NextResponse.json({
    ok: true,
    channel: "wheat1",
    url: WHEAT_URL,
    publicPreview: result.publicPreview,
    title: result.title,
    tracks: result.tracks,
    count: result.tracks.length,
    hints: result.hints,
    durationSeconds: result.durationSeconds,
  });
}
