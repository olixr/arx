> **HISTORICAL — the lean was removed from the 2D client on 2026-09-04 (see docs/perspective-review-and-3d-client-plan.md); the perspective effort continues in the separate 3D client.**

# Epic B — remaining line items (handoff)

**As of 2026-09-02.** Epic B (THE CAMERA LEARNS TO LEAN) shipped to prod as an
opt-in **"Perspective camera (beta)"** toggle (Settings > Display). The core is
done and correct: the homography projection, the depth thread across every
sprite family, all spanning surfaces (B-3), the productized toggle (B-2), and
the skyline (B-5). What follows is the five refinements that remain to fully
close the epic. None is a gate on the beta; item 1 is the only one that gates
*default-on*.

This doc is written so an agent with **no prior context** can pick up any item
and finish it thoroughly.

---

## The one invariant that governs every change here

**`q = 0` must stay byte-identical to today's orthographic frame.** Every code
path you touch must short-circuit (or compute an identical result) at `q = 0`.
This is what has let all 59 Epic-B commits land on `main` incrementally with
zero risk. Never break it. `camera.depthScale(wy)` already early-returns exactly
`1` at `q=0`; `cameraProject` short-circuits to the exact affine. Lean on those.

- `q` is the lean parameter: `w = 1 − q·(sy0 − cy)`, `depthScale = 1/w`,
  horizon at `h/2 − 1/q`. **Pitch only.** See `render/cameraProject.ts` and
  plan §2 (`docs/epic-b-camera-lean-plan.md`).
- Parity: at `q=0`, GL-vs-canvas oracle is exact (7/7). At `q>0` the canvas
  oracle **cannot draw a trapezoid** (§5-A) → ground parity is screenshot-only;
  everything else is GL-vs-GL. Do not expect the oracle to validate `q>0`.

## The rig / probe recipe (how to see the lean)

- Worktree for all Epic-B edits: `/Users/aeriek/code/devcraft-stage`
  (branch `epic/foundations`). **Never switch the shared main checkout.**
  Commit in the worktree, then `git merge epic/foundations` from
  `/Users/aeriek/code/devcraft` (the main checkout). See [[shared-tree-git-law]].
- Stage vite: `http://localhost:5231` (config `vite.config.stage.ts`). The
  watcher is **BLINDED** — you MUST restart it `--force` after EVERY edit or it
  serves stale bundles. (This has bitten us repeatedly.)
- Login on the probe rig: user `perf12_probe`, pass `probe-owl-9127`.
- Globals in-page: `window.dcGame`, `window.dcRenderer`.
- **Turn the lean on via `renderer.leanTarget`, NOT `camera.q`.** The render
  loop sets `camera.q` from `leanTarget` every frame (renderer.ts ~5052), so a
  manual `camera.q` poke is clobbered whenever `leanTarget = 0`. Moderate
  shipping value = `0.0013`; cinematic (horizon in view) ≈ `0.0034`.
- Playwright: `/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs`.
- Probe law: **fresh page per config** (a lean/res toggle mid-session can leave
  stale GL state). And to disprove a suspected composite "box," pixel-scan the
  canvas for a *consistent* seam across scanlines before believing your eyes on
  a busy scene (a false alarm cost real time this session — see B-5 memory).

---

## Item 1 — On-by-default (the product call)  ⟵ gated on Item 2

**Goal.** Make the lean the default view (not just an opt-in toggle).

**Why it's last.** The only thing a first-time user would notice is the bounded
stream-in transient when moving (Item 2). Smooth that first, then flip.

**Where.**
- Toggle + default: `packages/client/src/ui/displaySettings.ts:52`
  (`'Perspective camera (beta)'`, currently `leanTarget = on ? 0.0013 : 0`).
- Initial read: `packages/client/src/main.ts` (`?lean` / `arx.lean` →
  `renderer.leanTarget`).

**Approach.** Change the default so an absent `arx.lean` pref means on (moderate
`0.0013`), keep the toggle for opt-out, drop "(beta)" from the label once Item 2
lands. Consider a one-time migration note.

**Verify.** Fresh page, no `arx.lean` set → world leans by default; toggle off →
byte-identical flat; steady-state 60fps moving through the terraced capital.

---

## Item 2 — Lever 3: smooth the stream-in transient (far-chunk LOD)

**Goal.** Kill the brief hitch when moving under lean, without regressing the
hard-won steady-state (already 60fps).

**Why.** The leaned frustum is wider/deeper (`FRUSTUM_FAR_MULT = 2`,
renderer.ts:475; perspective-aware `visibleTileBounds` ~7273) so more far ground
chunks stream in at once → a bounded bake transient while moving.

