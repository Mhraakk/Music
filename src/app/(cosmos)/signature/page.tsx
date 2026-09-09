/**
 * SIGNATURE — SERVER COMPONENT
 *
 * The author's mark. Three photographs, read in the same vocabulary the engine
 * uses for records.
 */

import Link from "next/link";
import { SignatureGallery } from "@/components/cosmos/SignatureGallery";
import { SIGNATURE_AUTHOR, signaturePlates } from "@/lib/signature";
import { BackGlyph } from "@/components/cosmos/icons";

export const metadata = {
  title: "About — Resonant",
  description: "Three photographs the work is signed with.",
};

export default function SignaturePage() {
  const plates = signaturePlates();

  return (
    <main className="cx-page">
      <Link href="/" className="cx-icon-button mb-6" aria-label="Back to Listen Now">
        <BackGlyph />
      </Link>

      <header className="mb-8 max-w-[52ch]">
        <p className="cx-meta">Resonant</p>
        <h1 className="cx-display mt-2">Signature</h1>
        <p className="cx-body mt-4">
          Three photographs the work is signed with. They sit on the same emotional map as the
          music, because an engine that claims to read feeling should be able to read the things
          its author chose to be judged by.
        </p>
        <p className="cx-meta mt-3">
          The readings below are authored, not computed. There is no honest way to derive emotional
          structure from pixels, so what you are reading is a claim, stated as one.
        </p>
      </header>

      <SignatureGallery plates={plates} />

      <footer className="mt-16 border-t border-[var(--hairline)] pt-8 pb-8">
        <p className="cx-label">About</p>
        <p className="cx-body mt-4 max-w-[54ch]">
          Resonant is a cognition-first music app: no genre field, no tempo, no popularity rank.
          Songs, albums, artists and stations on the surface — an emotional map underneath.
        </p>
        <p className="cx-body mt-4 max-w-[54ch]">
          Built with Next.js and a Model Context Protocol server that is shown emotional
          coordinates and never told what the music is.
        </p>
        {SIGNATURE_AUTHOR && <p className="mt-8 text-[17px] font-semibold">{SIGNATURE_AUTHOR}</p>}
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className="cx-pill cx-pill-ghost h-9 px-4">
            Listen Now
          </Link>
          <Link href="/radio" className="cx-pill cx-pill-ghost h-9 px-4">
            Radio
          </Link>
        </div>
      </footer>
    </main>
  );
}
