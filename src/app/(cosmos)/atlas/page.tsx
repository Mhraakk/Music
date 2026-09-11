import type { Metadata } from "next";
import { AtlasSurface } from "@/components/cosmos/AtlasSurface";

export const metadata: Metadata = {
  title: "Atlas - Resonant",
  description: "Every Noise at Once, inside Resonant. The full map, then genre, artist, and playlist rooms with real Apple, Spotify, YouTube Music, and SoundCloud links.",
};

export default function AtlasPage() {
  return (
    <main className="cx-page">
      <AtlasSurface />
    </main>
  );
}
