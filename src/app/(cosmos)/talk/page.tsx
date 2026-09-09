import { TalkSurface } from "@/components/cosmos/TalkSurface";

export const metadata = {
  title: "Ask — Resonant",
  description:
    "Talk to Resonant in Persian or English. ChatGPT or Gemini — Apple Music first, official videos as trailers.",
};

export default function TalkPage() {
  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">Ask</h1>
        <p className="cx-body">
          Talk however you talk. Apple Music first. ChatGPT or Gemini if you paste a key.
          Full songs play as YouTube listens (Nuclear-style). Official videos are the trailer.
          Ask for lyrics and they appear on the playing track.
        </p>
      </header>
      <TalkSurface />
    </main>
  );
}
