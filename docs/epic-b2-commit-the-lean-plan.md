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
- **FJ-1 (small, first):** live dock/deck rails+posts use flat `syT=s*yScale`
  (renderer.ts:12682/12834) → staircase. Depth-scale the vertical span/lift.
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
