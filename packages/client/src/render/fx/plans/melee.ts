/**
 * MELEE — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in MELEE_EFFECTS and register through the
 * library index. The twohand armory wave: earth, blood, gold, and the
 * core roster's steel (core.steel_ring / core.steel_cut).
 *
 * Wire kinds noted per ability are what the server casts with. Plans
 * are keyed by ability id ALONE, so an art that arrives on several
 * wires (a leap = dash + blast; a compound `self` = + buff) speaks its
 * plan on each — the cues below are laid out so the mass-carrying
 * wire reads right and the others stay small (see the report's asks).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';

export const MELEE_PLANS: Record<string, AbilityPlan> = {
  // heavy_slam — arc (range 2.2, aimed). "The quarry step": the blow
  // LOWERS the ground — one slam bites the terrace, the rim's clods
  // ride out, and the dust rolls off along the swing's face.
  heavy_slam: {
    cues: [
      { id: 'dust.slam', scale: 1.5 },
      { id: 'dust.billow', at: 0.3, scale: 0.7 },
    ],
  },
  // bloodlust — buff (6s lifesteal). "The vein tree": the loan is
  // written on the body — blood flows the WRONG way into the heart —
  // and the sworn ground drinks the drip off the fists.
  bloodlust: {
    cues: [
      { id: 'blood.drink', scale: 1.0 },
      { id: 'blood.pool', at: 0.6, scale: 0.55 },
    ],
  },
  // twin_strike — blast per shaft hit (r0.55, no aim on the wire).
  // "The shaft that stays": each landing tears the earth up where the
  // shaft buries itself, a small slam of punch-through.
  twin_strike: {
    cues: [
      { id: 'dust.gouge', scale: 0.7 },
      { id: 'dust.slam', at: 0.05, scale: 0.5 },
    ],
  },
  // earthbreaker — dash (leap, 9 tiles ≈ 0.64s) + blast at landing
  // (r2.2). "The crown of earth": the push-off heel kicks; the crown of
  // standing earth leaps around the LANDING as the body arrives.
  earthbreaker: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dust.slam', atFar: true, at: 0.62, scale: 2.0 },
    ],
  },
  // rend — arc (range 1.9, bleed ×2 6s). "The three hooks": three rakes
  // in fast succession, each flushing red, then the wound keeps giving.
  rend: {
    cues: [
      { id: 'blood.hit', scale: 0.8 },
      { id: 'blood.hit', at: 0.12, scale: 0.7 },
      { id: 'blood.hit', at: 0.24, scale: 0.6 },
      { id: 'blood.spray', at: 0.45, scale: 0.7 },
    ],
  },
  // bull_rush — dash (6.4 tiles ≈ 0.36s). "The bow wave": the furrow
  // tears along the lane with turf flung to both sides (two windrows),
  // and the bow-crest breaks off the nose at the arrival.
  bull_rush: {
    cues: [
      { id: 'dust.gouge', scale: 1.2 },
      { id: 'dust.billow', atFar: true, at: 0.34, scale: 0.8 },
    ],
  },
  // warcry — buff (shield + speed 6s). "The risen hoop": the shout
  // strikes the ground and the ground gives it back — the bloom's
  // ward wakes underfoot, flares, and snaps into a hoop that stands.
  warcry: {
    cues: [
      { id: 'arcane.bloom', scale: 0.9 },
      { id: 'arcane.orbit', at: 0.9, scale: 0.7 },
    ],
  },
  // steel_wave — blast per edge hit (r0.55, no aim on the wire). "The
  // strobe edge": the edge shows itself at the wound as a ring of
  // grind and slivers (radial — the wire carries no heading).
  steel_wave: {
    cues: [{ id: 'core.steel_ring', scale: 0.9 }],
  },
  // stagger_stomp — nova (r2.0, shock). "The ground swell": one heel
  // drives a traveling bulge; a fainter second front reaches the rim
  // and the pebbles it knocked loose lie scattered.
  stagger_stomp: {
    cues: [
      { id: 'dust.slam', scale: 1.3 },
      { id: 'dust.slam', at: 0.35, scale: 0.6, radiusK: 1.4 },
    ],
  },
  // headsman_stroke — arc (range 2.2, execute). "The black arc and the
  // toll": no gore — a near-black arc stops dead and one heavy toll
  // ring rolls out (shadow's deep shock ring); a modest stain under
  // the chord is the sentence's only red.
  headsman_stroke: {
    cues: [
      { id: 'shadow.burst', at: 0.05, scale: 0.9 },
      { id: 'blood.pool', at: 0.5, scale: 0.35 },
    ],
  },
  // warlords_descent — dash (leap, 8 tiles ≈ 0.57s) + blast at landing
  // (r2.3) + buff (the shout rides `self`). "The unwound spiral": the
  // crater at the landing, and the gold spiral racing OUT from it —
  // the ward breaks outward with a whip-flash and afterlight.
  warlords_descent: {
    cues: [
      { id: 'dust.kick', scale: 0.6 },
      { id: 'dust.slam', atFar: true, at: 0.55, scale: 1.5 },
      { id: 'arcane.shatter', atFar: true, at: 0.6, scale: 1.2 },
    ],
  },
  // oathbound_edge — arc (range 2.3, the oath repays). "The molten
  // seal": the crown-seal is stamped as a standing ward, the repayment
  // gathers back into the caster, and the seal SPENDS itself into
  // cooled grains that glint where they land.
  oathbound_edge: {
    cues: [
      { id: 'arcane.sigil', scale: 0.9 },
      { id: 'arcane.bloom', at: 0.5, scale: 0.6 },
      { id: 'arcane.shatter', at: 1.3, scale: 0.5 },
    ],
  },
};

export const MELEE_EFFECTS: EffectDef[] = [];
