import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESONANT — Emotional Taste Graph",
  description: "Cinematic music intelligence. Artwork-driven. Liquid glass. Rejection memory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#050403] text-[#f3eee6]">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
