# THE ONE RENDER — the verification gate (the flat-look gate)

The gate pins the FLAT LOOK — the one camera the 2D client has (the
pitched-orthographic affine, `x = wx·scale + ox`, `y = wy·scale·yScale + oy`)
— so every render change can prove it did not break what live players see.
It was built as the F0 foundation gate for THE ONE RENDER, pinning "q=0"
(the flat game) against the perspective lean; **the lean was removed from
the 2D client on 2026-09-04** (epic/lean-out, see
`docs/perspective-review-and-3d-client-plan.md`), so there is no `q` any
more: `Camera` has no `q` field, no `depthScale`, and the harness ABORTS if
a build under test still carries `camera.q` (a stale bundle). The gate
outlived the lean because it is exactly THE LAW every removal band was
held to — the flat game pixel-identical before and after, on BOTH backends.

Two layers:

1. **Golden-frame gate** — a fixed set of canonical scenes captured as PNG
   baselines per backend; a re-capture+compare mode reports per-scene
   pixel-diff stats. "The flat look still holds."
2. **Node parity tests** — pure, headless specs that pin the projection /
   geometry invariants (`npm run test -w @arx/client`).

---

## 1. Golden-frame gate

Harness: `packages/client/dev/goldenFrames.mjs`. Baselines, one directory
per backend (each with `manifest.json` recording the backend + files):

- `packages/client/dev/golden/*.png` — the **stage** backend (the WebGL
  "Accelerated display", `?stage=world`).
- `packages/client/dev/golden-canvas/*.png` — the **canvas** backend (the
  standard canvas2d display, plain `/` with the stored `arx.stage` pref
  cleared). Captured from the untouched pre-removal code (main `b4c00f2e`).

### Rig

A private clone of the stage rig on a **free** port so it never collides
with the standing rig on :5231:

- Config: `packages/client/vite.config.f0.ts` — port **:5241**, or
  `vite.config.leanout.ts` — port **:5242** (a clone; two rigs let one be
  the untouched baseline for `ab` mode). Both proxy `/ws`, `/dev`, `/voice`
  to the rig-36 backend on **:8814** (the wire protocol is untouched by
  render work, so the backend lane is shared).
- Login: `perf12_probe` / `probe-owl-9127`.
- Playwright: `/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs`.
- The Vite file watcher is blinded on the rigs: restart Vite with `--force`
  after edits or it serves stale bundles.

```sh
# from packages/client, with the rig-36 backend up on :8814
node_modules/.bin/vite --config vite.config.f0.ts --force   # rig on :5241
node dev/goldenFrames.mjs compare                            # stage backend vs dev/golden
BACKEND=canvas GOLDEN_DIR=dev/golden-canvas node dev/goldenFrames.mjs compare   # canvas backend
node dev/goldenFrames.mjs capture                            # (re)write the stage goldens
BACKEND=canvas GOLDEN_DIR=dev/golden-canvas node dev/goldenFrames.mjs capture   # (re)write the canvas goldens
```

### Env

| var | meaning |
|---|---|
| `ORIGIN` | rig origin (default `http://localhost:5241`) |
| `BACKEND` | `stage` (default) = the WebGL accelerated display (`?stage=world`); `canvas` = the standard canvas2d display (plain `/`, `arx.stage` cleared). The harness asserts `renderer.stageWorld` matches the claimed backend. |
| `GOLDEN_DIR` | golden directory relative to `packages/client` (default `dev/golden`; use `dev/golden-canvas` with `BACKEND=canvas`). The manifest records the backend and dir-relative file paths. |
| `SCENES` | comma-separated scene names to limit the run (`SCENES=interiors,graveyard`). A subset `capture` MERGES into the standing manifest. |
| `TOL` | one global differing-pixel fraction overriding the per-scene tolerances |
| `THRESH` | per-pixel max-channel delta that counts as "differs" (default 24) |
| `FRAMES` | candidate frames sampled per scene in `compare` (default 5; the MIN diff wins) |
| `DIFF_OUT` | `compare` only: a directory (relative to `packages/client`) to write `<scene>.diff.png` into — every differing pixel painted red over the dimmed golden, so a FAIL can be read by eye (a wandering NPC vs a structural drift) |
| `BASE_ORIGIN` | `ab` mode only: the baseline rig's origin (the untouched code) |

### Modes

- `capture` — (re)write the goldens for `BACKEND` into `GOLDEN_DIR`.
- `compare` — shoot the candidate rig and diff against the committed goldens.
- `ab` — **the drift-immune form of the law**: per scene, shoot the
  baseline rig (`BASE_ORIGIN`), drop the session, shoot the candidate
  (`ORIGIN`) seconds later, and diff the two. The shared rig-36 world moves
  between shots (NPC routines, work cycles, restocks relocate whole props
  and figures), so a committed golden can drift past a tight budget with
  NO code change — `interiors` (2%) has gone 0.17% → 3.0% in fifteen
  minutes. `ab` compares before vs after at the same world moment.

  ```sh
  BASE_ORIGIN=http://localhost:5241 ORIGIN=http://localhost:5242 node dev/goldenFrames.mjs ab
  BASE_ORIGIN=http://localhost:5241 ORIGIN=http://localhost:5242 BACKEND=canvas node dev/goldenFrames.mjs ab
  ```

