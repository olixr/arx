# The World Learns to Grow — Procedural POI & Wilderness Plan

The hybrid law: **hand-curated content, procedurally composed**. Designers author
prefabs, POI grammars, garrison recipes, and rosters in the studios; deterministic
passes decide *where* and *which* out in the infinite overworld. The further from
settled land, the higher the danger tier — and every downstream system (spawn
levels, chest kinds, loot rarity, key tiers) reads that one field instead of
inventing its own gradient.

This is the overworld sibling of the dungeon generator, and it inherits its
discipline:

- **Named RNG streams** — every pass hashes with its own salt
  (`hashCoords(seed ^ SALT, …)`), so adding a feature to one pass never
  reshuffles another. Always `>>>`/`& mask` when slicing hash bits (the signed-shift
  gotcha that broke dungeon painters).
- **Pure until materialization** — a POI costs nothing until a player walks near.
- **The ledger records deviations, not the world** — determinism is the storage;
  the DB only remembers what diverged (first-seen, cleared, epoch).
- **POIs are tiny zones** — materialized through the *existing* `addZone` +
  `registerSpawns`/`registerActorSpawns` + `zonePlacements` machinery. One
  representation shared with the editor: curated and procedural halves never fork.

Current ground truth (verified 2026-07-24):

- Terrain is pure `(seed, tx, ty)` — `generateChunk` (`server/src/world/worldgen.ts:113`)
  with elevation/moisture/plateau/basin/sandbar fields; resources are hash-placed
  tiles; node state = tile mutations + `respawnQueue`. Infinite, lazy, in-memory.
- Zones full-rect overlay in `WorldSource.overlayZone` (`worldSource.ts:177`);
  later zones win; `builtTiles`/`cropTiles` re-apply after. No transparency sentinel.
- All mobs are hand-registered (`TOWN_SPAWNS` + zone spawns). **No wilderness
  spawning, no time-of-day gating, no danger field exists.**
- `PrefabDef` (`content/src/maps/prefab.ts`) already carries ground/detail/elev +
  portals + spawns (with `level`/`name` overrides!) + actor posts, relative coords —
  but is stamped only at editor time.
- `scaleNpcDef(def, level, name)` + `registerSpawns` level overrides already work
  end-to-end (the dungeon garrison path).
- Only `basinFieldAt`/`sandbarAt`/`DARK_BAND_Y`/`generateChunk` are exported from
  worldgen; `elevationAt`/`plateauFieldAt`/`levelOf` are internal.

---

## Phase 1 — The Danger Field & the First Camps

Goal: prove the whole pipeline — field → scaffold → composition → materialization —
with three archetypes standing in the live world.

### 1.1 The danger field (`packages/shared/src/world/danger.ts`)

```ts
export interface DangerAnchor { x: number; y: number; safeR: number }

/** 0 = settled, 5 = deep frontier. Pure; same everywhere it's called. */
export function dangerAt(seed: number, tx: number, ty: number, anchors: DangerAnchor[]): number
```

- Base tier from distance to the nearest anchor: inside `safeR` → 0, then one
  tier per ~56-tile band (tunable `DANGER_BAND` const), capped at 5.
- ±1 jitter from `fbm(seed ^ 0xda9e21, tx * 0.01, ty * 0.01, 2)` so tier borders
  wander organically instead of drawing circles on the map. Clamp to [0, 5]; never
  jitter *inside* `safeR` (town stays tier 0 by law).
- Anchors live in content: `SETTLED_ANCHORS` (`content/src/world/anchors.ts`) —
  Bramblewick `{48, 48, safeR: 72}`, Hollow Stair `{132, 20, safeR: 28}`. Phase 4
  waystations append to this list at runtime, so the signature takes anchors as a
  parameter rather than baking them in.
- **`DANGER_LAWS: Record<tier, {npcLevel: [min,max], chestKind, rarityBonus, poiChance, wildDensity}>`**
  in `content/src/world/danger.ts` (content, not shared — it references chest
  kinds/roster ideas). The one law table every later phase reads; the
  `DUNGEON_TIER_LAWS` precedent.
- Tests (`danger.test.ts`): tier 0 everywhere inside safeR; monotonic band
  progression along a ray; jitter bounded to ±1; determinism.

### 1.2 Worldgen probes + the transparency sentinel

- Export `elevationAt`, `levelOf`, and add `export function groundProbeAt(seed, tx, ty):
  'water' | 'sand' | 'grass' | 'forest' | 'rock'` — a cheap classifier reusing the
  existing field math (NOT a chunk generation). Suitability scans use probes for
  the cheap pre-filter and live `world.tileAt` for the final check (which sees
  authored zones, builds, and crops by construction).
