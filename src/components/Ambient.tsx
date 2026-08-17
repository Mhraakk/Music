"use client";
import { usePlayer } from "@/store/player";

export function Ambient() {
  const current = usePlayer((s) => s.current);
  const rgb = current?.ambient || "20, 10, 4";

  return (
    <div className="ambient-layer" aria-hidden>
      <div className="absolute inset-0 bg-[#050403]" />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 60% at 70% -10%, rgba(${rgb}, 0.35), transparent 55%),
                       radial-gradient(ellipse 70% 50% at 10% 100%, rgba(${rgb}, 0.18), transparent 50%),
                       linear-gradient(180deg, #120a06 0%, #050403 55%, #030201 100%)`,
        }}
      />
      <div
        className="ambient-blob"
        style={{
          width: "55vw",
          height: "55vw",
          top: "-10%",
          right: "-5%",
          background: `rgba(${rgb}, 0.55)`,
        }}
      />
      <div
        className="ambient-blob"
        style={{
          width: "40vw",
          height: "40vw",
          bottom: "10%",
          left: "-10%",
          background: `rgba(${rgb}, 0.25)`,
          opacity: 0.35,
        }}
      />
      <div className="grain" />
    </div>
  );
}
