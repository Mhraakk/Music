"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB).
 * In development they are logged; in production they can be forwarded to an
 * analytics sink. Vercel Speed Insights (in layout) already collects these in
 * production, so here we keep a lightweight, provider-agnostic hook.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[web-vitals] ${metric.name}: ${Math.round(metric.value)}`);
    }
  });

  return null;
}
