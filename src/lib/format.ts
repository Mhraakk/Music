/** Listener-facing counts. Engine jargon (positions, AVI) stays off the product surface. */

export function songsLabel(count: number): string {
  if (count === 1) return "1 song";
  return `${count.toLocaleString()} songs`;
}

export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
