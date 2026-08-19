# THE DAWN COMES OPEN — Dawnmead rebuilt at three and a half times the ground

**Status: IMPLEMENTATION SPEC (user decree 2026-08-18).** Supersedes the ground
plan of `docs/dawnmead-remade-plan.md` (dc0e019) — its FICTION, CAST, QUEST
SLATE and DIALOGUE all stand unchanged and untouched. This document replaces
§3 (the envelope) and §5 (the map) of that plan, and nothing else.

The user's brief, condensed: Dawnmead is the game's front door and it is too
condensed. Three to four times the ground. Every lesson gets a dedicated,
developed place instead of a shared field. Seven stones in the Ring, not five.
The combat schools must read as three lifetimes of practice, not one dummy in
the grass. The trades must read as working yards. The animals must have room.
A waker must be able to walk in, breathe, get their bearings, and be taught one
thing at a time. Rebuild the buildings; do not shuffle props.

---

## 1. THE ENVELOPE

| | today | after |
|---|---|---|
| rect | `{x:-128, y:0, w:128, h:96}` | **`{x:-160, y:-64, w:192, h:224}`** |
| world span | x −128..−1, y 0..95 | **x −160..31, y −64..159** |
| area | 12 288 | **43 008 (×3.5)** |
| local → world | `world = local − (128, 0)` | **`world = local − (160, 64)`** |

Growth: **32 west, 32 east, 64 north, 64 south.** Both origin components are
multiples of 32, so the rect is chunk-aligned on both axes for the first time.

The lane keeps world rows 47-49 → **local rows 111-113**, which sits the spine
dead on the zone's vertical centre. The Ring keeps world (−81.5, 48.5) →
**local (78.5, 112.5)**: seventy-eight tiles of meadow and wood to its west,
one hundred and thirteen of village to its east. That asymmetry IS the plan —
a waker opens their eyes with soft empty distance behind them and a village
unfolding ahead.

### 1.1 What must not move (the world pins)

- **Spawn (−81.5, 48.5)** — respawn law, rescue law, `startZoneId`.
- **The five original standing stones** — world (−82,44) (−86,46) (−78,45)
  (−86,51) (−79,52). **Two are ADDED** (below), never moved.
- **The danger anchor (−64,48)** — `danger.ts`, `factions.ts`, worldgen's three
  legacy radials. It lands on the lane at the green's west mouth.
- **The lane on world rows 47-49**, reaching the east hem as `Tile.Path`.

Everything else is free, including the well (a `worldgen.test` probe only).

### 1.2 THE SEVEN STONES

The five kept stones stand at N, NW, NE, SW, SE of the Ring's centre. The two
added stones close the circle at **W local (73,113) = world (−87,49)** and
**E local (84,113) = world (−76,49)**. Seven stones, one ring, no gap — and
nobody in Dawnmead explains it, ever (the law stands).

### 1.3 World wiring

| file:line | change |
|---|---|
| `geography.ts` `DAWNMEAD_RECT` | → `{x:-160, y:-64, w:192, h:224}` + rewrite the doc block |
| `geography.ts` `first_road` | drop pts[0..3]; new head **(32,48)**, then (36,66) (40,82) (44,96) → the old chain |
| `geography.ts` `old_road` | drop pts[0..4]; new head **(−52,160)**, then (−80,168) (−112,176) (−144,184) → (−172,188) |
| `geography.ts` `hunters_trail` | drop pts[0..2]; new head **(−100,−65)**, then (−104,−70) (−110,−80) → (−118,−104) |
| `danger.ts` | **`safeR` stays 64.** The rect already excludes POIs, finds and strongholds; the one real leak is the ambient wild spawner, fixed at its source (below). Raising `safeR` would soften the First Road ambush from tier 2 to tier 1 — the corridor's whole lesson. |
| `gameServer.ts` `vetWildAnchor` | **add a zone-rect refusal** — refuse any wild anchor inside a registered surface zone rect. Closes the leak for every town, costs the danger field nothing. |
| `npcs.ts` `TOWN_SPAWNS` | all nine entries move clear of the grown hems (§6) |
| `worldgen.ts` | plateau radial 130 → **176** (the grown corners sit at 147; a mesa cresting on a hem would be flattened inside the rect and left standing outside it). The basin radial STAYS 200 — it already clears 147 by 53 tiles. |
| `audio/zones.ts` | Dawnmead row → **`{x:-64, y:48, full:112, fade:184}`** — the rect centre IS the anchor, and 184 is the tightest fade keeping every tile of a 147-half-diagonal rect town-dominant |
| `editor2/dialogs.ts` | the stale rect in the tip copy |
| `pois.test.ts`, `strongholds.test.ts` ×3 | the stale `{x:-96,y:16,w:96,h:64}` literal |

