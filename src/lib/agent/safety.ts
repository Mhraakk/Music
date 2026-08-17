/**
 * Safety rules for the RESONANT in-app agent.
 */
export const SAFETY_RULES = [
  "No auto-export of playlists — confirmPlaylistExport requires explicit user confirmation",
  "No third-party account mutation (no Spotify/Apple OAuth writes)",
  "Taste writes are local feedback memory only (Zustand persist)",
  "Never invent track titles, artists, or ids — catalog verification is mandatory",
  "Never return an empty recommendation list from agent tools",
  "Player controls may change local playback only",
  "Compass / depth changes are client-side and reversible",
  "Export mode is link-pack only (search deep links + text list)",
] as const;

export const ALLOWED_EFFECT_TYPES = [
  "setCompass", "setFeedback", "pushMemory", "play", "player", "setTab", "clearRecent",
] as const;

export type AllowedEffectType = (typeof ALLOWED_EFFECT_TYPES)[number];

export function isAllowedEffectType(t: string): t is AllowedEffectType {
  return (ALLOWED_EFFECT_TYPES as readonly string[]).includes(t);
}

export function sanitizeEffects<T extends { type: string }>(effects: T[]): T[] {
  return effects.filter((e) => isAllowedEffectType(e.type));
}

export const CONFIRM_GATED_TOOLS = ["confirmPlaylistExport"] as const;

export function requiresExplicitConfirm(toolName: string, args: Record<string, unknown>): boolean {
  if (toolName === "confirmPlaylistExport" && args.confirmed !== true) return true;
  return false;
}
