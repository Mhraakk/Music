---
name: meting-listen
description: Meting-fit catalog contract for Resonant. Named 网易/QQ音乐/酷狗/酷我 search still plays from Apple. Public platform pages only. Do not vendor Meting's unofficial APIs, cookies, or play URLs.
---

# Meting listen (Resonant)

Meting-Agent is an unofficial NetEase / QQ Music / KuGou / Kuwo client (MCP + cookies + play URLs). Resonant does **not** vendor that package. It keeps the catalog contract that actually belongs here.

## Install this, not the unofficial API

Do:

- When the listener names 网易云 / QQ音乐 / 酷狗 / 酷我 / NetEase / KuGou / Kuwo, strip the platform token and search **Apple Music first**.
- Keep CJK titles in the search query. `namedArtistQuery` must not empty out 「我怀念的」.
- After Apple hits, attach a **public search page** on the named site (`music.163.com`, `y.qq.com`, `kugou.com`, `kuwo.cn`). That is an outbound link, not playback.
- Lyrics stay lrclib. Honour 歌词 / 歌詞 as a lyrics ask. Never invent words.

Do not:

- npm-install `@eldment/meting-agent` or copy `shared/meting/providers`.
- Call EAPI, cookie headers, or `url` play streams.
- Make NetEase (or QQ / KuGou / Kuwo) the default catalog.
- Set `previewUrl` / in-app audio from a Meting play URL.
- Dual-play an Apple preview and a Chinese-platform stream.
- Add skip, next, previous, or shuffle.

Source reviewed: `ELDment/Meting-Agent` (search / song / lyric / url / pic). Client in Resonant is original.
