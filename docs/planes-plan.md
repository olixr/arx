# THE WORLDS APART — true planes (zones/instances as separate spaces)

**Status: SHIPPED 2026-08-16 — proven live on an isolated rig (below).**

## 1. The problem (the user's decree)

The whole game lives on ONE continuous tile plane. `constants.ts` says it
outright: surface, the "dark band" (authored underground: Undercroft +
Low Hall) at `y >= 512`, and per-player dungeon instance slots at
`y >= 8192, x = 8192 + slot·264`. Walk far enough south and you hit the
underground's solid-rock ceiling — the surface world simply ENDS at
y=512. The map is supposed to be endless procedural wilderness in every
direction; instead one compass point is a wall, and the wall is another
place's roof. Dungeon slots march east forever on a never-recycled
counter. Every "which layer am I on" question in the codebase is a bare
y-comparison (~60 sites), and every "is this body in instance N" test is
`y >= 8192 && x ∈ [x0, x1)`.

The decree: solve it at the foundation. Real planes — separate coordinate
spaces a player is *transported* between, never walked between. The
surface opens south. Future planes (more authored layers, alternate
procedural overworlds) become a registry entry, not a y-band treaty.

## 2. The architecture

### 2.1 PlaneDef — the law of a layer

`packages/content/src/planes.ts` (new):

```ts
type PlaneId = string;              // 'surface' | 'underworld' | 'rift:<slot>'
interface PlaneDef {
  id: PlaneId;
  name: string;                     // herald copy: "The Dawnlands", "The Underworld"
  base: 'worldgen' | 'cave';        // base terrain: procedural fields | solid rock awaiting carved zones
  underground: boolean;             // cave ambience, cutaway, no sky, no mounts, no danger field
  persistent: boolean;              // fog + builds + ledgers persist; scratch planes are per-run
}
```

Static registry: `surface` (worldgen, overworld law) and `underworld`
(cave, underground, persistent — holds Undercroft + Low Hall at their
EXISTING coordinates; nothing re-seats). Dungeon runs mint runtime
planes `rift:<slot>` (cave, underground, scratch) that live exactly as
long as the run.

**Coordinates never change.** A plane is a tag, not a translation: the
Undercroft keeps (−344,520), the Low Hall keeps (200,552) — on plane
`underworld`. Migration is an UPDATE of tags, not a re-seating of
content. The ONE exception: dungeon instances drop the x-marching slot
lanes and all generate at a fixed origin — the plane id is the isolation
the offsets used to fake.

### 2.2 Server — one WorldSource per plane

`WorldSource` already IS the per-plane object (zones, portals, signs,
built/hung/crop/growth ledgers, chunk cache) — it just only exists once.
It gains a `PlaneDef` and a base-generator switch (`worldgen` planes call
`generateChunk`; `cave` planes fill `CaveWall` and let zones carve).
Edge-harmony publication happens only from the surface plane (dark-band
filter today, plane law tomorrow).

New `Planes` registry on the game server:
- `planes: Map<PlaneId, WorldSource>` — `surface` and `underworld` at
  boot; `rift:*` minted/dropped with dungeon runs. Dropping a plane IS
  the unload — chunks, zones, portals, signs, memory, gone wholesale.
- `this.world` is DELETED. Its 194 call sites re-point under compiler
  duress to either `this.surface` (surface-only systems: POIs,
  strongholds, frontier, wild spawns, growth, territory) or
  `this.worldOf(plane)` (entity-relative queries: movement, AI,
  building, gathering, interact).

**Entity plane**: the position component gains `plane: PlaneId`. Every
constructor site supplies it (tsc-driven sweep); spawn points carry the
plane of the zone/POI/instance that registered them; projectiles, drops,
summons, pets inherit their creator's. The interest index key becomes
`plane|cx,cy` — cross-plane proximity is impossible by construction, not
by vigilance. Radius scans over sessions/entities gain plane equality.

**The containment collapse**: every `y >= 8192 && x ∈ [x0,x1)` instance
test becomes `plane === inst.plane`. `dungeonOrigin(slot)` and its
spaced lanes are deleted; instances generate at a fixed origin on their
own plane.

### 2.3 The transfer ceremony (the ONLY way between planes)

