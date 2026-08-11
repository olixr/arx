# THE MATTER RISES — ability FX v5

Status: **PROPOSED.** The successor to v3 (THE SPELL STANDS IN THE
WORLD, b6f80c0) and v4 (THE SIGNATURE LAW + LIVING MATTER, 6af1cd5).
v4 gave every one of the 226 castable faces a bespoke choreography.
This epic replaces what that choreography is MADE OF. The signatures
compose; the matter itself is still placeholder-grade: seven flat
silhouettes, one color band, no height, no occlusion, no liquid, no
lightning. The best-choreographed dance in the world reads cheap when
every dancer is a cardboard square.

## The audit (what the engine cannot say today)

1. **HEIGHT IS A LIE.** `Particle` has `x, y` only — world y is both
   depth AND altitude. A "rising" plume is actually walking north
   through the world; nothing arcs up and falls back to the dirt.
   The `projAirWorldY` law exists for painters but the particle
   engine never uses it. Thrown debris cannot land, bounce, settle,
   or cast a contact shadow — so nothing ever feels IN the world.
2. **NOTHING WRAPS THE BODY.** A particle is either `ground`
   (y-sorted) or overlay (always on top of everything). There is no
   y-sorted airborne particle — a fire ring can never pass BEHIND
   the caster on its north arc, a poison cloud can never swallow a
   body. This is the single biggest "drawn on top" tell.
3. **ONE COLOR BAND.** `fade` = one hard switch at 55% life. Real
   fire is yellow → orange → dark red → soot gray. Ice steams to
   mist through a pale middle. One switch cannot tell that story.
4. **NO LIQUID.** Nothing drips, stretches, gloops, or splats.
   Poison and blood have no droplet, no hang-and-drip, no landing
   spatter. Venom currently reads as green fire.
5. **NO LIGHTNING.** Bolts are hand-painted strokes inside a few
   signatures. There is no arc primitive that jitters, branches,
   re-strikes, and surges between two live points.
6. **NO EMITTERS.** `burst()` is the only spawn verb. Every
   sustained plume/ring/path is hand-rolled per-signature with
   frameDt-gated emission — inconsistent, expensive to author, and
   the reason layered 4-5-system effects are rare.
7. **ONE GRAIN SIZE.** A single 0.7-1.3× size roll. No fine-mote
   population under the hero chunks — hence "big and blocky, hard
   to decipher." Real matter is mostly fines with a few heroes.

## The v5 standing laws

- **HEIGHT IS REAL.** `Particle` gains `z, vz` (tiles of altitude,
  rendered at FULL scale per the ragdoll precedent — heights are
  never yScale-squashed) with gravity pulling z → 0. `(x, y)` stays
  the ground anchor: it drives the y-sort, the contact shadow, and
  the landing. Screen position = `worldToScreen(x, y)` minus
  `z · scale`. The old planar behavior remains for ground-crawling
  matter (`z` defaults inert — all 226 shipped signatures render
  unchanged until their pass).
- **THE WORLD LAYER.** A third layer joins ground/overlay: `world` —
  airborne matter y-sorted at `sortY = y`, drawn at its altitude
  inside the entity band. Rings, clouds, and orbits wrap the body by
  construction. Overlay survives only for true screen-dressing
  (glints, motes near the lens).
- **MATTER COOLS IN STAGES.** `fade` generalizes to a ramp of up to
  three hard band-switches (`ramp: [t, color][]`). Still bands,
  never blends — the world is chunky and so is its cooling.
- **THE LIQUID LAW.** New `drop` silhouette (velocity-stretched
  teardrop, fattens as it slows) + drip emitters + THE SPLAT:
  a drop reaching z=0 dies into a ground stain fleck + 2-3 splash
  fines. Poison oozes, blood spatters, water rains.
