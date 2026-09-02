# THE CAMERA LEARNS TO LEAN — Epic B plan

*Branch `epic/foundations` → its own `epic/camera-lean` when green-lit.
Companion to `docs/gpu-foundation-plan.md` (the memory + backend
foundation this epic spends) and `docs/webgpu-seam-conformance.md`.*

Status: **PLAN — awaiting green-light.** Nothing here is built. This is
the largest single change in the renderer's history; it earns a plan
before a line of code, and a phasing where **every band is byte-identical
to today until the lean is deliberately turned on**.

---

## §0. What it is, and why the foundation made it possible

Today the world is drawn by a **pitched *orthographic* camera**
(`Camera.worldToScreen`, renderer.ts:1002): purely affine, the depth axis
uniformly squashed by `yScale = 0.6` (≈ a camera 37° above the horizon),
heights drawn at full scale. A tile maps to a screen-aligned **rectangle**
— which is why every ground blit is an axis-aligned `drawImage` and why
`StageQuad.m` is a 6-float affine with the shader's `w` hard-wired to 1.

Epic B is the leap from **orthographic-tilt to perspective-tilt**: the
ground plane recedes *non-uniformly* toward a horizon, distant things
scale down with depth, and the world gains the grandeur and read of a
camera that leans into the scene. It is the visual payoff the whole GPU
foundation (A1 ceiling, A2 DPR cap, B2 ground cache, C1 seam) was built
to afford — a pitched frame draws **more** of the world (out to the
horizon), so it needs the memory headroom and the backend-ready seam
already in place.

The geometry is a **GL vertex-shader change** — fully verifiable in our
rig. WebGPU (C-workstream) is deferred; it buys the *compute* later
(lighting in the warped space, ground meshing), not the pitch itself.

---

## §1. The camera today, and the two scaffolds already in the tree

- **The projection** (renderer.ts:1002-1021): `x = wx·scale + ox`,
  `y = wy·scale·yScale + oy`, `yScale = 0.6` constant. Affine, invertible
  by division. The whole renderer is built on this being affine —
  hundreds of sites (§4).
- **Scaffold 1 — `PERSP_LEAN`** (renderer.ts:573, currently **`0`**):
  a disabled per-vertex *horizontal* lean of tall geometry about screen
  center (`leanX`, `beginHeightLayer`). The intended lever — but a partial
  one (horizontal-only, not a ground homography).
- **Scaffold 2 — two GL stages** (renderer.ts:13995 ground, :14032
  world). The ground stage draws flat chunk quads; the world stage draws
  the y-sorted sprites + elevated row-slices. **This split is the epic's
  gift**: the ground stage can own the perspective warp while the world
  stage keeps billboards.
- **The trap — `staticLayerOn()`** (renderer.ts:9237) is
  `cameraOverride === null && PERSP_LEAN === 0`: **the entire static
  band-bake cache fuses OFF the instant any lean is enabled** (a bake
  would freeze the lean about its own canvas center). See §5-B.

---

## §2. The camera model — a homography with one lean parameter

The lean is a **3×3 homography** (projective transform of the ground
plane), tuned by a single scalar `q`:

```
[sx·w]   [ scale     0        ox ] [wx]
[sy·w] = [ 0     scale·yScale  oy ] [wy]        sx = sx·w / w,  sy = sy·w / w
[  w ]   [ 0         q          1 ] [ 1]        depthScale(wy) = 1 / w
```

- **`w = q·(wy − wy_focus) + 1`.** At **`q = 0` → `w = 1`**: the divide
  vanishes and this is *exactly today's affine projection*. This is the
  invariant the whole epic rests on — **`q=0` is byte-identical to
  today**, so every band ships parity-clean and the lean is a dial.
- `q > 0` recedes the ground: distant rows (larger `wy`) get larger `w`,
  divided down → compressed and smaller, converging toward a **horizon**
  (the line `w → 0⁺`). `q` is clamped so the horizon sits above the
  viewport in the first milestone (no sky needed yet — see §9).
- **`depthScale = 1/w`** is the one factor threaded everywhere a size or
  height lives: sprite scale, elevation lift, shadow radius, grass height.
- **`screenToWorld` becomes the inverse homography** (picking). Non-
  trivial; test-pinned (§4-INVERSE).

