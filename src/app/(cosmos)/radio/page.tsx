import Link from "next/link";
import { collections } from "@/lib/library";
import { RadioSurface } from "@/components/cosmos/RadioSurface";

export const metadata = {
  title: "Radio — Resonant",
  description: "Stations on the emotional map. Tap one and the engine drifts from there.",
};

export default function RadioPage() {
  const shelves = collections();

  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">Radio</h1>
        <div className="cx-section-side">
          <p className="cx-body">
            Nine stations. Tap one to start — Resonant drifts from there. There is no skip button
            and no shuffle.
          </p>
          <Link href="/drift" className="cx-see-all">
            Open the map →
          </Link>
        </div>
      </header>

      <RadioSurface
        stations={shelves.flatMap(({ tracks, ...shelf }) =>
          tracks[0] ? [{ ...shelf, starter: tracks[0] }] : []
        )}
      />
    </main>
  );
}
