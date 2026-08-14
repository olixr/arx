# THE LONG DARK — the dungeon system redrawn

*Plan of 2026-08-14. The delve generator, the rift flow, and the key economy,
reworked from the ground up as one engineered platform. Supersedes the PoC
generator's internals (the DELVE REFIT of 99a1798 was a widening; this is the
rebuild). The KEY-IS-THE-DUNGEON law, the riftgate flow, the party-run
network, and THE CLEARED HALL STAYS CLEARED all stand — this plan builds on
them, never around them.*

## The mandate (user, 2026-08-14, distilled)

- Runs should take **5–10 minutes**, spacious and explorable — better room
  generation, corridors, and drawn lengths.
- A **hybrid layered procedural system**: rooms-and-corridors-first structure
  × cellular-automata organics × authored prefab content, each layered with
  intent — never one algorithm wearing four hats.
- Dungeons must be **flushed out with real detail**: the enemy-prop and decor
  shelf we now own (war-camp props, posts, patrols) goes underground.
- A real **end goal**: the champion's room is big, luxurious, unmistakable —
  room for a choreographed fight, and the chest stands in a prestigious place
  you must fell the champion to open.
- **Themes that read**: different biomes/styles per key, endless-feeling
  variety, no recognizable pre-planned pattern.
- **Keys hold three uses** — no more endless turns; scarcity is the allure.
- Core architecture, not bolt-ons: replace what needs replacing; the system
  is a platform we grow on from here.

## Standing laws inherited (do not re-litigate)

- **THE KEY IS THE DUNGEON**: `ItemRoll` = identity (`seed` layout, `rar`
  tier, `pwr` power, `uses` wear); `dungeonSpecFromRoll` is the one pure
  door client and server both read.
- **Named RNG streams per pass** — content added to one pass never
  reshuffles another.
- **THE CLEARED HALL STAYS CLEARED** — nothing respawns inside a live
  instance; teardown + fresh cut is the one reset.
- **THE RUN IS THE OWNER'S** — party guests ride the owner's instance and
  evacuate on teardown.
- **Placement truth = reach masks** — local heuristics filter, the BFS
  repair sweep is the guarantee.
- **THE THINNER PURSE** — unnamed dungeon-band kills pay 0.5×.
- The DREAD CROWN laws — crowns ride the kit rail; new crowns only with
  full faced art; `npc.boss` = boss flood station.

## The architecture — six files where one stood

`packages/server/src/dungeon/`:

| file | pass | owns |
|---|---|---|
| `types.ts` | — | `DungeonPlanModel` (rooms, edges, spine, masks), `Room`, `Edge`, `Carver` — the intermediate model that SURVIVES between passes |
| `plan.ts` | PLAN | spine-and-branch topology, role assignment, pacing bands |
| `carve.ts` | CARVE | room archetypes, corridor dialects, prefab stamping, connectivity repair |
| `prefabs.ts` | — | the authored shelf: set-piece variants + the grand arenas |
| `dress.ts` | DRESS | masonry, water, ore ladder, chest ladder, theme decor kits, corridor lights, the repair sweep |
| `garrison.ts` | GARRISON | rosters, packs, sentries+patrols, camp posts, the champion's court |
| `generate.ts` | — | the orchestrator; public surface unchanged (`generateDungeon`, `dungeonOrigin`, `DungeonResult`) |

Every pass takes and returns the plan model; every pass keeps its own named
RNG stream (streams 1–5 as before; new sub-features draw from their pass's
stream). `Room` replaces the old `Anchor` and persists through the whole
pipeline — the seam the old monolith never had.

## THE SPINE AND THE BRANCHES (topology law)

The old plan spread anchors uniformly and hoped MST depth made a journey.
The new plan AUTHORS the journey:

- **The spine** is the critical path: entry (south) → wandering rungs →
  the champion's court (far ground). Rung count ≈ 40% of chambers (min 5);
  each rung steps a controlled distance with lateral wander, so the road is
  long by construction, not by luck.
- **Branches** hang the remaining rooms off spine rungs (nearest-attachment,
  branch-of-branch allowed) — the side tangents. Deep branch leaves take the
  set-pieces: the vault, the theme's own point of interest, the wayfarers'
  camp, the second set-piece at epic+.
- **Loops** still close (budget `max(3, chambers/5)`) so runs never read as
  pure out-and-back — but never a loop that shortcuts entry straight to the
  court's rung neighborhood (the finale is earned).
- The court sits at max spine depth; `depth` still flows to ore/chest/
  garrison scaling exactly as before.

## Spaciousness (the wider-still law)

- Tier laws (shared `DUNGEON_TIER_LAWS`): sizes **120/140/160/180/200**,
  chambers **12/16/20/25/30**. `MAX_SIZE` 200 (slot spacing follows).
