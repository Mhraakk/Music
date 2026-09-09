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
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Radio</h1>
          <p className="cx-body mt-2 max-w-[50ch]">
            Nine stations. Tap one to start — Resonant drifts from there. There is no skip button
            and no shuffle.
          </p>
        </div>
        <Link href="/drift" className="cx-see-all shrink-0">
          Open the map
        </Link>
      </header>

      <RadioSurface
        stations={shelves.flatMap(({ tracks, ...shelf }) =>
          tracks[0] ? [{ ...shelf, starter: tracks[0] }] : []
        )}
      />
    </main>
  );
}
