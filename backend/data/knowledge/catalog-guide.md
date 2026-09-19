# Catalog Guide

## Size and shape

The RESONANT catalog contains 60 hand-annotated tracks. Each entry carries a
title, artist, album, release year, obscurity score, a one-line rationale in the
`why` field, an emotion label, duration in seconds, cover artwork URL, an ambient
colour triplet, a list of kindred artists and the six-axis emotional vector.

## Obscurity

Obscurity runs from 0 to 1 and expresses how far a track sits from chart music.
Values above 0.8 mark deep-catalog material such as Mount Fuji Doomjazz
Corporation or The Caretaker. Values below 0.3 mark widely known records such as
Radiohead's Kid A or Massive Attack's Teardrop. Discovery depth multiplies the
obscurity reward, so raising depth pushes the room toward rarer music.

## Artwork

Cover artwork is served from Apple's mzstatic content delivery network. The
allowed hosts are is1 through is5 dot mzstatic dot com. When an image fails to
load the interface falls back to a generated gradient derived from the track's
ambient colour, so a card never renders empty.

## Emotion labels

Emotion labels are short compound descriptors rather than genres. Examples
include heavy-still, warm-glide, melancholy-rain, reflective-space, fragile-mass,
gauze-light, degrading-memory and engineered-calm. They describe how a track
feels in a room rather than how it is marketed.

## Kindred artists

Each track lists kindred artists in the `kin` field. These are used to widen
discovery without leaving the emotional neighbourhood. For example Bohren and der
Club of Gore lists Kilimanjaro Darkjazz, and Aphex Twin's Rhubarb lists Boards of
Canada.
