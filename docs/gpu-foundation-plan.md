# THE GPU FOUNDATION — textures, the ground cache, and the road to WebGPU

*Pre-Epic-B foundation plan. Branch `epic/foundations` (worktree
`../devcraft-stage`). Companion to `docs/painted-stage-plan.md`; this
document owns the memory and backend story that Epic B (the camera lean)
will stand on.*

Status: **PLAN** — proposed 2026-09-02, awaiting green-light. Nothing
here is built yet. Each phase lands as its own band with its own gates,
the same way Epic A did.

---

## §0. Why now, and the trajectory

Epic B wants three things the current backend cannot give cheaply:

1. **A pitched camera** — quads reprojected under a tilt, so the ground
   plane recedes and tall things lean back. Our quad stream already
   carries a per-quad 3×2 dest matrix; a pitch is a projection change,
   not a data-model change. But a pitched frame draws **more** of the
   world at once (the horizon pulls distant chunks into view) — memory
   pressure goes up, not down.
2. **Lighting that lives in the pass** — day/night, lamps, and the
   reveal veil computed against depth, ideally as a GPU pass rather than
   the CPU relight-and-re-upload we do now.
3. **Richer per-surface detail** — normal-ish shading, better filtering,
   more sprites resident at once.

All three are memory- and compute-bound. WebGPU is the substrate that
makes them affordable: **explicit residency** (we decide what lives in
VRAM instead of the driver silently reclaiming — the exact failure that
produced the vanishing sprites), **compute shaders** (lighting and bakes
on the GPU instead of canvas2d + re-upload), and **storage buffers**
(the quad stream as a GPU buffer, not per-frame CPU assembly).

So the sequence is deliberate: **harden the memory model first** (so a
pitched, richer scene has headroom), **pay down the ground cache**
(the single largest allocation, and it worsens under a pitch), **then
bring WebGPU in behind the existing seam** as the substrate Epic B is
authored against. We do not rewrite; we add a third backend and port
lane by lane, parity-gated, exactly as canvas → GL went.

---

## §1. The current state, measured

The honest ledger, from the vanishing-sprites hunt (band 21) and the
foundation audit (band 18). Two `GlStage` instances plus the canvas
paint factory.

### 1.1 The world stage — GPU (`renderer.ts:13396`, budget 512 MB)

At a **maximized Retina window** (2560×1440 CSS, dpr 2 → 5120×2880
backbuffer) the resident breakdown, post-band-21:

| Lane        | Bytes (big window) | What it is | Bound by |
|-------------|-------------------:|------------|----------|
| records     | ~712 MB | visible chunk/band/sprite textures + **335 MB pinned atlas** | `texBudgetBytes` + tickFrame sweep (band 21) |
| keyed       | 128 MB | wall-run / used-row exact-size textures | hard cap (band 17) |
| scratch     | ~315 MB | pooled per-64px-class canvases | **SCRATCH_BUDGET 320 MB + LRU (band 21)** |
| sheets      | 24 MB | species / used-row atlas sheets (2048×1024) | used-region packing |
| layer (FBO) | 56 MB | alpha compositing target | backbuffer size |

Total ~1.23 GB at the big window (was 3.27 GB before band 21). The
pinned atlas is 20 pages × 2048² × 4 B = **335 MB** — a fixed floor.
`layer` scales with backbuffer, i.e. **with dpr²**.

### 1.2 The ground stage — GPU (`renderer.ts:14017`, budget 256 MB)

Only the **visible** chunk textures — measured ~154–167 MB. Small and
well-behaved; distance culling already keeps the ring textureless.

### 1.3 The 2D ground cache — canvas RAM (`BAKED_BUDGET_BYTES = 192 MB`)

**This is the elephant, and it is in *both* modes.** `bakedBytes`
reached **~1008 MB at a terraced capital** (Silverfall): ~24 hi-res
chunks, each carrying a base canvas **plus one lifted canvas per
elevation level**, all un-evictable while on screen. The 192 MB budget
cannot evict an on-screen terraced chunk, so it blows straight through.

