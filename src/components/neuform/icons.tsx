"use client";

/**
 * Icon skills.
 *
 * 21 — Company Logos: real brand marks from Iconify Simple Icons, with an
 *      inline monogram fallback so the UI never shows a broken image offline.
 * 31 — Solar Duotone Bold: a duotone icon language where a bold solid shape is
 *      paired with a lighter accent shape. Shipped inline (no runtime fetch).
 */

import { useState } from "react";

const ICONIFY = "https://api.iconify.design";

export function BrandLogo({
  name,
  label,
  size = 64,
  color = "#f3eee6",
}: {
  /** Simple Icons slug, e.g. "spotify", "apple", "bandcamp". */
  name: string;
  label?: string;
  size?: number;
  color?: string;
}) {
  const [broken, setBroken] = useState(false);
  const accessibleName = label ?? name;

  if (broken) {
    return (
      <span
        role="img"
        aria-label={accessibleName}
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          border: "1px solid var(--nf-line)",
          color,
          fontSize: size * 0.34,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {accessibleName.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${ICONIFY}/simple-icons:${name}.svg?color=${encodeURIComponent(color)}`}
      alt={accessibleName}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      style={{ width: size, height: size, opacity: 0.85 }}
    />
  );
}

export function BrandLogoRow({
  names,
  size = 48,
}: {
  names: { name: string; label?: string }[];
  size?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1.25rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {names.map((n) => (
        <BrandLogo key={n.name} name={n.name} label={n.label} size={size} />
      ))}
    </div>
  );
}

/** Duotone glyph set: solid base path + lighter accent path. */
const DUOTONE: Record<string, { base: string; accent: string; directional?: boolean }> = {
  play: {
    base: "M8 5.5v13a1 1 0 0 0 1.52.85l10.5-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z",
    accent: "M3 6.5a1 1 0 0 1 2 0v11a1 1 0 0 1-2 0Z",
  },
  waveform: {
    base: "M11 3h2v18h-2zM7 7h2v10H7zM15 7h2v10h-2z",
    accent: "M3 10h2v4H3zM19 10h2v4h-2z",
  },
  spark: {
    base: "M12 2l2.2 5.9L20 10l-5.8 2.1L12 18l-2.2-5.9L4 10l5.8-2.1z",
    accent: "M18.5 15l1 2.6L22 18.6l-2.5.9L18.5 22l-1-2.5-2.5-.9 2.5-1z",
  },
  layers: {
    base: "M12 2 2 7.5 12 13l10-5.5z",
    accent: "M2 12.5 12 18l10-5.5M2 17 12 22.5 22 17",
  },
  shield: {
    base: "M12 2 4 5v6.5c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V5z",
    accent: "M12 7v10",
  },
  arrow: {
    base: "M4 12h13",
    accent: "M13 6l6 6-6 6",
    directional: true,
  },
};

export type DuotoneName = keyof typeof DUOTONE;

export function DuotoneIcon({
  name,
  size = 24,
  label,
  color = "#e8a06a",
}: {
  name: DuotoneName;
  size?: number;
  label?: string;
  color?: string;
}) {
  const glyph = DUOTONE[name];
  if (!glyph) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      /* Directional glyphs mirror with the document direction. */
      style={glyph.directional ? { transform: "scaleX(var(--nf-dir))" } : undefined}
    >
      <path
        d={glyph.base}
        fill={color}
        stroke={color}
        strokeWidth={name === "arrow" ? 2 : 0}
        strokeLinecap="round"
      />
      <path
        d={glyph.accent}
        fill={name === "layers" || name === "shield" || name === "arrow" ? "none" : color}
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity={0.4}
      />
    </svg>
  );
}

export const DUOTONE_NAMES = Object.keys(DUOTONE) as DuotoneName[];
