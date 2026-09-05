/**
 * ARCANE — light that has been TOLD what to do.
 *
 * Radiance is the one matter with no weight: it rises because up is
 * where it belongs, it cools from white heat through gold to warm
 * amber and never to gray, and it NEVER wounds the ground — no char,
 * no smears; its residue is light fading. Warm gold — the sun's voice,
 * not the storm's. Palette shared with render/matter/radiance.ts
 * (ONE-VOICE).
 *
 * The five effects and their layers:
 *
 *   bloom    THE VORTEX GATHERS: motes born on a wide ring, driven in
 *            on a negative rim speed while the vortex bends them —
 *            comet trails draw the SPIRAL; the sigil wakes under it in
 *            three pulsing wards; the HEART flares white with a ring
 *            of light racing out; sparks fling on true height; the
 *            gathered motes snap into an ORBIT at chest height that
 *            breathes on z; ground light glints and lifts away.
 *   orbit    THE STANDING HALO: two counter-revolving heads at chest
 *            height wrapping the body on the world layer, trails
 *            drawing the hoop, a z-wave so the halo breathes; a ward
 *            pulsing underfoot; a glint shed now and then.
 *   beam     THE RADIANT LANCE: cast flash → a body of overlapping
 *            light-blobs along the line → dense glints and streak
 *            fines igniting in three waves → motes shed off the line
 *            and settle as fading light → ground light under the path.
 *   sigil    THE STANDING WARD: three rings pulsing at different rates,
 *            heartbeat rings rippling out, glints rising off the rim on
 *            a z sine, a soft gold glow, afterlight.
 *   shatter  THE WARD BREAKS: the ring collapses, the heart flares, a
 *            shock ring races out, glass shards fly on true height
 *            with spin and DIE WITH A GLINT where they land, motes
 *            repelled outward, afterlight on the ground.
 *
 * Sizes are authored for the street scale (~48–64 px/tile).
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { defineRecipe, type BurstOpts } from '../../particles.js';

export const WHITE = '#fff7dc';
export const GOLD = '#ffd27a';
export const AMBER = '#e8a94e';
export const WARM = '#c98a3e';
export const EMBER = '#a86f33';

export const ARCANE_GLOW = '255, 220, 140';

/** Light cooling: white → gold → amber → warm, six flat bands. */
const RAMP_MOTE = rampOf({ stops: [WHITE, GOLD, AMBER, WARM], at: [0, 0.35, 0.7, 0.92], steps: 6 });
/** The heart: pure white collapsing to gold. */
const RAMP_HEART = rampOf({ stops: ['#ffffff', WHITE, GOLD], at: [0, 0.45, 0.85] });
/** Wards on the ground: gold → amber → warm. */
const RAMP_WARD = rampOf({ stops: [GOLD, AMBER, WARM], at: [0, 0.55, 0.9] });
/** Glass: born white, holds gold, dies amber. */
const RAMP_GLASS = rampOf({ stops: [WHITE, GOLD, GOLD, AMBER, WARM], at: [0, 0.2, 0.6, 0.85, 1], steps: 6 });
/** Spent light — the residue, amber to the ember of the palette. */
const RAMP_SPENT = rampOf({ stops: [GOLD, AMBER, WARM, EMBER], at: [0, 0.3, 0.7, 1], steps: 5 });

const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const BLOOM = curveOf('bloom');
const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_IN_LATE = curveOf([0, 0, 0.12, 1, 0.7, 1, 1, 0]);

/** The mote that gathers: a glint with a comet tail, susceptible to fields. */
const MOTE: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 1.4, lifeVar: 0.35, size: 0.075, sizeVar: 0.3, gravity: 0, drag: 0.3,
  z: 0.4, vz: 0.15, zg: 0, mass: 1.6, layer: 'world', shadow: 0, flicker: 0.4,
  ramp: RAMP_MOTE, sizeCurve: curveOf('pulse'), alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.6, waveAmp: 0.35, waveAxis: 'z',
};

