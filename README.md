# RESONANT — discover music by feeling

An image-led music discovery app with no genres, no BPM and no popularity ranking. Browse a
wall of album artwork, search by colour, and let the engine drift from how you actually listen.

```bash
npm i && npm run dev
```

| Route | What it is |
|---|---|
| `/` | **Discover** — masonry of real album artwork, search by feeling or colour, cognition-led auto-advance, 30-second previews with no credentials |
| `/collections` | Nine regions of the emotional map. Not playlists — coordinates |
| `/curators` | The seven reference positions the engine was tuned on |
| `/drift` | The emotional map itself — pick two coordinates and the engine computes the arc between them |

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

**Living catalog.** The authored seed is only the calibration set. The expansion engine
searches Apple Music near the artists who already occupy your taste — taste is a position
in the substrate, never a genre — projects each hit onto the seven axes, and admits what
survives the rejection rules. `10 new near your taste` on the discover surface asks for
ten new positions whenever you want them.

**Real audio, no setup.** Seed and harvested positions resolve to real artwork and a
30-second preview through the iTunes Search API, which needs no key. Apple MusicKit and
SoundCloud OAuth are supported for high-fidelity playback and identity, but nothing is
required.

## Deploying

Nothing is required to deploy. There are no mandatory environment variables — the engine falls
back to deterministic local cognition and playback uses iTunes previews, so a fresh deploy is
fully functional out of the box.

**Connect this GitHub repo to Vercel** (import, do not clone — the repo already exists):

[https://vercel.com/new/import?s=https://github.com/Mhraakk/Music](https://vercel.com/new/import?s=https://github.com/Mhraakk/Music)

Vercel detects Next.js from `vercel.json`. After import, set **Production Branch** to
`cursor/cognition-complete-e638` until that work is on `main` — `main` is still the older
60-track catalog without the living engine.

A `VERCEL_TOKEN` (Account Settings → Tokens) lets the CLI finish the rest without the
dashboard:

```bash
npx vercel login
npx vercel link --yes --project resonant
npx vercel --prod --yes
```

`@vercel/speed-insights` is already wired into the root layout and starts reporting on its
own.

Optional variables, each of which upgrades a capability rather than enabling one:

| Variable | Without it |
|---|---|
| `GEMINI_API_KEY` | Deterministic local cognition owns the drift |
| `APPLE_MUSIC_TEAM_ID` · `APPLE_MUSIC_KEY_ID` · `APPLE_MUSIC_PRIVATE_KEY` | 30-second iTunes previews instead of full-catalog resolution |
| `SOUNDCLOUD_CLIENT_ID` · `SOUNDCLOUD_CLIENT_SECRET` | No SoundCloud identity or base audio |

`SOUNDCLOUD_REDIRECT_URI` is derived from the request origin, so it only needs setting if your
registered callback differs from `https://<your-domain>/api/auth/soundcloud/callback`.

## Checks

```bash
npm run typecheck
npm run verify:drift    # behavioural checks against the engine; needs a server running
npm run harvest:catalog # pull Apple Music neighbours into the living catalog
npm run resolve:media   # refresh artwork, previews and colours for the authored seed
```

`verify:drift` takes an optional base URL, so it can be pointed at a production build or a
deployed instance: `node scripts/verify-drift-engine.mjs https://your-domain`.

Architecture, design rationale, configuration and the full list of environment variables:
[`docs/SONIC_DRIFT_ARCHITECTURE.md`](docs/SONIC_DRIFT_ARCHITECTURE.md).
