import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./drift.css";

/**
 * Poppins is a hard requirement of the design system: strictly Poppins for all
 * text elements. Self-hosted through `next/font` rather than a stylesheet link,
 * so there is no render-blocking request to a third party and no flash of a
 * fallback face — the constraint would be visibly broken for the first few
 * hundred milliseconds otherwise.
 *
 * Three weights only. A brutalist surface has no use for a nine-weight ramp.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sonic Drift — Cognitive Music Engine",
  description:
    "Music as emotional structure. No genres, no BPM, no popularity — an emotional map, an " +
    "Acoustic Vulnerability Index, and a drift that rewrites itself from how you behave.",
};

export default function DriftLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sonic-drift ${poppins.variable}`}>
      {children}
    </div>
  );
}
