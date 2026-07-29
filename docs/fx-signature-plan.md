# THE SIGNATURE EPIC — ability FX v4

Status: **ALL WAVES SHIPPED — FULL COVERAGE.** 6af1cd5 LIVING MATTER
+ registry + 7 in-house signatures; cfa307c the four style waves (45
signatures) + impact-true projectiles; wave 3 the weapon-art rosters
(blade/rogue/archer/archmage), relic actives, sigil, and npc specials.
**121 FX faces, 121 bespoke signatures, zero missing** — every
castable ability in Arx owns a named centerpiece no other shares.
Registry: render/fxSignatures.ts spreads nine per-roster files;
fxSignatures.test.ts enforces no orphan keys and no empty signatures.

The v3 FX system is a shared grammar: every ability is a palette ×
ring × debris × decal × motif combination, composed in three strata
(ground wash under the y-sort, standing volumes inside it, traveling
lines above it). It guarantees coverage — and it caps identity. Two
fire arts differ in silhouette but burn the same fire. This epic adds
the two tiers above the grammar.

## Phase A — THE LIVING MATTER LAW

Matter must read as matter, not as shrinking squares. The particle
engine grows four capabilities every ability inherits at once:

- **New silhouettes.** `lick` — a tapered flame tongue oriented along
  velocity, hot wedge inside a colored body, width breathing on its
  own phase. `puff` — a three-lobe billow cluster that reads as
  volumetric smoke/mist while staying hard-edged. `glint` — a crossed
  sliver twinkle that scale-pulses. (Joining square/streak/shard.)
- **Color-over-life (`fade`).** A hard band-switch to a second color
  late in life: embers cool to soot, ice shards steam off to pale
  mist, blood dries dark. One field, the whole material story.
- **Trail shedding (`trail`/`trailColor`).** Flying matter sheds
  micro-motes along its arc — gobbets become comets, sparks scratch
  the air. Sub-emission runs inside the pooled update; the cap law
  still holds.
- **Wobble (`wobble`).** Sinusoidal lateral drift for smoke and
  wisps — rising matter staggers, it doesn't ride rails.

`fxDebris` is then reworked family by family into layered
compositions: fire = flame licks + soot puffs that darken + streaking
sparks with trails + lingering coals; ice = tumbling shards fading to
mist + glint twinkles + slow ground fog; shadow = wobbling billows +
dark licks curling upward; blood = streaks + heavy droplets drying
dark + ground spatter. Every detonation in the game gains primary,
secondary, and tertiary matter with no per-ability work.

## Phase B — THE SIGNATURE LAW

**Every marquee ability owns a bespoke choreography no other ability
shares.** A new registry (`render/fxSignatures.ts`) maps ability id →
`AbilitySig`, three hooks composed ON TOP of the v3 grammar:

- `spawn(c)` — the one-shot detonation beat: bespoke bursts, staged
  aftermath via age-windowed emission in the frame hooks.
- `ground(c)` — flat set-pieces painted in the under-world stratum.
- `air(c)` — overlay set-pieces riding above the scene.

`SigCtx` hands each hook the style palette, life `t`/`age`, seeded
`rand`, world+screen anchors (heart and far-end for traveling kinds),
camera scale/squash, the particle engine, and the glow queue. Staging
is stateless: age windows + `frameDt`-gated probability (the rim-shed
pattern), never closures — the beat records law holds.

Authoring laws (binding for every signature):
1. Hard edges only — no blur, no gradients, no shadowBlur. The world
   is chunky and so is its magic.
2. Alpha discipline — save/restore, never leak globalAlpha.
3. Ground ellipses squash by FX_SQUASH; air pieces lift ~0.4–0.5·sc.
4. Deterministic: geometry from the seeded rand; per-frame randomness
   only through frameDt-gated emission.
5. Bounded: ≤ ~60 path ops per hook per frame; emission rates that
   respect the 1400-particle cap. 120fps is a law.
6. The signature must SAY the mechanic: an execute reads as a
   beheading stroke, a snare as a closing jaw, a ward as standing
   stone. Meaning first, spectacle second.
7. No two signatures may share their centerpiece. The registry is
   the anti-copy-paste contract; the sibling test enforces distinct
   faces, the eye enforces distinct souls.

## Rosters and waves

- Wave 1 (exemplars, in-repo): fireburst, frost_nova, whirlwind,
  smoke_bomb — one archetype each: fire blast, ice nova, spinning
  melee, lingering shadow field.
- Wave 2 (per-style files): `fxSigsMelee.ts`, `fxSigsArchery.ts`,
  `fxSigsMagic.ts`, `fxSigsSneak.ts` — the full technique ladders
  (10 each + their unwritten pages) plus the founding weapon arts.
- Wave 3: blade/rogue/archer/archmage weapon-art rosters, relic
  actives, sigils, npc specials.

Verification: every wave is cast live (Playwright, held-key casts)
and screenshotted; `npm test` + typecheck green before commit.
