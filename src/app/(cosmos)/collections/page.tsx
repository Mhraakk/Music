/**
 * COLLECTIONS — SERVER COMPONENT
 *
 * Every region of the emotional topography, as a grid of mosaics. Fully server-
 * rendered; there is no interactive state on this page beyond navigation.
 */

import Image from "next/image";
import Link from "next/link";
import { collections } from "@/lib/library";

export const metadata = {
  title: "Collections — Resonant",
  description: "Nine regions of the emotional map. Not playlists — coordinates.",
};

export default function CollectionsPage() {
  const shelves = collections();

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-8 pb-40 md:px-8 md:pt-14">
      <header className="mb-10">
        <h1 className="cx-display max-w-[18ch]">Collections</h1>
        <p className="cx-body mt-5 max-w-[54ch]">
          Nine regions of the emotional map. Membership is by proximity to a region&apos;s centre
          rather than by assignment, so a position can sit in two neighbouring collections — which
          is true of the music.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shelves.map((shelf) => (
          <Link key={shelf.id} href={`/collection/${shelf.id}`} className="group block">
            <div
              className="grid grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden"
              style={{
                borderRadius: "var(--r-card)",
                backgroundColor: shelf.tint,
                aspectRatio: "4 / 3",
              }}
            >
              {shelf.covers.map((track) => (
                <div key={track.id} className="relative overflow-hidden" style={{ backgroundColor: track.tint }}>
                  {track.artworkUrl && (
                    <Image
                      src={track.artworkUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - shelf.covers.length) }).map((_, i) => (
                <div key={`pad-${i}`} style={{ backgroundColor: shelf.tint }} />
              ))}
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="cx-heading">{shelf.title}</h2>
                <span className="cx-mono shrink-0">{shelf.count}</span>
              </div>
              <p className="cx-body mt-1">{shelf.description}</p>
              <p className="cx-meta mt-2">{shelf.shape}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
