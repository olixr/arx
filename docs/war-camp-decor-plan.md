# THE CAMP BARES ITS TEETH — war-camp palisades & enemy encampment props

Status: **SHIPPED 2026-08-13, all six phases.** The As-built ledger at the
bottom is the record; the spec below is as-designed (deviations noted in
the ledger).

## The mandate

Enemy encampments dress themselves in town furniture: goblin "stockades" are
farm fences, war totems are town banner poles, and there is no torch, tent,
skull, spit, or bonfire anywhere in the tile roster. This epic gives the
goblins, wolfkin, gnolls, and bandits their OWN material culture:

1. **A bespoke spiked log palisade** — sharpened logs lashed together, spike
   tops, full connectivity (N/S/E/W runs, 45° turns, a gate) — so camps read
   as *built by their builders*, not borrowed from Dawnmead.
2. **Twenty new props** for camp dressing: lighting (torches, war brazier,
   the great bonfire), shelter (hide tents), menace (skull piles, totems,
   war banners, cages, spike barriers), and camp life (meat spit, meat rack,
   cook pot, potion rack, beast nest, plunder, spear rack, target dummy,
   war drum, hide frame).
3. **Destructibility**: the camp is an obstacle course — nearly everything
   here can be beaten apart to clear the zone, riding THE ROOM LEARNS TO
   BREAK wholesale (hits counted in blows, per-kind debris kits, tile
   patches to the honest floor).

## Standing laws that bind every piece

- **TILE-IS-THE-STATE**: every prop is a Tile id; destructibility is a
  `DESTRUCTIBLE_INFO` row; no new state channels.
- **BODY-RULER + TOP-PLANE**: the rig (~1.15 tiles) is the unit of measure;
  anything taller than the waist shows a foreshortened top plane. Every
  piece ends with a character-beside-prop screenshot audit.
- **FLAT FORGE**: depth = flat value planes, never stroked lines. Blocky
  squared members with one lit facet (THE BLOCK LAW); minimum feature
  ≥ 0.03s.
- **THE ONE RING**: cached props take the eight-tap baked ring
  (`CACHED_RING_TILES`); live-stroked architecture (the palisade) rings
  exposed silhouette edges only at `beginStructOutline` weight — shared
  edges never.
- **ONE BREEZE**: all cloth/fetish/hanging-meat motion samples `breezeAt` —
  never a standalone sine.
- **Collect-time light**: glows/lights register in `collectStaticLights`,
  never `queueGlow` from a painter (the candle-strobe law).
- **CONTENT BOUNDARIES**: skulls/bones/goblins fine; no witch/demonic
  vocabulary anywhere (ids, names, comments).
- **DRAW-TIME CTX CAPTURE**: every painter re-reads `this.ctx` inside
  `draw()`.

## Tile allocation (292–316, the free run after Dovecote 291)

### The palisade family — THE SPIKED WALL (292–296)

Not a fence, not a building wall: a **third fortification family** (the
garrison "separate-masonry law" precedent). `PALISADE_TILES` set; its own
`palisadeish()` connectivity in the renderer; never a `WALL_RUN` member,
never bounds an interior.

| id | Tile | notes |
|---|---|---|
| 292 | `Palisade` | straight run; solid, **light-blocking** (head-high logs = sightMass 'wall'); destructible kind `palisade`, **4 hits**, respawn 900s |
| 293 | `PalisadeDiagNE` | "/" turn, same law as `FenceDiagNE`; `orientDiagPalisade` mirror of `orientDiagFence` |
| 294 | `PalisadeDiagNW` | "\\" turn |
| 295 | `PalisadeGate` | open; walkable+raised; rides `DOOR_INFO` (auto-close, lockable) |
| 296 | `PalisadeGateShut` | solid + light-blocking; NOT destructible (gates open — the door law owns them) |

**The art** (`palisadeItem`, fence-grammar connectivity, drawn live with
struct outline so estate-length runs merge uncapped):

