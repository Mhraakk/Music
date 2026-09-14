import type { Metadata } from "next";
import { AtlasPlaylistView } from "@/components/cosmos/AtlasPlaylistView";

export const metadata: Metadata = {
  title: "Playlist - Resonant Feelings",
};

export default async function FeelingsPlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; genre?: string; title?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <main className="cx-page">
      <AtlasPlaylistView
        id={id}
        kind={query.kind}
        genre={query.genre}
        title={query.title}
        nestId="feelings"
      />
    </main>
  );
}
