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