- **Logs, not planks.** The E-W face is a course of round-hewn vertical
  logs, each ~0.16s wide, alternating heights (1.05–1.25 tiles — an uneven
  sawtooth skyline, hash-dealt per tile but EDGE-STABLE: the two border
  logs of every tile are height-locked so runs join seamlessly). Each log
  is a flat value cylinder: lit west sliver, mid face, shaded east sliver.
- **THE SPIKE TOP**: every log ends in a chisel-sharpened point — a bright
  cut-facet triangle (fresh axe work, `shade(log, 30)`) with a dark flank.
  The points live INSIDE the outline path (TRUE SILHOUETTE law — the ink
  traces the sawtooth, never a straight line across it).
- **THE LASHING**: two rope courses (upper/lower) bind the logs — dark
  band + one lit strand, breaking rhythm at each log seam. A leaning brace
  pole roots every 2nd–3rd tile (hash-gated) on the camera side.
- **Top plane honesty**: N-S runs read edge-on as a narrow marching strip
  of spike tips (the fence railNS treatment at palisade height); the
  bird's eye sees the ring of cut facets, not a flat bar.
- **45° turns** stride corner-to-corner with sheared log courses (fence
  railDiag grammar at wall height).
- **The gate**: two heavier tusked gate-posts (skull-capped — the camp
  signs its door), leaf = lashed log grid that swings on `doorOpenness`
  like the fence gate; shut N-S reads edge-on as a barred strip.
- **Damage tells**: `propShakes` shudders the run on every blow (free,
  shipped); crack fx chips fly per hit (the durability lane).

### The props (297–316)

Column key: **anim** = ambient life beyond flame flicker; **light** =
collectStaticLights entry; **hits** = destructible blows (— = indestructible);
**collider** = sub-tile radius (full = full-block).

| id | Tile | what it is | anim | light | hits | collider |
|---|---|---|---|---|---|---|
| 297 | `StandingTorch` | sharpened stake driven at an angle, rag-lashed head burning | flame + embers | warm r1.2 | 1 | 0.18 |
| 298 | `Bonfire` | the great fire: stone ring, log tepee, three-tongue roaring flame, ember column, smoke | flame, embers, smoke | the camp's biggest: r6 light + tall bloom | — | 0.44 |
| 299 | `WarBrazier` | iron fire-cage hanging in a tripod of scavenged spears, coals glowing through the bars | flame, cage-shadow flicker | campfire-class | 2 | 0.3 |
| 300 | `TentHide` | round goblin tent: stitched pelts over bent poles, bone toggles, patched seams, dark door mouth | still (cached) | — | 3 | full |
| 301 | `TentWar` | the chieftain's ridge tent: trophy jaw over the door, torn pennant | pennant on `breezeAt` | — | 3 | full |
| 302 | `SkullPile` | heaped skulls + long bones, tusked goblin skulls among them, socket shadows | still | — | 1 | 0.34 |
| 303 | `SkullTotem` | the war totem: stacked skulls up a carved stake, warg jaw crown, rag + feather fetishes | fetishes on `breezeAt` | — | 2 | 0.2 |
| 304 | `WarBanner` | bent spear-shaft standard, tattered painted-hide banner, rag fringe | cloth on `breezeAt` | — | 2 | 0.2 |
| 305 | `PrisonCage` | crude cage of lashed branches, rope-bound door, bone litter inside | still | — | 3 | full |
| 306 | `SpikeBarrier` | crossed sharpened stakes lashed in an X-frame — the road-blocker | still | — | 2 | full |
| 307 | `MeatSpit` | forked stakes + cross-spit, haunch roasting over coals | **the spit turns** (slow rotation), fat-drip sizzle sparks | dim coals r0.9 | 2 | 0.35 |
| 308 | `MeatRack` | crossbar on posts, hooks of hanging cuts + drying strips | meat sways on `breezeAt` | — | 2 | 0.35 |
| 309 | `CookPot` | blackened iron pot slung from a wood tripod over coals, gruel bubbling | bubbles + steam | dim coals r0.9 | 2 | 0.3 |
| 310 | `PotionRack` | crooked plank shelf of bottles, gourds, stoppered horns; glass glints | glint sweep | — | 1 | 0.32 |
| 311 | `BeastNest` | the warg bed: trampled fur-and-straw ring, gnawed bones, shed fur tufts | still | — | 1 | 0.34 |
| 312 | `PlunderSacks` | heaped rope-tied loot sacks, spilled coins, a jutting candlestick | still | — | 2 | 0.36 |
| 313 | `SpearRack` | spears leaned in a pyramid stack, a crude shield propped against them | still | — | 2 | 0.3 |
| 314 | `TargetDummy` | straw-stuffed sack dummy on a post, painted target, stuck arrows | shudder rides `propShakes` | — | 3 | 0.2 |
| 315 | `WarDrum` | great hide drum on a lashed frame, painted glyph, crossed mallets | still | — | 2 | 0.32 |
| 316 | `HideFrame` | stretched hide lashed in a square frame, scraper leaning | frame rocks a hair on `breezeAt` | — | 2 | 0.25 |

