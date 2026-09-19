import Link from "next/link";

export default function NotFound() {
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
        <p style={{ letterSpacing: "0.3em", fontSize: 12, opacity: 0.6 }}>404</p>
        <h1 style={{ fontSize: 28, margin: "0.75rem 0" }}>This room does not exist.</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
          The track you were looking for drifted out of the catalog.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.7rem 1.4rem",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3eee6",
            textDecoration: "none",
          }}
        >
          Back to RESONANT
        </Link>
      </div>
    </main>
  );
}
