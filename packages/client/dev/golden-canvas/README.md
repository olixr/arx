# q=0 golden baseline — CANVAS2D backend (THE LEAN COMES OUT)

The canvas2d twin of `dev/golden/` (the WebGL stage baseline). Each PNG is a
full 1500×900 @ dpr2 frame of the same canonical scene, captured on the
**standard display** (no `?stage`, `arx.stage` cleared) at the shipped flat
camera (`camera.q === 0`) from the untouched `b4c00f2e` code — the baseline
the perspective-lean removal (branch `epic/lean-out`) must hold byte-for-byte
on BOTH backends.

- Capture / compare: `BACKEND=canvas GOLDEN_DIR=dev/golden-canvas node dev/goldenFrames.mjs {capture|compare}`
- Scenes, coords, crop and per-scene tolerances: `manifest.json` (here) — the
  same framings and budgets as `dev/golden/manifest.json`.
- Do NOT hand-edit. Only re-`capture`, and only in a commit that owner-justifies
  an intended q=0 visual change.
