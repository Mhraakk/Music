import type { Metadata } from "next";
import { AtlasArtistView } from "@/components/cosmos/AtlasArtistView";

export const metadata: Metadata = {
  title: "Artist - Resonant Feelings",
};

export default async function FeelingsArtistPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  return (
    <main className="cx-page">
      <AtlasArtistView name={name?.trim() || ""} nestId="feelings" />
    </main>
  );
}
