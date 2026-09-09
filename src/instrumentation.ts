export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NEXT_PHASE === "phase-production-compile") return;
  const { listenNuclearMcp } = await import("@/lib/nuclear/listen");
  listenNuclearMcp();
}
