# EXTERIOR DECOR — THE OUTWARD FACE
### The house learns to greet the street: awnings, hangings, signs, wall gardens, and porches
*Drafted 2026-08-01 from a three-lens code audit (prop inventory + animation, buildable/variant/protocol systems, wall-face + deck render hooks).*
*Status: PROPOSAL — awaiting green light.*

---

## Part I — The review: what the exterior owns today, and where it goes quiet

Every interior in Arx has been through the furniture v2 bar; every wall through the
chinked-course and running-bond laws; every deck over water through six rounds of the
dock epic. But step OUTSIDE a building and stand on the street: the space between the
wall face and the road is nearly empty vocabulary. The audit found the bones are
excellent — the two-beat cloth law, the wind field, the wall-face hook, the deck kit,
and the veil system are all shipped and proven — but almost none of it is *reachable by
players*, and the roster of exterior pieces is thin.

### What exists (the inventory)

**Freestanding waymarks** (all in `objectItem`'s switch, `renderer.ts:16292`):
- `BannerPole = 92` (`renderer.ts:19094`) — **the reference primary/secondary cloth
  implementation**: the hoist swings as one, the tails trail a beat behind
  (`renderer.ts:19148-19150`). Four hash-dealt colors, player never chooses.
- `HangingSign = 93` (`renderer.ts:19192`) — freestanding post; shingle swings on ropes
  with a lagged bob. `Signpost = 138` — static by law ("a driven post does not sway"),
  carries editable text via `signHasText`.
- `FlowerBox = 94` (`renderer.ts:19370`) — the planter box; five blooms nod out of
  phase, per-bloom hash palette. Buildable (`flower_box`, L9). 17 authored placements
  across five towns, always flanking doors and windows.
- `LampPost = 39` — flame flicker + collect-time glow (the candle law,
  `renderer.ts:3600-3615`, bloom rides the fixture via the projAir divide-out).
- `MarketStall = 91` (`renderer.ts:18926`) — run-merged canopy, six hash-dealt cloths
  (`STALL_BANNERS`), 4-per-tile seamless stripe law, scalloped valance with per-tooth
  wind phase. **The only prop wired to the real wind field** (`windAtInto`,
  `renderer.ts:18963`); every other cloth prop runs a standalone sine.

**Wall-hung details** — `Detail.BannerCrown/BannerMoon/Tapestry` (12-14), painted by
`wallHangings()` inside the wall face pass (`renderer.ts:5979-6135`): two-beat sway,
contact shadow onto the masonry, multi-tile tapestry merge, and the height-shed law
(`if (whT < 1.9) return` — a veiling wall drops its rod before the crown swallows it).
**Authored-only.** The comment at `tiles.ts:376` is the standing law: "players place
solid prop tiles, never detail."

**The porch that almost exists.** `Tile.WoodFloor` renders outdoors unconditionally
(`drawPlanks`, `terrain.ts:3066` — no enclosure or water test; outdoors it falls back
to the oak skin). `RailWood` is documented as "porches, jetties, balconies"
(`tiles.ts:93`), `PillarStone` as "porches, colonnades" (`tiles.ts:91`), and
`OUTDOOR_AND_FLOORS` carries the comment "porch railings / pillars can rise from a
finished deck" (`buildables.ts:61-62`). Dawnmead's Fen porch is composed exactly this
way (`dawnmead.ts:85-109`). So a porch today = flat floorboards at grade with no edge
thickness, no step, no fascia, no roofline — a floor mat, not a deck.

### The gaps (why exteriors read dull)

1. **Players can hang nothing on a wall.** The entire wall-hung system — the best
   cloth animation in the game — is closed to the building system. The detail layer
   has no build lane, no persistence, no patch message.
2. **There is no awning anywhere.** The word appears only as prose inside the market
   stall painter. No shopfront in five towns has a canopy that isn't a full stall.
3. **No wall plants.** `trellis` greps to zero hits in the monorepo. The FlowerBox
   sits on the ground; nothing climbs, nothing hangs from an eave.
4. **No wall-mounted signage.** `HangingSign` is a freestanding post. The classic
   bracket-and-shingle over a shop door — the single strongest "this building is a
   place" signal in folklore townscape — does not exist.
5. **Porches have no identity.** No lift, no fascia, no step ceremony, no post-and-
   awning composition. The deck kit (DOCK_LIFT, `paintDeckBoards`, apron law, rail
   items) is six rounds deep and water-gated — none of it serves a house.
6. **Variant poverty, and none of it chosen.** Banner pole: 4 hash colors. Stall: 6
   hash cloths. Wood skins: 4 hash-dealt per building. Rugs: 6 hash palettes. The
   player's ONLY placement dial in the whole game is `orient` on corner pieces. The
   one player-chosen-variant precedent is the cloth colorway system
   (`defs.ts:1780-1860`) — each dye lot a separate item id sharing one painter.

### The constraint that shapes everything

**TILE-IS-THE-STATE.** `built_tiles` is `(tx, ty, tile, owner, prev_tile)` — no
metadata column. `TilePatch` is `{tx, ty, ground}` — 10 bytes. A variant must live in
the tile id, or in the detail layer (which chunks already stream as u16 but which has
no patch message and no persistence). Tile ids 155+ and Detail ids 15+ are entirely
free, u16 on the wire, no reserved-range convention.

---

## Part II — The design: two honest lanes and one dye law

### THE TWO LANES LAW
Every exterior decor piece is one of two things, and each gets the lane its geometry
demands:

- **It OCCUPIES a tile** (awning over the street, porch deck, timber post): it is a
  **Tile**, placed through the existing build pipeline, TILE-IS-THE-STATE, zero new
  persistence. Variants are **banded tile ids** with `info()` helpers, the
  `diagWallInfo` precedent.
- **It HANGS ON a wall** (banner, bracket sign, trellis, wall basket): it is a
  **Detail** on the wall's own tile — the shipped `wallHangings` hook, which already
  solves sorting (inherits the wall's `sortY = ty+1`), veil-shedding, contact
  shadows, and the multi-tile merge. Wall × decor as tile ids would be a true product
  explosion (2 materials × windows × diags × N decors); the detail layer exists
  precisely so it isn't.

The second lane requires opening the detail layer to players — **a deliberate
amendment to the "players never place detail" law**, done properly: a `DetailPatch`
message, a `built_details` table, salvage, and ownership. The old law was scoped to
"keep TilePatch/built_tiles untouched"; this epic gives detail its own first-class
build lane instead of bending the ground lane.

### THE DYE LAW
**Shape is structure; color is dye. Ten dyes, one roster, everywhere.** A single
`DYES` table (content) names ten cloths in Dawnlands diction:

> madder (red), woad (blue), weld (gold), ivy (green), mulberry (plum), ochre
> (earth-orange), linen (undyed cream), charcoal (iron grey), moss (deep green),
> rose (pale pink)

Every dyeable piece carries its dye in its id band: awning ids = `AWNING_BASE +
shape*10 + dye`; wall banner details = `WALL_BANNER_BASE + dye`. One painter per
shape reads the dye index into a palette; helpers (`awningInfo`, `wallHungInfo`) are
test-pinned like the diag-wall truth table. The build tray gains a **swatch row**
(remembered per buildable, like recents) — no new keybinding, ONE KEYMAP untouched.
`C2SBuild` gains an optional enum-validated `dye` field (protocol bump); the server
resolves buildable + dye → concrete tile/detail id. Hash-dealing remains the law for
*authored ambience* (stall cloths, wood skins); dye choice is the law for
*player-placed* cloth. Ten dyes × four awning shapes = forty looks per street, and no
two neighbors need repeat.

### The roster (all bespoke, all to the laws)

**1. Awnings — the marquee piece.** A walkable prop tile placed on the street row;
footing law: a wall/window/doorway tile directly north (server-validated, ghost
reason-chip "needs a wall behind it"). Four shapes:
- *Shed awning* — plain sloped canvas on two timber brackets; the workhorse.
- *Market awning* — sloped canvas with the scalloped valance (the stall's teeth,
  re-cut for a house).
- *Board awning* — flat timber-slat rain roof on knee brackets; takes the building's
  WOOD SKIN, dye colors only a painted trim stripe on the fascia.
- *Bowed awning* — barrel-curved canvas, the grand shopfront.

Painter laws: the canopy is a **foreshortened top plane** (2.5D top-plane law — the
slope reads because the near edge sits deeper); the hem **clears the head** of a body
standing under it (STALL ARCHITECTURE LAW, hem ≥ ~2.05 tiles); brackets bolt into the
wall face and read the wall's skin trim; runs of same shape+dye **merge into one
cloth** (stall run-walk + 4-per-tile seamless stripe law; a dye change breaks the run
deliberately); canvas samples the **real wind field** (`windAtInto`) — broad shimmer
on `wind.l`, valance teeth a beat out of phase, gust response; `castEdgeQuad` shadow;
`effectiveGround` bakes the street through under it (walk-through structure law);
sortY per the stall grammar (`ty + 0.78`) so a body under the awning stands in shade
and a body south of the drip line passes in front. Live-drawn (never ring-cached —
cloth moves every frame).

**2. Wall hangings — the second layer.**
- *Wall banner* (×10 dyes) — vertical cloth off an iron rod, the authored
  BannerCrown grammar opened to players; two-beat sway, sheds with the veil.
- *Pennant string* (×10 dyes) — a swagged line of small triangle flags under the
  eave line, per-flag phase like the valance teeth; the festival read.
- *Bracket sign* (×8 trade motifs) — the folklore shingle on a wrought bracket arm
  (arm foreshortened per the top-plane law, sign swings on two rings with the lagged
  bob from HangingSign). Motifs are carved-and-painted, readable at scale: **mug,
  loaf, blade, fish, sprig, boot, bed, hammer**. A player marks their smithy a
  smithy. (Content boundary honored — no occult motifs, ever.)
- *Trellis vine* (×3 species) — a timber lattice with a climbing plant: ivy, madder
  rose, hopvine. Flat on the face (face-mounted is the one legal elevation read),
  leaf-tip flutter via `windScalarAt`, blooms twinkle per the beacon law. The
  "plants on the outside of walls" ask, answered.
- *Wall basket* — a hanging basket on a bracket, FlowerBox's bloom vocabulary
  airborne; nods with wind, per-bloom hash mix.

All five: new `Detail` members in banded ranges, membership in `WALL_HUNG_DETAILS`
(terrain bake skips, wall painter owns), branches in `wallHangings`, and the
height-shed thresholds so **decor rides the veil by height, never alpha** (walls sink,
they never fade — `reveal.ts:20`).

**3. The porch — the deck comes ashore.**
- `Tile.PorchDeck` — a **lifted** timber deck (DOCK_LIFT 0.22) on dry land. New
  predicate `isPorchTile` (pure tile test — the water-gate stays on docks); one new
  branch in `renderLift`, and *everything* rides it for free: bodies, drops, rails,
  flower boxes, lamp posts, pets (that is the whole power of the one-function law).
  Boards via `paintDeckBoards` with a `'porch'` family tones entry — the ONE board
  painter stays the one board painter. Fascia + rim joist at exposed edges; a step
  course at edges meeting walkable ground (the bank-apron kit, minus water).
- **THE DECK TAKES THE HOUSE'S WOOD**: a porch touching a building inherits its
  WOOD_SKIN region (the FLOOR SKIN LAW's sampler, extended one probe outward); a
  freestanding deck deals oak. Four looks for free, always matching the house.
- `Tile.TimberPost` — a hewn wooden porch post (PillarStone's stance, cottage
  diction), skinned to its region, walk-around body, outlined per the architecture
  outline law. Carries nothing structurally — posts are furniture, not physics.
- Grade-level `WoodFloor` patios remain legal and untouched (cheap path stays cheap).
- Composition, not new systems: RailWood on the deck edge, FlowerBox at the rail,
  LampPost at the step, shed awning off the wall above — the porch is the roster
  proving it composes.

**4. The upgrade pass on shipped props** (the standards sweep the user asked for):
- Banner pole and hanging sign move onto the **real wind field** (one gust rolls
  down a street; calm reads calm) — `windOverride` kept for bakes/tests.
- Banner pole joins the dye system (player-built poles carry chosen dye via the
  banded-tile lane; authored poles keep hash-dealing).
- Shadow + contact audit: every new piece gets `castEdgeQuad` or a masonry contact
  shadow; nothing floats.
- Night pass: bracket signs and awnings catch lamp glow; a porch LampPost pool
  reads as THE porch light (all collect-time, candle law).

### What we deliberately do NOT build
- **Shutters** — window tiles already paint them as dressing (`renderer.ts:5759`);
  a dye option can ride the wall-hung lane later if wanted.
- **No new roof layer** — awnings are canopies bolted to faces, never a return of
  the removed roof render (law 7295988 stands).
- **No painted-on height** — the board awning is a real cantilevered plane, not a
  facade stripe (law 284a04e stands).
- **No per-player pity/state dials on anything** — dyes are choices, never drops
  with dials (flood-law da3a5b7 untouched).

---

## Part III — The phases

Each phase lands complete with tests + a live screenshot audit (body-ruler bar +
top-plane check per the art laws; character stood beside every new piece at noon and
night). All player-facing names through VOICE.md (dash ban, Dawnlands diction). All
salvage per the ceil-half SALVAGE LAW. Commit after every phase.

**Phase 0 — THE SECOND LAYER (foundations). SHIPPED 2026-08-01.**
As built: detail bands at DETAIL_BAND-16 stride (WallBanner 16 / Pennant 32 /
BracketSign 48 / Trellis 64 / WallBasket 80) + awning tile bands (shed 160 /
market 176 / board 192 / bowed 208, defs generated from the four anchors);
`wallHungInfo`/`awningInfo`/`awningTile` + per-family builders, truth-table
tests; `WALL_HUNG_DETAILS` now GENERATED from `wallHungInfo` (the set and the
reader cannot disagree); content `DYES` roster (linen0..rose9) pinned to shared
`DYE_COUNT`. Wire: `DetailPatch` binary type 4 + `ChunkStore.setDetail`,
protocol 27→28. Persistence: `built_details` (migration v24, LAYER-LAW shape),
accounts CRUD, worldSource `builtDetails` map + owner index + regen reapply
(after overlayZone, so a hanging on an authored town wall survives), boot
replay. Server: `setWorldDetail` broadcast, `hangDetail`/`removeHanging` with
**THE HANGING LAW** — footing = `HANGABLE_WALL_TILES` (plain full walls + the
garrison curtain ONLY; doorways/windows/45° corners refuse because their
painters never run the hangings pass — a detail there would be invisible
orphan state) presenting an unburied south face, empty or own-hung only,
re-hang keeps the FIRST hang's prev (depth-1); demolish drops the hanging with
the wall (record, row, and patch — pinned in demolish.test). `C2SBuild.dye`
enum-sanitized like orient, `BuildAction.dye`, tickBuild resolves awning
anchor+dye → placed tile. Dev levers `/hang kind[:variant] [tx ty]` +
`/unhang [tx ty]` drive the REAL lane. Client: DetailPatch decode → world
setDetail + neighborhood rebake + `onDetailChange`.
DEVIATION: `BuildableDef.detail?` deferred to Phase 2 — it ships with its
consumers (tray/ghost/salvage) rather than as a dead field.
PROVEN: 4 suites green (shared 188 / content 394 / server 349 / client 337);
live round-trip on the dev rig — tapestry hung on a Dawnmead stone wall via
the lane, rendered by the shipped wallHangings pass, DB row in built_details,
survived a full relog through the chunk stream, removal bared the face and
cleared the row.

**Phase 1 — THE CLOTH TAKES THE STREET (awnings).**
40 banded tile ids + generated TILE_DEFS entries; four painters to the laws above;
buildables (`awning_shed` L10 / `awning_market` L14 / `awning_board` L12 /
`awning_bowed` L20 — boards + canvas + the dye's pigment, canvas = new loom recipe
from flax); tray swatch row + piece-true ghost showing exact shape+dye; footing
reason chip; Map Studio palette group; `effectiveGround` + walk-through; run-merge.
Proof: a five-shop street with five different awnings, one gust rolling down it.

**Phase 2 — THE WALL TAKES A HANGING.**
Wall banner, pennant string, bracket sign, trellis vine, wall basket — `wallHangings`
branches, veil-shed thresholds, buildable entries (banner L13, pennant L11, sign L13,
trellis L9, basket L9), re-dye/re-motif interaction on owned decor (pigment cost,
DetailPatch swap — no rebuild). Proof: hang all five on one cottage, veil-walk
through the door and watch them shed in order; sign motifs readable at zoom 1.15.

**Phase 3 — THE PORCH.**
`PorchDeck` + `TimberPost` tiles, `isPorchTile`, `renderLift` branch, `'porch'`
board family, fascia + step course, skin inheritance, buildables (`porch_deck` L8,
`timber_post` L6), rails/props riding the lift verified. Proof: rebuild Fen's
Dawnmead porch as a true lifted deck with rail, post, awning, and lamp — screenshot
beside the old grade-level version.

**Phase 4 — THE WIND REMEMBERS THE STREET (unification + polish).**
Shipped cloth props onto `windAtInto`; banner-pole dye lane; shadow/contact audit;
night lamp-glow pass; perf audit (live cloth counts vs ring-cache exemptions —
budget: no measurable frame cost at a 12-awning street, 120fps held).

**Phase 5 — THE TOWNS DRESS UP (authoring).**
Awnings, bracket signs, trellises, pennants, and porches authored across Dawnmead,
Amberford, Silverfall, Pinewatch, Saltmere per each town's voice card (Silverfall
bowed + weld; Saltmere shed + woad, salt-faded; Pinewatch board awnings under snow
load; Amberford market pennants); teaching crumb off a maker NPC ("Who hangs a sign
for me?"); full five-town before/after screenshot ledger.

### Open decisions for green-light
1. **Pigment economy**: dye pigments as real material costs per the cloth-colorway
   precedent (berries → madder etc.), or free choice at placement? Proposal: real
   pigments, linen free — it feeds foraging and matches the economy's grain.
2. **Pennant string** placement grammar: per-wall-tile detail (merges like tapestry)
   vs a two-anchor rope — proposal: per-tile detail, merge law handles the swag.
3. Whether authored MarketStall cloths join the dye roster now or stay at six.
