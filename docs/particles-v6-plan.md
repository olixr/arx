# THE MATTER LEARNS TO LIVE — particles v6

Status: **IN FLIGHT (2026-09-04).** The successor to FX v5 (THE MATTER
RISES, docs/fx-v5-matter-plan.md). v5 gave the engine a spine: real
height, the world layer, pooled emitters, ten mastered materials. v6
gives the matter a LIFE. Everything v5 shipped keeps rendering
byte-identically until a recipe opts into the new vocabulary — the
q=0 discipline from the camera epic, applied to grains.

## The audit (what the engine still cannot say, 2026-09-04)

1. **ONE SIZE LAW.** A grain either shrinks linearly to nothing or
   holds size and fades on a fixed alpha tent. A flame body cannot
   start big and DWINDLE on an ease; smoke cannot swell fast, hang,
   then thin; nothing pulses.
2. **ONE ALPHA LAW.** Alpha is derived from `grow`, never authored.
   Smoke that should be born translucent, thicken, and dissolve has
   no way to say it.
3. **THREE HARD SWITCHES.** The cooling ramp is at most four bands
   with fixed default stops. It cannot run yellow→orange→red→dark
   red→soot as a stepped gradient — the flat-vector reading the art
   direction asks for is a POSTERIZED gradient, many bands, not a
   blend and not three cuts.
4. **ONE WAVEFORM.** `wobble` is one sine at 6.5 rad/s on x. No
   frequency, no triangle/noise, no per-axis choice, no jitter.
5. **FIXED VARIANCE.** Speed 40–100%, life ±30%, size ±30% for every
   grain in the game. A tight spark shower and a ragged ash fall must
   roll the same dice.
6. **NO FORCES.** Nothing lifts embers on the heat that made them,
   nothing swirls, nothing gathers to a point. Convection — the thing
   that makes fire read as HOT — does not exist.
7. **NO SUB-EMITTERS.** `trail` sheds one hard-coded mote; `splat`
   spawns one hard-coded spatter. A grain cannot say "when I die,
   spawn THAT recipe" — so the 4–6-layer effects the brief asks for
   are hand-rolled per signature or not built at all.
8. **THE STAIN WAS NEVER WIRED.** `drainLandings` has zero renderer
   callers — every splat's "lingering fleck" promise died in the
   queue since 2026-08-02. The world does not remember what fell.
9. **RESIDUE IS A STAMP.** Ground marks are 26 hand-painted decal
   stamps per style, five seconds, drawn by the renderer's own switch.
   A burning floor is not built from the coals that actually landed.
10. **NO COMPOSER.** A deployment is a function. There is no data
    shape for "an effect = these layers at these moments with these
    knobs", so nothing can be tuned in a lab and re-exported, and the
    perf budget cannot see an effect's whole bill at once.
11. **NO GOVERNOR.** The cap is a hard 2600 with slot recycling; there
    is no quality dial that sheds fines first when frames run long.

## The v6 standing laws

- **THE LIFE IS A CURVE.** Size and alpha over life are CURVES, chosen
  from a shared registry (`curves.ts`): 17-sample tables, linear
  between samples, registered once per shape and memoized by key.
  A grain stores two ids; the pool never holds a closure or an array.
  The defaults `shrink` and `tent` reproduce today's math exactly.
- **THE RAMP IS A TABLE.** Color over life is a RAMP TABLE: up to
  eight stops, and `rampSteps` posterizes a smooth RGB interpolation
  into N flat bands — a stepped gradient that still reads as vector
  art. `fade/fade2/fade3` compile into a three-cut table, so every
  shipped recipe resolves the same color it always did.
- **VARIANCE IS AUTHORED.** `speedVar`, `lifeVar`, `sizeVar` say how
  wide each roll is. Absent = the v5 dice.
- **THE WAVE HAS A SHAPE.** `wave: sine|tri|noise`, `waveHz`,
  `waveAmp`, `waveAxis` (x, y, z). `wobble` stays as the sine alias.
  `jitter` is a per-frame random walk in tiles/s.
- **FORCES ARE FIELDS.** Pooled field records (cap 24): `lift`
  (convection updraft with a radius and a height falloff), `vortex`,
  `attract` (negative = repel), `wind`. A grain opts in with
  `mass > 0`; legacy matter has mass 0 and never pays a field lookup.
