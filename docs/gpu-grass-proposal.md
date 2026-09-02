# THE LIVING MEADOW GOES TO THE GPU — a grass-shader proposal

*Proposal, awaiting green-light. Companion to the painted-stage and
Epic-B camera-lean plans. The meadow is Arx's densest per-tile system;
this is how it becomes a GPU-instanced field that renders orders of
magnitude more blades, at higher frame rates on every machine, with true
interactivity — without cheapening one stroke of the painterly art.*

---

## §0. Why now

The camera lean widened the frustum toward the horizon (+67% visible
tiles, measured), and the meadow — the heaviest per-tile pass — felt it
first. The tactical answer already shipped (cap grass at the ortho reach
under a lean, where far blades are sub-pixel). But the strategic truth
the lean exposed is bigger: **the meadow is CPU-bound in a way that caps
its density and its reach.** Every blade is generated in JavaScript and
painted into a canvas sprite before the GPU ever sees it. That ceiling
is why a field can't be as deep, as dense, or as alive as it deserves.

Industry-leading grass — from open-world AAA to stylized hits — is
GPU-instanced: the card draws hundreds of thousands of blades from a
handful of instance buffers, animates them in the vertex shader, and
lets distance thin them for free. We can bring that here **while keeping
our hand-painted soul**, because two of our foundations make it clean:
the ONE WIND is already pure math (portable verbatim to GLSL), and the
painted-stage seam already owns the GPU. This is the meadow's WebGL/
WebGPU moment.

---

## §1. The meadow today

`generateGrassTile` (grass.ts) is a small work of art: per tile it deals
a painterly hand — lone **strands**, medium **stands**, dense **clumps**
(rooted in a shared base), **flowers**, **seed-heads**, and the short
**nap** every turf tile wears — driven by landform coverage noise and the
Detail lane (Tuft/Flowers). Every blade, flower and tree bends to **ONE
WIND** (`windAtInto` — sums of sines over the wind's along/across axes and
time; a single coherent gust field). Tones ride a graded shimmer ramp
(`BLADE_FILLS`: shade→base→lit per palette row).

The RENDER path is the bottleneck, not the art: blades are generated on
the CPU, **baked into canvas row-sprites** (`GrassSystem`, budgeted, cached
by a two-axis-invalidated ledger), uploaded as GL textures, and blitted
as quads. The row-sprite cache amortizes a settled meadow beautifully —
but a moving camera, a wider frustum, or a denser field pays CPU
generation + canvas raster for every new cell, and the sprite-budget
ceiling (`GRASS_SPRITE_BUDGET`) caps how much can be resident. The blades
never live on the GPU; they visit it as pictures.

---

## §2. The strategic shift — GPU-instanced painterly blades

**Keep the art; move the blades.** The proposal is not generic 3D grass
that would erase our style — it is to render *our* painterly blades as
**GPU instances**:

- The hand-painted blade shapes become a small **blade atlas** (a handful
  of painterly blade/flower/seed-head sprites across the tone ramp — the
  exact art we bake today, authored once).
- Each blade is a **GPU instance**: a per-instance record (world root,
  height, lean, tone index, blade-type, clump-phase) drives a textured
  quad the **vertex shader** builds, bends to the wind, foreshortens to
  the camera, and thins by distance. The **fragment shader** samples the
  atlas at the instance's tone. One draw call paints a whole field.

This is WebGL2's `drawArraysInstanced` — no WebGPU required for the core
(see §5). It moves the per-blade cost from JS+canvas to the card, lifts
the density ceiling by orders of magnitude, and turns wind and
interactivity into per-frame shader math instead of re-bakes.

---

## §3. Art fidelity — the non-negotiable

We are not trading craft for frames; we are spending frames to buy *more*
craft. The bar: **a still frame of the instanced meadow must be
indistinguishable from — then better than — today's baked meadow.**

