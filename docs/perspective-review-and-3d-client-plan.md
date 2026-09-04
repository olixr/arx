# THE LEAN COMES OUT OF THE PAINTER — a review of the perspective camera, and the case for a separate 3D client

**Written 2026-09-04.** Status of the subject: the "Perspective camera (beta)"
toggle shipped to prod 09-03 (main 728287f3) and was **shelved the same day** by the
owner after real-hardware testing: ~11 fps under lean against 70-80 fps flat on an
M4 Mac, plus a long tail of visual regressions (walls staircasing, objects skewing
at the screen edges, grass detaching, floats at distance, occlusion faults). The
toggle remains in the client, inert at q=0.

This document answers three questions the owner asked:

1. Was the perspective camera implemented on the wrong architecture from the start?
2. Should it be removed from the 2D client?
3. Should the 3D experience be a separate, dedicated client, and what would that
   look like if designed properly?

Short answers: **yes, yes, and yes.** The rest of the document is the evidence and
the plan.

---

## 1. Verdict in one page

**The lean was not a bad implementation of a good idea. It was a very good
implementation of an idea the architecture cannot support.** The client's renderer
is a CPU painter. Every visible thing is rasterized by canvas2d on the CPU, cached
as a bitmap, and y-sorted. The WebGL "stage" added in the Painted Stage epic is,
by its own charter, a *compositor* of those CPU bitmaps ("Canvas2d paints; WebGL
composites. The GPU is a stagehand, not a painter." — docs/painted-stage-plan.md
§1). Nothing on screen is GPU geometry except the ground quads and, since 09-04,
the GPU grass.

A perspective camera breaks every assumption that architecture is built on:

| The 2D painter assumes | Perspective requires |
|---|---|
| A bitmap cached once stays valid while the camera pans | A bitmap's on-screen shape changes every time the camera moves (trapezoid warp, per-row foreshortening), so caches invalidate per frame |
| Occlusion is a single y-sort | Occlusion is per-pixel depth (a tall wall and a body overlap in 3D in ways a sort key cannot express) |
| An object is one sprite with one anchor | An object has sides, a top, a footprint; a billboard skews at the screen edge because it has no sides |
| Height on screen is a constant multiple of world height | Height scales by depth at the object's own foot row (the "unified perspective law", clause 2) — which had to be retrofitted at every site that ever added a screen-y offset |
| One affine transform per frame | A homography, applied per corner, per layer, by hand |

The team did the retrofit anyway, and did it with discipline: a pure projection
module, q=0 byte-identical on both backends across ~100 commits, a 3-clause law,
golden gates. But the retrofit means **perspective now touches 441 sites in 40
client files, 320 of them inside a 33,337-line renderer**, each one a scalar
correction (`depthScale`, a trapezoid, a per-corner weight) hand-applied to a
painter that was never designed to be projected. Every layer that was not taught
the law regressed (walls, grass, junctions, shade, decks, faces). Every layer that
was taught it stopped being cacheable and became a per-frame CPU repaint plus a
texture re-upload. The 11 fps is that repaint-and-upload loop: the CPU world
phase measured 12-24 ms, the remaining ~90 ms per frame was the GPU eating
per-frame scratch uploads (memory: epicb2-commit-the-lean).

That is the diagnosis. Perspective on this architecture converts the cache
economy that makes the flat game fast into per-frame work. No amount of tuning
recovers that, because the work is structural. The M4 is not the bottleneck; the
pipeline is.

**Industry reference.** Games that do "2D sprites in a 3D world" on the web
(HD-2D style, Octopath-like tilt, isometric-with-perspective) do not warp cached
2D frames. They use a real 3D pipeline: a depth buffer for occlusion, geometry
for anything with sides, textures uploaded *once* and sampled by the GPU under
any camera, billboards as GPU quads, lighting in a shader. On the web that is
WebGL2 or WebGPU, almost always through Three.js, Babylon.js, or PlayCanvas. The
project already proved this shape works for its own art in July: the
`explore/3d-billboard` Three.js spike drove the production humanoid rigs, the
terrain baker and log-house geometry on a true 3D ground plane, with shadows and
post, and the sim/net/content layers needed **zero changes**
(memory: 3d-billboard-exploration; docs/3d-exploration.md on that branch). The
spike was closed for an *art-cohesion* reason (real-3D walls vs 2D characters
"never fused") and a schedule estimate, not a technical one.

