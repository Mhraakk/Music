"use client";

import type { CSSProperties, ReactNode } from "react";
import { getPreset, presetStyle } from "@/design/themes";

/**
 * Applies a design-system preset to a subtree as scoped CSS custom properties.
 * Pure CSS — no JS runs after render, and the subtree inherits document
 * direction so RTL keeps working inside any preset.
 */
export function ThemeScope({
  preset,
  children,
  className = "",
  style,
}: {
  preset: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const found = getPreset(preset);
  if (!found) return <div className={className}>{children}</div>;

  return (
    <div
      className={className}
      data-nf-preset={found.id}
      style={{ ...(presetStyle(found) as CSSProperties), ...style }}
    >
      {children}
    </div>
  );
}