- Cave rooms r **8–13**; halls **12–20 × 10–16**; entry landing r 9.
- Corridors: built width **4 (40% 5)**; cave brush **2.2 (30% 3.0)**.
- New room archetypes (seed-picked per room, style-respecting):
  plain blob / **twin-lobe cavern** (two fused blobs) / plain hall /
  **pillared hall** (colonnade rows) / **rotunda** (round masonry) /
  **gallery** (long hall, 2:1+, for spine rungs).

## THE MANY FACES (theme law)

Five themes (was four): `cavern`, `mine`, `stronghold`, `crypt`, **`warren`**
(gnoll dens — caveness 0.75, bone-and-hide decor, the Matriarch's ground).

Each theme now owns, in one `ThemeKit` record (garrison roster, decor kit,
arena prefab, POI prefab pool, name bank):

- **Decor kits** — the war-camp shelf goes underground: stronghold halls
  hang WarBanners and rack spears; warrens nest BeastNests, HideFrames,
  SkullTotems; crypts pile bones under brazier light; mines stack crates by
  the ore; caverns keep stalagmite teeth and shroomlight. Density per room
  area, wall/open placement rules per prop, all through the one `putProp`
  guard + repair sweep.
- **Power-banded rosters** — pack entries may carry `minPower`/`maxPower`;
  high reissues of a crypt field kingsmen and crownsguard, low ones field
  plain skeletons. More variation inside one theme across the ladder.
- **Set-piece variants** — every prefab kind is a POOL (2+ authored
  variants), seed-picked; stamps may mirror horizontally. Repeat keys keep
  their exact dungeon; new seeds stop rhyming.
- **Camp life** — camps and dens seat POSTED bodies (cook at the spit,
  keeper by the cage, unwindowed — the underground keeps no hours) and
  corridor sentries PATROL their recorded corridor paths (hop ≤ 12). The
  halls are lived-in, not furniture with hit points.

## THE CHAMPION'S COURT (finale law)

- Per-theme **grand arenas** (~23–25 wide, ~15–17 tall): the crypt's throne
  hall, the cavern's grotto, the mine's foundry floor, the stronghold's
  war-court, the warren's great den. Dais at the north wall, the boss chest
  raised upon it, framing (pillars/banners/totems) per theme; a wide open
  floor for choreography; a ceremonial mouth (torch/brazier pair) so the
  threshold reads before you cross it.
- **Crowns on the seats** — every theme's deep seat wears a true DREAD
  CROWN where one exists: crypt seed-picks `skeleton_fallen_king` /
  `skeleton_barrow_lord`, mine keeps `anvil_golem`, stronghold seats
  `goblin_flame_tyrant`, warren seats `gnoll_matriarch`. The cavern keeps
  its named Broodmother until a spider crown earns full faced art (LAW 8).
- **THE COURT WARDS THE PRIZE**: the boss chest registers in `poiChests`
  under a `dg:<ownerCharacterId>` cell; `interactChest`'s ward branch
  refuses the lid while the champion stands (`dungeonChampionStands` — the
  boss spawn is alive-or-waiting, not felled). Teardown retires the ward
  entry. The chest is no longer sneakable — the fight is the key.

## THE THREE TURNS (key law, user decree)

`KEY_USES_LAWS` → **3 for every tier**. The worn-ward machinery (spend on
fresh cut, free re-entry, crumble-on-close, legacy grace for unstamped
rolls) stands exactly as shipped.

## Out of scope (named doors, not debts)

- Multi-level dungeons (stairs between floors) — the plan model is built to
  carry it (rooms know their band); a later epic.
- A dungeon Foundry/CMS bench (strongholds precedent) — the generator's
  variant pools are authored in code for now.
- Boss-only loot channel, enrage timers, multiplayer scaling — deferred by
  the DREAD CROWN plan already.
- Persistent/resumable instances across restarts.

## Proving

- `generate.test.ts` sweeps ×25 seeds across all five tiers AND all five
  themes: determinism, divergence, reachability (cracks shut/open), chest +
  ore + secret + garrison presence, floor fraction, pinch cap (S²/400 law),
  landing safety, slot spacing at MAX_SIZE 200, spine length ≥ min rungs,
  boss chest present in every court, decor props only on reachable floor.
- Workspace `tsc -b` green + full node test runner green before commit.
- Commit under the shared-tree temp-index law; the uncommitted key-ring
  protocol seam (messages.ts / clientGame.ts / riftgate.ts WIP) lands WITH
  this epic — it is this seam's own flesh and origin is red without it.

## As built (2026-08-14, one session)

**Shipped whole.** The monolith is dead: `generate.ts` is a 130-line
orchestrator over `types.ts` (DungeonBuild/Room/Edge/Carver — the model that
survives every pass), `plan.ts`, `carve.ts`, `dress.ts`, `garrison.ts`,
`prefabs.ts`. Public surface unchanged plus `DungeonResult.bossChest` +
`bossSpawnIndex` (the ward's two facts).

- **THE SPINE proved out**: measured entry→court shortest walks run
  **1.0–1.5× the map side** across all tiers (test pins ≥0.85×). Spine =
  wandering-heading rungs (never south, walls bend the road), branches
  nearest-attach (never to the court), loops only between rooms ≤2 tree-rungs
  apart and never touching the court or its approach.
- **Sizes** 120–200 / chambers 12–30 / `MAX_SIZE` 200; halls 12–20×10–16,
  cave rooms r 8–13, built corridors width 4–5, cave brush 2.2/3.0 with
  junction-grotto bulges on long ways. New archetypes: twin-lobe, pillared
  hall (grid inset 3 step 4, center lane clear), rotunda (pillar ring at
  r≥9), gallery (laid along the road to the next rung).
- **Five themes**: `warren` shipped (gnolls/worgs, Den Matriarch, bone-hide
  decor, its own name bank). Decor kits per theme off the war-camp shelf;
  power-banded rosters (kingsmen at 45+, rock golems at 30+, etc.); every
  set-piece kind is a 2-variant pool, coin-flip mirrored; war themes light
  worked corridors with standing torches.
- **THE CHAMPION'S COURT**: five authored 23×15 grand arenas (throne hall /
  grotto / foundry / war-court / great den), dais + framed boss chest +
  ceremonial mouth. Crowns seated: crypt seed-picks fallen_king/barrow_lord,
  mine anvil_golem, stronghold goblin_flame_tyrant, warren gnoll_matriarch;
  cavern keeps the named Broodmother (no spider crown yet — LAW 8).
  **THE COURT WARDS THE PRIZE**: `poiChests` cell `dg:<charId>`, ward
  branch in interactChest, `dungeonChampionStands` (standing = alive OR
  unwoken; felled = eid null + respawnAt Infinity), retire loop in
  teardownDungeon. `DungeonInstance.bossSpawnIdx` mapped through
  registerSpawns' per-BODY flattening (count-summed offset — the entry
  index alone is wrong).
