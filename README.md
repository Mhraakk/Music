# RESONANT — discover music by feeling

An image-led music discovery app with no genres, no BPM and no popularity ranking. Browse a
wall of album artwork, search by colour, and let the engine drift from how you actually listen.

```bash
npm i && npm run dev
```

| Route | What it is |
|---|---|
| `/` | **Discover** — masonry of real album artwork, search by feeling or by colour, 30-second previews that play with no credentials configured |
| `/collections` | Nine regions of the emotional map. Not playlists — coordinates |
| `/curators` | The seven reference positions the engine was tuned on |
| `/drift` | The emotional map itself — pick two coordinates and the engine computes the arc between them |
| `/classic` | The original liquid-glass interface, unchanged |

## What makes it not a music player

**Zero-genre ontology.** A record is not "trip hop" or "deep house" here; it is a position in
a seven-axis emotional substrate, retrieved on two derived keys — an Acoustic Vulnerability
Index and a Cinematic Space Vector. Six strict rejection rules are expressed as predicates
over acoustics rather than tag blocklists, so an untagged record nobody has heard is still
filtered on its emotional structure alone.

**No next button.** A session advances when a track ends or when you name a new destination.
Everything else you do is read as evidence rather than obeyed as a command: turning the volume
up while a voice is at its most exposed counts for up to 2.3× the same gesture anywhere else.
Positive resonance deepens the current pattern, negative prunes the branch, partial explores
sideways.

**Search by colour.** Every sleeve's dominant colour is extracted at build time, so picking a
swatch ranks the whole catalog instantly and tints the room to match.

**Gemini MCP.** `/api/mcp` is a real Model Context Protocol server, and the browser UI is just
one of its clients. The model is shown anonymous coordinates with no artist, title or genre —
which makes genre reasoning structurally impossible rather than merely discouraged — and every
proposal is verified against the ontology before it is accepted.

**Real audio, no setup.** 64 of 65 positions resolve to real artwork and a 30-second preview
through the iTunes Search API, which needs no key. Apple MusicKit and SoundCloud OAuth are
supported for high-fidelity playback and identity, but nothing is required.

## Checks

```bash
npm run typecheck
npm run verify:drift    # 44 behavioural checks against the engine; needs npm run dev
npm run resolve:media   # refresh artwork, previews and colours
```

Architecture, design rationale, configuration and the full list of environment variables:
[`docs/SONIC_DRIFT_ARCHITECTURE.md`](docs/SONIC_DRIFT_ARCHITECTURE.md).
