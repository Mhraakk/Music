import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { WebVitals } from "./web-vitals";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://resonant.app";
const title = "RESONANT — Emotional Taste Graph";
const description = "Cinematic music intelligence. Artwork-driven. Liquid glass. Rejection memory.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · RESONANT",
  },
  description,
  applicationName: "RESONANT",
  keywords: ["music discovery", "taste graph", "recommendations", "ambient", "RESONANT"],
  authors: [{ name: "RESONANT" }],
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "RESONANT",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#050403",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#050403] text-[#f3eee6]">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div id="main">{children}</div>
        <WebVitals />
        <SpeedInsights />
      </body>
    </html>
  );
}