/** The gathering mote — born on the wide ring, drawn in, trailing. */
const GATHER: BurstOpts = {
  ...MOTE, speed: 1.2, speedVar: 0.15, life: 1.05, lifeVar: 0.12, size: 0.09, drag: 1.1, mass: 1.8,
  z: 0.3, vz: 0.05, trail: 10, trailColor: GOLD, waveAmp: 0.08, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Sparks flung on true height, dying on the dirt without a mark. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 1.6, speedVar: 0.5, life: 0.7, size: 0.05, gravity: 0,
  vz: 2.2, zg: 5, land: 'die', layer: 'world', shadow: 0, flicker: 0.4, trail: 5, trailColor: GOLD,
  ramp: rampOf({ stops: [WHITE, GOLD, AMBER] }),
};

/** The heart: a white blob that flares and collapses. */
const HEART: BurstOpts = {
  shape: 'blob', speed: 0.15, life: 0.42, lifeVar: 0.1, size: 0.72, sizeVar: 0.15, gravity: 0, z: 0.5,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: RAMP_HEART, core: '#ffffff', coreK: 0.55,
};

/** A ring of light racing out on the ground — the flash's footprint. */
const LIGHT_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.36, lifeVar: 0.04, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [WHITE, GOLD, AMBER], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.4, 0.5, 2.4, 1, 3.0]), alphaCurve: curveOf([0, 1, 0.5, 0.75, 1, 0]),
};

/** A ward ring pulsing on the ground — authored beats, not a tent. */
const WARD: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.6, lifeVar: 0.05, size: 1.1, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_WARD,
  sizeCurve: curveOf([0, 0.5, 0.12, 1, 0.3, 0.92, 0.48, 1.06, 0.66, 0.94, 0.84, 1.08, 1, 1.0]),
  alphaCurve: curveOf([0, 0, 0.1, 1, 0.75, 0.85, 1, 0]),
};

/** The orbit mote: rides a tangential heading, breathes on z. */
const ORBIT_MOTE: BurstOpts = {
  ...MOTE, speed: 0.06, speedVar: 0.3, life: 0.9, lifeVar: 0.25, size: 0.075, drag: 0.2, mass: 0,
  z: 0, vz: 0, trail: 8, trailColor: GOLD, sizeCurve: HOLD, waveHz: 1.4, waveAmp: 0.3,
};

/** Light on the ground: a glint blooming and fading where the ward stood. */
const GROUND_LIGHT: BurstOpts = {
  shape: 'glint', speed: 0.1, life: 1.1, lifeVar: 0.4, size: 0.06, gravity: 0, z: 0.02,
  layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: BLOOM, ramp: RAMP_SPENT,
};

/** Spent light lifting away — the residue radiance leaves. */
const AFTERLIGHT: BurstOpts = {
  shape: 'mote', speed: 0.08, life: 1.6, lifeVar: 0.35, size: 0.055, sizeVar: 0.3, gravity: 0,
  z: 0.05, vz: 0.35, zg: -0.1, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_SPENT, sizeCurve: BLOOM, alphaCurve: curveOf('mist'),
  wave: 'sine', waveHz: 0.9, waveAmp: 0.2,
};

/** Halo orbit populations — a bright leader and gold followers. */
const HALO_LEAD: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.9, lifeVar: 0.2, size: 0.085, sizeVar: 0.2, gravity: 0, drag: 0.2,
  layer: 'world', shadow: 0, flicker: 0.35, trail: 7, trailColor: GOLD,
  ramp: rampOf({ stops: [WHITE, GOLD, AMBER], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.2, waveAmp: 0.3, waveAxis: 'z',
};
const HALO_FOLLOW: BurstOpts = {
  ...HALO_LEAD, shape: 'mote', size: 0.06, life: 0.7, trail: 0, ramp: RAMP_MOTE, waveAmp: 0.3,
};

// ---------------------------------------------------------------------------
// The beam
// ---------------------------------------------------------------------------

/** The lance body: overlapping blobs of light along the line. */
const LANCE_BODY: BurstOpts = {
  shape: 'blob', speed: 0, life: 0.36, lifeVar: 0.15, size: 0.2, sizeVar: 0.15, gravity: 0,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [WHITE, GOLD, AMBER], at: [0, 0.4, 0.85] }), core: '#ffffff', coreK: 0.5,
  sizeCurve: curveOf([0, 0.55, 0.15, 1, 0.5, 0.8, 1, 0]), alphaCurve: FADE_OUT,
};

