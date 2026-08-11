# SILVERFALL: THE CROWN REMASTER

*The grand capital, rebuilt with the intent it always deserved.*

Silverfall shipped as the first terraced town (Epic 4 of the Dawnlands
plan), got its curation pass, then its Royal Rebuild (24d51da) — but
every one of those passes patched a city that was drafted before the
game grew its castle walls, its decor kit, its watch rotas, and its
curation standard. The user's decree (2026-08-11): stop patching.
Reimagine the capital wholesale — a huge, luxurious palace castle,
heavily garrisoned, tiered and layered, premium on every level, laid
out the way a real capital would have grown.

## WHAT THE REMASTER KEEPS (the bones that already sing)

These survived three passes because they are right. They are pinned by
tests and by neighboring epics, and the remaster builds ON them:

- **The rect and the roads.** SILVERFALL_RECT (-376,-224) 176x128; the
  High Road lands at local (88,126); the Hoargate postern lane
  (x169-175, gate y88, muster yard, road mouth (172,0)) is the
  Pinereach epic's and does not move.
- **The four terraces and the Silver Stair.** L1 raise(8,4,160,92),
  L2 raise(30,6,116,58), the three 9-wide flights at x84-92 plus the
  four working side stairs. Only L3 changes shape (below).
- **The water spine.** Mirrormere -> race -> court channel -> working
  channel -> Roaring Pool, falling at every lip, foot-water law
  asserted by silverfall.test.ts. The mere shifts northeast and the
  race hugs the castle curtain, but the channel columns below L3 and
  the Roaring Pool stay where three epics tuned them.
- **The Silver Gate curtain** (garrison pass): scree ridges, drum
  towers, gate bastions, GateGarrison x86-90 y112. The Court Gate at
  y62. The approach braziers and the SILVERFALL sign.
- **The Rookery** (x31-45, y7-29): the hidden rogues' quarter, the
  Broken Lantern, the Undercroft mouth with its portal at (38,17) and
  the arrival tile from below at (38.5,20.5). No lamps, no signs, one
  alley, one back ledge. The Crown tolerates what it can watch.
- **The spawn** (88.5,104.5) = world (-287.5,-119.5), the haven
  anchor, the audio anchor, the zone registration order.
- **The Emberway and the Timberway** keep their districts and their
  buildings; they take dressing, not demolition.

## THE NEW CROWN — Castle Silverfall as a true palace precinct

The old castle was one 34x18 building with three rooms. A capital
keep. Not a palace. The remaster gives the Crown terrace a WALLED
CASTLE PRECINCT that the avenue climbs INTO:

- **L3 grows**: raise(46,10,92,27,3) — x46-137, y10-36 (was x48-128,
  y10-31). Five rows deeper, wider both flanks. The third flight
  moves to y36; the L2 court band compresses (the plaza was oversized
  anyway).
- **THE AXIS FINALLY LANDS.** Silver Gate (y112) -> Court Gate (y62)
  -> the third flight (y36) -> THE CASTLE GATE (86-90, y32). Every
  step of the climb now ends at a gate that outranks the last — the
  fortification ladder made literal. The castle gate wears the Silver
  Gate's own architecture (five-square chamfered bastions, garrison
  arch): the echo tells you the same masons built both, a century
  apart.
- **The precinct**: garrison curtain x50-96, y11-32, corner drums,
  water gate where the race passes (walls die into the banks — the
  mole law). Inside:
  - **THE KEEP** x56-95, y12-24 — one building, three ranges:
    - **The Hall of the Silver Line** (x72-88): thrones on the dais,
      twin hearths, the processional in crimson velvet, feast
      tables, the herald's lectern. Doors wide onto the bailey.
    - **The garrison range** west (x56-70): armory, the castle
      guard's barracks (hot bunks — the rota law), the castellan's
      office. Maren sleeps beside the muster rolls.
    - **The royal range** east (x89-95): the chamber and the solar,
      east windows on the Mirrormere. CarpetMoon, tapestry, the
      queen's window box.
  - **THE BAILEY** y25-31: parade flags, the well, the keep's
    forecourt — and THE DRILL YARD west (butts, racks, the
    drillmaster's ring) where the garrison trains in public view.
  - **THE CASTLE KITCHENS & STORES** south range on the west curtain:
    hearth pair, larder, the steward's table. The household staff
    works here (pooled castle_servant).
  - **THE TREASURY**: windowless stone, two crown vaults, one door,
    one guard who never chats twice.
- **The Mirrormere** shifts NE (center ~(108,16)), PUBLIC, outside
  the precinct's east curtain — the race taps its southwest corner
  and runs south along the curtain to the water gate and the lip.
  The royal range's windows look across the race at it.
- **THE ROYAL GARDEN** on the mere's south shore (public, low fence,
  open gate): flower boxes, trellis, yews, the queen's bench. Ivo
  climbs at midday to tend it.