- **SUB-EMITTERS ARE RECIPES.** A recipe is a registered `{colors,
  opts, count}` (records, never closures). `onDeath`, `onLand`,
  `onBirth`, and `shed` (per-second) name a recipe id. Depth is
  capped at 2 so a chain can never run away; the pool cap still binds.
- **THE WORLD REMEMBERS.** `GroundMarks` (cap 220): flat ground-
  stratum marks — flecks, smears, char — fed by the landing queue
  (finally drained) and by `mark` recipes on grains that die on the
  ground. A burning floor is the char where coals actually fell.
- **EFFECTS ARE DATA.** `EffectDef = { id, layers[] }`; a layer is a
  burst or an emitter with an arrangement, a delay, an optional
  repeat, a grain tier, and a recipe. `EffectSystem.cast()` schedules
  layers through a pooled timeline; `params` (scale, dir, radius,
  x2/y2, z, quality) bind at cast time. Materials keep their function
  deployments as thin wrappers around data.
- **THE GOVERNOR SHEDS FINES FIRST.** A quality dial 0.35..1 driven by
  the frame's EMA. Layers carry `tier: fine|body|hero`; fines scale
  with quality², body with quality, heroes never drop. The cap holds
  as the last resort, never the first.
- **Inherited, still binding:** hard edges only; no blur/gradients/
  shadowBlur; glow through the sprite cache; deterministic geometry,
  per-frame randomness only through dt-gated emission; pool
  discipline; ≤ ~60 path ops per hook per frame; FX_SQUASH ellipses on
  the ground; alpha save/restore discipline; ONE-VOICE for owned
  materials.

## The phases

**Phase 1 — THE ENGINE LEARNS TO LIVE** (particles.ts, additive):
curves, ramp tables, variance, waveforms + jitter, fields, sub-
emitter recipes, two-tone core, blob/spark/ring silhouettes, velocity
alignment for squares/shards, screen-bounds cull in the overlay pass.
Zero visual change to shipped matter — the v5 tests are the gate.

**Phase 2 — THE WORLD REMEMBERS** (render/fx/groundMarks.ts): the
landing queue drained into a pooled marks layer painted in the decal
stratum; `mark` recipes; char accumulation.

**Phase 3 — THE COMPOSER** (render/fx/effects.ts + library/): the
EffectDef shape, the pooled timeline, tiers and the governor. The
library's first effects: fire (six layers + residue), smoke, frost,
storm, arcane — the exemplars every school inherits from.

**Phase 4 — THE LAB** (fxlab.html + dev/particlelab.ts): a standalone
stage with a grass ground, a body ruler, the effect roster, live
sliders over every numeric knob, time scale, frame-cost readout, and
JSON export. The `?fx` in-world lab gains the effect roster so
occlusion and lighting are audited in the real world.

**Phases 5+ — THE MASTER PASSES.** Ability by ability on the composer,
the v5 ritual unchanged: read the mechanic, storyboard three acts,
compose strata, cast live at four facings, audit against the body
ruler, count the frame cost. One roster wave per commit.

## Verification

Unit: curves/ramps resolve to the v5 numbers at defaults; recipes,
fields, and the timeline stay inside their caps under a 100-cast
storm; the governor is monotone and never drops heroes; every
library effect carries ≥4 layers, casts clean, and leaks nothing.
`npm test -w @arx/client` + `npm run typecheck` green before every
commit. Live: fxlab screenshots per exemplar, `?fx` in-world
occlusion shots, and a stress receipt (casts/s at a p50/p90 frame ms).

## As built — 2026-09-04 (in the shared tree, uncommitted at hand-off)

**Phase 1 — THE ENGINE LEARNS TO LIVE (particles.ts + fx/curves.ts).**
Curve and ramp registries (17/33-sample tables, ids on the grain, id 0 =
the legacy law; `shrink`/`tent` presets reproduce the v5 arithmetic to
1e-9); posterized ramps (`steps`) are the only gradient the world allows;
authored variance (`speedVar/lifeVar/sizeVar`, v5 dice as defaults —
BYTE-IDENTITY pinned by particlesV6.test.ts on a shared seed); shaped
waves (sine/tri/value-noise × x/y/z) and `jitter`; pooled force fields
(lift with base-gather and height falloff, vortex, attract/repel, wind;
cap 24; only grains with `mass` pay, settled ground matter never does);
sub-emitter recipes (`defineRecipe` → `onDeath`/`onLand`/`shed`, depth
cap 2, children may inherit velocity); two-tone `core`; `blob` (seeded
seven-sided, breathing) and `ring` silhouettes; `align`; `mark` → a
LANDING_MARK record; `spawnAt` with spread override (the composer's
door); the governor's `quality` dial with per-pop `tier`; four pops per
emitter; overlay screen-bounds cull. 1046 → 1100 client tests, all green.

