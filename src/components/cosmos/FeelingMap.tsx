"use client";

import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";

export function FeelingMap({
  current,
  onPick,
}: {
  current: CoordinateId;
  onPick: (id: CoordinateId) => void;
}) {
  return (
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
  );
}
