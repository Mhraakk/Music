import { NextResponse } from "next/server";
import { listAtlasGenres, type AtlasFamily } from "@/lib/everynoise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAMILIES: AtlasFamily[] = ["electronic", "ambient", "club", "all"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const familyRaw = (url.searchParams.get("family") ?? "all") as AtlasFamily;
  const family = FAMILIES.includes(familyRaw) ? familyRaw : "all";
  const limit = Number(url.searchParams.get("limit") ?? 8000);
  const payload = await listAtlasGenres({ q, family, limit });
  return NextResponse.json({
    ok: true,
    source: "everynoise",
    ...payload,
  });
}
