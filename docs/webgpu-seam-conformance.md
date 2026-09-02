# THE WEBGPU SEAM — conformance audit & backend contract

*Foundation phase C1. Companion to `docs/gpu-foundation-plan.md` (§C).
The reference a WebGpuStage (C2) is built against. Branch
`epic/foundations`.*

Status: **AUDIT COMPLETE — the seam passes.** The stage contract is
backend-shaped, not GL-shaped. Adding WebGPU as a third backend needs
**no contract redesign**: one union widening (done), the de-facto
contract formalized into an explicit interface (done), and a set of
backend-internal mappings enumerated below. Canvas + GL parity is
unchanged (this phase is types + comments only: 826 tests, parity 7/7,
ui-smoke 13/13).

---

## §0. The finding that shaped C1

The renderer's two stage fields were typed as the **concrete `GlStage`**,
not `StageBackend`. The formal 5-method `StageBackend` interface is what
the canvas2d **oracle** implements; the renderer actually drives a much
larger surface (upload budget, resource release, per-frame clock, VRAM
governance, telemetry). That surface was implicit in the concrete type —
so a WebGPU backend had no contract to implement against, and nothing
checked completeness.

C1 formalizes it: **`GpuStageBackend`** (in `stage/stageTypes.ts`) is the
full contract the renderer drives, and the renderer's fields are now
typed to it. `GlStage implements GpuStageBackend`, and the retype
**self-verifies** — the type checker now proves the interface is complete
(any GL-only member the renderer reached for would fail to compile). A
WebGPU backend that satisfies `GpuStageBackend` + `VramStage` drops into
those fields with **zero renderer changes**.

---

## §1. The contract a WebGPU backend must satisfy

Three things, all type-checked:

1. **`GpuStageBackend`** — extends `StageBackend` (begin/draw/drawLayer/
   end/kind) with:
   - `readonly canvas` — the presented surface. The **renderer** creates
     the element and hands it in; the backend renders into it and the
     renderer composites it with one `drawImage`.
   - `readonly isAlpha` — world layer (transparent clear, composites over
     the 2d ground) vs opaque main stage.
   - `contextLost` / `onContextLost` — device-loss liveness + hook.
   - `frame()` — per-real-frame clock (aging, cold sweeps, upload
     allowance); `statsReset()` — zero telemetry.
   - `ensure(tex, msLeft, floor?) → {state, spentMs}` — budgeted upload
     gate; `release(tex)` — explicit free (caches stay owners).
   - Telemetry getters (textureBytes, textureCount, keyedResidentBytes,
     uploadedBytes, uploads, drawCalls, scratch*, sheetUploads,
     drawDeferred) — a backend that can't measure one reports 0.
2. **`VramStage`** (`stage/stageVram.ts`) — vramLabel, residentBytes,
   residentBreakdown, collectEvictable. **A backend that skips this drops
   out of the cross-stage VRAM ceiling (A1) and the "sprites vanish"
   defect returns.**
3. **Self-register** with `StageVram.register(this)` in the constructor,
   and accept `GpuStageOpts` `{ alpha?, texBudgetBytes?, label? }`.

`StageTexture` handles are minted by the renderer/caches as plain object
literals (`{canvas, rev, filter, dirty?, staleOk?, pinned?}`) and shadowed
by the backend keyed on **object identity**. A WebGPU backend creates its
texture on first sight of a handle, re-uploads when `rev` or `canvas`
changes, honors `dirty`/`staleOk`/`pinned`, and frees on `release()`.

---

## §2. Per-element conformance (verdicts + WebGPU mapping)

Every element is **NEUTRAL** (expressible as-is) or **DOC-ONLY** (a
comment named a GL API for a neutral concept — reworded this phase).
Exactly one was **NEEDS-CHANGE** (`kind`, now fixed).

| Element | Verdict | WebGPU mapping |
|---|---|---|
| `kind: 'gl'\|'canvas'` | **FIXED** | widened to include `'webgpu'` |
| StageBlend ×6 | NEUTRAL | each a premultiplied `(src,dst)` → one `GPUBlendState`; see §3 |
| StageTexture.canvas | NEUTRAL | `queue.copyExternalImageToTexture({source: canvas}, …)` |
| StageTexture.dirty (subupload) | NEUTRAL | `copyExternalImageToTexture` with `origin`+`copySize` |
| StageTexture.filter | NEUTRAL | `GPUSampler{magFilter,minFilter}` |
| StageTexture.staleOk / pinned | NEUTRAL | residency policy, backend-internal |
| StageMatrix / dest-space | NEUTRAL | CSS-px affine in the vertex shader; y-flip in-shader (as GL does) |
| StageQuad / StageFill | NEUTRAL | textured / white-texture-or-fill-pipeline quad |
| StagePaint closure | NEUTRAL | run on a scratch 2D canvas → `copyExternalImageToTexture` → quad (the GL scratch lane, upload primitive swapped). The `CanvasRenderingContext2D` dependency is the hybrid design, not a GL-ism |
| begin (clear null/opaque, renderScale) | NEUTRAL | render-pass `loadOp:'clear'`+`clearValue` (null→a:0); render to a smaller target for renderScale, upscale on present |
| draw | NEUTRAL | per run: `setPipeline`+`setBindGroup`+`draw` in a `GPURenderPassEncoder` |
| drawLayer | NEUTRAL | offscreen render pass to an RGBA texture, then a composite quad at `alpha` (native render-to-texture; separate texture satisfies no-sample-while-rendering) |
| end | NEUTRAL | `commandEncoder.finish()` + `queue.submit()` |
| premultiplied-alpha law | NEUTRAL | canvas context `alphaMode:'premultiplied'`/`'opaque'` |

