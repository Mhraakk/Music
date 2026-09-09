import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resonant — discover music by feeling",
  description:
    "A cognition-first music app. No genres, no BPM, no popularity ranking. " +
    "The engine drifts from how you listen.",
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
