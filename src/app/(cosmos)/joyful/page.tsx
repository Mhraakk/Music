import Link from "next/link";
import { joyfulFromCatalog } from "@/lib/taste/joyful-catalog";
import { JoyfulSurface } from "@/components/cosmos/JoyfulSurface";

export const metadata = {
  title: "Joyful - Resonant",
  description: "Morning-light recordings. Hearts teach the gold. No skip, no tenth map room.",
};

export default function JoyfulPage() {
  const seeds = joyfulFromCatalog(16);

  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">
          <em>Joyful.</em>
        </h1>
        <p className="cx-body">
          A coded neighbourhood of analog heat — cinematic warmth, dusted soul, patient bloom. Festival-hot
          insistence never lands here. Love and dislike stay in this browser so Ask and the drift can keep
          suggesting from your gold.
        </p>
        <Link href="/" className="cx-see-all">
          Listen Now
        </Link>
      </header>
      <JoyfulSurface seeds={seeds} />
    </main>
  );
}
