# Neuform Design Skills — Implementation Record

All **71** skills from the Neuform library are implemented as a design-intelligence layer.
Effects are mapped to appropriate routes and components rather than stacked on every screen.

> Generated from `src/design/skills.ts` — run `npm run docs:design` to refresh.

## Coverage

| Category      | Skills |
| ------------- | -----: |
| Design System |     28 |
| WebGL         |     14 |
| Style         |     10 |
| Animation     |      6 |
| Layout        |      5 |
| 3D            |      3 |
| Icon          |      2 |
| Asset         |      1 |
| Shadow        |      1 |
| Three.js      |      1 |
| **Total**     | **71** |

## Skills per route

| Route     | Skills applied |
| --------- | -------------: |
| `/design` |             71 |
| `/`       |             13 |
| `/ask`    |              9 |

`/design` is the gallery: it demonstrates the full library. Product surfaces receive a curated subset.

## Index

|   # | Skill                                                                                                                    | Category      | Routes               | Component                                         | Status      |
| --: | ------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------- | ------------------------------------------------- | ----------- |
|   1 | [Border Gradients](https://neuform.ai/skill/css-border-gradient)                                                         | Style         | `/` `/ask` `/design` | `<GradientBorder /> · .nf-border-gradient`        | implemented |
|   2 | [Masked Reveal](https://neuform.ai/skill/masked-reveal)                                                                  | Animation     | `/` `/design`        | `<MaskedReveal />`                                | implemented |
|   3 | [Aura Asset Images](https://neuform.ai/skill/aura-asset-images)                                                          | Asset         | `/design`            | `<AuraAsset seed=… />`                            | adapted     |
|   4 | [Framed Grid Layout](https://neuform.ai/skill/framed-grid-layout)                                                        | Layout        | `/design`            | `<FramedGrid />`                                  | implemented |
|   5 | [Container Lines](https://neuform.ai/skill/container-lines)                                                              | Layout        | `/` `/design`        | `<ContainerLines />`                              | implemented |
|   6 | [GSAP Motion](https://neuform.ai/skill/gsap)                                                                             | Animation     | `/design`            | `<Timeline /> (useTimeline hook)`                 | adapted     |
|   7 | [Beautiful Shadows](https://neuform.ai/skill/beautiful-shadows)                                                          | Shadow        | `/` `/ask` `/design` | `.nf-shadow-{1..4}`                               | implemented |
|   8 | [Skeuomorphic UI](https://neuform.ai/skill/skeuomorphic-ui)                                                              | Style         | `/design`            | `.nf-skeuo`                                       | implemented |
|   9 | [Dither Background](https://neuform.ai/skill/dither-background)                                                          | Style         | `/design`            | `.nf-dither`                                      | implemented |
|  10 | [WebGL Laser](https://neuform.ai/skill/webgl-laser)                                                                      | WebGL         | `/design`            | `<ShaderCanvas variant="laser" />`                | implemented |
|  11 | [Mesh Gradient Dark Blue Clean](https://neuform.ai/skill/mesh-gradient-dark-blue-clean)                                  | Design System | `/design`            | `<ThemeScope preset="mesh-dark-blue" />`          | implemented |
|  12 | [Clean Minimal Beige Light Mode](https://neuform.ai/skill/clean-minimal-beige-light-mode)                                | Design System | `/design`            | `<ThemeScope preset="beige-light" />`             | implemented |
|  13 | [Glass Dark Mode Clock](https://neuform.ai/skill/glass-dark-mode-clock)                                                  | Design System | `/design`            | `<ThemeScope preset="glass-clock" />`             | implemented |
|  14 | [Agency Grid Layout Minimal](https://neuform.ai/skill/agency-grid-layout-minimal)                                        | Design System | `/design`            | `<ThemeScope preset="agency-minimal" />`          | implemented |
|  15 | [WebGL 3D Object](https://neuform.ai/skill/webgl-3d-object)                                                              | 3D            | `/design`            | `<ShaderCanvas variant="object3d" />`             | implemented |
|  16 | [High Contrast Skeuomorphic Clean](https://neuform.ai/skill/high-contrast-skeuomorphic-clean)                            | Design System | `/design`            | `<ThemeScope preset="skeuo-contrast" />`          | implemented |
|  17 | [Background Grid WebGL](https://neuform.ai/skill/background-grid-webgl)                                                  | Layout        | `/design`            | `<ShaderCanvas variant="grid-perspective" />`     | implemented |
|  18 | [Editorial Tech](https://neuform.ai/skill/editorial-tech)                                                                | Design System | `/design`            | `<ThemeScope preset="editorial-tech" />`          | implemented |
|  19 | [Orange Clean Paper SaaS](https://neuform.ai/skill/orange-clean-paper-saas)                                              | Design System | `/design`            | `<ThemeScope preset="orange-paper" />`            | implemented |
|  20 | [Light Mode Paper Technical](https://neuform.ai/skill/light-mode-paper-technical)                                        | Design System | `/design`            | `<ThemeScope preset="paper-technical" />`         | implemented |
|  21 | [Company Logos](https://neuform.ai/skill/company-logos)                                                                  | Icon          | `/design`            | `<BrandLogo name=… size={64} />`                  | implemented |
|  22 | [Image First Grid Layout](https://neuform.ai/skill/image-first-grid-layout)                                              | Design System | `/design`            | `<ThemeScope preset="image-first" />`             | implemented |
|  23 | [Technical Framed Grid Design System](https://neuform.ai/skill/technical-framed-grid-design-system-tzckhr)               | Design System | `/design`            | `<ThemeScope preset="technical-framed" />`        | implemented |
|  24 | [Fade in, slide in, blur in animation](https://neuform.ai/skill/atmospheric-blur-slide-entrance-system-cblgqz)           | Design System | `/` `/ask` `/design` | `<Reveal variant='blur' \| 'slide' \| 'fade' />`  | implemented |
|  25 | [Corner Diagonals](https://neuform.ai/skill/corner-diagonals)                                                            | Layout        | `/ask` `/design`     | `<CornerDiagonals />`                             | implemented |
|  26 | [Nested Container Clean Agency](https://neuform.ai/skill/nested-container-clean-agency)                                  | Design System | `/design`            | `<ThemeScope preset="nested-agency" />`           | implemented |
|  27 | [Technical Terminal & WebGL Grid System](https://neuform.ai/skill/technical-terminal-and-webgl-grid-system-v9lmbm)       | Design System | `/ask` `/design`     | `<ThemeScope preset="terminal-grid" />`           | implemented |
|  28 | [Globe Particles](https://neuform.ai/skill/globe-particles)                                                              | 3D            | `/design`            | `<ShaderCanvas variant="globe-particles" />`      | implemented |
|  29 | [Split Layout Technical](https://neuform.ai/skill/split-layout-technical)                                                | Design System | `/design`            | `<ThemeScope preset="split-technical" />`         | implemented |
|  30 | [Nested Container Frames](https://neuform.ai/skill/nested-container-frames)                                              | Layout        | `/design`            | `<NestedFrames depth={3} />`                      | implemented |
|  31 | [Solar Duotone Bold](https://neuform.ai/skill/solar-duotone-bold)                                                        | Icon          | `/design`            | `<DuotoneIcon name=… />`                          | implemented |
|  32 | [Stepped Neon V-Curve Glass System](https://neuform.ai/skill/stepped-neon-v-curve-glass-system-xy0g97)                   | Design System | `/design`            | `<ThemeScope preset="neon-v-curve" />`            | implemented |
|  33 | [Progressive Blur](https://neuform.ai/skill/progressive-blur)                                                            | Style         | `/` `/ask` `/design` | `<ProgressiveBlur edge=… />`                      | implemented |
|  34 | [Marquee](https://neuform.ai/skill/marquee-loop)                                                                         | Animation     | `/` `/design`        | `<Marquee speed=… />`                             | implemented |
|  35 | [Blue Cloudy Clean Modern](https://neuform.ai/skill/blue-cloudy-clean-modern)                                            | Design System | `/design`            | `<ThemeScope preset="blue-cloudy" />`             | implemented |
|  36 | [Premium Gradient Border System](https://neuform.ai/skill/premium-gradient-border-system-6skdcm)                         | Style         | `/ask` `/design`     | `<GradientBorder tone='premium' animated />`      | implemented |
|  37 | [Technical Wireframe Info Layout](https://neuform.ai/skill/technical-wireframe-info-layout)                              | Design System | `/design`            | `<ThemeScope preset="wireframe-info" />`          | implemented |
|  38 | [Magic Rings Telemetry Aesthetic](https://neuform.ai/skill/magic-rings-telemetry-aesthetic-1nwy1l)                       | WebGL         | `/design`            | `<ShaderCanvas variant="magic-rings" />`          | implemented |
|  39 | [Corner Lasers](https://neuform.ai/skill/corner-lasers)                                                                  | WebGL         | `/design`            | `<ShaderCanvas variant="corner-lasers" />`        | implemented |
|  40 | [Aura 3D Network System](https://neuform.ai/skill/aura-3d-network-system-i4oa3n)                                         | Style         | `/design`            | `<ShaderCanvas variant="aura-network" />`         | implemented |
|  41 | [Technical WebGL Fluid Nebula Background](https://neuform.ai/skill/technical-webgl-fluid-nebula-background-2zdue1)       | WebGL         | `/` `/design`        | `<ShaderCanvas variant="nebula" />`               | implemented |
|  42 | [Cursor-Reactive Flashlight Glow Border](https://neuform.ai/skill/cursor-reactive-flashlight-glow-border-xa9a9z)         | Design System | `/ask` `/design`     | `<FlashlightBorder />`                            | implemented |
|  43 | [Interactive Border Gradient Glow](https://neuform.ai/skill/interactive-border-gradient-glow-wnu6m4)                     | Design System | `/ask` `/design`     | `<GradientBorder interactive />`                  | implemented |
|  44 | [Atmospheric Ambient Ray & Particle System](https://neuform.ai/skill/atmospheric-ambient-ray-and-particle-system-3yx90f) | Animation     | `/` `/design`        | `<AmbientRays density=… />`                       | implemented |
|  45 | [Industrial WebGL Minimalist System](https://neuform.ai/skill/industrial-webgl-minimalist-system-v9b1kp)                 | Design System | `/design`            | `<ThemeScope preset="industrial-minimal" />`      | implemented |
|  46 | [3D Perspective Scroll Dashboard](https://neuform.ai/skill/3d-perspective-scroll-dashboard-0hq031)                       | Design System | `/design`            | `<PerspectiveDeck />`                             | implemented |
|  47 | [Procedural Mesh Network Background](https://neuform.ai/skill/procedural-mesh-network-background-txudfu)                 | WebGL         | `/design`            | `<ShaderCanvas variant="mesh-network" />`         | implemented |
|  48 | [Aura Isometric 3D Visualization System](https://neuform.ai/skill/aura-isometric-3d-visualization-system-i4nez9)         | Three.js      | `/design`            | `<ShaderCanvas variant="isometric-aura" />`       | implemented |
|  49 | [Dither Laser Dark Mode](https://neuform.ai/skill/dither-laser-dark-mode)                                                | Design System | `/design`            | `<ThemeScope preset="dither-laser" />`            | implemented |
|  50 | [Atmospheric Grain WebGL Background](https://neuform.ai/skill/atmospheric-grain-webgl-background-y6jnkl)                 | WebGL         | `/` `/design`        | `<ShaderCanvas variant="grain" />`                | implemented |
|  51 | [Atmospheric Procedural WebGL Background](https://neuform.ai/skill/atmospheric-procedural-webgl-background-2zumzs)       | WebGL         | `/design`            | `<ShaderCanvas variant="procedural" />`           | implemented |
|  52 | [GSAP ScrollTrigger Storytelling](https://neuform.ai/skill/gsap-scrolltrigger-storytelling)                              | Animation     | `/design`            | `<ScrollStory steps=… />`                         | adapted     |
|  53 | [Number Details](https://neuform.ai/skill/number-details)                                                                | Style         | `/` `/design`        | `<NumberDetail value='01' />`                     | implemented |
|  54 | [D3 Interactive Point-Cloud Globe](https://neuform.ai/skill/d3-interactive-point-cloud-globe-3zkwpn)                     | Animation     | `/design`            | `<ShaderCanvas variant="globe-pointcloud" />`     | implemented |
|  55 | [Technical ASCII Particle Field](https://neuform.ai/skill/technical-ascii-particle-field-2zi2vw)                         | WebGL         | `/design`            | `<ShaderCanvas variant="ascii-field" />`          | implemented |
|  56 | [Cyber-Trail WebGL Background System](https://neuform.ai/skill/cyber-trail-webgl-background-system-vdwsx2)               | WebGL         | `/design`            | `<ShaderCanvas variant="cyber-trail" />`          | implemented |
|  57 | [Atmospheric Meditative Dark System](https://neuform.ai/skill/atmospheric-meditative-dark-system-wr0bj8)                 | Design System | `/` `/design`        | `<ThemeScope preset="meditative-dark" />`         | implemented |
|  58 | [Atmospheric Laser & WebGL Design System](https://neuform.ai/skill/atmospheric-laser-and-webgl-design-system-8ljti2)     | Design System | `/design`            | `<ThemeScope preset="laser-atmosphere" />`        | implemented |
|  59 | [Technical Shader Surface (WebGL)](https://neuform.ai/skill/technical-shader-surface-webgl-2zrur1)                       | WebGL         | `/design`            | `<ShaderCanvas variant="shader-surface" />`       | implemented |
|  60 | [Atmospheric Topographic WebGL](https://neuform.ai/skill/atmospheric-topographic-webgl-u55nmy)                           | WebGL         | `/design`            | `<ShaderCanvas variant="topographic" />`          | implemented |
|  61 | [Isometric Spatial 3D System](https://neuform.ai/skill/isometric-spatial-3d-system-i58999)                               | 3D            | `/design`            | `<ShaderCanvas variant="isometric-spatial" />`    | implemented |
|  62 | [Atmospheric Technical Design System](https://neuform.ai/skill/atmospheric-technical-design-system-u1ciwi)               | Design System | `/design`            | `<ThemeScope preset="atmospheric-technical" />`   | implemented |
|  63 | [Cyber Kinetic Background Field](https://neuform.ai/skill/cyber-kinetic-background-field-3yguj9)                         | Design System | `/design`            | `<ThemeScope preset="cyber-kinetic" />`           | implemented |
|  64 | [Gooey Blob System](https://neuform.ai/skill/gooey-blob-system)                                                          | Style         | `/design`            | `<GooeyBlobs />`                                  | implemented |
|  65 | [Technical Tactical Globe UI](https://neuform.ai/skill/technical-tactical-globe-ui-3zjv9a)                               | Style         | `/design`            | `<ShaderCanvas variant="tactical-globe" />`       | implemented |
|  66 | [Atmospheric WebGL Field System](https://neuform.ai/skill/atmospheric-webgl-field-system-8lvtag)                         | Style         | `/` `/design`        | `<ShaderCanvas variant="field-system" />`         | implemented |
|  67 | [Organic Aetherial WebGL Background](https://neuform.ai/skill/organic-aetherial-webgl-background-316jwq)                 | WebGL         | `/design`            | `<ShaderCanvas variant="aetherial" />`            | implemented |
|  68 | [Book Serif Index](https://neuform.ai/skill/book-serif-index)                                                            | Design System | `/design`            | `<ThemeScope preset="book-serif" />`              | implemented |
|  69 | [Kinetic Radial Sculpture System](https://neuform.ai/skill/kinetic-radial-sculpture-system-0gv4e7)                       | Design System | `/design`            | `<ThemeScope preset="kinetic-radial" />`          | implemented |
|  70 | [Chromatic Dispersion WebGL System](https://neuform.ai/skill/chromatic-dispersion-webgl-system-40mkq2)                   | WebGL         | `/design`            | `<ShaderCanvas variant="chromatic-dispersion" />` | implemented |
|  71 | [Grainy Stepped Gradient Noise](https://neuform.ai/skill/grainy-stepped-gradient-noise-trdra9)                           | WebGL         | `/design`            | `<ShaderCanvas variant="stepped-noise" />`        | implemented |

## Implementation records

### Style

#### 1. Border Gradients

- **Skill:** [`css-border-gradient`](https://neuform.ai/skill/css-border-gradient)
- **Route:** `/`, `/ask`, `/design`
- **Component:** `<GradientBorder /> · .nf-border-gradient`
- **Purpose:** Gradient-stroked container edges that read as light catching a bevel, used on hero and answer cards.
- **Mobile adaptation:** Border width drops to 1px and the gradient shortens so it stays visible on small cards.
- **RTL adaptation:** Gradient angle is derived from --nf-dir so the highlight always enters from the reading edge.
- **Performance strategy:** Single element using border-image / mask compositing — no extra DOM, no paint loop.
- **Accessibility strategy:** Decorative only; never the sole indicator of state, and focus rings sit above it.
- **Source files:** `src/app/neuform.css`, `src/components/neuform/surfaces.tsx`
- **Status:** implemented

#### 8. Skeuomorphic UI

- **Skill:** [`skeuomorphic-ui`](https://neuform.ai/skill/skeuomorphic-ui)
- **Route:** `/design`
- **Component:** `.nf-skeuo`
- **Purpose:** Physical controls with inner bevels, specular highlights and pressed states.
- **Mobile adaptation:** Larger hit areas (44px) with the same bevel treatment.
- **RTL adaptation:** Bevel is vertical; unaffected by direction.
- **Performance strategy:** Inset box-shadows and gradients only.
- **Accessibility strategy:** Pressed state is mirrored with aria-pressed, not just visually.
- **Source files:** `src/app/neuform.css`, `src/components/neuform/surfaces.tsx`
- **Status:** implemented

#### 9. Dither Background

- **Skill:** [`dither-background`](https://neuform.ai/skill/dither-background)
- **Route:** `/design`
- **Component:** `.nf-dither`
- **Purpose:** Ordered-dither texture that breaks up flat gradients with a retro print feel.
- **Mobile adaptation:** Larger dither cell so the pattern stays legible at high DPR.
- **RTL adaptation:** Symmetric pattern.
- **Performance strategy:** One inline SVG/CSS pattern reused via background-image; no canvas.
- **Accessibility strategy:** Decorative; contrast of foreground text is checked against the darkest cell.
- **Source files:** `src/app/neuform.css`
- **Status:** implemented

#### 33. Progressive Blur

- **Skill:** [`progressive-blur`](https://neuform.ai/skill/progressive-blur)
- **Route:** `/`, `/ask`, `/design`
- **Component:** `<ProgressiveBlur edge=… />`
- **Purpose:** Layered edge blur that fades content into the chrome instead of cutting it off.
- **Mobile adaptation:** Three blur layers instead of five to limit backdrop-filter cost.
- **RTL adaptation:** Edge prop accepts logical values (start/end) and resolves per direction.
- **Performance strategy:** Stacked backdrop-filter layers with masked opacity; disabled automatically when backdrop-filter is unsupported.
- **Accessibility strategy:** Text never sits inside the blurred band, so contrast is unaffected.
- **Source files:** `src/components/neuform/surfaces.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 36. Premium Gradient Border System

- **Skill:** [`premium-gradient-border-system-6skdcm`](https://neuform.ai/skill/premium-gradient-border-system-6skdcm)
- **Route:** `/ask`, `/design`
- **Component:** `<GradientBorder tone='premium' animated />`
- **Purpose:** A full border system: idle, hover and active gradient strokes with a conic sweep.
- **Mobile adaptation:** Animation disabled; static premium stroke retained.
- **RTL adaptation:** Conic sweep start angle derives from --nf-dir.
- **Performance strategy:** Animates one CSS custom property via @property, compositor-friendly.
- **Accessibility strategy:** Border state always pairs with a non-colour cue (label or icon).
- **Source files:** `src/components/neuform/surfaces.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 40. Aura 3D Network System

- **Skill:** [`aura-3d-network-system-i4oa3n`](https://neuform.ai/skill/aura-3d-network-system-i4oa3n)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="aura-network" />`
- **Purpose:** A luminous node-and-edge network drifting in depth, used as an intelligence motif.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 53. Number Details

- **Skill:** [`number-details`](https://neuform.ai/skill/number-details)
- **Route:** `/`, `/design`
- **Component:** `<NumberDetail value='01' />`
- **Purpose:** Decorative zero-padded index numerals (01, 02…) that give sections technical rhythm.
- **Mobile adaptation:** Numerals shrink but keep tabular alignment.
- **RTL adaptation:** Rendered with an isolation wrapper so Latin numerals stay LTR inside RTL text.
- **Performance strategy:** Text node with a tabular-nums font feature; nothing else.
- **Accessibility strategy:** aria-hidden when purely decorative so counts are not announced twice.
- **Source files:** `src/components/neuform/primitives.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 64. Gooey Blob System

- **Skill:** [`gooey-blob-system`](https://neuform.ai/skill/gooey-blob-system)
- **Route:** `/design`
- **Component:** `<GooeyBlobs />`
- **Purpose:** Metaball blobs that merge and separate for an organic, liquid background.
- **Mobile adaptation:** Blob count drops to three and the filter radius shrinks.
- **RTL adaptation:** Organic and symmetric; no mirroring required.
- **Performance strategy:** SVG goo filter over CSS-animated circles, isolated in its own stacking context to limit repaint area.
- **Accessibility strategy:** aria-hidden; removed entirely under reduced motion.
- **Source files:** `src/components/neuform/surfaces.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 65. Technical Tactical Globe UI

- **Skill:** [`technical-tactical-globe-ui-3zjv9a`](https://neuform.ai/skill/technical-tactical-globe-ui-3zjv9a)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="tactical-globe" />`
- **Purpose:** Wireframe tactical globe with graticule, scan sweep and target reticles.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 66. Atmospheric WebGL Field System

- **Skill:** [`atmospheric-webgl-field-system-8lvtag`](https://neuform.ai/skill/atmospheric-webgl-field-system-8lvtag)
- **Route:** `/`, `/design`
- **Component:** `<ShaderCanvas variant="field-system" />`
- **Purpose:** A slow vector field of drifting filaments that gives depth without distraction.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

### Animation

#### 2. Masked Reveal

- **Skill:** [`masked-reveal`](https://neuform.ai/skill/masked-reveal)
- **Route:** `/`, `/design`
- **Component:** `<MaskedReveal />`
- **Purpose:** Headlines and artwork wipe in behind a moving mask instead of a plain fade.
- **Mobile adaptation:** Shorter travel distance and duration so the reveal completes within the first viewport.
- **RTL adaptation:** Mask travels from the inline-start edge, mirroring automatically in RTL.
- **Performance strategy:** Composited mask-position/transform only; runs once via IntersectionObserver.
- **Accessibility strategy:** Content is present in the DOM from the start; reduced motion renders it instantly.
- **Source files:** `src/components/neuform/motion.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 6. GSAP Motion

- **Skill:** [`gsap`](https://neuform.ai/skill/gsap)
- **Route:** `/design`
- **Component:** `<Timeline /> (useTimeline hook)`
- **Purpose:** Sequenced, overlapping entrance choreography rather than independent CSS delays.
- **Mobile adaptation:** Stagger shrinks and total duration is clamped so sequences finish quickly.
- **RTL adaptation:** Directional offsets are sign-flipped from the document direction.
- **Performance strategy:** Implemented on the Web Animations API instead of shipping GSAP — same timeline semantics, no extra bundle.
- **Accessibility strategy:** Timelines are skipped entirely under prefers-reduced-motion.
- **Source files:** `src/components/neuform/motion.tsx`
- **Status:** adapted
- **Deviation:** GSAP is replaced by a small Web Animations API timeline with the same stagger/overlap model to avoid a large dependency in a client bundle.

#### 34. Marquee

- **Skill:** [`marquee-loop`](https://neuform.ai/skill/marquee-loop)
- **Route:** `/`, `/design`
- **Component:** `<Marquee speed=… />`
- **Purpose:** Seamless infinite ticker built from duplicated content for continuous motion.
- **Mobile adaptation:** Speed reduced and content duplicated twice instead of three times.
- **RTL adaptation:** Scroll direction flips with document direction.
- **Performance strategy:** Single transform animation on a duplicated track; paused when offscreen.
- **Accessibility strategy:** Duplicated copy is aria-hidden, the track pauses on hover/focus, and motion is disabled under reduced-motion.
- **Source files:** `src/components/neuform/motion.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 44. Atmospheric Ambient Ray & Particle System

- **Skill:** [`atmospheric-ambient-ray-and-particle-system-3yx90f`](https://neuform.ai/skill/atmospheric-ambient-ray-and-particle-system-3yx90f)
- **Route:** `/`, `/design`
- **Component:** `<AmbientRays density=… />`
- **Purpose:** Drifting light rays and dust that give a static page a sense of air.
- **Mobile adaptation:** Particle count scales with viewport area and caps at 24.
- **RTL adaptation:** Drift direction follows --nf-dir.
- **Performance strategy:** CSS-animated DOM particles (no canvas), count derived from viewport, paused when offscreen.
- **Accessibility strategy:** aria-hidden; fully removed under prefers-reduced-motion.
- **Source files:** `src/components/neuform/motion.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 52. GSAP ScrollTrigger Storytelling

- **Skill:** [`gsap-scrolltrigger-storytelling`](https://neuform.ai/skill/gsap-scrolltrigger-storytelling)
- **Route:** `/design`
- **Component:** `<ScrollStory steps=… />`
- **Purpose:** Scroll-linked narrative where each step pins, plays and hands off to the next.
- **Mobile adaptation:** Pinning disabled; steps become a simple stacked sequence.
- **RTL adaptation:** Horizontal step motion mirrors with direction.
- **Performance strategy:** Driven by IntersectionObserver thresholds rather than a scroll handler, so it never blocks the main thread.
- **Accessibility strategy:** All steps remain in the DOM and reachable; reduced motion turns it into a plain list.
- **Source files:** `src/components/neuform/motion.tsx`
- **Status:** adapted
- **Deviation:** ScrollTrigger behaviour reproduced with IntersectionObserver to avoid bundling GSAP.

#### 54. D3 Interactive Point-Cloud Globe

- **Skill:** [`d3-interactive-point-cloud-globe-3zkwpn`](https://neuform.ai/skill/d3-interactive-point-cloud-globe-3zkwpn)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="globe-pointcloud" />`
- **Purpose:** Interactive point-cloud globe that responds to pointer drag with inertial spin.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Projection and point cloud are computed in a shader with pointer-driven uniforms instead of D3 + SVG, which keeps 60fps with thousands of points.

### Asset

#### 3. Aura Asset Images

- **Skill:** [`aura-asset-images`](https://neuform.ai/skill/aura-asset-images)
- **Route:** `/design`
- **Component:** `<AuraAsset seed=… />`
- **Purpose:** Atmospheric abstract imagery for empty states and covers, searchable by seed keyword.
- **Mobile adaptation:** Renders at container size with a capped pixel budget; no large downloads.
- **RTL adaptation:** Non-textual imagery; layout slot uses logical margins.
- **Performance strategy:** Generated locally as a deterministic CSS mesh gradient — zero network requests and no layout shift.
- **Accessibility strategy:** Decorative by default (empty alt); accepts an alt prop when meaningful.
- **Source files:** `src/components/neuform/surfaces.tsx`
- **Status:** adapted
- **Deviation:** The hosted Aura asset search is not reachable from this app, so assets are generated deterministically from the seed with the same visual intent. The provider call is isolated behind one function for a later swap.

### Layout

#### 4. Framed Grid Layout

- **Skill:** [`framed-grid-layout`](https://neuform.ai/skill/framed-grid-layout)
- **Route:** `/design`
- **Component:** `<FramedGrid />`
- **Purpose:** Content sits inside a visible hairline frame with ruled cells, like a spec sheet.
- **Mobile adaptation:** Collapses from 3 columns to 1 with the frame preserved.
- **RTL adaptation:** Uses CSS logical borders so the frame reads correctly in both directions.
- **Performance strategy:** Pure grid + border rendering, no JS.
- **Accessibility strategy:** Frame is presentational; grid cells keep semantic order for screen readers.
- **Source files:** `src/components/neuform/primitives.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 5. Container Lines

- **Skill:** [`container-lines`](https://neuform.ai/skill/container-lines)
- **Route:** `/`, `/design`
- **Component:** `<ContainerLines />`
- **Purpose:** Vertical container-edge rules with mini corner squares that expose the layout grid as decoration.
- **Mobile adaptation:** Lines hide below 640px where the container is already full-bleed.
- **RTL adaptation:** Corner markers mirror via logical inset properties.
- **Performance strategy:** Two absolutely-positioned 1px elements; no observers.
- **Accessibility strategy:** aria-hidden; contributes no reading order.
- **Source files:** `src/components/neuform/primitives.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 17. Background Grid WebGL

- **Skill:** [`background-grid-webgl`](https://neuform.ai/skill/background-grid-webgl)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="grid-perspective" />`
- **Purpose:** Perspective grid receding to the horizon with lines fading into fog.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 25. Corner Diagonals

- **Skill:** [`corner-diagonals`](https://neuform.ai/skill/corner-diagonals)
- **Route:** `/ask`, `/design`
- **Component:** `<CornerDiagonals />`
- **Purpose:** Diagonal notches at container corners that signal a technical, engineered frame.
- **Mobile adaptation:** Notch length halves below 640px.
- **RTL adaptation:** Corner set mirrors so the emphasised corner stays on the reading edge.
- **Performance strategy:** Four 1px pseudo-elements; no JS.
- **Accessibility strategy:** aria-hidden decoration.
- **Source files:** `src/components/neuform/primitives.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 30. Nested Container Frames

- **Skill:** [`nested-container-frames`](https://neuform.ai/skill/nested-container-frames)
- **Route:** `/design`
- **Component:** `<NestedFrames depth={3} />`
- **Purpose:** Concentric hairline frames that build hierarchy without heavy dividers.
- **Mobile adaptation:** Depth clamps to 2 to preserve inner content width.
- **RTL adaptation:** Symmetric insets; direction-neutral.
- **Performance strategy:** Nested divs with border and padding only.
- **Accessibility strategy:** Frames are presentational; inner content keeps its own landmarks.
- **Source files:** `src/components/neuform/primitives.tsx`, `src/app/neuform.css`
- **Status:** implemented

### Shadow

#### 7. Beautiful Shadows

- **Skill:** [`beautiful-shadows`](https://neuform.ai/skill/beautiful-shadows)
- **Route:** `/`, `/ask`, `/design`
- **Component:** `.nf-shadow-{1..4}`
- **Purpose:** Layered multi-stop shadows that imply real light falloff instead of one blurry box.
- **Mobile adaptation:** Lower tiers used on small screens to keep paint cost down.
- **RTL adaptation:** Light source is neutral (top-down) so shadows need no mirroring.
- **Performance strategy:** Static box-shadow tokens; no filter or blur passes.
- **Accessibility strategy:** Never used to convey state; contrast is carried by borders and text.
- **Source files:** `src/app/neuform.css`
- **Status:** implemented

### WebGL

#### 10. WebGL Laser

- **Skill:** [`webgl-laser`](https://neuform.ai/skill/webgl-laser)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="laser" />`
- **Purpose:** Thin volumetric beams sweeping through the backdrop for a charged, technical mood.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 38. Magic Rings Telemetry Aesthetic

- **Skill:** [`magic-rings-telemetry-aesthetic-1nwy1l`](https://neuform.ai/skill/magic-rings-telemetry-aesthetic-1nwy1l)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="magic-rings" />`
- **Purpose:** Concentric telemetry rings that pulse and scan like an instrument readout.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 39. Corner Lasers

- **Skill:** [`corner-lasers`](https://neuform.ai/skill/corner-lasers)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="corner-lasers" />`
- **Purpose:** Thin beams anchored to the corners, converging as a framing device.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 41. Technical WebGL Fluid Nebula Background

- **Skill:** [`technical-webgl-fluid-nebula-background-2zdue1`](https://neuform.ai/skill/technical-webgl-fluid-nebula-background-2zdue1)
- **Route:** `/`, `/design`
- **Component:** `<ShaderCanvas variant="nebula" />`
- **Purpose:** Slow fluid nebula with curl-noise advection for an atmospheric technical backdrop.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Implemented as a curl-noise fragment shader rather than a Three.js post-processing chain.

#### 47. Procedural Mesh Network Background

- **Skill:** [`procedural-mesh-network-background-txudfu`](https://neuform.ai/skill/procedural-mesh-network-background-txudfu)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="mesh-network" />`
- **Purpose:** A meditative procedural mesh that breathes, connecting nodes with fading filaments.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 50. Atmospheric Grain WebGL Background

- **Skill:** [`atmospheric-grain-webgl-background-y6jnkl`](https://neuform.ai/skill/atmospheric-grain-webgl-background-y6jnkl)
- **Route:** `/`, `/design`
- **Component:** `<ShaderCanvas variant="grain" />`
- **Purpose:** Animated film grain over a soft vignette for a technical, photographic base.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 51. Atmospheric Procedural WebGL Background

- **Skill:** [`atmospheric-procedural-webgl-background-2zumzs`](https://neuform.ai/skill/atmospheric-procedural-webgl-background-2zumzs)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="procedural" />`
- **Purpose:** Layered value-noise clouds that evolve slowly behind content.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 55. Technical ASCII Particle Field

- **Skill:** [`technical-ascii-particle-field-2zi2vw`](https://neuform.ai/skill/technical-ascii-particle-field-2zi2vw)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="ascii-field" />`
- **Purpose:** Particle field quantised into ASCII glyph cells for a terminal-flavoured texture.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 56. Cyber-Trail WebGL Background System

- **Skill:** [`cyber-trail-webgl-background-system-vdwsx2`](https://neuform.ai/skill/cyber-trail-webgl-background-system-vdwsx2)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="cyber-trail" />`
- **Purpose:** Cinematic light trails streaking through depth with motion-blurred tails.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 59. Technical Shader Surface (WebGL)

- **Skill:** [`technical-shader-surface-webgl-2zrur1`](https://neuform.ai/skill/technical-shader-surface-webgl-2zrur1)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="shader-surface" />`
- **Purpose:** A shaded technical surface with contour banding that reacts to light direction.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 60. Atmospheric Topographic WebGL

- **Skill:** [`atmospheric-topographic-webgl-u55nmy`](https://neuform.ai/skill/atmospheric-topographic-webgl-u55nmy)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="topographic" />`
- **Purpose:** Topographic contour lines drifting like a living elevation map.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 67. Organic Aetherial WebGL Background

- **Skill:** [`organic-aetherial-webgl-background-316jwq`](https://neuform.ai/skill/organic-aetherial-webgl-background-316jwq)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="aetherial" />`
- **Purpose:** Retro-futurist aetherial wash: organic folds of light with chromatic edges.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 70. Chromatic Dispersion WebGL System

- **Skill:** [`chromatic-dispersion-webgl-system-40mkq2`](https://neuform.ai/skill/chromatic-dispersion-webgl-system-40mkq2)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="chromatic-dispersion" />`
- **Purpose:** Prismatic dispersion splitting light into RGB fringes across a refracting surface.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

#### 71. Grainy Stepped Gradient Noise

- **Skill:** [`grainy-stepped-gradient-noise-trdra9`](https://neuform.ai/skill/grainy-stepped-gradient-noise-trdra9)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="stepped-noise" />`
- **Purpose:** Posterised gradient steps dissolved by grain — a printed-poster gradient.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented

### Design System

#### 11. Mesh Gradient Dark Blue Clean

- **Skill:** [`mesh-gradient-dark-blue-clean`](https://neuform.ai/skill/mesh-gradient-dark-blue-clean)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="mesh-dark-blue" />`
- **Purpose:** Deep blue mesh-gradient field with clean type — a calm, product-launch aesthetic.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 12. Clean Minimal Beige Light Mode

- **Skill:** [`clean-minimal-beige-light-mode`](https://neuform.ai/skill/clean-minimal-beige-light-mode)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="beige-light" />`
- **Purpose:** Warm paper-beige light mode with restrained type and generous whitespace.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 13. Glass Dark Mode Clock

- **Skill:** [`glass-dark-mode-clock`](https://neuform.ai/skill/glass-dark-mode-clock)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="glass-clock" />`
- **Purpose:** Dark glass design system with frosted shells and an oversized time display.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 14. Agency Grid Layout Minimal

- **Skill:** [`agency-grid-layout-minimal`](https://neuform.ai/skill/agency-grid-layout-minimal)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="agency-minimal" />`
- **Purpose:** Minimal agency grid: heavy negative space, small caps labels, hairline rules.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 16. High Contrast Skeuomorphic Clean

- **Skill:** [`high-contrast-skeuomorphic-clean`](https://neuform.ai/skill/high-contrast-skeuomorphic-clean)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="skeuo-contrast" />`
- **Purpose:** Skeuomorphic controls pushed to high contrast for accessibility-first surfaces.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 18. Editorial Tech

- **Skill:** [`editorial-tech`](https://neuform.ai/skill/editorial-tech)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="editorial-tech" />`
- **Purpose:** Editorial typography with technical furniture: rules, captions and figure numbers.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 19. Orange Clean Paper SaaS

- **Skill:** [`orange-clean-paper-saas`](https://neuform.ai/skill/orange-clean-paper-saas)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="orange-paper" />`
- **Purpose:** Paper-white SaaS surface with a single warm orange accent.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 20. Light Mode Paper Technical

- **Skill:** [`light-mode-paper-technical`](https://neuform.ai/skill/light-mode-paper-technical)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="paper-technical" />`
- **Purpose:** Light technical documentation look: graph paper, mono labels, thin rules.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 22. Image First Grid Layout

- **Skill:** [`image-first-grid-layout`](https://neuform.ai/skill/image-first-grid-layout)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="image-first" />`
- **Purpose:** Grid where imagery leads and copy is secondary — built for artwork-driven catalogues.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 23. Technical Framed Grid Design System

- **Skill:** [`technical-framed-grid-design-system-tzckhr`](https://neuform.ai/skill/technical-framed-grid-design-system-tzckhr)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="technical-framed" />`
- **Purpose:** Framed technical grid with coordinate labels and measured gutters.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 24. Fade in, slide in, blur in animation

- **Skill:** [`atmospheric-blur-slide-entrance-system-cblgqz`](https://neuform.ai/skill/atmospheric-blur-slide-entrance-system-cblgqz)
- **Route:** `/`, `/ask`, `/design`
- **Component:** `<Reveal variant='blur' | 'slide' | 'fade' />`
- **Purpose:** Atmospheric entrance: content fades, slides and defocuses into place together.
- **Mobile adaptation:** Travel reduced to 12px and blur to 6px so it never feels sluggish on scroll.
- **RTL adaptation:** Slide axis flips to the inline-start direction.
- **Performance strategy:** Transform/opacity/filter on the compositor, fired once by IntersectionObserver then unobserved.
- **Accessibility strategy:** No-ops under prefers-reduced-motion; content renders in final state.
- **Source files:** `src/components/neuform/motion.tsx`
- **Status:** implemented

#### 26. Nested Container Clean Agency

- **Skill:** [`nested-container-clean-agency`](https://neuform.ai/skill/nested-container-clean-agency)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="nested-agency" />`
- **Purpose:** Clean agency layout built from concentric containers with consistent inset rhythm.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 27. Technical Terminal & WebGL Grid System

- **Skill:** [`technical-terminal-and-webgl-grid-system-v9lmbm`](https://neuform.ai/skill/technical-terminal-and-webgl-grid-system-v9lmbm)
- **Route:** `/ask`, `/design`
- **Component:** `<ThemeScope preset="terminal-grid" />`
- **Purpose:** Terminal panels over a WebGL grid — logs, monospace labels and a live field.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 29. Split Layout Technical

- **Skill:** [`split-layout-technical`](https://neuform.ai/skill/split-layout-technical)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="split-technical" />`
- **Purpose:** Two-column split with a fixed technical rail and a scrolling content side.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 32. Stepped Neon V-Curve Glass System

- **Skill:** [`stepped-neon-v-curve-glass-system-xy0g97`](https://neuform.ai/skill/stepped-neon-v-curve-glass-system-xy0g97)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="neon-v-curve" />`
- **Purpose:** Glass panels stepped along a neon V-curve, with light pooling at the vertex.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 35. Blue Cloudy Clean Modern

- **Skill:** [`blue-cloudy-clean-modern`](https://neuform.ai/skill/blue-cloudy-clean-modern)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="blue-cloudy" />`
- **Purpose:** Soft clouded blue gradients with clean modern type — light, airy product surface.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 37. Technical Wireframe Info Layout

- **Skill:** [`technical-wireframe-info-layout`](https://neuform.ai/skill/technical-wireframe-info-layout)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="wireframe-info" />`
- **Purpose:** Wireframe-styled information layout: labelled boxes, leader lines and measurements.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 42. Cursor-Reactive Flashlight Glow Border

- **Skill:** [`cursor-reactive-flashlight-glow-border-xa9a9z`](https://neuform.ai/skill/cursor-reactive-flashlight-glow-border-xa9a9z)
- **Route:** `/ask`, `/design`
- **Component:** `<FlashlightBorder />`
- **Purpose:** A pointer-tracked light that grazes the container edge, revealing the border locally.
- **Mobile adaptation:** Pointer tracking disabled on coarse pointers; a gentle static glow is used instead.
- **RTL adaptation:** Position is computed from the element box, so it is direction-independent.
- **Performance strategy:** Pointer coordinates written to CSS variables inside rAF, one listener per card, removed on unmount.
- **Accessibility strategy:** Hover-only affordance; keyboard focus shows the same glow via :focus-within.
- **Source files:** `src/components/neuform/surfaces.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 43. Interactive Border Gradient Glow

- **Skill:** [`interactive-border-gradient-glow-wnu6m4`](https://neuform.ai/skill/interactive-border-gradient-glow-wnu6m4)
- **Route:** `/ask`, `/design`
- **Component:** `<GradientBorder interactive />`
- **Purpose:** Border gradient that intensifies and rotates on interaction to signal affordance.
- **Mobile adaptation:** Falls back to the active/pressed state only.
- **RTL adaptation:** Rotation direction follows --nf-dir.
- **Performance strategy:** Animated @property angle; no layout or paint thrash.
- **Accessibility strategy:** Paired with a focus-visible ring so keyboard users get the same signal.
- **Source files:** `src/components/neuform/surfaces.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 45. Industrial WebGL Minimalist System

- **Skill:** [`industrial-webgl-minimalist-system-v9b1kp`](https://neuform.ai/skill/industrial-webgl-minimalist-system-v9b1kp)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="industrial-minimal" />`
- **Purpose:** Industrial minimalism: concrete greys, hard rules and a single mechanical accent.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 46. 3D Perspective Scroll Dashboard

- **Skill:** [`3d-perspective-scroll-dashboard-0hq031`](https://neuform.ai/skill/3d-perspective-scroll-dashboard-0hq031)
- **Route:** `/design`
- **Component:** `<PerspectiveDeck />`
- **Purpose:** Dashboard panels tilted in perspective that straighten as they scroll into view.
- **Mobile adaptation:** Tilt angle reduced to 6deg to avoid text distortion on small screens.
- **RTL adaptation:** rotateY sign flips with direction so panels open toward the reader.
- **Performance strategy:** CSS 3D transforms driven by one IntersectionObserver; no scroll listener.
- **Accessibility strategy:** Transform is visual only; reduced motion renders panels flat.
- **Source files:** `src/components/neuform/motion.tsx`, `src/app/neuform.css`
- **Status:** implemented

#### 49. Dither Laser Dark Mode

- **Skill:** [`dither-laser-dark-mode`](https://neuform.ai/skill/dither-laser-dark-mode)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="dither-laser" />`
- **Purpose:** Dark mode where dithered texture meets laser accents — grainy and charged.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 57. Atmospheric Meditative Dark System

- **Skill:** [`atmospheric-meditative-dark-system-wr0bj8`](https://neuform.ai/skill/atmospheric-meditative-dark-system-wr0bj8)
- **Route:** `/`, `/design`
- **Component:** `<ThemeScope preset="meditative-dark" />`
- **Purpose:** Slow, low-contrast dark system built for long sessions and calm reading.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 58. Atmospheric Laser & WebGL Design System

- **Skill:** [`atmospheric-laser-and-webgl-design-system-8ljti2`](https://neuform.ai/skill/atmospheric-laser-and-webgl-design-system-8ljti2)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="laser-atmosphere" />`
- **Purpose:** Atmospheric dark system where laser accents and a live field carry the brand.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 62. Atmospheric Technical Design System

- **Skill:** [`atmospheric-technical-design-system-u1ciwi`](https://neuform.ai/skill/atmospheric-technical-design-system-u1ciwi)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="atmospheric-technical" />`
- **Purpose:** Technical system with atmospheric depth: mono labels, hairlines and a soft field.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 63. Cyber Kinetic Background Field

- **Skill:** [`cyber-kinetic-background-field-3yguj9`](https://neuform.ai/skill/cyber-kinetic-background-field-3yguj9)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="cyber-kinetic" />`
- **Purpose:** High-energy kinetic field with cyan/magenta separation behind restrained UI.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 68. Book Serif Index

- **Skill:** [`book-serif-index`](https://neuform.ai/skill/book-serif-index)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="book-serif" />`
- **Purpose:** Archival book-reader system: serif-led pages, index rails and running heads.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

#### 69. Kinetic Radial Sculpture System

- **Skill:** [`kinetic-radial-sculpture-system-0gv4e7`](https://neuform.ai/skill/kinetic-radial-sculpture-system-0gv4e7)
- **Route:** `/design`
- **Component:** `<ThemeScope preset="kinetic-radial" />`
- **Purpose:** Radial sculptural forms rotating as a hero motif with type wrapped around them.
- **Mobile adaptation:** Tokens are unit-relative; type scale and container padding step down at 768px.
- **RTL adaptation:** Token-only — inherits document direction; all spacing uses logical properties.
- **Performance strategy:** Pure CSS custom properties, zero JS at runtime; applied via a data attribute.
- **Accessibility strategy:** Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.
- **Source files:** `src/design/themes.ts`, `src/app/neuform.css`
- **Status:** implemented

### 3D

#### 15. WebGL 3D Object

- **Skill:** [`webgl-3d-object`](https://neuform.ai/skill/webgl-3d-object)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="object3d" />`
- **Purpose:** A lit 3D object with real depth, shading and soft shadow occlusion.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Raymarched signed-distance geometry in a fragment shader instead of a Three.js scene graph — real lighting and depth with no 3D-engine dependency.

#### 28. Globe Particles

- **Skill:** [`globe-particles`](https://neuform.ai/skill/globe-particles)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="globe-particles" />`
- **Purpose:** A rotating globe built from luminous points with depth-faded back hemisphere.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Points are generated and projected in a shader pass rather than a Three.js Points object, keeping the bundle free of a 3D engine.

#### 61. Isometric Spatial 3D System

- **Skill:** [`isometric-spatial-3d-system-i58999`](https://neuform.ai/skill/isometric-spatial-3d-system-i58999)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="isometric-spatial" />`
- **Purpose:** A technical isometric lattice of extruded cells with spatial depth cues.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Isometric volume raymarched in a fragment shader rather than a Three.js scene graph.

### Icon

#### 21. Company Logos

- **Skill:** [`company-logos`](https://neuform.ai/skill/company-logos)
- **Route:** `/design`
- **Component:** `<BrandLogo name=… size={64} />`
- **Purpose:** Real brand marks (Iconify Simple Icons, 64px) instead of text placeholders.
- **Mobile adaptation:** Scales to 40px with the same optical weight.
- **RTL adaptation:** Logo rows use logical gap and reverse order in RTL.
- **Performance strategy:** Fetched as a single SVG per mark from the Iconify CDN with lazy loading, and falls back to an inline monogram offline.
- **Accessibility strategy:** Each mark carries an accessible name; decorative rows are aria-hidden.
- **Source files:** `src/components/neuform/icons.tsx`
- **Status:** implemented

#### 31. Solar Duotone Bold

- **Skill:** [`solar-duotone-bold`](https://neuform.ai/skill/solar-duotone-bold)
- **Route:** `/design`
- **Component:** `<DuotoneIcon name=… />`
- **Purpose:** Consistent duotone icon language where a bold fill pairs with a lighter accent shape.
- **Mobile adaptation:** 24px baseline with a 44px touch target.
- **RTL adaptation:** Directional glyphs (arrows, chevrons) flip with the document direction.
- **Performance strategy:** Inline SVG paths — no icon font, no runtime fetch for the built-in set.
- **Accessibility strategy:** role=img with a label, or aria-hidden when paired with visible text.
- **Source files:** `src/components/neuform/icons.tsx`
- **Status:** implemented

### Three.js

#### 48. Aura Isometric 3D Visualization System

- **Skill:** [`aura-isometric-3d-visualization-system-i4nez9`](https://neuform.ai/skill/aura-isometric-3d-visualization-system-i4nez9)
- **Route:** `/design`
- **Component:** `<ShaderCanvas variant="isometric-aura" />`
- **Purpose:** Isometric volumetric blocks with an aura glow, used for spatial data motifs.
- **Mobile adaptation:** Reduced DPR and lower step counts below 768px; static fallback on save-data.
- **RTL adaptation:** Direction-agnostic field; directional shaders read --nf-dir to mirror flow.
- **Performance strategy:** Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.
- **Accessibility strategy:** Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.
- **Source files:** `src/components/neuform/webgl/ShaderCanvas.tsx`, `src/components/neuform/webgl/shaders.ts`
- **Status:** implemented
- **Deviation:** Rendered as an isometric raymarch in a fragment shader instead of a Three.js scene.