This is canvas2d backing-store memory — it counts against the tab's
total, and it is the same in accelerated-display OFF and ON.

### 1.4 The double-storage finding (stage-ON only)

`BakedChunk.stageTex` **wraps `baked.canvas`** as its upload source
(`renderer.ts:7313` — `tex = baked.stageTex = { canvas: baked.canvas }`).
So in stage-ON mode a ground chunk holds **both** its 2D canvas backing
**and** a distinct GPU texture. The canvas cannot simply be dropped —
it is the source for re-uploads (eviction/re-add), the late-lane
fallback (`stageLate`, 7335), and the fringe re-bake. But in steady
state it is redundant with a resident GPU texture. Addressed in §3.5.

### 1.5 The seam — `StageBackend` (`stage/stageTypes.ts:176`)

Two implementers today: `CanvasStage` (the oracle) and `GlStage`. The
renderer talks only to this interface for the world and ground passes.
**This is the WebGPU on-ramp.** Its completeness is audited in §4.1.

---

## §2. Workstream A — the GPU texture economy (WebGL, near-term)

Lands before Epic B. Each phase is independently shippable; ordered by
leverage-per-risk.

### A1 · The total VRAM ceiling — *formalize what band 21 began*

Band 21 capped scratch (320 MB) and added a tickFrame record sweep.
Finish the job into one **global stage budget** the two instances share
and confess:

- A single `stageResidentBytes()` = records + keyed + scratch + sheets +
  layer, per instance, summed across both stages.
- A **global soft ceiling** (proposed 1.4 GB desktop / lower on a DPR-
  capped small tab) that, when exceeded, drives eviction *before* the
  driver does. The driver reclaim is the enemy; we must always be the
  first to evict.
- `?perf` grows a `resTOT` line (both stages) so the ceiling is one
  glance, and the residentBreakdown becomes a standing dev method, not
  a one-off hunt tool.
- **Gate:** the big-window repro (maximized Retina) roamed across
  forest → capital → dungeon holds under the ceiling for 4 laps with no
  vanish; resTOT flat across laps.

*Effort: S. Risk: low. Depends on nothing.*

### A2 · The backbuffer DPR cap — *kill the dpr² blowup*

The `layer` FBO and every backbuffer-sized allocation scale with dpr².
A 27" Retina at dpr 2 pays 4× a dpr-1 tab for the same visual reach.
Cap the **stage** render scale (not the UI) at a configurable ceiling
(proposed effective dpr ≤ 1.5 on windows past ~3.5 Mpx CSS), upsampling
the final composite. The 2d lighting/post/reel path is untouched — this
is the stage backbuffer only.

- Sharpness cost is real; make it a **quality tier** (Settings:
  "Render resolution — Auto / Full / Balanced"), default Auto = capped
  on huge windows only. Small/medium windows never hit it.
- **Gate:** side-by-side at a maximized Retina window — memory drop
  measured (expect layer 56 → ~25 MB, plus proportional record savings
  on backbuffer-derived textures), and a screenshot-judged sharpness
  pass at Auto that the owner signs off. Parity oracle unaffected
  (parity runs at fixed size).

*Effort: M. Risk: medium (visual). Highest memory-per-effort win.*

### A3 · Compressed textures for the static pools

The atlas (335 MB pinned) and the ground chunk textures are the biggest
resident blocks and are **static once baked** — ideal for GPU-compressed
formats (`WEBGL_compressed_texture_s3tc` universally on desktop; `astc`
where present). 4:1 (DXT1, opaque ground) to ~4:1 (DXT5/BC7-ish, alpha
sprites) shrinks the resident footprint without touching the working set.

- Compress **at upload time in a worker** (the bake stays canvas2d; the
  worker encodes the baked bitmap → compressed blocks → `compressedTex-
  Image2D`). Keeps the paint factory intact.
- The atlas is the first target: 335 MB → ~85 MB pinned is transformative
  for the floor. Ground chunks second.
