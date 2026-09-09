import { NextResponse } from "next/server";
import { engineStatus } from "@/lib/mcp/server";
import { library } from "@/lib/library";

/**
 * Ops signal for the living cognitive engine — not the retired 60-track ranker.
 */
export async function GET() {
  const status = engineStatus();
  const catalog = library();
  const playable = catalog.filter((t) => Boolean(t.previewUrl)).length;
  const sleeves = catalog.filter((t) => Boolean(t.artworkUrl)).length;
  const auditOk = status.topography.audit.every((row) => row.ok);
  const ok =
    status.ontology.admitted > 40 &&
    playable > 40 &&
    status.ontology.genreFields === 0 &&
    auditOk;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      engine: {
        catalogSize: status.ontology.living,
        living: status.ontology.living,
        seed: status.ontology.seed,
        harvested: status.ontology.harvested,
        admitted: status.ontology.admitted,
        refused: status.ontology.refused,
        genreFields: status.ontology.genreFields,
        axes: status.ontology.axes,
        tools: status.tools,
        cognition: status.cognition,
      },
      media: { playable, sleeves, catalog: catalog.length },
      topography: {
        coordinates: status.topography.coordinates,
        auditOk,
      },
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