- **THE LIVED-IN DARK**: war-theme camps/dens seat posted bodies (cook /
  keeper / drill at their own stamped furniture, unwindowed); corridor
  sentries patrol their recorded ways (stops every 4th path cell about the
  waist, HOP LAW ≤10 truncates at any discontinuity).
- **THE THREE TURNS** landed via the key-ring session's 58bcd2e (peer);
  this epic's tier laws ride the same `key.ts`.

**Laws learned in the proving (regressions the tests now pin):**
- **THE MORTAR PASS**: organic carving mints 1-wide pinches (twin-lobe
  waists, blob noise) — every axis-pinched floor cell gets a flank carved
  open, run pre-stamp/pre-secret so it can never breach a sealed ring or a
  hidden tunnel.
- **NEVER BLOCKADE A SECRET**: a path chest is solid and no sweep pulls a
  prize — north-wall cells kissing a CrackedCaveWall are the secret's
  doorway and refuse chests/braziers (a chest once sat squarely on a
  crack's mouth and sealed the hidden room even through cracks).
- **THE COURT IS DRESSED BY ITS AUTHOR**: no scatter decor in the boss
  room (a crate once corked the dais lane between the arena's own
  pillars); props also refuse cells within 1 of a PillarStone.
- **EVERY CHEST IS A REPAIR TARGET**: the sweep now scans the ground for
  all chest tiles (prefab dais/vault chests included), not just the
  dress-ladder's own placements.
- **Travel-ordered corridor recording**: tunnelBuilt's L-legs record in
  walk order or patrol sampling jumps the seam.

Tests: 9 in generate.test.ts (determinism, divergence, tier sweep,
landing, pinch cap S²/400, slot spacing at 200, SPINE ≥0.85×S, COURT
crown/chest/index per theme, LIVED-IN posts+patrol hop law). Server 480 /
content 496 / shared 215 green; client 535 green + 3 failures owned by a
peer's uncommitted hamstring_bite FX WIP (not this seam).

## THE LONG DARK PROVED WHOLE — audit + polish pass (2026-08-14, second session)

The commissioned audit: 300 generated dungeons measured empirically
(walk distance, breadth, reward coverage), plus two deep code audits
(boss↔dungeon marriage; the player-facing run). What it found, what
shipped:

**Layout laws closed (plan.ts):**
- **THE ROAD STAYS LONG**: loop candidates walk a Dijkstra over the
  planned graph in MANHATTAN weights before joining — any link that
  shortens entry→court is refused (multi-hop branch-chain bypasses
  included). A rare crypt's entry→rung-2 loop had cut the road to 0.73×.
- **The direct-manhattan spine guard**: a 4-connected walk can never
  beat direct manhattan, so while the court would seat nearer than
  0.88×S manhattan from the entry, the road walks on (≤4 extra rungs,
  and the chamber budget GROWS with them so branches never thin). A
  monotone-diagonal spine whose branch blobs bridged the chord walked
  0.73× the law; now min walk ≥0.9×S over 300 seeds, breadth unchanged.
- **THE FLOOR OF ONE**: no tier rolls a loopless out-and-back tree.
- **THE DEAD END PAYS** (dress.ts): every degree-1 tangent room the
  ladders skipped gets the tier's humble chest or a vein. Empty leaves:
  mean ~0.9 → ~0.05, max 4 → 1.
- Regression seeds pinned in tests: common/12345, rare/2619526897.

**THE COURT HOLDS THE CROWN (arena law, cross-system):** every crown's
open-ground arenaR (14–18) exceeded the 23×15 arena's interior
(half-extents ≈9.5×6.5) — the champion chased kiters up the approach
and bossAtArenaRim could never fire underground. `ZoneSpawn.arenaR`
(content types) → SpawnState → the leash check and the rim guard both
read the SEAT's radius first; garrison stamps the court seat arenaR 8.
Test-pinned per theme.

**THE MANY ARE MET (party scaling, gameServer):** headcount = souls of
the run (owner + guests) present in the band. Player→garrison damage
folds by 1/(1+0.55·(n−1)); garrison→player damage rises ×(1+0.12·(n−1))
cap 1.5. EFFECTIVE folds at the damage seams — bars, purses, xp all
read the honest body; costs nothing outside the band. A key's power is
the SOLO recommendation; guests still enter free (key economy
unchanged).

**THE LADDER PAYS IN HANDS (interactChest):** the champion's chest
never spills its key on the floor for the quickest hand — dead-code
`nextKeyTier` is now the law: the key rolls PER PRESENT RUN MEMBER at
60% each, straight onto each ring, at the NEXT tier (commons seed
uncommons; legendaries keep paying legendaries). Gear/coins stay a
shared pile.

**THE COURT FALLS (completion):** instance stamps `cutAt`;
noteDungeonCleared (keyed to bossSpawnIdx, fires once by THE CLEARED
HALL) sends `dgclear` {name, sigil, sec} to every present member →
client herald ceremony with the run clock; chat line carries it too.
**THE WAY HOME OPENS**: generate.ts seats a sealed rift-mouth on court
floor south of the dais (portal def pre-registered, tile stays floor
until earned); the clear tears it open (setWorldTile → PortalUp +
summon fx). Owner stepping through = the run complete + teardown;
guests go home to their own gates. Test-pinned: registered portal,
floor-until-earned, ≤16 from the dais.

**THE TURNED SEED (repeatability, shared/dungeon/key.ts):** every key
turns 0–3 modifier words pure from the seed — Teeming (+1 body/pack),
Blooded (garrison +3 levels, +1 best chest), Veined (ore ×2), Hoarding
(+2 chests), Watchful (sentry chance 0.4→0.75, +2 levels). Budget by
tier: common 0–1, uncommon 1, rare 1–2, epic 2, legendary 2–3. ALL
GENERATIVE — they bend plan/dress/garrison counts and never touch
engine dials. Shown at the riftgate rows, the Keys bench (name+blurb),
the entry banner facts, and the entry chat line. S2CDungeonEnter grows
optional `mods` (additive, still v32, changelog-recorded).

**Fairness + copy:** death underground now SAYS the generous rule
("the rift still stands… re-entry free"); dungeon_key item copy no
longer claims "never spent" (three-turns law). **THE ROCK TAKES ITS
DEAD** (teardownDungeon): stray bodies in the band with no spawn point
(a crown's raised adds, spawnIndex −1) are swept at teardown —
companions excepted — or the next instance dealt the slot inherits
live teeth.

**Known seams, deliberately deferred:** cavern Broodmother is still a
named giant_spider, not a crown — rig.ts/ragdoll.ts spider dispatch is
exact-id and that file is the boss session's active ground (their
docket already carries "spider voices"); the court seat wiring takes a
new crown as one ROSTERS line. Logout still tears the run down with no
grace window. No court/objective marker on the underground chart yet
(waypoints stay disabled below 8192). Banner SHOW_RANGE (14) no longer
conflicts underground now that court arenaR is 8.

Final measured state (60 seeds/tier): walk-to-court 23–72s pure walk
across tiers, off-spine floor 64–72%, empty leaves ≈0, loops ≥1
always, chests 5–17, bodies 30–460 (modifiers visible in the spread),
anomalies 0/300. Tests: 12 in generate.test.ts; full tree green
(shared 215 / content 496 / server 542 / client 489).
