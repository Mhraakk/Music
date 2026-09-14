import { NextResponse } from "next/server";
import { listFeelingRooms } from "@/lib/feelings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await listFeelingRooms();
  return NextResponse.json(
    {
      ok: true,
      source: "everynoise",
      nest: "feelings",
      note: "Feelings is a cut of Atlas. Genre is navigation only.",
      ...payload,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    }
  );
}
