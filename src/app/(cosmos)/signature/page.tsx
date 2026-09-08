/**
 * SIGNATURE — SERVER COMPONENT
 *
 * The author's mark. Three photographs, read in the same vocabulary the engine
 * uses for records, closing with the numbers that describe the work itself.
 *
 * Only the gallery is a client island, because it observes scroll position to
 * tint the room. Everything around it is server-rendered.
 */

import Link from "next/link";
import { SignatureGallery } from "@/components/cosmos/SignatureGallery";
import { SIGNATURE_AUTHOR, signaturePlates } from "@/lib/signature";
import { library } from "@/lib/library";
import { AXES, REJECTION_RULES } from "@/lib/drift/ontology";
import { TOPOGRAPHY } from "@/lib/drift/topography";

export const metadata = {
  title: "Signature — Resonant",
  description: "Three photographs the work is signed with.",
};

export default function SignaturePage() {
  const plates = signaturePlates();
  const tracks = library();

  return (
    <main className="mx-auto max-w-[1000px] px-4 pt-8 pb-40 md:px-8 md:pt-16">
      <header className="mb-4">
        <Link href="/" className="cx-icon-button" aria-label="Back to discover">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <h1 className="cx-display mt-8 max-w-[14ch]">Signature</h1>

        <p className="cx-body mt-5 max-w-[52ch]">
          Three photographs the work is signed with. They are placed on the same emotional map as
          the music — given a position, a vulnerability index, a cinematic space — because an
          engine that claims to read feeling should be able to read the things its author chose to
          be judged by.
        </p>

        <p className="cx-meta mt-3 max-w-[52ch]">
          The readings below are authored, not computed. There is no honest way to derive emotional
          structure from pixels, so what you are reading is a claim, stated as one.
        </p>
      </header>

      <SignatureGallery plates={plates} />

      {/* ── Colophon ── */}
      <footer className="mt-16 border-t border-[var(--hairline)] pt-8">
        <p className="cx-label">Colophon</p>

        <p className="cx-body mt-4 max-w-[54ch]">
          {tracks.length} positions in a seven-axis emotional substrate. No genre field, no tempo,
          no popularity rank, no playlist. {TOPOGRAPHY.length} regions instead of a library,{" "}
          {REJECTION_RULES.length} rules describing what the engine refuses, and{" "}
          {AXES.length} axes it will admit to caring about.
        </p>

        <p className="cx-body mt-4 max-w-[54ch]">
          Built with Next.js and a Model Context Protocol server that is shown emotional
          coordinates and never told what the music is.
        </p>

        {SIGNATURE_AUTHOR && <p className="cx-heading mt-8">{SIGNATURE_AUTHOR}</p>}

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className="cx-pill cx-pill-ghost h-9 px-4">
            <span className="cx-meta">Back to the wall</span>
          </Link>
          <Link href="/drift" className="cx-pill cx-pill-ghost h-9 px-4">
            <span className="cx-meta">The emotional map</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
