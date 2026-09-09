/**
 * CATALOG READ API
 *
 * The discover surface no longer inlines the living catalog into the first
 * HTML document. Featured wall, feeling/colour search, and id lookup all go
 * through this endpoint so the cognitive engine can keep 800+ positions
 * without shipping them twice on every navigation.
 */

import { NextResponse, type NextRequest } from "next/server";
import { libraryStats, queryCatalog } from "@/lib/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const ids = url.searchParams.get("ids");
  const page = queryCatalog({
    q: url.searchParams.get("q") ?? undefined,
    color: url.searchParams.get("color") ?? undefined,
    ids: ids ? ids.split(",").map((id) => id.trim()).filter(Boolean) : undefined,
    limit: Number(url.searchParams.get("limit") ?? 72) || 72,
    offset: Number(url.searchParams.get("offset") ?? 0) || 0,
  });

  return NextResponse.json({
    ...page,
    stats: libraryStats(),
  });
}