- **The blade art is ours.** The atlas is authored from the current
  painterly blades and the `BLADE_FILLS` shimmer ramp — same silhouettes,
  same tones, same shade→base→lit lift. Per-instance tone index +
  height/lean jitter reproduce the strand/stand/clump variety and the
  meadow's tile-to-tile jitter that makes it read as grown, not tiled.
- **The composition is preserved.** Clumps stay rooted in a shared base
  (a clump = instances sharing a root + phase); flowers and seed-heads
  are instance types in the same field; the nap, roots, and the UNDER
  lane's coat (THE COAT LAW) all carry over as instance layers.
- **ONE WIND, literally.** `windAtInto` is pure math — it ports to a GLSL
  function byte-for-byte, so CPU systems (trees, cloth) and the GPU
  blades sample the *same* wind. No two-winds drift.
- **Every phase is screenshot-gated** against the current meadow, at rest
  and in wind, near and far, in five scenes. Nothing ships that the eye
  can tell from the hand-baked field except by its depth and its motion.

---

## §4. The architecture

- **Placement buffer (per tile, cached).** `generateGrassTile`'s output
  becomes an instance record array per tile — root xy, height, lean, tone,
  type, clump-phase — built once and cached (the row-sprite cache's
  successor, but holding tiny instance data, not multi-MB canvases). A
  moving camera streams instance buffers, not canvas bakes.
- **The instanced blade program** (a new stage lane): vertex shader builds
  each blade from its instance record; applies **wind** (the ported ONE
  WIND, plus per-instance phase); applies the **camera** (the Epic-B
  homography — perspective + `depthScale`, so blades lean and foreshorten
  with the ground for free); applies **disturbance** (§7). Fragment shader
  samples the blade atlas at the instance tone with the shimmer ramp.
- **LOD by depth.** Instance count and blade detail fall with `depthScale`
  — near tiles get full density and tall blades, far tiles thin toward a
  painted turf-tone (and past the ortho reach, nothing, as the tactical
  cap already does). The lean's own depth factor drives the LOD; the
  wider frustum becomes cheap where it's compressed.
- **The seam.** This is a new `StageInstanced` lane behind the same
  `StageBackend` contract (canvas oracle draws the instances as sprites —
  the parity reference; GL draws them instanced). It rides the
  painted-stage architecture, not around it.

---

## §5. WebGL2 now, WebGPU later

- **WebGL2 (now, verifiable):** instanced rendering (`drawArraysInstanced`,
  `vertexAttribDivisor`), vertex-shader wind, per-instance variation,
  depth LOD, the disturbance texture. The **entire core ships and is
  parity-verifiable on the current stage** — no WebGPU dependency.
- **WebGPU (later, the C-workstream):** the full industry technique —
  **GPU-driven placement** (a compute pass generates and culls instances
  from a density map + noise each frame, so the CPU stops touching blades
  entirely) — rides the WebGPU backend once it has a verification
  environment (per the seam-conformance plan). The WebGL2 instanced path
  is the substrate it upgrades, not a throwaway.

This split means we get the transformative win (instanced blades, GPU
wind, LOD, interactivity) **now**, and the last mile (compute-driven
placement) when WebGPU is ready — no blocked critical path.

---

## §6. Synergy with the camera lean

The lean and the grass shader are made for each other. The instanced
vertex shader applies the same perspective homography and `depthScale` the
lean introduced — so blades **lean and foreshorten with the ground
automatically**, and the depth factor *is* the LOD signal (far = fewer,
smaller, cheaper). A leaning camera over a GPU meadow that thins to the
horizon is exactly the deep, immersive vista the lean was for — and the
grass shader is what makes that vista affordable.

---

## §7. Interactivity & immersion

The blades stop being wallpaper and become a field you move through:

