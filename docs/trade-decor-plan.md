# THE TRADES KEEP SHOP — the working-trades decor kit (2026-08-15)

## Why

THE TOWN KEEPS ITS DAY dressed the street; the SHOPS behind it still
ran on the same four tiles as everywhere else. The trade-station
census reads one loud gap: the seven producing trades (smithing,
woodworking, leatherworking, tailoring, cooking, herbalism,
enchanting) own their working STATIONS (Anvil, Loom, TanningRack,
Alembic…) but almost none of the dressing that makes a workshop read
as a LIVED workplace — no quench tub beside the anvil, no grindstone,
no bellows, no oven for the town's bread, no dye vats, no stocked
shop shelving. A player walks into "the smithy" and sees an anvil on
bare boards.

## The kit's voice: TENDED, NEVER LEFT (the town kit's voice, indoors)

Every piece is MID-SHIFT: the blade still cooling in the quench, the
loaves still warm on the peel, the chalk marks fresh on the dress
form, one plank pulled for the next cut. If a piece could read as
abandoned, it fails the kit.

## Roster — twelve pieces, ids 405–416 (next free: 417)

| id | Tile | trade | read | anim | hits | kind |
|----|------|-------|------|------|------|------|
| 405 | QuenchTrough | smithing | iron-banded slack tub, blade cooling, tongs parked | steam + ring <4Hz | 2 | quench |
| 406 | Grindstone | smithing | treadle wheel in oak cradle, drip can, resting blade | drip <4Hz | 2 | grindstone |
| 407 | SmithBellows | smithing | double-lung bellows on straight posts, brass nozzle | static | 1 | bellows |
| 408 | IngotRack | smithing | bar stock on the rail, pigged ingots by metal, coal sack | static | 2 | ingots |
| 409 | LumberRack | woodworking | planks on edge, one pulled, waiting log, sawdust | static | 2 | lumber |
| 410 | DyeVats | leather/tailor | two brimming vats off the dye roster, stir paddle | swirl <4Hz | 2 | dyevat |
| 411 | TailorsDummy | tailoring | dress form in a pinned dyed garment, chalk, measure | static | 1 | dressform |
| 412 | ClothBolts | tailoring | standing rolls in the crib, tongue spilled open, shears | static | 1 | clothbolts |
| 413 | BreadOven | cooking | fired-brick dome, loaves on the peel, breathing flue | smoke <4Hz | 4 | breadoven |
| 414 | ButcherBlock | cooking | hung links + ham on S-hooks, scarred block, cleaver | static | 2 | butcherblock |
| 415 | HerbRack | herbalism | bundles heads-down on two rails, mortar below | breeze sway <4Hz | 1 | herbs |
| 416 | ShopShelf | shopkeeping | THE OPEN SHELF: carcassless rack, goods individually outlined | static | 2 | shopshelf |

## Variant law: THE HASH DEALS THE STOCK

The kit's variety is positional, never authored per-tile:

- **ShopShelf** deals its three rows from four goods sets (jars,
  dyed cloth stacks, crockery, stenciled boxes) — the hash picks the
  ROTATION and the row walks it, so rows never repeat within one
  shelf and no two shelves in a street sell quite the same shop.
- **DyeVats** deals two DIFFERENT dyes per tile from the shared
  AWNING_CLOTHS roster (the one dye truth); drips and ground stains
  wear the vat's own colors.
- **ClothBolts** deals four dyes on a stride of three across the
  roster so neighbors never share a hue family; the spilled tongue
  takes a fifth.
- **TailorsDummy** wears one dealt dye; **HerbRack** deals bundle
  hues from a green-weighted roster (greens carry, lavender and
  seed-gold accent); **IngotRack** deals iron/bronze/copper pigs;
  **LumberRack** deals plank tones and heights.

## Laws this kit answers

- **BODY RULER + TOP PLANE**: audited live beside the rig; the shelf
  and oven show foreshortened tops (~syT*0.32 / dome crown cap).
- **ZERO LIGHT ENTRIES**: the LampPost owns the night; even the
  oven's banked coals are PAINT (proven by the night wide — the
  whole yard sits dark between the road lamps).
- **CACHED RING**: all twelve ride the ring cache; seven statics in
  STATIC_RING_TILES; five animated pieces keep every term <4Hz
  (quench steam + slosh ring, grindstone drip, dye swirl, flue
  smoke, herb sway on the shared breeze cadence).
