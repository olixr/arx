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

**Phase 1 — THE CLOTH TAKES THE STREET (awnings). SHIPPED 2026-08-01.**
As built: four painters in one banded `awningItem` (renderer routes all 40 ids
through `awningInfo`, never forty cases): rod bolted ~1.95 tiles up the host
face, hem 1.58-1.7 tiles high at 0.65-0.85 tiles south — a true foreshortened
plane with **THE TRAPEZOID CUE** (hem spreads ±0.16s toward camera; without it
the canopy reads as a wall decal — the pass-1 verdict); market keeps the
4-per-tile seamless stripe law + scalloped valance with per-tooth wind phase;
shed wears a breathing drop band; bowed carries a barrel-bulge hem arc + rib
seams + crown-light curvature; board = three chunky WEATHERED slat courses
(shade(skin,-16/-8) — fresh-lumber-on-lumber camouflaged into the wall, the
pass-2 verdict) + rafter tails + dyed fascia. All cloth samples `windAtInto`
(gusts roll down a street), `castEdgeQuad` shadow at the drip line, struct
outline on exposed silhouettes only, sortY ty+0.78 stall grammar, live-drawn.
**THE VEIL LAW ONE TILE OVER**: the painter sheds when
`wallHeightAt(host) < 1.99` or the host stops being a host. **THE CANOPY
FALLS WITH ITS WALL** (server): demolishing a host wall drops the hosted
awning — record, fx, ceil-half salvage as an unowned ground pile (the wall's
owner may not be the canopy's), test-pinned. Footing = `AWNING_HOST_TILES`
(full walls, glazing, straight doorways; corners + garrison refuse), enforced
at build start, completion, ghost, AND drag-queue (runs skip gaps
wordlessly). Pigments: `DYE_PIGMENTS` (berries→madder, moonbell→woad,
sunflower→weld, sagewort→ivy/moss, pine_resin→ochre, coal→charcoal; linen
free) validated + consumed beside materials, never salvaged (spent color).
Buildables on the new **decor** shelf: shed L10 / board L12 / market L14 /
bowed L20 (existing `cloth` item is the canvas — no new loom recipe needed;
the plan's "flax canvas" was already woven). UX: tray dye-swatch row (ten
dots, picked ringed gold, remembered across pieces), pigment need-chip, ghost
lands the exact dyed id with 'Needs a wall behind it' chip, dyed ghost color;
`DYE_SWATCHES` in icons.ts = the ONE client color truth (renderer cloths
derive from it); awning glyph + 4 icon entries; Map Studio 'Awnings' shelf
dealt from the band math; footsteps sound the street beneath.
**THE WHITELIST LESSON (protocol)**: `parseC2S` rebuilds every message from a
field whitelist — the dye dial died silently on the wire until it joined the
build case (validated 0..DYE_COUNT). Pinned in messages.test.ts: EVERY future
C2S field must join parseC2S or it never existed.
PROVEN: 4 suites green (shared 190 / content 394 / server 351 / client 337);
three visual iteration passes (staged 4-shape × dye lineup on a wood-wall run,
noon + night, run-merge + dye-break verified); live on the dev rig — woad shed
and madder market built through the full pipeline on Dawnmead's cottage
(pigment counts fell exactly, refusals spoke: dye-wants-pigment, wall-behind,
someone-in-the-way), demolish salvage lines confirmed, and the cottage's
street face wears shed + market + bowed in the final frame.

**Phase 2 — THE WALL TAKES A HANGING. SHIPPED 2026-08-01.**
As built: `BuildableDef` gained the deferred `detail?` lane (`tile` now optional —
exactly one of the two, test-pinned; BY_TILE filters, `buildableForDetail` is the
dye/motif/species-blind reverse fold, royals fold to nothing). Five defs on the
decor shelf: trellis L9 (board×3), wall_basket L9 (board+twine), pennant_string
L11 (cloth+twine×2), wall_banner L13 (cloth×2+board), bracket_sign L13
(board×2+iron_bar). Server: build()/tickBuild hang branches on the shared
`hangFaceOk` law (extracted — dev lever, build lane, and completion all one
gate); `hangVariant` clamps narrow rosters (motifs 8, species 3) to anchor
instead of throwing; **THE RE-DYE DISCOUNT**: re-dressing your OWN hanging of
the same family waives materials, costs pigment only, and grants NO xp (a
pigment-cheap swap must never become an xp faucet) — proven live: banner
madder→rose cost exactly 1 berry, 0 cloth, 0 boards. **Removal = the demolish
lane**: the hanging is the TOP layer (comes down before the wall could), quiet
(no collapse fx — a banner is lifted, not felled), ceil-half salvage, prior
detail returns; a wall-fall now spills its hanging's salvage as an unowned
pile; `ownbuilt` answers BOTH layers. Painters: wallHangings dispatches via
wallHungInfo — player banner (swallowtail + woven diamond, two-beat), pennant
swag (quadratic rope, four flags alternating dye/cream, per-flag phase),
bracket sign (wrought arm + mount plate + scroll curl, shingle swinging with
the lagged bob, EIGHT carved motifs readable at street zoom: mug loaf blade
fish sprig boot bed hammer), trellis (lattice + species vine: ivy/rose-with-
glint-blooms/hopvine-cones, fluttering leaf tips), wall basket (peg + rope +
wicker bowl + FlowerBox bloom mix, slow pendulum). Studio: flat-map glyphs for
every family (dye-true via DYE_SWATCHES) + all 32 details on the palette,
dealt from band math. Tray: generalized variant row (dye dots OR named chips
for motifs/species, each family remembering its pick); hang ghost mirrors the
face law ('No wall face' / 'Cloth already hangs') and prices the re-dye
discount honestly; drag-run dresses a wall run, skipping refusing faces.
PROVEN: 1275 tests green; staged five-family lineup (all variants) + close-up
motif readability; live on the cottage — banner hung (pigment fell exactly),
re-dyed for one berry, hammer sign + rose trellis landed exact banded ids,
trellis torn back down for 2 boards, rows in built_details.
DEVIATION: none — the phase shipped whole.

**Phase 3 — THE PORCH. SHIPPED 2026-08-01.**
As built: `Tile.PorchDeck = 155` + `Tile.TimberPost = 156` (157-159 stay
reserved for the wing's kin). The deck rides `DOCK_LIFT` via a pure tile test
— no water gate — through ONE `renderLift` branch, and everything stands on
it for free. **THE CARRIED DECK rule**: porch furniture (RailWood,
TimberPost, LampPost, the 80-99 prop family) laid ON the deck replaces the
tile but keeps its decking and its lift when a PorchDeck cardinal adjoins —
`isPorchSurface` in terrain (bake) and a closure-free `porchAt` mirror in the
renderer (renderLift is HOT; a per-call sampler allocation is real garbage —
measured, inlined). Boards via `paintDeckBoards`'s new `'porch'` family
(tones override param; the ONE board painter stays the one board painter),
long E-W planks parallel to the facade. **THE DECK TAKES THE HOUSE'S WOOD**:
the connected patch floods (capped 64) for an adjoining wall run and wears
that building's floorTones — one skin per patch, cached per bake; no wall =
dock-neutral. Dressing per the masterwork laws: rim-joist fascia with
squared footing blocks, a full-width tread step onto walkable ground
(ringed), root shade at the house join, flat-art standing AO south, and the
bake-time architecture ring on exposed edges only. `TimberPost` painter =
squared plinth / shaft with sun-law lit facet + peg band / cap with
foreshortened top plane, ONE ring around the stepped silhouette, static ring
caches, slim mass so it never blocks lamplight. Content: `porch_deck` L8
(boards×3, foundation) + `timber_post` L6 (ONE WHOLE LOG — the
milled-and-whole law, allowlist-pinned); **PorchDeck joins FLOORS** so
chairs, benches, rails, lamps, flower boxes AND awnings all accept the deck
as footing (lamp_post gained floors for the porch-lamp classic);
`nearestFloorTile` learned the deck. Server: THE PORCH LAYER — demolishing a
rail off the deck restores and RE-REGISTERS the deck (Wood/StoneFloor law
extended, test-pinned AND proven live: rail over deck, torn down, deck 155
returned). Editor palette + icons + wood footsteps wired.
PROVEN: 1276 tests green; staged full composition (deck 6×2 off the cottage
with rails, post, lamp, flower box — every piece riding the lift, body on
the boards) + live build-lane proof (deck/post/rail built, layer law live);
fps dip investigated and cleared as environmental (rAF probe far from any
porch read identical — the porch costs nothing measurable).
NOTE: walking onto the deck snaps the 0.22 lift like the shipped docks; a
step-blend can ride Phase 4 polish if it ever reads rough in play.

**Phase 4 — THE WIND REMEMBERS THE STREET. SHIPPED 2026-08-01.**
As built: **ONE BREEZE** — `breezeAt(tx,ty,t,ph,s,ampA,ampB)` on the
renderer samples the real wind field once and blends it half-field/half-voice
(a gust rolls down the whole street together; no two cloths move in
lockstep), returning the two-beat pair (sway + lagged beat) plus gust. All
NINE standalone-sine sites now breathe it: banner pole hoist/tails, hanging
sign swing/bob, flower-box blooms, royal wall banner, player wall banner,
pennant flags (per-flag phase), bracket-sign pendulum, wall-basket pendulum,
trellis leaf-tips. Awnings and the market stall already spoke it — the whole
street now answers one weather. **The banner pole joined THE DYE LAW**:
`Tile.BannerPoleDyed = 224` +dye (224-239), `bannerPoleInfo/bannerPoleTile`
helpers test-pinned, defs generated from the anchor; a builder's pole ALWAYS
lands dyed (the dial ships even at linen 0 — chosen-dye semantics), the
authored `Tile.BannerPole` keeps its hash-dealt roster untouched; fold to
`banner_pole` def dye-blind; ghost lands the exact dyed id in the dye's own
color; the dyed band rides the SAME ring cache as the classic pole. **THE
PORCH LIGHT**: the LampPost's collect-time bloom divides the deck lift out
through the same projAir division as its fixture height — a porch lamp's
glow sits on its lantern, never a fifth of a tile low.
PROVEN: 1278 tests green; ten-dye pole row staged and rendered (all cloths
true); porch-lamp night frame; TWO fps investigations both resolved
environmental by the far-probe method (empty countryside read SLOWER than
the pole row — impossible if the props were the cost; the dev machine was
saturated by the session's toolchain). Shadow/contact audit: all Phase 1-3
pieces already carry castEdgeQuad or masonry contact from the masterwork
passes — no gaps found.

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
