---
name: apple-ask
description: >-
  Ask companion at /talk. Apple Music first, lyrics, liner notes, share links.
  Use when changing converse tools, prompts, or TalkSurface.
---

# Ask

- Route: `/talk`. Transport: `POST /api/converse`.
- Tools live in `src/lib/converse/tools.ts`. Prompt: `src/lib/converse/prompt.ts`.
- Default search: `find_music` (Apple first). Kin: `find_related`. Lyrics: `fetch_lyrics` (lrclib only).
- Liner notes: `research_recording` (Wikipedia / MusicBrainz). Never invent. Never use it for lyrics.
- Share: `share_listen` builds `/?listen=<id>`. Client sends `session.origin`.
- Atlas pin without a catalog id: `resolve_atlas`.
- `findMusic` uses `cap = Math.max(4, …)` so callers that want one match must pick one.
- Homepage copy is not this page. Do not rename Listen Now / Favorite Songs / Connect Apple Music on `/`.
