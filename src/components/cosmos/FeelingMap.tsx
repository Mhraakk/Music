"use client";

import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";

export function FeelingMap({
  current,
  onPick,
}: {
  current: CoordinateId;
  onPick: (id: CoordinateId) => void;
}) {
  const active = TOPOGRAPHY.find((room) => room.id === current) ?? TOPOGRAPHY[0];

  return (
    <div>
      <div className="cx-feeling-map">
        {TOPOGRAPHY.map((room) => (
          <button
            key={room.id}
            type="button"
            className="cx-feeling-chip"
            data-active={room.id === current ? "true" : "false"}
            onClick={() => onPick(room.id)}
            title={room.description}
          >
            {room.label}
          </button>
        ))}
      </div>
      <p className="cx-meta mt-3 max-w-[62ch]">
        <span className="font-semibold text-[var(--ink-1)]">{active.label}.</span> {active.description} Refresh
        harvests live Apple Music for this room, a new seed each time.
      </p>
    </div>
  );
}
