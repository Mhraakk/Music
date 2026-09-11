import Link from "next/link";
import { notFound } from "next/navigation";
import { collection, collections } from "@/lib/library";
import { CollectionSurface } from "@/components/cosmos/CollectionSurface";
import { Mosaic } from "@/components/cosmos/CollectionRail";
import { PlayAll } from "@/components/cosmos/PlayAll";
import { songsLabel } from "@/lib/format";
import { BackGlyph } from "@/components/cosmos/icons";

export function generateStaticParams() {
  return collections().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = collection(id);
  if (!shelf) return { title: "Playlist - Resonant" };
  return {
    title: `${shelf.title} - Resonant`,
    description: shelf.description,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = collection(id);
  if (!shelf) notFound();

  return (
    <main className="cx-page">
      <Link href="/collections" className="cx-icon-button mb-5" aria-label="Back to Browse">
        <BackGlyph />
      </Link>

      <header className="cx-playlist-hero">
        <div className="cx-playlist-art">
          <Mosaic covers={shelf.covers} tint={shelf.tint} sizes="240px" />
        </div>
        <div className="min-w-0 pb-1">
          <p className="cx-meta">Playlist</p>
          <h1 className="cx-display mt-2">{shelf.title}</h1>
          <p className="cx-body mt-3 max-w-[46ch]">{shelf.description}</p>
          <p className="cx-meta mt-3">{songsLabel(shelf.count)}</p>
          <div className="mt-5">
            <PlayAll track={shelf.tracks[0]} label="Play" />
          </div>
        </div>
      </header>

      <CollectionSurface tracks={shelf.tracks} />
    </main>
  );
}