**The rect's centre is (−64, 48) — the danger anchor exactly.** The growth is
deliberately symmetric about it (32/32 west/east on a 192 width puts the centre
at world −64; 64/64 north/south on a 224 height puts it at 48). That keeps the
audio row, the faction charter anchor, and the worldgen radials all honest with
one number, which the previous rect could not do.

---

## 2. THE PLAN — a hub, four spokes, and a road

The village reads as a **hub with four signed ways**, so a waker learns one
quarter at a time and always knows how to get back to the well.

```
 local x  0        40        80       120       160    191
 y0      ╔═ north wood ══════════════════════════════════════╗
 y18     ║  hunters' trail head (x60)      high meadow       ║
 y30     ║      ┌─ THE ORCHARD ─┐  ┌── THE FARMSTEAD ──┐  C  ║
 y56     ║      │  (hedged)     │  │ house barn coop   │  R  ║
 y72     ║      └───────────────┘  │ fields silo bees  │  A  ║
 y76     ║        THE COTTAGE ROW  └─ COMMON PASTURE ──┘  B  ║
 y84     ║   ┌ WREN ┐  ┌ FIVE STONES INN ┐   DROVER YARD  B  ║
 y104    ║   THE WAKING MEADOW    ┌─ THE GREEN ─┐  OTTERY'S  ║
 y111 ───╫───── THE LANE ═══ RING(78,112) ═══════ WORKS ═╪═══→ FIRST ROAD
 y118    ║        muster court    COOKHOUSE   berry banks║   ║
 y142    ║  ┌ THE LONG BUTTS ┐ ┌ THE PELL YARD ┐   OLD    ║  ║
 y168    ║  │ (archery)      │ │ lodge, armoury│  GRANARY  ║  ║
 y186    ║  THE COPSE   ┌ THE SPARK CIRCLE ┐   rat meadow  ║  ║
 y206    ║  scrap crag  └──────────────────┘               ║  ║
 y223    ╚════════════ old road gate (x140) ════════ south hem
```

### District briefs

Each is a commitment; exact tiles are authored in `dawnmead.ts`.

**THE WAKING MEADOW** (x 30..96, y 92..136) — the first thing seen. A
stone-floored ring inside SEVEN standing stones on a low flowered pad; a
verge of wildflowers; two old oaks far west and NOTHING else out to the hem.
The lamp pair marks the one worn way east. No prop within eight tiles of the
stones that is not flower, pebble, or grass.

**THE KEEPER'S WAY** (x 84..108, y 98..120) — the walk from the Ring to the
green: Wren's cottage north of the way with its bee skep, hedge garden, and
the porch her chair has worn; a wayshrine; a bench; the first lamp. This is the
tutorial's quiet room and it is deliberately the only built thing between the
stones and the village.

**THE GREEN** (x 108..138, y 102..122) — the hub. The well on the danger
anchor's row, the town bell, the notice board, two stone benches, a great oak,
banner poles, planters, lamps at the four corners, and **four signed ways**:
north to the homestead, south to the proving ground, east to the works and the
road, west to the Ring. The middle stays EMPTY — a green is the space, not the
props around it.

**THE FIVE STONES** (x 112..130, y 84..100) — the inn on the green's north
side. Common room with hearth and three table clusters, the bar with its
back-shelf, Gilly's room, and a guest wing of four claimable beds. Awning
frontage, bracket sign, hitching rail, brewer's drop on the service side.

**THE COTTAGE ROW** (x 84..108, y 76..96) — three cottages, alike as siblings
and different as siblings: the village is not thirteen people. Kitchen gardens,
woodpiles, washing, a shared well-path. No NPC lives here; the doors work and
the hearths are lit. This is the single cheapest thing that makes a town
believable and Dawnmead has never had it.

**THE FARMSTEAD** (x 96..152, y 24..72) — Brammel's. Farmhouse (door south),
a real BARN, the rail-penned coop with its dovecote, silo, apiary, butter churn
and fruit press, compost, irrigation channel, growing frame, and a tilled field
of FIVE crops with the scarecrow minding them. Hand cart mid-chore.

**THE COMMON PASTURE** (x 100..150, y 76..100) — the big fenced field: cows,
sheep, water trough, hay put up, the gate standing open, long grass at the rail
where the stray eggs end up.

**THE ORCHARD** (x 44..92, y 30..74) — the hedged garden: apple and plum in
planted lines, the living arch onto the orchard walk, harvest crates
mid-picking, a fruit press, bee skeps at the south hedge.

**SORREL'S DROVER YARD** (x 150..165, y 72..98) — down by the water where the
beasts drink. Rail pens (the gap in the run IS the door), the one beast pen,
feed troughs, hay, hitching posts, a tack lean-to, and the drover's shop sign.

