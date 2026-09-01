# THE PAINTED WORLD TAKES THE STAGE — the WebGL compositor and the tilting camera

Two epics, one architecture, planned together so the second is cheap
because the first was built right.

- **Epic A — THE COMPOSED FRAME**: canvas2d stays the paint factory;
  WebGL2 replaces the per-frame composite. Pixel-parity target at the
  current camera. Removes the canvas2d entity ceiling (~3-4µs per
  native call, no batching) that fourteen render-perf rounds have now
  driven to its floor.
- **Epic B — THE CAMERA LEARNS TO LEAN**: the fixed anisotropic
  projection becomes one setting of a parameterized camera. Pitch and
  horizon adjust within a clamped range; the default frame is
  bit-comparable to today's.

Branch: `epic/painted-stage`, worked in its own worktree
(`../devcraft-stage`) so the shared main checkout never moves under
the live content sessions. Owner reviews this plan, then green-lights
phase work on this branch. Main remains the product throughout;
nothing merges without its gate (§7).

---

## 0. The decision record

This plan reopens — deliberately, at the owner's request on
2026-08-31 — the question the `explore/3d-billboard` spike closed on
2026-07-20. What that spike rejected was specific: an HD-2D hybrid
where the WORLD became real 3D geometry (log-cylinder walls, masonry
prisms) against 2D billboard characters — "3D world vs 2D sprite
characters never fused" — and a full low-poly rebuild priced in
months. What this plan proposes is the third shape the spike never
landed on: **nothing becomes geometry.** Every visible thing remains
the painted 2D art it is today — ground as textures on a plane,
standing content as upright painted quads — and only the compositor
and the camera become real. The fusion objection cannot arise, because
there is nothing to fuse against.

Facts the spike proved that this plan builds on (banked in
`3d-billboard-exploration.md`, branch preserved):

- The sim, server, content, netcode, and the entire rig/gait layer
  (`drawHumanoid`, `LegRig`, `CapeSim`, wind) are renderer-agnostic.
- `bakeChunk` bakes SQUARE world pixels — the yScale squash only ever
  lived in the blit. Ground art ports to a plane as-is.
- The outline ring, tilt-shift post (with the sRGB re-encode gotcha),
  and the shadow-proxy technique all ported and read correctly.

What has changed since July, and why the price fell: render-perf
rounds 5–14 built THE STANDING WORLD and its descendants. The frame is
no longer an immediate-mode painting; it is already, at steady state,
**a y-sorted list of cached rasters** — chunk canvases, wall/cliff
bands, grass row cells, tree/prop/flora sprites, shadow sprites and
masks — each with a byte ledger, an admission gate, a pool, and a
live-path fallback. That is a texture pipeline with the word "texture"
missing. Epic A supplies the word.

---

## 1. The thesis, and the laws that do not move

**Canvas2d paints; WebGL composites.** The painters — every procedural
brush from `paintTree` to the wall crowns to `drawHumanoid` — are the
art. They are not ported, not approximated, not redrawn in shaders.
They keep painting into canvases exactly as today. The compositor's
only job is to put those canvases on screen as textured quads, in the
exact order the y-sort dictates, under the exact blends the frame
already uses. The GPU is a stagehand, not a painter.

Standing laws that bind every phase:

1. **THE STILL-WORLD BARGAIN, generalized**: a texture is a cache,
   never a mode. Correctness never depends on a texture existing —
   anything the GPU lane cannot serve THIS frame paints through the
   canvas2d live path exactly as today. (Mechanically: the frame can
   always fall back per-item to the scratch-quad lane, §3-A2, or
   wholesale to the canvas2d backend.)
2. **THE TOGGLE IS THE PRODUCT'S SAFETY**: the canvas2d renderer is
   not deleted, deprecated, or allowed to rot. It is the fallback for
   context loss, for GL initialization failure, for any player who
   flips the Display toggle, and the parity oracle for every proof.
   Both backends compile from the same draw-item stream.
3. **NOTHING HEAVY RUNS OUTSIDE A BUDGET**: texture uploads are the
   compositor's version of bakes and ride the same admission
   arithmetic (visible-now pays once; ring work is paced; budgets in
   ms AND bytes).
4. **ONE LIFECYCLE**: a texture is the shadow of its canvas. It is
   created when the cache entry's canvas is (re)painted, updated by
   subrect when the canvas is, and dies in `dropBand`/
   `recycleBakedEntry`/`dropRowSprite`/the sprite evictors — the
   caches stay the owners, the ledgers stay exact, and there is no
   second bookkeeping system to drift (round 10's phantom-ledger class
   is unrepresentable by construction).
5. **THE RESOLUTION IS A CONSTANT**: native device pixels, always.
   The DEVICE GRID law survives verbatim — quads snap on the backing
   lattice; the compositor's projection reproduces `snapPx` exactly at
   the default camera.
