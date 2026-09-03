# Epic B-2 — THE WORLD COMMITS TO THE LEAN

**Opened 2026-09-02.** Epic B shipped the perspective camera lean as an opt-in
beta. Production testing surfaced that the *ground plane* (GL path) and *sprites*
were committed to the lean, but the layers riding on the ground were not — so
under lean they shear and float against the warped world: walls fragment,
shadows drift, grass detaches, junctions seam. This phase commits **every
layer** to the lean.

**Invariant (unchanged, sacred):** at `q === 0` every path is byte-identical to
the orthographic frame. Every fix here short-circuits at q=0 via
`depthScaleWorld`→1 / `projectWorld`→exact-affine (`cameraProject.ts`). The beta
stays **off-by-default** for the entire duration of this phase.

Rig: stage vite :5231 (`--force` after every edit), login `perf12_probe` /
`probe-owl-9127`, lean lever `renderer.leanTarget` (0 / 0.0013 ship / 0.0034
cine — NOT `camera.q`, clobbered per-frame). Verify EVERY change at q=0
(byte-identity) AND q>0 (correctness), accel ON and OFF where relevant.

---

## The unifying root cause

The lean rides `camera.q` (runtime, folded into `worldToScreen`/`depthScale`).
But the on-ground layers were built against one of:
1. a **flat single-anchor affine** (grass cell blit; lightmap composite; deck
   bake warped as ground),
2. a **disabled compile-time lean** `PERSP_LEAN = 0` (renderer.ts:588) that makes
   `leanX`/`beginHeightLayer` no-ops (walls/garrison), or
3. the **fused static bake that fuses OFF at q≠0** (`staticLayerOn()`
   renderer.ts:9453) → a live path that never warps verticals.

The correct model already exists and ships byte-identical: `cliffArt.ts:559-609`
projects BOTH end corners with `worldToScreen` and lifts each corner's top/base
by ITS OWN `depthScale`, interpolating detail across the trapezoid. Committing
the world to the lean = teaching every on-ground layer this same method, on the
**GL stage** (the only path that can rasterize a trapezoid).

---

## F0 — Foundation: gate lean on the GL stage  ⟵ decision pending

**Finding (D5).** The canvas2d ground path (`renderer.ts:7448`) blits each chunk
as an axis-aligned affine `drawImage` — it cannot form a trapezoid, and adjacent
chunks project their shared world edge to different screen-x → hard seams across
all flat ground whenever the accelerated display is OFF. Only the GL path
(`stageEmitChunk` + `glStage`, the `ground` 4-corner quad at renderer.ts:7429)
warps correctly.

**FO.** Force `camera.q = 0` unless the GL stage is live (`stageActive()`), at
the q-set site (renderer.ts:5051-5054). Couple the UI: "Perspective camera"
requires / implies "Accelerated display."
- Kills the entire canvas2d seam class in one condition; q=0 stays exact.
- **Collapses B-2 scope:** every per-layer fix now targets only the GL trapezoid
  path — no hand-rolled canvas2d mesh subdivision (a large, perf-risky project
  on exactly the weak machines the canvas fallback protects).
- **Cost:** canvas2d / weak-GPU players do not get the lean. (They keep the full
  flat game, unchanged.)
- **Alternative (rejected unless required):** implement the canvas mesh-subdivide
  oracle (B-1b-iii) so canvas2d can lean — large, high perf risk. Deferred.

---

## FW — Walls / garrison / fences  (D1) — the biggest lane

`wallItem` (renderer.ts:10362+), `garrisonWallItem` (garrisonArt.ts:196+), gates
& diag, and the entire `barrierArt.ts` fence family. Faults: south edge = flat
depth on a projected north anchor (N-S staircase); crown lifted by raw scale
(float); tops never converge (`PERSP_LEAN=0`); fences use raw scale everywhere.
**Fix:** port the `cliffArt.ts:559-609` two-corner + per-corner-depthScale
trapezoid; retire `leanX`/`PERSP_LEAN`; explicit crown quad from projected
corners; fences get `depthScale` + projected neighbor reach. Keep `staticLayerOn`
fused-off under lean. Large but mechanical. Shared run seams: neighbors sample
the same `worldToScreen(tx±1,·)` so corners project identically.
Coupling: wall shadow (`castEdgeQuad`) uses the same flat south edge — fix
together; `reveal.ts wallCover` (:147) flat-space occlusion drifts (secondary).

