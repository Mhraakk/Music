"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const portRef = useRef<HTMLDivElement>(null);
  const [portWidth, setPortWidth] = useState(0);

  useEffect(() => {
    const el = portRef.current;
    if (!el) return;
    const update = () => setPortWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (fit === "canvas" && canvas.width > 0 && canvas.height > 0) {
      return { minX: 0, maxX: canvas.width, minY: 0, maxY: canvas.height };
    }
    if (!items.length) return { minX: 0, maxX: canvas.width || 1, minY: 0, maxY: canvas.height || 1 };
    const xs = items.map((item) => item.x);
    const ys = items.map((item) => item.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = Math.max(24, (maxX - minX) * 0.06);
    const padY = Math.max(24, (maxY - minY) * 0.08);
    return {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minY - padY,
      maxY: maxY + padY,
    };
  }, [items, canvas, fit]);

  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const width = portWidth || canvas.width || 800;
  const nativeRatio = spanY / spanX;
  const height =
    fit === "canvas"
      ? Math.max(width * nativeRatio, 480)
      : Math.max(280, Math.min(640, width * Math.min(nativeRatio, 0.85)));

  return (
    <div ref={portRef} className={`cx-atlas-field is-${tone}`} aria-label={label}>
      <div className="cx-atlas-canvas" style={{ width: "100%", height }}>
        {items.map((item) => {
          const left = ((item.x - bounds.minX) / spanX) * 100;
          const top = ((item.y - bounds.minY) / spanY) * 100;
          const size = Math.max(9, Math.min(22, (item.weight / 100) * 13));
          const title =
            item.title ??
            (item.label);
          const className = `cx-atlas-node${item.played ? " is-played" : ""}`;
          const style = {
            left: `${left}%`,
            top: `${top}%`,
            color: item.color,
            fontSize: `${size}px`,
          } as const;
          if (mode === "preview") {
            return (
              <span key={item.id} className={className} style={style} title={title}>
                <button
                  type="button"
                  className="cx-atlas-node-play"
                  onClick={() => onPreview?.(item)}
                  onMouseEnter={() => {
                    if (item.previewUrl) onPreview?.(item);
                  }}
                >
                  {item.label}
                </button>
                <Link href={item.moreHref || item.href} className="cx-atlas-node-more" aria-label={`Open ${item.label}`}>
                  »
                </Link>
              </span>
            );
          }
          return (
            <Link
              key={item.id}
              href={item.href}
              className={className}
              style={style}
              title={title}
              onMouseEnter={() => {
                if (item.previewUrl) onPreview?.(item);
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