**Two hard commitments, both load-bearing:**
- **PITCH ONLY — no yaw, no roll.** With pure pitch, raising a point by
  height `h` is still a *pure vertical* screen shift (magnitude depth-
  scaled), and camera-depth stays monotonic in world-`wy`. This preserves
  the Y-sort comparator and the elevation model unchanged (§7). *Any* yaw
  breaks both. Epic B is a lean, not a free camera.
- **Moderate, clamped `q`.** A full perspective makes distant targets
  unreadably small — wrong for an MMO. The lean is tuned for depth and
  grandeur while the play area stays legible; `q` can be zone-driven
  (dramatic in a vista, flat in a dungeon) and player-capped.

---

## §3. Rendering architecture — ground warps, sprites billboard

The frame splits cleanly along the existing two-stage seam:

**Ground / surfaces → shader-owned perspective.** A flat tile becomes a
**trapezoid** under perspective, and two things make the affine path
impossible: `m` (2×3 affine) maps rectangles only to parallelograms, and
even a correct per-corner projection would interpolate the texture
*linearly in screen space* — the PS1 "texture swim". Both are solved by
letting `gl_Position.w` carry the perspective: the GPU then samples the
baked chunk **perspective-correct for free**. Concretely:
- `StageQuad` gains a **`space: 'screen' | 'ground'`** discriminator.
  Screen-space quads keep today's affine `w=1` path **unchanged**
  (sprites, UI, particles — zero regression). Ground-space quads carry
  **world-plane geometry** and go through a perspective vertex path with a
  per-frame `uProj` homography uniform (identity at `q=0`).
