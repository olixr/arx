# KINGSDELF — the town in the King's Delf

*A world-authoring epic for the Dawnlands: the SEVENTH town, far south-west,
for players level 50-60. Read `packages/content/src/geography.ts`,
`docs/hartfell-plan.md`, and the `dawnlands-map-master-plan` +
`map-curation-standard` + `content-boundaries` memories before touching
anything here. Every coordinate below is DRAFT until the mapscan rig has
profiled the real ground (the Pinereach law: author against the ground that
exists, not against arithmetic).*

---

## 1. The brief

A seventh town, planted in the dangerous south-west, for characters in the
level 50-60 bracket — the first town the game builds ABOVE its own ceiling
(today: wilderness caps at level 48, the tallest authored mob is the ice
golem at 36, gear tops out at 52). All the amenities a town owes its
people: a bank, shops, an inn, the working professions, and a stall where
companions are stabled and managed. Fully bespoke: streets that grew,
buildings with reasons, a real economy with real limits, people with
schedules and wants and trouble. Organic architecture — the 45° grammar
spent where it says something. Not boxes. A place.

---

## 2. The idea

**Kingsdelf is the quarry that made the Crown, and the town is what came
back for it.**

The canon already says it (Silverfall, the People Pass): *the Silver Line
is five kings from a quarry foreman.* This epic gives that sentence an
address. Before the Dawnlands were the Dawnlands, the old realm in the
south-west — the **Old Crown** — cut its stone from one great delf: the
King's Delf, a tiered bowl hewn so deep the benches go down like a
theatre. Amberford's little copper cutting is called "the Amber Delf" to
this day because every delf in the Dawnlands is named in this one's
shadow, whether anyone remembers that or not.

**The Brandfall.** A hundred and fifty-odd years ago a star fell on the
mountain above the workings. The mountain — **the Brand** — has burned
ever since: not a torrent, a smolder; ash on the wind, ember-light in the
crag seams at night, the sky to the south-west stained at dusk. The Old
Crown's capital burned with it. The delf's night shift was below when the
fire came through the galleries, and the foreman of the day shift made
the choice that history keeps: he ordered the deep workings sealed with
the fire — and the night shift — still inside, and led everyone the
mountain hadn't taken north through the passes. That foreman founded the
quarries at Silverfall, and his line wears the crown there now. The
Masons' Guild learned to seal a working from Kingsdelf; when they sealed
the Undercroft twenty years ago, they were doing an old thing the old
way. Nobody in Silverfall's castle says the word "Kingsdelf" out loud.

**The Returning.** Eighteen years ago, prospectors and Guild-line masons
came back down the overgrown road — because the Brandfall, which ruined
the delf, also seeded it: starfall in the burn, obsidian in the flows,
and the mithril seam the old realm never dug deep enough to find. The
town of Kingsdelf stands INSIDE the quarry bowl, the one pocket the
ash-wind skips, built out of the benches the old realm cut. It is the
richest ground in the Dawnlands and the furthest from help: the
Waykeepers have never lit the road, the Crown pretends the place is a
rumor, and the Amberford Charter — which follows profit the way water
follows a grade — quietly bankrolled the whole venture and holds the
countinghouse.

**The one image: the Unfinished Stone.** In the center of the delf floor
stands a monument block the size of a cottage, half-hewn, abandoned
mid-cut on the day of the Brandfall — the old realm's last order, never
countermanded. The ropes have rotted to stubs; the chisel lines are still
crisp. Nobody will finish it and nobody will break it. The market grew
around it the way a town grows around a well.

**The trade.** Ore and glass and light. Mithril from the town faces,
adamant and obsidian from the burn country for those hard enough to haul
it, starfall glass from the Glasshouse — lamp lenses, focus glass, the
finest light-craft in the Dawnlands. Cut stone, as ever. The town buys
everything else: Amberford grain up the Old Road, Pinewatch boards the
long way round, and Hartfell tallow for the lamps — the two frontier
towns bound by the lamp trade, one rendering the light, one glassing it.

