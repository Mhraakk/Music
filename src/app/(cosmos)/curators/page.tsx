/**
 * CURATORS — SERVER COMPONENT
 *
 * The engine's aesthetic anchors, presented as profiles.
 *
 * These are calibration positions in the substrate, not accounts and not
 * editorial picks. Each one lists the catalog positions for which it is the
 * nearest anchor, so the shelves are derived rather than curated by hand —
 * there are no invented follower counts here and no copy the engine could not
 * justify from its own numbers.
 */

import Image from "next/image";
import Link from "next/link";
import { curators } from "@/lib/library";

export const metadata = {
  title: "Curators — Resonant",
  description: "The reference positions the emotional substrate is calibrated against.",
};

export default function CuratorsPage() {
  const profiles = curators();

  return (
    <main className="mx-auto max-w-[1200px] px-4 pt-8 pb-40 md:px-8 md:pt-14">
      <header className="mb-10">
        <h1 className="cx-display max-w-[16ch]">Curators</h1>
        <p className="cx-body mt-5 max-w-[54ch]">
          The engine measures every position against these. They are not artists it is trying to
          sell you — they are the reference points the substrate is calibrated on, and what you see
          under each is the material that sits closest to it.
        </p>
      </header>

      <div className="flex flex-col divide-y divide-[var(--hairline)]">
        {profiles.map((profile) => (
          <Link
            key={profile.slug}
            href={`/curator/${profile.slug}`}
            className="group flex items-center gap-4 py-5"
          >
            {/*
              No photographs of these artists exist in the catalog and inventing
              avatars would be a fabrication, so the identity mark is a mosaic of
              the sleeves nearest to that anchor.
            */}
            <div
              className="grid h-16 w-16 shrink-0 grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden rounded-full"
              style={{ backgroundColor: profile.tint }}
            >
              {profile.covers.map((track) => (
                <div key={track.id} className="relative" style={{ backgroundColor: track.tint }}>
                  {track.artworkUrl && (
                    <Image src={track.artworkUrl} alt="" fill sizes="32px" style={{ objectFit: "cover" }} />
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - profile.covers.length) }).map((_, i) => (
                <div key={`pad-${i}`} style={{ backgroundColor: profile.tint }} />
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="cx-heading">{profile.name}</h2>
              <p className="cx-body cx-truncate">{profile.bio}</p>
              <p className="cx-meta mt-1">
                {profile.tracks.length} positions · {profile.regions.length} regions
              </p>
            </div>

            <span className="cx-meta shrink-0 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
