"use client";

import { memo, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  const hasCentered = useRef(false);
  const mapKey = `${fit}:${items.length}`;
  const prevMapKey = useRef(mapKey);
  if (prevMapKey.current !== mapKey) {
    prevMapKey.current = mapKey;
    hasCentered.current = false;
  }
  const [portWidth, setPortWidth] = useState(0);
  const [view, setView] = useState({ left: 0, top: 0, w: 0, h: 0 });

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
  const plotWidth = portWidth || 800;
  const nativeRatio = spanY / spanX;
  const height =
    fit === "canvas"
      ? Math.max(plotWidth * nativeRatio, 480)
      : Math.max(280, Math.min(640, plotWidth * Math.min(nativeRatio, 0.85)));

  const heavyCenter = useMemo(() => {
    if (!items.length) return { x: bounds.minX + spanX / 2, y: bounds.minY + spanY / 2 };
    const heavy = items.slice().sort((a, b) => b.weight - a.weight).slice(0, 120);
    return {
      x: heavy.reduce((sum, item) => sum + item.x, 0) / heavy.length,
      y: heavy.reduce((sum, item) => sum + item.y, 0) / heavy.length,
    };
  }, [items, bounds.minX, bounds.minY, spanX, spanY]);

  useLayoutEffect(() => {
    const el = portRef.current;
    if (!el) return;
    const nextWidth = el.clientWidth;
    if (nextWidth && nextWidth !== portWidth) setPortWidth(nextWidth);
    if (fit === "canvas" && items.length) {
      const left = ((heavyCenter.x - bounds.minX) / spanX) * el.scrollWidth;
      const top = ((heavyCenter.y - bounds.minY) / spanY) * el.scrollHeight;
      el.scrollLeft = Math.max(0, left - el.clientWidth / 2);
      el.scrollTop = Math.max(0, top - el.clientHeight / 2);
    } else {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
    if (items.length) hasCentered.current = true;
    // Programmatic scroll does not always fire `scroll`. Publish the cull
    // window here or the dense cluster stays off-screen and the map paints empty.
    const nextView = {
      left: el.scrollLeft,
      top: el.scrollTop,
      w: el.clientWidth,
      h: el.clientHeight,
    };
    setView((prev) =>
      prev.left === nextView.left && prev.top === nextView.top && prev.w === nextView.w && prev.h === nextView.h
        ? prev
        : nextView
    );
  }, [fit, items.length, heavyCenter.x, heavyCenter.y, bounds.minX, bounds.minY, spanX, spanY, height, portWidth]);

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
      if (next.w && next.w !== portWidth) setPortWidth(next.w);
      startTransition(() => {
        setView((prev) =>
          prev.left === next.left && prev.top === next.top && prev.w === next.w && prev.h === next.h ? prev : next
        );
      });
    };
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
  }, [items.length, portWidth]);

  const visible = useMemo(() => {
    if (items.length < CULL_AFTER) return items;
    const vw = view.w || plotWidth;
    const vh = view.h || Math.min(720, height);
    const predictedLeft = Math.max(0, ((heavyCenter.x - bounds.minX) / spanX) * plotWidth - vw / 2);
    const predictedTop = Math.max(0, ((heavyCenter.y - bounds.minY) / spanY) * height - vh / 2);
    const settled = hasCentered.current && view.w > 0;
    const left = settled ? view.left : predictedLeft;
    const top = settled ? view.top : predictedTop;
    const hits = items.filter((item) => {
      const px = ((item.x - bounds.minX) / spanX) * plotWidth;
      const py = ((item.y - bounds.minY) / spanY) * height;
      return px >= left - CULL_PAD && px <= left + vw + CULL_PAD && py >= top - CULL_PAD && py <= top + vh + CULL_PAD;
    });
    if (hits.length > 0) return hits;
    return items.filter((item) => {
      const px = ((item.x - bounds.minX) / spanX) * plotWidth;
      const py = ((item.y - bounds.minY) / spanY) * height;
      return (
        px >= predictedLeft - CULL_PAD &&
        px <= predictedLeft + vw + CULL_PAD &&
        py >= predictedTop - CULL_PAD &&
        py <= predictedTop + vh + CULL_PAD
      );
    });
  }, [items, bounds.minX, bounds.minY, spanX, spanY, plotWidth, height, view, heavyCenter.x, heavyCenter.y]);

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