## FJ — Junctions / decks / docks  (D4)
- **FJ-1 (small, first) — SHIPPED:** live dock/deck rails+posts built vertical
  span from flat `syT=s*yScale` → staircase off the leaned deck. Now depth-scaled
  in `bridgeRailItems` (renderer.ts, dy≠0 and dx≠0 branches): horizontal rails use
  one `depthScale(edgeY)` (ty north / ty+1 south) + projected south base; edge-on
  rails ride the projected deck point at each depth fraction (cliffArt trapezoid);
  post heights via `spriteScale(ty+f)`. `deckFillRailItem` diagonal was already
  depth-scaled. All guarded so q=0 runs the exact old flat expression (byte-id).
- **FJ-2 (large):** vertical carpentry (pilings `paintDeckPile` terrain.ts:1803,
  fascia/skirt `paintDeckWallSkirt` :1782, stairs, ramp aprons) is baked into the
  terrain chunk (flat pixel space) then warped as ground → foreshortened wrong.
  Lift the vertical pieces out of the bake into a screen-space standing pass
  (cliffArt method); keep the flat board *top* on the ground quad.

## FG — Grass  (D2)
Cell baked at a uniform step from one tile, single-anchor affine blit, never
depth-scales (grass.ts:1970-1972, 2061, 2105, 2138-2151). **Fix:** under q≠0 use
the existing per-tile path (`tileFrame(tx,ty)` per tile, grass.ts:2232/2294) or a
per-tile-column slice blit; GL branch emits a `ground` trapezoid quad
(grass.ts:2108-2136) mirroring renderer.ts:7434. Shade/coat rides the same bake —
move it with the placement fix. Perf-gated (far-cap already bounds extent).

## FS — Shade / lightmap  (D3) = folds in old Item 3
Lightmap built pure-affine (lighting.ts:304-308), composited as a single linear
stretch (lighting.ts:377); `LightView` has no `q` (:74). **Fix:** add `q` to
LightView, build the map at the ortho origin, replace the composite with a
q-aware vertical-strip warped blit (one change re-warps pools/faces/wall-shadows
together). q=0 → guard to today's single drawImage. LOW/optional: depth-scale
cast-shadow shear length (renderer.ts:4112-4113, 17166-17167, 5438-5439).

## FGr — GL ground follow-ons  (D5 R2)
Route GL late/declined chunks (renderer.ts:7656) and lifted/elevated surfaces
(renderer.ts:4261-4287) through the projected `ground` quad — they currently
affine-blit with no `ground` → arrival seams + wavy plateau top edges.
(Likely the "dark horizontal bands" seen on the GL noon capture — verify.)

## FR — Water reflections under lean  (old Item 4)
`drawReflections` skips at q>0 (renderer.ts:4389) because the clip is an affine
world→screen path. Rebuild the water clip in screen space. Note: the clip is
built via `organicCellPath` with two SEPARABLE 1-arg coord maps (terrain.ts:4417)
which cannot express the non-separable homography — either extend it to a 2-arg
projector, or clip via projected tile-rect trapezoids. Deeper than a one-liner.

## FP — Elevated-pick depthScale  (old Item 5)
`pickWorld`→`solveLiftedY` (renderer.ts:4192, elevPick.ts) inverts lift assuming
ortho. Thread depthScale into the lift solve. q=0 exact.

## FPerf — Stream-in / far-LOD  (old Item 2) — the gate before default-on
Leaned frustum is wider/deeper → bake transient while moving. Distance LOD for
far chunks. Steady-state already ~60fps; smooth the transient.

## F1 — On-by-default — LAST, gated on all the above verifying.

---