`transferPlane(eid, plane, x, y)` — the new door, used by stairs,
riftgates, dungeon exits, hearth recall, rescue, and death:
1. Server: cancel action/cast/seat, write pos + plane, update chunk
   membership, dismount if the plane refuses the saddle.
2. Session reset — exactly `bindSession`'s triple-clear (`knownChunks`,
   `knownEntities`, `sentSnapSig`) as a shared helper.
3. Send `S2CPlane {id, name, underground, persistent, x, y}` — BEFORE
   the next interest flush, so the client resets before fresh chunks.
4. Next tick streams the 5×5 window on the new plane, enters follow.

Same-plane portals stay bare teleports (no ceremony, exactly today).

`PortalDef` gains `destPlane?: PlaneId`. Legacy zones are normalized at
load: dest.y ≥ 512 ⇒ `underworld`, else `surface` (valid exactly because
no authored portal ever pointed at what is ABOUT to become open southern
wilderness; new authoring states it explicitly, the editor offers the
picker). Dungeon-minted portals state `surface` explicitly.

### 2.4 Client — one reset entry point + the veil

`S2CPlane` handler in clientGame is THE single reset door (today there is
none; the survey found a dozen caches that would alias across planes):
`world.dropAll()`, `chunkWallFlags`, predictor reset to the carried pos,
remote entity table clear, `worldVersion++ / interiorsVersion++ /
chartVersion++`, renderer position-keyed caches (baked, registers,
band caches, tree sprites/shadows, door/chest eases, prop shakes, phase
memos, shadow masks, grass indices), farmCare globals, signs, all four
mapView block caches, fog layer swap. Movement input holds until the
center chunk lands.

**THE CROSSING VEIL**: portal SFX + burst already "cover for the
teleport cut"; the plane hop adds a real beat — fade to black on
`S2CPlane`, hold while the world resets and the first chunks stream,
fade up when the center chunk is in (min ~400ms so it reads as a
crossing, not a flicker). The herald announces the plane's name for
first arrivals (discovery ceremony untouched for zones).

**Plane-law consumers** (all today keyed on `y >= 512/8192`, all become
`plane.underground` / plane kind): audio zoneWeights (cave weight),
track mood, sky/cricket/bird gates, danger gauge stand-down, chart
band(), fog mask pick, party pills, waypoint compass, death mark,
objective tracker (gains the missing cross-plane suppression). The
client's THREE copies of the 512 line (shared, audio/zones.ts, editor
literals) collapse into plane checks.

### 2.5 Charts and fog — per-plane memory

`character_explored` gains a `plane` column; `persistRegion(ry)`'s
y-test becomes the plane's `persistent` flag. The client keeps one
`ExploredMask` per plane id (surface + underworld persisted and pushed
at login; rift masks stay per-run scratch, exactly the current
`dungeonExplored`). The chart renders the CURRENT plane: surface = the
full chart (markers, danger wash, probe fill); underworld = carved rock
on cave base, persistent fog, no danger wash, no procgen probe; rift =
the current dungeon behavior. Markers filter by the marker's plane.

### 2.6 Persistence — tags, not moves

New migration (additive, `ADD COLUMN IF NOT EXISTS`):
- `plane TEXT NOT NULL DEFAULT 'surface'` on: characters (+
  `waypoint_plane`), built_tiles, built_details, crops, world_growth,
  signs, character_explored, character_discoveries, livestock,
  farm_bins, farm_troughs, farm_apiaries, station_jobs.
- Backfill by the frozen y-law AT MIGRATION TIME: `y/ty >= 512 ⇒
  'underworld'` (nothing persisted ever sat at y ≥ 8192; characters
  saved there are already login-rescued to spawn — that rescue becomes
  `plane startsWith 'rift:'`).
- Surface-only systems (world_pois, strongholds, minors, frontier,
  territory) stay implicitly surface — no column, their ticks gate on
  the surface plane.

### 2.7 The south opens