**Why the Bonfire is the one indestructible piece**: it's the camp's heart
and the light anchor — a fire is doused, not smashed; leaving it standing
keeps a cleared camp readable at night.

### Debris kits (debris.ts)

New `SmashKind`s (mirroring `DestructibleKind`): `palisade` (log rounds +
spike points + rope coils), `torch` (stake + dying ember chunks), `brazier`
(iron cage bars + tripod spears + coal scatter), `tent` (bent poles + pelt
flaps — round soft chunks), `skulls` (bouncing round skulls + long bones,
shared by pile/totem), `banner` (shaft + hide flap), `cage` (branch bars +
lashings), `stakes` (sheared stakes), `spit` (forks + spit + the haunch —
one fat round chunk), `meatrack` (posts + falling cuts), `pot` (iron shell
halves + a gruel splash chip), `potions` (glass glints + plank shelf —
small bright chips), `nest` (fur tufts + bones), `sacks` (cloth flaps +
**coin sparks**), `spears` (long shafts), `dummy` (straw burst + sack head
+ post), `drum` (hoop halves + skin flap), `hide` (frame sticks + the
hide). Every kit obeys the CHUNK RING law and the no-two-alike test
discipline.

## The wiring (beyond art)

- **Server**: zero new code — `smashPropsInArc`/`hitProp` read the shared
  table; the gate rides the door lane; respawn rides `respawnQueue`.
- **Sets to touch in tiles.ts**: `TILE_DEFS`, `TILE_COLLIDER_RADIUS`,
  `DESTRUCTIBLE_INFO` (+ pinned test count), `LIGHT_BLOCKING_TILES`
  (palisade + shut gate), `DOOR_INFO` (gate pair), `PALISADE_TILES`,
  `orientDiagPalisade`; `nearestFloorTile` unchanged (Dirt is already a
  floor — camps stand on trampled dirt).
- **Renderer**: `palisadeItem` + `palisadeGateItem` + 20 `objectItem`
  cases; `palisadeish()`; `collectStaticLights` entries (torch, bonfire,
  brazier, spit coals, pot coals); `CACHED_RING_TILES` for the still props;
  live draw + struct outline for the flame/breeze props (the Campfire
  precedent — the flame is the point, it runs at frame rate);
  `FADE_TALL_TILES` for tents + totem + banner (step-aside fade).
- **Studio**: new palette category `camp` ("War camp") carrying all 25.
- **Prefab legend**: new chars for all 25; camp sketches re-dressed
  (goblin ring/pair/stockade, warhold court, gnoll squat/boneyard, wolfkin
  dens + greatden court, bandit hollow/toll/stockade court, raider squat);
  stale `data/prefabs/*.json` for every touched sketch regenerated (the
  FILE-WINS law).
