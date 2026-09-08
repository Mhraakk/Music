# RESONANT v4 — Liquid Glass

Cinematic music intelligence. Artwork-driven. Emotional taste graph.

## What changed in v4
- Real album artwork on every track
- Persistent floating glass Mini Player
- Immersive Now Playing (artwork illuminates the room)
- Liquid Glass material system (glass-1 … glass-4)
- Ambient environment derived from cover colors
- Hero discovery card + editorial track cards
- Preserved recommendation engine + rejection memory

## Run
```bash
npm i && npm run dev
```

## Sonic Drift — cognitive music engine (`/drift`)

A second surface that models music as emotional structure instead of as a catalog. No genre
tags, no BPM, no popularity ranking, no playlists, and no next button — you choose two
coordinates on an emotional map and the engine computes the drift between them, then rewrites
its own plan from how you behave.

- **Zero-genre ontology** — seven emotional axes, retrieved on an Acoustic Vulnerability Index
  and a Cinematic Space Vector. Six strict rejection rules expressed as predicates over
  acoustics rather than tag blocklists.
- **Emotional topography** — nine coordinates replacing the playlist library.
- **The drift** — implicit feedback only. A volume change during an exposed vocal moment
  counts for up to 2.3× a change anywhere else; positive resonance deepens, negative prunes
  the branch, partial explores sideways.
- **Gemini MCP** — `/api/mcp` is a real Model Context Protocol server. The model is shown
  anonymous coordinates with no artist, title or genre, and every proposal is verified against
  the ontology before it is accepted.
- **Providers** — SoundCloud OAuth 2.0 with PKCE, Apple MusicKit ES256 developer tokens. Both
  optional; without them a phase drifts silently and the arc still advances.

Architecture, configuration and design rationale: [`docs/SONIC_DRIFT_ARCHITECTURE.md`](docs/SONIC_DRIFT_ARCHITECTURE.md).

```bash
npm run typecheck
npm run verify:drift    # drives /api/mcp end to end; needs npm run dev
```
