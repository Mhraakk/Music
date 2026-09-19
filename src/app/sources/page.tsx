import type { Metadata } from "next";
import { SourcesView } from "./SourcesView";

export const metadata: Metadata = {
  title: "Sources & taste",
  description:
    "Telegram, YouTube Music, Apple Music, Spotify and the open internet — ranked by your learned taste.",
};

export default function SourcesPage() {
  return <SourcesView />;
}
