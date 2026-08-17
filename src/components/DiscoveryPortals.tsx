"use client";

import { PORTAL_LIST, type PortalId, runPortal } from "@/lib/taste/portals";
import type { Compass, FB } from "@/lib/engine";
import type { Track } from "@/lib/tracks";

type Props = {
  compass: Compass;
  fb: FB;
  depth: number;
  onResult: (items: Track[], meta: { compass?: Partial<Compass>; depth?: number; title: string }) => void;
};

export function DiscoveryPortals({ compass, fb, depth, onResult }: Props) {
  const run = (id: PortalId) => {
    const r = runPortal(id, compass, fb, depth);
    onResult(r.items, { compass: r.compass, depth: r.depth, title: r.title });
  };
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Discovery portals</p>
      <div className="flex flex-wrap gap-1.5">
        {PORTAL_LIST.map((p) => (
          <button key={p.id} type="button" onClick={() => run(p.id)} className="pressable text-[11px] px-3 py-1.5 rounded-full glass-2 text-[#e8a06a]/90 border border-white/10">{p.label}</button>
        ))}
      </div>
    </div>
  );
}
