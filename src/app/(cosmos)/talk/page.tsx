import { TalkSurface } from "@/components/cosmos/TalkSurface";

export const metadata = {
  title: "Ask — Resonant",
  description: "Talk to Resonant in Persian or English. Ask for a song, a mix, or a station — Gemini fulfils it from the living catalog.",
};

export default function TalkPage() {
  return (
    <main className="cx-page">
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Ask</h1>
          <p className="cx-body mt-2 max-w-[52ch]">
            Talk the way you talk to a friend who knows the room. Ask for a song or a playlist.
            Resonant plays it here — no skip, no genre.
          </p>
        </div>
      </header>
      <TalkSurface />
    </main>
  );
}
