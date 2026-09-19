# Architecture & Production Layers

RESONANT is a local-first music intelligence app with a full AI application
stack. The UI renders an emotional "compass"; the engine (`src/lib/engine.ts`)
ranks a 60-track catalog by emotional distance, obscurity, and a feedback-driven
taste graph with rejection memory. A separate Python service (`backend/`) adds
RAG, a LangGraph agent, guardrails and memory.

## End-to-end AI architecture

```
 [1] Frontend (Next.js)
        │  same-origin proxy (/api/ai/chat) — keeps CSP connect-src 'self'
        ▼
 [2] API Gateway (FastAPI)  auth · rate limit · validation · logging · metrics
        ▼
 [3] Orchestrator (LangGraph)
        guard_input ─(blocked)─► END
             └─► plan ─┬─(retrieve)─► [5] RAG ─┐
                       ├─(tool)─────► tools ───┤─► generate ─► evaluate ─┬─weak─► reflect ─┐
                       └─(direct)──────────────┘                         └─ok──► guard_out │
                                     ▲                                                     │
                                     └─────────────────────────────────────────────────────┘
        │              │              │             │              │
 [5] RAG        [6] Knowledge   [7] LLM       [8] Guardrails  [9] Memory
  embed/search   parse/chunk     providers     filters/PII     short+long term
        │              │              │             │              │
        └──────── Vector store · Postgres/SQLite · Redis/memory · file storage ────────┘
```

The music engine remains pure and deterministic (unit-testable, reproducible);
the AI backend adds retrieval-grounded answering on top of it.

## AI backend at a glance

| Block        | Implementation                                  | Local default      | Production                  |
| ------------ | ----------------------------------------------- | ------------------ | --------------------------- |
| API gateway  | `backend/app/main.py`                           | uvicorn            | container + WAF             |
| Orchestrator | `backend/app/orchestrator/graph.py` (LangGraph) | —                  | —                           |
| RAG          | `backend/app/rag/*`                             | numpy vector store | Qdrant                      |
| Knowledge    | `backend/data/knowledge`                        | seeded on boot     | uploaded corpora            |
| LLM          | `backend/app/llm/*`                             | offline extractive | OpenAI / Anthropic / Ollama |
| Guardrails   | `backend/app/guardrails/*`                      | always on          | + policy service            |
| Memory       | `backend/app/memory/manager.py`                 | SQLite + in-memory | Postgres + Redis            |
| Evaluation   | `backend/app/eval/harness.py`                   | CI gate            | scheduled regression runs   |

Routing rule: actionable requests ("recommend something dark", "how many
tracks") go to catalog tools; explanatory questions go to retrieval. The
evaluator scores groundedness and can trigger one Reflexion re-query.

See [`backend/README.md`](../backend/README.md) for endpoints and configuration.

## The 20 production layers

| #   | Layer                                            | Where                                                    |
| --- | ------------------------------------------------ | -------------------------------------------------------- |
| 1   | ESLint (flat config, `eslint-config-next`)       | `eslint.config.mjs`                                      |
| 2   | Prettier + EditorConfig                          | `.prettierrc.json`, `.editorconfig`                      |
| 3   | Strict TypeScript                                | `tsconfig.json`                                          |
| 4   | Unit tests (Vitest)                              | `tests/*.test.ts`                                        |
| 5   | Component tests (Testing Library)                | `tests/Artwork.test.tsx`                                 |
| 6   | E2E tests (Playwright)                           | `e2e/`, `playwright.config.ts`                           |
| 7   | CI pipeline                                      | `.github/workflows/ci.yml`                               |
| 8   | Git hooks (Husky + lint-staged)                  | `.husky/`, `package.json`                                |
| 9   | Dependency automation (Dependabot)               | `.github/dependabot.yml`                                 |
| 10  | Error boundaries (error / global-error / 404)    | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx` |
| 11  | Structured logging                               | `src/lib/observability/logger.ts`                        |
| 12  | Web Vitals reporting                             | `src/app/web-vitals.tsx`                                 |
| 13  | Security headers (CSP, HSTS, …)                  | `next.config.ts`                                         |
| 14  | Typed env validation                             | `src/lib/env.ts`                                         |
| 15  | API rate limiting                                | `src/lib/rate-limit.ts`                                  |
| 16  | SEO (metadata, robots, sitemap)                  | `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`          |
| 17  | PWA (manifest + icon)                            | `src/app/manifest.ts`, `icon.svg`                        |
| 18  | Accessibility (skip link, focus, reduced motion) | `layout.tsx`, `globals.css`                              |
| 19  | Containerization (standalone + Docker)           | `Dockerfile`, `docker-compose.yml`                       |
| 20  | Documentation                                    | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, this file |

## Security posture

- Strict CSP with a dev/prod switch (dev allows `unsafe-eval` + websockets for HMR).
- HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, and a locked-down `Permissions-Policy`.
- `POST /api/agent` is rate limited (30 req / 10s per client) and validates input.
- The agent never mutates third-party accounts and requires explicit confirmation
  before any playlist export.

## Notes & future work

- CSP uses `'unsafe-inline'` for scripts to accommodate the App Router's inline
  bootstrap; moving to nonces via middleware would harden it further.
- The rate limiter is in-memory (single instance). Back it with a shared store
  (e.g. Redis) for multi-instance deployments.