**The limits (a town is not an end-all).** No loom — cloth comes up the
road. No crops — nothing grows in ash but the inn's herb pots. No
chapel, no castle, no sawmill. The bank is the Charter's countinghouse
cut into the rock face. What Kingsdelf has that nowhere else has at all:
the deepest ore in reach of a bed, the Dawnlands' second enchanting
table (the starfall focus — the Arcanum's has a sister now), the first
true stable-master, and the only smiths who work starfall glass.

**The trouble.** Three, braided:

- **The count below.** The Sealkeeper keeps the names-stone by the Sealed
  Stair: 214 names for the night shift the seal took. The stone carries
  215 marks. The extra mark is old — scratched, not carved — and the
  town's founding families have argued about it for eighteen years. The
  quest spine pulls that thread: something came OUT of the workings after
  the seal, or someone went back IN, and the answer reaches all the way
  up to why the first king never spoke of this place again.
- **The unlit road.** The Old Road is the only unlamped road in the
  Dawnlands, and at tier 5 end to end it earns the name people give it.
  The Waykeepers say a lamp line they cannot walk is a lie told in
  glass; the town says a road the lamps skip is a town the Dawnlands is
  ashamed of. The argument is the town's politics, and the player gets
  to move it lamp by lamp.
- **The old dead walk the old road.** The Old Crown's dead do not lie in
  barrows — they were laid in the capital's processional vaults, and the
  Brand's long burn has been waking them for a century. By night they
  walk the Processional toward a capital that is not there anymore.
  The Hewers — the old realm's quarry constructs — never stopped
  working at all; they hold the burn country and the Oldcrown's door,
  still executing an order nobody living can countermand. (Constructs
  and the honored dead: the golem epic's deferred debts — champions,
  construct garrisons, a golem POI — come home here.)

---

## 3. The land

### 3.1 New geography (all DRAFT until mapscan-profiled)

| id | kind | heart | r | what it does |
|---|---|---|---|---|
| `the_brand` | massif | (-320, 104) | 110 | the burned mountain NW of town — crag country over the old high workings; formalizes the crag knot the noise already deals at (-260, 150) |
| `ashmere` | mere | (-368, 368) | 80 | the drowned lower workings — the grey lake SW of town, ash-silted, hiding galleries |
| `ashmarch` | **scorch** (NEW landform kind) | (-296, 176) | 150 | the burn country: moisture pulled down hard (bare heath, dead stands), char mosaic, the region's visual identity |

**THE SCORCH FIELD (new primitive, the pineland's opposite).** A
`scorches: Landform[]` entry in `GeographyDef`, read by worldgen the way
pinelands are but inverted: `moistureAt -= scorchAt * 0.45` (bare ground,
open dead stands — the DENSITY LESSON says a burn must read SPARSER than
meadow, not painted black), and the chunk generator converts trees inside
the field to stumps/dead stands at a scorch-scaled rate and deals a
dirt/sand char mosaic on the open ground. No new tiles required for v1;
an ember-vent glow prop and char tinting are flagged as a stretch pass.
Zone-apron suppression applies like every other field.

**`KINGSDELF_RECT` = (-320, 240) 128 × 96, centre (-256, 288).** Aproned.
~307 tiles from Dawnmead's hearth, ~430 from Amberford — the base band is
tier 5 at the walls with no dial touched. The scan shows the rect seated
on open meadow/forest between the Ashmere's water (SW), the Brand's crag
skirt (NW), and a wild crag cluster (SE) — a bowl in wild country, which
is the town's whole story.

- **Haven anchor** (-256, 288) safeR 64 — the FIFTH haven. Tier 0 inside;
  relief grades the walk-out tier 3 → 4 → 5 within a league, and past the
  relief the country is tier 5 (32-48) everywhere — the approach — and
  **tier 6 (44-60) inside the Brand's dread ring** — the destination.
- **Dread anchor** `the_brand` (-320, 104) safeR 96, **dread 3** — with
  the Overband (§3.2) this is the first ground in the game that reads
  tier 6. (Dread 3 is the Overband's key by law — a dread-2 heart like
  the Blackpine can never open it, which is what keeps the live world
  byte-identical.) Verified geometry: the dread reach (safeR + 48 =
  144) clears the town's north wall (~154 tiles) — the town is beside
  the furnace, never in it.

**`OLDCROWN_RECT` = (-520, 96) 96 × 64 — ground RESERVED, not built**
(the Rimeward law: the Processional has to end somewhere true). The
buried capital of the Old Crown, behind the Brand's west shoulder. The
frontier scaffold stays out; a future delve epic knocks on the door. Not
aproned — the ash keeps the streets until then. One weight-0 authored
site (`oldcrown_door`) stands at its edge so the trail ends at something
with a face: a gatehouse of Hewers, still on post, and a sealed arch.

### 3.2 THE OVERBAND — danger tier 6 (the machinery phase)

Today `dangerAt` = `clamp(base + jitter − relief + dread, 1, 5)` with the
march capped at 5. The Overband is one carefully-scoped change:

- **The march never changes.** Base stays `min(5, 1 + floor(edge/56))`
  and the classic clamped law answers everywhere — every existing tile
  in the world keeps its tier, byte for byte.
- **Only a full dread-3 heart crosses the old ceiling** (AS SHIPPED —
  Phase 2, gate widened in Phase 3): a tile reads tier 6 only where
  ALL THREE hold — the un-jittered march stands within one band of its
  ceiling (base ≥ 4, so noise can never fake remoteness and a dread-3
  heart in base ≤ 3 town country can never open it), the wobbled march
  also reads ≥ 4 (no tier-3 pocket ever jumps three tiers in a step),
  and the tile stands INSIDE the safeR of a dread ≥ 3 anchor. Rims
  never cross; dread-2 country (the Blackpine — whose heart already
  saturates 5 today) never crosses. Phase-3 finding that forced the
  widening: the Brand's heart is base-4 country (262 tiles from
  Dawnmead — the march genuinely never saturates there), and the
  widened gate is the dread thesis kept honest: distance was never
  the whole truth about the mountain. Live effect: the burn deepens
  AWAY from the lamps — Overband pockets on the town-facing skirt,
  dense tier 6 in the deep heart. All pinned in danger.test +
  geography.test.
- **`DANGER_LAWS[6]`**: npcLevel **[44, 60]**, chest `boss`, rarityBonus
  8, wildDensity at the tier-5 rate. Itemization needs nothing (power
  rolls, heirlooms, and rarity weights already scale past 50 — verified).
- **Downstream sweeps** (all found by audit, all small): the gazetteer's
  tier-indexed herald words gain a 6th; client `discoveryBanner` + CMS
  tier enumerations extend; strongholds' `min(tier+1, 5)` chest clamp is
  confirmed law (boss stays the cap); `dangerLaw()` bound checks re-run.
- Tests: existing world unchanged at sampled points (Hartfell fell,
  Blackpine ring, deep NE); the Brand ring reaches 6; the town's onion
  reads 0 / 3-4 / 5 / 6 along a sampled walk.

### 3.3 The roads

| | `old_road` | `processional` |
|---|---|---|
| kind | road (Path — built by the old realm, re-cleared) | trail (Dirt — the old paved way, ash-buried) |
| from | Dawnmead's south hem (-64, 80) | Kingsdelf's west wicket |
| to | Kingsdelf's east gate | inside OLDCROWN_RECT, at the `oldcrown_door` |
| story | the road the quarrymen fled up, walked the other way. UNLAMPED — the only dark road in the Dawnlands, and the town's standing grievance. Tier 1 out of Dawnmead to tier 5 at the gate: the game's longest single climb, and the signage at BOTH ends says so | the old realm's paved approach to its own capital. The tithe of the south: nobody uses it — except the dead, by night, walking home. Passes through the Brand's dread hem: the first tier-6 walk in the game |

Route law compliance: both ends land per the endpoint law (hem/rect);
every draft leg gets profiled with `routeBridgeDecks` before pinning (the
SHORT SPAN LAW — the scan shows lake fingers along the approach, so the
road will earn the gate with shore miles, not causeway).

**Authored sites** (each its own macro-cell; the SW cells are all free —
verified against the one-site-per-cell law):

| id | defId | where | story |
|---|---|---|---|
| `third_stone` | waystation | ~(-120, 140) | the Old Road's one roof, at the old realm's third milestone (they counted DOWN to the capital). The fire is kept by returners, not Waykeepers — the road's argument, standing at the halfway mark |
| `returners_camp` | roadside_hamlet | ~(-180, 210) | the last crofts before the gate country: ash-sifters and wall-eyed optimists |
| `oldcrown_door` | `oldcrown_gatehouse` (NEW, weight 0) | OLDCROWN_RECT edge | the Hewer garrison on the old gate, and the sealed arch the delve epic will open |
| `crater_field` | `starfall_crater` (NEW) | cell-forced, in the burn | where the star broke up: starfall ore in the open, at tier-6 prices |

### 3.4 Audio, herald, gazetteer

- `TOWNS` row (client audio zones) — Kingsdelf, full 34 / fade 52. (No
  test enforces the mirror; the checklist does.)
- Gazetteer: `epithet` "THE DELF THAT MADE THE CROWN", `country: 6`, one
  plain line per the VOICE laws.
- Discovery ceremony via zone name comes free (Place Herald law).

---

## 4. The March — enemies and POIs (levels 44-60)

The bracket needs bodies. Three families, art-budget honest:

**The Hewers (constructs — CONSTRUCT dialect, golems.ts laws: MITER
SPIKE, UNDER-BOX, FURNACE GOES OUT, SYMMETRY READS AS MACHINE).**
- `hewer_golem` L46 — the quarry frame still cutting; splash kit per the
  golem grammar.
- `delf_warden` L53 — the gate-and-gallery keeper; first construct
  CHAMPION (pays the golem epic's deferred champion debt).
- `brand_colossus` L58 — the furnace heart of the burn; named-champion
  pool ("The Last Order", "Old Nine-Ropes", "The Foreman's Shadow").

**The Ashen Court (skeleton_ prefix law — never bone_).**
- `skeleton_kingsman` L48 / `skeleton_crownsguard` L55 — the old realm's
  honored dead, walking by night (the watchtower_ruin hours grammar).
- Named tier-6 champions in the POI defs, not the bestiary.

**The wild.** Nothing new needed: worgs, dire wolves, trolls, and the
rest scale into [44,60] under the Overband automatically (`scaleNpcDef`).
One flavor variant at most if the walk demands it.

**New POI archetypes** (+ prefabs, validator-clean):
- `hewer_garrison` — tiers [5,6], the construct hold: the golem POI debt,
  built on the stronghold pull-law spacing lessons.
- `ash_procession` — tiers [5,6], NIGHT hours: the dead on the old roads;
  shelter by day, haunted by night (the watchtower grammar inverted).
- `starfall_crater` — minor-find family: open starfall/obsidian faces
  under tier-6 guard.
- `oldcrown_gatehouse` — weight 0, authored-only (the door).

MARK'S WORTH holds for every new def (xpReward/maxHp ∈ [1.8, 6], authored
in-band — the scaling exponents drift the ratio, so no lazy scaling of
base defs into the bestiary).

---

## 5. The town shape

**THE BOWL READS DOWN.** Every town so far climbs; Kingsdelf descends.
The rect authors a ring of rim crags (the spoil banks and the old
overburden), then quarry benches stepping down INWARD, then the delf
floor. The stair law (south-facing flights, camera-true) means the big
descents live on the north half of the bowl, walking down southward;
the south rim stays a crag curtain with the rim walk behind it.
Levels: rim 2, benches 1, floor 0 — the standard raise/stairs machinery,
nothing exotic, and the whole silhouette reads as a made place: **the
town is inside the artifact.**

**Districts (each with a reason, each curated at close zoom):**

1. **The Rim (L2, east and north).** The east gate — the Old Road lands
   tile-exact — with its two gate towers (diagonal budget, pair). The
   wain yard and caravanserai (ore goes out, everything else comes in).
   **THE BEASTYARD**: the game's first true stable — `Tile.BeastPen`,
   real stalls, troughs, a tack wall, and the stable-master's cottage.
   Animals live topside, out of the works' dust; the pen looks out over
   the whole bowl. Watch posts at the gate and the rim walk.
2. **The Benches (L1).** Bench Row along the north face: the Foreman's
   Rest (the inn — the town drinks facing the Unfinished Stone below),
   the **Countinghouse** (the Charter's bank, cut INTO the rock face:
   teller line in front, vault chamber windowless behind — 2 BankChest,
   2-3 Vault, the canonical pattern), the outfitter, the provisioner,
   the dispensary, and homes with owners. The **Flamehouse** on the west
   bench: the daughter-flame carried from the Silver Shrine by a
   pilgrim of the road-faith, and the lamp-wright's glass benches — the
   room where the unlit-road argument lives.
3. **The Floor (L0).** The market round grown around the **Unfinished
   Stone**. The **Glasshouse** (kilns — a chamfered cone, diagonal
   budget) and the **Starfall Forge** (furnace ×2, anvil ×2). The assay
   house. The masons' yard. The **Sump** — the cold spring pool that
   made the pocket livable, with pale sump-fish (FishingSpot ×2). The
   town ore faces in the bench walls: **mithril ×3, adamant ×2** — the
   only safe high-ore in the game; obsidian and starfall stay OUT in
   the burn, at tier-6 prices (the economic magnet points outward).
4. **The Sealed Stair.** The old deep-workings door: CaveWall arch,
   the Guild's seal, the names-stone with its 215 marks, braziers the
   Sealkeeper feeds. The future delve door, in town, with a keeper —
   the Undercroft mouth grammar, one era older.
5. **The West Wicket.** The Processional leaves here, and the muster
   yard beside it is where the town gathers courage for the burn.
   Second respawn context: `b.spawn` on the market round by the Stone.
6. **The hatch.** The Red Company loves an unwatched road (READ the
   red-company memory before cutting it): a hidden Low Hall door in the
   Kingsdelf pattern, joining the lowhall ring, with the fence's counter
   near it. Decided and placed during the build, per the lowhall laws.

**Architecture.** Cut stone out of the delf itself — the town is built
from its own quarry, mortared ashlar below, timber only in roofs and
galleries (boards are imports; the town uses them like spice). The 45°
grammar is the quarry's own: chamfered block corners, splayed reveals,
the benches' cut shoulders — **diagonal budget of FIVE statements**: the
gate tower pair, the Glasshouse kiln cone, the Countinghouse face, the
Sealed Stair arch, the crane base by the Stone. Everything else honest
and blocky, per the town-plan law. ≥3 open tiles between structures,
streets first, every building fronts a street or the round, ROOM INTENT
throughout, signs standing a pace before the wall (the sign law is
enforced by the builder now).

**Amenities checklist (the brief, answered):** bank ✓ (Countinghouse),
shop ✓ (provisioner, outfitter, glasswares, remedies, assay, smith
stock, stable goods), inn ✓, professions ✓ (furnace, anvil, workbench,
carving bench, alembic, tanning rack, sawhorse, and the game's SECOND
EnchantingTable), pet stall ✓ (the Beastyard: BeastPen + the first
stable-master), plus the trainer seam the endgame actually needs
(§6 — smithing past 42, the enchanting table, the beast trade).

---

## 6. The people (draft roster — names swept at casting)

~17 named + pooled bodies (~26 placements), every placement on a
routine, hot-bunk law where shifts exist, the rota pattern at the gates.

| slug (draft) | role | the reason they're here |
|---|---|---|
| `delfmaster_ruen` | master mason, head of the town moot | Guild-line; her grandmother's name is on the stone. Runs the town like a working: shifts, tallies, no speeches |
| `factor_venn` | the Charter's factor + banker | Amberford money in an ash-country coat; counts profit out loud and courage quietly |
| `sealkeeper_annik` | keeper of the Sealed Stair | oldest returner; feeds the braziers, keeps the names, knows the 215th mark is real |
| `innkeep_brekka` | the Foreman's Rest | pours for miners who count down and delvers who count up; keeps the day-book of who came back off the burn |
| `stablemaster_orin` | THE BEASTYARD — first stable-master | reads beasts the way Annik reads names; sells feed, tack, and one ash-country mount; the beastcraft trade's first counter |
| `smith_ferrun` | the Starfall Forge — smithing trainer past 42 | came for the mithril seam, stayed for the glass-steel; the TRAINER_DIRECTORY's new top rung |
| `glasswright_mirena` | the Glasshouse | starfall lenses and lamp glass; the town's one artist, and knows it |
| `enchanter_veyle` | the second EnchantingTable | the Arcanum's exile — polite letters from Solvei arrive monthly and go unanswered |
| `assayer_lorn` | the assay house | stamps what the burn coughs up; nothing leaves the delf unweighed |
| `lampwright_soren` | the Flamehouse — flame-keeper AND lamp-wright | tends the daughter-flame; builds the lamps the Old Road is owed; the road-faith's southern argument |
| `waykeeper_liv` | Waykeeper envoy | sent to say no to the lamp line; converting by inches; the order's loneliest post |
| `surveyor_hedda` | Crown surveyor | maps for Aeriex and reports what the Crown pretends not to ask; her cipher book is a quest hook |
| `provisioner_etta` | grocer | grain up the road, prices that apologize for themselves |
| `outfitter_cass` | outfitter | dresses people for weather that wants them dead |
| `salvewright_ida` | dispensary | burn salves, ash-lung draughts; the only one who's seen inside every house |
| `fisher_denna` | the Sump + Ashmere quay | pale fish and drowned-gallery stories; found something in a net once and won't say what |
| `broker_slate` | the Company fence (hidden) | the Rookery/Company web reaches the unwatched road; near the hatch |
| `kingsdelf_watch` ×4 | pooled — fordgate enforcers | day/night gate pairs + rim patrol, the rota law |
| `kingsdelf_delver` ×3 | pooled — the works | shift-clocked: faces by day, the Rest by night |
| `kingsdelf_glasshand` ×2 | pooled — the Glasshouse | the kiln never cools; hot-bunk pair |

**Faction: the town is CHARTER (fordgate).** The Charter bankrolled the
Returning and holds the countinghouse — its first far anchor, and a new
flavor for fordgate (company town, company scrip jokes). `kingsdelf_watch`
joins fordgate's enforcers; anchors[] gains the town's coord. Crown
(Hedda), Waykeepers (Liv), the road-faith (Soren), and the Company
(Slate) all stand IN the town as minority voices — five factions, one
bowl, which is the dialogue's whole dinner table.

**VOICE.md §4 card** ships with the cast: want / wound / quirk / cadence
per name, ONE spice-carrier budgeted (Mirena), pooled voices flat. Dash
ban, breath budget, Dawnlands diction. Lore is crumbs: nobody info-dumps
the Brandfall; it arrives in eighteen fragments.

---

## 7. The errands (quests, draft)

| id | giver | shape | what it pays |
|---|---|---|---|
| `the_count_below` | Annik | the spine, 3 stages: the 215th mark → the Processional's milestones by night (discover + kill) → the seal ring (collect, final stage only, per the validator law) | the founding mystery opened: someone left the workings AFTER the seal. Sets the flag the delve epic will one day answer; faction-neutral, heart-heavy |
| `light_the_old_road` | Soren | REPEATABLE (18h): Hartfell tallow + starfall glass → a lamp lit; each turn-in advances a world-flag ladder | waykeepers rep; the road's story physically changes at the margins; the Hartfell↔Kingsdelf lamp economy becomes play |
| `the_crown_asks` | Hedda | 2 stages: escort/recover her cipher pages from the burn; then CHOOSE the hand that gets them (Hedda or Ruen) | crown vs fordgate rep split (the past_the_wardline pattern) — the town's politics, played |
| `a_stall_in_ash` | Orin | beast arc: a tier-6 mark worth taming, tracked and calmed, not killed | the endgame beastcraft showcase; the Beastyard earns its name |
| `what_the_net_held` | Denna | short, strange: the Ashmere gives something up | seeds the drowned-galleries thread; pure atmosphere |

Plus the Company's whisper at the hatch (bound into the lowhall arcs, not
a new system). All trees: hub ≤4 choices, ≤480 chars, flags read-only in
choices, quest scenes bound on `quest:` flags per the Hartfell law.