- **`TILE_SKIP = 0xffff`** moves to `shared/src/world/tiles.ts` (the editor's
  `GHOST_SKIP` re-exports it). `overlayZone` skips a cell when `ground[zi] === TILE_SKIP`
  (and detail likewise). 0xffff is not a legal tile, so no flag needed on ZoneDef.
  This lets prefabs carry irregular footprints; the editor's prefab capture can
  adopt it later — for Phase 1, POI prefabs stamp their full rect (suitability
  guarantees grass under them, so seams don't show).

### 1.3 The POI grammar v1 (`packages/content/src/pois.ts`)

TS consts first (the bestiary precedent — DB-first comes in Phase 2):

```ts
export interface PoiGarrisonEntry {
  npc: string;                    // bestiary id
  count: [min, max];              // scaled by a hash roll
  role: 'holdfast' | 'sentry';    // holdfast = inside; sentry = suitability ring outside
  levelOffset?: number;           // champion = +5 over the tier band, named via scaleNpcDef
  name?: string;
}
export interface PoiDef {
  id: string;                     // 'goblin_warcamp'
  name: string;
  tiers: [min, max];              // eligible danger tiers
  weight: number;                 // archetype pick weight within eligible tier
  prefabs: string[];              // pool of data/prefabs ids, hash-picked per site
  garrison: PoiGarrisonEntry[];
  chest?: { byTier: Partial<Record<number, ChestKind>> };  // upgrades the prefab's chest tile
}
```

Three archetypes, each with 2 prefab variants:

1. **`goblin_warcamp`** (tiers 1–3) — tents/campfire/palisade scraps; goblins +
   goblin archer, champion at tier 3; wood→mossy chest.
2. **`forest_ruin`** (tiers 2–4) — broken stone walls + brazier; skeletons; the
   chest IS the point (mossy→iron, brass-key at tier 4).
3. **`wild_grove`** (tiers 1–4) — a resource POI: ore knoll / yew stand / dense
   forage prefabs; wolves (worg at high tier) as guardians. No chest — the nodes
   are the loot.

Prefab bootstrap: a script (`scripts/buildPoiPrefabs.ts`) composes the six
variants through `ZoneBuilder` and writes `data/prefabs/poi_*.json` — instantly
curatable afterward in Map Studio (that's the whole point of sharing the
representation). Chest tiles, spawn markers, and campfires are placed in the
prefab itself; the composer only *re-levels* them.

### 1.4 Scaffold + composition (`packages/server/src/world/pois.ts`)

```ts
export const POI_CELL = 128;      // 4×4 chunks
export function poiForCell(seed, cellX, cellY, epoch, ctx): PoiSite | null
// ctx = { anchors, zoneRects, defs, probe: (tx,ty) => tile | undefined }
```

Streams (salts): `EXIST` roll vs `DANGER_LAWS[tier].poiChance` (tier sampled at
cell center) → `KIND` weighted pick among tier-eligible defs → `SITE` scan: ~24
hashed candidate anchors inside the cell (margin = half of the largest prefab in
the pool), scored by probe (grass/forest, `levelOf === 0`, no water in footprint,
≥ 24 tiles from any authored zone rect and from `DARK_BAND_Y`, ≥ 1 cell from the
world-spawn cell) → best candidate above threshold, else null (a cell with no
good ground simply has no POI — never force one). → `VARIANT` prefab pick +
garrison count/champion rolls.

`composePoi(site, prefab, def): { zone: ZoneDef, spawns: ZoneSpawn[], actors: ZoneActorSpawn[] }`:

- Zone id `poi:<cellX>,<cellY>`, origin = anchor − prefab center, prefab layers
  verbatim (elev included — flat prefabs deliberately level their site).
- Prefab spawns pass through with **`level` stamped from `DANGER_LAWS[tier].npcLevel`**
  (hash-jittered within the band) — the existing `registerSpawns` → `scaleNpcDef`
  path does the rest, unchanged.
- Garrison entries append further `ZoneSpawn`s: holdfast roles scatter inside the
  footprint; **sentry roles probe a ring** (radius = footprint half + 6..10, 8–12
  bearings) and take the 2–3 best-scored points, preferring higher `levelOf`
  (lookouts on rises) and the bearing toward the nearest anchor (players arrive
  from settled land — the camp watches the road). This is the semantic-garnish
  seed; Phase 2 grows it.
- Chest upgrade: find the prefab's chest tile, swap to `def.chest.byTier[tier]`.

### 1.5 Materialization (`gameServer.ts`)

- `poiCells: Map<string, { state: 'none' | 'live'; zoneId?: string }>`.
- A slow pass (`tickPois`, every 20 ticks) collects cells whose rect intersects
  any session's interest window **padded by one cell**, and materializes **at most
  one cell per pass** (the sliced-job law from the chunk-bake queue).
- `materializeCell`: consult ledger row → if absent, run `poiForCell` and insert
  (`'none'` rows are recorded too — a decided-empty cell is never re-rolled by
  accident). If a site: `composePoi` → `world.addZone(zone)` → **drop the zone's
  chunk keys from every session's `knownChunks`** (the reloadZone client-drop
  law — addZone alone only invalidates the server cache, and unlike dungeons at
  y≥8192, POIs appear next to standing players) → `registerSpawns(spawns, zoneId)` /
  `registerActorSpawns(actors, zoneId)` (the `zonePlacements` tag makes retire
  free, deactivate-in-place law respected).
