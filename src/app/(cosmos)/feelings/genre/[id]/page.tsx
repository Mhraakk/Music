import type { Metadata } from "next";
import { FeelingsDenied } from "@/components/cosmos/FeelingsDenied";
import { AtlasGenreView } from "@/components/cosmos/AtlasGenreView";
import { isFeelingSlug } from "@/lib/feelings";

export const metadata: Metadata = {
  title: "Feeling branch - Resonant",
};

export default async function FeelingsGenrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isFeelingSlug(id)) {
    return (
      <main className="cx-page">
        <FeelingsDenied id={id} atlasHref={`/atlas/genre/${id}`} />
      </main>
    );
  }
  return (
    <main className="cx-page">
      <AtlasGenreView id={id} nestId="feelings" />
    </main>
  );
}
