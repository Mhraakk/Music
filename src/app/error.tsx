"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("route.error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#050403",
        color: "#f3eee6",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <p style={{ letterSpacing: "0.3em", fontSize: 12, opacity: 0.6 }}>RESONANT</p>
        <h1 style={{ fontSize: 28, margin: "0.75rem 0" }}>The room went quiet.</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
          Something interrupted the signal. Your taste memory is safe — this is a local hiccup.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.7rem 1.4rem",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3eee6",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