- No dematerialization in Phase 1 — POI zones are ≤ 32² and spawn records are
  cheap; document the unbounded-uptime cost and revisit with the ledger phase.
- **Anchor placement rescue**: like dungeon landings, ensure the composed zone
  doesn't strand a spawn on a solid tile — `registerSpawns` already retries 8
  scatter positions; sentries validate walkability at ring-probe time.

### 1.6 Ledger v1 (migration N: `world_pois`)

`cell_x, cell_y, epoch (default 0), poi_id NULL for none, prefab_id, anchor_x,
anchor_y, tier, site_seed, first_seen_at, cleared_at NULL` — PK `(cell_x, cell_y)`.
Written on first materialization; read before every `poiForCell`. `cleared_at`
is *recorded* in Phase 1 (all holdfast+sentry spawn records dead at once) but
consumed only in Phase 3. In-memory cache in `poiCells`; one DB read per cell
per boot, no per-tick queries.

### 1.7 Dev levers + verification

- `/poi info` (cell, tier, ledger state at your feet), `/poi here <id?>`
  (force-materialize the current cell, optional archetype override),
  `/poi reroll` (epoch += 1, retire + re-materialize — the regeneration lever,
  shipped early as a dev tool).
- `/danger` overlays tier digits in chat or a client debug tint (cheap: reuse the
  elevation-digit editor pattern later; chat readout is enough for Phase 1).
- Tests (`server/src/world/pois.test.ts`, the dungeon-test precedent): fixed seed
  → scan 400 cells: determinism (twice, identical), zero footprint overlap with
  authored-zone rects or water, spawn/chest coordinates in-bounds, tier
  monotonicity vs distance, every archetype occurring, garrison levels inside
  `DANGER_LAWS` bands.
- Live recipe: boot, `/poi here goblin_warcamp`, screenshot; walk the frontier
  until an organic camp streams in; verify sentries stand outside the palisade on
  the townward side; kill the garrison, confirm `cleared_at` lands in the DB.

**Commit boundary**: danger field + laws → probes/sentinel → grammar + prefab
script → scaffold/composition + tests → materialization + levers. Five commits,
each green.

---

## Phase 2 — The Grammar Goes to the Studio

Goal: POI archetypes become designer-owned content, and camps read as *inhabited*.

- **`PoiDef` joins the content-docs law**: JSON defs in `content/src/pois/defs/*.json`
  (filename = id, one-validator `validatePoiDef` guarding authored JSON, DB rows,
  and tool submissions — the actor precedent), seeded into `content_docs` kind
  `'poi'` under the two-hash law, `replacePoiDefs` live-registry swap,
  `/dev/content` gains `pois`. Re-materialization on edit: retire the def's live
  cells (`zonePlacements`) and let `tickPois` re-stand them — the
  `reloadNpcDef` pattern.
- **Content Studio POI bench**: master-detail editor — prefab pool cards with
  true-render previews (`renderLayersPreview` already exists), garrison rows with
  bestiary comboboxes + level-band readouts from `DANGER_LAWS`, tier-eligibility
  sliders, a **"simulate 100 cells" observed panel** (the loot-laboratory law:
  show archetype frequency, tier spread, chest mix — observed, not computed).
- **Map Studio**: prefab cards grow a "POI" tag + `TILE_SKIP` eraser in the
  capture flow so authors can carve irregular footprints; a "Test stamp at tier N"
  preview that runs `composePoi` and shows the sentry ring pins.