- **THE SILVER SHRINE** moves to the public east strip (x117-137):
  pillar ring, pilgrim rest, Sella — reached by its own path off the
  crown landing. Pilgrims never pass a guard.

## THE GARRISON — the capital reads defended

Steel roughly doubles. Every post is a real rota (hot bunks, reliefs,
no gate line crossed — the town-watch laws):

- **castle_guard 3 -> 9**: throne dais pair, hall door, castle gate
  pair, treasury door, drill pair (day drill with the drillmaster,
  night wall rounds), royal range door. Sleeps in the garrison range.
- **silverfall_watch 12 -> 16**: Court Gate becomes a pair, gate
  market beat, Lantern Row lantern-hours beat, plus the existing
  posts/rota untouched (postern, muster, Silver Gate, rounds).
- **New named**: **drillmaster_jorunn** (the yard's voice, Kestrel's
  old sergeant), **steward_ansgar** (the household's ledger, feeds
  four hundred meals a week and remembers every one), **herald_ossian**
  (reads the Crown's word — hall lectern at morning, Grand Court at
  midday: his circuit down the stair is the schedule made visible).
- **Pooled castle_servant x4**: kitchens, hall, garden, laundry line.
  Lines, no dialogue (the pooled law).

## L2 — THE SILVER COURT, recut

The court band compresses to y38-52 and gets premium bones: the plaza
colonnade, the King's Arch (ArchStone over the avenue at the court's
south edge — the Silver Line's centenary), the fountain square,
crier's lectern. Bank (x44-64) and Guildhall (x106-128) rebuild on
the new band, same institutions, tighter rooms. Arcanum, chapter
house, Silver Setting, Lantern Row, and the Court Gate keep their
ground. The Rookery's scree seal and alley move south with the bank.

## DRESSING LAWS (the premium pass)

- The Crown's dye is **madder** (crimson — CarpetRoyal's cloth):
  avenue banner poles, castle pennants. Lantern Row keeps weld and
  mulberry (no two neighbors alike); the gate market flies ochre.
- BannerCrown/BannerMoon only where the Crown itself stands (castle,
  bank, assay, gates) — the sigil is not wallpaper.
- TreePine is the mountain's tree; willows only at water, yews only
  at shrine and garden.
- Exterior decor laws bind (south walls only, TRUE SILHOUETTE, one
  rail); GROVE APRON >= 2; SEAM LAW for authored snow; sealed-pocket
  law on every landing row; art-scale laws (rig = the ruler).

## LIMITS (a capital is not everything)

No crops beyond the Greenstair (Amberford farms feed it — the High
Road exists for a reason). No sawmill lumber trade at scale (that is
Pinewatch's living). No chapel (the shrine is a flame, not a pew).
The Rookery stays tolerated, never sanctioned. Livestock = the rams.

## PHASES

1. **THE PLAN** — this document. (commit)
2. **THE CROWN RISES** — silverfall.ts rebuilt: L3 extent, precinct,
   keep, bailey, mere/garden/shrine, L2 recut, wardhouse, dressing.
   Desk-audit ASCII before tests; content.test + silverfall.test pins
   updated; all six suites green. (commit)
3. **THE STEEL AND THE HOUSEHOLD** — garrison rota, new named cast,
   servants, routines, dialogues, VOICE cards. (commit)
4. **THE WALK** — live rig tour at gameplay zoom, curation fixes,
   screenshots, memory. (commit)

## AS-BUILT LEDGER

*(filled as phases land)*
