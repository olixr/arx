# The Lived-In Land — The World Learns Its Texture

The third act of the procedural world epic. `procedural-world-plan.md` taught the
world to *grow* camps; `living-frontier-plan.md` taught it to *move them on and
push back*. This one teaches the land itself to **read as inhabited** — dense,
clustered, trailed, territorial — so that walking the frontier feels like moving
through country that things actually live in, not scanning a grid for the one
site per cell.

The player's verdict driving it all:

> Points of interest are far and few between — one per cell, and the cells are
> large. I'm scanning for blips. If a goblin encampment moved in, roads and
> trails should establish around it. Right now it's one or two enemies placed
> around the land and it feels rigid. I want strategic clustering, bigger zones
> of encampments — five or ten minutes clearing a whole war-ground, not hunting
> small camps. Layer the generation. Make it organic. Make it lived-in.

## Ground truth this builds on (verified 2026-07-31)

- **One site per 128-tile cell, and half the cells are empty.** `poiForCell`
  (`server/src/world/pois.ts:137`) rolls existence once per cell against
  `DANGER_LAWS[tier].poiChance` (0.30–0.50 for tiers 1–5,
  `content/src/danger.ts:87`), then places exactly one site. The median prefab
  is 13×9 — **0.7% of its cell's area** — with 2–5 fighting bodies. The site
  scan margin (`pois.ts:190`) caps any single prefab near ~100 tiles wide.
- **Ambient life is a trickle of singletons.** `tickWildSpawns`
  (`gameServer.ts:12457`) keeps `round(8 × wildDensity)` = **2–4 bodies** in an
  80-tile bubble, one spawn attempt per 2-second pass, every body alone.
  `WildEntry` (`content/src/wilds.ts:19`) has no count or pack field. The pack
  law (`NpcDef.pack`, `rallyPack`, `PACK_RALLY_RANGE = 7`) is live in POIs and
  **dead code in the open frontier** — singles scattered at random angles are
  never within rally range of each other.
- **The land does not tell on its tenants.** The approach cue (`pois.ts:415`)
  is a `pad+1` ≈ 10-tile rut that breaks at the zone rect edge. `roadBearingAt`
  finds a road up to 40 tiles out but only *orients* the stub — no procedural
  site ever visibly connects to a road. Roads probe as `'rock'` so sites
  actively refuse to stand near them.
- **Cluster machinery already exists, unused by the wilds**: ringed group
  spawns (`gameServer.ts:1988` — `{count, radius}` ring + jitter), garrison
  knots (`pois.ts:519`), ore-formation patch noise
  (`worldgen.ts:445` — a high-frequency fbm gate, the patch-field precedent),
  taiga stands from `coldAt`/`pinelandAt`, directional scatter cones
  (`pois.ts:449`).
- **The frontier clock and family machinery stand** (Living Frontier, all six
  phases): ember/fallow/renewal conservation, boldness rungs, satellites with
  `originCell` family ties, calm windows, `regionBoldMax` over 5×5-cell
  neighborhoods — the exact regional-cap and multi-cell-family precedents this
  epic composes with.
- **Every pacing dial is already content**: `FRONTIER` doc (27 dials, kind
  `'frontier'`), `DANGER_LAWS` the one-law table, World Studio living map,
  CMS Weather/POI benches. New dials join those homes, never constants.

## Industry laws we adopt (research digest)

