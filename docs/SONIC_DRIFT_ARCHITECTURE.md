# Sonic Drift — Cognitive Music Engine

Music modelled as emotional structure evolving over time. No genre tags, no BPM, no
popularity ranking, no playlists, no next button.

## Surfaces

The engine described here drives three interfaces, which share the catalog and the cognitive
core and agree on nothing else visually. Design tokens are scoped per surface so they cannot
contaminate each other — see [Why they are separate surfaces](#why-they-are-separate-surfaces).

| Route | Surface | Design |
|---|---|---|
| `/` | Discover | Image-led. Masonry of real album artwork, warm off-white paper, search by colour. See [§9](#9-the-image-led-surface). |
| `/drift` | Emotional map | Brutalist. Flat, 0px radius, no artwork, 8px grid. See [§5](#5-design-system-drift). |
| `/classic` | Original RESONANT | Liquid glass. Blur, elevation, 22px corners. Unchanged. |

`/` is the primary surface. Everything from §1 to §4 below is common to all three.

---

## 1. System architecture

```mermaid
flowchart TB
    subgraph Browser["Browser — Next.js 15 App Router"]
        direction TB
        RSC["/drift page (RSC)<br/>server-rendered: topography,<br/>ontology manifest, provider status"]
        Ctx["DriftContext<br/>arc = EmotionalVector[]<br/>branch memory · signal ledger"]
        UI["CognitivePlayer · EmotionalTopography<br/>DriftArcRail · RoomField"]
        Audio["DriftAudioEngine<br/>Web Audio: 2 lanes,<br/>equal-power crossfade + analyser"]
        MCPC["MCP client<br/>JSON-RPC 2.0 over HTTP"]

        RSC --> Ctx
        Ctx <--> UI
        Ctx --> Audio
        Ctx --> MCPC
        UI -. "volume gesture · dwell · abandon · seek" .-> Ctx
    end

    subgraph Edge["Next.js route handlers (Node runtime)"]
        MCPR["POST /api/mcp<br/>initialize · tools/list · tools/call"]
        SCAuth["/api/auth/soundcloud/*<br/>authorize · callback · session"]
        AMToken["GET /api/musickit/token<br/>ES256 developer token"]
    end

    subgraph Core["Cognitive core"]
        Server["MCP server<br/>4 tools · param validation"]
        Cog["Cognition<br/>propose → verify → fall back"]
        Local["Local cognition<br/>deterministic baseline"]
        Verify["Ontology verifier<br/>admissibility · seam limit"]
    end

    subgraph Engine["Zero-genre engine"]
        Ont["Ontology<br/>7 axes · AVI · Cinematic Space<br/>6 rejection rules · 7 anchors"]
        Topo["Topography<br/>9 coordinates, self-audited"]
        Algo["Drift algorithm<br/>bowed arc · seam cap<br/>deepen / prune / explore"]
        Res["Resonance reader<br/>implicit feedback → mode"]
        Cat["Living catalog<br/>authored seed + Apple harvest<br/>0 genre fields"]
    end

    subgraph External["External services"]
        Gem["Gemini<br/>generativelanguage API"]
        AM["Apple MusicKit<br/>catalog search"]
        SC["SoundCloud<br/>OAuth 2.0 + PKCE, /me, /tracks"]
    end

    MCPC -->|"tools/call"| MCPR
    MCPR --> Server
    Server --> Cog
    Cog --> Local
    Local --> Algo
    Algo --> Ont & Topo & Cat
    Res --> Algo
    Cog -->|"anonymous coordinates only:<br/>no artist, title or genre"| Gem
    Gem -->|"ref + justification"| Verify
    Verify -->|"accepted"| Cog
    Verify -.->|"refused → baseline stands"| Local

    Cog -->|"resolve(artist + title)"| AM
    Cog -->|"resolve(query, token)"| SC
    AMToken -->|"Bearer"| AM
    SCAuth <-->|"code + PKCE verifier"| SC
    SCAuth -->|"httpOnly cookie"| MCPR

    Audio -->|"streamUrl"| AM
    Audio -->|"streamUrl"| SC

    classDef ext fill:#2a1f16,stroke:#8b6a3a,color:#f2efea
    classDef core fill:#161a1f,stroke:#4a5a6a,color:#f2efea
    classDef eng fill:#1a1614,stroke:#6a5a4a,color:#f2efea
    class Gem,AM,SC ext
    class Server,Cog,Local,Verify core
    class Ont,Topo,Algo,Res,Cat eng
```

### Request path for one transition

```mermaid
sequenceDiagram
    participant L as Listener
    participant C as DriftContext
    participant M as /api/mcp
    participant G as Gemini
    participant P as MusicKit / SoundCloud
    participant A as DriftAudioEngine

    L->>C: raises volume at 52% of the phase
    C->>C: fragilityAt(0.52) = 0.81 → exposed moment
    C->>C: collapse drag into one gesture (420ms settle)
    Note over C: signal recorded, not obeyed

    A-->>C: phase nearing its end
    C->>M: tools/call get_next_emotional_drift<br/>{history, signals, branches}
    M->>M: readResonance → mode=deepen, valence +0.87
    M->>M: nextPhase() → deterministic baseline
    M->>G: 10 anonymous candidates (c0…c9)<br/>axes + AVI + CSV only
    G-->>M: {ref: "c3", justification}
    M->>M: verify c3: shortlisted? admissible? seam ≤ 0.42
    alt verified
        M->>M: adopt c3, source = gemini-mcp
    else refused
        M->>M: keep baseline, record refusal reason
    end
    M->>P: resolve(artist + title) in parallel
    P-->>M: appleMusicId / soundcloudUrl / streamUrl
    M-->>C: phase + vector + field + fragility windows
    C->>A: driftTo(streamUrl, 6500ms)
    A->>A: equal-power crossfade, both lanes sounding
    C->>L: room colour transitions over 2400ms
```

---

## 2. The three ideas that make it not a music player

### Zero-genre ontology

A position in the substrate is seven axes, six of which are the engine's stated evaluation
metrics and one of which exists only to be pushed against:

| Axis | Meaning at 1.0 | Weight |
|---|---|---|
| `depth` | gravity that does not resolve | 1.60 |
| `fragility` | a voice audibly close to breaking | 1.50 |
| `warmth` | tape, wood, valve, body heat | 1.45 |
| `cinema` | implies a room, a lens, a weather | 1.35 |
| `narrative` | arrives somewhere it did not begin | 1.25 |
| `imperfection` | timing drift, breath, room noise | 1.20 |
| `insistence` | rhythm dominates the emotion — **adversarial** | 0.90 |

Two keys are derived from those axes, and they are the *only* things the cognitive core may
retrieve on:

- **Acoustic Vulnerability Index** — how much of the human survived production. Insistence
  suppresses it multiplicatively rather than subtractively, so a quantised loop can never
  read as vulnerable however sad its pad is.
- **Cinematic Space Vector** — `{depthOfField, decay, negativeSpace}`, the room implied.

The six strict rejections are predicates over acoustics, not tag blocklists, so an untagged
track nobody has heard is filtered on its emotional structure alone. Verified in
`scripts/verify-drift-engine.mjs`:

| Shape probed | Verdict | Rule that fired |
|---|---|---|
| festival EDM anthem | refused | `edm_drop_architecture` 0.83 |
| loop-based minimal techno | refused | `loop_minimal_techno` 0.59 |
| bright commercial house | refused | `bright_commercial_house` 0.72 |
| emotionless ambient | refused | `emotionless_ambient` 0.57 |
| rhythm-dominant experimental jazz | refused | `rhythm_dominant_jazz` 0.73 |
| Portishead / Massive Attack / St Germain / 16BL shapes | admitted | — |

### Emotional topography

Nine named coordinates on a plot whose x is warmth and y is emotional gravity. The
projection is honest — both axes are read off the substrate vector, so regions that look
close really are close in the music.

Selecting a pair computes the drift. The path **bows**: it interpolates on a smoothstep and
then adds a mid-arc dip into greater depth, wider cinema and lower insistence, because the
straight line between Deep Melancholy and Cinematic Warmth passes through something
shallower than either and the engine should not pretend otherwise.

`auditTopography()` asserts that no coordinate is a place the engine would itself refuse to
play. A destination that fails admissibility is a bug, not a mood.

### The drift algorithm

No next, no shuffle. A session advances only when a phase ends or the listener names a new
destination. Everything else they do is evidence.

| Implicit signal | Weight | Fragility-sensitive |
|---|---|---|
| `volume_raise` | +0.62 | yes — up to 2.3× |
| `volume_lower` | −0.50 | yes |
| `abandon` | −0.82, scaled by earliness | no |
| `seek_forward` | −0.58 | yes |
| `dwell_complete` | +0.55 | no |
| `seek_back` | +0.48 | yes |
| `stillness` | +0.24 | no |

Signals decay two ways: temporally (six-minute half-life) and **ordinally** (0.55 per step
back in the sequence). Ordinal decay is load-bearing — without it, five accumulated
positives out-mass one fresh abandonment and the engine cheerfully keeps deepening into a
room the listener is already leaving.

The reading maps to one of three behaviours:

- **deepen** — amplify the strongest axes of the current position, blended with the stated
  destination so that deepening changes *how* the drift travels rather than *whether* it
  arrives. Confidence sets how much of the current pattern is preserved, but even at full
  confidence a tenth of the aim still points where the listener said they were going. Strong
  resonance earns a richer, slower route — not an abandoned trip.
- **prune** — mark the region refused in branch memory and reroute to the furthest still-open
  neighbour. Leaving should feel like leaving.
- **explore** — hop to an adjacent region, split against the stated destination so
  exploration never abandons where the listener said they were going.

Two structural constraints keep an arc listenable:

- **Seam cap.** Consecutive positions further apart than 0.34 are heavily penalised; no
  crossfade would make that transition honest.
- **Radial fit.** A candidate is scored on whether its distance from the destination matches
  the *target's* intended distance. Without this, a high-resonance track wins phases it is
  pointing away from and the drift reads as going backwards. Measuring against the target
  rather than the destination keeps it compatible with the bow.

One further distinction is load-bearing: **the engine reasons about its own intended path, not
about the tracks that occupied it.** `get_next_emotional_drift` takes a `trajectory` of target
vectors alongside the `history` of track ids, and only the latter is used for exclusion.

This matters once a region runs thin. The catalog is noir-heavy, so a long drift toward warmth
eventually exhausts the warm positions and the engine must serve the nearest admissible track —
a cold one. Treating that compromise occupant as the new position let pool scarcity rewrite the
engine's intent, and an 18-phase drift toward Cinematic Warmth would climb to warmth 0.89 and
then collapse all the way back to 0.27. Aiming from intent instead holds the destination:
warmth now rises monotonically to 0.89 and stays there.

---

## 3. Gemini MCP integration

`/api/mcp` is a real Model Context Protocol server over JSON-RPC 2.0 — `initialize`,
`tools/list`, `tools/call`, `ping`, with notifications correctly answered by silence and a
202. The browser UI is simply one of its clients and holds no privileged access; point any
MCP host at the endpoint and the same four tools are available.

| Tool | Purpose |
|---|---|
| `get_next_emotional_drift` | Advance a session from its arc and implicit feedback |
| `plan_emotional_drift` | Compute a complete 5–7 phase arc between two coordinates |
| `describe_emotional_topography` | The map, with neighbours and the admissibility audit |
| `evaluate_emotional_resonance` | Score an arbitrary position, run the rejection rules |
| `generate_taste_expansion` | Search Apple Music near the listener's taste and admit ten new positions |
| `inspect_expansion_engine` | Offline self-test of projection, taste probes and generate-10 |

### The model is never told what the music is

Candidates reach Gemini as `c0`, `c1`, `c2` — substrate axes, AVI and Cinematic Space
Vector, and nothing else. No artist, no title, no album, no year, no genre. The ref → track
mapping never leaves `src/lib/mcp/cognition.ts`.

This is not obfuscation. A language model shown "Burial" reasons about dubstep, and one
shown "Massive Attack" reasons about trip-hop; withholding the names makes genre reasoning
*structurally impossible* rather than merely discouraged, and stops the engine inheriting
the popularity priors baked into the model's training data.

### Propose → verify → fall back

The contract is never inverted:

1. Local cognition computes a complete admissible answer **first**. This is the baseline, not
   an error path.
2. Gemini is asked to improve on it, choosing from the shortlist.
3. The proposal is verified — shortlisted ref, admissible under the rejection rules, and
   within the seam limit of the last position heard. An unverifiable proposal is discarded
   with a recorded reason, and the baseline stands.

The refusal reason is surfaced in the player, because an engine that silently reroutes
itself is indistinguishable from one that is broken.

---

## 4. Providers

Both integrations are real and both degrade rather than fail.

**Apple MusicKit** — ES256 developer tokens signed in-process with `node:crypto`, no JWT
dependency. Note `dsaEncoding: "ieee-p1363"`: Node emits DER signatures by default, which
every JOSE verifier rejects. Used strictly for catalog resolution; Apple's charts are never
consulted for *what* should play.

**SoundCloud OAuth 2.0** — Authorization Code with PKCE. The verifier and CSRF state are
short-lived httpOnly cookies; `state` is compared in constant time and a mismatch abandons
the flow before any token request. Tokens stay httpOnly and refresh server-side; the client
receives only public identity fields. The MCP transport reads the token from the cookie, never
from tool arguments, so an MCP client cannot inject someone else's session.

**Degradation.** Without a resolver a phase is `unresolved` — a first-class outcome. It still
colours the room, still exposes fragility windows, still collects implicit feedback and still
advances the arc on a compressed clock. The emotional structure is the product; the audio is
one rendering of it.

---

## 5. Design system (`/drift`)

Brutalist emotionalism, enforced structurally in `src/app/drift/drift.css` rather than
trusted to review:

```css
.sonic-drift, .sonic-drift *, .sonic-drift *::before, .sonic-drift *::after {
  border-radius: 0 !important;
  box-shadow: none !important;
  text-shadow: none !important;
  background-image: none !important;
}
```

`!important` is normally a smell. Here the ban *is* the specification — "0px border-radius on
every single element, no exceptions" — and a future component arriving with `rounded-sm` or a
Tailwind shadow utility must lose without anyone having to catch it in review.

- **Typography.** Poppins only, self-hosted via `next/font` (400/500/600). Every line box in
  the type scale is a multiple of 8, so text columns land on the same grid as the boxes.
- **Spacing.** Only even Tailwind steps are used — `2 4 6 8 10 12 16` = 8/16/24/32/40/48/64px.
  Odd steps are off-grid and never appear.
- **Surfaces.** Flat and opaque. Depth is expressed by 1px rules, never elevation; interaction
  by inverting ink and ground, never by a shadow or a scale transform.
- **The room.** `--field` is written by `RoomField` from the sounding position — warmth drives
  hue, depth drives descent toward black — and consumed as a flat `background-color` with a
  2400ms linear transition, slower than any track change so the room is always still catching
  up with the music.
- **No album artwork.** Packaging is exactly the skeuomorphic metadata the ontology exists to
  strip, and a photographic cover would smuggle a gradient onto a surface that forbids them.
  The room's colour is the artwork.

### Why they are separate surfaces

Three design systems live in this application and each contradicts the others. The original
RESONANT surface is liquid glass — backdrop blur, layered shadows, 22px corners. The drift
surface mandates the exact inverse: flat, zero radius, no imagery. The discover surface is
image-led, with soft corners and full-bleed artwork on warm paper.

Rather than delete working software or let contradictory systems fight over the same tokens,
each is scoped to its own root class — `.sonic-drift`, `.cosmos` — and they coexist. The
catalog is the only thing shared, and it crosses into the drift ontology through a documented
projection in `src/lib/drift/catalog.ts` that strips album, year, artwork and every other
conventional field.

---

## 6. Configuration

Everything is optional. With no environment at all the engine runs deterministic local
cognition over the de-genred catalog and every phase drifts silently.

```bash
# Cognitive core — without it, local cognition owns the drift
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash        # optional

# Apple MusicKit — catalog resolution and high-fidelity previews
APPLE_MUSIC_TEAM_ID=...
APPLE_MUSIC_KEY_ID=...
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_MUSIC_STOREFRONT=us            # optional, defaults to us

# SoundCloud OAuth 2.0 — identity and base audio
SOUNDCLOUD_CLIENT_ID=...
SOUNDCLOUD_CLIENT_SECRET=...
SOUNDCLOUD_REDIRECT_URI=...          # optional, derived from request origin
```

## 7. Verifying it

```bash
npm run dev
node scripts/verify-drift-engine.mjs     # drives /api/mcp end to end
```

The script asserts the MCP handshake and notification semantics, that all nine
coordinates pass admissibility, that each rejection rule fires on its canonical shape while
every anchor shape is admitted, that a planned arc respects the seam cap and bows through its
deepest point mid-arc, and that an eight-phase session with mixed feedback produces no repeats
and prunes a branch when the listener walks out.

The rest are regression guards for defects it caught: that a silent session never reaches high
conviction, that `deepen` keeps advancing toward the destination at every confidence level, and
that both a passive and an engaged listener reach the destination they named across eighteen
phases and hold it once there.

An unresolved phase completing is recorded as `stillness`, not `dwell_complete`. Crediting an
inaudible phase as a full dwell manufactures a stream of strong positives and pins the engine
in `deepen` for an entire session; stillness is the honest reading, and confidence after six
silent phases lands at 0.53 rather than 0.82.

The exclusion window sent to the engine is the last 24 positions rather than the whole
session. A drift has no end, so an unbounded history would grow the payload forever and
eventually exhaust the admissible pool, after which the engine could only repeat itself.

## 8. Source map

| Path | Contents |
|---|---|
| `src/lib/drift/ontology.ts` | Axes, AVI, Cinematic Space, rejection rules, anchors |
| `src/lib/drift/topography.ts` | Nine coordinates, adjacency, admissibility audit |
| `src/lib/drift/catalog.ts` | Seed projection, living catalog, fragility windows, emotional field |
| `src/lib/drift/expansion/` | Taste probes, Apple search, feature projection, generate-10 |
| `src/lib/drift/harvest.json` | Identity + media for Apple neighbours (vectors projected at load) |
| `src/lib/drift/resonance.ts` | Implicit feedback → valence, confidence, mode |
| `src/lib/drift/algorithm.ts` | Arc planning, selection scoring, redirection, next phase |
| `src/lib/mcp/server.ts` | Tool registry, JSON-RPC dispatch, engine status |
| `src/lib/mcp/cognition.ts` | Propose → verify → fall back, anonymisation |
| `src/lib/mcp/gemini.ts` | Structured-output client, never load-bearing |
| `src/lib/providers/` | MusicKit ES256, SoundCloud PKCE, resolution, session |
| `src/lib/audio/driftEngine.ts` | Two-lane equal-power crossfade, analyser, degradation |
| `src/context/DriftContext.tsx` | The arc as emotional vectors, signal ledger, branch memory |
| `src/components/drift/` | CognitivePlayer, EmotionalTopography, DriftArcRail, manifest |
| `src/app/drift/` | RSC page, Poppins layout, scoped design system |

---

## 9. The image-led surface

The primary surface at `/` inverts the drift surface's austerity: warm off-white paper, a
dense masonry of full-bleed album artwork, soft 10px corners, tight near-black display type,
and floating pill controls. Tokens are scoped under `.cosmos`.

### There were no images

The blocker was not design, it was data. The upstream catalog's `coverUrl` fields were
placeholders — 60 tracks shared 13 URLs between them, and 40 of those 60 returned 404. That
is survivable for a text-led interface and fatal for an image-led one.

`scripts/resolve-media.mjs` resolves the catalog against the **iTunes Search API**, which
needs no key, no OAuth and no developer account, and commits the result to
`src/lib/media/catalog-media.json`. Results:

| | |
|---|---|
| Real 1000px artwork | 64 / 65 positions |
| 30-second previews | 64 / 65 positions |
| Distinct dominant colours | 57 / 64 |
| Genuine misses | 1 (Hraach — *Resonance*, not on Apple Music) |

The previews matter more than the artwork. Before this, every phase was silent until someone
configured Apple MusicKit; now the app plays audio with **zero credentials**. MusicKit and
SoundCloud remain the high-fidelity paths, but the floor is no longer silence.

### Colours are extracted, not guessed

Dominant colours are computed locally with `sharp` at resolve time. Not in the browser,
because reading pixels from a remote sleeve needs CORS headers Apple does not always send, and
because colour search has to rank the whole catalog instantly rather than after 64 image
decodes.

`sharp.stats().dominant` is a poor search key on its own: it reports the most *frequent*
colour, which on a typical sleeve is the near-black or near-white background rather than the
colour a person would say the cover is. So the palette is quantised to a 32-level grid,
near-greyscale bins are discounted, and the winner is chosen on frequency weighted by
saturation and mid-lightness.

The distance metric matters as much as the extraction. Hue is compared on the circle and
discounted when either colour is too desaturated to meaningfully have one — but discounting
hue *alone* rewards greyscale for being unfalsifiable, since a colour with no hue is never
wrong about hue. Monochrome artwork consequently ranked near the top of every colour search.
Chroma mismatch is therefore its own heavily-weighted term: for a deep-blue query, a near-grey
navy moved from 0.097 to 0.349.

Search **ranks rather than filters**. A hard threshold on an unusual hue returns an empty
grid, which reads as a broken feature rather than an honest "nothing is quite this colour,
here is what is closest".

### Letterboxed sleeves

A fair amount of Apple artwork is a non-square photograph padded to square with solid bars —
Slint's *Spiderland* measures luminance 0–2 in its outer rows against 131–195 through the
middle. Cropping that into a tall tile keeps the bars, so correct `object-fit: cover`
rendering looks like a broken image.

The resolver detects it by comparing the outer rows against the centre, requiring both edges
to be near-uniform, extreme, *and* materially different from the picture, so a genuinely dark
sleeve is not misread. 7 of 64 are letterboxed and render at 1:1, where the bars are simply
part of the cover the label shipped.

### Nothing on these pages is invented

- **Collections** are regions of the emotional topography. Membership is by proximity to a
  region's centre, so a position can appear in two neighbouring collections — which is true
  of the music.
- **Curators** are the engine's aesthetic anchors, listing the positions for which each is the
  nearest anchor. There are no fabricated follower counts and no invented avatars: an anchor's
  identity mark is a mosaic of the sleeves it calibrates.
- **Text search** covers artist, title, album, region and the engine's own description of
  emotional shape. There is no genre index, so "fragile" and "wide room" are first-class
  queries in a way that "deep house" deliberately is not.

### The engine is still the brain

Tapping a sleeve does not enqueue it — it starts a drift from there, and
`get_next_emotional_drift` chooses what follows from implicit feedback. There is still no next
button. The level slider remains a genuine *input* to the engine, and the now-playing sheet
draws the vocal fragility windows onto the timeline so the listener can see when a gesture
counts for more, rather than being measured in secret.

One correction the visual surface forced: an unresolved phase completing is recorded as
`stillness`, not `dwell_complete`. Crediting an inaudible phase as a full dwell manufactured a
stream of strong positives and pinned the engine in `deepen`.

### Regenerating media

```bash
npm run resolve:media              # resolve anything missing
node scripts/resolve-media.mjs --recolor   # re-analyse colours only, no API calls
node scripts/resolve-media.mjs --force     # re-resolve everything
```

The public endpoint rate-limits hard. Throttled requests are left absent rather than recorded
as misses, so a re-run retries them — an earlier version conflated the two and permanently
marked 29 tracks as having no artwork, including several verified by hand to resolve fine.

---

## 10. The living catalog

The authored seed (legacy projection + five warm-house anchors) is a calibration set, not
the database. Apple Music is treated as a retrieval index: the engine searches for *artists
already near the listener's taste*, never for a genre and never for a chart.

Each hit is projected onto the seven axes from two signals only:

1. **Neighborhood** — the substrate position of the artist (or the aesthetic anchor) that
   justified the search. A Portishead-adjacent probe starts near Portishead.
2. **Audio features** — loudness, silence, spectrum, onset density, read from the 30-second
   preview when ffmpeg is available. Optional. Vercel does not ship ffmpeg, so generate-10
   must succeed from neighborhood alone.

The rejection rules are a hard gate. What survives is ingested into the living catalog with
artwork and a preview, and becomes a first-class occupant of the topography — searchable,
collectable, and available to the drift.

`generate_taste_expansion` is the listener-facing move: ten new positions, artist-diverse,
on demand. `npm run harvest:catalog` does the same offline for the committed harvest file.
Vectors are never stored in that file; they are projected at load so an ontology change
re-admits the same recordings without another network pass.
