import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-loaded-sans",
  display: "swap",
  weight: ["300", "400", "600"],
});

const display = Montserrat({
  subsets: ["latin"],
  variable: "--font-loaded-display",
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
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-obsidian">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
