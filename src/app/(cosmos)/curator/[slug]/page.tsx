/**
 * CURATOR PROFILE — SERVER COMPONENT
 *
 * Follows the reference profile layout — identity mark, name, handle, bio,
 * counts, then a wall of work — with one substitution. The reference shows
 * follower counts and a Follow button; an anchor is a calibration position, not
 * an account, so those are replaced with what the engine actually knows: the
 * emotional shape it calibrates, and the regions its material reaches.
 */

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { curator, curators } from "@/lib/library";
import { CollectionSurface } from "@/components/cosmos/CollectionSurface";

export function generateStaticParams() {
  return curators().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = curator(slug);
  if (!profile) return { title: "Curator — Resonant" };
  return { title: `${profile.name} — Resonant`, description: profile.bio };
}

export default async function CuratorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = curator(slug);
  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-6 md:px-8 md:pt-10">
      <header className="mb-8">
        <Link href="/curators" className="cx-icon-button" aria-label="Back to curators">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <div
            className="grid h-24 w-24 grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden rounded-full"
            style={{ backgroundColor: profile.tint }}
          >
            {profile.covers.map((track) => (
              <div key={track.id} className="relative" style={{ backgroundColor: track.tint }}>
                {track.artworkUrl && (
                  <Image src={track.artworkUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - profile.covers.length) }).map((_, i) => (
              <div key={`pad-${i}`} style={{ backgroundColor: profile.tint }} />
            ))}
          </div>

          <h1 className="cx-title mt-4">{profile.name}</h1>
          <p className="cx-meta">aesthetic anchor</p>
          <p className="cx-body mx-auto mt-3 max-w-[42ch]">{profile.bio}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="cx-meta">
              {profile.tracks.length} {profile.tracks.length === 1 ? "position" : "positions"}
            </span>
            <span className="cx-meta">
              {profile.regions.length} {profile.regions.length === 1 ? "region" : "regions"}
            </span>
          </div>

          <p className="cx-label mt-4">{profile.shape}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {profile.regions.map((region) => (
              <Link
                key={region}
                href={`/collection/${region}`}
                className="cx-pill cx-pill-ghost h-8 px-3"
              >
                <span className="cx-meta">{region.replace(/_/g, " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <CollectionSurface tracks={profile.tracks.slice(0, 72)} />
    </main>
  );
}
