# THE ONE RENDER — the verification gate (F0)

The F0 foundation gate pins the q=0 invariants BEFORE any rework, so every
later phase can prove it did not break the flat look live players use. F0
adds tests + tooling only — **no renderer behavior changes**. This is the
safety net Track A and Track B run against.

Two layers:

1. **Golden-frame gate** — a fixed set of canonical q=0 scenes captured as
   PNG baselines; a re-capture+compare mode reports per-scene pixel-diff
   stats. "The flat look still holds."
2. **Node parity tests** — pure, headless specs that pin the projection /
   geometry invariants (`npm run test -w @arx/client`).

---

## 1. Golden-frame gate

Harness: `packages/client/dev/goldenFrames.mjs`. Baselines:
`packages/client/dev/golden/*.png` (committed) + `golden/manifest.json`.

### Rig

A private clone of the stage rig on a **free** port so it never collides
with the standing rig on :5231:

- Config: `packages/client/vite.config.f0.ts` — port **:5241**, proxying
  `/ws`, `/dev`, `/voice` to the rig-36 backend on **:8814** (the wire
  protocol is untouched by the epic, so the backend lane is shared).
- Login: `perf12_probe` / `probe-owl-9127`.
- Playwright: `/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs`.

```sh
# from packages/client, with the rig-36 backend up on :8814
node_modules/.bin/vite --config vite.config.f0.ts      # rig on :5241
node dev/goldenFrames.mjs capture                       # (re)write goldens
node dev/goldenFrames.mjs compare                       # prove the flat look holds
```

`ORIGIN`, `SCENES`, `TOL`, `THRESH`, `FRAMES` env vars override defaults
(see the harness header). `SCENES=interiors,graveyard` limits the run.
Setting `TOL` overrides the per-scene tolerances with one global value.

### Scenes + coords (reuse these EXACT framings)

All captured at **q=0** (leanTarget is never set → `camera.q === 0`,
asserted at boot), `/time 12`, viewport **1500×900 @ dpr 2**, zoom 1.

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
  water) with headroom above the observed per-frame max, so a clean q=0
  recapture always PASSes. This mirrors the existing `stage-parity` gate's
  per-scene allowances — it is **not** a byte gate; q=0 need not be
  byte-identical, only reproduce the flat look.
  - `interiors` (near-static geometry) is the **tightest, most trustworthy**
    gate. `meadow` is the **coarsest** (grass wind swings 5–17%): it guards
    ground/tree gross regressions only — grass parallax fidelity is pinned
    precisely by the `grassProjectParity` node test, not by this scene.
- Sensitivity check (F0): forcing the lean on (`leanTarget=0.0013`, q>0) at
  `interiors` diffs **61%** against its q=0 golden vs the 2% tol — the gate
  has teeth.

### How each later phase uses the gate

1. Develop the phase on its worktree off `epic/foundations`.
2. Bring up the F0 rig (`:5241`) on the phase's branch.
3. `node dev/goldenFrames.mjs compare` — **all scenes must PASS**. A FAIL
   means q=0 (the flat look) drifted past the scene's animation floor:
   inspect which scene, re-run that scene alone (`SCENES=<name>`), and eye
   the live rig vs `dev/golden/<name>.png`.
4. A phase that *intentionally* improves q=0 (the epic allows q=0 to change,
   only to keep reproducing the flat look) re-captures the goldens
   (`capture`) in the SAME commit, with the visual change owner-justified in
   the message — never silently widen a tolerance to hide a regression.
5. Convergence (C0/C1) runs the full gate on the merged `epic/foundations`.

---

## 2. Node parity tests

Run: `npm run test -w @arx/client` (node:test via tsx).

- **`render/cameraProject.test.ts`** — the projection law: q=0 is
  byte-identical to the old affine camera; the inverse is exact at any q;
  depthScale / horizon / clamp invariants. (pre-existing; confirmed green.)
- **`render/grassProjectParity.test.ts`** (F0, new) — the **grass-shader
  port spec** for B2. A pure JS mirror of the homography (`sx0 = wx·scale+ox;
  wdiv = max(MIN_W, 1 − q·(sy0−cy)); sx = cx + (sx0−cx)/wdiv; …`) is pinned
  equal to `projectWorld` across q ∈ {0, 0.0005, 0.0013, 0.003} and a spread
  of world points, and the per-vertex `w` the shader writes is pinned to
  `1/depthScale`. When B2 transcribes this mirror to GLSL (retiring
  `grassViewMatrix`), matching `projectWorld` here proves the meadow
  parallaxes at exactly the player's rate. (The `grassWindMirror` pattern:
  a JS twin of a GLSL function pinned by test.)
- **`render/structureFace.test.ts`** (F0, extended) — the **q=0
  rect-equivalence** invariant A1 must preserve: wired through the REAL
  `cameraProject` at q=0, an E-W run's side face is an axis-aligned
  rectangle (vertical edges, horizontal top/base, one shared depthScale);
  faceUV over it collapses to plain rect placement; and a receding run's
  per-corner depthScales are equal at q=0 but diverge under lean (proving
  the collapse is a real q=0 property, not a construction artifact).

---

## Regression gate (every phase)

- `npm run typecheck` clean.
- `npm run test -w @arx/client` green.
- `node dev/goldenFrames.mjs compare` — all scenes PASS.