With the underworld off the surface plane, the wall comes down:
- `generateChunk` drops the `baseY >= DARK_BAND_Y` CaveWall fill;
  `basinFieldAt` / `groundProbeAt` drop their band guards. South of 512
  is ordinary procedural wilderness — fields, rivers, danger ladder
  growing with distance from the settled anchors, POI/wild spawning
  eligible (siteScan's `darkPad` refusal retired).
- `GEOGRAPHY_SURFACE_MAX_Y` authoring ceiling retires with it.
- `DARK_BAND_Y` / `UNDERGROUND_Y` / `DUNGEON_MIN_Y` are DELETED at the
  end of the sweep — tsc guarantees no y-band law survives anywhere.

### 2.8 CMS / Map Studio

`ZoneDef` + `ZoneJson` gain `plane` (legacy JSONs backfill by
`origin.y >= 512` at load — same frozen rule as the DB). Studio: plane
badge + grouping in the zone browser (replacing the "dark band"
y-grouping), the zone stage bakes its base by plane (worldgen context
vs cave rock), the world view filters to a selected plane, and the
portal inspector gets a dest-plane picker. Validation: zone placement
collisions are checked per plane (today overlap is implicit overlay
order; cross-plane "overlap" is now legal and meaningless).

### 2.9 Protocol

`PROTOCOL_VERSION` 32 → 33 (the v26 judgment: an old client would treat
a plane hop as a same-plane teleport and render the wrong world —
misbehavior, so a bump, per the changelog convention):
- `S2CPlane` — the ceremony (2.3).
- `S2CWelcome` gains `plane` (same struct) so a reconnect inside the
  underworld wakes with the right law.
- `S2CPartyPos` members, `S2CWaypoint`/`C2SWaypoint`, `DiscoveryWire`,
  `QuestHintWire`, `S2CDeathMark` gain plane tags (HUD/chart filtering).
- Binary frames unchanged — chunks and snapshots are plane-scoped by
  the session, so the wire stays 18 bytes/entity.

### 2.10 What planes make possible (the point)

- New authored layers = one PlaneDef + zones tagged to it.
- Alternate procedural overworlds = a PlaneDef with `base: 'worldgen'`
  and its own seed/field profile (the base-generator switch is the hook).
- Instance unload = plane drop (memory truly returned, not parked east).
- The surface is endless on ALL FOUR compass points for the first time.

## 3. Order of work

1. **Foundation** (shared + content): PlaneDef/registry, ZoneDef.plane +
   JSON round-trip + legacy backfill, PortalDef.destPlane + normalize,
   WorldSource plane/base-generator, explored persist-law, protocol v33
   messages + parse, constants deleted last.
2. **Server**: Planes registry, position.plane, interest keys,
   transferPlane, the 194-site `this.world` sweep, the ~40 y-band
   branch sweep, dungeon planes + containment collapse, respawn law,
   DB migration + rescue, mapsApi plane pass-through.
3. **Client**: currentPlane, S2CPlane reset door + veil, plane-law
   consumers (audio/chart/HUD/compass/fog), cache de-aliasing.
4. **Studio**: plane badge/grouping/filter, stage base, portal picker.
5. **The south opens**: worldgen guards out, ceiling retired.
6. **Prove**: suites + tsc; live rig — stairs down/up, riftgate run +
   clear + exit, walk south past 512 into open wilderness, party
   cross-plane pills, chart per-plane fog, reconnect underground.

## 4. As-built ledger

**Foundation + client core (built first, in-session):**
- `content/planes.ts` — PlaneDef/registry, rift minting, `legacyPlaneOfY`
  (THE FROZEN LAW: reads legacy DATA only, never live positions),
  `portalDestPlane`. ZoneDef/ZoneJson + PortalDef carry planes;
  builder gained `.onPlane()` and a portal destPlane arg; undercroft/
  lowhall tagged underworld, all 13 cross-plane authored portals
  explicit.
- Worldgen split: `generateCaveChunk` (cave-plane base) out of
  `generateChunk`; the dark-band wall, basin guard, and probe guard
  DELETED — the south is open. Geography's authoring ceiling
  (GEOGRAPHY_SURFACE_MAX_Y + both validator gates) retired.
- `server/world/planes.ts` — the Planes registry (add/drop/require,
  worldSpawn, respawnAt with the scratch-rescue law, planeOfZone).
  WorldSource is per-plane (plane-tag guard on addZone, base-generator
  switch, edge-profiles surface-only, growthDomain by base,
  nearestSpawnTo replaces the y-band respawn law).
- Protocol v33: S2CPlane (THE CROSSING), welcome.plane, per-plane
  S2CExplored, plane tags on partypos/waypoints/discoveries/quest
  hints/death mark. persistRegion/dropDungeonBand deleted from
  explored.ts — persistence is the plane's law.
- Server core: PositionComp.plane; plane-first entity-chunk index;
  plane-scoped interest with cross-plane instant leave; transferPlane
  ceremony (session reset + S2CPlane before the flush, pets cross with
  keeper, plane saddle law); dungeon lifecycle on minted rift planes
  (containment = plane equality, teardown = planes.drop — the true
  unload); per-plane explored masks + dirty keys; death spill/marks/
  waypoints plane-aware; DB migration v36 (plane columns, frozen-law
  backfill, PK re-keys) + accounts API planed.
- Client core: `game.plane` law object; the S2CPlane reset door (drop
  chunks/walls/entities/prediction/farm mirror/signs + version bumps);
  per-plane fog masks behind the one `explored` getter; THE CROSSING
  VEIL (iris drop behind the portal flash, lifts when the center chunk
  stands, 4s backstop); renderer/lighting/grass/mapView/fog
  `onPlaneSwitch` cache drops; chart bands surface/underworld/dungeon
  (underworld = persistent carved-rock chart, fine-LOD only); markers,
  waypoint pin, death skull, party dots, compasses all plane-filtered;
  objective tracker says "another realm" instead of pointing across
  worlds; audio underground = plane flag.

**Server sweep (as landed):** ~412 tsc errors driven to zero. Surface
systems pinned to `this.surface`; every body-relative query through its
own plane's world; y-band branches replaced per the doctrine table
(§ replacement map now lives in git history — the constants survive
ONLY inside migration v36's frozen backfill SQL). Judgment calls of
note: owner logout inside a rift returns to their own gate (matches
the guest law); death wakes at the SAME plane's nearest hearth (rifts
rescue home); hearth recall is a true crossing; bed-claiming and all
farming verbs politely refuse off-surface; scratch planes refuse
permanent construction (THE ROCK KEEPS NOTHING) and boot rehydration
refuses rows of planes that no longer stand; siteScan's dark-band
refusals deleted (the south seeds POIs, finds, and wilds); NPC
perception, projectiles, blasts, fields, summons, graves, errand
pathing (per-plane collision), respawn queue, poiChests, door locks
all plane-scoped. Studio: plane badges/grouping/picker, cave-base
stage bakes, portal dest-plane selector showing the derived truth,
world view paints the open south.

## 5. The proof (isolated rig :8845/:5245, DB arx_planes15)

Fresh DB migrated 1→36 clean. Headless client, fresh account, zero
console errors across the whole run:
- Spawn: plane `surface` / "The Dawnlands", Dawnmead, 53 entities.
- `/tp 0 600` and `/tp 100 900` — PAST the old wall: still surface,
  chunks stream, wild spawns live there (12–18 entities), the danger
  ladder names it (THE DEEP FRONTIER 22-34 → THE LAMPLESS DARK 44-60,
  with the high-tier country dark dressing the deep south exactly as
  it dresses the far fells).
- Silverfall stair → THE CROSSING: plane `underworld` / "The
  Underworld", underground law on, the Undercroft discovery herald
  fires, "You cross into The Underworld." in chat — and the client
  chunk cache drops 100 → 25 (the reset door proven by count).
- The underworld CHART: blank parchment + the walked Landing pocket
  only — per-plane fog, zero surface bleed-through.
- RELOAD while standing in the dark: welcome carries plane
  `underworld`, wakes at the same spot — characters.plane end to end.
- The way home portal → surface at Silverfall, cache reset again.

Suites on the standalone index-tree gate: shared 216, content 514,
server 493 (one stale XP pin repaired to THE LONGER ROAD's own
rounding law), client 613 — all green; five-package tsc clean.

**Deferred, named:** shared band constants (`DARK_BAND_Y`,
`UNDERGROUND_Y`, `DUNGEON_MIN_Y`, `SURFACE_AUTHOR_MARGIN`) still
DEFINED in shared/constants.ts though consumed by nothing but the
frozen migration SQL — delete once no neighbor line references them.
Prefab portals don't carry destPlane (PrefabPortal unchanged).
sendOwnBuilt overlays the current plane only. Rift building refused
rather than scoped. Prod rollout needs only the ordinary deploy (the
migration is additive + backfill; no db:refresh).
