import Link from "next/link";
import { collections } from "@/lib/library";
import { RadioSurface } from "@/components/cosmos/RadioSurface";
import { WheatSurface } from "@/components/cosmos/WheatSurface";

export const metadata = {
  title: "Radio - Resonant",
  description: "Stations on the emotional map. Tap one and the engine drifts from there.",
};

export default function RadioPage() {
  const shelves = collections();

  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">
          <em>Radio.</em>
        </h1>
        <p className="cx-body">
          Nine stations, plus wheat1. Tap a room or paste a Telegram post. No skip, no shuffle.
        </p>
        <Link href="/drift" className="cx-see-all">
          Open the map
        </Link>
      </header>

      <WheatSurface />

      <RadioSurface
        stations={shelves.flatMap(({ tracks, ...shelf }) =>
          tracks[0] ? [{ ...shelf, starter: tracks[0] }] : []
        )}
      />
    </main>
  );
}
