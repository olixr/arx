# THE SHORT SPAN LAW — roads learn the water

*As-built record, 2026-08-11. The world-composition polish pass before the
production push: every road re-threaded around open water, and the law that
keeps it that way forever.*

## The law

A fantasy road bridges **necks and river mouths, not lakes**. Constants in
`packages/content/src/geography.ts`:

- `ROAD_SPAN_MAX = 12` — the longest contiguous bridge deck a built road may lay.
- `TRAIL_SPAN_MAX = 8` — a trail throws plank spans, and gets less.
- **Deep water (`elevation < 0.3`) is never bridged at all.** The lake cores
  stay moats — the sandbar law's older promise, now enforced end to end.

`routeBridgeDecks(def, seed, elevAt)` measures the ACTUAL deck tiles the carve
will lay (the same wander math as `roadHitAt`, judged against the draft def,
flood-filled into contiguous decks; a deck's span is the longer side of its
bounding box). Tiles inside a planned rect, or within 4 tiles of one, are the
zone overlay's / edge harmony's to judge, not the raw field's.

`geographyWarnings(def, seed, elevAt?)` speaks the law when handed a seeded
elevation sampler — the World Studio's Validate button, the `/dev/world` and
geography save/load endpoints all pass one, so a dragged waypoint that wades
into a mere badges immediately. `geography.test.ts` pins the authored plan to
zero warnings AND names each route's worst deck, so a regression fails with an
address instead of a shrug.

## What moved (seed 1337, measured decks before → after)

| route | before | after |
|---|---|---|
| first_road | 85L + 32L + 18L decks (open fen water) | 7L, 5L, 2L — reed-neck spans |
| salt_road | **69L, 116 deep tiles** (ran lengthwise down the fen-tail lake) | 7L max, 0 deep — an east-shore road |
| timber_road | 43L across the braid mosaic | **dry** — rounds the mosaic's north edge |
| sparway | 31L + 15L + 8L | **dry** — re-forked (see below) |
| hunters_trail | 11L (waded the fork tarn) | 4L max — hooks the tarn's south shore |
| high_road | 10L (legal) | unchanged |
| hartway | 11L (legal — the beck-braid bridge) | unchanged |
| hoargate_road, cairn_path | dry | unchanged |

Route redesigns, all story-forward:

- **The First Road** now goes AROUND the Amberfen the way carts actually would:
  south along Dawnmead's hem, over the one sand causeway the fen deals at its
  southern edge (y≈94), along the dry south-shore belt — past the toll camp
  with water on one hand and brigands on the other, exactly its authored
  story — touching the waist's foot below the Fenside Crofts, then the long
  sand shore to the ford. ~390 tiles vs 296 crow-flight.
- **The Salt Road** works the fen-tail lake's east shore out of the south gate,
  swings over the dry heath shelf where the marsh widens, and returns west
  across the sand fan at y≈152 before the straight run south.
- **The Timber Road** turns north at the braid-water country and rounds the
  whole mosaic on its top edge (y≈-22, bone dry) — the braids stay scenery on
  the carter's right hand.
- **The Sparway** now forks off the TIMBER ROAD at (514,-8) — the exact bend
  where the wains give up and go around — and runs due north up the one dry
  seam east of the Blackpine's meres (the wet country ends at x≈474), straight
  through the dread ring to Pinewatch's west gate. The TWO-ROADS LAW still
  holds and is still test-pinned: shorter than 70% of the Timber Road, mean
  tier > +0.5 worse.
- `hollow_watch` pin nudged (612,-16) → (612,-13) to stand beside the moved
  Timber Road rather than under it.

## Town seat audit (all six verdicts: SOUND, no relocations)

- **Dawnmead** — dry seat; the new hem lane reads as a village bypass.
- **Amberford** — exemplary: creek moat on the east flank, millpond lake at the
  south wall, four honest road mouths (edge harmony dries the water at the
  gate hems as designed).
- **Silverfall** — Silverspine cradle + Kingswater flank confirmed; High Road
  landing and postern untouched.
- **Saltmere** — water on three sides, road in from the dry north; authored
  coves continue outward organically.
- **Pinewatch** — Glasswater at the NW corner; Timber Road at the south gate,
  Sparway at the west gate (now arriving from the south along the dry seam).
- **Hartfell** — Graywater west, drowned bay SW, Darkwater NE; the Hartway's
  legal 11-tile beck bridge renders as a handsome railed timber span.

Live tour receipts: 20 close-zoom screenshots at every rebuilt crossing and
gate approach (rig lane #3, `PORT=8795 DB_DATABASE=arx_roads_proof`), audited
against the map-curation standard.

## Prod note

The geography ships as a `content_docs` doc under the two-hash law: a
tool-edited row wins over `geography.ts` forever. Before the production push,
confirm `GET /dev/content/geography` reports `edited:false` on the prod DB (or
revert with `DELETE /dev/content/geography`) or the new routes will not land.
