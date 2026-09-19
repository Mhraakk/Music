# Music Sources & Taste Memory

RESONANT no longer reads from a single fixed catalogue. It pulls from the open
internet and from your own accounts, then ranks everything against a taste
profile it learns from your signals.

## Sources

| Source                | Kind     | Credentials                                                                  | What it gives                                                           |
| --------------------- | -------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Apple / iTunes search | internet | **none**                                                                     | Apple's catalogue, artwork, 30s previews                                |
| Deezer                | internet | **none**                                                                     | Broad catalogue, ISRCs, previews                                        |
| MusicBrainz           | internet | **none**                                                                     | Canonical metadata, tags, release years                                 |
| Spotify               | personal | `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`, optional `SPOTIFY_USER_TOKEN` | Catalogue search; saved tracks and **audio features** with a user token |
| Apple Music           | personal | `APPLE_MUSIC_DEVELOPER_TOKEN`, optional `APPLE_MUSIC_USER_TOKEN`             | Catalogue; your library with a Music-User-Token                         |
| YouTube Music         | personal | `YOUTUBE_API_KEY`, optional `YOUTUBE_OAUTH_TOKEN`                            | Music search; your liked music with OAuth                               |
| Telegram              | personal | `TELEGRAM_BOT_TOKEN`                                                         | Audio you send/forward to your bot, read from its ID3 tags              |

The three internet sources work immediately. Personal sources are fully
implemented but stay inert until their secrets exist — `GET /api/v1/sources`
reports exactly which variable each one is waiting for, and the `/sources` page
shows the same thing.

## Identity and merging

The same song arrives from several providers with different ids, punctuation and
metadata. Two rules keep it one song:

- **Stable identity** is the normalized `artist::title` — _not_ the ISRC.
  Providers disagree about whether a track has an ISRC, so an ISRC-first key
  would split one song's listening history in two.
- **Merging** unions candidates by _any_ shared alias (normalized name or ISRC),
  so an iTunes row without an ISRC still collapses onto the Deezer row that has
  one. Each provider then contributes its best field: Deezer's ISRC, Apple's
  preview, Spotify's audio features, MusicBrainz's tags.

Normalization folds case, accents (`Sigur Rós` = `Sigur Ros`), leading articles,
remaster/live suffixes and feature credits.

## Understanding: what a track _feels_ like

Everything is mapped onto the app's six axes — darkness, warmth, organic
texture, energy, mainstream gravity, sadness — in priority order:

1. **Provider audio features** (Spotify valence/energy/acousticness) → confidence 0.9.
2. **The curated catalogue** — if the artist is one of the 60 hand-annotated
   artists, that reading is reused → confidence 0.85.
3. **Genre vocabulary, wording, decade and popularity** → confidence 0.25–0.75.

Every inference reports its basis, so a recommendation can always explain which
evidence produced it.

## Memory: what it learns about you

Signals (`like`, `save`, `play`, `skip`, `dislike`) are appended to a durable log
with the vector inferred at the time. The profile is **recomputed from the log**
rather than mutated in place, so it stays explainable and deleting a signal
genuinely removes its influence. It holds:

- an **attract** centroid and, once you reject things, an **avoid** centroid,
- artist, genre and decade affinities,
- an obscurity preference (deep catalogue vs chart),
- **hard vetoes** — a dislike with reason `never` can never resurface,
- which sources taught it what.

`DELETE /api/v1/taste/profile/{user}` erases everything.

## Recommending

A profile is not a search query. Concatenating favourite artists into one string
produces a phrase no catalogue matches, so candidates come from **multiple
seeds** — each favourite artist and each strong genre queried separately — then
pooled, merged and ranked by: emotional distance, artist/genre affinity,
obscurity fit, cross-source corroboration, library membership and playability
(a result you cannot hear ranks below one you can). Every result carries its
reasons.

## Endpoints

| Method   | Path                            | Purpose                                          |
| -------- | ------------------------------- | ------------------------------------------------ |
| `GET`    | `/api/v1/sources`               | Which sources are connected, and what is missing |
| `POST`   | `/api/v1/music/search`          | Search every source at once, taste-ranked        |
| `GET`    | `/api/v1/music/library`         | Your saved tracks across personal sources        |
| `POST`   | `/api/v1/taste/signal`          | Record like / dislike / play / skip / save       |
| `GET`    | `/api/v1/taste/profile/{user}`  | The learned profile and a summary                |
| `DELETE` | `/api/v1/taste/profile/{user}`  | Forget everything                                |
| `POST`   | `/api/v1/taste/recommendations` | Cross-source, personalised, explained            |

Agent tools: `search_music`, `recommend_for_me`, `my_taste_profile`,
`connected_sources`.

## Adding your accounts

Put the variables from [`.env.example`](../.env.example) into `backend/.env`, or
add them as environment secrets. Restart the backend and `/sources` will show
them as connected — no code change is required.
