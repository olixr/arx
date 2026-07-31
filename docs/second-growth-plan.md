# THE SECOND GROWTH — resources that deplete, and a land that heals slowly

*Proposed 2026-07-31. GREEN-LIT the same day. ALL SIX PHASES SHIPPED 2026-07-31 — THE EPIC IS COMPLETE: Ph1 LEDGER OF THE LAND b8e7091, Ph2 LIVING WOOD 720fc6b, Ph3 PATIENT STONE/QUICK MEADOW 4e2d880, Ph4 SOWN LINE fbed9b5, Ph5 ROSTER SPEAKS 7fbc23e, Ph6 FORESTER'S GLASS (this commit). Plus the polish pass d9910ac: bespoke sapling models + the face contest completed for elevated objects.*

The fourth act of the procedural world epic. The Living Frontier taught camps to rise and
fall. The Lived-In Land filled the walk between them. This epic makes the land itself
answer the axe: harvest a wild forest and the forest is gone — it grows back over real
days, from its edges, around whatever you built in the clearing. Towns stay tended and
reliable. The wild becomes consumable, explorable, and shapeable.

---

## 1. The mandate

- Resources today respawn in seconds, in the identical tile, with the identical look.
  There is no reason to explore past the first cluster and no way to leave a mark.
- Resources must be markable as **replenishable or not** — and the mark is a property of
  the *ground*, content-driven: pre-authored town zones keep today's fast in-place
  respawn ("the towns are always manageable"); the procedural wild becomes real.
- In the wild, a harvested resource **goes away**. It does not come back instantly and it
  does not come back in the exact same spot. A felled forest stays felled and regrows
  slowly, organically, edge-inward — and it grows *around* player structures, so clearing
  a homestead is a permanent, strategic act.
- Ores and forage follow the same truth in their own dialects.
- The system must be heavily content-driven (dials, docs, Studio benches) and must open
  the door to player planting: saplings, orchards, deliberate groves.

## 2. Ground truth (verified against code, 2026-07-31)

**A resource node is a tile, not an entity.** `NodeDef` (packages/content/src/nodes.ts:5)
is keyed by `Tile`; `NODES_BY_TILE` (:325) is the single lookup seam. 19 defs: 5 trees
(→ `Tile.Stump`, respawn 18–75 s, named species take several swings via
`depleteChance` 0.3–0.4), 10 ore rocks (→ `RockDepleted`, one swing, 15–240 s),
4 forage (→ `Grass`, 60–90 s), 1 infinite `FishingSpot`.

**Harvest** = `GameServer.interact` (gameServer.ts:3083, node branch :3182) →
`tickGather` (:3531). Contention is tile-identity: first depleter wins, everyone else
cancels `'gone'`. Depletion (:3578–3600) swaps the ground tile via `setWorldTile`
(:4910 — world write + `encodeTilePatch` broadcast) and pushes onto **`respawnQueue`**
(:1641) — one global in-memory array shared with doors/chests/props, drained by a full
linear scan every 50 ms tick (:16663–16708). Trees already get a staged 3-beat regrowth:
`Stump` → sapling at 45% of `respawnSec` (`saplingOf`, tiles.ts:1029–1050) → full tree.

**Placement** converges from three paths into one `ChunkData.ground` array:
- Procedural: `generateChunk` (packages/content/src/worldgen.ts:271) — pure from
  `(seed, cx, cy)`; forest density = f(moisture) (:582–611), species ladder (:596–601),
  meadow sentinels (:626–639), mesa/cliff ore bands (:449–523), road shoulders fell
  nodes to stumps (`ROAD_FELLED`, :680).
