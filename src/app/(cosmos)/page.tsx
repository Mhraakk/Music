/**
 * DISCOVER — SERVER COMPONENT
 *
 * The home surface: a masthead, a shelf of collections, and a masonry wall of
 * album artwork that is the app's primary navigation.
 *
 * Only `DiscoverSurface` is a client island, because search and playback need
 * to be. The masthead, the collection rail and the counts are all server-
 * rendered from the topography and the media map, so the first paint already
 * contains the artwork rather than a grid of empty boxes.
 */

import Link from "next/link";
import { collections, featured, library } from "@/lib/library";
import { CollectionRail } from "@/components/cosmos/CollectionRail";
import { DiscoverSurface } from "@/components/cosmos/DiscoverSurface";

export default function DiscoverPage() {
  const tracks = library();
  const shelves = collections();
  const opening = featured(tracks.length);

  /**
   * Counted over the library rather than the media file. The media map covers
   * the whole catalog including positions the rejection rules removed, so
   * quoting it here printed "64 sleeves" beside "63 positions" — a discrepancy
   * with no meaning to a reader.
   */
  const sleeves = tracks.filter((t) => t.artworkUrl).length;
  const playable = tracks.filter((t) => t.previewUrl).length;

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-8 md:px-8 md:pt-14">
      {/* ── Masthead ── */}
      <header className="mb-10 md:mb-14">
        <div className="flex items-start justify-between gap-6">
          <h1 className="cx-display max-w-[15ch]">Listen by feeling, not by genre.</h1>
          <Link href="/classic" className="cx-meta mt-2 hidden shrink-0 hover:text-[var(--ink)] md:block">
            Classic view →
          </Link>
        </div>

        <p className="cx-body mt-5 max-w-[52ch]">
          No genre tags, no BPM, no popularity ranking. {tracks.length} positions in an emotional
          substrate, each one a sleeve you can pick up. Search a feeling or search a colour — then
          let the engine read how you listen and drift from there.
        </p>

        <p className="cx-meta mt-3">
          {sleeves} sleeves · {playable} playable ·{" "}
          <Link href="/drift" className="underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]">
            open the emotional map
          </Link>
        </p>
      </header>

      {/* ── Collections ── */}
      <section className="mb-10 md:mb-14">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="cx-title">Collections</h2>
          <Link href="/collections" className="cx-meta hover:text-[var(--ink)]">
            All {shelves.length} →
          </Link>
        </div>
        <CollectionRail collections={shelves} />
      </section>

      {/* ── The wall ── */}
      <section>
        <h2 className="cx-title mb-4">
          Everything
          <span className="cx-meta ml-3 font-normal">most audibly human first</span>
        </h2>
        <DiscoverSurface tracks={opening} />
      </section>
    </main>
  );
}
