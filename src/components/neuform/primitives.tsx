"use client";

/**
 * Layout primitives: container lines, corner diagonals, nested frames,
 * framed grids, number details, terminal and wireframe furniture.
 */

import type { CSSProperties, ReactNode } from "react";

type Base = { children?: ReactNode; className?: string; style?: CSSProperties };

/** Skill 5 — vertical container-size lines with mini corner squares. */
export function ContainerLines({ children, className = "", style }: Base) {
  return (
    <div className={`nf-container-lines ${className}`} style={style}>
      <span className="nf-corner-square" style={{ insetInlineStart: -3, top: -3 }} aria-hidden />
      <span className="nf-corner-square" style={{ insetInlineEnd: -3, top: -3 }} aria-hidden />
      <span className="nf-corner-square" style={{ insetInlineStart: -3, bottom: -3 }} aria-hidden />
      <span className="nf-corner-square" style={{ insetInlineEnd: -3, bottom: -3 }} aria-hidden />
      {children}
    </div>
  );
}

/** Skill 25 — diagonal notches at each corner. */
export function CornerDiagonals({ children, className = "", style }: Base) {
  return (
    <div className={`nf-corner-diagonals ${className}`} style={style}>
      <i aria-hidden />
      <i aria-hidden />
      <i aria-hidden />
      <i aria-hidden />
      {children}
    </div>
  );
}

/** Skill 30 — concentric hairline frames. Depth clamps to 2 on small screens. */
export function NestedFrames({
  depth = 3,
  children,
  className = "",
  style,
}: Base & { depth?: number }) {
  const levels = Math.max(1, Math.min(depth, 4));
  let node = <>{children}</>;
  for (let i = 0; i < levels; i += 1) {
    node = (
      <div className="nf-frame" style={{ opacity: 1 - i * 0.12 }}>
        {node}
      </div>
    );
  }
  return (
    <div className={className} style={style}>
      {node}
    </div>
  );
}

/** Skills 4 & 23 — framed grid with ruled cells and coordinate labels. */
export function FramedGrid({
  columns = 3,
  labelled = false,
  children,
  className = "",
  style,
}: Base & { columns?: number; labelled?: boolean }) {
  return (
    <div
      className={`nf-framed-grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, ...style }}
      data-labelled={labelled || undefined}
    >
      {children}
    </div>
  );
}

/** Skill 53 — decorative zero-padded index numerals. */
export function NumberDetail({
  value,
  className = "",
  decorative = true,
}: {
  value: number | string;
  className?: string;
  decorative?: boolean;
}) {
  const text = typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <span className={`nf-number ${className}`} aria-hidden={decorative || undefined}>
      {text}
    </span>
  );
}

/** Skill 27 — terminal panel used for agent/telemetry output. */
export function TerminalPanel({
  title = "resonant://agent",
  lines,
  className = "",
}: {
  title?: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div className={`nf-terminal ${className}`}>
      <div className="nf-terminal-bar">
        <span
          aria-hidden
          style={{ width: 7, height: 7, borderRadius: 99, background: "#e8a06a" }}
        />
        <span
          aria-hidden
          style={{ width: 7, height: 7, borderRadius: 99, background: "#3f3a33" }}
        />
        <span style={{ marginInlineStart: 6 }}>{title}</span>
      </div>
      <pre style={{ margin: 0, padding: "10px 12px", whiteSpace: "pre-wrap" }}>
        {lines.map((line, i) => (
          <div key={i}>
            <span style={{ color: "#e8a06a" }}>$</span> {line}
          </div>
        ))}
      </pre>
    </div>
  );
}

/** Skill 37 — labelled wireframe box with a leader label. */
export function WireframeBox({ label, children, className = "", style }: Base & { label: string }) {
  return (
    <div className={`nf-wireframe ${className}`} data-label={label} style={style}>
      {children}
    </div>
  );
}

/** Skill 29 — technical split layout: fixed rail + scrolling content. */
export function SplitTechnical({
  rail,
  children,
  className = "",
}: {
  rail: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 12rem) minmax(0, 1fr)",
        gap: "1rem",
        alignItems: "start",
      }}
      data-nf="split-technical"
    >
      <aside
        style={{
          borderInlineEnd: "1px solid var(--nf-line)",
          paddingInlineEnd: "1rem",
          position: "sticky",
          top: "1rem",
        }}
      >
        {rail}
      </aside>
      <div>{children}</div>
    </div>
  );
}