1. **Lattice-with-jitter beats pure chance** (Minecraft's structure grid): roll
   placement on a sub-grid with hashed jitter and you get blue-noise spacing
   *and* a guaranteed maximum gap. No more "three empty cells in a row" — the
   fix for scanning.
2. **Multi-scale layering** (BotW's triangle rule, theme-park weenies): the
   land needs a hierarchy — rare big anchors you steer by, medium sites you
   detour for, small finds that reward the walk between. Each layer has its own
   frequency and its own stream; they never compete for one roll.
3. **Encounter knots, not sprinkles** (Diablo's pack grammar, L4D's mob/wanderer
   split): threats come as authored-shaped *groups* with a leader, spacing, and
   a shared reaction. Three wolves in a knot are an encounter; three wolves 40
   tiles apart are scenery.
4. **The nest is the source** (Valheim's spawner nests, SoD2 plague hearts):
   ambient pressure traces to a *visible, destroyable* habitat feature. Kill
   the den and its kind thin out nearby — legibility and agency in one prop.
5. **Desire paths tell the story** (Witcher 3's monster nests off the road,
   RDR2's trail language): occupation wears the ground. A camp that has stood
   for weeks *must* have a path to the road it raids. Trails are both fiction
   and the discovery affordance — cross one anywhere and follow it home.
6. **Territory is a field, not a spawn table** (STALKER's A-Life factions,
   Horizon's machine sites): regions lean toward one family. Coherent country
   ("this is wolfkin land") reads as a living world; uniform iid picks read as
   a slot machine.
7. **Bigger means busier, never deadlier** (L4D frequency law, already this
   codebase's THE FREQUENCY LAW): a war-ground is more bodies, more knots, more
   structure — the level band stays the tier's. Danger scaling is the field's
   job alone.
8. **Clear in chapters** (Destiny lost sectors, SoD2 hearts): a 5–10 minute
   site needs sub-goals that acknowledge progress — wings that break, a court
   that stands last — or it reads as a slog, not an epic.

## The laws of this epic

- **THE LAYER LAW** — three placement layers, three named stream families, one
  danger field: *holds* (rare, one per region), *sites* (today's POIs, one per
  cell), *finds* (several per cell on a sub-lattice). A layer never rolls on
  another layer's stream; every layer reads `DANGER_LAWS` for its density and
  its bands. One field, many readers — unchanged.
- **THE KNOT LAW** — ambient life spawns as authored-shaped groups (a pack, a
  herd, a sounder) with spacing that puts them inside `PACK_RALLY_RANGE` of
  each other. The existing pack law wakes up for free; no new AI.
- **THE WORN-GROUND LAW** — anything that stands long enough to matter wears a
  path to where it goes. Trails are composed *into the site's own zone* (POIs
  are zones — never a parallel stamping path), they widen as boldness climbs,
  and they die honestly at water and rock like real feet would.
- **THE TERRITORY LAW** — a slow field biases which family claims a region;
  finds, sites, and holds in one region share a palette. The field folds no
  epoch — country is geologic. Bias is never exclusivity: the pick stream
  still runs, other families still appear, the land leans rather than repeats.
- **THE TEXTURE-IS-NOT-TREASURE LAW** — finds pay atmosphere first: forage,
  scenery, one modest cache at most, low chest kinds per the law table. The
  loot flood law stands: no new faucet without the analyzer, no pity, no
  player-state dials. Density must never inflate the economy.
- **THE QUIET CHART LAW** — finds never mint chart markers or discovery
  ceremonies (the CHART LAW's marker economy is for landmarks). Holds get the
  full ceremony; sites keep theirs; finds are for the eyes, not the map.

## Phase 1 — The Herd and the Pack (wilds v2)

Goal: the open land between sites carries life that moves in groups, at real
density, with habitat logic. Highest feel-per-risk; touches no POI machinery.

- **Knot grammar** (`content/src/wilds.ts`): `WildEntry` grows
  `band?: [min, max]` (bodies per knot, default `[1,1]`),
  `spread?: number` (knot radius in tiles, default 2.5 — inside rally range),
  `lead?: { npc: string }` (a fourth wolf that is the alpha, a stag over the
  hinds; the lead's level clamps to the same tier band — busier, never
  deadlier). Roster rework: wolves `[2,4]` + lead, boars `[2,3]` sounders,
  stag `lead` + hind `[2,4]` (new `hind` prey def, wander-only), rams `[2,3]`,
  night worg pairs, skeleton `[2,3]` grave-knots at t3+. Singles stay legal
  (bears, trolls, adders hunt alone). `wildRosterErrors` vets bands/spread.
- **Budget rework** (`gameServer.ts:12490`): the per-player budget becomes
  `round(WILDS.budgetBase × wildDensity)` with `budgetBase` a new dial
  (default 14 → tier 1 ≈ 4 bodies, tier 5 ≈ 8) counted in *bodies*, spawned in
  *knots* — one knot attempt per pass places the whole group via the ringed
  group-spawn math (`gameServer.ts:1988` precedent, 8 solid-tile tries per
  body, partial knots allowed ≥1). Up to 3 placement probes per pass (the
  single-attempt starvation fix); still strictly bounded, still despawn-first.
- **THE DEN IS THE SOURCE**: knots prefer to stand near a matching Phase-2
  find when one is materialized nearby (den mouth → wolfkin, warren → rats,
  glade → herds); until Phase 2 lands this is a no-op hook (`habitat?: string`
  on `WildEntry`, matched by find id prefix). Clearing a den find quiets its
  habitat bias — agency lands in Phase 2 with the finds themselves.
- **Encounter dignity**: knots spawn in the existing 34–56 annulus (offscreen
  law already holds), never on roads (`ROAD_CALM` guard stands), never in
  claim rings (mask law stands), prey keeps authored level, predators lift to
  band min exactly as today (`gameServer.ts:12538` unchanged).
- **Dials**: `WILDS` table joins `content/src/frontier.ts`'s pattern — but as
  columns on the existing one-law table where they are per-tier
  (`wildDensity` stays; `budgetBase`, `knotProbes` are global dials in the
  FRONTIER doc — never destructure).
- Tests: wilds.test.ts (band vetting, knot composition determinism-free but
  bounded, lead level clamp, spread ≤ rally range pin); server test for
  budget math + despawn accounting counting bodies not knots.
- Live verify: stand at tier 3 forest edge at noon and at midnight; expect a
  wolf knot answering as a pack when one is pulled (rally law visible), a herd
  that drifts as a body, ≥4 ambient bodies in view of the walk, roads clear.

## Phase 2 — The Small Finds (the third layer)

Goal: several minor discoveries per cell so the walk between sites pays.

- **Grammar**: `MinorDef` in `content/src/pois/minors/` (JSON, one validator
  `validateMinorDef`, DB-first under kind `'minor'`, live registry — the
  PoiDef pattern wholesale): `{ id, name, tiers, weight, prefabs (5×5..9×7),
  garrison ≤3 bodies, habitat?: string, cache?: { chance ≤0.35, kind ≤ law },
  cues? (clearing ≤2, scatter) }`. No havens, no boldness, no satellites, no
  clearedFlag, no actors — texture, not landmarks. Curated roster to ship:
  hunter's rest (cold fire, bedroll), snare line, waymarker cairn, bone pile
  (+2 scavenger rats/crows), **den mouth / warren / glade** (the Phase-1
  habitat anchors), standing stone, wrecked handcart, tapped yew, forage
  patch, old fire ring. All prefabs through Map Studio — curated pools,
  procedural picks, code never draws a tent.
- **Placement — THE LATTICE**: each POI cell divides into a 4×4 sub-lattice of
  32-tile slots. Per slot, stream `ST_FIND` (seed ^ salt, cellX, cellY, slot,
  epoch) rolls vs `DANGER_LAWS[tier].findChance` (new column; draft 0 / 0.14 /
  0.18 / 0.20 / 0.22 / 0.22 → expected ~2–3.5 finds per hostile-tier cell,
  guaranteed-gap by construction). Slot anchor = slot center + hashed jitter
  ±10, then the site scan's own probe ladder at miniature scale (standable
  footprint, zone clearance, claim rings, `ROAD_CALM`, ≥ 20 tiles from the
  cell's major site anchor and from any other accepted find slot).
- **Materialization — ONE ZONE PER CELL**: all of a cell's finds compose into
  a single zone `poi:<cx>,<cy>:f` (bounding box, `TILE_SKIP` between
  footprints) so zone count and overlay cost grow by ≤1 per cell, not per
  find. Rides the same one-cell-per-pass `tickPois` budget: a cell
  materializes its site first, its finds zone the next eligible pass. The
  120fps work still never learns POIs exist.
- **Ledger**: new `world_minors` table, one row per cell — `(cell_x, cell_y,
  epoch, slots_cleared bitmask, first_seen_at)`. Deviations only (a cell whose
  finds all stand writes nothing until one clears). A cleared find's garrison
  stands down forever (ember-lite: carcass until the cell's fallow turn
  re-rolls everything on the new epoch). **Finds never bank renewal credits —
  the conservation law owes the world its trouble, not its texture.**
- **Chart silence**: no discovery wire, no markers (THE QUIET CHART LAW). The
  World Studio sees them (Phase 6); the player's chart stays a chart of
  landmarks.
- **Flood audit**: every `cache` table through the flood analyzer before ship;
  coin/consumable/material faucets only, drop-scroll shelf law untouched.
- Tests: minors.test.ts (validator refusals, lattice determinism, spacing
  invariants, one-zone composition, bitmask round-trip); flood analyzer run
  recorded in the commit message.
- Live verify: walk one cell edge to edge at tier 2 and count finds (expect
  2–4); wipe a bone pile's scavengers, confirm the bitmask row; `/poi fallow
  0` turns the cell and re-deals the finds on the new epoch.

## Phase 3 — The Worn Path (trails)

Goal: occupation wears the ground; every real site can be found by its trail.

- **The trail arm** (`composePoi`): after cues, walk the existing rut walker
  (`pois.ts:415` generalized) from the footprint edge along the approach
  bearing **until it meets a road (`roadDistanceAt ≤ ROAD_SHOULDER`), an
  authored-zone clearance, water/rock, or `trailReach` tiles (FRONTIER dial,
  default 48)** — whichever first. The zone rect grows to the trail's bounding
  box (`TILE_SKIP` everywhere but the ruts + verge). Honest death: a trail
  that meets no road tapers — double rut → single rut → trampled grass →
  nothing — a desire path fading into the wild, never a hard cut.
- **Width speaks rank**: finds wear a 1-wide footpath (only when `habitat` or
  `cache` justifies feet — cairns and stones stay pathless); sites keep the
  2-rut walk; holds (Phase 4) wear a cart-track (2 ruts + center wear + stump
  verges). **Boldness climbs re-compose the site (existing recompose-in-place
  law) and the trail widens with the stage** — a stage-3 camp's road mouth
  reads from 30 tiles away. The land telegraphs the ladder before the pips do.
- **The road mouth**: where a trail meets a road, stamp a small verge scatter
  (trampled grass, a stump, the def's scatter tile) on the junction — the
  breadcrumb a traveling player actually crosses. No text, no signs (SIGNAGE
  epic owns written words).
- **Road hug relief**: the site scan's `'rock'`-probe refusal near roads
  stands (sites still never straddle the carve), but the *trail* is the sanctioned
  connection. `ROAD_CALM` spawn suppression is untouched — trails carry you to
  trouble; trouble does not stand on the road. The journey-with-teeth law holds.
- Tests: trail determinism, taper-on-no-road, road-junction bound, stage-width
  monotonicity, rect growth stays inside cell + clearance; screenshot pass.
- Live verify: stand a warcamp 30 tiles off the first road, walk the road and
  find the mouth; `/frontier stage 2` and watch the trail widen on recompose.

## Phase 4 — The War-Ground (holds)

Goal: one great site per region — a compound you clear in chapters, 5–10
minutes of fighting, the landmark the region steers by.

- **Compound grammar**: `PoiDef.compound?: { court: prefabPool, wings:
  { pool, count: [2,4] } }`. Composition: court at the anchor; wings on ring
  bearings at radius `courtHalf + wingHalf + 4..8`, each wing's footprint
  probed independently (a failed wing is skipped, never forced); worn paths
  connect each wing to the court (the Phase-3 walker, interior edition); ONE
  zone, `TILE_SKIP` between structures. Total footprint ~70–90 tiles across —
  inside the cell-scan ceiling with margin from the court + ring radius.
- **Garrison in chapters**: each wing carries its own garrison knot (3–5) with
  its own sentry pair; the court holds the named chief (names pool law), the
  warded boss chest, and the last stand. The bounded cry already keeps knots
  pull-able — wings break one at a time by construction. **Wing-break
  ceremony**: when a wing's last fighter falls, the participation set hears
  one VOICE-true line ("The west pen goes quiet.") — progress acknowledged,
  chapter by chapter. Full wipe = the existing clear ceremony + bounty; purse
  rides the existing tier tables × stage, nothing new minted.
- **Placement — THE REGION LAW**: holds only stand where tier ≥ 3 and the 5×5
  neighborhood holds no other (the `regionBoldMax`/`boldCoresNear` scan
  pattern, new `holdsNear`). Stream `ST_HOLD` promotes a cell that already
  rolled a site: promotion chance from `DANGER_LAWS[tier].holdChance` (draft
  0/0/0/0.10/0.14/0.18). Ledger: `world_pois` grows `hold` flag (deviation
  row as ever). Expected: roughly one hold per region of deep frontier —
  scarce enough to be a destination, guaranteed enough to be steered by.
- **Frontier interplay**: a hold is a boldness core by nature (rungs add wing
  bodies — THE FREQUENCY LAW pins levels), satellite- and creep-capable, and
  its clear stamps the standard calm. Ember lingers longer (`holdEmberMs`
  dial, 15–20 min — a broken war-ground is worth savoring) and its dissolve
  banks **one** renewal credit like any clear: conservation, not inflation.
  Guard dialogue's `world:threat_bold` already reads boldest-rung-first; a
  hold at rung 2 becomes the town's loudest worry with zero new flags.
- **Discovery**: full chart ceremony; the marker carries the stage pips as
  today. Holds ship on three families first (goblin **war-hold**, bandit
  **stockade court**, wolfkin **great den**) — court + wing prefabs authored
  in Map Studio, ASCII-sketched builtins seeded like every prefab before.
- Tests: compound determinism + prefix stability under stages (the Phase-2
  boldness lesson, pinned), wing-skip honesty, region cap, promotion stream
  independence, wing-break detection (per-wing spawn bookkeeping), clear =
  all wings + court.
- Live verify: `/poi here goblin_warhold` at tier 4, clear it solo timing the
  chapters (target 5–10 min at-band), wing lines fire in order, ward breaks
  at the court, bounty pays once, `/frontier` shows the ember; confirm a
  second hold refuses to stand in the same region.

## Phase 5 — The Country Keeps a Name (territory)

Goal: regions lean toward one family; the land stops feeling like a slot machine.

- **The field**: `territoryAt(seed, tx, ty)` in content — low-frequency value
  noise over ~3-cell wavelength picking among the *families* present in the
  def roster (goblin / brigand / wolfkin / kobold / dead / wild), weighted by
  which defs are tier-eligible there. Pure, no epoch fold (THE TERRITORY LAW —
  country is geologic; renewal churn happens *within* a country's palette).
- **The lean**: the KIND pick (`pois.ts:164`) multiplies a def's weight ×
  `territoryBias` (FRONTIER dial, default 3) when the def's `family` matches
  the field; finds and holds read the same field the same way; the wilds
  roster gains optional `family` affinity for predator knots. Bias never
  gates: every family's weight stays > 0, so variety survives — the land
  leans, it does not repeat.
- **The palette**: `MinorDef.family` lets goblin country deal totems and bone
  piles where wolfkin country deals dens and kill-sites — the finds layer is
  what makes territory *readable on the ground* before the first fight.
- **The word**: `world:` roster stays closed and unwritten-by-content (the
  Phase-3 Frontier law); territory ships with zero new flags. If a later
  content pass wants "wolf country" in a warden's mouth, it arrives as a new
  rostered world flag through that door, not this epic.
- Tests: field determinism + wavelength bounds, bias-never-gates invariant
  (all eligible defs reachable at every point, pinned statistically on a
  fixed seed sweep), family cross-ref in validators.
- Live verify: World Studio territory lens (Phase 6) over a 20-cell sweep —
  visible countries, no hard borders, sites still mixed at the margins.

## Phase 6 — The Surveyor's Glass (the studio owns the texture)

Goal: every new dial is content; every new layer is visible to the bench.

- **Laws to the table**: `findChance`/`holdChance` join `DANGER_LAWS` (the one
  law table — every consumer indexes it); pacing/shape dials (`budgetBase`,
  `knotProbes`, `trailReach`, `holdEmberMs`, `territoryBias`) join the
  FRONTIER doc with named cross-law validation (`validateFrontier` grows
  them; never destructure a dial into long-lived state).
- **CMS**: Minors bench (the poi-bench skeleton: list, prefab pool cards with
  true previews, garrison rows, habitat combobox, cache law pills); POI bench
  compound section (court/wing pool cards + a stage ladder that renders wing
  columns — the prefix-stability law seen, not trusted); **THE DENSITY
  SURVEY**: simulate N cells (the `simulatePoisSteps` batched-generator
  precedent) → observed finds/cell histogram, hold spacing map, family share
  per territory — observed, not computed, the loot-laboratory law.
- **World Studio**: finds as faint dot pips (own lens, default off — the
  Studio sees what the chart politely doesn't), hold diamonds ranked larger,
  trail polylines in fine LOD (they are zone tiles — free), territory wash
  lens from the shared field, cell inspector rows for find bitmask + hold
  flag.
- **Wire**: nothing new for finds (QUIET CHART LAW); holds reuse the
  discovery/stage wire as-is. Protocol untouched unless the wing-break line
  needs a ceremony fx (it rides system chat + existing S2CFx kinds).
- Tests: validator refusals by name for every new dial, bench smoke via the
  existing cms harness, survey determinism.

## Sequencing and safety

Phase order is feel-first: 1 (life) and 2 (finds) transform the moment-to-
moment walk and are independently shippable; 3 (trails) makes both readable;
4 (holds) is the big engineering lift and lands on proven compose/recompose
machinery; 5 (territory) is a bias pass over everything standing; 6 closes
the studio loop. Each phase is its own commit train with green suites.

Standing laws audited against, the whole way: one field many readers; named
streams pure-until-materialized; ledger stores deviations only; POIs are
zones; curated pools, procedural picks; semantic garnish is placement logic;
budgeted passes (one cell per pass, knots bounded, one finds-zone per cell);
ember/conservation/boldness/calm untouched in their mechanics and extended
only through their own doors; claim rings remain a pure exclusion mask; the
flood law admits no new faucet unaudited; whiff-0 and the THREAT LAW are
nowhere near this epic's blast radius; all player-facing lines through
docs/VOICE.md (no dashes); chart marker economy protected by the QUIET CHART
LAW.
