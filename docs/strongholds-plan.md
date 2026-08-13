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
