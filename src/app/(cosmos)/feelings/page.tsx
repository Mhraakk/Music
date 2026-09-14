import type { Metadata } from "next";
import { FeelingsSurface } from "@/components/cosmos/FeelingsSurface";

export const metadata: Metadata = {
  title: "Feelings - Resonant",
  description:
    "A named cut of the Every Noise atlas: lie back, soft warmth, warm-up, after hours, sunset, tender. Atlas stays the full map.",
};

export default function FeelingsPage() {
  return (
    <main className="cx-page">
      <FeelingsSurface />
    </main>
  );
}
