import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PlayerProvider } from "@/context/PlayerContext";
import { FloatingNav } from "@/components/cosmos/FloatingNav";
import { randomUUID } from "node:crypto";
import "./cosmos.css";

/**
 * Inter, self-hosted through `next/font`. The reference interface uses a tight
 * neo-grotesque; Inter is the closest widely-available match, and its display
 * optical sizing holds up at the headline weights this layout leans on.
 *
 * `cv11` is enabled in `cosmos.css` for the single-storey lowercase g, which is
 * what makes Inter read as a modern grotesque rather than as a UI default.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonant — discover music by feeling",
  description:
    "A cognition-first music app. No genres, no BPM, no popularity ranking. " +
    "Browse by sleeve, search by feeling, and let the engine drift from how you listen.",
};

export default function CosmosLayout({ children }: { children: React.ReactNode }) {
  // One session per navigation. Seeds the engine's deterministic tie-breaking,
  // so two listeners never share an identical drift.
  const sessionId = randomUUID();

  return (
    <div className={`cosmos ${inter.variable}`}>
      <PlayerProvider sessionId={sessionId}>
        {children}
        <FloatingNav />
      </PlayerProvider>
    </div>
  );
}
