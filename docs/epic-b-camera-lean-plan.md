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