---

## 2. What was built (as-built inventory)

Two epics, ~4 days of work, all currently on `main`:

**Epic A — Painted Stage (WebGL compositor, "Accelerated display (beta)").**
`render/stage/` (glStage 1,494 lines + types/batch/blend/vram/atlas/renderScale,
~2,800 lines). Canvas2d-painted ground chunks, bands, sprites and bodies become
textures; a batcher emits quads; a byte-ledger, VRAM governor (1536 MB ceiling),
render-scale DPR cap and scratch-sheet pool manage the upload economy. Parity
oracle: canvas2d. Independent of perspective and stays regardless of this
document's outcome; it has its own four pre-existing regression fixes in flight
(crop, toggle, zoom-drift, wall attachment).

**Epic B — The Camera Learns to Lean (perspective, "Perspective camera (beta)").**
- `render/cameraProject.ts` (339 lines): 3×3 pitch-only homography,
  `w = 1 − q·(sy0 − cy)`, `depthScale = 1/w`, exact affine short-circuit at q=0.
  Sound and pure. Worth keeping as reference math.
- Per-vertex `w` in the GL vertex format (20→24 B) so ground quads rasterize as
  hardware-correct trapezoids. Correct for the ground only.
- `spriteScale(footY)` threaded through every billboard family (humanoid,
  beasts, legless, owl, corpse, props, drops, gravestones, trees, FX).
- Epic B-2 "commit the lean": 21 lanes (walls, garrison, fences, grass footprint,
  lightmap strip-warp, cast shadows, reflections clip, elevated lift, dock rails,
  material edges, interiors, structure faces) each hand-ported to the trapezoid
  model; `structWarp.ts`, `faceCap.ts`, `bakeWarp.ts`, `rowProject.ts`,
  `elevPick.ts` added; `PERSP_LEAN` compile-time skew retired; the fused static
  bake fuses OFF at q≠0 (`staticLayerOn`, renderer.ts:10452).
- Gate: lean forces the GL stage on (canvas2d cannot draw a trapezoid;
  displaySettings.ts:55-72, renderer.ts:5589).
- Perf work: distance-aware chunk resolution, lean arrival multiplier, face cap,
  frustum far-mult, VRAM shed.

Footprint (grep of `camera.q`, `depthScale`, `spriteScale`, `PERSP_LEAN`,
`structWarp`, `faceCap`, non-test):

| File | Sites |
|---|---|
| render/renderer.ts (33,337 lines) | 320 |
| render/waterfalls.ts | 31 |
| render/structureFace.ts | 23 |
| render/garrisonArt.ts | 20 |
| render/barrierArt.ts | 20 |
| render/cameraProject.ts | 18 |
| render/bakeWarp.ts | 14 |
| 33 further files (grass, lighting, terrain, cliffArt, rigs, props, FX, UI, editor) | 95 |
| **Total** | **441 in 40 files** |

Explicit `q` conditionals in renderer.ts alone: 58. Post-drop follow-on list
(memory, 09-03): "B7 retire ~86 dead ortho forks", full face-content warp, veil-cut
front walls, hedge gates/diagonals, bastion corners, canvas oracle q>0 parity
(B-1b-iii), lightmap exactness, LOD stream-in — none of which were gates, all of
which are more of the same retrofit.

---

## 3. Root causes (why it could not have succeeded here)

### 3.1 The rasterizer is the CPU

