"use client";

import { memo, startTransition, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
const CULL_PAD = 280;

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
  const lastPreview = useRef<string | null>(null);
  const [portWidth, setPortWidth] = useState(0);
  const [view, setView] = useState({ left: 0, top: 0, w: 0, h: 0 });

  useEffect(() => {
    const el = portRef.current;
    if (!el) return;
    let frame = 0;
    const publish = () => {
      frame = 0;
      const next = {
        left: el.scrollLeft,
        top: el.scrollTop,
        w: el.clientWidth,
        h: el.clientHeight,
      };
      setPortWidth(next.w);
      startTransition(() => setView(next));
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(publish);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items.length]);

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

  const heavyCenter = useMemo(() => {
    if (!items.length) return { x: bounds.minX + spanX / 2, y: bounds.minY + spanY / 2 };
    const heavy = items.slice().sort((a, b) => b.weight - a.weight).slice(0, 120);
    return {
      x: heavy.reduce((sum, item) => sum + item.x, 0) / heavy.length,
      y: heavy.reduce((sum, item) => sum + item.y, 0) / heavy.length,
    };
  }, [items, bounds.minX, bounds.minY, spanX, spanY]);

  useEffect(() => {
    if (fit !== "canvas" || !items.length) return;
    const el = portRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight * 1.2 && el.scrollWidth <= el.clientWidth * 1.2) return;
    const left = ((heavyCenter.x - bounds.minX) / spanX) * el.scrollWidth;
    const top = ((heavyCenter.y - bounds.minY) / spanY) * el.scrollHeight;
    el.scrollTo({
      left: Math.max(0, left - el.clientWidth / 2),
      top: Math.max(0, top - el.clientHeight / 2),
    });
  }, [fit, items.length, heavyCenter.x, heavyCenter.y, bounds.minX, bounds.minY, spanX, spanY, height, portWidth]);

  const visible = useMemo(() => {
    if (items.length < CULL_AFTER) return items;
    const vw = view.w || width;
    const vh = view.h || Math.min(720, width);
    let left = view.left;
    let top = view.top;
    if (!view.w) {
      const cx = ((heavyCenter.x - bounds.minX) / spanX) * width;
      const cy = ((heavyCenter.y - bounds.minY) / spanY) * height;
      left = Math.max(0, cx - vw / 2);
      top = Math.max(0, cy - vh / 2);
    }
    return items.filter((item) => {
      const px = ((item.x - bounds.minX) / spanX) * width;
      const py = ((item.y - bounds.minY) / spanY) * height;
      return px >= left - CULL_PAD && px <= left + vw + CULL_PAD && py >= top - CULL_PAD && py <= top + vh + CULL_PAD;
    });
  }, [items, bounds.minX, bounds.minY, spanX, spanY, width, height, view, heavyCenter.x, heavyCenter.y]);

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
      <div
        className="cx-atlas-canvas"
        style={{ width: "100%", height }}
        onMouseOver={handleOver}
        onMouseLeave={() => {
          lastPreview.current = null;
        }}
      >
        {visible.map((item) => {
          const left = ((item.x - bounds.minX) / spanX) * 100;
          const top = ((item.y - bounds.minY) / spanY) * 100;
          const size = Math.max(9, Math.min(22, (item.weight / 100) * 13));
          return (
            <ScatterMark
              key={item.id}
              item={item}
              mode={mode}
              left={left}
              top={top}
              size={size}
              onPreview={onPreview}
            />
          );
        })}
      </div>
    </div>
  );
}

const ScatterMark = memo(function ScatterMark({
  item,
  mode,
  left,
  top,
  size,
  onPreview,
}: {
  item: ScatterNode;
  mode: "open" | "preview";
  left: number;
  top: number;
  size: number;
  onPreview?: (item: ScatterNode) => void;
}) {
  const title = item.title ?? item.label;
  const className = `cx-atlas-node${item.played ? " is-played" : ""}`;
  const style = {
    left: `${left}%`,
    top: `${top}%`,
    color: item.color,
    fontSize: `${size}px`,
  } as const;
  if (mode === "preview") {
    return (
      <span className={className} style={style} title={title} data-scatter-id={item.id}>
        <button type="button" className="cx-atlas-node-play" onClick={() => onPreview?.(item)}>
          {item.label}
        </button>
        <Link href={item.moreHref || item.href} className="cx-atlas-node-more" aria-label={`Open ${item.label}`} prefetch={false}>
          »
        </Link>
      </span>
    );
  }
  return (
    <Link href={item.href} className={className} style={style} title={title} data-scatter-id={item.id} prefetch={false}>
      {item.label}
    </Link>
  );
});
