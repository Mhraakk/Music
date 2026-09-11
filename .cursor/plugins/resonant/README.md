# Resonant Cursor plugin

Project plugin for [Resonant](https://github.com/Mhraakk/Music). It packages the listen MCP, Ask tool surface, and product locks so agents work the way the app actually plays.

## MCP

With `next dev` / `next start` running:

- Nuclear (four discovery tools): `http://127.0.0.1:8800/mcp`
- Full cognition + Ask tools: `http://127.0.0.1:3000/api/mcp`

Nuclear domains now include Atlas, Drift, Taste, Wheat, and Cognition on top of Queue / Playback / Metadata / Streaming. The tool list on `/mcp` stays the four Nuclear discovery tools. Call `Atlas.harvest` or `Cognition.findMusic` through `call`.

## Ops MCPs

The repo `.cursor/mcp.json` also registers Harness, Vercel, Linear, Sentry, Notion, Slack, Exa, and Braintrust. Authenticate those in Cursor desktop. They are for shipping Resonant, not for dumping unrelated products into the player.

## Hard product locks

- Brand is Resonant.
- No skip / next. Engine owns what follows. `Queue.goToNext` is refused.
- Homepage still names Listen Now, Favorite Songs, Connect Apple Music.
- Apple Music first. YouTube is full listen + official video, not the default catalog.
- Every Noise atlas is navigation only. Never write a genre field onto stored catalog records.
- Lyrics from lrclib only. Honour LRC `[offset:±ms]`. Never invent lyrics.
- Unique git previews: resonant-etg only. Never music / music-bhdv Vercel URLs.
- Token **names** stay. Do not switch fonts to Righteous/Poppins.

## Verify

```bash
npm run typecheck
npm run verify:tokens
npm run verify:atlas
npm run verify:drift
```