- **Patrols**: sentry role gains `patrol?: true` — the composer generates a
  perimeter `RoutineDef` (post → path around the footprint → post) registered
  in-memory alongside the actor/spawn records. Uses the routine system's authored
  speeds + the steering fan; no new movement code.
- **Warning vocabulary**: archetype-declared approach cues stamped *outside* the
  prefab at compose time — cleared-tree radius for camps (ground forced to
  trampled grass), a hash-scattered bone pile or banner detail tile on the two
  most-approachable bearings. The player reads the camp before the camp reads
  them.

---

## Phase 3 — The Clock, the Wilds, and the Turning World

Goal: time-of-day life, ambient wilderness, and the regeneration loop.

- **Activity windows**: `hours?: { from: number; to: number }` (game hours,
  midnight-wrapping like routine slots) on `ZoneSpawn`/`PrefabSpawn`/`SpawnState`
  and on `PoiGarrisonEntry`. `tickSpawns` reads `clockHoursAtTick` once per pass:
  out-of-window points don't respawn, and standing bodies retire when out of
  combat AND no player within ~20 tiles (never blink out in front of someone).
  Rosters: nocturnal predators (wolves/bats out at night), skeletal garrisons
  that double after dusk, daytime-only critters.
- **Wilderness ambience** (`tickWildSpawns`): per player, keep a small budget
  (~4–6) of ambient bodies in the 1–2-chunk annulus, rolled from
  `WILD_ROSTERS[biome][tier]` (content) with `wildDensity` from `DANGER_LAWS` and
  day/night variants; `spawnIndex = -1` (no respawn records), despawned beyond
  radius+grace. Deer and songbird-tier life near town, dire things at tier 4+.
  Non-deterministic by design — ambience, not landmarks.
- **The epoch turn**: a boot-time (later: nightly) sweep bumps `epoch` on cells
  `cleared_at > EPOCH_FALLOW_DAYS` (start: 7 real days) → next materialization
  re-rolls the cell on fresh streams (new archetype, new prefab, new anchor).
  Familiar places persist exactly as long as players keep them cleared or
  visited; the deep frontier churns. `/poi reroll` from Phase 1 is this lever,
  manual.
- **Danger reaches the client**: minimap/held-map tint by tier (the danger fn is
  shared + anchors are content — zero protocol work), and ambient audio picks the
  adventure/boss track pool by local tier.

---

## Phase 4 — Friendly Lights in the Dark

Goal: the POI system grows the *civilized* archetypes and closes the key-economy loop.

- **Waystations** (tiers 2–4): friendly-actor POIs — a trader with a `shop` hook,
  a campfire (sit + routine lunch precedent), 1–2 guards (`invulnerable`
  protection law). The actor pool is authored generic actors
  (`waystation_trader` etc.) with hash-picked looks via the actor foundry's
  look-generation; dialogue binding by kind (`dialogue_bindings` already supports
  non-slug targets). **A materialized waystation appends itself to the runtime
  anchors list with a small `safeR`** — civilization genuinely pushes the danger
  back, and the field stays the single source of truth.
- **Dungeon mouths** (tiers 3–5): a ruined riftgate prefab + a chest whose table
  carries a `dungeon_key` faucet with `rarityBonus` from tier — keys now surface
  *in the world you explore*, not only from kills; the deeper you roam, the
  higher the minted tier.
- **Challenge sites** (tiers 2–5): a named champion (`scaleNpcDef` name + level
  offsets, the dungeon boss precedent) warding a locked boss-chest; the
  brass-key/boss-chest ladder reaches the overworld.
- **Faction seeds**: archetype defs gain an optional `flag` write on cleared
  (`character_flags` ledger) so quests and dialogue can react to "you broke the
  warcamp at the ford" — the hook that turns POIs into story.

---

## Laws to hold the whole way

1. **One field, many readers** — nothing but `dangerAt`/`DANGER_LAWS` decides a
   level, chest kind, rarity bonus, or density outside authored zones.
2. **Named streams, pure until materialized, ledger stores deviations only.**
3. **POIs are zones** — never a parallel stamping/placement/retire path. If the
   zone machinery can't express it, extend the zone machinery.
4. **Curated pools, procedural picks** — code never draws a tent; it chooses
   among prefabs a person saved. New variety ships as content, not code.
5. **Semantic garnish is placement logic, not art** — sentries on rises watching
   the townward road, cues on approach bearings. Every generated site must answer
   "how does the player read this before they're in it?"
6. **Budgeted passes** — one cell materialization per slow tick, probes bounded,
   no per-tick DB. The 120fps work never learns POIs exist.