- **Trampling / parting.** A small **disturbance texture** (a scrolling
  buffer around the player) receives stamps from entities, projectiles,
  and abilities; the vertex shader bends blades away from disturbance and
  springs them back — you part the grass as you walk, a charge flattens a
  swath, a blast splays it. Cheap (a texture read per blade), huge for
  immersion.
- **Living wind.** Gusts, direction shifts, and storm intensity become
  uniforms — the whole field surges together (ONE WIND) and the shader
  makes it free.
- **Density & season as fields.** Density, tone, flower frequency, and
  dryness become sampled fields — a lush spring meadow, a dry late-summer
  field, a trampled war-camp yard — all data, no re-bake.

These are the "deep level of immersion" the meadow can now afford because
the GPU, not the CPU, owns the blades.

---

## §8. Phasing

Each phase preserves the art (screenshot-gated) and the stage's parity
discipline; the current baked meadow stays the fallback until the
instanced field is proven.

- **G-0** — this proposal.
- **G-1 — THE BLADE ATLAS & THE INSTANCED CORE (WebGL2).** Author the
  blade/flower/seed-head atlas from the current art; the per-tile instance
  buffer + the instanced blade program (vertex wind = the ported ONE WIND,
  fragment = atlas+tone); the canvas oracle draws instances as the parity
  reference. Gate: still-frame parity vs the baked meadow (5 scenes),
  measured density + fps lift.
- **G-2 — DEPTH LOD & THE LEAN.** Wire the perspective homography +
  `depthScale` into the instance shader; density/detail fall with depth;
  the wider frustum becomes cheap. Gate: the leaned meadow thins to the
  horizon, screenshot-judged; fps under the lean recovered.
- **G-3 — INTERACTIVITY.** The disturbance texture; trampling, charges,
  blasts; living-wind uniforms. Gate: parting reads true, springs back
  naturally.
- **G-4 — FIELDS & SEASONS.** Density/tone/season as sampled fields; the
  meadow answers the zone. Gate: art sign-off across biomes.
- **G-5 (WebGPU) — COMPUTE-DRIVEN PLACEMENT.** The compute pass generates
  and culls instances on the GPU; the CPU leaves the blade loop entirely.
  Rides the WebGPU backend when verifiable.

**The milestone is G-1…G-3** — a GPU meadow that renders far more, far
faster, that leans with the camera and parts as you walk. G-4/G-5 deepen
it.

---

## §9. Risks & the bar

| Risk | Mitigation | Kill criterion |
|------|------------|----------------|
| The art reads cheaper than the hand-baked meadow | Atlas authored FROM the current blades + shimmer ramp; per-instance variety reproduces strand/stand/clump/flower; screenshot-gated per phase, at rest and in wind | If a phase can't match the baked meadow's still frame, it doesn't ship; the baked path stays |
| Parity: the oracle can't instance | Canvas oracle draws instances as individual sprites (the reference); GL instances match it | Standard three-way discipline; a lane that can't hold parity stays on the baked path |
| Perf doesn't materialize | Measure density × fps at each phase on the big-window + weak-machine rigs | If instanced isn't clearly faster at equal art, keep the baked meadow |
| Instance-count blowup at huge frustums | Depth LOD + the ortho-reach cap + density fields bound it | The cap already holds; LOD tightens it |
| Migration risk from the baked path | Behind a flag, baked meadow as fallback, phase-by-phase, parity-gated | Revert the flag; the baked meadow is untouched |

**The bar, restated:** the instanced meadow must first be
*indistinguishable* from today's hand-painted field, and only then may it
be denser, deeper, more alive. We render more grass to feel more, not to
show off the technique — the technique disappears into the immersion.

---

*Grounding: grass.ts (`generateGrassTile`, ONE WIND `windAtInto`,
`BLADE_FILLS` tone ramp, `GrassSystem` bake/cache), the painted-stage
`StageBackend` seam, the Epic-B homography (`cameraProject.ts`,
`camera.depthScale`), and the WebGPU seam-conformance plan.*
