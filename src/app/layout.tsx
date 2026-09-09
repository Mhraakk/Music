import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-suisse-intl",
  display: "swap",
  weight: ["400", "500"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-suisse-intl-mono",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Resonant — Listen Now",
  description:
    "A cognition-first music app with Apple Music clarity. No genres, no BPM, no popularity ranking. " +
    "The engine drifts from how you listen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#e5e7eb] text-[#000000]">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