- **Per-vertex projection, not per-corner.** Foreshortening *within* a
  32-tile chunk is nonlinear; projecting only 4 corners and letting the
  GPU interpolate linearly would visibly bow. The vertex shader projects
  each submitted world vertex with its own `w`. (A CPU N×N sub-mesh is the
  fallback if a single quad's precision disappoints.)
- Batching (`stageBatch`) already partitions runs by state, so screen and
  ground spaces form separate runs automatically.

**Sprites / bodies → billboards, CPU-projected.** A sprite projects its
**foot anchor** through the same homography and scales by
`s = camera.scale · depthScale(footY)` — **one multiply** at
renderer.ts:19814, because `s` is already the single scalar every rig
measurement is relative to. The billboard stays upright (single depth-
scale picked at the foot — the standard, correct trade-off). Position and
scale both slot in with almost no new plumbing. This is the payoff of the
renderer's long-held "one `s`" discipline.

---

## §4. The blast radius, classified

The recon mapped every world↔screen site. Three classes:

**POINT — auto-inherits the new `worldToScreen` (≈ zero porting):**
sprites/bodies (all mob families, mounts, seats), particles/debris/birds/
projectiles/FX (via `liftedWTSScratch`), footprints, hudOverlay + all UI
anchors (nameplates, speech bubbles, waypoints, markers, reach rings),
rockArt bodies. *Caveat:* each still applies affine `·scale` height
offsets and `syT = s·yScale` squash that become **depth-dependent** — the
`depthScale` thread reaches them.

**SURFACE — hard porting (interpolates/blits across world coords):**
- ground chunks + the whole `terrain.ts` bake pipeline (uniform-`px`
  canvases blitted whole),
- elevated terrain + **cliffArt.ts** (face curtains span two projected
  corners by screen-lerp — the heaviest surface), waterfalls,
- grass sprite bakes (per-tile constant affine frame),
- water reflection matrix (renderer.ts:4421) + waterfalls matrices,
- shadow edge quads,
- walls / **garrisonArt** masonry runs / decor run-spanning surfaces.

**INVERSE — assumes affine invertibility (needs rework + tests):**
`screenToWorld` (1016) → `pickWorld` (4147) → `solveLiftedY`, and
`visibleTileBounds` (7093, whose culling rect becomes a **trapezoid to
the horizon**). ~15 external consumers (input, editor, groundAim, rockArt
glow-reproject — which already warns of a lift-doubling hazard).

---

## §5. The two hard problems

### A · The parity oracle can't draw a trapezoid
The canvas2d backend is the 3-way parity **oracle** — and canvas2d
`setTransform` is **affine-only**: one `drawImage` cannot draw a
perspective-correct trapezoid. This is the real friction of Epic B (not
GL — GL does perspective natively). To keep the oracle honest at `q>0`,
the canvas ground path must **mesh-subdivide** each ground quad into small
affine sub-tiles (approaching perspective as the mesh refines) or accept a
**documented, bounded affine approximation** for the oracle's ground.
Its own workstream; the plan does not hand-wave it. (At `q=0` the oracle
is unchanged and byte-exact — parity holds throughout development.)

### B · The static-layer cache fuses off under lean
`staticLayerOn()` disables the static band-bake cache when a lean is on —
a **major perf system** (the band bakes that turn thousands of vector
draws into cached blits). A leaned frame either (a) **reworks the static
cache to be perspective-aware** (bake in a pre-projection space, warp on
composite — hard), or (b) **accepts its loss under lean** and pays with
the render-perf work (more live draws, leaning on the GPU foundation +
distance demotion). The plan sizes both; (b) first (accept + measure),
(a) if the field demands it.

---

## §6. Completeness hazards

The pitch constant `0.6` is **duplicated outside the camera** and will
NOT track a perspective camera — each must be hand-ported:
`birds.ts YSQ=0.6`, `terrain.ts FLAT=0.6` (+ raw 0.6/0.65), `portal.ts
FLAT=0.6`, **`lighting.ts` reconstructs the affine camera as a 2×3 matrix
by hand** (304-308), `reveal.ts wallCover`, `emitters.ts`. And the
`PERSP_LEAN`/`leanX` scaffold must be reconciled with the homography
(extend it into the vertical model, or retire it in favor of `uProj`).
A grep-complete port of every `yScale` / `0.6` / hand-built matrix is a
named checklist item, not an afterthought.

---

## §7. Y-sort & elevation under perspective — they survive

- **Y-sort:** `DRAW_ORDER = SHELF(strat) || sortY`, `sortY` = raw world
  row. For pure pitch, depth is monotonic in `wy`, so the comparator is
  **unchanged**. (Yaw would force a true camera-depth key — hence pitch-
  only.)
- **Elevation:** the per-row-quad architecture (one quad per elevated row,
  renderer.ts:4156) is *exactly* what perspective wants — each row warps
  as its own ground quad and lifts by its own depth-scaled offset
  (`level·ELEV_H·s·depthScale(row)`), so a tall plateau foreshortens
  correctly for free. The **vertical cliff faces / walls** that connect a
  crown to its base (extruded quads spanning two depths) are the messiest
  sub-case — their own band (§9, B-3).

---

## §8. GL now, WebGPU later

**All of the above is a GL vertex-shader change, verifiable in our rig:**
the perspective vertex path, the `space` discriminator, depth-scaled
billboards/lift/shadows, per-tile grass re-projection, the inverse
homography. **WebGPU/compute is genuinely deferred** — it is only pulled
in later for (i) high-density ground meshing/displacement, (ii) per-
fragment lighting recomputed in the warped space (today's exposure is CPU-
baked), (iii) a depth-buffer sort replacing painter's order. None are
needed for the lean. Epic B proceeds on GL; the C-workstream (WebGPU)
rejoins for lighting when a WebGPU verification environment exists.

---

## §9. Phasing — the lean is off until the machinery is whole

The invariant across every band: **`q=0` is byte-identical to today**
(parity 7/7 holds throughout). The lean turns on only when ground and
sprites can agree.

- **B-0** — this plan.
- **B-1 · THE HOMOGRAPHY (machinery, `q=0`).** The homography
  `worldToScreen`/`screenToWorld` + `depthScale` (q param, default 0). All
  POINT lanes auto-inherit; sprite `s`, elevation lift, shadows take the
  `depthScale` thread. `StageQuad.space` + the ground `uProj` uniform
  (identity) + ground quads submitting world-plane geometry through the
  perspective vertex path. Canvas-oracle ground mesh-subdivision (so
  `q>0` is later provable). **GATE: `q=0` parity 7/7 byte-identical,
  fringe-seam, ui-smoke, full suite.** The pipeline becomes perspective-
  capable while rendering identically. (Large — may split B-1a points /
  B-1b ground+oracle.)
- **B-2 · THE LEAN TURNS ON.** Raise `q` to a moderate, clamped lean;
  tune it; screenshot-judged craft. Readability pass; horizon held above
  the viewport (no sky yet). Settings/zone-driven `q`. **GATE: screenshot
  A/B sign-off + subdivided-oracle parity at `q>0`.**
- **B-3 · VERTICAL SURFACES.** Cliff faces, walls, waterfalls, garrison
  masonry — the extruded two-depth quads.
- **B-4 · THE CONSTANTS & LIGHTING.** Port `lighting.ts`'s hand-built
  matrix, every scattered `0.6`/`FLAT`/`YSQ`, grass tile frames, the
  water matrix, reveal/emitters. Reconcile/retire `PERSP_LEAN`.
- **B-5 · HORIZON, SKY & THE CINEMATIC LEAN.** Push `q` to a visible
  horizon where zones warrant: sky/atmosphere art, distance haze, zone-
  driven pitch. The full payoff.
- **B-6 · PERF UNDER PERSPECTIVE.** The trapezoid frustum reveals many
  more (distant) chunks → distance/zoom **ppt demotion** (the churn-free
  B3 lever from the ground-cache work), the A1/A2 foundation at scale, and
  the §5-B static-cache decision validated in the field.

**The moderate-lean milestone = B-1…B-4** (correct perspective, horizon
off-screen). B-5 is the cinematic extension; B-6 rides alongside.

---

## §10. Risks, gates, honest scope

| Risk | Mitigation | Kill criterion |
|------|------------|----------------|
| Enormous blast radius (hundreds of sites) | The `q=0`-identical invariant + POINT auto-inherit shrink it; SURFACE lanes ported one band at a time behind the dial | If a band can't hold `q=0` parity, it doesn't ship |
| Parity oracle can't warp (§5-A) | Mesh-subdivide the canvas ground; bound the approximation and document it | If subdivision can't get the oracle within tolerance, `q>0` parity moves to screenshot-only for ground, GL-vs-GL for the rest |
| Static cache lost under lean (§5-B) | Accept + measure first; rework only if the field needs it | If perf is unacceptable and rework too costly, cap `q` where the live-draw budget holds |
| Readability at depth | Moderate clamped `q`, zone-driven, player-capped | If any `q>0` hurts play, ship it as an off-by-default cinematic toggle |
| Missed projection site (a thing renders in the wrong place) | The §4 grep-complete inventory + `q=0` parity catches drift | — |
| Scope vs schedule | Milestone at B-4; B-5/B-6 independently deferrable | Ship the moderate lean; defer the cinematic horizon |

**Honest scope:** this is a **multi-band, multi-week epic** — the largest
in the project. It is made *safe* by the `q=0` invariant (it can be
developed on `main` for weeks without ever changing the shipping frame)
and *tractable* by the classification (most lanes auto-inherit; the hard
work is the ground surface + the oracle + the static cache). Gates every
band: `q=0` parity 7/7, fringe-seam, ui-smoke, full suite, cycles; `q>0`
screenshot craft + subdivided oracle; big-window memory + perf under the
wider frustum.

*Standing probes it will lean on: stage-parity (the `q=0` invariant),
ground-cache (the wider frustum's memory), the screenshot A/B rigs.*

---

## §A · B-1b implementation spec (the ground shader) — worked out

*Design pinned during B-1 so the epic's heaviest band starts from a spec,
not a blank page. The recon-verified crux: the affine `m` can't make a
trapezoid, and per-corner LINEAR UV interpolation would swim (PS1-style).
Real `gl_Position.w` fixes both — and for a PLANAR ground quad, hardware
perspective-correct interpolation makes **4 corners sufficient** (no GL-
side subdivision). The friction is entirely on the canvas oracle.*

**Two regimes, because of the device-px snap law.** The shared-corner
snap (round screen corners to whole device px so neighbours share edges,
no hairline) is done on the CPU today. Perspective must project shared
WORLD corners deterministically instead (same world corner → same screen
point for both neighbours; linear filtering hides the sub-pixel edge). So:
- **q=0 keeps the old path verbatim** — CPU affine + snap, screen-space
  affine quad. Byte-identical (the shipping frame). The perspective code
  is dormant.
- **q>0 takes the ground path** — no screen-snap; deterministic
  per-vertex projection.

**The GL ground path.**
1. `StageQuad` gains `space?: 'screen' | 'ground'` (default screen); the
   batcher (`computeRuns`) adds `space` to the run key, so ground and
   screen quads form separate runs (node-testable).
2. A ground quad carries the **four world-plane corners** (not an affine
   `m`); the renderer projects each corner through the perspective
   `worldToScreen` (from B-1) to a screen position, and computes its
   perspective weight `w = 1/depthScale(corner)`.
3. The GL vertex pipeline gains a per-vertex `w`: `gl_Position =
   vec4(clip.xy * w, 0.0, w)`. After the divide, `xy = clip`; the UVs
   interpolate **perspective-correct** with weight `w`. At `w = 1`
   (screen quads, and ground quads at q=0) this is exactly today's
   `vec4(clip, 0, 1)` — byte-identical. Screen quads always pass `w=1`.
   (Ground quads are few — chunk-count — so the +4 bytes/vertex rides a
   cold lane; the hot screen lane can keep the 20-byte format via a
   default-1 path or a second program, whichever measures cleaner.)

**The canvas oracle — the real work.** canvas2d `setTransform` is affine-
only, so a ground quad at q>0 is drawn by **mesh-subdividing** into an
N×N grid of small affine sub-tiles (each near-affine at that scale;
error → 0 as N grows) with matching source sub-rects. N chosen so the
oracle is within parity tolerance of the GL trapezoid; documented and
bounded. At q=0 the oracle draws the screen-space quad unchanged.

**Verification (no game lean needed).** Extend the stagelab battery with
a **q>0 ground-quad case**: one textured ground quad at a real lean,
rendered on GL (perspective-correct) vs the canvas oracle (subdivided),
pixel-compared. This proves the perspective raster + the oracle agree in
isolation — the C1 three-way discipline, one backend pair at a time —
before the renderer emits a single ground quad or `q` ever leaves 0.

**Renderer wiring (B-1b-ii).** `drawGroundChunks` / `stageEmitChunk`
emit `space:'ground'` quads carrying world corners when `q>0`, the old
snapped screen quads when `q=0`. Elevated row-slices (already per-row
world quads) follow the same shape — their per-row depth-scaled lift
(§7) composes with the ground path.

**Gate.** q=0 parity 7/7 byte-identical (dormant path); stagelab q>0
ground case GL↔oracle within tolerance; the batcher run-separation test;
fringe-seam, ui-smoke, full suite.

---

## §B · Progress (as-built)

The MACHINERY is built and the lean is still OFF — `q = 0` /
`PERSP_LEAN = 0`, so every band below is byte-identical to the shipping
ortho frame until B-2 raises `q`.

- **B-1 (2cf4d80c)** — the homography camera at q=0. `cameraProject.ts`
  (pure, tested), `Camera.q`/`depthScale`, delegated projection. Byte-
  identical; unit tests; parity 7/7. Exact closed-form inverse.
- **B-1b core (b3aeb62c)** — the GL vertex pipeline gains a per-vertex
  `w` (vertex 20→24B, attr `aW`, `gl_Position = vec4(c·aW, 0, aW)`).
  aW=1 byte-identical; perspective-CAPABLE (HW perspective-correct interp
  → 4 ground corners suffice, no subdivision, no swim).
- **B-1b-ii (38d96d1a)** — THE GROUND PLANE LEANS (screenshot-proven).
  `StageQuad.ground` = 4 world corners + weights; `drawGroundChunks`
  projects them at q>0 (shared-corner-deterministic → seam-free). q=0
  byte-identical; q>0 the ground recedes correctly.
- **B-1c (0c97fcf9)** — CREATURES FORESHORTEN. `spriteScale(footY)` =
  `scale·depthScale(footY)` threaded into humanoid / npc / downed-beast /
  legless / owl / corpse bodies + the reveal box. q=0 byte-identical.
- **Frustum fix (36513872)** — `visibleTileBounds` is perspective-aware
  (unproject 4 screen corners, `FRUSTUM_FAR_MULT=3`) → no horizon holes
  at q>0; q=0 byte-identical; the forest recedes with no pop.
- **THE GRASS LEVER (this session — `gpu-grass-proposal.md`).** The
  meadow is the heaviest per-tile pass and the wider frustum's worst-hit
  content, so it was the first thing the lean needed off the CPU. Moved
  to GPU instances: blocky flat-vector blades bending to the ONE WIND
  (ported to GLSL, pinned == CPU), trample, flowers & seed-heads — in the
  live game behind `?grass=gpu`, world-lit, camera-matrix driven, **61 fps
  in dense scenes**, byte-identical with the flag off. The tall-grass
  walk-through was built, **measured (~30% fps regression from per-band
  GPU→2d syncs), and reverted** — it needs entities on the GPU (see §C
  Group 7), a finding that shapes the rest of the epic.

## §C · Remaining work & division

Grouped so independent lanes can run in parallel; every Group-1/2 item is
`q=0` byte-identical until B-2.

**Group 1 — THE DEPTH THREAD (POINT sprites still on plain `camera.scale`;
thread `spriteScale(footY)` exactly as B-1c did).** Highly parallelizable
— each sprite family is an independent site-survey + one-multiply.
- **Trees, saplings & flora** — `drawTree` (renderer.ts:16667) uses
  `const s = camera.scale`; under the lean a distant tree must shrink like
  a distant creature. The biggest visual item — tall, and the wider
  frustum stacks more of them to the horizon. Includes tree/throw shadows.
- **FX / particles / matter** (dust, fire, frost), **projectiles**, ground
  decals — most inherit `worldToScreen` for position but still apply an
  affine `·scale` height; thread the depth factor.
- **Props** — summon/drop/gravestone, standing decor, rockArt bodies.
- **Elevated-row content** — sprites on plateaus/upper bands.

**Group 2 — SURFACE porting (B-3 vertical surfaces).** The hard, structural
class — they interpolate/blit across world coords, so each needs the
ground-quad per-vertex-`w` treatment or a CPU sub-mesh:
- **cliffArt** face curtains (span two projected corners by screen-lerp —
  the heaviest surface), **waterfalls**,
- **walls / garrisonArt** masonry runs, run-spanning decor,
- elevated terrain bake, the **water reflection** matrix, shadow edge quads.

**Group 3 — THE TWO HARD PROBLEMS (gate q>0 correctness).**
- **§5-A** the canvas parity oracle can't draw a trapezoid → mesh-subdivide
  the oracle for q>0 parity (B-1b-iii).
- **§5-B** the static-layer cache fuses OFF under lean (`staticLayerOn`
  keys on `PERSP_LEAN`, not `camera.q`) → walls draw un-leaned at q>0.

**Group 4 — INVERSE.** `screenToWorld`→`pickWorld`→`solveLiftedY` and the
`visibleTileBounds` culling trapezoid, plus ~15 consumers (input, editor,
groundAim, rockArt glow-reproject). Needs rework + tests.

**Group 5 — B-6 PERF (the gate the lean turns on behind).** The trapezoid
frustum reveals far more content. Grass was the first lever; still needed:
distance LOD / ppt demotion (B-3), memoize the per-row projection in hot
loops, and re-measure fps at a moderate `q`.

**Group 6 — B-4 CONSTANTS & LIGHTING, then B-2 TURNS `q` ON.** Port
`lighting.ts`'s hand-built world→screen constants to the homography, then
raise `q` to a moderate, clamped, settings/zone-driven lean. **The
moderate-lean MILESTONE = B-1…B-4.**

**Group 7 — ENTITIES ON THE GPU STAGE (cross-cutting enabler).** The
grass walk-through finding showed that grass and bodies must depth-sort in
ONE GPU pass for correct+fast interleave. Moving entities onto the stage
world lane unlocks that walk-through AND is part of the B-6 perf story. A
larger architectural thread; sequence after the moderate-lean milestone or
alongside B-6.

**Recommended next:** Group 1 (the depth thread — trees/foliage/FX/props),
because it directly answers "the lean makes creatures foreshorten but not
the trees around them," it's `q=0` byte-identical, and it divvies cleanly
across sprite families. Then Group 3 (§5-B is a small, high-leverage fix)
and a B-6 perf pass at a trial `q`, before B-2 turns the lean on.

## §D · B-6 perf findings (measured 2026-09-02)

A read-only investigation (headless rig, forest + meadow, q swept 0 →
0.0016) settled where the lean's cost is:

**The cost is the WIDER FRUSTUM drawing more content, not the projection
math.** `visibleTileBounds` becomes the AABB of the unprojected trapezoid:
measured **5.8× tiles** at q=0.0016 (E-W span uncapped fans 3.5×, north
capped at FRUSTUM_FAR_MULT=3). Frame time tracked tile COUNT: forest
8.4→18.8 ms as q rose. The q>0 `projectWorld` divide is ~free — at
q=0.0004 (+30% tiles, every call on the divide branch) frame time didn't
move; only tile count moves it. **Do not micro-optimize the divide.**

**The ?perf HUD hides the GPU cost.** `perfMark` phases time only main-
thread CPU between marks; GPU raster + stage composite + present happen
after `render()` returns and show ONLY in `frameEma` (and `frameEma −
Σ phaseMs`, the uncounted gap). On a fill-bound machine the q>0 cost lands
entirely there. Measure with `frameEma`, `visibleTileBounds()` tile count,
`liveStats.offscreen`, and the stage draw-call/upload rows — not the phase
rows alone.

**Ranked levers (impact × risk):**
1. ✅ **DONE (0bdf9274)** — cap the meadow E-W to the ortho reach. Killed
   the `grass over` spill (the +8ms ground spike), byte-identical at q=0.
2. **Tighten FRUSTUM_FAR_MULT + horizon fog** — shrink the AABB directly;
   fog lets far tiles both fade and stop drawing. Ship fog + cap together
   (a tighter cap alone risks holes near the top). Attacks CPU AABB AND
   the uncounted GPU-fill cost.
3. **Distance LOD (bakePx tiers)** — far rows compress to a few px but blit
   full-res baked chunks; a coarser tier past the ortho reach cuts fill +
   upload bytes. Needs hysteresis vs bake-pool thrash.
4. **Cull trees/props by projected screen size** — `liveStats.offscreen`
   went 157→810; a `camDepthAt(wy)` gate drops them before build/sort.
5. **Memoize per-row projection** — low impact (divide is cheap); optional
   cleanup only.

Order for the rest of B-6: 2+3 with the horizon fog, then 4; 5 last.

## §E · B-3 surface status (2026-09-02)

B-3 splits into two classes:

**PER-TILE verticals — DONE (foreshorten by base depthScale, like B-1c).**
Each is drawn at ONE tile anchor (base on the leaned ground, rising by
`s`), so `s = spriteScale(anchor.y)` shrinks its height with depth;
byte-identical at q=0. Threaded: wallItem (1bfd5525), diagWall, doorway,
arch, portal, pillar, rail (a7a26ae4). Verified: a wall run foreshortens
and stays connected (per-tile depthScale changes slowly ⇒ no visible step
at moderate q).

**SPANNING surfaces — REMAINING (the per-vertex warp, a dedicated pass).**
These interpolate a face/run ACROSS world coords between two corners at
DIFFERENT depths, so a single `s` is wrong — each corner needs its own
depthScale and the quad becomes a trapezoid:
- `cliffFaceItem` (cliffArt.ts:465) — curtain height `topLift/baseLift =
  level·ELEV_H·s`; warp = per-corner `spriteScale(cornerA.y)` vs
  `spriteScale(cornerB.y)` for the top edge (a trapezoid curtain). CACHED
  (curtain sprites via the memo + fit.pb bbox), so the warp applies at the
  corner projection, and the cache key/bbox must follow — the heaviest,
  most careful piece.
- `emitCliffSideRun` (side runs), the north/south FALLS, `deckFillRailItem`
  (diagonal rail run between corner anchors), `rampItem`/`rampLandingItem`/
  `rampApronItem` (sloped deck surfaces spanning tiles) — same per-corner
  treatment.
- WATER: `drawReflections` reflection matrix + `drawWadeUnderlays` +
  waterfall sheets — the reflection transform must fold the homography.

Approach for the pass: give each spanning surface per-corner
`spriteScale(corner.y)` for its vertical extent and project both corners
through the homography (worldToScreen already does), so the face reads as a
trapezoid. Test-scene finding: reliable cliff/ramp scenes are hard to reach
by /tp — build a fixed probe that scans for Cliff/ramp tiles and frames one
before this pass. At a MODERATE lean the un-warped spanning heights are
tolerable (a distant cliff slightly too tall), so this is a polish pass,
not a B-2 blocker.