**WEIR'S FISHERY** (x 146..165, y 32..66) — a real working waterside: the pier
on driven piles, mooring posts, a beached skiff, net frames, the mending bench
mid-repair, drying and fish racks, a keep pool, catch baskets, withy store, and
his hut with its smoke tripod. Three fishing spots on the reach.

**THE CRAB BANK** (x 168..190, y 30..70) — the far bank spreads into sand
shoals with two warm pools; mudcrabs ×5 sun in the OPEN, readable from the near
bank. Shell midden, reed shelter, tide-worn stones.

**OTTERY'S WORKS** (x 136..165, y 88..110) — the trade you can read from the
street. A timber-frame open shed on posts under board awnings: workbench,
sawhorse, carving bench, lumber rack, log pile, chopping block, felled log,
sawdust tracked out to the lane. Beside it **THE FORGE**, a stone lean-to with
the furnace, anvil, bellows, quench trough, ingot rack, grindstone, tool rack
and the coal store — and a finished-goods rack facing the lane so a waker sees
what a bar of bronze is FOR. Ottery's house at the yard's head.

**THE COOKHOUSE** (x 108..134, y 122..152) — Berrit's. Her walled cot, the
open hall on timber posts with the long table, the bread oven line, the smoke
yard downwind (spit, block, smoker, meat rack), the hedged kitchen garden with
its herb rows and drying rack, the water cask, and the supper court with the
ONE campfire and its bench ring.

**THE BERRY BANKS** (x 152..165, y 118..152) — the foraging lesson, in open
sun on the brook's near bank: berries, fibre, sagewort, moonbell.

**THE MUSTER COURT** (x 84..108, y 118..140) — where the proving way arrives:
a gravel court with the muster banner stands, a notice board, a rack, watchers'
benches, and the three signed ways to the three schools. Every waker's first
sight of the arms quarter is a place that already has a life.

**THE PELL YARD — Halla, blade and shield** (x 86..114, y 142..172) — a dirt
sparring court ringed with rail, THREE pell posts and dummies on the line,
armour stands dressed and bare, weapon racks, the grindstone, a scarred
practice wall, the muster banner, watchers' benches, and **THE ARMING SHED**
(stone, wall-arms hung, armour stands, the duty table). **THE LODGE**
(x 94..108, y 176..190) keeps Halla's bed and the wards' hot bunk.

**THE LONG BUTTS — Rill, the bow** (x 44..84, y 144..170) — a long fenced
shooting lane running WEST to EAST: the stone shooting line, three marks at
increasing range, straw butts backed by fence, an arrow-recovery walk, the
covered shooting shelter under its awning, and **THE FLETCHER'S SHED**
(x 46..60, y 174..186) with the fletcher's bench, stave rack, feather crates,
drying rack and Rill's whittling stump. A stand of yew and willow at the lane's
head — the bow wood, growing where the bowyer can see it.

**THE SPARK CIRCLE — Varn, the spark** (x 56..88, y 186..212) — a ring of
standing pillars and runestones on a stone pad, scorched ground at its heart,
braziers at the quarters, a ward arch on the approach, a crystal cluster and
a rune pillar, the cracked test stones and the dummies that have taken fifty
years of lessons. **VARN'S HUT** (x 42..54, y 190..200) is where the reading
happens: bookshelves half-read and all open, a lectern, an arcane tome.

**THE COPSE — Alder** (x 4..44, y 118..200) — a MANAGED woodlot: planted
stands in loose rows, marked trees, honest stumps, saplings where last year's
cut came out, mushroom logs in the shade, and a real LOG YARD (felled log, log
piles, chopping block, cordwood, a lean-to) beside his hut.

**THE SCRAP CRAG** (x 6..34, y 200..220) — copper and tin in the open at
pick height, on a rocky hem below the copse.

**THE OLD GRANARY** (x 146..164, y 156..182) — the roofless ruin the rats
hold, in open daylight, visible from the old road. The ONE wooden chest inside.
Rats ×7 in the tall grass around it.

**THE BROOK** — a sine meander at local x ≈ 166, touching BOTH hems
(edge-harmony outflow law). The lane crosses it on a proper bridge at
x 163..169; a knee-deep ford at y ≈ 150 links the granary meadow to the east
wold. Willows lean over it clear of every path and node.

**THE FIRST ROAD GATE** (x 170..191, y 104..120) — the send-off: the last two
lamps, the waymarker, the stone bench every waker who ever left sat on for a
minute first, and the paired banner poles at the hem.

**THE EAST WOLD** (x 168..191, y 74..223) — open meadow across the water,
hedgerow, scattered oaks, the ford, and the hem wood.

