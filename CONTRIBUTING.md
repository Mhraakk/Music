# Contributing to RESONANT

Thanks for helping improve RESONANT.

## Development setup

```bash
npm install
npm run dev
```

## Before you open a PR

Run the full local gate (CI runs the same):

```bash
npm run check      # lint + typecheck + unit tests
npm run test:e2e   # end-to-end (optional locally; runs in CI)
npm run build
```

A Husky pre-commit hook runs `lint-staged` (ESLint + Prettier) on staged files
automatically.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- **Formatting:** Prettier is the source of truth — do not hand-format.
- **Types:** No `any` unless unavoidable; prefer the generated/domain types.
- **Business logic:** Keep it in `src/lib/*` (pure, testable); keep components thin.
- **Tests:** Add/extend Vitest tests for engine/agent/lib changes; add Playwright
  coverage for user-facing flows.

## Project layout

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the module map and the
list of production layers.