/** The lance core: dense glints holding the line. */
const LANCE_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.02, life: 0.5, lifeVar: 0.25, size: 0.1, sizeVar: 0.25, gravity: 0,
  layer: 'world', shadow: 0, flicker: 0.5, ramp: rampOf({ stops: [WHITE, GOLD, AMBER], at: [0, 0.5, 0.88] }),
  sizeCurve: curveOf([0, 0.4, 0.1, 1, 0.6, 0.9, 1, 0]), alphaCurve: FADE_LATE,
};

/** Streak fines along the line — slivers of light. */
const LANCE_FINE: BurstOpts = {
  shape: 'streak', speed: 0, life: 0.45, lifeVar: 0.3, size: 0.07, sizeVar: 0.3, gravity: 0,
  layer: 'world', shadow: 0, flicker: 0.5, ramp: RAMP_MOTE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 3, waveAmp: 0.15, waveAxis: 'z',
};

/** Motes shed off the line, settling as light on the ground. */
const LANCE_SHED: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 1.2, lifeVar: 0.35, size: 0.055, sizeVar: 0.3, gravity: 0,
  vz: 0.2, zg: 1.4, land: 'settle', layer: 'world', shadow: 0, flicker: 0.35, drag: 1.5,
  ramp: RAMP_SPENT, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

// ---------------------------------------------------------------------------
// The shatter
// ---------------------------------------------------------------------------

/** The glint a shard dies with where it lands — registered once. */
const LAND_GLINT_ID = defineRecipe({
  colors: [WHITE, GOLD],
  opts: {
    shape: 'glint', speed: 0.05, life: 0.4, lifeVar: 0.3, size: 0.13, sizeVar: 0.25, gravity: 0, z: 0.03,
    layer: 'world', shadow: 0, flicker: 0.2, ramp: rampOf({ stops: [WHITE, GOLD, AMBER], at: [0, 0.4, 0.85] }),
    sizeCurve: FLARE, alphaCurve: FADE_OUT,
  },
  count: 1,
});
const LAND_GLINT_SMALL_ID = defineRecipe({
  colors: [GOLD, AMBER],
  opts: {
    shape: 'glint', speed: 0.05, life: 0.3, lifeVar: 0.3, size: 0.08, sizeVar: 0.25, gravity: 0, z: 0.03,
    layer: 'world', shadow: 0, ramp: rampOf({ stops: [GOLD, AMBER] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
  },
  count: 1,
});

/** Glass shards — thrown on true height, spinning, dying with a glint. */
const SHARD: BurstOpts = {
  shape: 'shard', speed: 2.1, speedVar: 0.5, life: 1.6, lifeVar: 0.2, size: 0.13, sizeVar: 0.3, gravity: 0,
  z: 0.4, vz: 1.9, zg: 8, land: 'die', spin: 9, layer: 'world', shadow: 0.5, flicker: 0.25,
  trail: 3, trailColor: GOLD, ramp: RAMP_GLASS, sizeCurve: HOLD, alphaCurve: curveOf('solid'),
  onLand: LAND_GLINT_ID,
};

const SHARD_FINE: BurstOpts = {
  ...SHARD, speed: 2.6, speedVar: 0.6, size: 0.06, vz: 1.5, zg: 7, spin: 14, trail: 0, shadow: 0,
  onLand: LAND_GLINT_SMALL_ID,
};

/** The ward collapsing — the hoop shrinks and dies. */
const WARD_BREAK: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.28, lifeVar: 0.02, size: 1.2, sizeVar: 0, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [WHITE, GOLD] }), sizeCurve: curveOf([0, 1, 1, 0.35]), alphaCurve: FADE_OUT,
};

/** Dispersing motes — repelled from the break, lifting away. */
const DISPERSE: BurstOpts = {
  ...MOTE, shape: 'mote', speed: 0.6, speedVar: 0.4, life: 1.3, lifeVar: 0.3, size: 0.075, mass: 2.0, drag: 0.6,
  z: 0.3, vz: 0.35, sizeCurve: BLOOM, alphaCurve: curveOf('mist'), waveAmp: 0.25,
};

// ---------------------------------------------------------------------------
// The effects
// ---------------------------------------------------------------------------

/**
 * arcane.bloom — the vortex gathers motes into orbit, the heart flares.
 */