- **THE ARC LAW.** New `bolt` primitive: a seeded jagged polyline
  between two anchors, re-jittering on strike beats (never per
  frame), with branch stubs and an ionization flicker envelope.
  Storm matter surges — it does not sprinkle.
- **EMITTERS ARE THE GRAMMAR.** Pooled emitter records (no
  closures): arrangement (point / ring / rim / path / cone / orbit)
  × rate envelope (attack, sustain, decay) × a matter recipe.
  Signatures declare emitters; they stop hand-rolling spawn math.
- **THE MATTER LIBRARY.** `render/matter/` — one mastered file per
  material: fire, smoke, dust, frost, venom, storm, blood, radiance,
  shadow, water. Each exports layered recipes (fire.burst,
  fire.ring, fire.path, fire.plume, fire.ball…) composing 3-5
  particle populations + glow + decal hooks. Fire is mastered in ONE
  place; every ability that burns inherits the mastery. No signature
  may hand-mix a material the library owns.
- **THE FINE GRAIN LAW.** Every material spawns 2-3 size
  populations: fines (0.02-0.04, the read of texture), body grains
  (0.05-0.09), sparse hero chunks. Cap rises 1400 → ~2600 paid for
  by color-bucketed drawing (sort the draw within each layer by
  fillStyle — the grass Path2D-bucket precedent holds 5k blades at
  121fps). 120fps stays a law; Firefox spot-check required.
- **Inherited, still binding:** hard edges only, no blur/gradients/
  shadowBlur in world FX; glow through the sprite cache riding
  globalAlpha; deterministic seeded geometry, per-frame randomness
  only through frameDt-gated emission; pool discipline, caps,
  ≤~60 path ops per hook per frame; FX_SQUASH ellipses on the
  ground; alpha save/restore discipline.

## The phases

**Phase 1 — THE ENGINE GROWS A SPINE.** z/vz + full-scale altitude
projection + contact shadows + landing events (splat/settle/bounce
hooks); the world layer in the y-sort; color ramps; `drop` + `bolt`
silhouettes; pooled emitters; granulometry populations; bucketed
draw + cap raise with perf receipts (Chrome 120 + Firefox spot).
All additive — zero visual change to shipped signatures.

**Phase 2 — THE MATTER LIBRARY.** The ten materials built and
mastered one at a time in a live lab: a `?fx` audit lever (the
`?icons` precedent) that stands the character in a clean field and
cycles material × arrangement on keypress for screenshot audit.
Each material is finished — multi-stage color, mixed grain, correct
weight, wraps the body, lands on the dirt — before the next begins.

**Phases 3+ — THE MASTER PASSES.** Ability by ability, roster by
roster, each one rebuilt on the matter library and verified live
before the next is touched. Order: the exemplars first (fireburst,
shockwave, frost_nova, smoke_bomb, envenom — one per element, they
set the bar), then school ladders (melee, sneak, archery, arx),
then weapon-art rosters (blade/rogue/archer/archmage/twohand/
dualwield/shield/combat), voices + flights, relics + sigils + NPC
specials, beastcraft, enchant proc voices. One commit per roster
wave; every ability signed off on screenshots before moving on.

**The master-pass ritual (per ability):** read the mechanic →
storyboard three acts (anticipation / impact / aftermath) → compose
strata (ground decal + world matter + air lines + glow + the
existing shake/hitstop/zoom punch) → cast live at all four camera
facings → audit screenshots against the BODY-RULER and the 2.5D
top-plane law → verify readability zoomed out → count the frame
cost. The signature must still SAY the mechanic — a ground smash is
flash, then a dust-lifting wavefront, then debris arcing on real
height, then settling fines over a cracked-earth decal. Meaning
first, spectacle through layers.

## Verification

`fxSignatures.test.ts` extends: every signature keeps a face, no
empties, and (new) no raw material mixing where a library recipe
exists. Matter library gets its own unit coverage on recipe shape.
Live: the `?fx` lab + Playwright held-key casts + the
canvas.toDataURL screenshot recipe. `npm test` + typecheck green
before every commit; 120fps receipts at each cap or draw change.