- **NOT in scope** (deferred, deliberate): player-buildable palisades
  (defense category candidates later), loot spills from smashed props
  (standing follow-up from the destructibles epic), wall-mounted torch
  Detail (the hanging lane is town-shaped today).

## Phases

1. **THE STAKES GO IN** — shared tiles.ts: ids, defs, colliders,
   destructible rows, door info, sets, tests.
2. **THE WALL RISES** — palisadeItem + gate, all angles, live-verified
   against a staged ring.
3. **THE FIRES ARE LIT** — lighting props (torch, bonfire, brazier) +
   collectStaticLights + the flame vocabulary.
4. **THE CAMP FILLS** — the remaining 17 props in family waves (shelter →
   menace → camp life), each with its debris kit.
5. **THE CAMPS DRESS THEMSELVES** — legend + palette + sketch re-dressing +
   prefab JSON regeneration; live tour of a goblin warhold, wolfkin den,
   bandit stockade.
6. **THE LEDGER WALK** — character-beside-prop audits (day + night), smash
   tour, perf sanity, commit per phase.

## As built (2026-08-13, all phases in one pass)

Everything above shipped as designed. Deviations + laws learned:

- **Tile ids landed exactly 292–316**; `PALISADE_TILES` +
  `orientDiagPalisade` mirror the fence family; door material
  `'palisade'` joined the union (three consumers taught: the server's
  gate/lock strings and the renderer's wall-doorway carve-out —
  `Renderer.DOOR_TILES` filter).
- **Terrain underlay**: props 297–316 ride the `nearestFloor` law via an
  id-range branch beside the classic 80–99 range; the palisade family
  took the garrison-style neighbor pick with a **Dirt** fallback (camps
  stand on trampled ground, never dressed flags).
- **Ring-cache split as planned**: all 20 props in `CACHED_RING_TILES`
  (flame/breeze props animate at the shared cadence, the Brazier
  precedent); the 8 truly-still ones also in `STATIC_RING_TILES`. The
  palisade strokes live like the fence — uncapped seamless runs.
- **THE POSTS STAND INSIDE THE GAP** (gate law learned in the live
  audit): gate posts at ±0.5s are buried by the neighboring wall runs,
  which draw after in tile order — the palisade gate hangs its posts at
  ±0.42s, inside the opening. Any future gate framed by run-merged
  neighbors must do the same.
- **THE RIDGE POLE LIVES UNDER THE CLOTH** (war tent, live audit): a
  full-width ridge bar drawn over the cover reads as a floating spear —
  only short nub ends peek past the hides, the pennon rides the west
  nub.
- **The wall skull charm** sized up to 0.095s with a visible lash —
  at 0.07s it read as a knot in the wood.
- **Debris**: 18 new `SmashKind` kits (skulls/totem share bones; both
  tents share poles-and-pelts). Hollow vessels (drum, pot) joined the
  barrel's boom in main.ts; the palisade shakes the camera like the
  table.
