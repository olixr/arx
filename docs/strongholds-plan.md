# Strongholds — The Country Builds Its Capital

The fourth act of the procedural world epic. `procedural-world-plan.md` taught
the world to **grow** camps; `living-frontier-plan.md` taught it to **move them
on and push back**; `lived-in-land-plan.md` taught the land to **read as
inhabited** — knots, finds, trails, war-grounds, territory. This act teaches the
frontier to build at the scale the fiction has been promising: **walled
strongholds you enter, explore, and break in chapters** — and it builds the
studio machinery to author them at master-craft quality forever: a generator
that proposes, a bench where the team curates, a repository the world deals
from. Authored intent at procedural scale.

The player's verdict driving it:

> The points of interest are all small nodes with a huge cluster of enemies.
> There's nothing to explore. Classic RPGs give you a *world* — zones authored
> with intent, strongholds and encampments that are walled off, that you enter
> through found gates, that take five or ten minutes to fight through. Goblins
> are intelligent; they have holds, a boss up a hill behind layers of guards.
> Enemy spacing is strategic — you pull one to three at a time, you plan the
> assault. I want these to be huge, spacious, curated, decorated — a real place.
> And I want a system before placement: generate strongholds, curate them, save
> them into a repository, so authored and procedural content combine into
> exploration that never goes stale.

## Ground truth this builds on (verified 2026-08-13)

- **The biggest thing the world can deal today is ~a quarter of the ask.** The
  goblin war-hold — court 16×11 + 2-4 wings at 18.5-23.5 tiles out + sentry
  ring at ~35 — composes into a ~60-68-tile rect (up to ~92 along a trail),
  26-28 bodies typical, 42 theoretical max (`pois.ts:357`, `pois.ts:552`).
  Ordinary sites are 14×10 median with 3-8 bodies. Nothing procedural has a
  wall, a gate, or an interior.
- **Hard geometric ceilings, all in one file**: the site scan margin
  `ceil(max(w,h)/2)+14` makes any prefab ≳99 tiles unplaceable in a 128-tile
  cell (`pois.ts:201-205`, `span <= 0`); compounds cap at
  `courtHalf + 2·wingHalf < 42`; and the all-tiles-standable footprint scan is
  both statistically impossible and ~400k `groundProbeAt` calls at 128×128.
  A whole-cell stronghold needs a different siting strategy, not a bigger dial.
- **The zone machinery already proves the scale.** Dungeons stream 184×184
  runtime `ZoneDef`s through the *same* `addZone`/`registerSpawns`/chunk path a
  POI uses (`dungeon/generate.ts:62`, `key.ts:63-67`); authored Silverfall is
  176×128 with three stacked terraces (`silverfall.ts:71-73`). Costs are known:
  a 128-tile zone touches 16-25 chunks (~5KB each on the wire, 10-40ms of
  time-sliced bake each), and `addZone` invalidates a 52-tile chunk halo — so a
  stronghold must materialize *before* the player's 160-tile interest window
  arrives, and rarely.
- **Elevation is wired end to end and dropped at the last step.**
  `PrefabDef.elev` exists, serializes, and Map Studio captures it
  (`prefab.ts:47,110`, `dialogs.ts:576`); `ZoneBuilder` has `raise`/`sink`/
  `stairs` with auto-grown Cliff fences, the border-flat law, and
  ramp-reachability validation (`builder.ts:126-181, 389-540`); `overlayZone`
  stamps zone elev verbatim (`worldSource.ts:589-593`). Only the composer
  discards it: `elev: undefined` (`pois.ts:1230`). "Boss up a hill" is one
  honest blit plus fencing validation away.
- **The palisade family is a fortification kit waiting for a fort.** Tiles
  292-296 with diagonals, the GREAT GATE double doors on the full door
  machinery, LIGHT_BLOCKING walls, destructible runs (4 blows, 900s respawn —
  "a breached ring stays breached for the whole assault"), gates deliberately
  indestructible (`tiles.ts:1313, 1759`). Plus 20 war-camp props and 25 sketch
  legend chars (faca78b). Note: hostiles never open doors (routine-only law,
  `gameServer.ts:19727`) and chase pathing is bounded at 1500 expansions — the
  wall design must respect both.
- **The strategic pull the player wants is already the engine's law.** Sight is
  a cone + ray that walls genuinely occlude (`perception.ts`, `sightMass` reads
  palisade as `'wall'`); `rallyPack` joins the nearest **2** packmates within
  **7 tiles** and merely worries the next 2 — "which is what lets a careful
  player pull one or two bodies off a camp instead of the whole camp"
  (`gameServer.ts:20324-20365`). Today's failure is *placement density*, not
  AI: wing holdfasts cluster at radius 2.1-2.7, so a whole wing is one pull.
  Rally checks distance, not line of sight — spacing is the whole doctrine.
- **There is no authoring pipeline above a single prefab.** 60 hand-sketched
  ASCII prefabs (median 15×8, max 23×15 against a 128 cap); Map Studio marquee
  capture is the only creation tool; the only multi-prefab assembly in the
  codebase is the runtime court+wings composer. No generator, no layout
  repository, no curation bench.
- **Every standing law survives contact**: LAYER LAW streams, DANGER_LAWS the
  one-law table, FRONTIER dials as content, ledger-stores-deviations, ember /
  boldness / satellites / calm / bounty / territory (`TERRITORY_SPAN = 384`,
  geologic), claim rings as pure exclusion, ALL-SKIP-PERIMETER, QUIET CHART,
  flood law, VOICE.

## Industry laws we adopt (research digest)

