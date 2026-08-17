"use client";

import type { HealthResult } from "@/lib/reliability/health";

type Props = {
  tier?: string;
  health?: HealthResult | null;
  message?: string | null;
  poolSize?: number;
  itemCount?: number;
  correlationId?: string;
  sources?: string[];
};

const TIER_COPY: Record<string, { label: string; hint: string; tone: "ok" | "soft" | "warn" }> = {
  primary: { label: "Primary", hint: "Full personalized rank", tone: "ok" },
  relaxed: { label: "Relaxed", hint: "Widened the room — fewer exact matches", tone: "soft" },
  "soft-fallback": { label: "Soft fallback", hint: "Rejection memory was dense — nearest honest rooms", tone: "warn" },
  absolute: { label: "Open catalog", hint: "Filters cleared to soft signals only", tone: "warn" },
  "full-rotate": { label: "Rotation", hint: "Hard vetoes exhausted the graph — rotating open catalog", tone: "warn" },
  emergency: { label: "Emergency fill", hint: "Never-empty floor — teach the graph again", tone: "warn" },
  cached: { label: "Cached", hint: "Showing last-good while refreshing", tone: "soft" },
};

function tierMeta(tier?: string) {
  if (!tier) return TIER_COPY.primary;
  return TIER_COPY[tier] || { label: tier, hint: "Non-primary path", tone: "soft" as const };
}

export function HealthBanner({ tier, health, message, poolSize, itemCount, correlationId, sources }: Props) {
  const meta = tierMeta(tier);
  const score = health?.score;
  const pct = typeof score === "number" ? Math.round(score * 100) : null;
  const degraded = meta.tone !== "ok" || (health && !health.ok);
  const show = Boolean(tier || health || message);
  if (!show) return null;
  const border =
    meta.tone === "ok"
      ? "border-white/10 bg-white/[0.03]"
      : meta.tone === "soft"
        ? "border-amber-500/20 bg-amber-500/[0.07]"
        : "border-orange-500/25 bg-orange-500/[0.08]";
  return (
    <div className={`mt-3 rounded-xl border px-3.5 py-2.5 space-y-1.5 ${border}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="text-[#e8a06a]/95 font-medium tracking-wide">{meta.label}</span>
        {pct !== null && (
          <span className={health?.ok ? "text-emerald-400/85" : "text-amber-200/90"}>
            Health {pct}%{!health?.ok ? " · regenerating quality" : ""}
          </span>
        )}
        {typeof itemCount === "number" && <span className="text-white/35">{itemCount} tracks</span>}
        {typeof poolSize === "number" && poolSize > 0 && <span className="text-white/30">pool {poolSize}</span>}
      </div>
      <p className="text-[11px] text-white/45 leading-relaxed">{meta.hint}</p>
      {message && <p className="text-[11px] text-amber-100/85 leading-relaxed">{message}</p>}
      {health?.warnings && health.warnings.length > 0 && (
        <p className="text-[10px] text-white/30">{health.warnings.filter((w) => w !== "health_below_threshold").join(" · ") || null}</p>
      )}
      {sources && sources.length > 0 && (
        <p className="text-[10px] text-white/28">Sources: {sources.slice(0, 6).join(" · ")}</p>
      )}
      {correlationId && <p className="text-[9px] text-white/20 font-mono truncate">{correlationId}</p>}
    </div>
  );
}
