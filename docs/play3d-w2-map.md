W2 data contract — scouted 2026-09-04 from epic/play3d; anchors as of 0b0f12f8

# W2 MAP — Structures in the 2D game: world data, painters, and what the 3D client must add

All paths are in `/Users/aeriek/code/devcraft-play3d/`. Line anchors are from the `epic/play3d` worktree as read today.

---

## 1. WORLD DATA — how standing structures exist

### 1.1 Storage: three parallel layers per chunk

`packages/shared/src/world/chunk.ts:10-40` — `ChunkData`:
- `ground: Uint16Array` (Tile ids), `detail: Uint16Array` (Detail ids), `elev: Int8Array` (signed level −2..+3), plus render-only `rev`, `fringeRev`, `fringeMask`.
- **Elevation is render-only** (`chunk.ts:12-22`): "It never affects collision — worldgen guarantees every level change is fenced by solid `Cliff` tiles except where a walkable `Ramp` crosses, and the ring always sits on the HIGH side of the boundary."

**There is no object/prop layer.** Every structure, prop and station is a ground Tile id; every hanging/decor is a Detail id. That is the whole world model.

### 1.2 Accessors (the exact signatures a mesh builder can call)

`ChunkStore` in `packages/shared/src/world/chunk.ts:129-247`:
```ts
groundAt(tx, ty): number | undefined     // :190  undefined = unloaded (treated solid)
elevAt(tx, ty): number                   // :199  unloaded -> 0
detailAt(tx, ty): number                 // :205  unloaded -> 0
isSolid(tx, ty): boolean                 // :226
tileAt(tx, ty): number | undefined       // :234  CollisionSource alias of groundAt
get(cx, cy): ChunkData | undefined       // :172
has(cx, cy): boolean                     // :176
```
The client holds one: `packages/client/src/game/clientGame.ts:362` — `readonly world = new ChunkStore()`. So **`game.world.groundAt / elevAt / detailAt` is the entire read surface** the 2D structure pipeline uses. There is no `tileAt`/`isWallAt`/`runAt` on the world — run/wall predicates are **renderer** methods (§1.5).

### 1.3 Tile vocabulary

`packages/shared/src/world/tilesEnum.ts` (ids ride the wire; never renumber). Structure-relevant ids:

| family | tiles | line |
|---|---|---|
| building walls | `WallStone=10`, `WallWood=11`, `CaveWall=30`, `CrackedCaveWall=131`, `WallStoneWindow=59`, `WallWoodWindow=60` | :31,:87 |
| doorways (tile IS the state) | `DoorwayStone=61`, `DoorwayWood=62`, `*Wide=66/67`, `*Shut=76..79` | :91-136 |
| 45° walls | `WallStoneDiag{NE,NW,SE,SW}=68..71`, `WallWoodDiag*=72..75` | :118-125 |
| open structure | `ArchStone=63`, `PillarStone=64`, `RailWood=65`, `TimberPost` (porch post) | :95-99, :381 |
| garrison | `WallGarrison=139`, `WallGarrisonDiag*=140..143`, `GateGarrison=144`, `GateGarrisonShut=145` | :313-335 |
| palisade | `Palisade=292`, `PalisadeDiag{NE,NW}=293/294`, `PalisadeGate(Shut)=295/296` | :508-516 |
| fence | `Fence=15`, `FenceDiag{NE,NW}=136/137`, `FenceGate(Shut)=134/135` | :36, :270-290 |
| hedge | `Hedge=342`, `HedgeDiag{NE,NW}=343/344`, `HedgeGate(Shut)=345/346` | :633-641 |
| iron fence | `IronFence=496`, `IronFenceDiag{NE,NW}=497/498`, `IronGate(Shut)=499/500` | :996-1009 |
| decks over water | `Bridge=16`, `Dock=133`, `PorchDeck=155` (ashore) | :37, :270, :378 |
| landform | `Cliff=34`, `Ramp=35` | :56-58 |
| awnings (the only "roof") | `AwningShed=160`, `AwningMarket=176`, `AwningBoard=192`, `AwningBowed=208` — each is a **dye band of 16** | :392-398 |

**There are no roof tiles.** Buildings are open-topped in the 2D game: a wall run crowns at `WALL_H` and the interior floor is visible from above. Awnings are the only overhang, and only on wall/doorway hosts (`AWNING_HOST_TILES`, `tiles.ts:226-240`).

`Detail` ids for wall-hung art are **banded by 16** (`DETAIL_BAND`, `tiles.ts:14`): `WallBanner=16`, `WallArms=128`, `SillHerbs=96`, etc.; `wallHungInfo(d)` (`tiles.ts:70`) reads any of them back to `{kind, dye/motif/mix}`.

### 1.4 The run grammar (shared, `packages/shared/src/world/tiles.ts`)

