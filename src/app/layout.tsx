import type { Metadata } from "next";
import { Inter, Instrument_Serif, Newsreader } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-loaded-sans",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-loaded-display",
  display: "swap",
});

const editorial = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-loaded-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonant — Listen Now",
  description:
    "A cognition-first music app with Apple Music clarity. No genres, no BPM, no popularity ranking. " +
    "The engine drifts from how you listen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${editorial.variable} h-full antialiased`}>
      <body className="min-h-full bg-bone-white text-press-black">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