export const arcaneBloom: EffectDef = {
  id: 'arcane.bloom',
  name: 'Arcane — bloom',
  story: 'the sigil wakes → a vortex draws motes in on a trailing spiral → the heart flares white and a ring of light races out → sparks fling on true height → the gathered motes snap into a breathing orbit → ground light glints and lifts away',
  layers: [
    { kind: 'field', name: 'vortex', field: { kind: 'vortex', radius: 1.9, strength: 4.2, dur: 1.4, attack: 0.04, release: 0.3 } },
    { kind: 'field', name: 'gather', field: { kind: 'attract', radius: 1.9, strength: 8, dur: 1.1, attack: 0.02, release: 0.25 } },
    { kind: 'burst', name: 'outer ward', recipe: recipe([GOLD, AMBER], { ...WARD, life: 2.2 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'inner ward', recipe: recipe([WHITE, GOLD], { ...WARD, size: 0.62, life: 2.0, sizeCurve: curveOf([0, 0.6, 0.1, 1, 0.35, 1.08, 0.55, 0.92, 0.8, 1.06, 1, 0.95]) }), count: 1, tier: 'hero', at: 0.08 },
    { kind: 'burst', name: 'gathering spiral', recipe: recipe([WHITE, GOLD, AMBER], GATHER), count: 14, tier: 'body', arrange: 'rim', radius: 1.5, outward: -1.1 },
    { kind: 'burst', name: 'second wave', recipe: recipe([GOLD, AMBER], { ...GATHER, size: 0.07, life: 0.85, trail: 8 }), count: 8, tier: 'fine', arrange: 'rim', radius: 1.35, outward: -1.1, at: 0.16 },
    { kind: 'burst', name: 'inrush', recipe: recipe([WHITE, GOLD], { ...GATHER, size: 0.075, life: 0.5, speed: 1.8 }), count: 10, tier: 'fine', arrange: 'rim', radius: 0.9, outward: -1.8, at: 0.45 },
    { kind: 'burst', name: 'heart', recipe: recipe([WHITE, GOLD], HEART), count: 3, tier: 'hero', at: 0.85 },
    { kind: 'burst', name: 'light ring', recipe: recipe([WHITE, GOLD], { ...LIGHT_RING, sizeCurve: curveOf([0, 0.5, 0.5, 3.0, 1, 3.8]) }), count: 1, tier: 'hero', at: 0.85 },
    { kind: 'burst', name: 'sparks', recipe: recipe([WHITE, GOLD], SPARK), count: 12, tier: 'fine', at: 0.87, dz: 0.45 },
    { kind: 'emit', name: 'orbit', arrange: 'orbit', radius: 0.42, dz: 0.6, rate: 40, dur: 1.0, attack: 0.05, release: 0.35, orbitSpeed: 7.5, tier: 'body', at: 0.9,
      pops: [
        { colors: [WHITE, GOLD], opts: ORBIT_MOTE, weight: 1.6, tier: 'body' },
        { colors: [GOLD, AMBER], opts: { ...ORBIT_MOTE, size: 0.055, life: 0.7, trail: 0 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'burst', name: 'ground light', recipe: recipe([WHITE, GOLD], GROUND_LIGHT), count: 4, tier: 'fine', arrange: 'disc', radius: 0.9, at: 0.9, every: 0.25, times: 5 },
    { kind: 'burst', name: 'afterlight', recipe: recipe([GOLD, AMBER], AFTERLIGHT), count: 5, tier: 'fine', arrange: 'disc', radius: 0.6, at: 1.4, every: 0.3, times: 3 },
    { kind: 'glow', name: 'glow', r: 1.6, rgb: ARCANE_GLOW, a: 0.28, dur: 2.4, attack: 0.15, release: 0.9, flicker: 0.2 },
    { kind: 'glow', name: 'flash', r: 2.2, rgb: ARCANE_GLOW, a: 0.4, dur: 0.3, attack: 0.02, release: 0.22, at: 0.85 },
  ],
};

/**
 * arcane.orbit — a standing halo wrapping the body at chest height.
 */
export const arcaneOrbit: EffectDef = {
  id: 'arcane.orbit',
  name: 'Arcane — orbit',
  story: 'a standing halo: two counter-revolving heads of light at chest height wrap the body on the world layer, trails draw the hoop, the whole ring breathes on z; a ward pulses underfoot; a glint sheds now and then',
  layers: [
    { kind: 'emit', name: 'halo', arrange: 'orbit', radius: 0.4, radiusK: 0.4, dz: 0.6, rate: 30, dur: 3.0, attack: 0.25, release: 0.6, orbitSpeed: 4.2,
      pops: [
        { colors: [WHITE, GOLD], opts: HALO_LEAD, weight: 1.6, tier: 'body' },
        { colors: [GOLD, AMBER], opts: HALO_FOLLOW, weight: 1, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'counter halo', arrange: 'orbit', radius: 0.32, radiusK: 0.32, dz: 0.78, rate: 18, dur: 2.8, attack: 0.35, release: 0.6, orbitSpeed: -3.4, at: 0.2,
      pops: [
        { colors: [GOLD, AMBER], opts: { ...HALO_LEAD, size: 0.07, trail: 8, waveAmp: 0.3 }, weight: 1, tier: 'body' },
      ] },
    { kind: 'burst', name: 'ward', recipe: recipe([GOLD, AMBER], { ...WARD, size: 0.8, life: 1.1 }), count: 1, tier: 'hero', every: 0.9, times: 3 },
    { kind: 'burst', name: 'shed', recipe: recipe([WHITE, GOLD], { ...SPARK, speed: 0.5, vz: 0.8, zg: 3, life: 0.5 }), count: 1, tier: 'fine', at: 0.4, every: 0.3, times: 8, dz: 0.62 },
    { kind: 'burst', name: 'ground light', recipe: recipe([GOLD, AMBER], GROUND_LIGHT), count: 2, tier: 'fine', arrange: 'disc', radius: 0.5, at: 0.5, every: 0.4, times: 6 },
    { kind: 'burst', name: 'afterlight', recipe: recipe([GOLD, AMBER], AFTERLIGHT), count: 4, tier: 'fine', arrange: 'disc', radius: 0.5, dz: 0.5, at: 2.9, every: 0.25, times: 2 },
    { kind: 'glow', name: 'glow', r: 1.1, rgb: ARCANE_GLOW, a: 0.22, dur: 3.4, attack: 0.3, release: 0.7, flicker: 0.15 },
  ],
};

/**
 * arcane.beam — a radiant lance from the cast point to params.x2/y2.
 */
export const arcaneBeam: EffectDef = {
  id: 'arcane.beam',
  name: 'Arcane — beam',
  story: 'a flash at the caster → a body of light along the line → glints and streak fines ignite in three waves → motes shed off the lance and settle as fading light → ground light under the path lifts away',
  layers: [
    { kind: 'burst', name: 'cast flash', recipe: recipe([WHITE, GOLD], { ...HEART, size: 0.55, life: 0.3 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'cast ring', recipe: recipe([WHITE, GOLD], { ...LIGHT_RING, life: 0.3, sizeCurve: curveOf([0, 0.4, 1, 1.8]) }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'lance body', recipe: recipe([WHITE, GOLD], LANCE_BODY), count: 16, tier: 'body', arrange: 'path', dz: 0.5 },
    { kind: 'burst', name: 'lance core', recipe: recipe([WHITE, GOLD], LANCE_GLINT), count: 14, tier: 'hero', arrange: 'path', dz: 0.5, at: 0.03 },
    { kind: 'burst', name: 'ignition 1', recipe: recipe([WHITE, GOLD], LANCE_FINE), count: 10, tier: 'fine', arrange: 'path', dz: 0.5 },
    { kind: 'burst', name: 'ignition 2', recipe: recipe([GOLD, AMBER], { ...LANCE_FINE, size: 0.06 }), count: 12, tier: 'fine', arrange: 'path', dz: 0.55, at: 0.07 },
    { kind: 'burst', name: 'ignition 3', recipe: recipe([GOLD, AMBER], { ...LANCE_GLINT, size: 0.08, life: 0.4 }), count: 10, tier: 'body', arrange: 'path', dz: 0.5, at: 0.14 },
    { kind: 'burst', name: 'second body', recipe: recipe([GOLD, AMBER], { ...LANCE_BODY, size: 0.17, life: 0.3 }), count: 10, tier: 'body', arrange: 'path', dz: 0.52, at: 0.12 },
    { kind: 'emit', name: 'shed motes', arrange: 'path', toFar: true, dz: 0.5, rate: 22, dur: 0.5, attack: 0.04, release: 0.2, tier: 'fine',
      pops: [{ colors: [GOLD, AMBER], opts: LANCE_SHED, tier: 'fine' }] },
    { kind: 'burst', name: 'ground light', recipe: recipe([GOLD, AMBER], { ...GROUND_LIGHT, life: 0.9 }), count: 8, tier: 'fine', arrange: 'path', at: 0.1, every: 0.2, times: 3 },
    { kind: 'burst', name: 'afterlight', recipe: recipe([GOLD, AMBER], AFTERLIGHT), count: 6, tier: 'fine', arrange: 'path', at: 0.5, every: 0.3, times: 2 },
    { kind: 'glow', name: 'cast glow', r: 1.3, rgb: ARCANE_GLOW, a: 0.34, dur: 0.55, attack: 0.02, release: 0.35, flicker: 0.25 },
  ],
};

/**
 * arcane.sigil — a standing ward on the ground, ~3s.
 */
export const arcaneSigil: EffectDef = {
  id: 'arcane.sigil',
  name: 'Arcane — sigil',
  story: 'a ward wakes: three rings pulse at their own rates, heartbeat rings ripple out, glints rise off the rim on a z-wave, a soft gold glow stands, then the light lifts away',
  layers: [
    { kind: 'burst', name: 'outer ward', recipe: recipe([GOLD, AMBER], { ...WARD, size: 1.3, life: 3.0,
      sizeCurve: curveOf([0, 0.5, 0.08, 1, 0.25, 0.94, 0.42, 1.05, 0.6, 0.95, 0.78, 1.04, 0.92, 0.98, 1, 1.02]),
      alphaCurve: curveOf([0, 0, 0.06, 1, 0.82, 0.85, 1, 0]) }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'middle ward', recipe: recipe([WHITE, GOLD], { ...WARD, size: 0.9, life: 2.9,
      sizeCurve: curveOf([0, 0.4, 0.1, 1, 0.2, 1.06, 0.32, 0.92, 0.46, 1.06, 0.6, 0.92, 0.74, 1.06, 0.88, 0.94, 1, 1]),
      alphaCurve: curveOf([0, 0, 0.08, 1, 0.8, 0.85, 1, 0]) }), count: 1, tier: 'hero', at: 0.08 },
    { kind: 'burst', name: 'inner ward', recipe: recipe([WHITE, GOLD], { ...WARD, size: 0.5, life: 2.8,
      sizeCurve: curveOf([0, 0.3, 0.12, 1, 0.3, 0.88, 0.5, 1.1, 0.7, 0.88, 0.9, 1.08, 1, 1]),
      alphaCurve: curveOf([0, 0, 0.1, 1, 0.78, 0.85, 1, 0]) }), count: 1, tier: 'hero', at: 0.16 },
    { kind: 'burst', name: 'wake', recipe: recipe([WHITE, GOLD], { ...HEART, size: 0.5, z: 0.15, life: 0.35 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'heartbeat', recipe: recipe([WHITE, GOLD], { ...LIGHT_RING, life: 0.6, size: 0.4, sizeCurve: curveOf([0, 0.6, 1, 3.4]), alphaCurve: curveOf([0, 0.9, 0.6, 0.5, 1, 0]) }),
      count: 1, tier: 'hero', at: 0.3, every: 0.75, times: 3 },
    { kind: 'emit', name: 'rim glints', arrange: 'rim', radius: 0.62, outward: 0.05, rate: 34, dur: 2.7, attack: 0.3, release: 0.5, tier: 'body',
      pops: [
        { colors: [WHITE, GOLD], opts: { ...MOTE, speed: 0.05, mass: 0, z: 0.02, vz: 0.4, life: 1.3, size: 0.075, waveHz: 1.3, waveAmp: 0.45, sizeCurve: BLOOM, alphaCurve: FADE_IN_LATE }, weight: 1.6, tier: 'body' },
        { colors: [GOLD, AMBER], opts: { ...MOTE, shape: 'mote', speed: 0.05, mass: 0, z: 0.02, vz: 0.3, life: 1.0, size: 0.055, sizeCurve: BLOOM }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'rune', arrange: 'orbit', radius: 0.9, dz: 0.03, rate: 22, dur: 2.6, attack: 0.3, release: 0.5, orbitSpeed: 2.6, tier: 'body', at: 0.2,
      pops: [{ colors: [WHITE, GOLD], opts: { ...HALO_LEAD, size: 0.08, life: 0.6, trail: 10, wave: 'sine', waveAmp: 0.08 }, tier: 'body' }] },
    { kind: 'emit', name: 'center motes', arrange: 'disc', radius: 0.25, rate: 8, dur: 2.6, attack: 0.4, release: 0.6, tier: 'fine',
      pops: [{ colors: [WHITE, GOLD], opts: { ...AFTERLIGHT, vz: 0.5, life: 1.2, ramp: RAMP_MOTE }, tier: 'fine' }] },
    { kind: 'burst', name: 'afterlight', recipe: recipe([GOLD, AMBER], AFTERLIGHT), count: 6, tier: 'fine', arrange: 'ring', radius: 0.6, at: 2.7, every: 0.25, times: 2 },
    { kind: 'glow', name: 'glow', r: 1.4, rgb: ARCANE_GLOW, a: 0.26, dur: 3.3, attack: 0.25, release: 0.8, flicker: 0.12 },
  ],
};

/**
 * arcane.shatter — a ward breaking: glass shards on true height.
 */
export const arcaneShatter: EffectDef = {
  id: 'arcane.shatter',
  name: 'Arcane — shatter',
  story: 'the ward collapses and the heart flares → a shock ring races out → glass shards fly on true height, spinning, and die with a glint where they land → motes are repelled and lift away → afterlight on the ground',
  layers: [
    { kind: 'field', name: 'repel', field: { kind: 'attract', radius: 1.8, strength: -7, dur: 0.8, attack: 0.02, release: 0.3 } },
    { kind: 'burst', name: 'ward breaks', recipe: recipe([WHITE, GOLD], WARD_BREAK), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'heart', recipe: recipe([WHITE, GOLD], { ...HEART, size: 0.66, z: 0.45 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'shock ring', recipe: recipe([WHITE, GOLD], LIGHT_RING), count: 1, tier: 'hero', at: 0.02 },
    { kind: 'burst', name: 'shards', recipe: recipe([WHITE, GOLD], SHARD), count: 14, tier: 'hero', arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'fragments', recipe: recipe([GOLD, AMBER], SHARD_FINE), count: 20, tier: 'fine', arrange: 'disc', radius: 0.25 },
    { kind: 'burst', name: 'sparks', recipe: recipe([WHITE, GOLD], SPARK), count: 8, tier: 'fine', dz: 0.4 },
    { kind: 'burst', name: 'motes disperse', recipe: recipe([WHITE, GOLD, AMBER], DISPERSE), count: 14, tier: 'body', arrange: 'rim', radius: 0.35, outward: 0.9, dz: 0.3 },
    { kind: 'burst', name: 'late motes', recipe: recipe([GOLD, AMBER], { ...DISPERSE, size: 0.05, life: 1.1 }), count: 8, tier: 'fine', arrange: 'rim', radius: 0.5, outward: 0.6, dz: 0.4, at: 0.12 },
    { kind: 'burst', name: 'afterlight', recipe: recipe([GOLD, AMBER], GROUND_LIGHT), count: 4, tier: 'fine', arrange: 'disc', radius: 1.0, at: 0.4, every: 0.3, times: 4 },
    { kind: 'burst', name: 'spent light', recipe: recipe([GOLD, AMBER], AFTERLIGHT), count: 5, tier: 'fine', arrange: 'disc', radius: 0.9, at: 1.0, every: 0.35, times: 3 },
    { kind: 'glow', name: 'flash', r: 2.0, rgb: ARCANE_GLOW, a: 0.4, dur: 0.3, attack: 0.02, release: 0.22 },
    { kind: 'glow', name: 'afterglow', r: 1.3, rgb: ARCANE_GLOW, a: 0.18, dur: 1.8, attack: 0.1, release: 1.0, flicker: 0.2, at: 0.2 },
  ],
};

export const ARCANE_EFFECTS: EffectDef[] = [arcaneBloom, arcaneOrbit, arcaneBeam, arcaneSigil, arcaneShatter];
