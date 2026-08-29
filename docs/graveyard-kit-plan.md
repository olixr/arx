# THE IRON REST — the graveyard kit

The yard's wall and the stones it was raised to keep. Shipped 2026-08-29;
proven live on a staged yard east of Dawnmead (grass shore, lane-9 audit
client, body-ruler + top-plane + night screenshots).

## The wall — the FIFTH run-merging family

`IronFence` (496), `IronFenceDiagNE/NW` (497/498), `IronGate` (499),
`IronGateShut` (500). Wrought spear-topped bars leaded into a granite
curb, three rails, an ornament band, a masonry pier at every corner,
tee, and run end. The separate-masonry law holds: iron merges ONLY with
its own kind (`IRON_FENCE_TILES`, `orientDiagIronFence` — the fence
family's two-stop dial law).

Laws earned in the audit passes:

- **THE OPEN-BAR LAW** — the gaps are the design: the eye and the lamp
  pass between the bars. No iron tile is ever in `LIGHT_BLOCKING_TILES`,
  and shadows cast at 0.6 (a railing is airy; a log wall is not).
- **E-W runs**: full panel to the camera — curb (lit top plane, joint
  ticks, hash moss), 8 bars/tile with two-facet spear leaves, three
  rails OVER the bars (pierced, never glued), the smith's ornament
  hash-dealt per half-tile panel (ring / S-scroll / diamond / plain —
  the first cut's facing C-pair read as an X at play distance and was
  retired), a heavier collared STANDARD at every second tile seam
  (parity-dealt). Decay is hash-rare: a bent bar (1/64), a gone bar
  with a rust weep (1/128), rust blooms at feet (1/32).
- **N-S runs**: the honest projection of a thin panel in depth is ONE
  dark band — so that is what is drawn (massed ironwork, lit west
  thread, hairline seams) with the per-tile STANDARD covering every
  joint (the wood fence's own N-S law spoken in iron). The first cut
  gave every bar its spearhead in depth and the stack read as a hanging
  chain; the audit retired it.
- **45° strides**: vertical bars stationed corner-to-corner beneath
  honestly slanted rails and a slanted curb ribbon; every diagonal tile
  anchors a pier (estate-fence cadence, proven handsome live).
- **THE GRAVEYARD GATE**: twin granite piers (stepped plinth, coursed
  shaft, molded cap with a TRUE top plane, orb-and-spike finial) under
  a wrought OVERTHROW that springs from the pier caps and carries real
  thickness — springing spirals, a crown spear flanked by curls, and
  some nights a crow ((h&7)===3) that came with the iron. Double
  leaves: swept top rails tall at the hinge, five bars each, a scroll
  heart, shield escutcheon + ring latch when shut. Rides the whole door
  machinery (material 'iron'), carved out of the wall-doorway pipeline
  like fence/palisade/hedge gates. Proven open/shut live.

## The stones

`Gravestone` (501) — THREE CUTS OF ONE TRADE: round-top, shouldered,
lancet, hash-dealt with per-stone lean, worn carved name-rows, chipped
shoulders, moss. `GravestoneTall` (502) — the monument: two-step
plinth, tapered shaft with carved band, two-facet pyramid cap; stands
PLUMB (money buys a deeper footing). `GraveMound` (503) — fresh-turned
soil (facet blob, crumb flecks, no standing shadow — it IS ground),
field-stone at the head, hash posy. `MournerStatue` (504) — PALE
weathered marble on a two-step plinth (the first cut's dark teardrop
read as a ghost; a statue is STONE first, the grief lives in the
pose): hem flare, gathered waist, sloped shoulders, cowl bowed over
the grave, small dark hood cavity (no face carved), folded-hands knot,
faint rain runnels, hash-mirrored so pairs can flank a gate.

All four ride the cached ring as statics (nothing in a graveyard
moves, and that is the point of a graveyard). Ground under the wall:
whatever walkable terrain fronts it continues beneath, fallback GRASS
(a graveyard is a lawn kept quiet); stones stand on `nearestFloor`.

## Wiring

Editor: the 'Graveyard' palette shelf (wall family first, then the
stones, plus the crypt kit's kin — sarcophagus, urns, grave candles).
Family tests mirror the palisade/hedge suites in `tiles.test.ts`.

## Placement — THE YARDS OF THE DEAD (shipped 2026-08-29, proven live)

The kit lives in the world through every placement system, each
speaking its own dialect. THE TWO-DIALECT LAW governs all of it: the
kerbed barrow is the OLD dead (fieldstone, no smith — the great
barrowfield stays untouched on purpose); the iron yard is the KEPT
dead — a wall raised by the living, rows weeded by somebody, a gate
that counts. The two never mix on one ground by accident.

- **The module shelf** (`pois/modules.ts`): `graveRank` (headstone
  ranks with hash-dealt fresh mounds and unmarked gaps), `ironYard`
  (a wrought rectangle, corners self-piering, gate standing open),
  `monumentCourt` (monument + mourner + kept candles). Every future
  dead ground composes from the same three.
- **THE IRON REST landmark** (`poi_iron_rest` / `iron_rest`, family
  dead, tiers 3-7): the flagship — walled yard with mourner-flanked
  gate, three ranks (the third half empty: room in a graveyard is a
  promise), monument court, the old tomb OUTSIDE the rail with the
  sarcophagus and the cache, the sexton's lodge with the lamp lit,
  the poor ground west, and the sexton's full walked round. Named
  wardens: The Sexton, The Gate Count, She Who Weeds the Rows, The
  Last Entry. Proven live at (951,302): herald, garrison, candles.
- **The minor find** (`find_forgotten_graves`): three stones and a
  mound at the wayside, 0.2 cache (grave goods, one tier humble),
  skeletons only after 21:00.
- **The grave-court citadel** (`stronghold_dead_gravecourt`): the
  ward pieces finally match the def's prose — grave rows in real
  stone (the CaveRubble stand-ins died), the gravefield wears its
  iron wall (THE AISLE LAW: the center aisle runs gate to back wall
  and every gap keeps its corridor neighbor — the shelf validator
  seals any yard that forgets), the processional's south rank keeps
  grave-candles, the boss court seats its cache between mourners
  under the monument, and the new `ward_dd_mournercourt` piece says
  somebody LOVED these dead. Proven live at seed 3 ("The Sunken
  Rows").
- **The chapel + cloister landmarks**: the chapel railed its east
  garth (two kerbs and a stone rank inside the iron, the third kerb
  outside it, opened, unexplained); the cloister's newer brothers
  lie in proper stone beside the founders' kerbs, the mourner
  keeping the chapel stub's office.
- **Silverfall's Silent Terrace**: the wood lych fence went to
  wrought iron running the terrace's whole south lip, both stairs
  gated; kept rows and fresh mounds between the standing stones; the
  mourner beside the one bench. No loot among the dead — the quiet
  is still the design.

**PROD NOTE (the FILE-WINS law)**: `poi_dead_chapel` and
`poi_dead_cloister` builtins changed — any deployed data dir's
seeded `data/prefabs/poi_dead_chapel.json` / `poi_dead_cloister.json`
must be deleted so boot reseeds them. New ids (`poi_iron_rest`,
`find_forgotten_graves`) seed themselves; ward pieces are internal
and never seeded.