## As built — THE MATTER RISES, epic complete (2026-08-02)

Three phases, twelve migration waves, every commit live-verified.

**Phase 1 — THE ENGINE (0e00e51).** Height became real: z/vz/zg at
full scale, (x,y) the ground anchor; land codes die/settle/bounce/
splat with the per-frame landing queue; overlay/world/ground layers
with the world layer y-sorted among bodies; 3-stop ramps; drop and
bolt shapes (bolts re-seed on strike beats); pooled emitters
(point/ring/rim/path/cone/orbit/disc, negative outward = gather);
cap 2600 with bucketed overlay draw. Zero visual change shipped —
back-compatible until migration.

**Phase 2 — THE MATTER LIBRARY (6cc1688).** render/matter/: ten
mastered materials × 4–7 deployments, each screenshot-mastered in
the `?fx` MATTER LAB before any ability touched it. Audit laws:
ONE-SHOT COHORTS DIE BRIGHT; masses ≥0.145 tiles; A SLOW STREAK IS
A SLIVER; venom leads bright. Nine contract tests.

**Phase 3 — THE MIGRATION (twelve waves, 65edc69 → e83d724).**
MATTER_MIGRATED ledger: **116 of 227 signatures** speak the library;
the other 111 are audited-bespoke, every group covered by a written
doctrine in its file header or ledger comment. Verbs grown on
demand: fire.gobbets, fire.fan, fire.rain, venom.bead, dust.gouge,
blood.drink, storm.impact, water.undertow, water.curtain, radiance
et al. Doctrines written along the way:

- ONE-VOICE LAW: signatures never hand-mix owned materials.
- THE LIBRARY TELLS TRUE STORIES: deliberate lies (pale_flame's
  wrong-way fire) stay hand-painted.
- THE GATE RETIRES: a sustained library emitter replaces its old
  frameDt-gated wisps — one voice, never two.
- GRAMMAR REFUSAL OUTRANKS ONE-VOICE: walls do not billow, anvils
  do not ripple, the keeper's tongue is workings never blows —
  a school's stated grammar keeps library matter out.
- THE DOC-PROMISE LAW: audit the doc, not just the bursts —
  moonfall's cold fog and loose_iron's dust existed in comments
  only until the audit made them true.
- CROSSING-FRAME BEATS: stateless lifeMs/tPrev crossings fire
  library one-shots and emitters at exact story moments (the bite,
  the cinch, totality, each skip); beat-clock crossings (age/800)
  volley on a field's own pulse.
- Bespoke matter may take v5 physics without joining the library:
  caltrops, rampart_break's masonry, strewn_bait's grain.
- PROC VOICE: audited bespoke forever (wornLight.ts) — the floor
  stays the floor.

**Closing receipt (2026-08-02):** 64-cast worst-case barrage,
2421-particle peak: p50 13.4ms / p90 17.8ms / p99 22.7ms headless
Chromium. 369 client tests + typecheck green at every wave.

**Post-epic addendum (2026-08-11) — THE BREATH SPEAKS.** THE DRAWN
BREATH's commitment grammars gained their matter voices as a new
library CONSUMER, not a library change: `render/breathFx.ts` maps
each casted/channeled art to a curated deployment composition
(charge = gather on the winding body, wire radius contracting as the
ramp; note = the held hum between pulse beats, tame re-emit law).
ONE-VOICE holds — dialects compose deployments, never raw matter;
the fallback derives a material from the face's debris family. New
doctrine: `charge`/`note` fx kinds are PURE INSTRUMENT — excluded
from motif/signature set-pieces by `fxPureInstrument`, silent in the
sound chain. Contract: breathFx.test.ts (curated coverage, no
orphans, every voice audibly spawns, fallback total). Full record in
docs/cast-channel-plan.md.
