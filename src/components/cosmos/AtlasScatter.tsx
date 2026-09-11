"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import type { AtlasCanvas } from "@/lib/everynoise/types";

export type ScatterNode = {
  id: string;
  label: string;
  href: string;
  moreHref?: string;
  color: string;
  x: number;
  y: number;
  weight: number;
  previewUrl?: string | null;
  title?: string;
  played?: boolean;
};

const CULL_AFTER = 400;

function letterId(letter: string): string {
  if (letter === "0–9") return "atlas-letter-0-9";
  return `atlas-letter-${letter}`;
}

function letterOf(label: string): string {
  const trimmed = label.trim();
  const match = trimmed.match(/[\p{L}\p{N}]/u);
  const ch = match?.[0] ?? "";
  if (!ch) return "#";
  if (/\d/.test(ch)) return "0–9";
  return ch.toLocaleUpperCase();
}

function groupByLetter(items: ScatterNode[]) {
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  const groups: { letter: string; items: ScatterNode[] }[] = [];
  for (const item of sorted) {
    const letter = letterOf(item.label);
    const last = groups[groups.length - 1];
    if (!last || last.letter !== letter) groups.push({ letter, items: [item] });
    else last.items.push(item);
  }
  return groups;
}

export function AtlasScatter({
  items,
  canvas,
  fit = "canvas",
  tone = "paper",
  mode = "open",
  label,
  onPreview,
}: {
  items: ScatterNode[];
  canvas: AtlasCanvas;
  fit?: "canvas" | "bounds";
  tone?: "paper" | "nearby" | "mirror";
  mode?: "open" | "preview";
  label: string;
  onPreview?: (item: ScatterNode) => void;
}) {
  void canvas;
  void fit;
  const portRef = useRef<HTMLDivElement>(null);
  const lastPreview = useRef<string | null>(null);
  const [shown, setShown] = useState(() => Math.min(CULL_AFTER, items.length));
  const pendingJump = useRef<string | null>(null);

  const groups = useMemo(() => groupByLetter(items), [items]);
  const letters = useMemo(() => groups.map((group) => group.letter), [groups]);

  const visibleGroups = useMemo(() => {
    let remaining = shown;
    const next: { letter: string; items: ScatterNode[] }[] = [];
    for (const group of groups) {
      if (remaining <= 0) break;
      const slice = group.items.slice(0, remaining);
      remaining -= slice.length;
      if (slice.length) next.push({ letter: group.letter, items: slice });
    }
    return next;
  }, [groups, shown]);

  useLayoutEffect(() => {
    const el = portRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setShown(Math.min(CULL_AFTER, items.length));
  }, [items.length, items[0]?.id]);

  useLayoutEffect(() => {
    const letter = pendingJump.current;
    if (!letter) return;
    pendingJump.current = null;
    document.getElementById(letterId(letter))?.scrollIntoView({ block: "start" });
  }, [shown]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 1200) return;
      setShown((n) => Math.min(n + CULL_AFTER, items.length));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const byId = useMemo(() => {
    const map = new Map<string, ScatterNode>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const handleOver = (event: MouseEvent<HTMLDivElement>) => {
    if (!onPreview) return;
    const el = (event.target as HTMLElement | null)?.closest("[data-scatter-id]");
    if (!(el instanceof HTMLElement)) return;
    const id = el.dataset.scatterId;
    if (!id || id === lastPreview.current) return;
    lastPreview.current = id;
    const item = byId.get(id);
    if (item?.previewUrl) onPreview(item);
  };

  return (
    <div ref={portRef} className={`cx-atlas-field is-${tone}`} aria-label={label}>
      {letters.length > 1 ? (
        <nav className="cx-atlas-az" aria-label="Jump to a letter">
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => {
                const index = groups.findIndex((group) => group.letter === letter);
                if (index < 0) return;
                const count = groups.slice(0, index + 1).reduce((sum, group) => sum + group.items.length, 0);
                if (count <= shown) {
                  document.getElementById(letterId(letter))?.scrollIntoView({ block: "start" });
                  return;
                }
                pendingJump.current = letter;
                setShown(count);
              }}
            >
              {letter}
            </button>
          ))}
        </nav>
      ) : null}
      <div
        className="cx-atlas-canvas"
        onMouseOver={handleOver}
        onMouseLeave={() => {
          lastPreview.current = null;
        }}
      >
        {visibleGroups.map((group) => (
          <section key={group.letter} className="cx-atlas-letter-block" id={letterId(group.letter)}>
            <h2 className="cx-atlas-letter">{group.letter}</h2>
            <div className="cx-atlas-grid">
              {group.items.map((item) => (
                <ScatterMark key={item.id} item={item} mode={mode} onPreview={onPreview} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {shown < items.length ? (
        <button
          type="button"
          className="cx-atlas-more"
          onClick={() => setShown((n) => Math.min(n + CULL_AFTER, items.length))}
        >
          More branches · {shown.toLocaleString()} of {items.length.toLocaleString()}
        </button>
      ) : null}
    </div>
  );
}

const ScatterMark = memo(function ScatterMark({
  item,
  mode,
  onPreview,
}: {
  item: ScatterNode;
  mode: "open" | "preview";
  onPreview?: (item: ScatterNode) => void;
}) {
  const title = item.title ?? item.label;
  const className = `cx-atlas-node${item.played ? " is-played" : ""}`;
  const style = { "--branch": item.color } as CSSProperties;
  if (mode === "preview") {
    return (
      <span className={className} style={style} title={title} data-scatter-id={item.id}>
        <span className="cx-atlas-node-swatch" aria-hidden />
        <button type="button" className="cx-atlas-node-play" onClick={() => onPreview?.(item)}>
          {item.label}
        </button>
        <Link href={item.moreHref || item.href} className="cx-atlas-node-more" aria-label={`Open ${item.label}`} prefetch={false}>
          Open
        </Link>
      </span>
    );
  }
  return (
    <Link href={item.href} className={className} style={style} title={title} data-scatter-id={item.id} prefetch={false}>
      <span className="cx-atlas-node-swatch" aria-hidden />
      <span className="cx-atlas-node-label">{item.label}</span>
    </Link>
  );
});