- Authored: `ZoneBuilder.set` per tile in packages/content/src/maps/*.ts, overlaid by
  `WorldSource.overlayZone` (worldSource.ts:325).
- POI/finds prefabs: glyph charset (pois/prefabs.ts:52–95) composed into live zones.

**Look is never transmitted**: every client grows the identical tree from
`treeModel(tile, hashCoords(41, tx, ty))` (render/trees.ts:444). A regrown tree is
*literally* the tree you cut — same variant, same silhouette.

**The two structural gaps** (why this must be an architectural phase, not a patch):
1. **No persistence.** `respawnQueue` is a plain array; `WorldSource.ensure`
   (worldSource.ts:290) re-applies exactly two overlays on chunk regen — `builtTiles`
   and `cropTiles`. A restart or zone churn silently resurrects every depleted node.
2. **No regrowth model.** Respawn is a fixed per-tile timer; nothing in the engine can
   express "the forest regrows from its edges" or "the vein re-opens elsewhere."

**The precedents this design rides** (all shipped, all proven):
- **Deviations-only world tables**: `world_minors` v17 (location PK, epoch stamp,
  absence = seed-truth), `world_pois`, `frontier_calm`. Absolute-deadline BIGINT clocks
  (`ember_until`, `fallow_until`) — restart-safe by construction.
- **Pure elapsed-time staging**: crops (`stageForElapsed`/`tileForStage`,
  crops.ts:135/:142; `tickCrops` gameServer.ts:4019) — stage is a function of wall
  clock, offline catch-up is free, and it is the only growth system with persistence
  (`crops` table, boot rehydrate index.ts:307–321).
- **Budgeted slow passes**: `tickPois` one-cell-per-pass, `tickFrontier`'s
  one-unit-of-work early-return chain, each on its own modulo offset.
- **Live content docs**: seed/validate/replace + THE BACKFILL LAW (frontier.ts:340),
  two-hash edited detection (contentDocs.ts), `/dev/content/*` route triple, CMS bench
  dialect, pure hash-jittered wait helpers with named `ST_*` salts (`fallowRestFor` et
  al) — exactly the shape `regrowWaitFor(seed, tx, ty, salt)` should take.

## 3. The design in one breath

Split the world's ground into **kept** and **wild**. Kept ground (authored towns, live
POI zones, delves) keeps today's behavior untouched. Wild ground gets a new persistent
**growth ledger**: harvesting writes a deviation row instead of a queue entry; a
budgeted growth beat walks the ledger and heals it slowly through real growth stages —
bare → sapling → crown — with germination driven by nearby standing seed-sources, so
forests regrow edge-inward over days, veins re-open over hours, and meadows drift. The
ledger aims back at worldgen's seed-truth with dispersal jitter, so it self-prunes;
drift persists only where players claimed, built, or planted. Everything is dialed
through a new `growth` content doc and a promoted `node` content-doc roster, with a
World Studio lens and a Resources bench.

## 4. The laws

**THE KEPT AND THE WILD (the domain law).** Every ground tile belongs to exactly one
growth domain, decided by *where the tile came from*, never by the node def: authored
zone overlay → kept; live POI/finds zone rect → kept (the compose owns its dressing;
retire re-deals it); below `DARK_BAND_Y` → kept (delves are per-run); everything else —
raw worldgen ground — wild. `ZoneDef.growth: 'kept' | 'wild'` overrides the default so
the Studio can author wild groves inside zones or tended clearings in the open. One
router function, `growthDomainAt(tx, ty)`, is the single door; `tickGather`'s depletion
block asks it once.

**DEVIATIONS ONLY (the ledger law).** The untouched world is never simulated. A
`world_growth` row exists only where a hand changed the land (harvest, growth-in-
progress, or planting); a row whose tile has healed back to seed-truth deletes itself.
The whole simulation domain is the deviation set — bounded by what players actually
touched, exactly like `world_minors`.

**THE LAND REMEMBERS ITS NATURE (the convergence law).** Regrowth aims at seed-truth:
the germination target for a healed forest tile is drawn from nearby tiles where
`generateChunk` itself deals a tree, with a dispersal jitter among them. Most rows
therefore cancel over time and the ledger stays lean — but the route back drifts, so no
two regrowths of the same glade look alike mid-way. Permanent drift is allowed only
where the land is claimed: built tiles, crops, roads, and player plantings hold their
ground forever.

**THE FOREST GROWS FROM ITS EDGES (the succession law).** A bare tile's germination
chance scales with the count of standing crown-stage sources within dispersal reach
(seed-truth trees and ledger-grown trees alike), plus a whisper of pioneer chance so a
total clearcut is never a permanent desert. The emergent behavior is the fantasy:
clearcuts heal edge-inward as a visible green wave over real days. No wave logic is ever
coded — it falls out of the source-count law.

**THE THREE AGES (the stage law).** Wild regrowth is staged — bare → sapling → crown —
and stage is a *pure function of the row and the clock* (`stageForElapsed` precedent).
`WorldSource`'s growth overlay computes the current tile at read time, so an unloaded
chunk is always correct the moment it generates; the growth beat only exists to
broadcast `setWorldTile` patches into *loaded* chunks (and to run germination rolls).
Restart-safe with zero catch-up code.

**ONE ENGINE, THREE DIALECTS (the unity law).** Trees, ores, and forage are dial rows of
the same engine, never three systems. Trees: long windows, source-driven dispersal,
three ages. Ores: the vein dialect — a mined tile stays `RockDepleted` for a long
window, then re-opens aimed at seed-truth with jitter *within the formation band*, so
mining migrates through a mesa instead of farming one rock. Forage: short windows,
bush-to-bush spread for berries, base-rate drift for herbs. Fishing spots are untouched.

**THE BUILDER'S CLEARING (the courtesy law).** Growth never enters built tiles, crop
tiles, sign tiles, road/trail shoulders (`ROAD_FELLED` stays law), or claim rings — and
it refuses a 1-tile courtesy ring around built ground (dialed). Clear a homestead and
the forest regrows *around* it. This is what makes clearing land a strategic act instead
of a chore.

**THE WORLD OWES YOU NOTHING (the flood-law echo, da3a5b7).** Every growth dial reads
world state only — position, time, seed, standing neighbors. Never player state, never
demand, never pity. A starving server does not speed the trees.

**THE MARK IS ON THE GROUND, NEVER THE DEF.** `TreeOak` in Dawnmead's orchard and
`TreeOak` in the deep wild are the same `NodeDef`. Replenishability is a property of
where it stands. Defs carry only *pace class* knobs (which dial band applies), so the
roster never forks into town/wild twins.

## 5. The schema and the seams

**Migration v20 — `world_growth`** (the pattern of `world_minors` + `crops`):

```sql
CREATE TABLE world_growth (
  tx INTEGER NOT NULL, ty INTEGER NOT NULL,
  state SMALLINT NOT NULL,          -- 0 bare (harvested), 1 seeded, 2 sapling, 3 crown-drifted
  tile INTEGER NOT NULL,            -- the resource tile this row is about (target species / vein)
  since BIGINT NOT NULL,            -- when the current state began (absolute ms)
  due BIGINT,                       -- next transition deadline (absolute ms; NULL = dormant, awaiting germination)
  owner_character_id INTEGER,       -- NULL = natural; set = player-planted (never auto-pruned)
  first_seen_at BIGINT NOT NULL,
  PRIMARY KEY (tx, ty)
);
```

- `AccountStore.loadGrowth() / upsertGrowth(...) / deleteGrowth(tx, ty)` copied line for
  line from the `loadMinorCells`/`upsertMinorCell` shape (`db.fire`, camelCase aliases).
- Boot: load wholesale beside built tiles, `world.registerGrowth(...)` **before**
  `new GameServer` (the built-tiles order), then a reconcile sweep for rows whose `due`
  passed while the server slept (the `initPois` ember-reconcile precedent).
- `WorldSource` grows a `growthTiles` overlay applied in `ensure` after zones, before
  built/crops (player layers stay on top — a board floor over an old stump wins).
- In-memory: `growthLedger: Map<"tx,ty", GrowthRow>` on GameServer + a due-ordered
  bucket index so the beat never scans the whole map.
- **The wild depletion path leaves `respawnQueue` entirely.** The queue keeps doors,
  chests, props, and kept-ground nodes — unchanged.

**New content doc — `growth` (singleton, the frontier module shape):** `GrowthDef` +
`AUTHORED_GROWTH` + `validateGrowth` (backfill law from day one) + `replaceGrowth` +
`/dev/content/growth` GET/PUT/DELETE + pure `regrowWaitFor`-family helpers with named
`ST_*` salts. Proposed authored dials (all Studio-tunable):

| dial | authored | meaning |
|---|---|---|
| `treeGermMinutes` | [180, 600] | bare→seeded window once a germination roll succeeds |
| `treeSaplingMinutes` | [240, 720] | seeded/sapling stand-up window |
| `treeCrownMinutes` | [360, 1080] | sapling→crown window |
| `sourceReach` | 6 | dispersal radius in tiles for seed-source counting |
| `sourceBoost` | 0.22 | germination chance added per standing crown source in reach |
| `pioneerChance` | 0.015 | per-visit germination floor with zero sources |
| `oreReopenMinutes` | [240, 900] | vein re-exposure window |
| `oreDriftReach` | 5 | jitter radius within the formation band |
| `forageMinutes` | [25, 70] | forage return window |
| `berrySpreadReach` | 4 | bush-to-bush dispersal radius |
| `courtesyRing` | 1 | tiles of refusal around built ground |
| `growthBeatTicks` | 40 | tick modulo for the growth pass (own offset) |

**Danger-law column (the `findChance` precedent):** nothing new needed for v1 — density
is already worldgen's. If tuning wants tier-aware regrowth pace later, it lands as one
`DangerLaw` column, not a new table.

**The beat — `tickGrowth(now)`** at its own modulo offset: one unit of work per pass —
pop due transitions from the bucket index (apply via `setWorldTile` when the chunk is
known to any session; else just update the row — the overlay serves the truth at next
`ensure`), then visit one dormant parcel for germination rolls (round-robin by region so
a continent-wide ledger never stalls the tick). Dignity guard: a tree never stands up
under a player's feet (`bodyOnTile` defer, the respawn-queue precedent).

**Client:** zero protocol change. Tile patches already carry every transition; the
sapling sprout and stand-up bursts (main.ts:1574/:1588) and `growthOf` scale-ease
already stage the theatre. Ore re-exposure reuses the existing twinkle; forage pops as
today. The felling theatre is untouched.

## 6. The phases

**Phase 1 — THE LEDGER OF THE LAND.** The foundation: v20 table + load/upsert helpers,
`WorldSource.registerGrowth` + overlay, `growthDomainAt` router with `ZoneDef.growth`
override, wild depletion writes ledger rows (kept ground untouched), boot rehydrate +
reconcile, `tickGrowth` beat with due-bucket index, the `growth` content doc + dials +
dev route, in-place seed-truth healing on the slow windows (no dispersal yet — every
wild resource already *stays gone for hours and survives restarts*). `/growth` lever.
Tests: domain router, ledger persistence round-trip, overlay-at-ensure staging, beat
budget, backfill law.

**Phase 2 — THE LIVING WOOD.** The succession engine for trees: germination rolls with
source counting (`sourceReach`/`sourceBoost`/`pioneerChance`), THE THREE AGES staging
through the existing sapling tiles, dispersal jitter aimed at seed-truth (the
convergence law, self-pruning pinned by test), THE BUILDER'S CLEARING refusals (built,
crops, roads, claim rings, courtesy ring), edge-inward wave verified on a live clearcut.
The felled forest becomes the marquee experience here.

**Phase 3 — THE PATIENT STONE AND THE QUICK MEADOW.** The ore and forage dialects: vein
re-exposure with in-band drift (mining migrates through the mesa), berry bush-to-bush
spread, herb base-rate drift, per-class pace dials, and the economy balance pass — town
kept nodes stay the steady modest source, wild windfalls become rich but consumable.
Flood-analyzer check on any yield changes (loot flood-law).

**Phase 4 — THE SOWN LINE.** Planting: seed/sapling items entering through `bonusYield`
loops (the sagewort-seed precedent — acorns, cones, cuttings), a plant interaction on
capable wild ground, owner-stamped ledger rows that never auto-prune (your orchard is
yours to keep, though anyone may chop it), planted trees riding the exact same three
ages. Player-facing text through docs/VOICE.md. This is the door the user named:
orchards, deliberate groves, shaping the land's growth on purpose.

**Phase 5 — THE ROSTER SPEAKS.** Content ownership of the nodes themselves: promote
`NODES` from a plain code table to `node` content docs (slug ids, `AUTHORED_NODES`,
validator, `replaceNodes`, `/dev/content/nodes/:id`), keeping `NODES_BY_TILE` as the
unchanged runtime seam; pace-class field per def; `ZoneDef.growth` editable in Map
Studio; the Resources CMS bench (roster list + def editor + growth-dials section on the
weather-bench skeleton).

**Phase 6 — THE FORESTER'S GLASS.** Observability and the Studio's eye: World Studio
growth lens (deviation pips by state — felled, seeded, sapling; the regrowth wave
visible on the map), inspector pills, a growth survey beside the density survey
(ledger totals by dialect and age), `/growth` lever polish, and the epic's balance
ledger written into this doc.

## 7. Economy and feel notes

- Towns keep the floor under every skill: kept nodes mean a new player can always chop,
  mine, and pick *something*. The wild carries the ceiling: dense virgin forest and
  untapped mesas are windfalls that spend down — which finally gives the Lived-In Land's
  finds, trails, and territories an economic reason to be explored.
- Named-species gates (`minPower`) are untouched; scarcity comes from geography and
  time, never from new stat walls.
- A clearcut is *supposed* to hurt: the regrow windows are tuned in real hours-to-days
  on purpose. The dials make the pain adjustable without touching code.
- Nothing here rolls per-player. Two players at the same grove see the same truth and
  compete for it — contention was already the law (`'gone'`), now it matters.

## 7a. Phase 3 balance ledger (as shipped)

The economy pass concluded with ZERO yield changes — no loot table, no
`yieldItem`, no `xp` moved, so the loot flood-law needed no analyzer
run. What changed is *where and when* supply stands, never how much a
swing pays: kept town nodes are untouched end to end (test-pinned and
live-verified — the towns remain every trade's steady floor); wild
supply is conserved by construction (a wander moves exactly one
resource: the source seals to host ground, the target either heals a
sealed truth-site or stands a drifted presence — the full-circle test
pins that a wander out and back leaves the ledger EMPTY). Farming one
wild rock stops working not because the rock pays less, but because
the vein moves — the pay-per-swing is identical everywhere.

## 8. Open questions (decided at green-light, defaults proposed)

1. **Ledger scale guard.** A griefing crew could fell thousands of tiles. Rows are tiny
   and bounded by actual labor (each tile costs a full gather action), and healing
   prunes them; proposed: ship with a `/growth` census in the lever and revisit only if
   real numbers demand it.
2. **Stump lifetime.** Proposed: a felled wild tile shows `Stump` for a short dignity
   window, then the overlay relaxes it to `Grass` (buildable, plantable) until
   germination — the Building epic's forage-to-buildable precedent.
3. **POI felled clearings.** Camps already stamp stumps into their zones; those stay
   kept (zone-owned) and are re-dealt on epoch turns. No change proposed.

## 9. The epic ledger (as shipped, 2026-07-31)

Every phase landed the day the epic was green-lit, live-verified end to
end on the running world:

1. **THE LEDGER OF THE LAND** (b8e7091) — kept-vs-wild domains,
   world_growth v20, the pure-projection ages via the ensure overlay
   (restart-proven on screen), the growth beat, the 'growth' dial doc.
2. **THE LIVING WOOD** (720fc6b) — time alone never stands a tree:
   dormant bare ground, germination against standing crowns, the
   edge-inward wave as one pure number, species drift with the
   convergence law (a 4-crown fell crowned and self-deleted live; the
   0-crown pioneer control still waits, by design).
3. **THE PATIENT STONE AND THE QUICK MEADOW** (4e2d880) — wandering
   veins and meadow patches with the homing bias; conservation by
   construction (the full circle emptied the ledger on screen). Zero
   yield changes — the balance ledger is §7a.
4. **THE SOWN LINE** (fbed9b5) — spilled seeds, the plant flow through
   the seed picker, owner-stamped orchards, THE SEED TAKES THE PLOT.
5. **THE ROSTER SPEAKS** (7fbc23e) — every node def is Studio content
   with the renewal class as data; the Resources bench with The Land's
   Clock; the Map Studio growth mark.
6. **THE FORESTER'S GLASS** — the growth ledger rides /dev/world; the
   World Studio Growth lens draws the wave age by age (scar, dormant
   hollow, seeded amber, sapling green, drifted violet, sealed gray,
   the gardener's ring on sown ground); /growth reports sown counts.

The first wild scar in Arx — the oak at 492,299 — is still healing on
the authored clock as this ledger is written, and a planted oak rests
at 513,280 carrying its gardener's name. The world remembers.
