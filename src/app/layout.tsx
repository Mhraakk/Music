import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-loaded-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-loaded-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonant - Listen Now",
  description:
    "A cognition-first music app with Apple Music clarity. No genres, no BPM, no popularity ranking. " +
    "The engine drifts from how you listen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bone-white text-press-black">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