- **Compression artifacts are a craft risk** — block compression bruises
  hard edges and gradients. Every candidate pool gets a screenshot-judged
  A/B at 1× and at zoom before it ships; anything that reads as mush
  stays uncompressed. Sprite alpha edges especially — test the atlas
  against the crown scene's fine chrome.
- **Gate:** resident floor drop measured; A/B screenshot pass per pool
  signed off; parity oracle tolerance widened *only* for compressed
  lanes, with the widening documented and bounded (this is a real
  deviation from byte-exact — it must be named, not silently absorbed).

*Effort: L. Risk: medium (visual + encoder complexity). Biggest floor
win, but it is the one that can hurt the art — gate it hardest.*

### A4 · Format reduction for masks and single-channel data

Fringe masks, reveal/veil coverage, and any single-channel data upload
as RGBA today. R8 / RG8 where the data allows cuts those 4× / 2×. Small
next to A2/A3 but nearly free and risk-light.

*Effort: S. Risk: low.*

### A5 · Atlas & keyed tightening — *finish the reclaim*

The dead-space reclaim (band 14) and used-region sheets (band 16) landed.
Remaining: (a) evict cold **pinned** atlas pages when a scene's sprite
set fully rotates (a dungeon does not need the capital's sprites pinned);
(b) confirm the keyed 128 MB cap is right post-DPR-cap (A2 shrinks its
inputs). Measurement pass, not new machinery.

*Effort: S. Risk: low.*

---

## §3. Workstream B — the 2D ground cache (the 1 GB elephant)

The single largest allocation in the app, in both modes, and a pitched
camera makes it worse (more chunks visible past the horizon). This is
architectural, not a seam tweak — it gets its own band, likely two.

### B1 · Root, restated

A terraced chunk = one base canvas + **one full-size lifted canvas per
elevation level**. At a capital with deep terracing that is 3–6×
per-chunk, × ~24 on-screen chunks, un-evictable. `BAKED_BUDGET` is
irrelevant because it may not evict what is visible.

### B2 · Lifted-layer consolidation — *the structural fix*

Today each elevation level is a **separate full-size canvas**, mostly
transparent (a lifted level covers only the raised footprint). Two
routes, to be prototyped and measured against each other:

- **B2a — tight lifted rects.** Bake each lifted level into a canvas
  sized to its *occupied* footprint, not the full chunk. A level that
  covers 15% of the chunk pays 15%. Mirrors the used-region sheet win
  (band 16) that cut forest textures 1494 → ~200. Expected the largest
  single reduction; the y-sort and draw offsets must carry the rect
  origin (the fiddly part).
- **B2b — single layered canvas.** Composite all levels into one canvas
  with a per-level row index. Fewer allocations, but loses independent
  invalidation (a fringe bump to one level dirties the sheet). Likely
  worse for the fringe re-bake; prototype to confirm before choosing.

**Prefer B2a** unless prototyping shows the rect bookkeeping breaks the
fringe/elev seam. Either way: screenshot-judged terraced parity (no seam,
no lift misalignment) at the capital, plus fringe-seam 10/10 intact.

### B3 · Distance / zoom resolution demotion

Distant or zoomed-out chunks bake at retina pixels-per-tile they cannot
show. Bake far chunks at a lower ppt tier and let the existing zoom-tier
plumbing swap up on approach. Bounded, measured demotion — the ring is
already textureless; this is the band *between* ring and hero.

*Effort: M. Risk: low-medium (pop on tier swap — cross-fade if visible).*

### B4 · Drop-canvas-after-upload (stage-ON only) — *retire the double copy*

Per §1.4, a stage-resident chunk holds a redundant canvas. Once its
`stageTex` is uploaded **and** the chunk is not pending a re-bake/fringe/
late-draw, release the canvas back to the pool and mark the entry
**GPU-authoritative**. If the GPU texture is later evicted (A1) or the
canvas is needed (context loss, fringe bump), **re-bake from world data**
— the bake is already sliced and cheap, and the fringe re-bake already
proves partial re-bakes.

- This is the stage-mode path to nearly **halving** ground memory: the
  1 GB canvas cache becomes ~154 MB of GPU textures + a small re-bake
  reserve, once terracing is on the GPU too.
- Requires care: the late lane and fringe both read the canvas today;
  they must fall back to re-bake or read-back cleanly. Gate on the
  context-loss drill + a fringe stress roam.

*Effort: L. Risk: medium. The big stage-mode memory win; do it after
B2 so we are not dropping oversized canvases.*

### B5 · A ground-cache budget that can actually evict

With B2/B4 shrinking per-chunk cost, re-establish `BAKED_BUDGET` as a
**real** ceiling: an on-screen chunk that must stay resident is fine,
but the policy should demote (B3) or GPU-authoritative-drop (B4) rather
than refuse to evict. Confess `bakedTOT` on `?perf`.

*Effort: S (once B2/B4 land). Risk: low.*

---

## §4. Workstream C — WebGPU readiness

The strategic substrate. Brought in behind the existing seam, in
parallel with GL, parity-gated. **No rewrite. No flag flip until parity
holds across the full scene battery.**

### C1 · Seam audit — *prove the contract is backend-neutral*

Before any WebGPU code, audit `StageBackend` (`stageTypes.ts:176`) for
GL-isms that leaked into the contract. Every method must be expressible
in WebGPU terms (render passes, bind groups, storage buffers). Deliver:
a contract-conformance checklist and any refactors needed to make the
interface truly neutral (canvas + GL both still pass). This is the
cheapest, highest-value C phase — do it first, ship it alone.

*Effort: M. Risk: low. Gate: canvas + GL parity unchanged after refactor.*

### C2 · `WebGpuStage` skeleton — *third backend, parity oracle from day one*

A new `WebGpuStage implements StageBackend`, behind `?stage=webgpu` dev
flag, drawing the **fill and quad** lanes only (the A1-equivalent
subset). GL remains default and remains the **oracle** — the stagelab
battery (15 cases) and the scene parity driver run canvas ↔ GL ↔ WebGPU,
three-way. WebGPU must match GL within the same tiers GL matched canvas.

- WebGPU device/adapter acquisition with **graceful fallback to GL** on
  unavailability (Safari/older Chrome) — the toggle degrades, never
  breaks. This mirrors the GL → canvas context-loss flip already built.
- **Gate:** stagelab 15/15 three-way; fill + quad scenes parity.

*Effort: L. Risk: medium (new API surface). The foundational C phase.*

### C3 · Lane-by-lane port

Port the remaining lanes in the order Epic A built them — quads → scratch
→ keyed → sheets → atlas → layer/alpha — each parity-gated against GL
before the next. Explicit residency (WebGPU's headline win) replaces the
LRU-vs-driver race: **we** own what is resident, so the vanish class of
bug becomes structurally impossible, not merely budgeted around.

*Effort: XL (spread across bands). Risk: medium. Incremental — each lane
is a shippable band.*

### C4 · Compute shaders — *the payoff Epic B spends*

Once the raster path has WebGPU parity, move the CPU-bound, re-upload-
heavy work onto compute:

- **Lighting as a compute pass.** Day/night relight and lamp lighting
  are CPU relight + re-upload today (the body relight tax, night scratch).
  A compute pass over resident textures + a light buffer kills the
  re-upload entirely and is the natural home for Epic B's richer lighting.
- **Bakes on the GPU.** The ground/band bakes are canvas2d today. A
  compute/render-to-texture bake removes the canvas backing (feeds B4's
  GPU-authoritative model directly) and the CPU bake cost.
- **The quad stream as a storage buffer.** Assemble once to a GPU buffer;
  a pitched camera reprojects in the vertex stage instead of CPU
  re-assembly per frame.

*Effort: XL. Risk: medium-high. This is where Epic B's lighting/pitch
authoring actually lives — sequence its sub-parts with Epic B's needs.*

### C5 · What Epic B consumes

Epic B is authored **against the WebGPU backend** for pitch + lighting,
with GL as the un-pitched fallback. The camera pitch is a projection
matrix in the vertex stage (C4's storage-buffer stream); the lighting is
C4's compute pass; the richer detail is the headroom A+B bought. Epic B
does not begin its camera work until C2+C3 give it a parity-clean WebGPU
raster path to build on.

### C6 · Rollout & fallback

- Dev flag `?stage=webgpu` → Settings tier once parity holds → default
  only after a full battery + field soak.
- **Three-way parity oracle** is permanent: canvas (truth) / GL
  (shipping) / WebGPU (rising). A WebGPU regression is caught against GL,
  which is caught against canvas.
- Device-loss handling (WebGPU `device.lost`) mirrors the GL context-loss
  flip: fall back to GL, re-acquire, re-upload lazily.

---

## §5. Sequencing against Epic B

**Before Epic B (memory headroom — a pitch makes scenes bigger):**
- A1 (global ceiling), A2 (DPR cap) — fast, high leverage.
- B2 (lifted consolidation) — the structural ground-cache fix.
- C1 (seam audit) — cheap, unblocks all of C.

**Early Epic B (the substrate rises alongside):**
- A3 (compressed atlas), A4, A5 — floor reduction.
- B3, B4, B5 — the stage-mode ground win.
- C2, C3 — WebGPU raster parity.

**Epic B proper (spends the foundation):**
- C4 (compute: lighting, bakes, quad buffer) — sequenced with the camera
  and lighting authoring.
- C5 — pitch + richer detail on the WebGPU backend.

Rule of order: **memory before pixels, seam before backend, parity
before default.** No camera-pitch code until C2/C3 give it a clean
WebGPU raster path; no WebGPU default until the three-way battery holds.

---

## §6. Proof & gates (standing method)

- **The big-window repro law.** Every memory phase is judged at a
  *maximized Retina window* (dpr 2, ~5 Mpx backbuffer). Small windows
  hide GPU-memory defects (band 21's lesson). `res N` / new `resTOT` on
  `?perf` is the number; residentBreakdown per lane is the diagnostic.
- **The three-way parity oracle.** canvas = truth, GL = shipping, WebGPU
  = rising. stagelab battery + scene parity driver run all three. A
  compressed lane's tolerance widening (A3) is *documented and bounded*,
  never silent.
- **Screenshot-judged craft gates.** A2 (sharpness), A3 (compression
  artifacts per pool), B2 (terraced seam/lift), B3 (tier-swap pop) each
  get an owner-signed A/B. Memory wins never ship at the cost of the art.
- **Standing suites.** tsc clean; full client test suite; ui-smoke;
  fringe-seam 10/10; parity battery. Each band adds its own tests
  (budget/eviction unit tests for A; lifted-rect geometry tests for B;
  three-way parity fixtures for C).
- **Prod soak.** Ship behind the existing toggle; verify `res`/`resTOT`
  on the owner's prod session holds bounded across a real roam.

---

## §7. Risks & kill criteria

| Risk | Mitigation | Kill criterion |
|------|------------|----------------|
| Compressed textures bruise the art (A3) | Per-pool A/B, opaque-only DXT1, keep hard-edge pools uncompressed | If the atlas can't pass the crown chrome A/B, ship ground-only and keep the atlas raw |
| DPR cap reads soft (A2) | Quality tier, Auto caps only huge windows, owner sign-off | If Auto is visibly soft at the capital, raise the Mpx threshold or default to Full |
| B4 re-bake churn on eviction | Do B4 after B2 (smaller re-bakes); reuse fringe partial-bake proof | If eviction→re-bake causes visible hitching, keep the canvas for a bounded LRU instead of dropping |
| WebGPU availability (C) | GL stays default + oracle + fallback; WebGPU is additive | WebGPU never becomes required; if the field can't support it, it stays an opt-in tier indefinitely |
| Scope vs Epic B timeline | A1/A2/B2/C1 are the only hard pre-reqs; everything else runs alongside | If the schedule tightens, ship A1+A2+B2 (headroom) and defer C past Epic B's first cut on GL |

---

*Named-not-chased carried in: run-identity UV-window keying; pending-chunk
dirty-row uploads (both from the foundation audit). Fold into A5/C3 when
touched.*
