# THE WOOD LEARNS TO BREATHE — forest placement rework (as-built, 2026-09-05)

The owner's brief: the forests are too dense to read or walk — "half
to a third as dense", spaced the way trees actually grow (they weed
each other out), with natural clustering, glades, and a dressed floor
between the trunks, built as layered passes instead of one procedural
brush stroke. This document is the audit, the law, and the proof.

## 1. THE AUDIT — what the old wood was

`generateChunk` (content/worldgen.ts) dealt every forest-class tile
(moisture > 0.62) ONE independent coin:

    treeDensity = 0.10 + (moisture − 0.62) × 1.4
    roll < treeDensity → a tree

White noise, tile by tile. Measured on the shipped seed (24601) over a
91 × 51 chunk sample (3.7M land tiles, 1.1M forest tiles):

| moisture bin | tree share of forest tiles | trunks touching another trunk |
|---|---|---|
| 0.62–0.70 (fringe) | 10.8% | 70% |
| 0.70–0.80 (mid) | 19.6% | 91% |
| 0.80–0.90 (deep) | 28.3% | 98% |
| > 0.90 (core) | 40.3% | 99% |
| meadow (lone trees) | 1.0% | 12% |

Crown half-widths in the tree grammar run 1.0–2.0 tiles, so at
20–40% tile occupancy canopies stacked three to five deep. The named
woods read the same: Thornveil 20%, Pinereach 26%, Everwood 30%,
Dawnmead's east wood 26% of forest tiles were trunks, 89–94% of them
touching. There was no spacing law of any kind, no glade, no floor
between trunks beyond the herb and chest rolls, and the meadow's
"lone" trees were a uniform 1.5% speckle. The client paid for it too:
render round 8 measured a 577-tree forest at 44× screen coverage,
mostly canopy hidden behind nearer canopy.

Everything downstream reads the fields, not the trees: `groundProbeAt`
(POI/wild/find siting) classifies by moisture alone, the growth ledger
keys on coordinates and re-aims on truth, roads fell their shoulders
after the deal, the scorch re-reads whatever stands. So the tree deal
could be rebuilt whole without touching a siting law.

## 2. THE LAW — three layers (content/forest.ts)

**Layer 1 — THE STAND FIELD.** A slow noise (freq 0.05, ~20-tile
wavelength — the scale of a copse and a clearing) plus a finer gap
wobble. A stand gate (`standGateAt`) turns it into "how closed the
wood is here", with the glade threshold sliding on damp: a fringe
(moisture just over the line) opens into glades below stand 0.50, a
core only below 0.30. Moisture still names the biome; the stand field
composes it — copse-and-clearing country at the edge, closed canopy
at the heart, and glades in both.

**Layer 2 — THE ELDERS (the canopy).** A jittered lattice: one
candidate trunk per 2×2 cell, placed inside its cell by hash so no
row ever reads, with a vigor the jitter bits never touch. The
candidate stands if its vigor clears the canopy cover at its tile
(`canopyCoverAt` = stand gate × (0.75 at a fringe → 1.0 at a core)),
and then THE WEEDING: any TOUCHING candidate (8-neighbourhood) that
also clears its cover and is stronger kills it. The rule is symmetric
and purely local (eight neighbouring cells), so two elders can never
touch — of any touching pair exactly the weaker dies. That is the
whole spacing law: trunks land ~3.3 tiles apart in a closed core,
crowns 2.7–4 tiles wide still meet overhead (the natural wall), and
every tree reads as its own tree.