- **Legend punctuation**: letters were exhausted — the war-camp speaks
  in `| / \ = + ! @ & ^ m 0 ? > [ < - ) { } ; $ ] ( " ` `` (doc block in
  prefabs.ts). `0` is safe beside the 1–9 marker digits (markers resolve
  from the sketch's own table first).
- **Prefab JSON regeneration**: the 14 re-dressed sketches' seeded
  `data/prefabs/*.json` files were deleted (tracked-and-clean in git, so
  no Studio edits were lost) and reseeded on the next boot — verified
  the warhold court JSON carries ids 292–315.
- **Live-proven on an isolated rig** (PORT 8791, DB `arx_warcamp`,
  DEV_COMMANDS, the vite rig config on :5174): staged enclosure +
  full prop sheet shot day/night beside the body (BODY-RULER holds);
  smash tour — one sword swing cracked the palisade (0.75 → 0.5
  remaining) AND burst the spike barrier (crack fx radius semantics
  exact, debris flew, tile patched to grass); `/poi here goblin_warhold`
  composed a REAL hold at 575,184 — court + wings + named chief (Mudge
  Kingbiter) + sentry ring, and at night it reads across the country as
  a fire-lit spiked silhouette. The court killed the naked prover on
  arrival, which is the feature working.
- **Combat gotcha for future rigs**: bare fists do NOT swing under
  combat v2's moveset lane — equip a weapon (`/give bronze_sword`, pack
  → Equip) before any smash proof; `__arx.input.touchAttack` is the
  clean scripted swing lever; movement via `touchMoveX` proves the
  frame lane first.
- **Deferred** (unchanged from the plan): player-buildable palisades,
  loot spills, wall-torch Detail — plus one new candidate from the
  audit: a palisade reveal/veil so bodies hidden behind a south run
  peek like they do behind garrison walls.

## THE GIANT LOGS rework (2026-08-13, user-directed, second pass)

User verdict on v1: "organized wood planks… too much of a square sort
of fence." The wall was rebuilt around a new premise — **each log is
an individual carved monument** — and these supersede the v1 wall
internals:

- **THE GIANT LOG** (`giantLog`): a quarter-tile round (4 to the tile,
  widths hash-split per half so no two neighbors match; shoulders
  1.3–1.62 tiles) with FOUR value bands rolling the cylinder, one or
  two axe-notch carvings, a big two-facet chisel point with an
  undercut shadow — and its OWN full brand ring. The per-log ring is
  deliberate: a palisade is a row of monuments, and the ink is what
  makes each log decipherable at scale (the user's explicit ask).
- **EVERY DIRECTION SPEAKS STANDING LOGS**: N-S runs are logs marching
  up-screen in depth (drawn whole, north first, each overlapped by the
  next south — STAGGERED ±0.075 into a double row, or the stacked
  crowns drown in each other's ink); 45° strides are the same giants
  stepping corner-to-corner, depth-sorted. Sheared-plank courses are
  DEAD — a log is vertical no matter which way the wall runs.
- **THE HEAVY LASH** (`palisadeRope`): thick dark wrap band + two lit
  strands + a shadowed wrap tick at every log seam + a hash-dealt
  knot with a dangling end. Two courses bind every E-W run.
- **A JUNCTION IS A LOG**: corners, tees, and run ends anchor on one
  extra-fat giant at the tile heart (through-runs need none).
- **THE GREAT GATE**: towering posts (1.72 tiles + point) with doubled
  rope hinge collars and the skull; a squared LINTEL beam spanning
  overhead with a true lit top plane, end grain at both ends, lashed
  to the post crowns, three carved spikes standing ON it; DOUBLE
  doors of crowned half-logs that meet at a rope-bound center seam
  and fold flat to their own posts when open. The arch's ink is one
  selective ring (beam ends + underside + the standing spikes).
- **The spike barrier grounded**: crossing lowered to 0.26 tiles so
  the legs land ON the shadow's rim; footprint-hugging ellipse plus a
  contact pool under each front leg; the carrying beam rides just
  above the crossing. (v1 floated 0.17 tiles over its shadow.)
- Staging lesson: stage diagonal runs FAR-CORNER-FIRST — a /tp anchor
  that lands on a just-placed solid tile clamps, and the next stamp
  fires from the wrong spot (the v1 "gap in the diagonal" was this,
  not paint). And /settile stamps only persist across sessions once
  the chunk save flushes — reshoot in the session that staged, or
  restage.
- Rig lesson: rig ports are a shared commons — 8791/8793/8795 were
  claimed by a concurrent session's provers mid-work; the lane moved
  to rig4 (server 8797, client 5180) per the interleave protocol.
