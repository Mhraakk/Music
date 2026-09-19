# RESONANT v4 — Liquid Glass

Cinematic music intelligence. Artwork-driven. Emotional taste graph.

RESONANT is a Next.js app that recommends music from an emotional "compass" and a
local taste graph with rejection memory — no account, no tracking, fully local engine.

---

## Tech stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict)
- **State:** Zustand
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest + Testing Library (unit/component), Playwright (E2E)
- **Quality:** ESLint (flat config) + Prettier + Husky + lint-staged
- **CI/CD:** GitHub Actions
- **Runtime:** Node 22, container-ready (standalone output)

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

Optional configuration lives in `.env.local` (see [`.env.example`](./.env.example)).
Everything is optional — the app runs on its local engine out of the box.

## Scripts

| Script                            | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Start the dev server (http://localhost:3000) |
| `npm run build`                   | Production build (standalone output)         |
| `npm run start`                   | Serve the production build                   |
| `npm run lint` / `lint:fix`       | ESLint                                       |
| `npm run typecheck`               | `tsc --noEmit`                               |
| `npm run format` / `format:check` | Prettier                                     |
| `npm test` / `test:watch`         | Vitest unit + component tests                |
| `npm run test:e2e`                | Playwright end-to-end tests                  |
| `npm run check`                   | Lint + typecheck + unit tests                |

## Project structure

```
src/
  app/            # App Router: pages, API routes, error/manifest/robots/sitemap
    api/health/   # Health & readiness endpoint
    api/agent/    # Local agent orchestrator endpoint (rate-limited)
  components/     # UI (player, artwork, cards, panels)
  lib/            # Engine, agent, taste graph, reliability, env, logger, rate-limit
  store/          # Zustand stores
tests/            # Vitest unit + component tests
e2e/              # Playwright specs
```

## APIs

- `GET /api/health` — catalog integrity, recommendation health, agent version.
- `POST /api/agent` — natural-language music agent (recommend, refine, journey,
  player control). Rate limited to 30 requests / 10s per client.

## Testing

```bash
npm test          # unit + component (Vitest)
npm run test:e2e  # end-to-end (Playwright) — auto-starts the dev server
```

## Deployment

RESONANT builds to a Next.js **standalone** bundle and ships with a multi-stage
`Dockerfile`:

```bash
docker compose up --build      # http://localhost:3000
# or
docker build -t resonant .
docker run -p 3000:3000 resonant
```

It also deploys directly to any Next.js host (e.g. Vercel).

## Production layers

This project implements 20 standard production layers — see
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full list (code quality,
testing, CI/CD, security headers, rate limiting, observability, SEO, PWA,
accessibility, containerization, and more).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security policy in [`SECURITY.md`](./SECURITY.md).
Licensed under [MIT](./LICENSE).