- `WALL_RUN_TILES: readonly Tile[]` — `tiles.ts:304-329`. Solid walls + windowed walls + **all doorway postures** + all 8 diag walls merge into ONE run for the auto-tiler.
- `INTERIOR_BOUNDARY_TILES = [...WALL_RUN_TILES]` — `tiles.ts:420`. Arches and rails deliberately do NOT bound a room.
- `LIGHT_BLOCKING_TILES` — `tiles.ts:427-474` (windows block, open doorways don't).
- **THE SEPARATE-MASONRY LAW**: garrison / palisade / hedge / iron-fence / fence are five *independent* run families that merge only with their own kind and never bound an interior. Sets: `GARRISON_TILES` `:405`, `FENCE_TILES` `:613`, `PALISADE_TILES` `:648`, `HEDGE_TILES` `:676`, `IRON_FENCE_TILES` `:692`.
- Diagonals: `diagWallInfo(id) -> {material:'stone'|'wood'|'garrison', mass:'NE'|'NW'|'SE'|'SW'} | null` `:354`; `diagWallTile(material, mass)` `:366`; `orientDiagWall(material,n,e,s,w)` `:383`. **The suffix names the SOLID triangle** — `DiagNE` = mass across the N and E edges, cutting a SW corner; the open triangle faces exterior.
- Barrier diagonals use the corner law instead: `orientDiagFence/Palisade/IronFence/Hedge(ne,nw,se,sw)` `:628,:657,:701,:713` — "/" = DiagNE.
- Doors: `doorInfo(id) -> {material: 'stone'|'wood'|'fence'|'garrison'|'palisade'|'hedge'|'iron', wide: boolean, open: boolean} | null` `:533`; `shutDoorTile` `:551` / `openDoorTile` `:558`. **The tile is the state** — no separate door prop record. `wide` doorways merge E-W into one opening; plain ones never merge.
- Awnings: `awningInfo(t) -> {shape, shapeIndex, dye} | null` `:251`; `awningTile(shape,dye)` `:261`.

### 1.5 Renderer-side run predicates (the ones the painters actually call)

`packages/client/src/render/renderer.ts`:
- `wallish(game, tx, ty): boolean` — **:8718**. `WALL_TILES.has(t)` (= `WALL_RUN_TILES`, `paintVocab.ts:69`) minus side doorways: a doorway in a N-S run *ends* the run so the jamb shows a face. This is the sole 4-neighbour continuity test wall painters use.
- `isSideDoorway(game,tx,ty)` — **:~8695-8708** (vertical run continuity without horizontal).
- `hedgish(game,tx,ty)` — **:8733**.
- `garrisonish`, `fenceish` (`barrierArt.ts:64`), `palisadeish` (`:3050`), `ironish` (`:3062`), `hedgeish` (`:3073`) — all `(rend: PaintHost, game, x, y) => boolean`.
- `porchAt(game,tx,ty)` — **:3121** (PorchDeck, or a rail/post/prop standing on one).
- `fgGroundAt(tx,ty)` / `fgElevAt(tx,ty)` — frame-grid snapshot readers, fall back to the ChunkStore.

### 1.6 Interiors — a building is derived, never authored

`packages/client/src/render/interiors.ts:1-23` header states the law. `InteriorRegion` (`:27-45`):
```ts
{ id, tiles: Set<packed>, wallTiles: Set<packed>, x0,y0,x1,y1,
  doorTiles: {tx,ty}[], wallMaterial: Tile, hasHearth: boolean,
  elevLevel: number, seed: number }
```
- Flood-filled from the live grid; a region is any area fully enclosed by `INTERIOR_BOUNDARY_TILES`. `MAX_REGION = 400` tiles (`:47`) — beyond that it's a courtyard.
- **THE BREACH LAW** (`:104-118`): a ONE-tile hole flanked by boundary tiles on one axis seals like a phantom doorway. `isPassageAt(game,tx,ty)` `:124`.
- **THE BUILDING LAW** (`:60-64`): union-find over region ids joined by *shared doorways/breaches*; `sameBuilding(a,b)` `:97`. Party walls deliberately do NOT join.
- Query: `regionAt(game,tx,ty): InteriorRegion | null` `:102`. Cache invalidated by `beginFrame(game.interiorsVersion)` `:68`.
- `packTile(tx,ty) = (tx+0x8000)*65536 + (ty+0x8000)` `:51`.
- So **"is this tile inside" = `interiors.regionAt(...) !== null`**, and "which building" = the union-find root.

### 1.7 Elevation, cliffs, ramps

- `ELEV_H = 1.35` tiles of screen rise per level — `packages/client/src/render/elevPick.ts:8`. Header (`:1-7`): "Deliberately shorter than a story wall: a cliff STEP is a landform increment, masonry is a built story."
- Cliff faces are **not stored** — they are derived by marching-squares over the elev field. `cliffArt.buildCliffMemo` (`cliffArt.ts:184`) scans visible levels, and `FACE_SEGS` (`cliffArt.ts:36-`) is the dual-cell contour table with outward normals. Every seam between L−1 and L is owned by the ≥L side, sign-agnostic (a pit's rim = a plateau's edge).
- The elevated-ground bake's membership predicate is `elev(tx,ty) >= level` with **Ramp counting as mass** — `terrain.ts:3838-3843`.
- `Tile.Cliff` is the ground tile painted on the rim strip; `cliffFaceItem` steps north past it to sample what tops the cliff (turf vs bare rock) — `cliffArt.ts:496-504`.

### 1.8 Decks over water (`packages/client/src/render/terrain.ts`)

- `DOCK_LIFT = 0.22` tiles of **screen** height — `terrain.ts:5360`. Bake-space offsets divide by `FLAT` (`terrain.ts:5335`, `FLAT = 0.6` = the ground squash).
- `isDeckGround(t)` `:5363` = `Bridge || Dock`.
- **THE STRUCTURE LAW** (`:5378-5394`): the lift is decided for the WHOLE CONNECTED structure by flood, not per tile — if ANY member has water within Chebyshev 2, EVERY member lifts. `deckStructureLifted` `:5399`, memoized with a 5s flush.
- `isDockTile(ground,tx,ty)` `:5435`, `isBridgeTile` `:5440`, `isDeckTile` `:5445` — all take a `GroundSampler`, not a Renderer.
- 45° notch fills: `deckFillAt(ground,tx,ty): DeckFill|null` `:5477` with `legs: 'NE'|'NW'|'SE'|'SW'`, `family: 'bridge'|'dock'`, plus `fillContains` `:5555`, `deckCoverRects` `:5583`, `fillCoversEdge` `:5625`.
- Walk orientation: `deckWalkIsVertical` `:5648`, `deckArmVertical` `:5715`. Bank ramps: `bridgeApronAt(...)` `:5781`, `BridgeApron = 'none'|'W'|'E'|'N'|'S'` `:5736`.
- Porch ashore: `porchCarries(t)` `:1592`, `isPorchSurface(ground,tx,ty)` `:1602`.

---

## 2. THE 2D WALL PAINTER PIPELINE

### 2.1 Height constants

| constant | value | where |
|---|---|---|
| `WALL_H` | **2.05 tiles** | `renderer.ts:578` — "the rig crowns at ~1.15 tiles, so a story wall at 2.05 reads ~1.8× the player" |
| `WALL_STUB` | **0.62** | `paintVocab.ts:167` — the knee height a revealed wall sinks to |
| `GARRISON_H` | **3.4** | `paintVocab.ts:178` |
| `MERLON_H` | **0.5** | `paintVocab.ts:180` |
| `HED_H` | **0.95** | `barrierArt.ts:2632` (local const inside `hedgeItem`) |
| fence post height | `s * 0.92` (`drawFencePost`) | `barrierArt.ts:353` — the scaffold's first cut mislabeled the PALISADE GATE post (1.72) as the fence post |
| palisade gate post | `s * 1.72` (`POST_H`, inside `palisadeGateItem`) | `barrierArt.ts:905` |
| iron run / corner pier | `s * 1.52` (`drawGravePier`, 'urn') | `barrierArt.ts:1734` |
| iron gate pier | `s * 1.66` (`PIER_H`, inside `ironGateItem`, 'orb') | `barrierArt.ts:1783` |
| `ELEV_H` | **1.35** | `elevPick.ts:8` |
| `DOCK_LIFT` | **0.22** | `terrain.ts:5360` |
| window head / sill | head 1.62 tiles, band 0.7 tall (sill ≈ 0.92) | `renderer.ts:11148-11150` (`wy = -fs*1.62`, `wh2 = fs*0.7`) |
| doorway opening | **1.56 tiles clear**, fixed; `hh = hs - s*1.56` at `:11813` is the HEADER's height (it grows with the wall) | `renderer.ts:11813` |
| doorway jamb width | `s * 0.15` | `renderer.ts:11787` |
| crown chamfer radius | `s * 0.26` | `renderer.ts:10540` |

### 2.2 Dispatch — `collectRaisedTiles` and the static register

`renderer.ts:8752` `collectRaisedTiles(game, items)`. Per-tile route decisions are compiled once per (chunk data identity, `rev`) into the **static register** and replayed in scan order.

`packages/client/src/render/staticRegister.ts:23-50` — `RaisedKind`:
```
RampRun=0 RampSingle=1 GarrisonSideGate=2 GarrisonGate=3 GarrisonWall=4
SideDoorway=5 Doorway=6 Arch=7 Portal=8 Pillar=9 Rail=10
BridgeRails=11 DeckFillRail=12 DiagWall=13 Wall=14 Generic=15
```
`RaisedMember` (`:52-68`): `{ kind, tile, tx, ty, len, endX, treeLike }` — `len` is the merged run length (vertical for `GarrisonSideGate`/`SideDoorway`, horizontal for the rest). `classifyRaised(...)` `:110` is **pure** and takes an injected `RegisterHost` (`:73-83`: `groundAt`, `elevAt`, `isTree`, `isGarrison`, `hasDoorInfo`, `isDoor`, `doorIsWide`, `isDiagWall`, …). **This classifier is the one piece of the 2D structure pipeline that is already portable to 3D as-is.**

Dispatch switch: `renderer.ts:9180-9330`. Each case computes a reveal height then mints a `DrawItem`.

### 2.3 The painters and their signatures

| painter | signature | portable? |
|---|---|---|
| `wallItem` | `renderer.ts:10496` `(tile, tx, ty, game, whT, hearth=false, region: InteriorRegion|null) => DrawItem` | **No** — private Renderer method; uses `this.ctx`, `this.camera`, `this.outlineOn`, `this.bakeBleed*`, `this.interiors` |
| `diagWallItem` | `renderer.ts:11210` `(tile, tx, ty, game, whT, region) => DrawItem` | No |
| `doorwayItem` | `renderer.ts:11741` `(tile, tx, ty, game, whT, runLen=1, region) => DrawItem` | No |
| `sideDoorwayItems` | `renderer.ts:12001` `(tile, tx, ty, game, runLen, items) => void` | No |
| `archItem` | `renderer.ts:12217` `(tx, ty, game) => DrawItem` | No |
| `pillarItem`, `railItem`, `awningItem` | `renderer.ts:~18889` for awning | No |
| `wallHeightAt` | `renderer.ts:~10405` `(game, tx, ty) => number` (WALL_H → WALL_STUB) | No (reads `this.cutCtx`, `this.ownPX/PY`) |
| `garrisonHeightAt` | `renderer.ts:11561` `(game, tx, ty) => number` | No |
| **garrisonArt** | all `(rend: PaintHost, …)`: `paintGarrisonMasonry` `:45`, `merlonBox` `:155`, `garrisonWallItem(rend,tile,tx,ty,game,whT)` `:188`, `garrisonDiagItem` `:380`, `garrisonGateItem(…,whT,runLen)` `:568`, `garrisonSideGateItems` `:972` | **PaintHost-bound** |
| **barrierArt** | `fenceItem/fenceGateItem/palisadeItem/palisadeGateItem/ironFenceItem/ironGateItem/hedgeItem/hedgeGateItem(rend, tile, tx, ty, game) => DrawItem` (`:134,:372,:709,:892,:1467,:1770,:2570,:2845`) plus low-level `drawFencePost(rend,x,baseY,w,hTot)` `:83`, `giantLog` `:537`, `ironBar` `:1169`, `hedgeMassPaint(rend, px,py,tx,ty,parts,H,wind,…)` `:2063` | **PaintHost-bound**; the low-level helpers only need `rend.ctx` + `rend.camera.scale` in practice |
| **cliffArt** | `collectCliffFaces(rend,game,items)` `:118`, `buildCliffMemo` `:184`, `cliffFaceItem(rend,game,ax,ay,bx,by,nx,level,ci,cj)` `:466`, `cliffRunItem` `:880`, `drawCliffRun` `:947`, `bakeCliffRun` `:1080`, `cliffSideItem` `:1182`, `emitCliffSideRun` `:360` | **PaintHost-bound** (and memo state lives on the Renderer: `rend.cliffMemo`, `rend.cliffSprites`) |
| **wallHungArt** | `wallHangings(rend, game, tx, ty, px0, s, whT, garrison)` `:25` and 14 `*OnFace(rend, tx, ty, px0, s, …)` painters `:219..:2041` | PaintHost-bound, but the `*OnFace` family is **face-local**: `x` in screen px, `y` rising negative from 0 at the wall's south base. These are the closest thing to ready-made texture painters. |
| **terrain deck painters** | `drawDocks(ctx, ground, baseX, baseY, px, include?)` `:1382`; `drawBridges` `:~1975`; `drawPorchDecks(ctx, ground, baseX, baseY, px, skinAt?, include?)` `:1225`; `paintDeckSideFascia(ctx, gx, gy, px, liftB, family, west, hasS, tone?)` `:1749`; `paintDeckPile(ctx, cx, top, px, pw, seed, body, lit)` `:1806`; `paintDeckWallSkirt(ctx, gx, dy0, px)` `:1779` | **YES — fully portable.** Plain `CanvasRenderingContext2D` + sampler closures. No Renderer, no DrawItem. `drawDocks`/`drawBridges`/`drawPorchDecks` are module-private but `bakeChunk`/`bakeElevated` expose them. |
| `bakeChunk(ground, detail, elev, cx, cy, px, woodSkin?) => HTMLCanvasElement` | `terrain.ts:1175` | **YES — portable**, already used by `play3d/ground.ts` |
| `startElevatedBake(ground, detail, elev, cx, cy, px, level, takeCanvas?) => ElevatedBakeJob|null` / `bakeElevated(...) => {canvas, rows, rowOrigin}` | `terrain.ts:3825` / `:4118` | **YES — portable**, already used by `ground.ts`. Note `rowOrigin`: sample row r at `sy = gut + (r - rowOrigin)*px`. |

**`structureFace.ts`** (`packages/client/src/render/structureFace.ts`) is **not** a face-art painter — it is the pure projection/UV primitive:
- `FaceCamera` `:23`, `FaceGeom` `:32`
- `projectFace(cam, a, b, liftTop, liftBot, …): FaceGeom` `:49` — world corners → rounded screen quad
- `emit(...)` `:83` — projectFace + a paint callback
- `faceUV(baseWx, baseWy, baseEx, baseEy, topWx, topWy, topEx, topEy)` `:126` — returns a mapper `(u, v, out?) => {x,y}`; `u` runs W→E along the wall, `v` 0=ground base → 1=crown. This is the *contract* for "where on the face does a feature go", and in 3D it becomes literal UV. Pure, no Renderer.

### 2.4 What `wallItem` actually paints (the anatomy to reproduce)

From `renderer.ts:10496-11120`, in draw order:
1. **Neighbour flags** `n/e/sw/w` via `wallish` (`:10509-10512`) + `nDoor` (a side doorway north keeps the crown corners square, `:10515-10517`).
2. **Material resolve**: windowed walls collapse to their base material for colours (`:10521-10523`). `window = mat !== tile && whT > 1.75` — a sinking wall **sheds its glass first** (`:10527`).
3. **Tones** (`:10535-10537`): wood → `skin.top` / `skin.log`; stone → `#8c8798` top / `#5b5566` face; cave → `#3a3444` / `#221d2c`.
4. **Shared-edge law** (`:10547-10570`): joined sides snap to the device pixel (`camera.snapPx`), exposed ends bleed ±0.25 px under the outline. `bakeBleedW/E` is the band-bake underlap.
5. **Timber course geometry** (`:10574-10586`): plinth `s*0.22`, sill `s*0.11` (only if `whT>=1`), plate `s*0.13`, then `nLogs = round(span / (s*0.42))`, `chinkG = min(s*0.055, span*0.05)`, `logH = (span - chinkG*(n-1))/n`. **Absolute pitch — taller walls stack MORE logs.**
6. **SOUTH FACE** (only when `!sw`) — the vertical plane you walk behind, drawn as a `Path2D` with the window carved as an `evenodd` hole (**TRUE GLASS: the window is a hole, not a painted pane**, `:10608-10617`). Then everything inside `translate(0, yBase)` in face-local coords, clipped to face-minus-hole.
   - `faceMap = faceUV(fpx, 0, fpx+fs, 0, fpx, -hs, fpx+fs, -hs)` `:10633`
   - **THE WIDE LIGHT** (`:10643-10648`): consecutive window tiles merge into one casement with a mullion at each seam; singles ride u∈[0.28,0.72].
   - Wood: plinth → chinked log courses → knots/checks by `hashCoords`. Stone: coursed masonry.
   - `wallHungArt.wallHangings(...)` and `sillHerbsOnSill(...)` `:11016` ride this face plane.
7. **REAR RISER** (`:11025-11039`): when the wall north of us is sunk lower, paint our interior back face down to its stub so the step reads solid.
8. **CROWN** (`:11042-11095`): the top slab, north edge at row `ty` lifted by `hs`, south edge at row `ty+1` lifted by `hs`. Shared world corners mean no gap is representable. North-only chamfer (south corners stay square). Wood gets `woodCrownPlate`. A lit south lip band (`shade(top,16)`, `s*0.08` tall) grounds the height read.
9. **OUTLINE** (`:11098-11116`): `addCrownPerimeter(path, x0,x1, cTop, leftBot, rightBot, rTL,rTR, n,e,w)` (`:2606`) + the face foot line, stroked with `beginStructOutline()`.

**Crown vs face**: the *crown* is the horizontal top slab spanning the tile's full N-S footprint at the lifted height (it is what makes a run read as one mass, and it is baked into pooled band canvases). The *face* is the single south vertical plane, painted only on the run's exposed south edge (`!sw`). Interior rows of a thick mass draw crown only, no face. **In 3D these become: crown = the top quad, face = the +Z (south) side quad — and a 3D mesh must additionally invent the N/E/W side quads the 2D never draws.**

### 2.5 Entanglement verdict

`packages/client/src/render/paintHost.ts:9-86` — `PaintHost = Pick<Renderer, …>` with **~70 members**, including `ctx`, `camera`, `w`, `h`, `dpr`, `game`, `outlineOn`, `occlusionOn`, `cutCtx`-derived height probes (`wallish`, `garrisonHeightAt`), bake admission (`acquireSpriteCanvas`, `admitSpriteBake`, `spriteBakeMsLeft`), the stage backend (`stageWorld`, `stageAtlasTex`, `stagePushPaintRaw`), particles, glow queue, ghost/build-site overlays, and per-frame clocks (`frameDt`, `frameNo`, `breezeAt`).

Practical grading for W2:
- **Green (call directly):** `terrain.ts` bakes and deck painters; `structureFace.ts`; `staticRegister.classifyRaised`; `collectVolume`; `interiors.InteriorMap`; `woodSkins.dealWoodSkin`; `paintVocab` constants/tones.
- **Amber (call under a stub PaintHost):** the `*OnFace` painters in `wallHungArt.ts` and the low-level primitives in `barrierArt.ts`/`garrisonArt.ts` (`drawFencePost`, `ironBar`, `giantLog`, `merlonBox`, `paintGarrisonMasonry`, `hedgeMassPaint`). These touch `rend.ctx`, `rend.camera.scale`, `rend.outlineOn`, `hashCoords` — a minimal fake host with `{ctx, camera:{scale,yScale,snapPx,worldToScreen}, outlineOn, game, frameDt, breezeAt}` covers most of them. **Verify per painter; several also reach `rend.queueGlow`/`rend.particles`.**
- **Red (do not call — re-emit):** every `*Item` factory (`wallItem`, `diagWallItem`, `doorwayItem`, `archItem`, `fenceItem`, `hedgeItem`, `garrisonWallItem`, `cliffFaceItem`, …). They return `DrawItem` with `sortY`/`nearRow`/`drawShadow`/`elevated`/`strat`/`pb`/`stageRebuild` — pure 2.5D y-sort machinery with no 3D meaning. This matches the plan doc's own warning (`docs/perspective-review-and-3d-client-plan.md:~505`: "~200k lines of emission and FX code is authored against the 2.5D frame and will be re-emitted, not imported").

---

## 3. TONES / STYLE / SCALE

- **Wall tones** are inline in `wallItem` (`renderer.ts:10535-10537`) for stone/cave, and come from the wood skin for timber.
- **`woodSkins.ts`**: `WoodSkin` `:15-36` = `{log, log2, chink, top, plate, trim, floorTones[], boardLen, rowsPerTile, knotK, checkK}`. `WOOD_SKINS` `:38`, `dealWoodSkin(region: {x0,y0} | null): WoodSkin` `:77`. **One skin per BUILDING, dealt from its interior-region anchor** — so wall-to-floor agrees within a house and neighbours differ. Renderer wrapper: `woodSkinFor(region)` `renderer.ts:~8745`.
- **`paintVocab.ts`** is the shared palette: `STRUCT_OUTLINE = '#241a2e'` `:13`, `WALL_TILES` `:69`, `PANEL_DOOR_TILES` `:145`, `WALL_STUB` `:167`, `GARRISON_H` `:178`, `MERLON_H` `:180`, `GAR_LEAF` `:184`, `stone01(a,b,c)` `:186` (deterministic masonry noise), fence/graveyard/palisade/herb/trade tones `:89-134`, `AWNING_CLOTHS` `:36` (from `DYE_SWATCHES`).
- **Garrison palette** (module-local, `garrisonArt.ts:18-33`): `GAR_FACE '#544e61'`, `GAR_IRON '#2b2735'`, `GAR_MERLON_TOP '#847e91'`, `GAR_PLINTH '#3d3849'`, `GAR_TOP '#655f72'`, `GAR_TRIM '#7b7590'`. "Rampart ashlar — cooler and deeper than house stone on purpose."
- **Barrier palettes** (`barrierArt.ts:22-37`): iron `#26232f/#3c3849/#635d76/#5e4030`; hedge `HEDGE_DARK #24512c`, `HEDGE_LEAF #376e37`, `HEDGE_LIT #4f8f44`, blooms `#b04a72/#ef9ec0`.
- **Plinth**: `Renderer.PLINTH_COL = '#6e6779'` (`renderer.ts:8740`) — "The stone plinth every timber wall stands on."
- **THE OUTLINE LAW (ink ring)**: `beginStructOutline()` `renderer.ts:2590` — `strokeStyle = STRUCT_OUTLINE`, `lineWidth = max(1.5, camera.scale * 0.055)`, round join/cap. Struck on the **exposed perimeter only**; run-shared edges are skipped so a run reads as one mass. The 3D client already mirrors this via `play3d/outline.ts` (`outlineRing`, used by `sprites.ts`).
- **Scale / zoom**: `TILE_PX = 32` (`packages/shared/src/constants.ts:280`). `Camera.scale = TILE_PX * 1.25 = 40` px/tile at zoom 1, `baseScale` the same (`renderer.ts:935-937`). `yScale` (ground squash) = **0.6** (`terrain.ts:5335` `FLAT`, `play3d/sprites.ts:35` `Y_SQUASH`). Projection is affine: `x = wx·scale + ox`, `y = wy·scale·yScale + oy` (`cameraProject.ts:19-26`). HiDPI: `camera.snapPx` rounds CSS coords onto the **device**-pixel lattice (`cameraProject.ts:60`, `camOriginX/Y` `:82/:87`) — a fractional dpr parking a joint on a half device pixel is exactly what opens seams. Bake resolution: `renderer.ts:7375` picks `TILE_PX*2` when zoomed in, else `TILE_PX`; the 3D ground already bakes at `BAKE_PX = 24` (`play3d/ground.ts:67`) and statics at `STATIC_PX = 32` (`play3d/sprites.ts:36`).

---

## 4. DOORS / INTERIORS / THE VEIL

### 4.1 Doors
- **State is the tile** (`tiles.ts:127-136` enum comment; `DOOR_INFO` `tiles.ts:493-529`). A wide run flips atomically server-side.
- Client easing: `addDoorEase(tx, ty, dir: 'open'|'close'|'shake'): void` — `renderer.ts:14219`; `doorOpenness(tx, ty, open: boolean): number` `:14254`; `doorShakeAt(tx, ty): number` `:14271`. The leaf pivots on the north jamb (`renderer.ts:12074-12110`), a locked refusal shudders (`:11849-11855`).
- `doorVeil(game, cx, cy): number` `renderer.ts:11652` — the dark-interior scrim behind an opening; melts as you approach. Wide doorways key it to the run's centre column (`:9694`, `:11839`).
- **THE DOOR OPENS ONTO A ROOM, NOT THE MAP** (`renderer.ts:11815-11838`): if `interiors.regionAt(game, tx+i, ty-1)` is null for every run member, the opening is filled with the far ground's own tone at `shade(gcol,-34)` under a depth gradient instead of showing raw meadow at head height.

### 4.2 "The player is inside building X"
`renderer.ts:5280-5365`:
```
this.interiors.beginFrame(game.interiorsVersion);
this.localRegion = this.interiors.regionAt(game, floor(own.x), floor(own.y));   // :5287
this.ownPX/ownPY = continuous render pos                                        // :5289-5290
this.ugCutOn = game.plane.underground;                                          // :5291
sheltered = shelterArmed({ underground, insideRegion: localRegion!==null,
                           onPassage, onPanelDoor })                            // :5316-5321
this.shelterK eased over 0.35s -> smoothstep -> this.cutCtx                     // :5322-5327
```
Plus `buildingK` (`:5333-5352`): entering a *different* building restarts the ease at 0; a doorway threshold holds the current value. **THE ROOM-TRUTH GATE is the anti-wallhack line** — a wall fronting an enclosed room only reveals while you are in the *same building* (`interiors.sameBuilding`).

So the single authoritative answer to "player is inside building X" is:
`renderer.localRegion` = `interiors.regionAt(game, floor(px), floor(py))`, and building identity = `interiors.sameBuilding(a, b)`.

### 4.3 The veil / reveal law
- `wallHeightAt(game, tx, ty): number` — `renderer.ts:10405-10494`. Returns `WALL_H` … `WALL_STUB`, smoothstep-eased on the continuous player position. Doc block `:10349-10400`:
  - **THE ONE VEIL LAW**: one mechanic for surface cutaway + dungeon corridor cut. Doorframes and diagonal corners ride the same height field as the run they sit in.
  - **THE ONE-SLAB LAW**: rows 1–3 back from the floor all sink to the *same* height on the *same* ease keyed to the mass's FRONT row. Per-row heights are BANNED (they read as the wall tearing into parallax slices).
  - **THE BOWL**: a wall fronting unenclosed ground may only bow in a tight anti-occlusion window.
- `garrisonHeightAt(game,tx,ty)` `:11561` — the same law at `GARRISON_H`, mass scan depth 5.
- `packages/client/src/render/reveal.ts` is the **pure math half**: `FADE_ALPHA = 0.32` `:51`, `stackCover(m)` `:59`, `FADE_EASE_S = 0.18` `:64`, `FADE_INSET_X = 0.15` / `FADE_INSET_TOP = 0.06` `:71-72`, `FADE_BODY_HW 0.4 / HT 1.35 / BELOW 0.1` `:75-77`, `FADE_TALL_TILES = 1.45` `:80`, `FRONT_EPS = 0.1` `:83`.
- `occluderFade(key, dx0, dy0, dw, dh, dRow)` — `renderer.ts:16906`. **THE STEP-ASIDE FADE** is for *sprites* (trees, tall props); **walls never fade** — behind a wall you get THE GHOST EMBER (a dithered lantern-gold silhouette of your own rig drawn over the wall). Anti-wallhack: both mechanics key exclusively off the LOCAL player.

**For 3D:** the veil law is a 2.5D occlusion fix. A real camera with pitch/yaw makes most of it unnecessary; what survives conceptually is the *interior-region* + *sameBuilding* gate (which walls may be cut/faded for the local player) and `WALL_STUB` as the cut height if a cutaway mode is wanted.

---

## 5. EXISTING 3D CLIENT — what it already has

`packages/client/src/play3d/world.ts:32-52` — **`WorldSource3D`** is the entire seam:
```ts
ensure(cx,cy): ChunkData
peek(cx,cy): ChunkData | undefined
ready(cx,cy): boolean
groundAt(tx,ty): number | undefined
detailAt(tx,ty): number
elevAt(tx,ty): number
isSolid(tx,ty): boolean
isRamp(tx,ty): boolean
readonly spawn: Vec2
readonly label: string
```
Implementations: `StandaloneWorld extends ChunkStore` (`world.ts:73`, real worldgen + Dawnmead zone overlay via `overlayZone` `:54`) and `LiveWorld` (`liveWorld.ts:22`, over `ClientGame.world`; `ready()` is `game.world.has(cx,cy)`; throws if you `ensure` an unstreamed chunk).

**Already exposed: ground tiles, detail tiles, elev, solidity, ramp-ness, chunk objects (so `rev` is reachable via `peek()`).** That is sufficient for W2 — no new world plumbing is needed.

Other 3D modules:
- `ground.ts` — `BAKE_PX = 24` `:67`, `LOAD_RING = 2` `:69`, `EVICT_RING = 3` `:71`, `elevLevels(elev: Int8Array): number[]` `:101`, `LampSpot` `:117`, `GroundStats` `:125`, `class GroundStreamer` `:140`. Header (`:1-50`): heightfield geometry NOW, `startChunkBake`/`stepChunkBake` texture SOON under an ms budget, **THE LEVELS COMPOSITE** (each level's `startElevatedBake` composited back onto the base canvas at its `rowOrigin`), THE CANVAS PAYS ONCE (canvas shrunk to 1×1 after upload; `reset()` on context loss), eviction disposes geometry/materials/texture, `refresh()` on `ClientGame.worldVersion` evicts records whose chunk was replaced/patched/fringe-bumped.
- `heightfield.ts` — **PURE**, no DOM/Three. `HeightfieldInput` `:29` = `{cx, cy, size, levelAt, isRamp, levelH, px, gutter}`; `HeightfieldMesh` `:45`; `cornerLevels` `:59`, `heightAtPoint` `:101`, `buildHeightfield(inp)` `:161`. Laws: flat tops per tile, only Ramps slope, **THE HIGH TILE OWNS THE FACE** (emitted once, with the high tile's texture rect), multi-level drops are one stretched rect, UVs inset past the bake gutter, winding corrected. Header `:19-21` explicitly flags: *"Honest placeholder — S2 gives cliffs their own face painter (cliffArt tones) in an atlas."*
- `sprites.ts` — `STATIC_PX = 32` `:36`, `ATLAS_PAGE_PX = 2048` `:37`, `ATLAS_PAD_PX = 8` `:39`, `SpriteRef` `:45`, `PaintSpec` `:60`, `class SpriteAtlas` `:86`, `isStandingTile(tile)` `:243`, `ChunkStatics` `:249`, `buildChunkStatics(...)` `:259`. The atlas pattern (paint once per distinct model into a shelf-packed page, sub-rect upload, ring with the outline law) is **exactly the pattern W2's face textures should reuse**.
- `atlasPack.ts` — `PackedRect` `:13`, `class ShelfPacker` `:20` (`insert(w,h): PackedRect|null`, online, never reorders, `pad` default 2 — sprites use 8).

**What W2 must add:** a structure mesh builder + a structure face atlas. Nothing in the world seam.

---

## 6. THE JULY SPIKE — `explore/3d-billboard:packages/client/src/spike3d/buildings.ts` (378 lines)

Read via `git show` only; branch not checked out.

**Verdict recorded in the header (`:1-14`):** *"buildings are literal geometry. Wood walls are stacked horizontal LOG CYLINDERS per wall run — the thing the 2D renderer spent five commits of projection law faking is just… the shape. … All textures are procedural canvas paint — the painter craft carries over; only the projection went away."*

What it read from the world: **only `tileAt(x,y): Tile` over a fixed W×H zone.** No elev, no detail, no interiors, no run flags. Sets: `WOOD_WALLS = {WallWood, WallWoodWindow}`, `STONE_WALLS = {WallStone, WallStoneWindow}` (`:21-22`).

Constants: `WALL_H = 1.9` (note: *lower* than the 2D `2.05`), `LOG_R = 0.44` ("two logs of this radius fill the wall height"), `PLINTH_H = 0.22` (`:18-20`).

Geometry approach:
- `collectRuns(W, H, tileAt): WallRun[]` (`:172`) — scans for run starts (`!leftWall && rightWall` → horizontal; `!upWall && downWall` → vertical; isolated tile → a 1-length horizontal run). `WallRun = {x, y, len, horizontal, wood, windows: number[], doorGapBefore}` (`:161-169`). Horizontal runs own every tile; vertical runs share corner tiles, and *"the interlocked-course heights keep the two from z-fighting."*
- `buildWalls(W, H, tileAt): THREE.Group` (`:242`):
  - **Interlocked courses**: `COURSES_EW = [LOG_R, LOG_R*3]`, `COURSES_NS = [LOG_R*1.32, LOG_R*3.32]` — E-W logs low, N-S logs high, the crossed-corner cabin stack.
  - Wood: per course a `CylinderGeometry(LOG_R, LOG_R, len, 7)` rotated onto the run axis, with **3 materials** `[bark, sawnA, sawnB]` so the cylinder end caps ARE the sawn discs; runs overhang by `OVER = 0.14` so the ends protrude past corners. Plus a `BoxGeometry` stone plinth strip under the bottom log.
  - Stone: one `BoxGeometry(len, WALL_H, 1)` prism with `[side, side, masonryTop, masonryTop, side, side]` — a coursed-masonry prism with a distinct crown material. **This is the direct 3D analogue of the 2D crown/face split.**
  - Windows: a framed `BoxGeometry` + a pane box set proud of the wall plane at y = 1.06, sizes 0.62×0.78×1.12 / 0.44×0.56×1.16.
  - Doorways (a second full scan, `:326`): only `DoorwayWood`/`DoorwayStone`; two jamb boxes at ±0.42, height 1.52 at y=0.76, plus a lintel — a log cylinder (r 0.16, len 1.1) at y=1.62 for wood, a box at y=1.66 for stone.
- Textures (`tex(w,h,paint)` `:26`): procedural canvas → `THREE.CanvasTexture` with **NearestFilter** and `SRGBColorSpace`. `barkTexture()` 256×64 `:43` (long unbroken horizontals; the V of the texture wraps the girth — lit crown near top, shadowed belly near bottom, *"like the 2D face courses"*), `sawnEndTexture(seed)` 64×64 `:67` (rim/face/drifted growth rings/pith), `masonryTexture()` 128×256 `:92`, `paneTexture()` 32×40 `:126`.
- Materials `flatShading: true` (`:145-147`) — *"turns the cylinder into visible facets — the game's brutalist shape language instead of a smooth 3D pipe."*
- **Lighting-compensated tones** (`:93-94`): *"Tones sit LIGHTER than the 2D base colors: lambert on a vertical face eats a stop of brightness that the 2D painter never paid."* — a real gotcha for reusing 2D palettes as face textures.
- Helpers: `isWallTile(t)` `:369`, `underColor(t)` `:374` (ground bake tone under walls/raised props).

**Gaps vs. today's world** the spike never touched: elevation/`ELEV_H`, diagonals, windowed-wall merging (THE WIDE LIGHT), wide/shut doorways, side doorways, garrison, palisade, hedge, iron fence, decks/bridges/porches, cliffs, awnings, wall-hung details, wood skins per building, interiors, the outline ring, the reveal.

---

## 7. W2 DATA CONTRACT

### 7.1 The minimal per-tile query surface a mesh builder needs

Everything below is answerable from `WorldSource3D` + shared `@arx/shared` predicates + two client modules (`interiors.ts`, `staticRegister.ts`). **No new world plumbing.**

**A. Wall runs (buildings)**
```
tile          = world.groundAt(tx,ty)                         // Tile id
isWallRun     = WALL_TILES.has(tile)                          // paintVocab.ts:69 == WALL_RUN_TILES
family        = 'stone' | 'wood' | 'cave'                     // from tile; window variants fold to base
isWindow      = tile === WallStoneWindow || WallWoodWindow
isDiag        = diagWallInfo(tile)                            // -> {material, mass:'NE'|'NW'|'SE'|'SW'}
door          = doorInfo(tile)                                // -> {material, wide, open} | null
runN/E/S/W    = wallishLike(tx,ty±1 / tx±1,ty)                // PORT renderer.ts:8718 (WALL_TILES minus side doorways)
sideDoorway   = PANEL_DOOR_TILES.has(tile) && vertical-run-only   // PORT renderer.ts:~8695
mergedRun     = classifyRaised(...)                           // staticRegister.ts:110 -> RaisedMember{kind,tx,ty,len,endX}
height        = WALL_H (2.05)  [× reveal if a cutaway mode is wanted -> WALL_STUB 0.62]
elev          = world.elevAt(tx,ty)  ->  y += elev * ELEV_H (1.35)
region        = interiors.regionAt(game,tx,ty)                // for the wood skin + hearth + hasRoomBehind
skin          = dealWoodSkin(region)                          // woodSkins.ts:77
detail        = world.detailAt(tx,ty) -> wallHungInfo(detail) // wall-hung art on the south face
awning        = awningInfo(world.groundAt(tx,ty))             // walkable canopy over a wall/doorway host
```
**Reuse `classifyRaised` directly** — it is pure and already answers "which of the 16 emission kinds is this tile, and what is its merged run length/anchor". Wire `RegisterHost` to `WorldSource3D`.

**B. Garrison** — `GARRISON_TILES.has(tile)`; `diagWallInfo(tile).material === 'garrison'`; `doorInfo(tile).material === 'garrison'` for gates (always `wide`, run-merged E-W, west anchor). Height `GARRISON_H = 3.4`, merlons `+MERLON_H = 0.5`. Merges ONLY with garrison (separate-masonry law) — never with §A.

**C. Fence / palisade / hedge / iron fence** — five independent sets: `FENCE_TILES`, `PALISADE_TILES`, `HEDGE_TILES`, `IRON_FENCE_TILES` (+ gates via `doorInfo(tile).material`). Continuity = same-set 4-neighbour, plus the two 45° diagonals (`*DiagNE` = "/" spanning NE-SW, `*DiagNW` = "\\"). Heights: fence post `0.92` (palisade gate post `1.72`), iron pier `1.52` (gate pier `1.66`), hedge `HED_H = 0.95`. These are **run-continuous volumes** (the hedge is one folded mass across its component, not per-tile boxes) — `collectVolume(sampler, classOf, seed, …)` (`collectVolume.ts:128`) gives the 4-connected component + its **exposed-perimeter world-corner loop**, which is precisely the extrusion footprint a 3D mesh builder wants. Lift by `elevAt * ELEV_H`.

**D. Decks (dock / bridge / porch)**
```
isDeckGround(t)                       terrain.ts:5363   Bridge | Dock
isDockTile(ground,tx,ty)              terrain.ts:5435   + structure-flood water test
isBridgeTile(ground,tx,ty)            terrain.ts:5440
isPorchSurface(ground,tx,ty)          terrain.ts:1602   PorchDeck ashore
deckFillAt(ground,tx,ty)              terrain.ts:5477   45° notch: {legs, family, ...}
deckWalkIsVertical / deckArmVertical  terrain.ts:5648 / :5715
bridgeApronAt(...)                    terrain.ts:5781   'none'|'W'|'E'|'N'|'S' bank ramp
edges: exposed = !isDeckGround(neighbour)  ->  fascia (W/E) / south fascia
piles: paired, on water-facing spans   (paintDeckPile geometry, terrain.ts:1806)
lift  = DOCK_LIFT (0.22) + elevAt * ELEV_H
```
`GroundSampler = (tx,ty) => number|undefined` — feed it `world.groundAt`. **These are the fully-portable predicates; use them verbatim.**

**E. Cliffs** — derived, not stored:
```
level(tx,ty)  = world.elevAt(tx,ty)
member(L)     = elev >= L                                (Ramp counts as mass, terrain.ts:3838)
faces         = marching squares over member(L) per visible level, segments from
                cliffArt FACE_SEGS (:36) with outward normals; owner = the >=L side
step height   = ELEV_H (1.35) per level; a 3-level drop is 3 stacked steps
brow          = groundAt north of the rim (skip up to 2 Cliff rows) -> turf | bare
```
`play3d/heightfield.ts` **already emits these faces** (THE HIGH TILE OWNS THE FACE); W2's job is to replace their placeholder stretched-rect texture with real cliff face art.

**F. Ramps** — `tile === Tile.Ramp`; `world.isRamp(tx,ty)` already on `WorldSource3D`; slope direction = the cardinal neighbour with a lower level (`renderer.ts:3262-3268`, `heightfield.cornerLevels`).

### 7.2 Painter calls that produce each face texture

Recommended shape: bake **per-(family, feature, variant) face tiles into a shelf-packed atlas page at load** using the existing `ShelfPacker` (`play3d/atlasPack.ts:20`) and the `SpriteAtlas` pattern (`play3d/sprites.ts:86`), at `STATIC_PX = 32` px/tile (or 64 for walls, since a wall face is 1 × 2.05 tiles). Then UV-map with `faceUV`'s convention: **u = W→E along the run, v = 0 at ground base → 1 at crown.**

| 3D surface | painter to call | portability |
|---|---|---|
| wall south/side **face**, wood | *re-emit* from `wallItem`'s course law (`renderer.ts:10574-10586` + the chinked-log block `:10680+`) using `dealWoodSkin(region)` tones | **re-emit** (the law is 12 lines of arithmetic; the paint is inside a private method) |
| wall face, stone / cave | *re-emit* the coursed-masonry block; noise via `stone01(a,b,c)` (`paintVocab.ts:186`) + `hashCoords` | re-emit |
| wall **crown** (top quad) | flat fill `skin.top` / `'#8c8798'` / `'#3a3444'` + `woodCrownPlate` for timber + the lit south-lip band | trivially re-emit |
| window opening | geometry only: head 1.62 t, band 0.7 t, u∈[0.28,0.72] singles / edge-butted when merged (`renderer.ts:11144-11165`). In 3D make it a real hole (the 2D already treats it as one) | re-emit |
| wall-hung art on the face | `wallHungArt.wallHangings(rend, game, tx, ty, px0, s, whT, garrison)` `:25` and the 14 `*OnFace(rend, tx, ty, px0, s, …)` painters | **call under a stub PaintHost** — coords already face-local (y negative up from base) |
| doorway jambs / header / leaf | *re-emit*: jamb `s*0.15`, opening fixed at `hs - s*1.56`, leaf pivots north jamb, `doorOpenness(tx,ty,open)` `renderer.ts:14254` drives the swing | re-emit; **reuse `addDoorEase`/`doorOpenness`/`doorShakeAt` for animation state** |
| garrison ashlar / merlons / gate | `garrisonArt.paintGarrisonMasonry(rend, …)` `:45`, `merlonBox(rend, …)` `:155` | stub PaintHost (these two draw in a base-at-y=0, rising-to-−hs frame — the same face convention) |
| fence / palisade / iron primitives | `barrierArt.drawFencePost` `:83`, `giantLog` `:537`, `palisadeRope` `:628`, `drawPalisadePost` `:662`, `ironBar` `:1169`, `ironCurbEW` `:1247`, `drawGravePier` `:1289`, `ironRail` `:1403`, `ironOrnament` `:1418` | stub PaintHost |
| hedge mass | `barrierArt.hedgeMassPaint(rend, px, py, tx, ty, parts, H, wind, …)` `:2063` + `hedgeLobe` `:2039` | stub PaintHost (needs `rend.breezeAt` / `windAtInto`) |
| cliff face | `cliffArt.drawCliffRun(rend, …)` `:947` / `bakeCliffRun(rend, …)` `:1080` are the closest to a bakeable curtain; tones + coursing live inside | stub PaintHost, or re-emit the coursing |
| deck boards / fascia / piles / treads | `bakeChunk(...)` `terrain.ts:1175` and `bakeElevated(...)` `:4118` **already paint all of it** into the chunk texture the 3D ground uses. For raised deck *sides* call `paintDeckSideFascia(ctx, gx, gy, px, liftB, family, west, hasS, tone?)` `:1749` and `paintDeckPile(ctx, cx, top, px, pw, seed, body, lit)` `:1806` | **direct — plain ctx, already portable** (module-private today; W2 should export them) |
| ground/floor under everything | `bakeChunk` + per-level `startElevatedBake` composite | **already wired** in `play3d/ground.ts` |

### 7.3 Face projection contract

Use `structureFace.ts` unchanged as the *naming* convention even though 3D does the projection itself:
- `faceUV(baseW, baseE, topW, topE)` `:126` → `(u,v) => pt`, `u` W→E, `v` base→crown. Every 2D feature-on-face placement is already expressed in this space, so a 3D face UV of `(u, v)` maps 1:1 to the 2D painter's expectations. This is the cheapest possible parity guarantee for windows, doors, and wall-hangings.

### 7.4 Sharp edges for the mesh builder

1. **`WALL_H` differs from the spike** — 2D is `2.05`, the spike used `1.9`. Use `2.05` (`renderer.ts:578`) so bodies read at the same 1.8× ratio.
2. **Log pitch is absolute, not proportional** — `round(span / (s*0.42))`. A taller/shorter wall stacks a different log count; do not scale a fixed-course texture.
3. **Windows merge**, doorways merge only when `wide`, garrison gates always merge. `classifyRaised` already resolves all three.
4. **`wallish` ends runs at side doorways** — a naive `WALL_TILES.has` neighbour test will smear a side door into seamless wall (the exact bug `wallish` was written to fix).
5. **The 2D never draws N/E/W wall side faces** except at exposed ends; a 3D prism needs all four and there is no authored art for the back face. `shade(face, -14)` is what the REAR RISER uses (`renderer.ts:11031`).
6. **Lambert eats a stop** — the spike's `:93-94` note. Lighten `paintVocab`/`woodSkins` tones for lit vertical faces.
7. **Diagonal suffix names the SOLID triangle** (`tilesEnum.ts:110-117`), not the open one.
8. **Deck lift is a whole-structure verdict**, memoized with a 5s flush — call `isDockTile`/`isBridgeTile`, never `groundAt(t)===Dock`.
9. **No roofs exist.** If W2 wants roofs it is new authored content, not a port.
10. **`rev` / `fringeRev`** on `ChunkData` is the invalidation signal; `ground.ts`'s `refresh()` already implements the eviction pattern to copy.