## Sequencing & workstreams
1. **FO** foundation first (settles scope; decision pending).
2. Parallel (isolated worktrees, distinct functions/files): **FW** (own lane,
   biggest), **FS** (lighting.ts), **FG** (grass.ts), **FJ-1** (renderer live
   rails). Each: q=0 byte-identity + q>0 rig proof + typecheck + tests.
3. Then **FJ-2**, **FGr**, **FR**, **FP** (build on FW/FO).
4. **FPerf**, then **F1**.
Serialize merges to epic/foundations → main; full gate (typecheck + client
tests + build) before each deploy. Update this doc + memory as each lands.

---

## FJ-2 detail — the baked deck carpentry stands up

**Problem.** The deck TOP boards legitimately ride the ground quad (they ARE the
ground surface of the deck). But every VERTICAL piece of a deck is currently
baked FLAT into the terrain chunk canvas, in local pixel space
(`gx = lx*px`, `gy = ly*px`, lift `liftB = level*ELEV_H + DOCK_LIFT` in px), and
then the whole chunk (or elevated row slice) is drawn/warped as if it were a
patch of GROUND. Under lean a vertical piece must foreshorten by its OWN
depthScale from base to top (cliffArt trapezoid); warped-as-ground it instead
shears with the surface plane and detaches. Affected bake pieces:

- `paintDeckPile` (terrain.ts:1803) — driven pilings + seat-shadow ellipse +
  waterline collar. A `fillRect(cx-pw/2, top, pw, bot-top)` vertical leg.
- `paintDeckWallSkirt` (terrain.ts:1782) — the wall-foot shadow skirt on the
  boards (this one is a shadow ON the top surface — see split below).
- `paintDeckSideFascia` (terrain.ts:1746) — side rim board, `fillRect(x0, dy0,
  ew, h)` where `h = px + (hasS ? liftB : 0)` (the vertical drop from board top
  down the fascia to the water/bank).
- south fascia band (terrain.ts ~1326-1339) — the south-edge drop face.
- stair treads (terrain.ts ~1349-1353) — stacked step faces.
- ramp apron shear (terrain.ts ~2150-2167) — the `ctx.transform` shear/stretch
  that slopes the whole apron kit; a ground-plane shear, not a standing face.

Bake entry points: `startChunkBake`/`bakeChunk` call `drawDocks`/`drawBridges`/
`drawPorchDecks` (terrain.ts:1140-1142) for ground-level decks; `bakeElevated`
(terrain.ts ~4101-4103) for decks on terraces. Draw/warp: `drawGroundChunks` and
the elevated-row slice (renderer.ts ~4248) blit/quad the baked canvas onto the
(leaned) ground quad.

### The split: top-surface (stays baked) vs vertical (stands up)

1. **STAYS in the flat bake, rides the ground quad** (these live in the deck's
   own ground plane and warp correctly as ground):
   - deck top boards, plank courses, kerbs, thresholds, board seams.
   - `paintDeckWallSkirt` and any contact/seam SHADOW painted onto the top
     surface (it is a mark on the plane, not a standing face).
   - the ramp apron's board field — the apron IS a tilted ground plane; its
     shear should become part of the ground-quad projection (see risk 3), not a
     standing pass.

2. **LIFTS OUT into a new screen-space standing pass** (per-corner depthScale
   trapezoid, cliffArt method): pilings (`paintDeckPile` leg + collar; the
   seat-shadow ellipse stays on the water plane), side fascia
   (`paintDeckSideFascia` rim drop), south fascia band, stair-tread faces.

### Mechanism

- Add a deck **carpentry collector** parallel to the existing rail collectors
  (`bridgeRailItems`/`deckFillRailItem`) that emits y-sorted `DrawItem`s in
  SCREEN space at draw time — never into the chunk bake. It walks the same
  dock/bridge/porch tiles the bake walks (reuse the `isDockAt`/`deckFill`/apron
  memos), and for each exposed vertical edge projects the two base corners with
  `camera.worldToScreen`, lifts top & base by **each corner's own**
  `camera.depthScale` (exactly `cliffArt.ts:559-609`), and fills the trapezoid
  with the same tones the bake used (`deckRimTone`, pile body/lit, tread tones).