Every painter (`drawHumanoid`, `paintTree`, wall crowns, `bakeChunk`) draws with
canvas2d. Under a fixed orthographic camera that is fine: paint once, cache,
blit. Under a moving perspective camera the on-screen *shape* of every cached
raster changes every frame. The only ways to reconcile that are (a) re-paint per
frame (what the face lane does — the 90 ms GPU tail), (b) re-warp the cached
raster as a quad (what ground/structWarp do — correct for flat surfaces only),
or (c) stop caching and draw live (the "split path", which is the slow canvas
lane). The team used all three; each has a floor the architecture sets.

A GPU renderer uploads a texture once and samples it under any camera for free.
That is the whole difference.

### 3.2 There is no depth buffer

The frame is a y-sorted list. In a leaned view, a tall wall north of a body and
a body standing in front of it overlap in ways one scalar `sortY` per item
cannot order, so bodies punch through walls and props mis-attach (owner's
reported issue 4). Fixes were per-family sort conventions (`ty+1.02` south-facing
rails, `ty+0.04` north-facing, hedge `sortY ty+1`, nearRow) — tuning the sort
key by hand for every kind of thing in the world. A depth buffer solves this
class for every object at once, including ones not yet drawn.

### 3.3 Nothing has sides

A billboard is a rectangle facing the camera. Projected off-center under
perspective, its screen rectangle is a trapezoid but its *content* is still a
front-on painting, so a house on the right edge of the screen shows its front
face sheared instead of its side wall (owner's "skewed to the sides of objects").
The only cure is geometry for things that have sides — buildings, walls,
cliffs, fences, decks — with painted textures on the faces. That is exactly
what the July spike built (log-cylinder walls, masonry prisms) and it read well;
the cohesion problem was the *characters* reading as flat against it, which
HD-2D solves with lighting, outline, and depth-of-field applied uniformly to
both (the spike's Phase 3 ported exactly those and reported cohesion improved).

### 3.4 The retrofit had to be complete to be correct

The unified perspective law has three clauses; clause 2 (height scales by
depthScale at the object's own foot row) must be applied at *every* site that
ever adds a screen-y offset. The audit found it half-applied and listed the
sites; more turned up after each fix (elevated lift, doorways, stairs, docks,
interior punch). In a scene graph with a projection matrix this clause is not a
rule to apply, it is what the vertex shader does. A rule that must be re-applied
by hand at 441 sites is a rule the architecture is fighting.

### 3.5 The invariants that kept the flat game safe also boxed the lean in

`q=0` byte-identical on both backends was the right law for shipping
incrementally on main. It also meant every lean feature had to be a *fork*
inside an existing painter, gated on `q !== 0`, never a redesign. The canvas
oracle cannot draw a trapezoid, so q>0 had no parity oracle at all
(screenshot-only). The whole q>0 world was verified by eye and by headless
frame-time, and headless fps is rAF-capped — which is how "PERF SOLID" shipped
at 11 fps on real hardware. The verification gap is itself an architectural
symptom: the lean lived where it could not be measured.

### 3.6 Pitch-only was a ceiling, not a stepping stone

The homography is pitch-only by design (no yaw, no roll, horizon clamped
off-screen). That was the maximum the painter could absorb. It is also far short
of the immersion the owner wants (lighting that reacts to the camera, walking
around a building, a horizon). Going further on this path means more forks, not
fewer.

---

## 4. Should it be removed from the 2D client? Yes.

The lean is inert at q=0 and byte-identical, so it is not *breaking* the flat
game. It is still a cost:

- 441 sites of perspective arithmetic and 58+ `q` forks inside the hottest
  paths of a renderer the Foundations epic is trying to decompose. Every future
  painter change has to reason about a mode nobody ships.
- `staticLayerOn`, chunk cache keys, bake-cache keys, the scratch economy,
  frustum bounds and the lightmap all carry a lean dimension.
- The "Perspective camera (beta)" toggle silently flips "Accelerated display" on,
  coupling two betas in the settings UI.
- The parity oracle cannot cover q>0, so the code is untestable by the project's
  own standard.
- The 3D experience will not be built on it, so it has no future in this
  client. Keeping it means maintaining a dead mode.

**Keep:** `cameraProject.ts` as the pure projection reference (it will be
reused as the *spec* for the 3D client's camera parameterization), the GL
per-vertex `w` (harmless at w=1, useful for future non-affine effects), the
VRAM/renderScale/scratch economy (belongs to the compositor, not the lean),
`cliffArt`'s trapezoid model where it is now the only drawing path.

**Remove:** the settings toggle and `?lean`/`arx.lean` read, `leanTarget` and
the per-frame `camera.q` clamp, every `q !== 0` fork and its q>0-only helper
(`structWarp`, `faceCap`, `bakeWarp`, `rowProject`, `elevPick` closed form,
lean fog, lean arrival multiplier, `FRUSTUM_FAR_MULT` perspective bounds,
lightmap strip-warp, reflections screen-space clip, the standing passes), the
`depthScale(footY)` thread where it reduces to `camera.scale`, and the lean
dimension of every cache key. Delete `docs/epic-b-remaining.md` and the B-2
plan as live plans (keep as history).

The removal is q=0-safe by construction (the flat game never executed those
forks), so the same golden gate that protected the lean's landing protects its
removal: **byte-identical q=0 on both backends, 5/5 golden, parity 7/7.** This
is the first workstream in §7.

---

## 5. Should the 3D experience be a separate client? Yes.

The owner's instinct is right and the July spike already demonstrated the
seam. A dedicated 3D client is the correct shape because:

1. **The renderer is the only thing that changes.** Server, protocol, shared
   world model, content, sim, rigs and gait, icons, the terrain baker — all
   renderer-agnostic (spike-proven, re-verified today; §6 has the coupling
   map). The 3D client is a second *renderer + entry point*, not a second
   game. The honest caveat is in §6.3: a large body of prop emission and FX
   code is authored against the 2.5D frame and has to be re-emitted, not
   re-imported.
2. **The invariant flips.** The 2D client's law is "q=0 byte-identical". A 3D
   client's law is "a real projection matrix and a depth buffer, everywhere,
   always." Those cannot live in one codebase without one of them being a fork
   inside the other. Two clients, two laws.
3. **The 2D client stays fast and shrinks.** It stops carrying a mode it does
   not ship. The Foundations decomposition proceeds on a smaller renderer.
4. **Player choice at the door.** The landing/login flow offers "Classic
   (2D)" or "Immersive (3D, beta)"; a preference persists; the 3D client can
   fall back to the 2D client on WebGL2 failure the same way the stage falls
   back to canvas today.
5. **Measurement becomes honest.** A separate client can be gated on
   *real-hardware fps* from day one, with a scene battery and a frame-time
   budget, instead of a parity oracle that cannot see the mode.

What it must **not** be: a copy of `renderer.ts` with a projection bolted on.
The failure mode to avoid is porting the painter's structure (y-sorted cached
rasters) into Three.js. The 3D client is a scene graph: meshes, materials,
instanced billboards, a depth buffer, lights.

---

## 6. Reuse ledger (what the 3D client inherits)

Measured on main today (line counts are non-test source; anchors are current).

### 6.1 The seam is real and narrow

- `main.ts` wires net → `ClientGame` → renderer → DOM HUD; the renderer is
  constructed from one canvas (`renderer.ts:2843`) and driven by one call,
  `renderer.render(game, dt)` (`main.ts:3927`). `ClientGame` (4,154 lines) owns
  the whole client world model and holds **no** renderer reference (one color
  table import). `net/` has zero `render/` imports. Protocol dispatch is a static
  table on `ClientGame`, typed from `@arx/shared/protocol`.
- Outside `render/`, code touches 56 renderer members at ~180 sites. All but
  seven are fire-and-forget FX pokes, display flags, or cinematic hooks. The
  seven load-bearing ones are projection and hit-testing: `camera`,
  `screenAnchor`, `pickWorld`, `lootHitTest`, `worldToScreen`, `setViewShift`,
  `renderLift`. In 3D each is a `project()`/raycast. Four `ui/` files import the
  `Renderer` *type* only (waypoint HUD, party HUD, speech bubbles, display
  settings); a ~30-line `ViewAdapter` interface decouples them.
- `@arx/shared` (19k lines) and `@arx/content` (113k lines) contain no DOM or
  canvas references. Verified by grep.
- Vite already hosts ~30 HTML entries; a `play3d.html` is one added rollup input
  (`vite.config.ts:59-68`), exactly how the spike did it.

### 6.2 Ledger

**Reusable as-is (~137k lines):** `@arx/shared`, `@arx/content`, the server,
`net/`, `game/`, `audio/`, `render/rig.ts` + `legs.ts` + `cape.ts` (~17k; plain
`ctx` + pose, imported unchanged by the spike), `terrain.ts` `bakeChunk`
(sampler closures in, square-pixel canvas out), `icons.ts` / `abilityIcons.ts` /
`petPortrait.ts` (~19k; return data URLs).

**Reusable with a thin adapter (~29k lines + ~50k of painters):** `ui/`
(26.7k; the ViewAdapter), `input/touch.ts` (raycast + orbit instead of
`pickWorld`/`camera`), `main.ts` (fork it; the wiring is five lines, the HUD
fan-out mostly survives), the weapon/armor/shield/species painters (~50k;
paint to an offscreen canvas → texture, the ragdoll capture pattern
generalized).

**Renderer-locked, must be re-emitted (~200k lines):**
- `render/renderer.ts` (33.3k): the 2.5D projection, shelf-sort, lift,
  cutaway, crown-slicing, cast-blob, lightmap, tilt-shift laws. Replaced by a
  scene graph and a depth buffer; not ported.
- `render/props/*` (~30k, 11 files): the paint bodies are `ctx`-based and
  salvage as textures, but every prop *emits* `DrawItem`s into the shelf-sort
  (`props/types.ts:15,19` imports `Renderer` as a collaborator). The emission
  layer is rewritten: each prop becomes a billboard instance or a proxy mesh
  with its painter as the face texture.
- `render/fxSigs*.ts` (~35k across 15 files), `debris`, `ragdoll`, `flight`,
  `waterfalls`, `barrierArt`, `cliffArt`, `garrisonArt`: screen-space FX and
  standing art authored against the 2.5D frame. Painters salvage; placement
  and sort law do not.
- `render/grass.ts` (2.8k): superseded by `grassGpu*` (already instanced,
  already GPU-side — arrives nearly free).
- `render/stage/glStage.ts`: a 2D compositor, not a scene graph. Its economy
  (VRAM governor, render scale, budgets) is the reference for the 3D client's
  texture residency, not code to port.

### 6.3 The mass problem, stated plainly

When the July spike priced "6-10 weeks to visual parity", `render/` was ~20k
lines and `renderer.ts` 8k. Today `render/` is ~298k lines and `renderer.ts`
33k. The structural conclusions of that spike still hold (the seam is clean,
16 of 493 files under `render/` import the renderer). Its cost number does
not: the art surface that must be *re-emitted* is roughly ten times larger,
and the 2D client keeps shipping art at pace.

This does not change the recommendation. It changes how the 3D client must be
built:

- **Painters are the shared art, emission is per-client.** Every painter stays
  a `(ctx, params) → pixels` function callable from both clients. The 3D
  client adds a generic "paint → texture atlas → instance" adapter so that a
  new prop or species painted for the 2D client is available to the 3D client
  by registering it, not by porting it. The emission rewrite is done once per
  *kind* (billboard prop, proxy-mesh structure, body, FX sprite), not per prop.
- **Parity is scoped, not total.** The 3D client ships zones, not the whole
  world, and is judged per scene battery. Dawnmead first.
- **The 2D client does not wait.** Nothing in this plan slows Classic; the 3D
  client is a second product line that grows behind its own door.
- **The 2D compositor seam is not a shortcut to this goal.** The
  `StageBackend`/WebGPU seam captures GPU throughput for the *flat* game and
  should continue for that reason. It cannot deliver perspective, sides,
  depth or real lighting, because it composites 2D rasters. The owner's
  immersion goal needs the scene graph.

---

## 7. The plan

### Workstream 0 — THE LEAN COMES OUT (2D client cleanup)

Branch off main; band-sized commits; every band gated byte-identical q=0 on
both backends (golden 5/5, parity 7/7, full client tests).

- W0.1 Remove the toggle, `?lean`, `arx.lean`, `leanTarget`, per-frame q clamp.
  `camera.q` becomes a constant 0 on the way out, then is deleted with the
  `depthScale` method; `worldToScreen`/`screenToWorld` return to the plain
  affine (they already short-circuit to it).
- W0.2 Retire the q>0 forks family by family, in the reverse of the order they
  landed (faces/structWarp/faceCap → grass footprint → walls/garrison/fences →
  lightmap/reflections/casts → elevated/docks/stairs → frustum/fog/arrival).
  Delete the q>0-only modules once their last caller is gone.
- W0.3 Collapse `spriteScale(footY)` back to `camera.scale` at every billboard
  site; remove the lean dimension from chunk/band/bake cache keys and
  `staticLayerOn`.
- W0.4 Keep `cameraProject.ts` + tests as a pure module (no callers) with a
  header pointing at the 3D client; delete the GL per-vertex `w` only if it
  measurably costs (it does not; leave it).
- W0.5 Docs: mark Epic B / B-2 plans historical; memory update.

Expected size: the same ~100 commits in reverse, but mechanical. Two to three
bands. Zero player-visible change by construction.

### Workstream 1 — THE SECOND DOOR (3D client skeleton)

`packages/client/play3d.html` + `src/play3d/` (or `packages/client3d` if the
build wants a separate bundle; prefer same package first so imports of shared
client modules are plain relative paths, split later if the bundle demands).

- Engine: **Three.js** (r17x, WebGL2 now, `WebGPURenderer` available when the
  headless rig and prod browsers support it). Reasons: the July spike already
  runs on it; instancing, shadow maps, post, texture atlases, and a scene graph
  come free; the alternative (raw WebGL2 on `glStage`) re-invents all of that
  and the Painted Stage epic showed how much of a budget that consumes.
- Bootstrap: reuse `main.ts`'s wiring (net → `ClientGame` world model → HUD)
  with the renderer swapped: the DOM HUD, panels, dock, login, map UI mount
  unchanged; a `Renderer3D` implements the same public surface `main.ts` and
  `ui/` call on the 2D renderer (camera, screen anchors, hit test, hover,
  reveal, `onPlaneSwitch`, perf HUD) — §6 lists which.
- Gate: login, walk, chat, inventory, combat HUD functional; 60 fps on the M4
  in Dawnmead with placeholder art; real-hardware Playwright fps probe as the
  standing gate (`?perf` confession includes true rAF interval).

### Workstream 2 — THE GROUND AND THE STANDING WORLD

- Ground: heightfield mesh per chunk (elevation from `elevAt`; cliffs become
  real vertical faces), textured by `bakeChunk` output uploaded **once** per
  chunk (square world pixels, spike-proven). Water as a shader plane
  (reflection via render target; the 2D path's screen-space clip problem
  disappears).
- Structures: geometry with painted faces. The July spike's log-cylinder /
  masonry-prism verdict, extended: wall runs, garrison, fences, hedges, decks,
  bridges, cliffs are meshes; their face textures come from the existing
  painters (`structureFace`, `garrisonArt`, `barrierArt` tones) rendered into
  atlases at load. Props with volume (barrels, crates, stations) get simple
  extruded proxies with painted faces or stay billboards by class.
- Standing content: **instanced billboards** for trees, flora, props, drops,
  gravestones, FX — one draw per atlas page; per-instance position/scale/tint;
  depth-tested and depth-written with alpha-cut so occlusion is per-pixel.
- The prop emission rewrite (§6.3): a `PropKind` registry maps each existing
  prop painter to one of four emission shapes (flat billboard, proxy mesh with
  painted faces, ground decal, animated sprite). The painters are called
  unchanged; only the registry is new code. New 2D-client props register in
  one line.
- Bodies: per-entity canvas texture updated per frame **only for visible,
  animated** entities (the spike's ~20 lines of glue), atlas-packed;
  shadow-proxy quads for real cast shadows (spike technique).
- Grass: the new `grassGpu*` instanced blade renderer is already GPU-side,
  already dual-mode, and is the model for every other instanced lane. Port it
  first; it is the one lane that arrives nearly free.

### Workstream 3 — THE LIGHT LIVES IN THE WORLD, FOR REAL

Directional sun + shadow map (cascaded for the horizon), point/spot lights for
braziers/windows/spells (Lighting v4's light sources map 1:1), fog by depth,
HD-2D post (tilt-shift, grade, vignette, outline ring — all ported in the
spike). Day/night = sun angle + tint, not a lightmap blit.

### Workstream 4 — THE CAMERA

Real perspective, pitch **and** yaw, orbit around the player with clamped
pitch, zoom by dolly, horizon allowed. `cameraProject.ts`'s parameterization
(lean q) becomes a preset in a camera rig, not a renderer mode.

### Workstream 5 — THE DOOR AT THE FRONT

Landing/login offers Classic / Immersive; preference persisted; WebGL2 probe;
fallback to Classic on context loss or init failure; both clients share the
account, the server, the world.

### Gates that do not move

- Real-hardware fps on the owner's M4 is the perf oracle. Headless numbers are
  for regressions between commits only, never for "solid".
- A scene battery (Dawnmead, terraced capital, dense forest, interiors z2,
  harbor) with frame-time budgets, run before every merge.
- The 2D client's golden gate stays green for the whole program; the 3D client
  never touches `render/renderer.ts`.
- Art parity is by eye against the 2D client's screenshots of the same scene;
  the 3D client is allowed to look *better*, never wrong.

---

## 8. Risks

- **Art cohesion (the July objection).** 2D characters against 3D buildings.
  Mitigation: the spike's Phase 3 (outline ring on everything, uniform lighting,
  tilt-shift) improved it markedly; the 3D client should reach that state in
  Workstream 3 before any judgment is passed, and the owner judges on real
  scenes.
- **Two clients to maintain.** Real, but smaller than it sounds: the renderer is
  the only duplicated layer, and the 2D renderer is already the maintenance
  burden it is. Content, UI, net, and painters are shared. The cost that
  disappears — a dead mode inside the hot path — is larger.
- **Painter throughput for animated bodies.** Per-frame canvas → texture for
  every visible animated entity is the same cost the 2D client pays today,
  plus an upload; the spike measured it acceptable. If it is not at scale,
  the fix is GPU skinning of the rig (a later epic), not a return to caching
  frames.
- **Bundle size.** Three.js adds ~600 KB min; the 3D client is a separate entry
  so Classic does not pay it.
- **Mass (§6.3).** ~200k lines of emission and FX code is authored against
  the 2.5D frame and will be re-emitted, not imported. This is the real cost
  of the program and the reason the 3D client must be a registry-driven
  adapter over shared painters rather than a port. The alternative — keep
  bolting perspective onto the painter — was tried for four days by a
  disciplined team and produced 11 fps and an open-ended regression list.
- **Schedule.** The July estimate for a full rebuild was "months" at one
  tenth of today's art surface. Treat "months" as the floor for total parity.
  Workstream 0 is days. Workstream 1-2 to a playable Dawnmead at 60 fps on the
  M4 is the first real checkpoint and the only point at which to re-estimate;
  do not price the whole program before it.

---

## 9. Decision requested

1. Approve Workstream 0 (remove the lean from the 2D client). Reversible by git,
   byte-identical by gate.
2. Approve Workstream 1 as a spike-to-skeleton on a branch (`epic/play3d`),
   with the M4 fps gate as its exit criterion.
3. Confirm Three.js as the engine (vs. raw WebGL2/WebGPU on `glStage`).
