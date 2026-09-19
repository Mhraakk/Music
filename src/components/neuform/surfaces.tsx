"use client";

/**
 * Surface skills: gradient borders, the premium border system, the
 * cursor-reactive flashlight edge, progressive blur, skeuomorphic controls,
 * gooey blobs and generated aura assets.
 */

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useCoarsePointer, useReducedMotion } from "./hooks";

type Base = { children?: ReactNode; className?: string; style?: CSSProperties };

/** Skills 1, 36, 43 — gradient border with premium / interactive variants. */
export function GradientBorder({
  children,
  className = "",
  style,
  tone = "default",
  animated = false,
  interactive = false,
  radius = "1.1rem",
  width = 1,
}: Base & {
  tone?: "default" | "premium";
  animated?: boolean;
  interactive?: boolean;
  radius?: string;
  width?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      className={`nf-border-gradient ${className}`}
      data-tone={tone}
      data-animated={animated && !reduced ? "true" : undefined}
      data-interactive={interactive ? "true" : undefined}
      style={
        {
          ["--nf-radius"]: radius,
          ["--nf-border-width"]: `${width}px`,
          borderRadius: radius,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** Skill 42 — pointer-tracked light grazing the container edge. */
export function FlashlightBorder({ children, className = "", style }: Base) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const coarse = useCoarsePointer();

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (coarse) return;
      const node = ref.current;
      if (!node) return;
      const { clientX, clientY } = event;
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--nf-x", `${clientX - rect.left}px`);
        node.style.setProperty("--nf-y", `${clientY - rect.top}px`);
      });
    },
    [coarse]
  );

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  return (
    <div
      ref={ref}
      className={`nf-flashlight ${className}`}
      onPointerMove={onPointerMove}
      style={style}
    >
      {children}
    </div>
  );
}

/** Skill 33 — layered edge blur that fades content into the chrome. */
export function ProgressiveBlur({
  edge = "bottom",
  height = 96,
  layers = 5,
  className = "",
}: {
  edge?: "top" | "bottom";
  height?: number;
  layers?: number;
  className?: string;
}) {
  const count = Math.max(2, Math.min(layers, 6));
  const bands = Array.from({ length: count }, (_, i) => {
    const step = (i + 1) / count;
    const from = edge === "bottom" ? 1 - step : step;
    return {
      blur: 0.6 * Math.pow(2, i),
      mask:
        edge === "bottom"
          ? `linear-gradient(to top, #000 ${from * 100}%, transparent ${(from + 1 / count) * 100}%)`
          : `linear-gradient(to bottom, #000 ${from * 100}%, transparent ${(from + 1 / count) * 100}%)`,
    };
  });

  return (
    <div
      className={`nf-progressive-blur ${className}`}
      aria-hidden
      style={{ height, [edge === "bottom" ? "bottom" : "top"]: 0 }}
    >
      {bands.map((band, i) => (
        <span
          key={i}
          style={
            {
              ["--nf-blur"]: `${band.blur}px`,
              WebkitMaskImage: band.mask,
              maskImage: band.mask,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Skills 8 & 16 — physical control surface, optionally high contrast. */
export function Skeuo({
  children,
  className = "",
  style,
  contrast = "default",
  pressed,
  onClick,
}: Base & {
  contrast?: "default" | "high";
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`nf-skeuo ${className}`}
      data-contrast={contrast === "high" ? "high" : undefined}
      aria-pressed={pressed}
      onClick={onClick}
      style={{ padding: "0.6rem 1.1rem", fontSize: 13, ...style }}
    >
      {children}
    </button>
  );
}

/** Skill 64 — metaball blobs merged by an SVG goo filter. */
export function GooeyBlobs({ count = 4, className = "" }: { count?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  const blobs = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
    size: 120 + i * 36,
    left: `${12 + i * 19}%`,
    top: `${18 + ((i * 27) % 50)}%`,
    delay: i * 1400,
    duration: 16 + i * 3,
  }));

  return (
    <div className={`nf-gooey ${className}`} aria-hidden>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
        <filter id="nf-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
          />
        </filter>
      </svg>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="nf-blob"
          style={
            {
              width: b.size,
              height: b.size,
              left: b.left,
              top: b.top,
              ["--nf-delay"]: `${b.delay}ms`,
              ["--nf-blob-duration"]: `${b.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Skill 3 — Aura asset image.
 *
 * The hosted Aura library is not reachable from this app, so the same visual
 * intent (atmospheric abstract artwork) is generated deterministically from the
 * seed. `resolveAuraAsset` is the single swap point for a real provider.
 */
export function resolveAuraAsset(seed: string): { background: string } {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 48) % 360;
  const h3 = (h1 + 300) % 360;

  return {
    background: [
      `radial-gradient(60% 70% at 22% 28%, hsl(${h1} 72% 58% / 0.85), transparent 62%)`,
      `radial-gradient(55% 60% at 78% 34%, hsl(${h2} 68% 52% / 0.7), transparent 60%)`,
      `radial-gradient(70% 80% at 50% 88%, hsl(${h3} 60% 34% / 0.75), transparent 64%)`,
      `linear-gradient(160deg, #120c09, #060405)`,
    ].join(", "),
  };
}

export function AuraAsset({
  seed,
  alt = "",
  className = "",
  style,
}: {
  seed: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { background } = resolveAuraAsset(seed);
  return (
    <div
      className={`nf-dither ${className}`}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ background, backgroundBlendMode: "screen", ...style }}
    />
  );
}
