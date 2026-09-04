# q=0 golden baseline — THE ONE RENDER (F0)

These PNGs are the **committed q=0 flat-look baseline** for the epic. Each
is a full 1500×900 @ dpr2 frame of a canonical scene captured at the shipped
flat camera (`camera.q === 0`). Later phases re-capture and diff against
them to prove the flat look still holds.

- Capture / compare: `node packages/client/dev/goldenFrames.mjs {capture|compare}`
- Scenes, coords, crop and per-scene tolerances: `manifest.json` (here) and
  `docs/the-one-render-verify.md`.
- Do NOT hand-edit. Only re-`capture` (which also rewrites `manifest.json`),
  and only in a commit that owner-justifies any intended q=0 visual change.

## Meadow needs re-capture (grass-default-cleanup, 2026-09-04)

The GPU meadow is now the DEFAULT grass and the canvas2d baked meadow (plus
its fallback) was removed. The committed `meadow.png` in BOTH baselines
(`golden/` and `golden-canvas/`) still shows the RETIRED CPU coat, so the
`meadow` scene is flagged `needsRecapture` in `manifest.json` and its diff
will FAIL by design until refreshed. Owner: re-run `capture` on the
sanctioned rig (perf12_probe, :5241 f0) to refresh the whole set under the
GPU-default meadow. All non-meadow scenes are unaffected by this change.
