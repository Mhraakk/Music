"use client";

/**
 * The single atmospheric layer used on the home route.
 *
 * Deliberately one shader plus light rays — the brief is explicit that effects
 * must not be stacked on a screen, so the heavier WebGL skills stay in the
 * gallery and only this restrained field ships on the main surface.
 */

import dynamic from "next/dynamic";
import { AmbientRays } from "./motion";

const ShaderCanvas = dynamic(() => import("./webgl/ShaderCanvas").then((m) => m.ShaderCanvas), {
  ssr: false,
  loading: () => null,
});

export function NeuformBackdrop({
  variant = "field-system",
  intensity = 0.45,
  rays = 4,
}: {
  variant?: string;
  intensity?: number;
  rays?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ contain: "strict" }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        <ShaderCanvas variant={variant} intensity={intensity} maxDpr={1.25} />
      </div>
      <AmbientRays rays={rays} dust={12} />
    </div>
  );
}