---

## 3. LAWS THIS BUILD KEEPS

Carried forward verbatim from the remade plan, plus what the palette audit
turned up:

- **Streets first.** Every working door fronts the lane, a way, or the green.
- **≥3-4 open tiles between free-standing structures**; props never wall-to-wall.
- **Occlusion**: nothing tall on the 1-2 rows SOUTH of a door, station, sign,
  forage node, or actor post.
- **Gates authored OPEN** (NPCs cannot work latches).
- **Sealed-pocket law** — the BFS from the Ring reaches every doorway.
- **Sign law** — every board carries words; signs stand in FRONT of walls.
- **Hanging law** — wall-hung details only on `WallStone`/`WallWood`;
  `SillHerbs` only on window walls.
- **Bed runs ≤ 4**; every sleeper's night path ends `lie:true` on a bed foot.
- **Corridor law** — the village and the lane stay predator-free.
- **Nothing is a placeholder** — every prop with a bespoke tile gets it.
- **Diagonal budget** — 45° chamfers spent on the inn and the lodge only.
- **Singletons** — exactly ONE each of Campfire, Workbench, ChestWood, Furnace,
  Anvil, CookPot, BeastPen; exactly TWO each of RockCopper, RockTin.
- **NO fountain and NO founder statue, ever.** The well and the Ring are the
  heart, and nobody founded the village that grew around the stones.

## 4. WHAT THE BUILD ADDS TO DAWNMEAD'S VOCABULARY

Dawnmead has never used: `b.building()`, awnings, `PorchDeck`/`TimberPost`/
`RailWood`, `PillarStone`/`ArchStone`, `bannerStandTile`, `wallBannerDetail`/
`pennantDetail`/`bracketSignDetail`/`wallArmsDetail`, `ArmorStand`,
`FletchersBench`, `MendingBench`/`NetFrame`/`BeachedSkiff`/`MooringPost`/
`KeepPool`/`CatchBasket`/`WithyStore`/`FishTrap`/`ShellMidden`/`ReedShelter`/
`SmokeTripod`, `Silo`/`Dovecote`/`Apiary`/`ButterChurn`/`FruitPress`/
`GrowingFrame`/`IrrigationChannel`, `AppleTree*`/`PlumTree*`, `MushroomLog`,
`LogPile`/`LogPileEndOn`/`FelledLog`/`ChoppingBlock`, `Runestone`/
`CrystalCluster`/`WardArch`/`RunePillar`/`ArcaneTome`, `WayShrine`,
`StreetLantern`, `WoodStool`/`SettleBench`/`BasketStack`/`GlazedJars`/
`BroomAndPail`/`LeanLadder`/`Wheelbarrow`/`CloakStand`/`TiedParcels`,
`ProduceStand`, `MarketStall`, `SpearRack`, `Loom`/`TanningRack`. Every one of
them earns its place below or is not used.

## 5. ROUTINES

The town is re-authored, not translated, so **every one of the sixteen routine
files is re-derived** from the new post-to-target vectors (the post-is-the-
origin law). `routines/worldFit.test.ts` is the gate: lie stops on beds, sit
stops on seats, no stop in pond water, every target in the post's walk
component.

## 6. TOWN_SPAWNS

| npc | today | after |
|---|---|---|
| wolf ×2 | (−24,−12) | **(−96,−76)** |
| wolf ×2 | (−52,−14) | **(−124,−80)** |
| dire_wolf | (−38,−14) | **(−110,−86)** |
| giant_spider ×2 | (−22,108) | **(−26,176)** |
| cave_bat ×2 | (−40,106) | **(−48,172)** |
| bear | (−54,112) | **(−64,180)** |
| troll | (−64,120) | **(−80,188)** |
| stag ×2 | (12,40) | **(52,20)** |
| ram ×2 | (−142,24) | **(−184,16)** |

The wolf dens move NORTH-WEST off the re-headed hunters' trail, which keeps
`the_matriarch`'s "a den in the deep wood northwest of Dawnmead, off the
hunter's trail" literally true.

## 7. DELIVERY

1. Wiring — geography, worldgen radials, danger note, audio, spawns, the
   `vetWildAnchor` refusal, stale rect literals.
2. The ground — `maps/dawnmead.ts` rebuilt whole.
3. Routines — all sixteen re-derived.
4. Test re-pins — content.test, worldgen.test, geography.test, zones.test,
   pois.test, strongholds.test.
5. Suites green: content, server, client, shared.
6. **Live visual audit at close zoom, every district and every interior**
   (map-curation-standard): compact spacing? overlapping props? template feel?
   room intent legible? Fix and re-shoot before calling it done.
