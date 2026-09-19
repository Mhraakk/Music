"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Root-level failures escape the app tree; log to the console sink.
    console.error("[RESONANT] global.error", error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          background: "#050403",
          color: "#f3eee6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460, padding: "2rem" }}>
          <h1 style={{ fontSize: 28 }}>RESONANT could not load.</h1>
          <p style={{ opacity: 0.7 }}>A critical error occurred while starting the experience.</p>
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
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
