---
name: cyrene-listen
description: Cyrene-fit listening contract for Resonant. Synced LRC on the current track, now-playing status, keyboard transport without skip. Do not install the Cyrene Electron pet, NetEase, or next/prev.
---

# Cyrene listen (Resonant)

Cyrene-Agent is a Windows Live2D desktop companion. Resonant does **not** vendor that app. It keeps the listening contract that actually belongs here.

## Install this, not the pet

Do:

- Show published LRC against whatever is sounding now (`fetch_lyrics`, `/api/lyrics`, mini-player stage).
- Honour `[offset:±ms]` in LRC. Positive offset makes lines appear earlier.
- Answer "what's playing" / «الان چی پخش می‌شه» with `playback_status`. Do not start a new song.
- Space pauses. Left / right seek five seconds. Up / down change volume.
- Lyrics from lrclib only. Never invent words. Never require NetEase login.

Do not:

- Install Electron, Live2D, mpv, or Cyrene's Honkai persona.
- Default catalog to NetEase Cloud Music. Apple Music stays first.
- Add skip, next, previous, or shuffle. `Queue.goToNext` stays refused.
- Copy Cyrene source into the Next bundle.

Source reviewed: `Playa-0v0/Cyrene-Agent` (music tools + LRC player). Parser in Resonant is original.
