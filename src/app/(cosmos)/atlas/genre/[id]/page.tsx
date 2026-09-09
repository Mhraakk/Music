import type { Metadata } from "next";
import { AtlasGenreView } from "@/components/cosmos/AtlasGenreView";

export const metadata: Metadata = {
  title: "Branch — Resonant Atlas",
};

export default async function AtlasGenrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="cx-page">
      <AtlasGenreView id={id} />
    </main>
  );
}
