---
name: atlas-nav
description: >-
  Every Noise atlas as navigation only. Use when touching /atlas, harvest, or resolve.
---

# Atlas navigation

- Parser lock: `node scripts/verify-atlas.mjs` (optionally with a base URL).
- `POST /api/atlas/resolve` wraps `resolveRecording()`. No `genre` field on the JSON record.
- Ask tools: `browse_atlas`, `resolve_atlas`. Nuclear: `Atlas.harvest`, `Atlas.resolve`, `Atlas.artist`.
- `nearbyGenres` on an artist payload is map navigation. Never copy it onto `LibraryTrack`.
- Atlas Play when `libraryId` is null must resolve, then ingest + play.
- Do not write genre onto stored catalog records.
