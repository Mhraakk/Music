---
name: ops-mcp
description: >-
  Wire Harness, Vercel, Linear, Sentry, and related MCPs to Resonant shipping.
  Use when deploying, CI, incidents, or unique git previews.
---

# Ops MCP for Resonant

Project `.cursor/mcp.json` registers:

| Server | Use on Resonant |
| --- | --- |
| nuclear / resonant | Listen + cognition tools against the running app |
| harness | CI pipeline in `.harness/resonant-verify.yaml` after OAuth |
| vercel | Deploy. Unique git must be **resonant-etg**, never music / music-bhdv |
| linear | Issues for this repo |
| sentry | Production errors |
| notion / slack | Docs and ops chat |
| exa | Published research while coding (not a player catalog) |
| braintrust | Eval the Ask companion, optional |

OAuth for remote servers happens in Cursor desktop. Cloud agents cannot finish interactive MCP login.

Harness: do not create account resources until `org_id` / `project_id` are known. Import `.harness/resonant-verify.yaml`.
