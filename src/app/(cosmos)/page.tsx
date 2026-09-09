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
import { collections, featured, library, libraryStats } from "@/lib/library";
import { signaturePlates } from "@/lib/signature";
import { CollectionRail } from "@/components/cosmos/CollectionRail";
import { DiscoverSurface } from "@/components/cosmos/DiscoverSurface";

/** The three signature plates reduced to their colours, as a maker's mark. */
const SIGNATURE_TINTS = signaturePlates().map((plate) => plate.tint);

export default function DiscoverPage() {
  const wall = featured(72);
  const shelves = collections();
  const stats = libraryStats();
  const catalog = library();

  /**
   * Counted over the library rather than the media file. The media map covers
   * the whole catalog including positions the rejection rules removed, so
   * quoting it here printed "64 sleeves" beside "63 positions" — a discrepancy
   * with no meaning to a reader.
   */
  const sleeves = catalog.filter((t) => t.artworkUrl).length;
  const playable = catalog.filter((t) => t.previewUrl).length;

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-8 md:px-8 md:pt-14">
      {/* ── Masthead ── */}
      <header className="mb-10 md:mb-14">
        <div className="flex items-start justify-between gap-6">
          <h1 className="cx-display max-w-[15ch]">Listen by feeling, not by genre.</h1>
          <Link href="/drift" className="cx-meta mt-2 hidden shrink-0 hover:text-[var(--ink)] md:block">
            Emotional map →
          </Link>
        </div>

        <p className="cx-body mt-5 max-w-[52ch]">
          No genre tags, no BPM, no popularity ranking. {stats.admitted} positions in an emotional
          substrate — {stats.seed} authored, plus Apple harvest. Connect Favorite Songs and tens of
          thousands of loved recordings circulate here as catalog and as taste.
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
        <CollectionRail collections={shelves.map(({ tracks: _tracks, ...shelf }) => shelf)} />
      </section>

      {/* ── The wall ── */}
      <section>
        <h2 className="cx-title mb-4">
          Everything
          <span className="cx-meta ml-3 font-normal">most audibly human first</span>
        </h2>
        <DiscoverSurface wall={wall} total={stats.admitted} />
      </section>

      {/*
        The maker's mark, placed where a signature belongs: at the end, quietly,
        after the work rather than in front of it.
      */}
      <footer className="border-t border-[var(--hairline)] pb-24 pt-8">
        <Link href="/signature" className="group inline-flex items-center gap-3">
          <span className="flex -space-x-2">
            {SIGNATURE_TINTS.map((tint) => (
              <span
                key={tint}
                className="h-5 w-5 rounded-full ring-2 ring-[var(--paper)]"
                style={{ backgroundColor: tint }}
                aria-hidden
              />
            ))}
          </span>
          <span className="cx-meta group-hover:text-[var(--ink)]">Signed — three photographs</span>
        </Link>
      </footer>
    </main>
  );
}