---

## 8. The laws that bind this epic

- READ before touching: golems (constructs), red-company (the hatch),
  beastcraft (the Beastyard), strongholds (T6 interplay), loot-audit
  (drop routes — craft-lane symmetry is DESIGN), first-trade (recipe
  unlocks: combat gear recipes above 42 stay DROP; the trainer sells
  work, not war), elevation-shelf, town-watch-rota, place-herald.
- content-boundaries: no witch/demon vocabulary anywhere (grep-sweep all
  new text before every commit). Ash, ember, brand, cinder, the honored
  dead — all inside the line.
- map-curation-standard: every district toured live at close zoom before
  any phase is called done. No compact spacing. No overlaps. Rooms with
  intent.
- SEAM LAW (authored ground fades to zero at borders), GROVE APRON,
  SHORT SPAN LAW, one-site-per-cell, THE POST IS THE ORIGIN, HOT BUNK,
  MARK'S WORTH, the sign law, the stair law, the shop-keeper law.
- Desk-audit with the ASCII zonerender BEFORE tests; verification script
  for routines (posts/waypoints/beds) BEFORE the live tour.

---

## 9. The phases

| # | name | ships | proof gate |
|---|---|---|---|
| 1 | THE PLAN | this document | committed |
| 2 | THE OVERBAND | danger tier 6 machinery + laws row + herald/CMS sweeps; NO map change | world-unchanged sample tests green; tier-6 unit tests green |
| 3 | THE LAND | geography (rects, the Brand, Ashmere, scorch field + worldgen), routes profiled + pinned, authored sites, anchors (haven + dread), audio row, gazetteer | geography.test + worldgen.test green; mapscan renders archived; route decks legal |
| 4 | THE MARCH | Hewers + Ashen Court defs, POI archetypes + prefabs, loot hooks | validator + xpEconomy green; live spawn proof at tier 6 |
| 5 | THE TOWN | `maps/kingsdelf.ts` — the bowl, every district, every amenity, the hatch; registrations (server index, zoneArt, lowhall ring); content.test suites A+B | builder validation + BFS suite green; ASCII desk audit archived |
| 6 | THE PEOPLE | cast, routines, dialogues, shops, trainer directory, factions, VOICE.md card | routine verification script green; shop-keeper law green; counts pinned |
| 7 | THE ERRANDS & THE WALK | quests + the full close-zoom curation tour, fix, re-shoot | quest validator green; tour shots archived; the walk signed off |

Each phase commits on completion (the standing order). Rig lanes are a
commons — `lsof` the ports before claiming one; lane 3 (8795/5178) is the
scratchpad-safe default.