- **ONE UNIVERSE**: timber breaks in the joinery amber; the NEW
  smash voices are slack water + steel, stone grit, metal clatter,
  paired dye splash, fired brick (the oven BOOMS like the hollow it
  is and shakes at 3.2 with the grindstone's disc), market red, herb
  chaff, and the shelf's rain of crockery.
- **UNSIGNED HASH LAW** (this kit's lesson): painters indexing
  arrays by hash modulo MUST use unsigned shifts (`h >>> k`) — `h >>
  k` on a top-bit uint32 goes NEGATIVE in JS and `array[-n]` feeds
  `shade(undefined)`, which throws per frame. The `&`-mask idiom is
  immune; `%` is not.

## As-built ledger (SHIPPED 2026-08-15)

Wired end to end: enum + TILE_DEFS (each trade keyed off its own
material at chart scale) + brush-past colliders (oven 0.45 is the
yard's one true mass; dummy 0.24 stays under sight-cover) +
DESTRUCTIBLE_INFO (all twelve pinned in tiles.test.ts; oven
600s/4-hit masonry, the rest 300s street clocks), TRD_* palette +
twelve painters before `case Tile.Table`, ring-cache membership,
SMASH_TONES (quench/grindstone/ingots/dyevat/breadoven/butcherblock/
herbs/shopshelf/bellows/dressform/clothbolts; lumber keeps the
default amber), twelve debris kits (grindstone disc ROLLS FREE pace
1.6; loaves bounce out whole; bolts unroll mid-air), boom + 3.2
shake wiring, terrain underlay range `QuenchTrough..ShopShelf`,
Studio 'Trades & shops' shelf.

### Audit verdicts (two paint passes, frozen lane at Dawnmead's hem)

- **A BOLT IS A ROLL, NOT A RAMP** — pass 1's diagonal rolls merged
  into one yellow wedge. Pass 2 stands every roll upright in the
  crib with its own dealt hue, dark seams parting them, fat wound
  ends. Proven: three cribs staged, all clearly distinct.
- **THE LUNGS ARE LEATHER, NOT A BARROW** — pass 1's crossed trestle
  legs + pale gut read as a hand-barrow. Pass 2: straight posts,
  deep-dark leather gut against pale boards, four bold pleats, the
  brass nozzle doubled.
- **ROWS NEVER REPEAT** — one shelf dealt three jar rows; the row
  now walks the hash's rotation, three different trades per shelf
  guaranteed.
- **GREENS CARRY THE RACK** — the herb roster re-weighted toward
  greens; lavender and seed-heads are accents.
- Passed clean on pass 1: QuenchTrough, Grindstone, IngotRack,
  LumberRack, TailorsDummy, BreadOven (the kit's anchor read),
  ButcherBlock, ShopShelf silhouette + top plane, DyeVats.
- **Night hierarchy proven**: yard dark, road lamps pooling, zero
  kit glow. **Smash theatre proven**: oven boomed on the fourth
  blow, shelf + bolts burst (chips mid-air in the capture), tiles
  patch to the underlay floor, barrel control clean.

### Rig lessons banked

- **THE FROZEN LANE**: peer sessions saving shared/content files
  full-page-reload every vite dev client — an art audit mid-stage
  dies to a neighbor's save cadence. `vite.config.audit.ts` (:5199,
  proxying lane-9's :8804) runs `hmr: false` + `watch.ignored:
  ['**/*']` — the page can never reload under the audit. Restart
  the vite to pick up new paint (it deliberately doesn't watch).
- **/settile races /tp**: the brush stamps at PLAYER+2,+2 server-side
  — a settile sent before the teleport settles stamps at the OLD
  position, and a tp into a blocked cell spirals to a neighbor and
  shifts the brush. Verify the camera (it follows the player) sits
  within ~0.6 of the target before every stamp, and re-scan for
  strays after.
- **THE SAFETY eats taps**: weapons start SHEATHED — the first press
  only draws, and a Playwright `keyboard.press` tap can fall between
  input-frame samples entirely. HOLD Space (`down`, wait, `up`) to
  swing; watch the fx stream (`handleMessage` hook) for the
  radius-0 smash to time burst captures.
- Debris flies FAST — even a 90ms in-page toDataURL capture catches
  only the tail. Chips and the patched tile are the reliable proof;
  frame-perfect debris glamour needs a recorder, not a poller.

### THE OPEN SHELF (same-day rework, user verdict)

The boxed casework failed the user's read — "a shelf that's not a
cabinet or a box." Rebuilt carcassless: two chamfered uprights,
three boards bowing gently under load (each with its lit top
sliver), NO backboard and NO side panels — the ground reads straight
through the bays, and because the outline pass is an alpha-dilate,
**every good on the boards earns its own individual outline ring**
(gaps kept wider than the ring so the dilate never bridges
neighbors — the blade-lab gap law applied to shelf stock).

- **THE SHELVING CONTRACT**: `paintGood(kind, gx, gy, seed)` — one
  dispatcher, nine goods kinds (0 potions, 1 cloth, 2 bowls,
  3 boxes, 4 books, 5 scrolls, 6 larder, 7 glazed crockery,
  8 tinker), every good drawn from its bottom-center so anything
  seats on any board. This is the seam a future PLAYER-STOCKED shelf
  plugs into: deal kinds from a ledger instead of the hash and the
  same painter shows a player's own wares.
- **Ten row themes** (nine single-trade + BRIC-A-BRAC, where every
  slot deals its own kind) walk the hash on a stride of three —
  three rows, always three trades. Slots jitter, sizes and hues
  deal per item, and an honest SOLD-OUT gap (1-in-8) leaves a faint
  stand-ring where the morning's customer took the jar.
- **Pass-2 verdicts**: GLAZED WARE, NEVER BARE CLAY (an earthen jug
  on an oak board disappears — four glaze tones + cream slip band,
  and a mug variant so crockery rows vary); A PYRAMID OF SCROLLS,
  NOT ONE FLAT STRAW; the tinker's smalls grown to presences.
- Proven live: five-shelf variant row — every shelf differently
  stocked, potion liquids reading through glass, each bottle/loaf/
  jug carrying its own ring, daylight through every bay.

### Deferred on purpose

Examine lines; shop-dressing passes seating these into the seven
towns' trade buildings (the town-kit precedent — via Studio and a
future authored pass); working-station hookups (none of these twelve
are STATION_TILES on purpose — they are the dressing AROUND the
stations); POI prefab legend chars.