- Refactor the bake's vertical painters into pure tone/geometry helpers callable
  from BOTH paths, or duplicate the few `fillRect`s as trapezoids in the new
  pass; the bake stops emitting them (guard the vertical draws behind a
  `standingPass` flag so the bake still draws them when the pass is OFF — see
  q=0). Keep the seat-shadow ellipse and top-surface marks in the bake.
- Y-sort: the standing pieces sort like the rails — a south-facing fascia sorts
  in FRONT of bodies north of it, a far fascia behind deck traffic; pilings sort
  below the deck top (they are under it). Reuse the rail `sortY` conventions
  (`ty+1.02` south-facing / `ty+0.04` north-facing).
- Elevated decks (`bakeElevated`): the same lift-out applies; the standing pass
  reads `elevAt` for the tile's lift and projects from the elevated base, so it
  composes with the row-slice quad (renderer.ts:4248) rather than baking into it.

### How q=0 stays byte-identical

- The standing pass runs ONLY at `camera.q !== 0`. At `q === 0` the vertical
  pieces stay in the flat bake exactly as today (guard `bakeChunk`/`bakeElevated`
  vertical draws with `if (standingPass) skip`, where `standingPass` is false at
  q=0), and the new collector emits nothing. So the baked chunk is the same bytes
  and the frame is unchanged — the invariant holds by construction, not by
  arithmetic limit.
- At q>0 the bake omits the vertical pieces (the flat versions would be wrong
  anyway) and the standing pass draws them projected. There is no q=0 pixel that
  changes, so parity 7/7 stays green; the q>0 look is verified on the rig.
- Bake cache keying must include `q===0` vs `q>0` (a boolean is enough — the
  standing-pass flag) so a chunk baked at q=0 is not reused at q>0 with its
  vertical pieces still burned in, and vice-versa. Simplest: fold the flag into
  the existing chunk cache key alongside world-rev/grid.

### Risks

1. **Bake-cache correctness.** If the flag is not in the key, toggling lean shows
   ghost or missing fascia. Mitigate: add the flag to the key; invalidate on
   toggle. (Low once keyed.)
2. **Y-sort seams.** Pilings/fascia are many small items; wrong sort vs deck top
   or bodies causes flicker. Mitigate: mirror the proven rail sort conventions;
   test a multi-tile pier with a body walking the deck.
3. **Ramp aprons.** The apron shear (terrain.ts:2150-2167) is a ground-plane
   transform, not a standing face. Under lean the apron should be a projected
   tilted quad, which the ground-quad path (FGr / StageQuad.ground corners)
   should own — NOT this standing pass. FJ-2 should leave aprons to the ground
   pipeline and only stand up true vertical faces; deciding the apron seam is the
   subtle part and may need its own sub-band.
4. **Scope / surface area.** Touches terrain bake, a new renderer collector,
   y-sort, and elevated-row slicing — large. Sequence AFTER FW/FO settle the
   standing-pass + cache-key conventions so this reuses them.
5. **Cost.** Per-frame trapezoid emission for every deck vertical edge in view
   replaces a one-time bake; a big pier is many items. Mitigate: only exposed
   (water/bank-facing) edges emit, memoized like the rail edges; measure on a
   dense harbor scene.

### Files touched (implementation, when scheduled)
- `packages/client/src/render/terrain.ts` — `paintDeckPile`, `paintDeckSideFascia`,
  south fascia ~1326-1339, stair treads ~1349-1353, ramp apron ~2150-2167,
  `startChunkBake`/`bakeChunk` (1140-1142), `bakeElevated` (~4101-4103); add the
  `standingPass` guard + factor vertical tone/geometry into shared helpers.
- `packages/client/src/render/renderer.ts` — new deck-carpentry standing-pass
  collector next to `bridgeRailItems`; elevated-row slice interaction (~4248);
  chunk-cache key gains the lean flag.
- Verify: q=0 byte-identical (parity 7/7), q>0 dock scene on the rig (pilings,
  fascia, treads stand and foreshorten with the deck; no shear/detach), typecheck
  + client tests green.