---

## §3. Blend — the one subtle concern, resolved

WebGPU bakes blend into an **immutable `GPURenderPipeline`** — there is no
mutable `blendFunc`. The question was whether the batcher assumes GL's
mutable blend. **It does not.** `computeRuns` (`stage/stageBatch.ts`) keys
every run on `(tex, blend)` and breaks a run when blend changes — blend is
already a **per-run constant**. GL calls `gl.blendFunc` once per run;
WebGPU calls `setPipeline(pipelineFor[blend][targetFormat])` once per run.
Same partition, mechanical substitution.

Each mode, on the contract's opaque-target assumption (premultiplied):

| StageBlend | GL `(src,dst)` | WebGPU `GPUBlendState` (color = alpha) |
|---|---|---|
| SourceOver | (ONE, 1−SRC_A) | `{srcFactor:'one', dstFactor:'one-minus-src-alpha', operation:'add'}` |
| Lighter | (ONE, ONE) | `{'one','one','add'}` |
| Multiply (Da=1) | (DST_COLOR, 1−SRC_A) | `{'dst','one-minus-src-alpha','add'}` |
| Screen | (1−DST_COLOR, ONE) | `{'one-minus-dst','one','add'}` |
| DestinationOut | (ZERO, 1−SRC_A) | `{'zero','one-minus-src-alpha','add'}` |
| DestinationOver | (1−DST_A, ONE) | `{'one-minus-dst-alpha','one','add'}` |

A WebGPU backend precreates a small pipeline matrix: **6 blend modes ×
target formats** (opaque main `bgra8unorm`, alpha layer `rgba8unorm`).
The `blendNeedsOpaqueTarget`/`blendNeedsAlphaTarget` predicates are pure
and reused verbatim (the same two refusals). `BLEND_GL_FUNC` stays; add a
parallel `BLEND_GPU` table at backend-build time (additive).

---

## §4. What C1 changed

- `stage/stageTypes.ts`: `kind` union += `'webgpu'`; **new `GpuStageBackend`**
  interface (extends StageBackend + VramStage) + `EnsureResult` +
  `GpuStageOpts`; comment GL-isms reworded backend-neutral (texSubImage2D,
  "same GL texture", "GL orphan sweep").
- `stage/glStage.ts`: `implements GpuStageBackend` (was `StageBackend,
  VramStage` — GpuStageBackend subsumes both and enforces the full
  surface); constructor takes `GpuStageOpts`.
- `renderer.ts`: `stageGl`/`stageWorldGl` typed `GpuStageBackend | null`
  (was `GlStage | null`) — the decoupling + completeness proof.
- `stage/stageBlend.ts`: `alpha:false` comment noted as `alphaMode:'opaque'`.

No runtime change. No new cycles (`stageVram` is import-free, so
`stageTypes → stageVram` is safe). Gates: tsc, 826 tests, build, cycles
at baseline, parity 7/7, ui-smoke 13/13.

---

## §5. C2 build checklist (the next phase)

A `WebGpuStage implements GpuStageBackend`, behind `?stage=webgpu`, GL
staying default + oracle:

1. Device/adapter acquisition with **graceful fallback to GL** where
   WebGPU is absent (mirror the GL→canvas context-loss flip); wire
   `device.lost` → `contextLost`/`onContextLost`.
2. The pipeline matrix (§3): 6 blends × {opaque, alpha} formats; one
   sampler per filter; a white 1×1 texture for fills (or a fill pipeline).
3. Texture store: `copyExternalImageToTexture` uploads (full + dirty
   sub-region), identity-keyed records, `ensure` budget + `staleOk`/
   `pinned`, `release`; implement `VramStage` and self-register — reuse
   the A1 governor and the byte-ledger discipline unchanged.
4. `draw`: walk `computeRuns`; per run setPipeline+bindGroup+draw; paint
   items run on a scratch 2D canvas → upload → quad (port the GL scratch/
   sheet/keyed lanes, swapping only the upload primitive).
5. `drawLayer`: offscreen render pass to an RGBA texture → composite quad.
6. `begin`: encoder + render pass; `clear`→loadOp; `renderScale`→smaller
   target, upscale on present; y-flip in the vertex shader.
7. **Three-way parity oracle**: extend the stagelab battery + scene parity
   driver to canvas ↔ GL ↔ WebGPU. GL remains the shipping backend and
   the oracle-of-record; WebGPU must match GL within the tiers GL matches
   canvas before it is offered as a tier, and by default never.

Then C3 (lane-by-lane residency) and C4 (compute: lighting, bakes, the
quad stream as a storage buffer) build on this — the substrate Epic B's
camera pitch and lighting are authored against.
