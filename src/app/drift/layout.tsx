import type { Metadata } from "next";
import "./drift.css";

export const metadata: Metadata = {
  title: "Sonic Drift — Cognitive Music Engine",
  description:
    "Music as emotional structure. No genres, no BPM, no popularity — an emotional map, an " +
    "Acoustic Vulnerability Index, and a drift that rewrites itself from how you behave.",
};

export default function DriftLayout({ children }: { children: React.ReactNode }) {
  return <div className="sonic-drift">{children}</div>;
}
