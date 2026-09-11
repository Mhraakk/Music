---
name: listen-engine
description: >-
  Resonant player, drift engine, Media Session, resume, prefs, and Nuclear MCP.
  Use when changing playback, queue, MCP domains, or verify-drift.
---

# Listen engine

## Player

- `src/context/PlayerContext.tsx` owns session, prefs (`resonant.prefs.v1`), last-listen resume (`resonant.listen.v1`), Media Session, SoundCloud clock, retry.
- MiniPlayer: Share, Retry, resume bar. No skip.
- Duration: `src/lib/listen/duration.ts`. Use real media duration, not a hardcoded 30.

## MCP

Nuclear (`POST /mcp` and `127.0.0.1:8800/mcp`) must keep **four** tools. Add capabilities as `Domain.method` via `call`.

Full surface is `POST /api/mcp` (`sonic-drift-cognitive-core`) plus Ask tools from `src/lib/mcp/listen-tools.ts`.

After changing tools, run:

```bash
node scripts/verify-drift-engine.mjs http://127.0.0.1:PORT
```

Expect the Nuclear four-tool lock and no `Queue.goToNext`.
