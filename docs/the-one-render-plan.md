> **HISTORICAL — the q-parameterized (lean-capable) pipeline this epic built was removed from the 2D client on 2026-09-04 (see docs/perspective-review-and-3d-client-plan.md); its flat-look gate (docs/the-one-render-verify.md), draw-order law and GPU grass live on. The perspective effort continues in the separate 3D client.**

# Epic: THE ONE RENDER — a single perspective-native 2.5D foundation

## Context

The pitched perspective camera (the "lean", `camera.q` homography) is the direction we've committed to as the renderer going forward. It is currently shipped OFF-by-default behind a beta flag; the flat game (q=0) is what live players use today. Repeated live testing of the beta surfaced a large family of glaring, interacting defects — broken/segmented wall tiling, wall-top wedge artifacts, a black outline shader that seams and busts up, hedges/bushes drawn flat and squished *under* buildings instead of standing *in front*, characters occluded by buildings they stand in front of, objects that float off the ground when zooming, grass that parallaxes faster than the player, LOD that flips and stays blurry until you walk, and a performance regression versus the old flat renderer.

Three parallel architecture audits established that these are **not independent bugs**. They share one root: the renderer is saturated with hand-rolled `q === 0 ? ortho : perspective` forks and duplicated implementations, kept alive by an old rule that q=0 must stay byte-identical to the shipped flat game. Every perspective fix was bolted on *beside* the flat path rather than replacing it — two systems that fight. The canonical primitives already exist (`render/cameraProject.ts` for projection; `render/structureFace.ts` for world-geometry faces; the per-object alpha-dilate outline; the tree screen-box occluder) but are *shadowed* by ortho-only paths instead of being the single source of truth.

**Owner decisions (locked):**
1. **One unified pipeline** — rebuild as a single q-parameterized renderer; perspective is just q>0, flat is q=0. q=0 need NOT be byte-identical, but must reproduce the flat look and perform. Retire ortho-only duplicate paths.
2. **Big validated drop** — develop the whole reworked foundation on `epic/foundations`, verify end-to-end (visual + perf) as a coherent whole, ship once, behind the beta flag until proven. No half-migrated states in front of the owner.

**Intended outcome:** one clean, performant, perspective-native 2.5D foundation with no conflicting old/new systems — seamless world geometry, a coherent outline, correct depth/occlusion under pitch and zoom, one projection law for everything, and a bake/LOD system designed for a warping camera.

## The unified architecture (invariants the whole epic upholds)

1. **ONE projection.** Every world→screen mapping goes through `cameraProject.ts`. No rogue affines (kills the GPU-grass ortho matrix), no ortho lift terms (every lift folds in `depthScale`). q=0 is the affine special case of the same functions.
2. **THREE element classes, one law each.**
   - **Billboard** (characters, trees, props, items): camera-facing sprite, foreshortened by `depthScale(footY)`, never warped, never turned.
   - **World-geometry volume** (walls, hedges, decks, cliffs, terraces): projected faces on the tile grid via `structureFace.ts`, drawn as continuous run-length faces with shared projected world corners → seamless.
   - **Ground-decal** (paths, footprints, shadows): lies on the ground plane, warped with the ground.
3. **ONE world-geometry primitive.** `wallItem` / `diagWallItem` / garrison / hedge all render crown + face + side + outline through one q-parameterized `structureFace` path. Retire `woodCrownPlate`, the per-tile outline stroke, the q=0-only band bake, and the q>0-only side-face split.
4. **ONE outline.** The black outline rings the composited, already-projected **silhouette** (per object / per coalesced run) via the alpha-dilate characters already use. Retire the per-tile vector stroke.
5. **Depth/occlusion is pitch-aware.** The painter's order (and a generalized screen-box occluder) accounts for a volume's *screen extent* under pitch — a billboard in front of a building is never overpainted; a hedge stands in front, correct at all zooms.
6. **Bake/LOD is perspective-native.** Density follows depth without intermittent flips; the near field is sharp when stationary (no motion-gating); cached bakes are *warped* through the projection rather than rebaked per frame. Within existing byte-budget ledgers / StageVram ceiling.
7. **Performance is a gate.** Alloc-free/memoized projection in hot loops; tamed frustum cost; no per-frame rebakes. q>0 must return to a good frame time before ship.

## Defect → phase traceability

