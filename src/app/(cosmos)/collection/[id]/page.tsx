/**
 * COLLECTION DETAIL — SERVER COMPONENT
 *
 * A region's header and its wall of sleeves. Mirrors the reference layout: a
 * circular back control, a centred title with its count, then artwork
 * immediately — no hero banner competing with the grid it introduces.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { collection, collections } from "@/lib/library";
import { CollectionSurface } from "@/components/cosmos/CollectionSurface";

export function generateStaticParams() {
  return collections().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = collection(id);
  if (!shelf) return { title: "Collection — Resonant" };
  return {
    title: `${shelf.title} — Resonant`,
    description: shelf.description,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = collection(id);
  if (!shelf) notFound();

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-6 md:px-8 md:pt-10">
      <header className="mb-8">
        <Link href="/collections" className="cx-icon-button" aria-label="Back to collections">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="mt-6 text-center">
          <h1 className="cx-display">{shelf.title}</h1>
          <p className="cx-meta mt-3">
            {shelf.count} positions · AVI {shelf.avi.toFixed(2)}
          </p>
          <p className="cx-body mx-auto mt-4 max-w-[46ch]">{shelf.description}</p>
          <p className="cx-label mt-3">{shelf.shape}</p>
        </div>
      </header>

      <CollectionSurface tracks={shelf.tracks} />
    </main>
  );
}
