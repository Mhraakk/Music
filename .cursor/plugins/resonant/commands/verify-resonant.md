---
name: verify-resonant
description: Run Resonant typecheck, token lock, atlas lock, and drift engine checks
---

Run from the repo root, with the app serving if you pass a base URL:

```bash
npm run typecheck
npm run verify:tokens
npm run verify:atlas
```

If a local server is up:

```bash
node scripts/verify-atlas.mjs http://127.0.0.1:PORT
node scripts/verify-drift-engine.mjs http://127.0.0.1:PORT
```

Do not change token names. Homepage must still name Listen Now, Favorite Songs, Connect Apple Music. Nuclear `/mcp` must still expose exactly four tools.
