import Link from "next/link";
import { collections } from "@/lib/library";
import { RadioSurface } from "@/components/cosmos/RadioSurface";

export const metadata = {
  title: "Radio - Resonant",
  description: "Stations on the emotional map. Tap one and the engine drifts from there.",
};

export default function RadioPage() {
  const shelves = collections();

  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">Radio</h1>
        <p className="cx-body">
          Nine stations. Tap one and Resonant drifts from there. No skip, no shuffle.
        </p>
        <Link href="/drift" className="cx-see-all">
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