**Where.**
- Far-cut constant: `renderer.ts:475` `FRUSTUM_FAR_MULT`.
- Sliced chunk-bake budget: `CHUNK_SLICE_MS` ~433; bake queue ~1893
  (visible-first, then pre-bake ring); in-flight eviction guard ~1789.
- Row-tight lifted canvases (B2): `liftedRowSpan`.

**Approach (ranked, churn-averse — this baker is hard-won, do NOT rewrite it).**
1. **Distance LOD:** demote far chunks (beyond ortho reach) to a cheaper
   pixels-per-tile / skip fine detail under lean — they're compressed near the
   horizon and buried in fog anyway. Lowest risk, highest payoff.
2. Bias the bake-queue scan so near chunks always bake before the far ring.
3. Widen the pre-bake ring only in the view direction.

**Verify.** Move fast through the terraced capital under lean; watch the `?perf`
HUD `bands hot/cut/over` and `ground` ms — steady-state must stay 60fps and the
transient's peak frame time must drop. Compare against `q=0` (must be unchanged).

---

## Item 3 — B-4: the lightmap under perspective (exact far lighting)

**Goal.** Far-distance lighting sits exactly on the lit tiles under lean.

**Why.** The world lightmap (`relightCanvas` :1481; exposure multiply pass
~5816; single choke point ~5059) is built and blitted in ortho map-space, so at
`q>0` far light is slightly misaligned. Acceptable at moderate `q` (why it's
deferred), wrong at cinematic.

**Approach.** Warp the lightmap sample/blit with the same per-corner
`depthScale` trapezoid technique used for B-3 surfaces (see `cliffArt.ts`,
`garrisonArt.ts`), OR project the sample coords through `cameraProject`. Keep the
single-multiply choke point. `q=0` byte-identical.

**Verify.** A brazier / lit POI at distance under lean — the light pool stays on
its tiles as the camera leans, not sliding off.

---

## Item 4 — Screen-space reflection clip (restore reflections under lean)

**Goal.** Water reflections work under the lean (currently skipped).

**Why.** `drawReflections` (renderer.ts:4380) early-returns at `q>0`
(`:4389`) because the water clip is built with an **affine** world→screen
(`ctx.transform` + `ctx.clip(path)`, ~:4482/4488) that can't fold `q` → it would
clip the leaned reflection to the water's ortho position (a displaced mirror).
Skipping is correct-but-lossy for now.

**Approach.** Rebuild the water clip **in screen space**: project each water-edge
vertex through `camera.worldToScreen` (which folds `q`) and build the clip path
from those screen points, instead of `ctx.transform` + an affine-space path. The
mirrored sprites already depth-thread (they reuse `item.body`). Then remove the
`q>0` guard at :4389. `q=0` byte-identical.

**Verify.** Stand by water under lean — reflection sits on the leaned water,
edge-aligned; toggle "Water reflections" still governs; `q=0` unchanged.

---

## Item 5 — Elevated-pick depthScale (click accuracy on lifted ground)

**Goal.** Clicking lifted/terraced ground under lean picks the tile under the
cursor (currently sub-tile off near the player).

**Why.** `screenToWorld` → `solveLiftedY` (renderer.ts:4193-4197,
`render/elevPick.ts`) inverts the terrain lift assuming ortho; under lean the
lifted-Y solve doesn't account for `depthScale`.

**Approach.** Thread `depthScale` into the lift inversion. `unprojectScreen`
(cameraProject) is already the exact closed-form inverse for the flat plane; the
lift solve must iterate against the **depth-scaled** y, not the affine y. `q=0`
exact (early-return).

**Verify.** Under lean, click the edge of a lifted tile / stair — picked tile
matches the cursor; flat-ground picking unchanged; `q=0` exact round-trip.

---

## Running these as a workflow — collision warning

All five items live in the **same** `renderer.ts` (~28k lines). Each touches a
**distinct function** (`drawReflections`, `solveLiftedY` path, the lightmap
choke, the chunk-bake queue, the toggle/main.ts), so hunk-level conflicts are
unlikely **if** each agent edits only its own function. But do NOT have two
agents rewrite overlapping regions in parallel. Safe division:

- **Parallelize** Items 3, 4, 5 (independent functions, independent files where
  possible).
- Item 2 (lever 3) is the biggest and riskiest (baker) — give it its own lane;
  it **gates** Item 1.
- Item 1 (on-by-default) runs **after** Item 2 verifies.
- Serialize the final merges to `main`; re-run `npm run typecheck` +
  `npm run test -w @arx/client` (843 tests today) + `npm run build` before each
  push. Deploy = push `origin/main` (Forge auto-deploys; see [[prod-deploy-ops]]).

Update `docs/epic-b-camera-lean-plan.md` and the `painted-stage-epic` memory as
each lands.
