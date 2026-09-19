# RESONANT Recommendation Engine

## Emotional vector space

Every track in the RESONANT catalog is annotated with a six-dimensional emotional
vector called `Vec`. The axes are `d` (darkness), `w` (warmth), `o` (organic
texture), `e` (energy), `m` (mainstream gravity) and `s` (sadness). Each axis is a
float between 0 and 1.

Distance between two tracks is computed by `emotionalDist`, a weighted Euclidean
distance. The weights are darkness 1.45, warmth 1.55, organic 1.05, energy 1.7,
mainstream 0.75 and sadness 1.55. Energy is weighted highest because a sudden
change in energy is the most jarring transition for a listener.

## The compass and the taste graph

The user controls a five-axis compass: warm, sad, organic, energy and dark. The
compass is blended with the taste graph to build a target vector. The blend is 72
percent compass and 28 percent graph attraction, so explicit user intent always
dominates learned history.

The taste graph is derived from feedback. Tracks marked `like` or `more` form the
attraction set. If no tracks are liked yet, the engine falls back to tracks with
obscurity above 0.65, which biases early discovery away from chart music.

## Rejection memory

Feedback carries a reason. A dislike with reason `never` is a hard veto and the
track is permanently excluded with a score of -999. Softer signals apply score
penalties: a generic dislike is -3.0, `less like this` is -1.6 and `already heard`
is -1.1. A like adds +2.8.

Rejection reasons also reshape the target vector. Rejecting something as
`mainstream` lowers the mainstream axis by 0.2. Rejecting `cold` raises warmth by
0.16. Rejecting `fast` lowers energy by 0.16, and rejecting `loud` lowers energy
by 0.12.

## Rotation and diversity

The engine keeps a rolling window of the 24 most recently recommended track ids.
Recently shown tracks receive a freshness penalty so the same songs do not repeat
across sessions. Unrated tracks receive a boost that scales with how little
feedback exists: from 1.8 when under 15 percent of the catalog is rated up to 4.5
when more than 55 percent is rated.

Diversification enforces two rules: no two picks may sit closer than 0.2 in
emotional distance, and an artist is not repeated while alternatives remain.

## Never-empty guarantee

The ranker degrades through tiers instead of returning nothing. The tiers are
`primary`, `relaxed`, `soft-fallback`, `absolute`, and finally `emergency`, which
rotates the full catalog. Even when every track is hard-vetoed the room is never
empty.

## Journey mode

`flow` builds a six-track continuous path with chapters Open, Rise, Settle and
Land. It shapes an energy curve across the path and penalises jumps larger than
1.2 in emotional distance so consecutive tracks feel connected.