| Owner-reported defect | Root | Phase |
|---|---|---|
| Walls segment into panels / gaps between tiles | per-tile faces; shared edges projected/rounded twice | A2 |
| Wall tops: wedges + side artifacts | per-tile outline stroke from mixed near/far corners; side faces q>0-only | A2, A3 |
| Black outline seams / busts up | per-tile vector stroke instead of per-silhouette dilate | A3 |
| Bushes flat, squished *under* building, walkable | hedge classed as billboard prop, `sortY=ty+0.8`, per-tile affine hack | A4, A5 |
| Character drawn behind a building it's in front of | flat raw-foot-row sort; no volumetric occlusion | A5 |
| Props (chairs/tables) tiling breaks apart | per-tile members; coalesce only when settled | A4 (shared flood) |
| Objects float up/down when zooming | entity lift term missing `depthScale` (ground has it) | B1 |
| Grass parallaxes faster than the player | GPU grass uses its own ortho matrix + snapped origin | B2 |
| Grass disconnected / tall grass not interleaving | GPU path draws all grass flat below entities | B3 |
| Character jitter walking x | pre-divide origin snap (fixed) + GPU grass snapped-origin feed | B2 |
| LOD flips hi/lo; blurry until you walk | depth-driven re-bake tiers, motion-gated upgrades | B5 |
| Perf regression vs flat game (16-26fps) | 5× frustum, allocating/per-vertex projection, per-frame rebakes | B4, B5, B6 |

## Phase slate

### F — Foundation gate (sequential prerequisite; blocks A and B)
- **F0** Pin the invariants with tests before rework: (a) a **q=0 golden-frame** rig capture set (ground, grass, walls, entities) = the "flat look still holds" gate; (b) node **parity tests** — grass-shader-mirror == `projectWorld` (pattern of existing `grassWindMirror`), and `structureFace` q=0 == current rects. Extend `cameraProject.test.ts` / `structureFace` tests. Risk: low.

### Track A — World geometry, outline, classification, depth
- **A0** Generalize `tryRunRingItem` BFS flood (`renderer.ts:17441`) into `collectVolume(class, tx, ty)` → exposed-perimeter world loop + top-plane loop + per-member height field; add `hedgish()` beside `wallish()` (`renderer.ts:9108`). No behavior change. Depends: F0. Risk: low.
- **A1** `structureFace.ts` gains `faceStrip` (run-continuous side faces; each world corner projected+rounded once → seam-free), `topPlane` (whole-run crown w/ `faceUV` mapper), silhouette-ring accumulation. Node-tested q=0 rect-equivalence. Depends: F0. Risk: medium.
- **A2** (riskiest in A) Rewrite `wallItem` (`renderer.ts:10903`), then `diagWallItem` + garrison, to one `WorldVolume` per run via A0/A1: `faceStrip` for exposed side runs (retire q>0-only guard 11169), `topPlane`+crown-UV (retire `woodCrownPlate` 11774), retire per-tile outline (11743-11756) + `bakeBleedW/E`. De-risk: walls-only behind flag, keep old path for pixel-diff one milestone. Depends: A0, A1.
- **A3** Outline unification: route each `WorldVolume` through silhouette alpha-dilate (`paintOutlined` 23882 / `bakeOutlineRing` 18090), keyed+cached per run; delete per-tile stroke (`beginStructOutline` 2556). Depends: A2. Parallel with A4.
- **A4** Reclassify hedges as upright **hedge-wall volume**: dispatch `HEDGE_TILES` via `hedgish()` to the volume path; retire `hedgeMassPaint` affine hack (`barrierArt.ts:2159-2192`); repaint dressing in crown-UV; low `HED_H` at q=0 keeps flat pillow look. Confirm prop run-ring coalescing rides shared A0 flood. Depends: A1, A2. Parallel with A3.
- **A5** (risky) Pitch-aware depth: change `DRAW_ORDER` secondary term (`renderer.ts:1259`) for volumes from raw foot-row to **projected near-edge row** (`southBaseY`), tie rule "billboard foot ≥ volume near-row ⇒ in front"; add coarse **per-column crown-top ceiling** so a body behind a wall clips under pitch. Behind `occlusionOn` kill-switch. Depends: A2, A4. De-risk: near-edge key first, then ceiling.
- **A6** Wall run band-bake lean-aware (key on projected volume corners; drop `q===0` gate in `staticLayerOn` 9946) — perf cache atop the correct live path. Depends: A2, A5.

