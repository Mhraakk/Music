"use client";
import { usePlayer } from "@/store/player";

/** Layer 0–1: cinematic environment illuminated by current artwork colors
 *  Inspired by the reference orange-glow silhouette atmospheres.
 */
export function Ambient() {
  const current = usePlayer((s) => s.current);
  const rgb = current?.ambient || "28, 12, 6";

  return (
    <div className="ambient-layer" aria-hidden>
      {/* Base deep charcoal */}
      <div className="absolute inset-0 bg-[#050403]" />

      {/* Primary artwork-driven light field */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(ellipse 110% 70% at 75% -5%, rgba(${rgb}, 0.48), transparent 58%),
            radial-gradient(ellipse 80% 55% at 15% 105%, rgba(${rgb}, 0.22), transparent 52%),
            radial-gradient(ellipse 60% 40% at 50% 40%, rgba(${rgb}, 0.08), transparent 70%),
            linear-gradient(185deg, #140c08 0%, #080504 45%, #030201 100%)
          `,
        }}
      />

      {/* Large soft bloom — top right (signature of references) */}
      <div
        className="ambient-blob"
        style={{
          width: "70vw",
          height: "70vw",
          maxWidth: 720,
          maxHeight: 720,
          top: "-18%",
          right: "-12%",
          background: `rgba(${rgb}, 0.62)`,
          opacity: 0.55,
        }}
      />

      {/* Secondary bloom — bottom left */}
      <div
        className="ambient-blob"
        style={{
          width: "50vw",
          height: "50vw",
          maxWidth: 480,
          maxHeight: 480,
          bottom: "5%",
          left: "-15%",
          background: `rgba(${rgb}, 0.32)`,
          opacity: 0.38,
        }}
      />

      {/* Subtle center wash for depth */}
      <div
        className="ambient-blob"
        style={{
          width: "40vw",
          height: "30vw",
          top: "35%",
          left: "30%",
          background: `rgba(${rgb}, 0.18)`,
          opacity: 0.25,
          filter: "blur(120px)",
        }}
      />

      {/* Film grain */}
      <div className="grain" />
    </div>
  );
}