1. **The macro shape is authored; the life is dealt** (BotW's hand-placed
   enemy camps over a procedural-feeling world, Valheim's fuling villages):
   layouts that players praise as "designed" are curated structures with
   rolled garrisons and dressing. Pure runtime assembly reads as mush at
   fortress scale; pure hand-placement can't feed an endless world. The
   pipeline is generate → curate → repository → deal.
2. **A stronghold is a sequence of spaces, not a blob** (WoW's elite camp
   terracing, Destiny lost sectors, D&D lair design): gate yard → wards →
   boss court, each a legible room with its own garrison, connected by lanes
   the eye can follow. Explorability *is* spatial grammar.
3. **The entrance is a choice** (BotW again, MGSV outposts): a watched main
   gate, a meaner back way, and walls that can be breached where the player
   spends effort. Multiple doors make the same layout replay differently by
   play style.
4. **Pull design is spacing design** (classic MMO camp math, Diablo pack
   grammar): knots of 1-3 inside rally range of each other, knots separated by
   more than rally + peripheral sight, patrols crossing the gaps on timers.
   The plan-the-assault feel is a placement invariant you can test.
5. **The boss is uphill** (every siege in fiction; WoW's hold architecture):
   verticality reads as hierarchy. The chief's terrace behind a cliff fence
   with one ramp is both a navigation goal and a difficulty gate.
6. **Chapters acknowledge progress** (SoD2 plague hearts, the shipped
   wing-break law): ward-fall lines, the ward that empties stays empty, the
   warded chest opens at the last stand. Five-plus minutes without milestones
   is a slog.
7. **Scarcity makes landmarks** (theme-park weenies, Horizon's cauldrons): one
   capital per country. If strongholds are common they are camps; the map
   should be steered by them.
8. **Replay variance rides the garrison, not the geometry** (L4D director,
   Diablo again): same walls, different watch — which wards are manned, where
   patrols walk, which champion holds court. Geometry variance comes from the
   repository's breadth, at authoring cost, where it belongs.

## The laws of this epic

- **THE CAPITAL LAW** — one stronghold per territory country, seated purely
  from the seed on the territory lattice: `strongholdSeat(seed, country)` is a
  pure function any cell can consult. Countries whose seat falls in settled or
  shallow land (tier < 3) keep no capital. Scarce by construction, present by
  construction, and deterministic with zero ledger coordination.
- **THE FOUNDRY LAW** — the generator *proposes*, the bench *curates*, the
  repository *serves*. Nothing generated ships sight-unseen: a layout enters
  the dealing pool only when a curator saves it. Runtime never invents
  geometry; it deals authored layouts and rolls the life inside them.
- **THE WALLS ARE AUTHORED, THE WAR IS DEALT** — a layout is static geometry
  (walls, gates, wards, terraces, lanes, dressing anchors); everything alive
  rides streams at compose time: which optional wards are manned, knot rolls,
  champion names, prop scatter in the yards, boldness rungs, epoch turns. Same
  walls, never the same siege.
- **THE PULL LAW** — garrison placement is spacing-invariant: bodies muster in
  knots of 1-3 within `PACK_RALLY_RANGE` of their knot, knots stand ≥ 10 tiles
  from each other (rally 7 + margin), patrols cross the gaps. The invariant is
  test-pinned per composed stronghold, not hoped for.
- **THE OPEN GATE LAW** — while the garrison stands, gates stand open: an open
  gate is a sight lane, an entrance, and honest fiction (a manned gate needs
  no lock). Hostiles never learn doors (standing law), so no composed layout
  may require a door to path — lanes route through gate *openings*, and the
  chase-pathing budget shapes wall lengths, not vice versa.
- **THE FREQUENCY LAW, UPHELD** — a stronghold is more bodies, more chapters,
  more structure at the tier's own level band. Danger scaling remains the
  field's job alone; boldness adds patrols, never levels.
- **THE ONE-CELL DEBT** — a stronghold costs the world one zone, pre-composed
  and long-lived; it masks the cells it covers (they deal no sites or finds)
  so total zone count and body count grow sublinearly. The 120fps work still
  never learns POIs exist.

## Phase 1 — The Foundry (generate → curate → repository)

Goal: the studio can produce a walled, warded, decorated stronghold layout in
minutes, at hand-authored quality, and bank it.

- **Layout grammar** (`content/src/pois/strongholds/`): `StrongholdLayout` =
  one mega-prefab (the existing `PrefabDef`, ≤120×120, TILE_SKIP fringe,
  war-camp legend) + a metadata doc: `{ id, family, tiers, weight, wards:
  [{ key, name, rect, knots: [{npc, band [1,3], role, hours?}], patrol?:
  'wall'|'lane'|ring }], boss: { ward, names[], honorGuard }, gates: derived
  by scanning gate tiles, breaches?: authored gap coords }`. One validator
  `validateStronghold` in the house dialect (all-errors, refs injected):
  ward rects inside the prefab and non-overlapping, knots within their ward,
  the PULL LAW spacing pre-checked on authored anchors, boss ward reachable
  from every gate through openings only (BFS over non-solid — the OPEN GATE
  LAW enforced at authoring time), every ward reachable, id/family/tier laws
  as ever.
- **The generator** (`genStronghold(seed, family, tier, sizeClass)` — pure,
  content-side): wall polygon (jittered rounded hull, 60-110 tiles across,
  palisade runs + diagonals + junction anchors), 1 great gate + 1 lesser gate
  + 0-1 authored breach gap; interior trampled-dirt ground with grass showing
  through TILE_SKIP courtyards; wards dealt by relaxed placement (gate yard,
  pens/kennels, tent rows, cook yard, shrine/totem court, prison yard, boss
  court) each dressed from **ward-piece pools** — a new shelf of ~20 mid-size
  sketches (8×6..14×10) per family cluster, speaking the faca78b punctuation;
  lanes (worn Dirt, the traceTrail dialect turned inward) gate → wards → boss;
  watch posts and patrol lanes derived from the wall. The generator emits the
  full layout doc — prefab + wards + knots — ready for the bench.
- **The Foundry bench** (CMS section `'strongholds'`): seed/params → true
  render (the `renderLayersPreview` + stage-ladder precedent) with ward
  overlays and knot pins; reroll, size/family/density dials; **Open in Map
  Studio** (it is a prefab — the existing library PUT + editor stamp/capture
  loop is the polish path); **Save to repository** = prefab file + content doc
  kind `'stronghold'` (DB-first, live registry, `replaceStrongholds`, the
  PoiDef pattern wholesale). Curation is the gate: the dealing pool is the
  repository, never the generator.
- **Ship content**: ward-piece shelf + **8-10 curated layouts** — goblin
  warhold-citadel ×2-3 (the flagship), brigand stockade fort ×2, wolfkin
  greatden warren ×1-2 (walls of bone and thicket — the generator's wall
  material is a family parameter), gnoll squat-ring ×1, dead barrow-court ×1.
  Each shipped layout gets the full curator pass in Map Studio: no weird
  edges, decorated wards, readable lanes — the master-studio bar.
- Tests: generator determinism + bounds; validator refusals by name;
  reachability/spacing invariants on every shipped layout (the repository is
  swept like prefabs are today); legend round-trip.
- Live verify: Foundry roll → curate → save → `/stronghold here <id>` (Phase 3
  lever, stubbed to force-compose in a dev cell) — walk the walls, count the
  pulls.

### Phase 1 as-built (2026-08-13, commit a4af9ef — THE FOUNDRY OPENS)

Shipped as designed; deviations and laws learned:

- **The grammar hardened**: `StrongholdDef` carries ONE `prefab` (id ===
  def id by convention), wards 2..9, knot bands ≤3, muster envelope
  16..60 max bodies, dims 48..120, tiers min ≥ 3. The boss ward key is
  always `last_stand`; **the boss anchor is exempt from PULL-LAW
  spacing** — the chief folds into his honor guard, the last stand is
  deliberately the biggest fight.
- **A GATE PIERCES A WALL**: gate detection requires solid tiles on
  both lateral flanks — a free-standing shrine arch is scenery, not an
  entrance (the dead's courtyard arches taught this). Wolfkin and dead
  mouths are `ArchStone` (non-solid); breaches are trampled grass, or
  rubble for cairn walls (`CaveRubble` is non-solid — found, not
  assumed).
- **Ward pieces are content-internal** (`strongholds/pieces.ts`, 20
  sketches on the shared `sketch()` dialect, now exported from
  prefabs.ts) — not library prefabs. The curated artifact is the
  LAYOUT; pieces are the generator's raw material. Pieces may carry
  knot suggestions (the pens want worgs) that outrank the family menu.
- **Streams fold the layout id** (`ST_FOUNDRY 0x501e70` +
  `hashString(id)`): the same seed under two ids proposes two
  different strongholds. Hulls: hold 58-80 / citadel 86-108 walls +
  FRINGE 3. Lanes are a dendritic network — gates carve cart-wide to
  the plaza, each ward joins the NEAREST worn ground footpath-wide,
  nearest-first (parallel-stripe lanes were the first draft's tell).
  Wards sample a ring band (0.3-0.72 of half-span) around the plaza.
  Muster marks (citadel 32 / hold 24) are asks; spacing geometry
  answers — shipped shelves land 19-32.
- **Born rolled, never blank**: the bench's New flow generates
  immediately; a blank stronghold doesn't exist. Unsaved rolls live in
  bench memory (def drafts + prefab drafts) and Save banks
  prefab-first-then-def so the server's geometry laws always validate
  against the live library.
- **Nine layouts at pinned seeds** (moot 108×101 flagship / warring /
  deepfort / bastion / stockyard / greatring / bonering / cacklefort /
  barrowcourt), swept by 18 tests; `data/prefabs/stronghold_*.json`
  committed as the repository baseline (FILE WINS thereafter).
- **Gotchas for the next phases**: server/client resolve @arx/content
  through PROJECT REFERENCES — after content edits run `npx tsc -b`,
  not just package-local `--noEmit`. CMS section wiring is exactly the
  lived-in-land checklist; the styled classes are `form-grid2` /
  `poi-card` / `poi-grow` / `poi-stage` (invented class names render
  unstyled). The shared MCP browser is a session commons — headless
  proof runs on scratch `playwright-core` + the cached
  `chrome-headless-shell`. And NEVER leave a throwing module half-built
  in the shared tree: the placeholder-seed shelf blanked two other
  sessions' page loads until the seeds were pinned.

## Phase 2 — The Raised Ground (elevation through the composer)

Goal: the boss court sits up a hill behind guards; composed zones carry honest
terraces.

- **The blit**: `composePoi`/`composeStronghold` allocate `elev` and stamp
  `prefab.elev` at the same offsets as ground (killing the `elev: undefined`
  at `pois.ts:1230` for prefabs that carry one); TILE_SKIP cells keep procgen
  elevation (already the overlay's law).
- **The fence**: layouts with elevation must ship their own Cliff/Ramp ring
  (the generator uses the `ZoneBuilder` terrace primitives — `raise`,
  `stairs`, the camera-facing ramp predicate — so proposals are born fenced);
  `validateStronghold` replays the composed zone through the builder's
  fencing + ramp-reachability validation (`validateZone` precedent), and the
  border-flat law (no nonzero elev within 2 of the rect) composes cleanly
  with ALL-SKIP-PERIMETER: the fringe stays transparent, the raised core
  stands fenced inside the opaque region.
- **The sketch dialect learns height**: an optional parallel elevation plane
  in `sketch()` (digits 0-3 aligned under the ground rows, `_` = keep), so
  builtin layouts can carry terraces without JSON hand-editing; Map Studio
  already captures elev on the marquee.
- **The cliff-foot interplay**: the site probe's CLIFF-FOOT LAW refuses
  footprints touching level changes — the stronghold's own stamped terraces
  are interior to the rect and invisible to the probe (it reads worldgen), so
  no interaction; test-pinned.
- Tests: elev round-trip through compose → overlay → chunk; fencing refusals
  (an unfenced terrace never composes); ramp reachability from every gate to
  the boss ward; screenshot pass on the flagship citadel (the boss terrace
  reads at zoom).
- Live verify: climb the ramp under the honor guard's eyes; confirm the
  terrace renders with the shelf-law sort and the cliff faces paint.

### Phase 2 as-built (2026-08-13, commit 0bebcb2 — THE GROUND RISES)

Shipped as designed; deviations and laws learned:

- **The generator raises its own terraces directly** (no ZoneBuilder
  dependency — the builder's laws were re-stated as validator laws
  instead): terrace = boss rect + pad 2→1 fallback, elev 1, Cliff
  ring, Ramp on the south edge (2-wide citadel / 1-wide hold), opaque
  `Grass` fill so the hill has no transparent holes, `Dirt` landing
  and summit path. Citadels always terrace; holds roll 60% — the
  gnoll cackle-fort shipped honestly flat, which is the variety
  working.
- **Height is render-only end to end** (the shelf law held): the
  Phase-1 reachability flood and the live pathfinder both route by
  tiles alone — Cliff solid, Ramp walkable — so no Phase-2 change
  touched movement code, and the summit walk worked on the first
  composed probe. Cliffs are also `SIGHT_WALL_TILES`: a terraced
  court is hidden ground until the stair is won.
- **The validator states the fence laws by name**: FENCED HEIGHT
  (any drop to a 4-neighbor puts Cliff/Ramp on the high cell, with
  transparent neighbors read as level 0), THE SOUTH STAIR (landing
  below, level flanks — twin ramps legal because a ramp flank is at
  level), border-flat (≥2 from the rect edge), no elevation on
  transparent cells, range 0..3.
- **composePoi allocates elevation lazily** (`elev ??= new Int8Array`)
  on both court and wing blits — the ordinary flat frontier still
  composes `elev: undefined`, test-pinned, so Phase 2 costs standing
  content nothing.
- **Live-proven on the running world**: a 17×13 terraced probe PUT
  through the bench doors, forced via `/poi here`, rendered with
  true cliff faces and stair art at 567,180, and a prover pathed up
  the ramp to stand on the summit beside the skull crown. Probe
  dissolved and deleted after (`/dev/pois/cell` wants `cellX/cellY`,
  not `cx/cy`).
- **Minor debt**: the bench war-map renders the raised court dark at
  small scale (the preview's cliff bake) — legible as "raised", not
  yet pretty; revisit when the Phase-6 bench pass lands. The sketch
  legend deliberately gained no Cliff/Ramp characters — hand-authored
  terraces belong in Map Studio, which captures elevation already.
- **Stream discipline held**: the terrace rides its own stream
  (`rTerrace`, n=6), so Phase-1 hulls, gates, wards, and musters at
  the same seeds were preserved; only the hills are new. Reseeding
  `data/prefabs/stronghold_*.json` (write-in-place, tracked) is the
  FILE-WINS refresh dance from the war-camp epic.

## Phase 3 — The Capital Law (placement, masking, and the price of scale)

Goal: one stronghold per country, seated deterministically, materialized
without a hitch a player can feel.

- **The seat** (`strongholdSeat(seed, latticeCx, latticeCy)` beside
  `territoryAt`, same 384-tile lattice, salt `ST_CAPITAL`): jittered point in
  the lattice cell → family from the territory field at the point → tier from
  the danger field; tier < 3 ⇒ no capital (settled countries keep none);
  layout from the family+tier pool on its own stream; **relaxed siting**: a
  4-tile-sampled probe grid over the footprint (~900 probes, not 400k),
  refusing only on water/rock fraction > 15%, authored-zone clearance 24,
  dark band, claim rings, and gate-apron standability — the wall conforms to
  the land (TILE_SKIP interior tolerates refused pockets; a pond inside the
  walls is a feature). Up to 8 jitter retries, then the country keeps no
  capital this epoch — honest scarcity.
- **The mask**: `poiForCell` and `findsForCell` consult the (cached, pure)
  seats of the ≤4 lattice cells in reach and refuse cells whose rect
  intersects a capital's rect + 24 (the intersectsZones dialect) — capitals
  never collide with sites, holds, finds, or each other by construction.
  Compound *holds* also refuse within `regionCells` of a capital (the hold is
  the country's fist; the capital is its seat — they don't share a
  neighborhood).
- **Materialization**: strongholds ride `tickPois` with their own wider pad —
  decide/compose at `interest + 4` chunks (192 tiles) so the addZone halo
  (~40-90 chunks) and client re-bake land **before** the walls enter view;
  compose result cached in the ledger row (`world_strongholds`: lattice key,
  layout id, epoch, stage, ward-cleared bitmask, ember/fallow — deviations
  only). One capital materializes per pass, never sharing a beat with cell
  work. If profiling shows `overlayZone`'s O(zones) scan hurting at the new
  zone count, a rect index lands here — measured first, the perf-pass law.
- **Levers**: `/stronghold` (nearest seat, layout, ward states, mask reach),
  `/stronghold here <layout>` force-compose (dev cells only, the /poi-here
  discipline: never on authored pinned cells).
- Tests: seat determinism + lattice bounds; settled-country refusal; mask
  reciprocity (a dealt capital ⇒ zero intersecting sites/finds over a seeded
  sweep); relaxed-probe honesty (water fraction refusals); ledger round-trip;
  materialize-then-walk slate proving spawn registration and chest overrides
  at scale.
- Live verify: `/territory` march to a country's heart, find its capital by
  trail and silhouette; second capital refuses in the same country; fps flat
  while the zone stands up beyond the fog.

### Phase 3 as-built (2026-08-13, commit 7692377 — THE COUNTRY CROWNS ITS SEAT)

Shipped as designed; deviations and laws learned:

- **The seat sits AT the country's voronoi heart** — not merely inside
  the country: `territoryLatticePoint` (exported; territoryAt
  refactored onto it, zero behavior change) is the deepest interior a
  country is guaranteed to have, so no interior-distance search was
  needed. THE ONE ATLAS LAW bit here in design review: the seat's
  family MUST come from the POI atlas roster (the sorted-modulo the
  field indexes), never the layout shelf's — a shelf-derived roster
  silently renames every country. Kobold countries lawfully keep no
  capital (no kobold layout on the shelf).
- **Phase 3 ships the basic muster too** (deviation, deliberate): an
  empty walled city in the live world would read broken. Knots deal
  bodies in bands at tier-band levels, the chief is crowned from the
  name pool (stable forever), the cache re-keys one law UP
  (`dangerLaw(min(tier+1,5)).chest`) and stays warded while ANY
  fighter stands. Phase 4 narrows the ward to the last stand and adds
  chapters, patrols, and optional-ward variance.
- **The mask is lazy-computed inside poiCtx()** (capitalRects), so a
  cell can never be decided before its ground's capital is known — no
  beat-ordering race to reason about. Seats cache forever; the cache
  clears wherever ringCache does (claim rings are the one live
  input). Pre-law poi rows inside a materializing capital's walls
  retire to decided-empty — existing worlds converge.
- **The Place Herald banner came free**: the capital zone carries the
  layout's name, and the settlement-discovery machinery ceremonied it
  with zero new code ("A SETTLEMENT STANDS HERE — Goblin
  moot-citadel"). Phase 5's named-capital work should build on this
  door rather than minting another.
- **Slate law (test fixtures)**: hand-built GameServer slates borrow
  prototype methods onto bare objects — new fields must be
  defensively read (`this.capitalCache?.clear()`, capitalRects
  returns [] without cache/sessions) and the frontier slate grew
  `capitalRects: () => []`. The alternative (fixing every slate) was
  21 failures wide.
- **Live-proven**: four organic capitals seated in one march (gnoll
  t5, goblin moot t4, two wolfkin greatrings), the moot stood up
  beyond the fog at 168 tiles on its own beat, and the walk-in found
  gate sentries, cook-yard knots at level 34, and a pond inside the
  walls — the relaxed-siting law reading as intended. Headless fps
  matched the wilderness baseline (software renderer).
- **Debt noted**: `/stronghold here` inherits the player's lattice
  cell (one forced capital per country cell); the density survey and
  World Studio lenses stay Phase 6; satellite/boldness/ember
  lifecycle stays Phase 5 (a cleared capital currently stays a
  carcass until reboot re-stands it — the Phase 5 clock owns better).

## Phase 4 — The Garrison Doctrine (the assault becomes a plan)

Goal: 25-45 bodies that play as ten thoughtful pulls, chapters that
acknowledge, a boss that must be earned.

- **The muster** (`composeStronghold` garrison pass): per-ward knots from the
  layout doc — knot anchors ≥ 10 tiles apart (THE PULL LAW, test-pinned per
  composed instance), bodies scattered ≤ 2.5 within the knot (inside rally);
  ward pack tags ride the family's existing `def.pack` — rally 7/join-2 and
  cry 9-11 stay the pull ceiling by *distance*, spacing keeps wards from
  chaining. **Wall watch**: sentries at gate posts and wall towers (facing
  out — the perception cone means a watched gate is approachable from the
  flank); **patrols**: wall-walk loops and gate→court lanes on the shipped
  waypoint patrol machinery, crossing knot gaps on timers — the moving pull.
  Optional wards roll manned/empty per epoch (THE WAR IS DEALT); night
  windows via the existing `hours` law.
- **The chapters**: `noteWardBreak` (the noteHoldWing dialect, keyed on the
  ward bitmask): each ward's last fighter falls ⇒ one VOICE-true line to the
  participation set; ledger bit set — a broken ward stays broken until the
  epoch turns (return visits find your work standing). The **boss court** is
  the last chapter: named champion (names pool law) + honor guard knot on the
  terrace; the warded boss chest (existing chestWarded law) opens only when
  the court falls; full wipe = clear ceremony + participation bounty ×
  (1 + stage) on the existing tier tables — no new faucet, flood-analyzer
  run recorded.
- **The entrances**: main gate (watched, open), lesser gate (lighter watch),
  authored breach gap (unwatched, awkward approach), and the standing
  palisade law — 4 blows opens a player-made door anywhere, 900s means the
  breach lasts the assault. Sneak, flank, breach, or knock: the layout plays
  four ways by construction.
- **THE DOCTRINE REACHES DOWN**: the same muster pass re-spaces the existing
  compound holds and ordinary camps — wing holdfast clusters (radius 2.1-2.7
  today, one-pull wings) re-anchor as 2 knots where the prefab affords it;
  the shipped defs get a knot-spacing audit. The whole ladder learns to pull.
- Tests: PULL-LAW invariant swept over every repository layout × 16 seeds;
  ward-break bookkeeping (bitmask, once-per-ward lines); ward-gated chest;
  patrol lane validity (≥3 standable points or degrade, the shipped law);
  breach-tile destructibility rows present.
- Live verify: full solo assault at-band on the flagship citadel, timed
  (target 6-10 min), counting pulls (target 8-14, no unintended chains);
  gate-flank sneak entry; wall breach entry; boss terrace last, ward lines in
  order, one bounty.

### Phase 4 as-built (2026-08-13, commit d0595a7 — THE ASSAULT BECOMES A PLAN)

Shipped as designed; deviations and laws learned:

- **The chapter tag is the wing field**: ZoneSpawn.wing (a number) was
  already the war-ground's chapter dialect — capitals reuse it with
  ward INDEXES, so registerSpawns, SpawnState, and the respawn path
  carried chapters with zero wire or schema change.
- **The muster folds the epoch** (musterBase ^ epoch): optional wards
  roll manned ~65% per epoch, knot counts and the watch re-deal —
  pinned by the walls-vs-war test (ground deepEqual across epochs,
  spawns notDeepEqual). The last stand never rolls empty.
- **Patrols are compose-time loops on the shipped machinery**: 'wall'
  wards ring their own yard (8 bearings, ≥3 paceable or degrade to
  the post — the POI law), 'lane' wards pace toward the hearth. No
  new AI, no new fields.
- **The purse decision**: capitals pay bounties ONLY when marked —
  the clear ceremony grants the line and the warden's deed, and
  payBounty stays flag-gated exactly as POIs. Phase 5's town
  integration posts capital marks; opening an unmarked purse here
  would have been a new faucet (the flood law held).
- **The cache lock is the court**: strongholdGarrisonStands(key,
  ward) narrows the chest ward to the last-stand index — a thief who
  breaks the chief's court loots the cache while outlying wards still
  stand, by design.
- **DOCTRINE REACHES DOWN mechanics**: knotSplitAt probes 4 rotations
  of a 10-tile offset (zone-bounds −2, transparent cells re-probed as
  ground, solid prefab tiles refused); the SECOND and later unnamed
  holdfast entries re-anchor there with knot radius 2.5; named
  champions and boldness-rung reinforcements keep the heart. Small
  footprints that afford no split keep the old cluster honestly.
- **Slate law again**: hand-built chapter slates need grantArt stubs
  and the borrowed poiSpawnFights; the ceremony is slate-proven both
  ways (chapter line once + bit; clear stamp + deed + open cache).
- **Live evidence**: the standing moot decodes (via the new read-only
  stronghold: studio door) with 13 ward-tagged spawns across 9
  chapters, 2 patrol walkers, Mor the Unfed crowned at 39; an
  under-armed prover was repelled at the gate five times — the
  citadel defending itself IS the acceptance test. The full timed
  solo assault needs a real input rig (the /xp lever is
  `/xp <skill> <amount>`; headless mouse-hold combat did not land
  blows) — queued for the Phase 6 proving pass alongside the pull
  count audit.

## Phase 5 — The Long War (the capital lives on the frontier clock)

Goal: the stronghold joins every living-world system and makes return visits
mean something.

- **Lifecycle**: capitals ember long (`strongholdEmberMs` 25-35 min — a
  broken citadel is worth looting slowly), fallow long (12-24h), and re-deal
  on the epoch turn with a **different layout roll** from the family pool —
  the returning player finds new walls on the old seat. Clears bank one
  renewal credit (conservation, never inflation). Ward bits persist across
  restarts; a half-broken citadel re-stands half-broken (the carcass law
  extended to chapters).
- **Boldness**: capitals are boldness cores by nature — rungs add patrols and
  re-man optional wards (THE FREQUENCY LAW; never levels); stage pips ride
  the existing chart wire. Satellites: a staged capital seeds its family's
  *holds* (satelliteDef ladder: capital → hold → camp — the country
  mobilizes); the creep/toll fork and calm windows apply unchanged.
- **The word**: `world:` roster gains nothing new yet — `threat_bold` already
  reads boldest-first, and a staged capital becomes the town's loudest worry
  for free. Bounties point at it through the existing worst-standing-trouble
  pick; the purse is the chapter bounty above.
- **Discovery**: full chart ceremony + Place Herald banner (the GAZETTEER
  dialect) — capitals are named from a family name pool at seat time
  ("Skogg's Moot", "The Splitfang Ring"), the one place the epic mints
  ceremony (QUIET CHART holds everywhere below).
- **Territory synergy**: the capital *is* the country's proof — finds and
  camps already lean by family; standing near the capital, the lean reads as
  intent. No new bias mechanics; the seat makes the existing field legible.
- Stretch (explicitly deferrable): THE RUIN REMEMBERS — a cleared capital's
  next epoch may deal a 'ruin' variant (collapsed walls, scavenger garrison)
  before the family returns; ships only if the repository grows ruin layouts.
- Tests: ember/fallow/re-deal stream independence; ward-bit persistence
  through restart slates; satellite ladder capital→hold; calm/creep gates;
  herald ceremony once per discovery.
- Live verify: clear half a citadel, log off, return to standing ward bits;
  full clear → ember loot walk → fallow → epoch turn deals different walls;
  stage 2 capital re-mans its empty wards and the town's guard says so.

### Phase 5 as-built (2026-08-13, commit 8423d33 — THE LONG WAR)

Shipped as designed; deviations and laws learned:

- **The mask outlives the deal**: layoutForSeat folds the epoch (new
  walls each age) while the seat's mask rect widens to the family
  pool's LARGEST footprint — pure and epoch-free, so the ledger-blind
  mask can never disagree with whatever age is standing. The siting
  probes still run for the epoch-0 layout; later ages inherit the
  ground judgment (noted: a re-dealt layout's gates may rarely open
  onto rougher fringe — acceptable, spikes and dirt tolerate it).
- **First standing arms the boldness clock** (observation =
  materialization for a thing only players' approach stands up);
  stages recompose in place by retiring — the next approach raises
  the bolder watch. Stage effects are strictly FREQUENCY-lawful:
  optional wards re-man (65% + 12/stage), sentry knots thicken within
  the PULL LAW's cap of 3, ground bit-identical (test-pinned).
- **The purse opened exactly once**: capitals pay only MARKED
  participants (bounty:sh: flags via postBounty, pruned lazily), at
  bounty_t{tier} × (1 + stage at death). The death stage is captured
  BEFORE the clear zeroes the row — a subtle order bug caught in
  review.
- **cap: origins joined the family law**: capital satellites are the
  family's HOLD (or its strongest camp where no compound exists),
  seeded two cells out townward-ranked; the orphan watch learned the
  cap: dialect (before that, capital satellites would have scattered
  on the next beat — the poiLedger lookup returns undefined for
  synthetic origins).
- **THE ONE ATLAS LAW, witnessed live**: mid-phase, a peer session
  shipped the lynxkin family and every country redrew — the moot's
  cell became parliament country (owls keep no capitals: lawful
  null), and the capitals re-seated with their families. Orphaned
  ledger rows for moved seats are harmless deviations (if the roster
  ever reverts, the seats return). This is the documented territory
  law at capital scale, not a defect — but roster edits ARE
  continental events and the Phase 6 bench should say so.
- **Live-proven cycle** (resilient-runner pattern; the shared vite
  reloads mid-run on peer edits): threat_near at the walls → stage 2
  re-stands bolder → threat_bold=true → ember → dignity → dissolve
  banked debt 1 → fallow 1119m inside the [12h,24h] band.
- **Deferred from this phase**: THE RUIN REMEMBERS (ruin-variant
  layouts) as planned; capital stage pips on the chart (capitals ride
  settlement discovery, not poi markers — needs its own wire, queued
  with Phase 6's lenses); stale settlement-discovery names after an
  epoch re-deal (the chart remembers the old title until revisited).

## Phase 6 — The Surveyor's Glass II (the studio owns the stronghold)

Goal: every dial is content; every capital is visible to the bench; density is
observed, not asserted.

- **Dials**: `strongholdEmberMs`, `strongholdFallowMs`, `capitalTierFloor`,
  probe-grid stride, breach counts — FRONTIER doc with named cross-laws
  (`validateFrontier` grows them; never destructure); nothing per-tier joins
  DANGER_LAWS unless it is genuinely a tier law (the capital reads the field;
  it does not add a column lightly).
- **CMS**: the Foundry bench matures — repository list with true renders,
  ward/knot editors (the poi-bench dialect), PULL-LAW linting inline
  (violations shown as red pin pairs), stage ladder preview (rungs re-manning
  wards, prefix-stable base — seen, not trusted).
- **World Studio**: capital diamonds ranked largest with family color, ward
  bitmask in the cell inspector, mask-reach wash lens (which cells a capital
  silences), seat markers even for un-materialized capitals (the lamp burns
  unseen — the Studio sees the pure function).
- **THE DENSITY SURVEY**: `simulateLandSteps` grows capitals — seats per
  country, layout distribution, masked-cell counts, expected walk-time
  between landmarks; the survey panel renders the full ladder: finds → camps
  → holds → capitals.
- **Wire**: discovery/stage/waypoint wires as-is; one possible addition is
  the ward-break line riding system chat (no ceremony fx needed) — protocol
  untouched unless live verify demands.
- Tests: dial refusals by name; survey determinism; bench smoke via the cms
  harness; lint parity with the validator (one law, two surfaces).

### Phase 6 as-built (2026-08-13, commit ffd4a4a — THE SURVEYOR'S GLASS II; THE EPIC IS COMPLETE)

Shipped as designed; deviations and laws learned:

- **The dials that closed**: capitalTierFloor [3,5] and capitalRoughMax
  [0,0.5] joined FRONTIER (the seat reads both at call time); breach
  counts stayed layout-curated (a Foundry knob, not world weather —
  deviation from the plan's candidate list, deliberate). The Weather
  bench's bandDial key union is HAND-LISTED — the capital ember and
  fallow bands joined it (the lived-in-land lesson, honored).
- **The survey's order is the law**: the pure seat sweep runs FIRST
  and masks the cell simulation, mirroring the live server's
  lazy-poiCtx ordering — a survey that rolled cells before seats
  would overcount the frontier. Live numbers: 233 capitals across the
  ±23-country window, 1976 quiet countries (ocean, settled, and
  layout-less families), 26 of 300 surveyed cells masked (~9% — the
  ONE-CELL DEBT priced).
- **Lint is the validator, verbatim**: the bench runs
  validateStronghold client-side (content ships to the client), so
  parity with the save gate is structural; PULL-LAW pairs paint hot
  red via a direct distance pass.
- **The stage ladder previews through a synthetic seat** at the
  layout's top tier — and surfaced the titles live ('The Shouting
  Ring' at stage 3 · 30 bodies, from 28 at stage 0, walls
  bit-identical).
- **World Studio**: capitals ride worldSnapshot (defensively read —
  the slate law now has three case studies), drawn as the map's
  largest diamonds with family ink, the mask washed beneath, stage
  pips below, broken-ward ticks above, behind a default-on Capitals
  lens.
- **Proving-pass gotchas**: text-content matchers lie about rendered
  DOM (the ladder 'failed' until probed structurally); the cms
  hash-router deep-links known sections but a mid-HMR load can
  render partial rails — networkidle + patience before verdicts.
- **THE ONE STANDING DEBT** (carried, explicit): the timed full solo
  assault with pull-count audit needs a real input rig — recipe: rig
  worlds per war-camp (PORT/DB_DATABASE isolated), `/xp <skill>
  <amount>` (onehand + defence), a real pointer for the mouse-hold
  combat lane, count pulls via the wing-tagged aggro chains, target
  6-10 min at-band and 8-14 pulls on the flagship. Capital chart
  pips and epoch-stale discovery names ride the same future pass.

## Sequencing and safety

Order is pipeline-first: Phase 1 exists so that every later phase has
curated content to compose — the Foundry is the user's core ask and the
highest-leverage piece (it also immediately upgrades ordinary POI prefab
authoring). Phase 2 is small and unblocks the flagship layouts. Phase 3 makes
capitals real in the world; Phase 4 makes them *play*; Phase 5 makes them
live; Phase 6 closes the studio loop. Each phase is its own commit train with
green suites; Phases 1+2 are shippable with zero runtime exposure (repository
content only), so the blast radius stays authorable until Phase 3 flips the
first seat live.

Standing laws audited against, the whole way: one field, many readers; named
streams pure-until-materialized; ledgers store deviations only; POIs are
zones; curated pools, procedural picks (now at layout scale — the FOUNDRY LAW
is this law grown up); budgeted passes (one capital per pass, pre-materialized
beyond the interest window, compose cached); ALL-SKIP-PERIMETER and the
border-flat law compose rather than conflict; ember/boldness/satellite/calm/
bounty/renewal extended only through their own doors; claim rings stay a pure
exclusion mask; hostiles never learn doors (THE OPEN GATE LAW exists because
of it); whiff-0, THREAT LAW, and the loot flood law untouched — the one new
payout is the chapter bounty on existing tier tables, analyzer-recorded; all
player-facing lines through docs/VOICE.md; the chart marker economy pays one
new ceremony (the capital's) and the QUIET CHART LAW holds below it; no
witches, no demons — the dead keep barrow-courts and the goblins keep moots.

---

# The Second Charter — The Walls Widen (2026-08-13)

The user's verdict on the first charter's capitals: right laws, wrong scale.
The encampments must be BIGGER and MORE SPACIOUS — "so big it doesn't even
fit on the whole entire screen when you're zoomed out," an entire zone you
explore and clear with layers, tiers, and depths, "procedural dungeon
crawling on the overworld." Not a small encampment that's one-and-done: a
main aspect of gameplay.

## Ground truth (measured 2026-08-13)

- **The screen**: 40 px/tile at zoom 1, player zoom-out floor 0.85, camera
  yScale 0.6 → a 1080p screen shows **48×45 tiles at default zoom, ~57×53 at
  max zoom-out** (renderer.ts:627-668, 5121-5133). Today's flagship citadel
  (108×101) is barely two screens; the user reads it as one compact camp.
- **The density truth**: shipped layouts are already 93-96% open ground —
  "compacted" is NOT ground clutter. It is (a) footprint vs screen, (b) small
  ward pieces (9-14 tiles) so all content clusters in blobs, (c) a 32-body
  muster cleared in a few minutes, (d) ONE flat enclosure — no layered
  progression. Baseline tilesPerBody: 172-307.
- The elevation plane already speaks 0..3 (FENCED HEIGHT + SOUTH STAIR laws
  are level-generic); the validator's reachability flood, gate scan, and
  PULL LAW are all size-generic. The grammar scales; the generator must.

## The laws of the charter

- **THE ZONE LAW** — a citadel-class capital is a ZONE, not a camp: walls
  2.5-3 screens across at max zoom-out (≥ 140 tiles), interior organized so
  no single screen ever shows the whole story. A hold is 1.5-2 screens — big
  enough to explore, small enough to stay the lesser sibling.
- **THE DISTRICT LAW** — depth is structural: internal walls partition the
  interior into districts (outer bailey → inner bailey → summit), each
  entered through its own found gate in its own wall. The assault is a
  PROGRESSION of enclosures, not a walk across one yard. Every district
  keeps its own hearth, lane network, and chapters.
- **THE STEPPED SUMMIT** — the last stand climbs in steps: a level-1 high
  ward (broad apron, its own knots) and the level-2 boss court above it,
  each behind its own cliff fence and camera-facing stair. The chief is
  VISIBLE work from below and hidden detail until the stairs are won.
- **THE BREATHING LAW** — spaciousness is enforced, not hoped for: piece
  gap ≥ 4 (was 2), one plaza per district, open-ground floor validated
  (≥ 78% of the interior stays walkable meadow/dirt), and pieces grow
  internal courtyards — a ward is a PLACE you walk through, not a stamp.
- **THE OUTER WORKS** — the fight starts before the walls: pickets, spike
  lines, and banner posts stand in the approach ground outside the gates
  (fringe widens to carry them). The first pull happens on the road; the
  gate is found by fighting toward it.
- **THE PULL LAW, UNCHANGED** — knots stay 1-3 bodies at ≥ 10 tiles; scale
  adds MORE knots across MORE ground, never denser ones. A citadel's clear
  is ~20-30 deliberate pulls (5-10+ minutes), not a denser brawl.

## Phase 7 — The Wide Walls (the hold becomes a zone)

Everything rides the existing grammar — this phase re-teaches the generator
and re-pins the shelf; the validator learns the new laws so curation keeps
the bar.

- **Scale envelope** (types.ts): hold walls 84-108 (was 58-80), citadel
  walls 136-164 (was 86-108); FRINGE 3 → 8 (approach ground);
  STRONGHOLD_MAX_DIM 120 → 184, MIN 48 → 64; WARDS_MAX 9 → 16;
  BODIES_MAX 60 → 84; citadel musterMark 32 → 52, hold 24 → 32.
- **Districts** (generate.ts): citadels cut 2 chord walls (three bands),
  holds 1 (two bands), in the family's wall material, each pierced by its
  own gate (2-wide on citadels) + a 45% postern gap; lanes become
  per-district dendritic networks seeded from that district's gates and
  hearth; wards place within their band's ring; gate/breach y-ranges
  respect the chords (no door opening into a wall's back).
- **The stepped summit**: generalize the terrace blit to N steps — citadel:
  level-1 high-ward apron (pad 5-7, own knots) + level-2 boss court; hold:
  single step as today. Cliff rings per step, SOUTH stairs (2-wide citadel),
  stair-foot landings, summit paths.
- **Outer works**: per gate, 55% a picket — sentry knot 6-10 tiles out on
  the road bearing + torch/banner + spike scatter; pickets are optional
  wards ("the south road picket") so epochs can leave a road unwatched.
- **The shelf grows** (pieces.ts): 8-12 new LARGE pieces (14×10..20×14)
  with internal courtyards — great tent ring, drill yard, twin pens, long
  larder, bone garden, cairn field — so a big ward reads as a neighborhood.
- **Validator** (validate.ts): open-ground floor (THE BREATHING LAW);
  district reachability already held by the flood + gate scan (chord gates
  pierce, so strongholdGates counts them); lesser-chest cap scales with
  ground (≤ 2, ≤ 4 when interior ≥ 110² — a zone's exploration pays in
  found caches, texture is still not treasure).
- **Roster re-pin** (defs.ts): sweep seeds under the new generator, keep
  ids/titles/boss pools, regenerate data/prefabs baselines. The bench
  sizeClass heuristic and stage-ladder preview follow the new envelopes.
- **Server scale dials** (same train — a bigger pool must compose the day
  it ships): CAPITAL_PAD_TILES and the seat mask follow pool max dims;
  materialization budget re-derived for ~180² zones; patrol loops knit
  districts through their gates; slate-law defensive reads audited.
- Tests: new-envelope determinism + law refusals by name; every re-pinned
  layout swept; compose invariants at the new scale. Live prove: stand a
  citadel via /stronghold here, walk gate → district gate → stairs → chief,
  screenshot the zoomed-out truth (walls overflowing the frame).

### Phase 7 as-built (2026-08-13, commits 8162690 + claimed-yard — THE WALLS WIDEN)

Shipped as designed; deviations and laws learned:

- **The real hard wall was PREFAB_MAX_DIM = 128** (prefab.ts), not the
  stronghold envelope — nothing bigger even loads (boot skips the file
  silently, Map Studio 400s). Raised to 256; every consumer reads the
  one constant. The server audit's second find was as load-bearing:
  `capitalLatticeRange`'s reach was HAND-PINNED to 128 on a "half a
  120 footprint" comment — now DERIVED (`SEAT_JITTER +
  ceil(STRONGHOLD_MAX_DIM/2) + CAPITAL_CLEARANCE`), because a missed
  mask is ledger-permanent. The materialization-budget worry was a
  myth: zones stand in ONE call and stream lazily per 32×32 chunk;
  bursts are interest-window-bound, so zone-scale costs what camp
  scale did.
- **THE NEIGHBOR LAW** (new): at zone scale two adjacent countries'
  seat envelopes can collide (lattice points jitter into the middle
  80% of 384-tile cells — worst-case separation ~77 tiles). The lower
  lattice hash keeps its seat; the other country lawfully yields,
  judged against the neighbor's cheap pure envelope (no probes).
  Conservative — a country may yield to a neighbor that then fails
  its own probes — priced as honest scarcity.
- **THE CLAIMED YARD** (new law, live-taught): courtyards-as-TILE_SKIP
  read as meadow only on open grass. The first live stand seated in
  Hartfell's pinelands and the yard was SWALLOWED by forest — worse,
  world trees can stand on ground the validator flooded as reachable.
  A standing garrison now CLEARS its ground: every transparent cell
  inside the walls becomes trampled meadow (7% tall-grass tufts); the
  approach ground outside stays wild. Supersedes Phase 1's
  meadow-through courtyards. The wilderness presses against the
  walls, never inside them.
- **The boss court seats low enough for its apron**: the two-step
  branch silently never fired until the citadel court search started
  at y0+10 (apron pad 7 + hull margin 2) — the ASCII render caught a
  single-ring summit where two were designed. Then: citadel musters
  jumped 40→54 as the apron knots landed.
- **THE BREATHING LAW's enforceable halves**: the plan's whole-interior
  open floor wasn't computable from def+prefab alone (FRINGE is a
  generator constant); it shipped as per-ward walkable ≥ 55% + total
  ward-rect share ≤ 30% of the prefab. Baseline audit that calibrated
  it: shipped layouts were already 93-96% open ground — "compacted"
  was footprint-vs-screen, small pieces, a 32-body muster, and one
  flat enclosure, NOT ground clutter.
- **Numbers as shipped**: flagship moot 171×171 (3 screens at max
  zoom-out), citadels 152-180 / 10-14 wards / 40-54 bodies; holds
  100-124 / 7-10 wards / 22-34. Chord walls 24+ tiles apart, gates
  1-wide + 45% posterns, chord-gate watches on the defended side.
  Bench sizeClass now reads the pinned roster first (ward count lies
  once holds carry pickets).
- **Live-proven on an isolated rig** (lane 6: vite :5183 → server
  :8799, DB arx_charter): 'The Shouting Ring' stood at 900,-300 —
  zone decode 171×171, 41 bodies over 12 wings, 4 patrols, elev
  live, chief 'Mor the Unfed'; discovery ceremony fired; the
  garrison killed two unarmored scout accounts (its own proof).
  Camera evidence via the Map Studio cameraOverride seam driven from
  the prover (the body parks outside leash range; the lens flies):
  whole-zone frame only fits at studio zoom 0.22 — no player zoom
  shows the fort whole. Screenshots: c2-*.png in the session
  scratchpad.
- **Debts carried**: garrison simulation never far-retires (bigger
  musters make the audit's standing-forever note heavier — a
  distance-retire path mirroring POIs is future work); the timed
  full-assault proving still needs a real input rig (the Phase 6
  recipe stands); middle-district accents read sparse at studio zoom
  (player zoom is the design target — revisit only if play agrees).

---

# The Third Charter — The Hold Comes Alive (2026-08-13)

The walls are the right size; the user's verdict now is about LIFE:
"flush with life, not just generic procedural elements… patrols walking
down the roads… chieftains and captains properly placed… enemies
interacting… looking like they're actually living in this area…
skeleton bone yards and graveyards that are themed… warg settlements…
different variances… layers and layers of depth." Curation through
LAYERED procedural systems that cluster naturally — never a pasted city.

## The laws of the charter

- **THE POST LAW** — a body stands WHERE ITS WORK IS: the muster reads
  the stamped furniture and anchors knots at it (the cook at the cook
  pot, the drill line at the dummies, the resters by the tents, the
  vigil at the totem, the keeper at the pens). A knot carries its
  `post` so the bench and the ward-break fiction both know WHY that
  body is there. Random anchors are the fallback, never the plan.
- **THE CAMP KEEPS A CLOCK** — drill posts man by day, tent rows fill
  by night (the existing `hours` grammar, finally dealt by the
  generator). The same walls read differently at noon and midnight —
  alive, not looping.
- **THE CAPTAIN LAW** — authority is placed, named, and worth killing:
  every district entrance keeps a TITLED captain ("Warden of the Inner
  Gate", "Captain of the Great Gate") — a knot with `title`, composed
  into a named spawn the way the chief already is. The hierarchy reads
  on sight: pickets → gate captains → district wardens → the chief.
- **THE ROADS ARE WALKED** — patrols follow the ACTUAL lane network:
  the generator emits waypoint `route`s sampled along the worn ground
  it painted (processional between district gates, outer road to the
  picket), and the composer deals them to sentry knots verbatim.
  Synthetic ellipses remain only for wall rounds.
- **THE CLUSTERED GROUND** — decor accumulates where life happens:
  scatter seeds at hearths, ward rims, gates, and stair feet with
  falloff (cook gear by fires, racks by tents, banners up the
  processional, torches pacing the roads), plus a thin wilderness
  scatter. Uniform sprinkle is the seasoning, never the meal.
- **THE MANY BANNERS** — variance is authored at three levels: family
  (the atlas), LAYOUT THEME (a per-layout piece pool bias — the tent
  city, the graveyard court, the warg pens are different HOLDS, not
  different seeds), and seed. The dead keep themed grave fields; the
  wolfkin keep warg settlements; the goblins keep encampments beside
  their citadels.

## Phase 8 — The Living Muster + The Many Banners

- Grammar (types.ts): `StrongholdKnot.post?` (cook|drill|rest|vigil|
  keeper|watch), `StrongholdKnot.title?` (the named-captain law),
  `StrongholdWard.route?: [x,y][]` (authored patrol waypoints).
  Validator vets all three (route: ≥3 in-prefab passable waypoints,
  hops ≤ 12 tiles).
- Generator: post scan per stamped ward (signature tiles → adjacent
  spaced anchors, hours for drill/rest); titled captains at the chord
  gates and great gate; routes sampled every ~6 cells along the
  processional and outer roads; clustered decor per THE CLUSTERED
  GROUND; road torch cadence (family-voiced: torch/brazier/bone).
- Compose (server): `knot.title` → named spawn; `ward.route` → world
  patrol (paceable-checked, degrade to post); hours already ride.
- Content breadth: new themed pieces (grave field, warg pens, war
  tents) + `pieces` bias per roster entry + FOUR new layouts —
  dead grave-court citadel, wolfkin warg-camp hold, goblin tent-city
  encampment hold, gnoll great-fort citadel (roster 9 → 13). Seeds
  swept, baselines regenerated.
- Tests: post/title/route laws by name; compose deals named captains
  and road patrols; shelf sweep covers the new thirteen. Live-prove
  on rig lane 6: named captain at a chord gate, a patrol walking the
  processional, themed decor clusters on screen.

### Phase 8 as-built (2026-08-13 — THE HOLD COMES ALIVE)

Shipped as designed; deviations and laws learned:

- **THE POST LAW ships as a furniture scan, not authored coordinates**:
  signature tiles (cook pot/spit/fire → cook; dummy/racks → drill day
  6-20; tents → rest night 19-7; totem/brazier/drum → vigil;
  cage/nest → keeper) found in each ward's stamped ground, anchored
  on adjacent passable spaced cells. **The claim-at-selection lesson**:
  posts spaced-checked but claimed after the scan let two posts land
  inside PULL LAW range — a peer session's blanked art sheets found
  it in minutes (the shared-tree throw law, again). Claim NOW.
- **The clock is family-voiced**: beast families keep it through the
  den (thicket nests = day-rest 7-19, nocturnal denners), the dead
  keep the OPPOSITE clock (cairn vigils stir 18-6 — grave rows
  crowded at midnight, quiet at noon). One scan, three fictions.
- **THE CAPTAIN LAW**: titled knots are ONE body by validator law
  (a named spawn of count 2 is nonsense); Captain of the Great Gate
  + a Warden per chord gate, family captain entries, +3 levels.
  The pre-existing compose test found the chief via "any named
  spawn" — captains broke it; the chief is now the named spawn from
  the BOSS pool.
- **THE ROADS ARE WALKED**: routes sampled every 4th cell along the
  L-paths the lanes actually painted, passability-filtered, hop law
  ≤ 12 enforced at build AND validated; chord wardens walk heart →
  gate → heart (25-28 waypoints live), pickets walk their road.
  Synthetic ellipses remain for wall rounds only.
- **THE CLUSTERED GROUND**: hearthGear vocab per family ringing the
  hearths, accents clustered at ward rims, banners flanking the
  summit stair, a marker line pacing every road (torch/brazier/
  skull by family), thin wilderness sprinkle kept. **The dressing-
  on-anchors race** (accents could land ON a mustered anchor —
  seed-lucky since Phase 1) closed with an anchorCells guard.
- **THE MANY BANNERS**: spec.pieces per-layout pool bias; grave rows
  / warg pens / war tents pieces; FOUR new layouts (dead grave-court
  citadel, wolfkin warg camp, goblin encampment, gnoll great-fort) —
  roster 13, every layout 2-3 titled captains, 4-16 posts, 1-3
  routes.
- **The lever honors the hand**: /stronghold here forced gravecourt
  but stood barrowcourt — materializeCapital's epoch re-deal cannot
  reproduce a hand-picked layoutId; exactLayout now rides the dev
  path only. Also fixed: the compose test's seat-rect/zone-origin
  conflation (the mask is NOT the zone).
- **Live-proven** (rig lane 6, 'The Sunken Rows' at 1900,-300):
  decode showed Captain of the Great Gate L47, Wardens of the High/
  Inner Gates L47/L41, The Grave Warden L50, patrols of 25 and 28
  waypoints on the processional, four skeleton@18-6 night vigils;
  night shot: the processional way lit brazier-by-brazier, the road
  marker line glowing across the dark yard. The garrison killed the
  scout during standing (three accounts dead across two charters —
  the muster defends itself). 1,569 workspace tests green.

### Phase 9 as-built (2026-08-13 — THE CAPTAIN'S KEY)

The loot charter, shipped same-day on Phase 8's captains:

- **THE CAPTAIN'S KEY**: each titled captain keeps ONE lesser cache
  nestled at their post — the generator tucks it against the ward's
  wall-side rim nearest the captain (the chord wall's defended side,
  the gate yard's corner). Kill THE CAPTAIN and the lid lifts — the
  yard's other bodies never hold it (the crowd is the fight, the
  keeper is the lock). The chief's cache keeps the last-stand ward
  law unchanged. Citadels: 3 captain caches + the boss chest; holds:
  2 + 1 — well earned, never a scatter of freebies (2..3 test-pinned,
  validator refuses a lesser chest in an untitled ward by name).
- **The kind ladder is clamped**: the chief pays one law up (min
  tier+1, 5); a captain pays the tier's law CLAMPED to 4 — the live
  decode caught tier-5 captains re-keying to boss-kind (four boss
  chests per citadel). Now: one boss chest at the summit, gilded at
  the captains' posts (live decode: ChestBoss at the court, three
  ChestGilded down the processional).
- **Server plumbing**: chest cells now carry their keeper —
  `sh:key:wardIdx` for captained wards (bare `sh:key` = the chief's);
  strongholdCacheWarded parses the suffix, strongholdCaptainStands
  reads the wing's NAMED body alone; retireCapital sweeps both cell
  forms. Slate-tested: captain falls while a line goblin still mans
  the yard → the captain cache opens, the chief's holds; the last
  stand falls → the chief's opens.
- **Smaller camps unchanged**: POI camps keep their own chest laws —
  the strongholds are where the big chests live, and every one of
  them is somebody's charge. 1,571 workspace tests green.

---

# The Hybrid Charter — Clusters of Clusters (2026-08-14)

The user's ask: see how procedural and pre-authored zones actually
meet, then author EXPANSIVE POIs (3-5× the shelf) so the frontier
reads as constellations — authored landmarks and procedural camps
gathered around the capitals.

## The audit's verdict (2026-08-14)

- The hybrid pipeline already exists structurally: every POI def
  deals from a prefab pool; every pool prefab is a data/prefabs JSON
  (FILE WINS, Map Studio-editable); sketch-origin and hand-authored
  files mix indistinguishably. 28 archetypes + 14 minor finds +
  3 compound holds (court + 2-4 wings, ~60-65 tile constellations).
- The SIZE was the gap: median POI 14 tiles across, the biggest 23
  (hoargate), against a cell ceiling of ~98. "Small and minor" was
  exactly right.
- The CLUSTER was inverted: capitals masked their ground AND repelled
  compound holds (regionCells pad) — a capital's neighborhood was
  QUIETER than open frontier, the opposite of clusters-of-clusters.

## Shipped (THE LANDMARKS + THE GATHERED MARCHES)

- **THE LANDMARKS** (content/pois/landmarks.ts): five expansive
  authored grounds, 60-68 tiles (3-5× the median), built the Foundry
  way — deterministic builders at pinned seeds, painted interiors
  (the claimed-yard lesson), one modest iron cache each (the loot
  law: strongholds keep the big chests): the great barrowfield
  (kerbed mound rows, pillar processional, the great barrow's lit
  chamber), the fallen keep (broken curtain, weed courtyard, intact
  keep floor), the goblin sprawl (five-camp tent city, no walls),
  the kill-field (bone drifts, den mouths, rib-ringed hoard), the
  lost waystead (robbed king's waystation, wagon ring, watch-mound).
  Five new archetype defs with champion name pools, night watches,
  patrol sentries, signs, and approach cues; weight 2 (landmark-rare).
- **THE RELAXED LANDMARK SITING**: whole-footprint standability is
  statistically brutal at 66×50 (the capitals' Phase-3 audit,
  relearned at POI scale) — expansive prefabs (≥45/axis) sample on a
  stride-3 grid and tolerate ≤10% rough ground; ordinary camps stay
  strict. The coverage sweep is what caught it: landmarks never
  occurred until the law relaxed.
- **THE GATHERED MARCHES** (pois.ts + FRONTIER dials marchBand 160
  [64,320] / marchGather 1.6 [1,2.5]): cells within the march band
  of a capital's mask deal MORE (poiChance × gather, capped 0.85)
  and lean TWICE as hard to the country's family — every capital
  reads as the heart of a same-blood constellation. Compound holds
  stay excluded near capitals (one war-ground per region, unchanged);
  the mask law unchanged. Pure: the same ctx.capitals the mask reads.
  Statistically test-pinned (band cells gather visibly over a
  120-seed sweep; masked cells stay silent).
- **Live-proven** (rig lane 6): 'The great barrowfield' stood at
  -945,-204 on the fourth candidate ground (the land refuses
  honestly), discovery banner fired, Skeleton Guards on the
  processional and 'The First Buried' (the def pool's champion)
  walking the east rows. 1,592 workspace tests green.
- **Debts**: landmark acceptance ~1-in-4 grounds at 66 wide — fine
  for weight-2 rares, revisit SITE_TRIES if play wants them denser;
  the Weather bench rows for marchBand/marchGather ride a future
  bench pass (dials live + clamped + refusal-tested today).

## Second rung — THE INFLUENCE LAW (2026-08-14)

The user's verdict on the whole ordinary shelf: still stamps. Every
POI should read as an INFLUENCE ZONE — concentrated heart, worked
surroundings, room to pick pulls apart. Shipped:

- **THE INFLUENCE LAW** (content/pois/influence.ts): every ordinary
  POI prefab expands ~2.6× per axis (median 14 → 34-42; hoargate 48,
  wardline/diggers per measure) — the authored sketch stays VERBATIM
  as the heart (tiles, markers, portals bit-identical, translated),
  wrapped in generated outskirts: worked ground patches, 1-3
  satellite pockets with their worn lines home, family litter
  thinning with distance (influence FADES), tracks walking out.
  Deterministic per id. Compose spreads the muster for free: holdR
  and knot splits read the dims, sentries ring the bigger footprint.
- **THE MEASURED CAPS**: the authored pins are the law — every
  coordinate-pinned site probed against its pool (≤ tolerance within
  the 14-tile nudge): waystations DON'T expand (the spineshelf ledge
  is wedged between Silverfall's clearance and crag rough — original
  footprints exactly); fell barrows DON'T (the barrow cell takes
  only 17×13 — the fell theme IS scarce rock); toll bar 22, diggers
  24, hoargate 48; wings 20 (26 starved compounds of wings). Probe
  scripts beat hand-waving every single time.
- **THE RELAXED SITING, GENERALIZED**: every footprint scan is now
  tolerance-based (small stamps ≤5% rough, ≥34/axis territories
  stride-3 ≤10%) in decideSite AND findAuthoredAnchor — the
  capitals' Phase-3 lesson finally walked all the way down. Latent
  geometry bug found: the authored-pin nudge searched Chebyshev but
  the test asserted Euclidean.
- **Live-proven**: an expanded goblin stockade stood at -686,-472 —
  heart + three worn tracks + a banner pocket + fading litter, read
  as territory in real forest. The garrison killed the scout (again).
  1,625 workspace tests green.
- **Debt**: waystations and fell barrows carry no outskirts by
  measure — if play wants influence there, it must come from
  compose-time cues (which don't consume pinned ground), not prefab
  growth.

---

# THE PEOPLED LANDMARKS (2026-08-14)

The user's charter: the goblin and the dead lanes carry the game's
repeatable hostile content — they need a LIBRARY of authored
landmarks, not one apiece. And the places must be ALIVE: bodies
gathered round a fire cooking, others at their own work, patrols
that walk a round, sit down, do something, and move on. Built as
modules — curated set-pieces that interplace into other grounds —
so the systems compose: posts + routes + modules + landmarks stack
into a lived-in world.

## The audit's verdict

- `ZoneSpawn.patrol` already flows end-to-end (authored stronghold
  routes prove it); the AI lingers 2-7s per waypoint and re-pins
  origin. Routes for ordinary POIs are compose-work only.
- **`knot.post` was FICTION**: strongholds' cook/drill/rest/vigil
  posts never reached runtime — composeStronghold reads every knot
  field except `post`. Only the derived hours survived. No hostile
  body in the game has ever walked to a fire.
- `PoseState.Sit`/`Lie` already ship for any entity (one byte, the
  routine ticker proves the client render) — zero wire work.
- Ordinary-POI holdfasts wander a 3-tile drift; the only "post"
  concept is friendly-actor hearth/watch seats in composePoi.

## The design — four rungs

1. **THE POST COMES ALIVE** (server runtime): `ZoneSpawn.post`
   {kind, x, y, dir, hours?} → NpcComp → a new idle branch (after
   patrol, before wander): walk to the post spot, plant, face the
   anchor, and hold the post's pose — cook = seated at the fire
   with Craft pulses (the campfire IS a cooking station; the client
   choreography is free), rest = seated at the tent, drill = Idle
   with Attack pulses at the dummy, vigil/keeper = held stance
   facing the charge. `poseUntilTick` guards the held pose against
   the end-of-tick Idle write. Post hours gate BEHAVIOR, not
   existence: off-window the same body falls through to wander —
   the camp changes with the clock without despawning anyone.
2. **THE SIGNS READ EVERYWHERE**: the strongholds' POST_SIGNS
   furniture scan ports into composePoi — every ordinary POI's
   stamped fires, tents, dummies, totems, cages become claimed
   posts, and a measured share of the holdfast muster splits into
   count-1 posted spawns (fires seat several; the rest one each).
   Every existing POI + every influence-pocket fire lights up with
   zero prefab changes. Strongholds pass `knot.post` through the
   same ZoneSpawn seam — the fiction finally made flesh.
3. **THE ROUND HAS STATIONS**: patrol waypoints grow optional
   {dwell, sit} — a route can seat its walker at the fire for a
   real spell before the next leg. `PrefabDef.routes` carries
   authored routes (validated in-bounds, hop-capped); composePoi
   deals them to patrol sentries before falling back to the
   synthetic ring — the strongholds' authored-route preference
   walked down the shelf.
4. **THE MODULE SHELF + EIGHT LANDMARKS** (content/pois/canvas.ts
   + modules.ts + landmarks.ts): the painting toolkit becomes a
   shared canvas library, curated set-piece modules (fire circle,
   feast trestles, totem processional, drum ring, cage row, watch
   knoll, warg pen, spoil yard, ossuary run, kerb row, cairn,
   trench scar, standard row) — and eight new landmarks built from
   them, four per lane:
   - **goblin**: the warren door (dug into rock, spoil + sorting
     yard + cages), the drum moot (feast ground: drum ring, moot
     fire, trestles, brew corner), the grub farm (goblins aping
     agriculture: crooked crops, looted-helm scarecrow, boar pen),
     the raid muster (staging ground: barriers, drill yard, banner
     avenue, worg pickets, signal pyre).
   - **dead**: the sunken chapel (bone-lined nave, lectern, garth
     graves), the old muster (a battlefield where the ranks never
     disbanded: trench scars, fallen standards, drill lines), the
     cold cloister (colonnade garth, refectory where the dead
     still sit at table, bell mound), the kings' row (great cairn
     crown, offering slabs, brazier processional, toppled pillars).
   The five founding landmarks retrofit authored routes; posts
   arrive free via the compose scan. Loot law holds: one modest
   iron cache each — strongholds keep the big chests.

## Laws

- **A POST IS A BEHAVIOR, NEVER A CAGE**: combat always interrupts
  (the branch lives in the idle flow); return walks home and the
  post resumes. The dead keep unwindowed posts (the dead don't
  keep hours); goblins keep the strongholds' clock (drill 6-20,
  rest 19-7, vigil 18-6).
- **ONE SEAM**: ZoneSpawn is the single choke point — both lanes
  (ordinary compose + stronghold compose) light the same runtime.
