import { TalkSurface } from "@/components/cosmos/TalkSurface";

export const metadata = {
  title: "Ask — Resonant",
  description:
    "Talk to Resonant in Persian or English. Ask for any song or mix — Deezer, YouTube, YouTube Music, SoundCloud — Gemini goes and finds it.",
};

export default function TalkPage() {
  return (
    <main className="cx-page">
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Ask</h1>
          <p className="cx-body mt-2 max-w-[52ch]">
            Talk however you talk. 90s, a name, YouTube, SoundCloud — Gemini goes and brings it.
            The Resonant shelf is optional.
          </p>
        </div>
      </header>
      <TalkSurface />
    </main>
  );
}