### Track B — Projection, bake/LOD, performance
- **B1** Float-on-zoom: fold `depthScale(wy)` into entity lift in `screenAnchor` (3158), `liftedWTS` (3363), `liftedWTSScratch` (3377) to match ground's `ELEV_H*s*depthScale` (4385); audit sibling lift sites (`projAirWorldY`). q=0 unchanged. Depends: F0. Parallel with B2. Risk: low.
- **B2** Grass parallax+jitter: port grass vertex shader (`grassGpuRenderer.ts`) to full per-vertex-w homography from `(scale,yScale,camX,camY,q,w,h)` (exact `projectWorld`, wind in world space pre-divide); fix feed at `renderer.ts:20653` to pass `q` (unsnapped origin). Retire `grassViewMatrix` q>0. Parity-tested. Depends: F0. Parallel with B1. De-risk: A/B vs CPU warp.
- **B3** Tall-grass interleave: remove `!grassGpuActive` guard (`renderer.ts:5842`); partition GPU field at entity y-band (interim: CPU tall + GPU short). Depends: B2. Risk: medium.
- **B4** Grass shade warp: replace per-frame monolithic shade rebake under lean (`grass.ts` `needBake` on `leanQ!==0`) with bake-once + warp (reuse `lightmapStrip` 227 / GL `StageQuad.ground`). Depends: F0. Parallel with B1/B2.
- **B5** (highest risk — bake-contract redesign) Perspective-native bake/LOD: bake chunks/sprites once at near-worst resolution and **warp-down** instead of re-baking on depth crossings (retire NEAR/FAR `chunkBakePx` flip + `|scale-bakeScale|>0.2` rebake); add **stationary near-field resolution lane** (≤6-9 near ring, immediate, not glide-capped). Within CHUNK_POOL/bandBudget/StageVram. Depends: B1. De-risk: warp-down first (sharp while walking), then stationary lane (sharp while standing).
- **B6** Perf: `worldToScreenInto` in hot loops + per-row projection memo (x-projection affine within a row); far-field coarsening (chunk-granular scan past a depth threshold; reconsider `FRUSTUM_FAR_MULT=5`→~3); shrink `leanBudgetMult` toward 1. Target: q>0 mid-motion back to ortho fps band. Depends: B5.
- **B7** Retire ortho-only forks: collapse the ~86 `q===0 ? ortho : perspective` branches now proven equal-or-better; retire grass ortho matrix + snapped-origin feed; band-bake path unified last. Gated on F0 golden green. Depends: A6, B6.

### C — Convergence
- **C0** Integrate both tracks on `epic/foundations`; typecheck + full suite; resolve renderer.ts region overlaps (A: walls/depth ~1259/10903; B: lift/chunk/grass ~3363/7700/20653 — largely disjoint).
- **C1** End-to-end verification across all defect scenes + perf gate, moving and stationary, at representative zooms and q.
- **C2** One validated drop `epic/foundations` → `main`; beta OFF-by-default; flip to default only on owner sign-off of the live beta.

## Distribution model
Two tracks dispatched as parallel workstreams (isolated worktrees off `epic/foundations`); each phase an agent held to q=0 golden parity + typecheck + tests + rig visual proof before merge. Integrator (main session) keeps the invariants, runs convergence gates, owns C1/C2. F0 lands first and blocks both tracks. A3∥A4 and B1∥B2∥B4 are the parallel opportunities.

## Verification
- **Rig:** vite stage config :5231 → backend :8814; login `perf12_probe`/`probe-owl-9127`; `?perf&stage=world`; `window.dcRenderer.leanTarget=0.0013`; Playwright at `/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs`. Feature-scan tiles (walls 10/11/59-78, hedges, Path=4, Dock=133).
- **Per-phase visual proof:** reproduce each artifact at the exact scene/zoom, before/after under lean, confirm gone (not "by construction").
- **Perf gate:** `?perf` HUD phases (grid/chunks/ground/collect/sort/cull/world/lighting/post) at a dense scene, moving + stationary, at representative zooms.
- **Regression gate:** `npm run typecheck` clean; `npm run test -w @arx/client` green; q=0 look validated vs current flat game.
- **Ship:** one validated drop to `main`, beta OFF-by-default; flip to default only after owner sign-off on live beta.
