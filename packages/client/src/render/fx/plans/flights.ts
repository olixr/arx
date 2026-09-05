/**
 * FLIGHTS — ability plans (particles v6 phase 5; re-voiced by THE
 * MASTERED HAND, Phase 4). The archer's named quivers speak the archery
 * roster's own wood-and-vane effects (archery.* — registered from
 * plans/archery.ts: thunk, loose, fall, feathers, flight, cinderfall,
 * and the Phase 4 five — brand, brand_break, snare, briar, crescendo)
 * beside the library's materials; no flight needed an effect of its own.
 *
 * Wire reality: a projectile fan lands as one `blast` (radius 0.55, no
 * far anchor, no heading) at each wound; ground arts telegraph then
 * `blast` at the target with the art's radius; `beam`/`bolt` carry x→x2;
 * a `field` lives for its ticks; `pulse_nova` speaks one `nova` per
 * pulse at the caster. A cast landed inside its follow window arrives
 * with flourish `follow` (onFollow added, ×1.15); an art's aftermath
 * arrives as its own `field` fx `<art>:aftermath`.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';

export const FLIGHTS_PLANS: Record<string, AbilityPlan> = {
  // SUSTAIN field, `plant`, bleed, vs venom. The rooted arrow: a thunk, then the briar re-grows its teeth on the field's beats and keeps tugging the caught to center — a planted patch the volleys read.
  wakewood: { cues: [{ id: 'archery.thunk', scale: 1.1 }, { id: 'archery.briar', scale: 1.1, radiusK: 0.9, at: 0.15, every: 1.1 }] },
  // OPENER beam, `burn` + aftermath. The weight of dawn: the shot leaves, the morning line is lit down the corridor, the plumb stamps its last disc of light at the line's end, and what dawn weighs, it burns.
  larkshot: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'arcane.beam', scale: 1.15, at: 0.02 }, { id: 'arcane.sigil', scale: 0.55, atFar: true, at: 0.3 }, { id: 'fire.trail', scale: 0.35, at: 0.25 }] },
  // The dawn stays on the ground it crossed: a burning floor re-catching on its beats under a standing disc of morning light.
  'larkshot:aftermath': { cues: [{ id: 'arcane.sigil', scale: 0.45, radiusK: 0.8 }, { id: 'fire.floor', scale: 0.7, radiusK: 0.9, at: 0.2, every: 1.0 }] },
  // OPENER, `chill`, wide and cheap. The rung splinter: a small thunk, then the glass splinter stands point-first, spitting, and rimes where it stood.
  glasshail: { cues: [{ id: 'archery.thunk', scale: 0.4 }, { id: 'frost.shards', scale: 0.55, at: 0.02 }] },
  // PAYOFF bolt, `shock`, reads chill|brand. The pond overhead: the arrow skips head to head under the storm's zap, the water ceiling crowns above each strike; across a chilled or branded line every head takes the stroke and the mark breaks.
  stormskip: { cues: [{ id: 'archery.flight', scale: 0.5 }, { id: 'storm.arc', scale: 0.9 }, { id: 'water.splash', scale: 0.65, atFar: true, at: 0.05, z: 1.1 }], onFollow: [{ id: 'storm.strike', scale: 0.6, atFar: true, at: 0.1 }, { id: 'archery.brand_break', scale: 0.7, atFar: true, at: 0.12 }] },
  // PAYOFF, burn, reads chill|plant. The fired vessel: the arrow comes down first, the kiln's work shatters at the mark, the shard ring cools on a burning floor; on a chilled body or a planted patch the kiln lands heavier and wider — a pillar stands in the wider burst.
  charfall: { cues: [{ id: 'archery.fall', scale: 0.35, radiusK: 0.2 }, { id: 'fire.burst', scale: 1.3, at: 0.22 }, { id: 'fire.floor', scale: 0.6, radiusK: 0.8, at: 0.6 }], onFollow: [{ id: 'fire.burst', scale: 0.9, radiusK: 1.25, at: 0.35 }, { id: 'fire.pillar', scale: 0.7, at: 0.3 }] },
  // PAYOFF, void seekers, reads expose|brand. The snuffed lamp: no flash, no thunk — the dark comes up and holds, one pale feather rocks down inside it; on a marked body the mark breaks in the dark.
  hushfall: { cues: [{ id: 'shadow.veil', scale: 0.8 }, { id: 'archery.feathers', scale: 0.45, at: 0.25 }], onFollow: [{ id: 'archery.brand_break', scale: 0.6, at: 0.15 }] },
  // PAYOFF, execute, bleed, red ledger. The marked heart: the called shot thunks, the wound beats in time with the horn-brand, and the woods vacate in a flush of wings.
  quarry_call: { cues: [{ id: 'archery.thunk', scale: 0.9 }, { id: 'blood.spray', scale: 0.8, at: 0.05 }, { id: 'archery.feathers', scale: 0.7, at: 0.1 }] },
  // SUSTAIN pulse nova, reads left|right. The three strings: each pulse's note rings out as a ring of light, the string's lens hangs at the chest; after the weave's hand the chord shatters the room's glass.
  plucked_chord: { cues: [{ id: 'arcane.bloom', scale: 0.85, radiusK: 0.8 }, { id: 'arcane.orbit', scale: 0.4, at: 0.08 }], onFollow: [{ id: 'arcane.shatter', scale: 0.7, radiusK: 0.7, at: 0.05 }] },
  // Rank IV: the last note hangs in the room after the strings go still — a sigil of the chord laid on the floor, the three strings' lenses still orbiting it on every beat, the ring thinning as the room forgets.
  'plucked_chord:aftermath': { cues: [{ id: 'arcane.sigil', scale: 0.7, radiusK: 0.9 }, { id: 'arcane.orbit', scale: 0.45, radiusK: 0.8, at: 0.2, every: 0.8 }] },
  // OPENER nova, `plant`, pull + aftermath. The shuttle passes: the net of night is drawn IN — tendrils gathered from the rim to the heart, the edge cinching — then the catch is held at the center in a ring of dark.
  nightweft: { cues: [{ id: 'shadow.grasp', scale: 1.4, radiusK: 1.0 }, { id: 'shadow.wisps', scale: 0.5, at: 0.8 }] },
  // The net stays on the floor: the veil re-filling on its beats, soul-flames keeping the ring.
  'nightweft:aftermath': { cues: [{ id: 'shadow.veil', scale: 0.8, radiusK: 1.0, every: 0.8 }, { id: 'shadow.wisps', scale: 0.4, radiusK: 0.8, at: 0.1 }] },
  // ANSWER, `shock`, knockback, reads quake (+ knockback ×1.5). The forge visits: the anvil lowers in three heavy jolts, each with its own dust ring, seats, and takes one hammer-bolt on its face; on quaking ground it rings out in a storm ring and the crowd rolls farther in a cloud.
  the_anvil: { cues: [{ id: 'dust.slam', scale: 0.6 }, { id: 'dust.slam', scale: 0.8, at: 0.25 }, { id: 'dust.slam', scale: 1.2, at: 0.5 }, { id: 'storm.strike', scale: 1.5, at: 0.75 }], onFollow: [{ id: 'storm.nova', scale: 1.0, radiusK: 0.9, at: 0.8 }, { id: 'dust.billow', scale: 0.8, radiusK: 1.2, at: 0.9 }] },
};

export const FLIGHTS_EFFECTS: EffectDef[] = [];