Recommended recipe: run `compare` on both backends; on any FAIL run `ab`
against an untouched baseline rig with `DIFF_OUT` to prove or disprove code
drift; if the baseline fails its own golden, re-shoot that scene from the
baseline rig immediately before the compare. **Never widen a tolerance.**

### Scenes + coords (reuse these EXACT framings)

All captured at `/time 12`, viewport **1500×900 @ dpr 2**, zoom 1, on the
overworld plane (the harness toggles `/museum` off if the probe was left
there).

| scene | `/tp` | surfaces covered | tol |
|---|---|---|---|
| `wall-market` | `-420 -240` | E-W crenellated stone wall run, market stalls/benches/barrels (props), willow, grass | 9% |
| `interiors` | `-430 -290` | building exteriors + two building interiors (tables, chairs, rugs, shelves), stalls, benches | 2% |
| `curtain-fence` | `-460 -240` | long clean E-W castle curtain wall + a wooden fence-run pen (the run-continuous barrier volume hedges share) + crates + grass | 4% |
| `graveyard` | `-512 -212` | E-W stone perimeter wall, iron fence, gravestone props, open grass | 10% |
| `meadow` | `42 20` | open grass meadow + scattered trees (billboards) | 22% |

### The diff + tolerance

- Compared over a **crop** (in backing-store px) that excludes the animated
  HUD: top 44 css-px (level badge), right 34% (the fps/tick/entities
  confession + toolbar), bottom 210 css-px (chat log, tips, hotbar,
  xp/health bar). The crop measures the WORLD, not the chrome.
- A pixel "differs" when its **max channel delta > 24** (absorbs AA /
  sub-pixel noise). A scene's stat is the **fraction of differing pixels**,
  taken as the **MIN over `FRAMES` sampled frames** — so a transient
  animation phase cannot fail the gate, but a broken flat look (which
  differs in *every* frame) does.
- **Tolerance is per-scene**, calibrated to the scene's inherent animation
  floor (grass wind, ambient pollen particles, patrolling NPCs, flames,
  water) with headroom above the observed per-frame max, so a clean
  recapture always PASSes. It is **not** a byte gate on its own — the
  byte-identical claim of a removal band rests on the algebraic collapse
  (every removed path was gated off or reduced to the identity) and this
  gate proves the look held on top of it.
  - `interiors` (near-static geometry) is the **tightest, most trustworthy**
    gate. `meadow` is the **coarsest** (grass wind swings 5–17%): it guards
    ground/tree gross regressions only — grass parallax fidelity is pinned
    precisely by the `grassProjectParity` node test, not by this scene.
- Sensitivity check (F0, historical): forcing the lean on at `interiors`
  diffed **61%** against its flat golden vs the 2% tol — the gate has teeth.

### How a change uses the gate

1. Bring up a rig on the branch (`:5241` or `:5242`, `--force`).
2. `compare` on BOTH backends — **all scenes must PASS**. A FAIL means the
   flat look drifted past the scene's animation floor: inspect which scene,
   re-run it alone (`SCENES=<name>`, `DIFF_OUT=...`), `ab` against a
   baseline rig, and eye the live rig vs `dev/golden*/<name>.png`.
3. A change that *intentionally* improves the flat look re-captures the
   goldens (`capture`, both backends) in the SAME commit, with the visual
   change owner-justified in the message — never silently widen a tolerance
   to hide a regression.

---

## 2. Node parity tests

Run: `npm run test -w @arx/client` (node:test via tsx).

- **`render/cameraProject.test.ts`** — the projection law of the kept
  REFERENCE module `render/cameraProject.ts` (pure math for the 3D client,
  no runtime callers in the 2D client): at q=0 `projectWorld` is exactly the
  affine camera; the inverse is exact at any q; depthScale / horizon /
  clamp invariants.
- **`render/grassProjectParity.test.ts`** + **`grassProjectShaderMirror.test.ts`**
  — the **grass-shader spec**: the JS mirror of `grassProjectGlsl` (the
  per-vertex camera affine the GPU grass projects through) is pinned equal
  to `projectWorld` at q=0 across a spread of world points, and the shipped
  GLSL is asserted free of any lean uniform / perspective divide
  (`w = 1`). This is what proves the meadow parallaxes at exactly the
  player's rate.
- **`render/structureFace.test.ts`** — an E-W run's side face through
  `projectFace` is an axis-aligned rectangle (vertical edges, horizontal
  top/base); `faceUV` over it collapses to plain rect placement and bilerps
  a general trapezoid correctly.
- **`render/drawOrder.test.ts`** — THE ONE RENDER's painter's-order
  comparator (shelf law, A5 near-row depth, the volume-before-billboard tie
  rule, the G-PERF stable tiebreak).

---

## Regression gate (every change)

- `npm run typecheck` clean.
- `npm run test -w @arx/client` green.
- `npm run check:cycles` at or below baseline.
- `node dev/goldenFrames.mjs compare` on **both** backends — all scenes PASS.
