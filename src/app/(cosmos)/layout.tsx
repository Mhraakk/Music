import type { Metadata } from "next";
import { PlayerProvider } from "@/context/PlayerContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { AppShell } from "@/components/cosmos/AppShell";
import "./cosmos.css";

export const metadata: Metadata = {
  title: "Listen Now - Resonant",
  description:
    "A cognition-first music app with Apple Music clarity. No genres, no BPM, no popularity ranking. " +
    "Browse songs, albums, artists and stations. The engine drifts from how you listen.",
};

export default function CosmosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cosmos">
      <PlayerProvider>
        <LibraryProvider>
          <AppShell>{children}</AppShell>
        </LibraryProvider>
      </PlayerProvider>
    </div>
  );
}
