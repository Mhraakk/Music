import { TalkSurface } from "@/components/cosmos/TalkSurface";

export const metadata = {
  title: "Ask — Resonant",
  description:
    "Talk to Resonant in Persian or English. ChatGPT or Gemini — Apple Music first, official videos as trailers.",
};

export default function TalkPage() {
  return (
    <main className="cx-page">
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Ask</h1>
          <p className="cx-body mt-2 max-w-[52ch]">
            Talk however you talk. Apple Music first. ChatGPT or Gemini if you paste a key.
            Official videos come as trailers. The shelf is optional.
          </p>
        </div>
      </header>
      <TalkSurface />
    </main>
  );
}