6. **PARITY OR IT DIDN'T HAPPEN**: every phase lands with a
   pixel-diff against the canvas2d backend under a null control
   (round 9's law), same-scene interleaved timing, and the eyeball
   pass. A phase that cannot prove parity does not merge.
7. **NEVER `git stash`; the worktree is the isolation.** The shared
   checkout on main belongs to the content sessions.

---

## 2. As-is inventory (measured, not remembered)

### 2.1 The frame, today

Phases per `?perf`: grid → chunks (ground blits) → ground (water,
grass under-layer) → collect → sort → cull → world (y-sorted items) →
lighting → post. One main canvas plus 11 auxiliary canvases (shadow
layer, overreach, tilt scratch, outline scratch pair, light map, grass
calm-shade, reflection scratch, mask bakes, …).

Steady-state composite volume (rounds 13–14 censuses, 1500×900 @dpr2):

| scene | drawImage/frame | transforms | ~Mpx blitted |
|---|---|---|---|
| dense forest | ~1,030 | ~1,120 | ~180 (post-R9) |
| avenue | ~510 | ~380 | — |
| crown | ~640 | ~380 | — |
| graveyard | ~560 | ~370 | — |

Plus ~10–15 full-screen canvas passes per frame: the shadow-layer
composite, the lightmap multiply, the overreach soft-light (night),
tilt-shift (1 downsample + banded upsamples — a full-canvas SELF-READ),
grade (sky gradient + soft-light + vignette), reflections replay.
These are the fill-rate load that flattens weak GPUs' canvas backends;
on the compositor they become FBO passes and stop being interesting.

### 2.2 Texture sources (what the compositor consumes)

| source | unit size | count on screen | churn | ledger today |
|---|---|---|---|---|
| chunk canvases (`baked`) | 4.3MB @32px, 17MB @64px tier (+ lifted levels) | 12–35 | ~0 steady; streaming on walk | 192MB bytes + 12-slot pool |
| wall/cliff bands (`bandCache`, `cliffSprites`) | 0.1–8MB | 60–90 buckets | ~0 steady; cut bakes on settle | 128MB bytes + pooled |
| tree/prop/flora sprites + shadow sprites | 10–500KB | 300–900 | cadence re-bakes ~12/frame | slot+shape-class pools |
| grass row cells (R13) | ~0.3–1MB | 90–150 | adaptive cadence, ~0–6 bakes/frame | 128MB bytes + class pool |
| grass calm-shade canvas | viewport-sized | 1 | 66ms beat | reused pair |
| shadow masks (`shadowMasks`) | ~50–200KB | ≤320 LRU | ~0 steady | slot cap |
| glow sprites | small | dozens (night) | ~0 | keyed memo |
| entity bodies | ~128–256px² each | 5–70 | EVERY FRAME (live-painted rigs) | none — currently painted direct |
| live-path fallbacks (`live prop/tree/…`) | any | ~0 steady, bursts on arrival | by definition | n/a |
| water surface (`WaterBuckets`) | n/a — live strokes | rivers/falls | every frame, by design | n/a |
| particles/debris/footprints | vector bulk lanes | 100s–1000s | every frame | pooled records |
| in-canvas text (nameplates/labels, 25 `fillText` sites) | small | dozens | on change | none |

### 2.3 Blend census (render path, measured)

`source-over` ×25, `source-in` ×11, `lighter` ×10, `destination-out`
×5, `screen` ×4, `destination-in` ×4, `soft-light` ×2, `source-atop`,
`multiply`, `destination-over` ×1 each. **The split that matters**:
most of the exotic modes (`source-in`, `destination-in`,
`source-atop`) live inside BAKE ceremonies — canvas-side, in the paint
factory, untouched. The composite path needs: `source-over`,
`lighter`, `screen`, `multiply` (lightmap), `destination-out` (the
interior shadow punch), `destination-over` (rare), all expressible as
fixed-function `blendFunc`/`blendEquation` on premultiplied alpha —
and `soft-light` (grade, overreach), which is not fixed-function and
gets a tiny two-texture shader in the post pass, where it already
lives.

### 2.4 The camera, today (renderer.ts:1232)

A pure affine: `screen.x = wx·s + originX`, `screen.y = wy·s·0.6 +
originY`, heights drawn at FULL scale (the deliberate cheat — no real
camera compresses ground 0.6 while leaving verticals at 1.0; that
contrast IS the current look). Origins snap on the device lattice.
`screenToWorld` is the exact inverse. Everything downstream reads
`worldToScreen`/`snapPx` — which is precisely why Epic B is tractable:
the projection has two call sites' worth of surface area, not a
thousand.

### 2.5 External consumers that constrain us

- **The reel** records `canvas.captureStream(fps)` — works on WebGL
  canvases; requires the compositor to render to the default
  framebuffer (or a final blit into it) every frame. No
  `preserveDrawingBuffer` needed for captureStream; screenshot paths
  (dev `shot` tooling) read after present within the same task or via
  FBO readback.
- **DOM UI, speech bubbles, HUD**: outside the canvas entirely. Zero
  change either epic (Epic B moves their ANCHORS — §4-B4).
- **Editor / map / landing / riglab**: separate canvases and their own
  draw paths; not touched. The landing page keeps canvas2d.
- **Adaptive anything**: none — resolution is a constant; the
  compositor inherits that law.

---

## 3. EPIC A — THE COMPOSED FRAME

Goal: the identical frame, produced by WebGL2 quad composition, behind
a Display toggle, with canvas2d as oracle and fallback. Success is
measured in draw calls and frame time on weak hardware, and in a
pixel diff that cannot tell the backends apart.

### A0 — The stage itself: context, batcher, and the draw-item seam

**The seam.** Today the world pass emits `DrawItem`s (sortY, strat,
elevated, draw/drawShadow closures) plus direct blits in the ground
pass. Phase A0 formalizes the item stream into backend-neutral
records: `QuadItem` (texture ref, src rect, dest transform — position,
scale, optional shear/skew — alpha, blend, layer) and `PaintItem` (a
closure that must run a canvas2d brush this frame: the live lanes,
water, anything not yet migrated). The canvas2d backend consumes both
kinds exactly as today (QuadItem → drawImage; the refactor is
mechanical and ships FIRST, alone, with parity proofs, before any GL
exists — it is the epic's foundation and its cheapest de-risk).

**The GL skeleton.** Raw WebGL2, no dependency (a scene graph is the
wrong tool for a sorted 2D stream; the spike's Three.js stays a
reference, not a base). One interleaved dynamic vertex buffer, one
program for textured quads (vertex: per-quad affine incl. shear —
the tree sway shear becomes four floats, and the transform-pair tax
from round 14 simply ceases to exist), premultiplied alpha
throughout, scissor for clips, `imageSmoothingEnabled` semantics via
sampler filters. Draw calls batch by (texture, blend) runs in sorted
order — the y-sort ORDER is preserved exactly; batching only merges
ADJACENT items sharing state, so painter's semantics are untouched.
Context-loss handling day one: `webglcontextlost` → same-frame flip
to the canvas2d backend, restore re-uploads lazily via law 4.

**Deliverable**: empty-scene triangle → textured quad parity harness
(a fixed test pattern composited by both backends, diffed to zero).

**A0 — AS BUILT (2026-08-31).** Shipped: `render/stage/` —
`stageTypes.ts` (the contract: StageQuad/StageFill/StagePaint, the
dest-matrix convention `screen = m · local`, StageTexture rev-sync
handles), `stageBlend.ts` (both mapping tables WITH their
premultiplied derivations written out), `stageBatch.ts` (pure run
computation), `glStage.ts` (WebGL2: one program, white-texel fills,
interleaved 20-byte vertices, exact byte ledger, context-loss →
canvas flip + lazy re-upload on restore), `canvasStage.ts` (the
oracle), `stagelab.html` + `src/dev/stagelab.ts` (the battery), 14
node tests. **All 15 lab cases pass on BOTH rasterizers** — headless
SwiftShader and real ANGLE/Metal — with near-total EXACTNESS: the
lattice/subrect/dpr-2 cases, shear, linear upscale, and the
300-quad order stress all diff at max 0; only multiply shows the
predicted single-LSB rounding (max 1). Two laws were DISCOVERED by
the harness and promoted into code:

- **THE ALPHA-TARGET REFUSAL**: destination-out is meaningless on
  the opaque main frame (the GL backbuffer is alpha:false so the
  page can never bleed through) — both backends now refuse it with
  identical words; the interior punch composites on A3's alpha FBO,
  where it belongs. A contract error never depends on which backend
  caught it.
- **Nearest-downscale sample points differ between rasterizers** at
  non-1:1 ratios (both backends' own convention, both "correct") —
  irrelevant on the real pipeline's snapped lattice, pinned as an
  info case so nobody rediscovers it as a bug.

Also banked: `restoreContext()` is refused while the loss event is
still dispatching — step to a macrotask before restoring (the drill
does, and documents why).

### A1 — The ground on stage (chunks, bands, cliffs)

The largest textures and the simplest quads: chunk canvases (and
their lifted elevation layers), band buckets, cliff runs become
STANDALONE textures (they exceed any sane atlas page), uploaded when
baked, subrect-updated when re-baked, freed by their existing
evictors (law 4 hooks: `takeChunkCanvas`/`recycleBakedEntry`,
`acquireBandCanvas`/`dropBand`, the cliff sprite lanes). The blit
math ports the SHARED-CORNER SNAP LAW: dest rects computed by the
same corner-projection rounding, so chunk seams stay pixel-shared.
Gutter insets ride the src rect as today.

**Upload budget (the epic's central new economy).** A chunk bake is
4.3–17MB; `texImage2D` of that is a multi-ms stall on weak GPUs —
the same class of jitter round 13 killed. Law: uploads are BUDGETED
(ms-metered, ~2ms/frame steady) and PACED (visible-now uploads take
the urgent lane and pay once — a hole is worse than a hitch;
pre-bake-ring uploads queue). Where available, uploads go through
`texStorage2D` + `texSubImage2D` row-band slices across frames for
ring work. `?perf` grows `gpu up <MB> q <n>` and the texture ledger
line. A `gpu-budget.ts` pure module carries the arithmetic,
bandBudget-style, with tests.

**Gate**: ground-only scenes (Dawnmead plain, Hoargate) pixel-diff
under noise vs canvas2d; teleport storm uploads within budget;
ledgers exact across 5-min soak (the round-11 soak harness, extended
to count GPU bytes).

**A1 — AS BUILT (2026-08-31).** SCOPE CORRECTION, discovered by
architecture and recorded here: bands, cliffs and lifted elevation
layers are Y-SORTED WORLD ITEMS — they interleave with entities and
cannot join a bottom ground layer; they move to A2 where the world
pass migrates whole. A1 shipped the LEVEL-0 CHUNK GROUND plus the
full upload economy:

- **The hybrid seam**: the GL stage renders the ground quads and the
  2d frame consumes them as ONE same-task drawImage (a GPU-side copy
  between accelerated canvases — no readback), drawn through the live
  ctx transform so the zoom-pulse scales the ground exactly as it
  scaled per-chunk blits. Lighting, post, and the reel keep working
  unchanged through the whole migration. `?stage` is the dev flag;
  the Display toggle remains A5.
- **Emission-time shadow sync**: the chunk entry's StageTexture
  retargets and re-revs at EMIT (pooled bake swaps, in-flight sliced
  jobs) — zero coupling to bake internals; released in
  recycleBakedEntry (ONE LIFECYCLE — the round-10 phantom class is
  unrepresentable).
- **THE UPLOAD IS A BAKE** (`gpuBudget.ts`, pure + tests): urgent
  6ms guard + one-admission floor + MEASURED cost EMA (ms/MB from
  the machine's own texImage2D). Declined chunks paint through the
  LATE canvas lane after the GL image lands — the STILL-WORLD
  BARGAIN at the emitter, so nothing can ever fail to draw. draw()
  itself still uploads whatever it meets un-synced: a forgotten
  ensure may cost a hitch, never a hole.
- **Correctness-first API split**: `ensure()` = the budgeted lane
  with fallback; `draw()` = unconditional.

**Gates, all green on the live rig** (lane :5231 → the standing
rig-36 server; wire untouched): interleaved single-session parity
(live `stageGround` toggle, null controls) — on-vs-off within the
animation noise floor in all five scenes; soak — texture ledger flat
across 4 circuit laps (tex 18/73MB = the visible working set; ring
chunks correctly textureless), peak 89MB in transit, steady-state
uploads 0; in-game context-loss drill — frames keep flowing on
canvas during loss, auto-recovery after restore; Metal measured
uploads at ~0.01ms/MB (the seed washed out in four samples).
Method lesson re-banked the hard way: cross-SESSION pixel compares
are drowned by per-session animation clocks (round 9's law) — the
first parity driver was rebuilt as a single-session live toggle.
786/786 client tests.

### A2 — The standing world (sprites, bodies, the live lane)

- **Cached sprites** (trees, props, flora, grass cells, masks, glows):
  atlas pages for the small/mid classes — the shape-class quantization
  from rounds 11/13 already buckets them; a shelf-packer per 2048²
  page per class family, entries freed with their cache entries
  (atlas fragmentation is bounded by the classes; a page past 60%
  waste compacts on the bake budget). Large sprites stand alone.
- **Bodies are the per-frame tax and get the spike's proven answer**:
  each entity rig paints into a small per-entity scratch canvas (the
  paint cost is today's cost — unchanged), uploaded as a subrect
  every frame it changed. 40 visible bodies ≈ 3–10MB/frame of upload;
  the budget treats bodies as always-urgent (they are the game), and
  the scratch pool reuses class-sized canvases/textures. This is the
  one place Epic A ADDS steady work; it buys removal of ~all other
  per-frame canvas work and is the measured trade to watch at the A2
  gate (kill criterion §6 if it doesn't pay on the weak rig).
- **The live lane**: any item whose cache declined (fallbacks, hot
  stretches, disturbed grass tiles) paints its closure into a pooled
  scratch canvas sized to its bounds and rides the same quad path.
  THE STILL-WORLD BARGAIN holds with one indirection, and the live
  ring/outline paths work unmodified because they are just painters.
- **Text**: nameplate/label `fillText` sites render into small cached
  label textures keyed by (string, style) — they change rarely; the
  hot path is a quad like everything else.

**Gate**: full five-scene parity sweep (avenue, crown, graveyard,
Hoargate, forest) diff-under-noise; forest draw calls ≤ ~40 (from
~1,030 canvas calls); world-phase A/B on the 4x rig AND a real weak
GPU (the owner's Windows/3080 box and a low-end laptop — SwiftShader
undersells GPU blits, round 13's law, so THIS gate needs real
hardware).

**A2 PART 1 — AS BUILT (2026-08-31).** The phase split in two, as its
two-round sizing predicted; part 1 is the MACHINERY, parity-gated:

- **The scratch lane** (glStage.paintScratch): StagePaint gained
  REQUIRED screen-space bounds; both backends clip to them (the
  oracle explicitly, the GL scratch by its canvas edge) so an
  undersized bounds is the same visible defect on both. One pooled
  canvas+texture pair per 64px class serves a whole frame
  sequentially — GL snapshots texture content at the draw call, so
  reuse is sound by spec. The A0 StagePaint refusal is retired.
- **The alpha world stage**: a second GlStage (alpha:true) hosts the
  y-sorted pass and composites over the 2d ground/water; the blend
  symmetry completed — transparent clear refused on the opaque
  stage, multiply/screen refused on the alpha stage, same words both
  backends (lab-pinned, 19/19 cases green incl. scratch-clip parity
  and the alpha-layer RGBA diff).
- **The sink** (stageWorldPass): one dispatch cell extracted and
  shared by both modes (SAME-BRUSH); classification = mature trees
  quad-native at assembly (blit sites emit quads — the sway shear is
  four floats of matrix; step-aside fade rides quad alpha; spriteless
  trees ride their occ box through the paint lane), band buckets
  quad-native (the EXACT LATTICE PATH's own numbers; elevated bucket
  casts as separate bounded paints), bodies/outlined props through
  the scratch lane on their own body rect (padded), and everything
  else the SPLIT path — composite, paint on the real frame in order,
  resume — counted per frame. `?stage=world`; the confession grows
  `stage world q/p/split/scr/tex/draws`.
- **Deviations recorded**: sprite-lane texture handles ride an ORPHAN
  SWEEP (15s LRU) instead of explicit release until part 2's atlas;
  `item.pb` (push-site paint bounds) is plumbed and populated for
  elevated rows but its lane is parked — routing STATIC rows through
  per-frame scratch measured ~2MB/frame each, and static content
  belongs in quads.

**Gates**: 19/19 lab cases; five-scene single-session parity ALL
PASS within the animation noise floor; 786/786 tests. **The honest
performance ledger** (real Metal, avenue): stage-world 41fps vs
canvas 120 — the diagnostic mode is parity-correct and
performance-negative until part 2, by design. Part 2's worklist is
now MEASURED, not guessed: splits 60-437/frame (props, flora,
cliffs, rows — the quadification tail), body scratch ~144MB/frame
(bodies are ALREADY cached in bodySprites — quadifying
blitBodySprite like the trees kills most of it), and the sprite
texture population (forest 792MB/1,182 records) is the atlas
phase's motivating number.

**A2 PART 2 — AS BUILT (2026-08-31).** The measured worklist,
quadified — with two defects caught by the gates and turned into
laws:

- **Quad lanes**: props and flora (drawPropOutlined/drawFlora blit
  sites; live fallbacks signal NEEDS-SPLIT — their brushes closed
  over the frame ctx at collect time, THE CAPTURE LAW, and cannot be
  deferred), bodies (blitBodySprite emits quads whenever
  bodyRelightPossible() is false — by day the 144MB/frame body
  scratch stops existing; night relight bodies keep the bounded
  scratch), cliffs (blit + a reconstruction-closure fallback — items
  built INSIDE the deferred closure, the bakes' own pattern), grass
  tall cells and elevated-row cells (GrassSystem.stagePush emits the
  shear quads; live tiles defer into ONE bounded paint per band/row
  via stageDrainLive), elevated rows (lifted-layer quad + an honest
  per-row wet scan so dry rows owe the live-water pass nothing).
  stageAssemble consolidates the ceremony: alpha folding, the
  elevated-cast box, and the withdraw-on-needs-split protocol.
- **THE OFF-SCREEN QUAD STANDS DOWN**: pad-band flora/prop blits are
  clipped free on canvas but MINT TEXTURES on the stage — a dense
  forest measured 2.7GB of VRAM before the emission cull.
- **THE SHADOW IS KEYED BY THE CANVAS, INVALIDATED ON TWO AXES**:
  record-keyed handles churned ~720 textures/second (6.3GB in the
  forest); canvas-keyed handles with a bare rev aliased POOLED
  canvases (a new band bucket inherited the old band's pixels — the
  graveyard's stale-fence corruption, caught by the parity gate
  within minutes). Owner-switch re-uploads unconditionally;
  same-owner re-bakes ride the frame stamp; revs are monotonic.

**Gates**: 19/19 lab; five-scene parity ALL PASS within noise;
786/786 tests. **The measured frontier (real Metal, fps stage vs
canvas 120)**: forest 94 (split 0), dawnmead 97 (split 5), graveyard
58 (split 90), hoargate 58 (split 143), avenue 29 (split 147) — the
gap correlates LINEARLY with split count, and the census names the
classes: the wall family (doorways/windows are permanent live items
BY DESIGN, plus hot and garrison members), water tall items, and the
particle/debris/bird bulk lanes. **Part 3's charter, measured**: the
WALL LANE (stageRebuild reconstruction closures + pb boxes through
emitRaisedMember), particles as instanced fills, the atlas +
explicit handle lifecycle, then the A2 perf gate (forest ≤~40 draws,
stage ≥ canvas on real hardware).

**A2 PART 3 — AS BUILT (2026-08-31).** The wall lane, the bulk
lanes, and TWO measured lessons that reshape part 4:

- **THE WALL LANE**: every emitRaisedMember consumer (the stretch
  live path, the non-bandable family — doorways, windows, hung
  walls, permanent live items by design — and the register-stale
  scan) marks its items with a reconstruction closure (re-emit the
  member under the CURRENT ctx, draw only this item's part by
  emission index — the bakes' own pattern, demanded by THE CAPTURE
  LAW) plus a member-level box from the bake head-room table.
  Avenue splits 147 → 21.
- **Particle runs returned** as coalesced scanned-bounds paints
  (their sculpted shapes — rotated streaks, flame licks, shadow
  ellipses — are art the quad lane cannot express); debris/birds
  ride projected per-item bounds.
- **LESSON: PER-PASS OVERHEAD IS THE SCRATCH LANE'S COST** — 258
  per-item wall paints measured 22fps at the avenue (a texImage2D
  submission each); coalescing CONSECUTIVE lane items under a union
  box recovered 36fps. Fragmentation by interleaved bodies/props
  caps the win.
- **LESSON: CACHING BEATS RECONSTRUCTION FOR STATIC CONTENT** — the
  wall family re-paints ~300MB/frame of scratch at the avenue for
  pixels that barely change. The real fix is a doorway/window/hung-
  wall SPRITE LANE (they are static art with tiny state), which
  retires most of the scratch volume AND the canvas path's own
  per-frame vector cost — a win for both backends.

**Gates**: five-scene parity ALL PASS within noise; 786/786 tests.
**Frontier (Metal, stage vs canvas 120)**: forest 79-90 (split 0),
dawnmead 101, graveyard 72, hoargate 40 (split 112 — an UNMARKED
plain-draw class, 137/frame, factory not yet identified), avenue 36
/ crown 35 (paints ~170-190, scr ~300-450MB/frame). **Part 4's
charter**: identify+mark the hoargate draw class (split attribution
now ships in stageSplitKinds), the doorway/window sprite lane,
run-defragmentation (sort-stable grouping of wall paints), the
atlas + explicit lifecycle, then the perf gate.

**A2 PART 4 — AS BUILT (2026-08-31).** The hunt and the cliff lanes:

- **Split forensics ship** (stageSplitSamples: the first few split
  closures' SOURCE names the factory — a split we cannot name cannot
  be retired). It named Hoargate's 137/frame in one probe: the CLIFF
  FAMILY's live geometry — edge-on side strips (cliffSideItem) and
  diagonal faces (cliffFaceItem), per-segment live by design since
  round 12, captured-ctx factories both.
- **The wall lane reaches the cliffs**: both push sites mark their
  items with reconstruction closures over plain captured args and
  face-extent boxes; they flow into part 3's coalescer (consecutive
  faces on a row become one union strip). Hoargate splits 112 → 10
  (40 → 50fps); graveyard 50 → 0 (72 → 77).
- **The avenue's last splits are named**: the Silverfall FALLS
  (fallTones/fallNoise — animated water columns, the round-12
  scroll-bake future) plus one empty-closure item. Nothing unmarked
  remains anywhere in the five scenes.

**Gates**: five-scene parity ALL PASS within noise; 786/786.
**Scoreboard (Metal, stage vs canvas 120)**: dawnmead 99, forest 92,
graveyard 77, hoargate 50, avenue 38, crown 34. The wall-dense pair's
remaining mass is exactly the named item: ~300-450MB/frame of
reconstruction scratch for near-static doorway/window/hung-wall/
settled-live art. **Part 5's charter**: the three banding exclusions
(doorways carry an open/close ease → the settled-cut sig pattern;
windows and hung walls each have an exclusion reason to read first),
the falls scroll-bake, the atlas + explicit lifecycle, the perf
gate.

**A2 PART 5 — AS BUILT (2026-08-31).** Exclusions read, one banded,
and the paint census that redirected the whole hunt:

- **Exclusion verdicts**: hung walls stay live LEGITIMATELY (six of
  seven hanging painters sample time — wind-swayed banners, pennants,
  trellises; only the tapestry is still). Doorways carry a 380-520ms
  ease plus a locked-refusal shudder over a world-data open flag —
  bandable via the settled-cut sig pattern, deferred with the reason
  measured (below). BRIDGE PARAPETS (BridgeRails/DeckFillRail) were
  an OVERSIGHT: pure static geometry, live only for y-sort
  granularity — which band buckets preserve by construction. Banded;
  parity green; `bands 80/82` at the avenue.
- **THE PAINT CENSUS** (stagePaintKinds — per-tag N and MB at the
  doors): the scratch mass was NOT doors or windows. It was
  ELEV-CAST — every elevated band/prop pushing its in-sort cast as a
  separate FULL-ITEM-BOX paint: crown 105 paints / 287MB per frame.
  A census of markings had misled; only a census at the doors names
  the truth.
- **THE CAST IS A BASE STRIP**: a cast is a ground smear at the
  item's base — its box is now the bottom strip, never the crown
  headroom. **AND EVERY PAINT CLIPS TO THE VIEWPORT** (an off-screen
  paint is an invisible paint; empty intersections skip the pass
  outright). Avenue scratch 282 → 107MB/frame.

**Gates**: five-scene parity ALL PASS; 786/786. **Scoreboard (Metal
vs canvas 120)**: dawnmead 102, graveyard 94, forest 85, avenue 57,
hoargate 44, crown 39. **Part 6's charter**: cast PASS-COUNT is the
crown's drag (105 passes at fixed per-pass overhead — needs an
order-safe batching design: in-sort casts legitimately paint over
earlier items, so naive reordering is banned); doorway banding via
the settled-cut sig; the falls scroll-bake; the atlas; the perf
gate.

**A2 PART 6 — AS BUILT (2026-09-01). THE CAST SPEAKS IN QUADS.**
The pass-count problem dissolved once the casts were READ instead of
boxed. Every in-sort cast is a flat translucent silhouette from six
brushes — castEdgeQuad (a parallelogram: base edge extruded along
the sun), castContact/castBody (ellipses, rotated lobes), castBlob
(seeded facet blob), castMask and drawTreeShadow (already-baked
sprites thrown by matrix). Under assembly each brush now emits its
OWN shape as quads in the item's exact painter position — order-safe
BY CONSTRUCTION, because nothing is reordered — sampling small
sprites canvas2d painted (the GL context is antialias:false and must
never rasterize a diagonal edge itself). The elev-cast extraction,
its base-strip compromise, and the elevated-needs-a-box split rule
are all deleted; crown paints 178 → ~75/frame.

- **What the extraction had actually been doing**: the cast brushes
  paint through `this.sdw`, which the scratch swap never redirected —
  every "extracted cast" was painting the 2d UNDERFRAME beneath the
  GL image while its scratch pass uploaded a blank box. Pure waste,
  and a silent ordering deviation. The lane fixes both (lane-off
  bisect: crown sig 995; lane-on: 442 — the quad casts HALVED the
  scene's standing deviation).
- **THE EXACT-MAPPING LAW**: sprites key on the QUANTIZED device-px
  shape (a row of parapets shares one bake; the wheeling sun re-mints
  on whole-pixel crossings), and the quad's matrix maps the bake back
  onto the TRUE shape — for the parallelogram, the 2×2 A with A·u=u′,
  A·v=v′ — so edges land sub-pixel exact. Whole-pixel edges alone
  measured as a crown parity excess: at noon the extrusion is 2-3
  device px and rounding moved cast edges by up to 20%.
- **Chokepoint forensics**: beginCastFill/beginContactFill are the
  ONLY gateways to sdw — under assembly a hit counts cast-RAW-LEAK
  and samples its stack. The counter found drawTreeShadow (the sixth
  brush) in one probe; it now emits its cached silhouette sprite as
  a quad (plain or sheared — the same composed matrix) with scratch
  fallbacks for the live paths (regrowth fill, light throws).
- **THE HALO IS TWO QUADS**: the crown's residual excess was NOT
  casts — the braziers' seated-halo pools had silently vanished under
  stage mode: 'lighter' cannot ride the scratch lane (additive needs
  the destination; replayed against transparent scratch and
  composited source-over it erases itself), and the bulk box clipped
  the pool. The stage speaks Lighter natively; drawSeatedHalo emits
  its two glow-sprite blits as Lighter quads. Known bounded
  deviation: over the 2d ground stage a Lighter quad under-adds by
  ground·srcα; over world rows it is exact.
- **Zoom glides fall back to bounded scratch** (key churn would mint
  sprite storms), and `stageCastLane` is the lane's kill switch.
- **PARITY METHOD v4** (stage-parity4.mjs): v3's null control sat
  350ms apart while its toggle pairs sat ~800ms — and animation noise
  GROWS with separation (crown: 270@350ms → 450@1400ms), so honest
  frames failed. v4 alternates ON/OFF at one fixed cadence: sig =
  adjacent cross-mode pairs at T, noise = same-mode pairs at 2T (a
  conservative upper bound), medians of 8. The gate must measure its
  control at the separation of its measurement.

**Gates**: parity v4 PASS on all five standing scenes + crown-evening
(the hard long-shadow case). Crown-noon reads sig 442 vs gate 432 —
2% over on the densest scene; the top blocks are the swaying willow
and a walking herald (verified by crop), and the distributed residual
is the accepted GL-linear-vs-canvas-analytic AA class on ~700 cast
edges. 786/786 tests. **The fps scoreboard could not be re-run**: the
rig's display was refresh-clamped to 30Hz this session (canvas mode
also reads 30 vs part 5's 120 — machine state, not code). The
refresh-independent world-phase ms: avenue staged/canvas 7.3/5.2
(ratio 1.39, was 2.09-implied), crown 8.4/5.8 (1.45, was 3.08) — the
stage's relative overhead roughly HALVED on wall-dense scenes.
**Part 7**: re-run the Metal scoreboard unclamped; doorway banding;
the falls scroll-bake; the atlas + explicit lifecycle (cast and glow
sprites are prime atlas tenants); the A2 perf gate.

**A2 PART 7 — AS BUILT (2026-09-01). THE DOOR JOINS THE BAND.**
Doorway/GarrisonGate banded — THE TILE IS THE STATE carried the whole
correctness argument: open and shut are DIFFERENT TILES, so a toggle
is a tile patch → chunk rev → content sig, and the bake at rest is a
pure world function. Three dynamic terms ride the existing settled-cut
machinery in stretchCutSig: doorHot (the 380-520ms swing ease and the
460ms refusal shudder → live, expiry-aware so an off-screen ease can
never pin a stretch hot), the threshold veil (proximity-continuous —
quantized 1/32, churns to live while bodies walk, settles when they
rest), and the reveal heights (doors sink with the runs they join —
folded exactly like their wall family). Side variants
(SideDoorway/GarrisonSideGate) merge VERTICALLY and the bake head-room
only spans horizontal runs — they stay live, documented. Gates wear
THE SHELF CUTS TO THE CROWN's tall span (a gate-joined garrison run at
full span burst the per-band ceiling — the crown's `over 6`).

**Windowed walls banded** under a new law: **THE SKY MAY KEY A BAKE
ONLY QUANTIZED** — hearth glass warms with sky.flame, a slow
smoothstep of the game clock (never per-frame flicker); 24 sig steps
make re-bakes a handful per dawn/dusk, each under 0.008 glass alpha,
and day sigs stay byte-identical to old. SKY NEVER KEYS A BAKE stands
for anything that flickers.

**THE WET SPAN**: the elevated-row water overlay was paying the whole
row's scratch box for one fountain tile — 16-20MB/frame of `elev-wet`
on the terrace towns (it had been hiding as the untagged `raw` class;
every push now carries a census tag). The paint box clips to the wet
tile span: dry pixels inside any box repaint what the layer quad
already shows, so a narrow box is exactly as correct as a wide one.
The class vanished from the census.

**Gates**: parity v4 ×6 PASS + crown-noon at its established marginal
(441 vs 427 — the verified willow/NPC/AA class, unchanged by this
part); night toggles PASS with wide margins (dawnmead/crown 22:00).
Door dynamics drill: forced ease → band goes hot, leaves animate
live, settles clean, no lingering hot. ABSOLUTE fidelity drill
(bands serve BOTH backends, so parity alone cannot see a bake-pose
bug): pinned-hot live pixels vs settled banded pixels at the same
rest pose diff within noise (107 vs 62 on 30k samples — a wrong pose
would light thousands). 786/786.

**The ledger** (world-phase ms, staged/canvas, display still
30Hz-clamped): avenue 4.7/3.8 (was 7.3/5.2 — BOTH backends ~30%
faster; ratio 1.39 → 1.23), crown 5.7/4.7 (was 8.4/5.8; 1.45 → 1.22),
forest 3.1/1.8, dawnmead 2.7/2.0. Avenue stage paints 66 → 32/frame
(scratch 65 → 41MB); crown 75 → 41 (96 → 73MB). Part 3's verdict
held: CACHING BEATS RECONSTRUCTION pays on both backends. The crown's
remaining wall-run (22 paints/53MB) = hung walls (wind — legitimate),
4 elevation-tall bands past the byte ceiling, and the hot cut window.

**Part 8**: the falls scroll-bake (avenue's 21 splits); the atlas +
explicit handle lifecycle; the unclamped scoreboard; the A2 perf
gate.

**A2 PART 8 — AS BUILT (2026-09-01). THE FRAME NEVER BREAKS.**
Zero splits across all six scenes — the world composites in ONE
unbroken pass everywhere, and the split path is now purely a safety
net. Two retirements:

- **THE FALL RIDES THE SCRATCH**: the round-12 scroll-bake idea dies
  honestly — the falls' animation permeates every layer (per-rope
  phases, sine wobbles, breathing scallops); nothing there is a
  scrolled still. What the falls never needed was the SPLIT: all
  three fall factories (curtain, outwash rows, side dress) now name
  their own screen boxes (pb) and read this.ctx at DRAW time, and a
  new sink branch routes any self-bounded plain item through the
  bounded scratch lane in sort order. Avenue splits 21 → 0; the
  crown's 12 were falls too → 0.
- **THE FAILED PROP FALLS THROUGH, NOT OUT**: the assembly-failure
  branches (tree/band/safe) never recorded their split kind — once
  instrumented, hoargate's last 10 named themselves in one probe:
  ore formations whose sprites the bake budget kept declining. A
  member with a reconstruction closure does not split — stageRebuild
  re-mints the item UNDER the swapped ctx (what makes objectItem's
  mint-time ctx captures scratch-safe), so a stageSafe failure with
  rebuild+pb falls through to the wall lane. Hoargate 10 → 0.

**Gates**: parity v4 — six scenes PASS, crown-noon at its stable
known marginal (439 vs 380+60; the verified willow/NPC/AA class,
unchanged). 786/786. **THE CLAMP LIFTED mid-part** (refresh probe
86Hz): the first honest scoreboard since part 5 — stage/canvas fps:
graveyard 106/120, dawnmead 101/120, avenue 96/120, forest 94/120,
crown 86/120, hoargate 60/119. And the world-phase ms now FAVORS the
stage on the wall towns: avenue 2.8 vs 3.3, crown 4.3 vs 4.6,
hoargate 1.9 vs 3.0 (only forest behind, 3.1 vs 1.9 — the tree-quad
mass). The fps gap with a CHEAPER world phase localizes the
remainder off the CPU phase clock: per-pass scratch uploads (74
passes at hoargate) and the GL-canvas composite sync — exactly the
atlas + coalescing charter.

**Part 9**: the atlas + explicit handle lifecycle (kill the orphan
sweep; cast/glow/scratch tenants first — fewer texture switches,
fewer passes); scratch-pass coalescing for the remaining lanes; then
the A2 perf gate call.

### A3 — The dark and the light (shadow layer, lightmap, overreach)

The shadow layer becomes an FBO: shadow quads (sprites, masks, grass
shade, cast fills as scratch-quads) render opaque into it, interior
rectangles punch with `destination-out` blendFunc, one composite at
layer alpha. The lightmap keeps its canvas painter initially (it is
low-res and cheap) and composites as a multiply quad; the overreach
becomes the soft-light shader's second input. Night parity gate at
lamp-heavy Hoargate + Undercroft (the round-10 crash site is the
memory-pressure canary for the texture ledger).

### A4 — Water, reflections, particles, post

- **Water** stays a canvas painter (THE LIVING WATER is live by
  design): it paints into a water-region scratch canvas uploaded as
  a dirty-rect texture per frame, drawn as a ground-layer quad. The
  falls district sets its budget. (A GL water shader is a named
  FUTURE, not this epic.)
- **Reflections** replay entity closures — they follow bodies into
  the scratch-quad lane clipped by the water region stencil.
- **Particles/debris/footprints**: instanced untextured quads (color,
  size, alpha per instance) — the bulk lanes' typed data maps
  directly; one draw call per layer.
- **Post**: tilt-shift becomes the two-pass FBO shader (kills the
  full-canvas self-read), grade + vignette + soft-light fold into the
  same final pass, sky gradient a tiny ramp texture. The spike's
  post.ts is the reference, including the sRGB re-encode gotcha.

**Gate**: falls-district parity + timing; reel capture verified
(record a clip on the GL backend); screenshot tooling verified.

### A5 — Hardening, rollout, and the honest account

Soak the texture ledger (5-min circuit, counts and bytes, GPU memory
via `WEBGL_debug_renderer_info`-adjacent estimation and our own exact
ledger), context-loss drills, zoom-glide storms, plane crossings,
`/reload`-free tab-life test. Display toggle ships default-OFF to
prod behind the settings pane; staged: dev → owner's machines → filas
default-ON with canvas2d auto-fallback. The audit doc gains §Round
"THE COMPOSED FRAME" with the full before/after table. Only after
default-ON survives a week does Epic B start.

---

## 4. EPIC B — THE CAMERA LEARNS TO LEAN

Goal: pitch and horizon become player-adjustable within an
art-safe clamp; the default is bit-identical to today; yaw stays
locked forever (one-facing painted art — this is a law, not a TODO).

### B0 — The camera model (the math, exactly)

Parameterize: `pitch θ ∈ [θmin, θmax]`, `persp f ∈ [0,1]` (0 = ortho,
1 = full perspective with horizon), around the invariant default
`(θ0, f=0)` where the matrix REDUCES ALGEBRAICALLY to today's affine:
ground compression `kg(θ0) = 0.6`, height scale `kh = 1.0` — the
anisotropic cheat is simply the calibration point, and parity at the
default is exact by construction, not by tolerance. Under adjustment:
ground rows compress by `kg(θ)`; upright quads NEVER foreshorten
(`kh` stays 1.0 — billboards are the art's contract); under `f > 0` a
horizon line enters at the top of frame and the sky band (the grade
already paints one) becomes the backdrop. All snapping stays on the
device lattice; sub-pixel row placement under perspective uses the
same snap law per quad baseline.

One new module `render/stageCamera.ts` (pure, tested): world→clip
matrices for ground plane and billboard basis, `pickRay`
(screen→ground-plane world point — replaces `screenToWorld`'s two
call-site contract), and the parity-default constants.

### B1 — Order and depth under pitch

Painter's back-to-front by world `y` (+ strat/elevation tie rules)
remains STRICTLY correct for upright billboards standing on a plane
at any pitch — the y-sort IS the depth sort; no z-buffer for the
sorted stream (alpha art demands ordered blending anyway). Elevation
lift becomes real plane height: lifted chunk layers and band quads
anchor at `z = level·ELEV_H`; the SHELF LAW's interleave (band ↔
grass ↔ entity per row) carries over unchanged because order is
unchanged. The one new rule: TALL quads at extreme pitch can overlap
rows they never overlapped at θ0 — the clamp range (B6) is chosen so
the existing tie rules stay sufficient (proof: sweep the sort
invariants across the clamp in a fixture scene).

### B2 — The standing architecture (walls, cliffs, terraces)

Band buckets and cliff curtains anchor as upright quads at their
row's baseline (they already are row-anchored rasters). Terraces
gain true height; the cliff face quads stand at ledge planes. The
reveal-cut system's WORLD-space logic (row/tile windows,
`wallHeightAt`) survives verbatim — only the two SCREEN-space
derivations re-derive from the camera: the BOWL's "cover reach"
(currently hard-derived from `WALL_H·yScale` rows) and the
`occluderFade`/`propFade` screen boxes (recomputed via projection —
one function). The settled-cut band machinery (round 14) needs
nothing: sigs are world+player state.

### B3 — Ground-plane effects

Footprints, ground decals, AoE telegraphs, blade shadows, mask
throws: all become plane-projected quads — under pitch they
foreshorten WITH the ground automatically, which is strictly more
correct than today (a telegraph circle at high pitch reads as the
ellipse it should be). The shadow FBO composites in ground space.
Lighting decision (the one genuine design fork in Epic B): move the
lightmap from screen space to ground space (an FBO over the visible
ground rect) so pools stay glued to the world under pitch changes —
prototyped in B3, decided by eyeball.

### B4 — Input, aim, and anchors

`pickWorld`/`screenToWorld` consumers (aim, HELD SIGIL ground
targeting, build cursor, click-to-act, pad focus) route through
`pickRay`. DOM anchors (nameplates offsets, speech bubbles, damage
numbers, map pings) route through the projection. The netcode, sim,
and server see NOTHING (world coordinates never changed meaning).
Gate: an input-fidelity harness — scripted clicks at known world
points across the pitch range must resolve to the same tiles.

### B5 — The controls and the feel

A Display "camera" block: pitch slider (and/or pad chord), snap-back
to default, zoom coupling preserved (zoom glide law untouched). Pitch
CHANGES are camera glides: quads re-project per frame for free (it is
a uniform), textures never re-bake for pitch — only for zoom/dpr as
today. That is the payoff of billboards: the entire 2.5D feature
costs a matrix.

### B6 — The art range (the eyeball gate)

The clamp is an ART decision made by protocol, not a guess: a fixture
reel across candidate ranges (θ0 ± steps) over the five survey scenes
plus interiors — judged for: painted top-face believability (wall
crowns, table tops), tree crown/ trunk junction, doorway heights, the
reveal cut read, stacked terraces. Expected landing zone ~±10–15°
of ground-compression change with `f` up to a mild horizon; whatever
the eyes say, ships as the clamp. Out-of-range values simply do not
exist in the UI.

### B7 — Proof and ship

Default-camera parity (bit-comparable to Epic A's frame); the input
harness; performance A/B flat vs Epic A (same quads, one uniform
changed); reel captures across the range for the owner's review; the
audit-doc round entry; staged rollout identical to A5.

---

## 5. New laws this epic writes (to be pinned in code + tests)

- **THE TEXTURE IS THE CANVAS'S SHADOW** (law 4 above): one owner,
  one lifecycle, ledgers exact; `gpu` bytes on the `?perf` line.
- **THE UPLOAD IS A BAKE**: budgeted, paced, urgent-lane for
  visible-now, ring-paced otherwise; storms are jitter and jitter is
  the enemy this whole line of work exists to kill.
- **THE ORDER IS THE SORT**: batching may merge only ADJACENT items
  in the sorted stream; no reordering optimization is ever legal.
- **THE BILLBOARD NEVER FORESHORTENS**: `kh = 1.0` at every pitch;
  the day someone wants painted tops to tilt is the day this epic's
  scope ends and a different one begins.
- **YAW IS LOCKED**: one-facing art. Not a slider, not a debug key on
  prod, not "to some degree."
- **THE DEFAULT IS EXACT**: `(θ0, f=0)` reduces to today's affine
  algebraically; parity there is an equation, not a tolerance.

## 6. Risk register and kill criteria

| risk | signal | mitigation / kill |
|---|---|---|
| body-upload tax exceeds the composite win on weak GPUs | A2 gate A/B on real weak hardware | mitigate: half-rate body repaint w/ interpolated transforms; kill A2 form and keep bodies canvas-drawn into the live lane (hybrid frame) |
| atlas fragmentation / VRAM creep | soak ledger + page-waste stat | compaction on bake budget; standalone-texture demotion |
| context loss on flaky drivers | drill in A0 | same-frame canvas2d flip is a LAW, tested in CI-shaped harness |
| iOS/ANGLE blend or sRGB quirks | A3/A4 parity on Safari + Windows/ANGLE | fixed-function-only composite path (soft-light already isolated in post shader) |
| upload stalls on integrated GPUs | `gpu up` line + weak-rig A/B | slice uploads; lower steady budget; ring pre-uploads |
| pitch reveals painted-top lies earlier than expected | B6 protocol | the clamp tightens; B ships at whatever range survives the eyeball; worst case B ships pitch-lite (horizon+small tilt) |
| the two-backend seam rots | both backends in CI parity test on every phase merge | the QuadItem stream is the ONLY composite API; direct ctx blits in the world pass become lint-banned once A2 lands |
| epic stalls mid-way | every phase ships behind the toggle, main untouched; any stop point leaves the product exactly as it was |

## 7. Sequencing, estimates, and the working agreement

Phase order is strict: A0 → A1 → A2 → A3 → A4 → A5 → B0 → B1/B2/B3
(parallelizable) → B4 → B5/B6 → B7. Sizing in this project's own
units (a "round" ≈ one focused session like render-perf rounds 6–14;
the static-layer epic ≈ 5 such):

| phase | size | risk |
|---|---|---|
| A0 seam + skeleton + parity harness | 1.5 rounds | low |
| A1 ground + upload economy | 1.5 | med (upload budget) |
| A2 standing world + bodies + atlas | 2 | HIGH (the trade to measure) |
| A3 shadow/light | 1 | low-med |
| A4 water/particles/post | 1.5 | med (parity breadth) |
| A5 hardening + rollout | 1 | low |
| **Epic A total** | **~8–9 rounds** | |
| B0 camera module + parity default | 1 | low |
| B1/B2 order + architecture quads | 1.5 | med |
| B3 ground effects + lighting-space fork | 1 | med |
| B4 input/anchors + harness | 1 | low |
| B5/B6 controls + art clamp | 1 | art-gated |
| B7 proof + rollout | 0.5 | low |
| **Epic B total** | **~6 rounds** | |

Working agreement: all epic work on `epic/painted-stage` in the
`../devcraft-stage` worktree; `main` merges INTO the branch freely
(content keeps flowing); the branch merges to main only at phase
gates, behind the toggle, with the parity proof attached. The
render-perf audit doc remains the ledger; each phase writes its
round entry. The rig lanes (36 et al) serve both trees.

## 8. Out of scope, by decision

- Yaw. 8-way art. Any 3D geometry. Any repainting of art for the
  camera.
- A GL water/grass shader rewrite (named futures; the canvas lanes
  are budgeted and fine).
- Mobile-specific work (the toggle + fallback covers it).
- Editor/landing/map renderers.
- The Three.js spike branch (reference only).