**Layer 3 — THE FLOOR.** Every non-elder forest tile keeps the old
herb/chest deal first, thresholds untouched (sagewort 0.008, moonbell,
fibre, the traveller's chest) — the forager's economy is the same
tile for tile. Then the floor is dealt by its SEAT:

| seat | how it's found | the deal |
|---|---|---|
| shade | an elder touches the tile | leaf litter under 42% of the grass, mushrooms, a suppressed sapling 1.2%, thicket 3%, a mossy boulder, and in old wood the stump the weeding left (0.6%) or a standing snag (0.3%) |
| gap | inside a closed stand, no crown touching | bracken 15%, litter 12%, young trees colonizing the light 3% (succession, told in tiles), thicket 7%, flowers and tufts |
| glade | the stand gate < 0.15 | meadow flowers and tufts, a rare pioneer sapling, a little bracken at the rim |

Saplings are the species the elder deal would have dealt on that tile
(`saplingOf`), so an oak wood's youngsters are oaks. Stumps and snags
are gated to damp > 0.5 (old wood only). The road carve and the scorch
learned the new floor: shoulders fell saplings and snags with the
trees, and the burn kills them with the canopy.

**THE TALL CROWN.** A pine spire stands 4.4–5.7 tiles and projects
north over everything behind it, so at broadleaf spacing the first
Pinereach shot still read as a wall (4.6% trunks). Cover now carries a
cold term: where the pine takes the stand (cold 0.5 → 0.9) cover thins
by half and the glade threshold rises 0.18 — the taiga is a wood of
clearings and bogs, not one closed dome. (A 35% thin was shot first:
the closed heart still held 9% trunks live and read as a wall.)
Pinereach heart 26.4% → 2.7%, Pinereach south 2.1%; the Thornveil
(warm) 5.8%, the Everwood (cold 0.44, pine fringe only) 7.2%.

**The meadow's trees** ride the same lattice-and-weeding law on a 5×5
cell: cover 0.62 where the stand field crests (copses of three to
six), a 0.045 floor elsewhere (lone sentinels). A field tree refuses
any tile touching the forest line so the two registers never touch.
**Highland** trees (plateau meadow) ride a 4×4 lattice at 0.30 —
spaced windswept scatter, no copse composition up in the wind.

**Two new floor details** (shared Detail 182/183): `LeafLitter` — three
to six hash-dealt russet/ochre lozenges with seat seams and midribs,
edge to edge so drifts straddle borders; `Bracken` — two or three
bowed fronds from one root carrying alternating filled pinnae, dark
low and lit at the tip. Both painted in the terrain bake
(client/render/terrain.ts), registered in the Studio palette and the
museum. The grass coat (`grass.ts`) folds detail ids to a 3-bit code
at its cache door (the numeric key only held three bits — ids ≥ 8
would have aliased) and starves the nap to its floor under litter, so
the wood's floor is not the meadow's.

**Cost.** `generateChunk` memoizes moisture and the elder verdict over
the 3-tile margin (`Mo`, `isElder`), sampled at most once per chunk
and only where a tree question is asked. Moisture samples per chunk
rise from 256 to at most 484 in solid forest; the margin covers every
reach of the law (a shade check looks one out, that neighbour's
weeding one further).

## 3. THE CENSUS — after

Same sample, same seed (`forest.test.ts` pins every row with room):

| moisture bin | before | after | ratio | touching |
|---|---|---|---|---|
| fringe | 10.8% | 5.4% | 0.50 | 0 |
| mid | 19.6% | 6.1% | 0.31 | 0 |
| deep | 28.3% | 7.7% | 0.27 | 0 |
| core | 40.3% | 9.3% | 0.23 | 0 |
| meadow | 1.0% | 0.4% (in copses) | — | 0 |

Overall trunks per forest tile 20% → ~6.5% (a third), the cores
thinner than a third and the fringe keeping half (the edge thicket was
never the clutter; the stacked cores were). Under the strict no-touch
law a closed core tops out near 9–10% — that IS a closed canopy at
this crown scale; the floor's saplings, thickets, snags and stumps
carry the visual mass the trunks gave up. Every dial is in
`FOREST_LAW` (content/forest.ts) with the sweep that chose it:

| coverCore / coverFringe / gladeCore / gladeFringe | fringe | mid | deep | core |
|---|---|---|---|---|
| 0.78 / 0.30 / 0.36 / 0.56 | 2.5% | 3.7% | 5.6% | 7.2% |
| 1.0 / 0.45 / 0.36 / 0.56 | 3.2% | 4.5% | 6.5% | 8.3% |
| 1.0 / 0.60 / 0.30 / 0.52 | 4.5% | 5.5% | 7.4% | 9.3% |
| **1.0 / 0.75 / 0.30 / 0.50 (shipped)** | 5.4% | 6.1% | 7.7% | 9.3% |

Yew's share of the species deal rose 0.025 → 0.04 so the bowyer's find
stays a find per league with a third of the trunks. Willow, pine and
oak shares are the old ones.

## 4. THE MAP RESPECTS IT

The world is procedural and chunks are never persisted: every chunk
regenerates under the new law on the next server boot, prod included
— no `db:refresh` is needed (the seed, the fields, and every siting
law are unchanged). What persists by coordinate and how it reads:

- **Growth ledger rows** (felled trees, sown saplings): a row whose
  truth tile is now grass ripens DRIFTED and keeps its tree ("the row
  IS the tree") — a felled tree still regrows where it was felled.
  Germination counts live crowns in reach, so regrowth is a little
  slower in the thinner wood: honest.
- **POI anchors, wild sites, finds, built tiles, fog**: keyed on the
  fields and on coordinates, none of which moved.
- **Authored zones** (towns, prefabs, the Dawnmead copse): hand-placed
  trees, untouched. `pinewatch` still counts its 300 pines.
- **Pins re-tuned**: server `worldgen.test` "taiga stands north" floor
  40 → 15 pines in its 3200-sample window (dominance law unchanged).

## 5. THE PROOF

- `content/forest.test.ts` (10): fields in bounds; lattice candidates
  inside their cells; THE WEEDING under an adversarial cover field on
  cells 2/3/5 — zero touching pairs; chunk purity and no touching
  across chunk seams; the shipped sample — zero touching trees, the
  density bands, litter under crowns / bracken in gaps / saplings
  between, the herb share held, meadow copses, the taiga's pine share.
- Server `worldgen.test` 27/27, `edgeHarmony` green; client grass and
  terrain-fold suites 65/65; four-package tsc clean.
- Live rig (fresh DB `arx_forest`, server :8797, vite :5297): the
  Thornveil core, a fringe wood, the Pinereach, and a meadow copse
  shot in the real client — see the session notes.

## 6. DEBTS AND DIALS LEFT ON THE BENCH

- Paired trunks (a rare touching twin) were deliberately NOT allowed:
  the grammar already forks trunks inside one tile, and the clutter
  complaint was exactly the touching pair.
- The 3D client paints tiles from the same chunk, so it inherits the
  spacing for free; the two floor details have no 3D painter yet (the
  ground bake carries them there as it does in 2D).
- A forest-edge "mantle" (denser shrub at the wood's rim) is a
  natural next layer once a shrub tile exists that isn't a forage node.
