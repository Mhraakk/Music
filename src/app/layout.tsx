import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-loaded-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonant - Listen Now",
  description:
    "A cognition-first music app with Apple Music clarity. No genres, no BPM, no popularity ranking. " +
    "The engine drifts from how you listen.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Resonant",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper-white text-ink-black">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
