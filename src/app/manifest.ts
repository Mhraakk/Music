import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RESONANT — Emotional Taste Graph",
    short_name: "RESONANT",
    description: "Cinematic music intelligence. Artwork-driven. Emotional taste graph.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050403",
    theme_color: "#050403",
    categories: ["music", "entertainment", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
