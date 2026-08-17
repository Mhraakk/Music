import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
export const metadata: Metadata = { title: "RESONANT — Emotional Taste Graph", description: "Emotional correctness. Rejection memory. Continuous flow." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className="h-full antialiased"><body className="min-h-full bg-[#040302] text-[#f0ebe3]">{children}<SpeedInsights /></body></html>);
}