**Phase 2 — THE WORLD REMEMBERS (fx/groundMarks.ts).** The landing
queue is drained at last; char/fleck/smear/frost marks (cap 220,
round-robin recycle) painted under the stamped decals in three acts;
char spreads 1.7× its coal, rime 2.2× its shard, a fleck 1.4× its drop;
the splat stain reads the ramp's cold end.

**Phase 3 — THE COMPOSER (fx/effects.ts + fx/library/).** `EffectDef`
layers (burst / emit / field / glow) with `at`, `every/times`, tiers,
arrangements, `radiusK`, `span` (bolt far anchors), `dz`, `toFar`;
pooled timeline, casts, glows (caps 64/256/48); handles move/stop;
`FxGovernor` (EMA of the render's own cost, hysteresis 11/15 ms, floor
0.35; fines q², body q, heroes 1). Renderer: `castEffect`, marks under
decals, governor fed per frame. The library: fire (THE EXEMPLAR —
shockfront, heart, low flame mass, tongues, lifted embers, sparks,
charring coals, wide smoke, shimmer, lift field, ember-bed floor, two
glows), smoke, frost, storm, venom, arcane, then blood/dust/water/shadow
mastered by their own passes.

**Phase 4 — THE LAB.** fxlab.html + dev/particlelab.ts (seeded stage,
body ruler, live knobs, time scale, quality dial, stress, JSON export,
contact sheets via `window.fxlab.contact`); `?fx` in-world lever gains
`e/E/m`; probes fx-sheet / fx-stress / fx-ingame in scripts/probes;
rig lane 37 (vite.config.rig37.ts → :8814).

**Receipts.** Contact sheets per effect at 64 px/tile (scratchpad);
in-world casts on lane 37 (fire.burst, storm.strike, smoke.bomb —
glow on the turf, smoke sorting behind a fence post, char marks
accumulating); stress: 48 simultaneous fire.burst pins the 2600 cap at
update p50 0.25 ms, draw p50 2.6 / p90 6.5 ms (headless software canvas).

**Laws the sheets taught.** MASS vs RUBBLE (overlapping 0.25–0.5-tile
masses; scattered small puffs read as rubble); FIRE IS A FLOOR THING
(the lift owns the embers, barely the body); a bolt whose far anchor is
its own point draws nothing (`span`); judge at 64, prove at 40.

**Phase 5 — THE MASTER PASSES, wave 1 (2026-09-04, ten agents, one per
material, each ≥3 honest contact-sheet passes per effect at 64 px/tile
with a 40 px/tile proof and a 24+24-cast stress receipt).** The library
now holds 47 effects: fire (burst, plume, floor, fan, trail, pillar),
smoke (bomb, veil, wisp, ring, trail), frost (nova, fog, shards, breath,
pillar), storm (strike, charge, arc, nova, cloud), venom (burst, cloud,
spit, pool, drip), arcane (bloom, orbit, beam, sigil, shatter), blood
(hit, spray, pool, drink — never glows), dust (slam, kick, billow, gouge),
water (splash, rain, jet, mist), shadow (veil, burst, wisps, grasp —
never glows). Every effect: ≥4 named layers of ≥2 kinds, a story, a
hero anchor, residue where the material has weight; all draw p90 < 7 ms
at the cap. Lead review of the final sheets accepted all forty-seven.

**The masters' engine pass (folded in after the reports).** Burst
`toFar` (a bolt's far anchor is the cast's) and `arrange: 'far'`; layer
`decay` (the k-th repeat fires at decay^k) and `along` (anchor offset
down the aim); path emitters `sweep` (the span grows near→far); orbit
`tangent`; `ringWidth`; splats honor `mark`/`markLife`; `onDeath` fires
on a land:'die' kill; settled ground matter ignores fields; `zg` doc
(positive = falls). Pinned in effects.test.ts / particlesV6.test.ts.

**Deferred asks (next engine band).** A foot-anchored spear silhouette;
a `wet`/`cold` soft mark kind; path density/size falloff along t; blob
ground squash; orbit y-squash; a per-grain attract toward the cast point;
`land: 'hold'`. In-world: dark floors may swallow DRIED/char stains —
audit on stone with `?fx`.
