/**
 * FLIGHTS — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library.
 * The archer's named quivers speak the archery roster's own wood-and-
 * vane effects (archery.* — registered from plans/archery.ts) beside the
 * library's materials; no flight needed an effect of its own.
 *
 * Wire reality: a projectile fan lands as one `blast` (radius 0.55, no
 * far anchor, no heading) at each wound; ground arts telegraph then
 * `blast` at the target with the art's radius; `beam`/`bolt` carry x→x2;
 * a `field` lives for its ticks; `pulse_nova` speaks one `nova` per
 * pulse at the caster.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';

export const FLIGHTS_PLANS: Record<string, AbilityPlan> = {
  // The tree of years: the arrow takes root (a thunk), the earth jolts as the trunk thickens year by year, and at the end the thorns drop all at once.
  wakewood: { cues: [{ id: 'archery.thunk', scale: 1.1 }, { id: 'dust.slam', scale: 0.35, radiusK: 0.5, at: 0.9, every: 1.6 }, { id: 'archery.thunk', scale: 0.7, radiusK: 0.6, at: 4.3 }] },
  // The weight of dawn: the shot leaves, the morning line is lit down the corridor, the plumb stamps its last disc of light at the line's end, and what dawn weighs, it burns.
  larkshot: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'arcane.beam', scale: 1.15, at: 0.02 }, { id: 'arcane.sigil', scale: 0.55, atFar: true, at: 0.3 }, { id: 'fire.trail', scale: 0.35, at: 0.25 }] },
  // The rung splinter: a small thunk, then the glass splinter stands point-first, spitting, and rimes where it stood.
  glasshail: { cues: [{ id: 'archery.thunk', scale: 0.4 }, { id: 'frost.shards', scale: 0.55, at: 0.02 }] },
  // The pond overhead: the arrow skips head to head under the storm's zap, and an inverted crown-splash blooms from the water ceiling above each strike, raining back down.
  stormskip: { cues: [{ id: 'archery.flight', scale: 0.5 }, { id: 'storm.arc', scale: 0.9 }, { id: 'water.splash', scale: 0.65, atFar: true, at: 0.05, z: 1.1 }] },
  // The fired vessel: the arrow comes down first, the kiln's work shatters at the mark, and the shard ring cools in bands on a burning floor.
  charfall: { cues: [{ id: 'archery.fall', scale: 0.35, radiusK: 0.2 }, { id: 'fire.burst', scale: 1.3, at: 0.22 }, { id: 'fire.floor', scale: 0.6, radiusK: 0.8, at: 0.6 }] },
  // The snuffed lamp: no flash, no thunk — the dark comes up and holds, and one pale feather rocks down inside it.
  hushfall: { cues: [{ id: 'shadow.veil', scale: 0.5 }, { id: 'archery.feathers', scale: 0.3, at: 0.25 }] },
  // The marked heart: the called shot thunks, the wound beats in time with the horn-brand, and the woods vacate in a flush of wings.
  quarry_call: { cues: [{ id: 'archery.thunk', scale: 0.9 }, { id: 'blood.spray', scale: 0.8, at: 0.05 }, { id: 'archery.feathers', scale: 0.7, at: 0.1 }] },
  // The three strings: each pulse's note rings out as a ring of light, and the string's vibration lens hangs at the chest a beat.
  plucked_chord: { cues: [{ id: 'arcane.bloom', scale: 0.85, radiusK: 0.8 }, { id: 'arcane.orbit', scale: 0.4, at: 0.08 }] },
  // The shuttle passes: the net of night is drawn IN — tendrils gathered from the rim to the heart, the edge cinching — then the catch is held at the center in a ring of dark.
  nightweft: { cues: [{ id: 'shadow.grasp', scale: 1.4, radiusK: 1.0 }, { id: 'shadow.wisps', scale: 0.5, at: 0.8 }] },
  // The forge visits: the anvil lowers in three heavy jolts, each with its own dust ring, seats, and takes one hammer-bolt on its face — the ring travels into the ground.
  the_anvil: { cues: [{ id: 'dust.slam', scale: 0.6 }, { id: 'dust.slam', scale: 0.8, at: 0.25 }, { id: 'dust.slam', scale: 1.2, at: 0.5 }, { id: 'storm.strike', scale: 1.5, at: 0.75 }] },
};

export const FLIGHTS_EFFECTS: EffectDef[] = [];
