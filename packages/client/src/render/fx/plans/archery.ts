/**
 * ARCHERY — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in ARCHERY_EFFECTS and register through the
 * library index.
 *
 * THE SCHOOL'S MATTER IS WOOD AND VANE. The library masters fire, frost,
 * storm, dust, blood, shadow and light — but no material in it is an
 * ARROW. The bow school's word for "the shot landed" is a THUNK: turf
 * thrown, a low puff, ivory fletch chips spinning off the vane, and
 * flecks the ground keeps. So this file authors the roster's own
 * vocabulary under the same laws as the library:
 *
 *   archery.thunk          the arrow lands — turf, puff, chips, flecks
 *   archery.loose          the string snaps — a chest-high flash, chips
 *                          shed off the vane, the foot's scuff
 *   archery.fall           the sky lets go — shafts as steep falling
 *                          streaks onto the disc, each thunking where
 *                          it lands (onLand recipes), down sifting after
 *   archery.feathers       the flush / the molt — grey down thrown up,
 *                          rocking down on a sine, lying where it fell
 *   archery.black_feathers the same, in crow
 *   archery.flight         near → far: the string flash, the flight line
 *                          at altitude along the aim, the arrival thunk
 *                          at the far anchor (bolt hops, dash arrows)
 *   archery.cinderfall     the burning snow — slow ember flakes falling
 *                          from height, landing, charring, a warm haze
 *
 * Painted centerpieces (standing shafts, fletch fans, coronets, the
 * loom) stay with the signatures — those are drawing, not matter. What
 * the wire kinds carry: a projectile impact is a `blast` at the wound
 * with NO far anchor and NO heading (dir resolves to 0), so impact
 * plans never lean on aimed cones; `dash`/`bolt`/`beam` carry a true
 * far anchor, so those plans put the departure at the near anchor and
 * the arrival `atFar`. Palette shared with abilityFx VERDANT archery
 * styles (wood '#8a6a45', deep '#4e3c28', vane '#e8d8b0'); turf from
 * library/dust.ts and fire from library/fire.ts — ONE-VOICE.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import { defineRecipe, type BurstOpts } from '../../particles.js';
import { SAND, PALE, LOAM, SHADE, RAMP_MASS, RAMP_CLOD, RAMP_FINE, RAMP_VEIL } from '../library/dust.js';
import { HEART, BRIGHT, FLAME, EMBER, COAL, DEEP as FIRE_DEEP, SOOT, SMOKE_THIN, FIRE_GLOW } from '../library/fire.js';

// ------------------------------------------------------------ palette

/** The shaft. */
const WOOD = '#8a6a45';
const WOOD_DARK = '#4e3c28';
/** The vane: ivory fletching, chips of it. */
const FLETCH = '#e8d8b0';
const IVORY = '#f4ecd6';
const VANE_DULL = '#c9b98f';
/** Down and feathers: grey-white, shaded. */
const DOWN_LIGHT = '#eef0f2';
const DOWN = '#d3d8de';
const DOWN_SHADE = '#a6adb6';
/** Crow. */
const CROW_SHEEN = '#4a4458';
const CROW = '#2c2836';
const CROW_DEEP = '#1c1a22';

/** Vane chips catch light in flight, dull as they lie. */
const RAMP_CHIP = rampOf({ stops: [IVORY, FLETCH, VANE_DULL], at: [0, 0.4, 0.9], steps: 4 });
/** A falling shaft: lit on the way down, wood where it lies. */
const RAMP_SHAFT = rampOf({ stops: [FLETCH, WOOD, WOOD_DARK], at: [0, 0.3, 0.85], steps: 4 });
/** Down: white in the air, grey in the grass. */
const RAMP_DOWN = rampOf({ stops: [DOWN_LIGHT, DOWN, DOWN_SHADE], at: [0, 0.45, 0.9], steps: 4 });
/** Crow feathers: a sheen, then black, then the ground's dark. */
const RAMP_CROW = rampOf({ stops: [CROW_SHEEN, CROW, CROW_DEEP], at: [0, 0.4, 0.9], steps: 3 });
/** The string's flash: white to vane in a breath. */
const RAMP_FLASH = rampOf({ stops: ['#ffffff', IVORY, FLETCH], at: [0, 0.4, 0.8] });
/** The flight line: lit, then wood. */
const RAMP_LINE = rampOf({ stops: [IVORY, FLETCH, WOOD], at: [0, 0.5, 0.9] });
/** The scratch skirt on the turf. */
const RAMP_SKIRT = rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.45, 0.8] });
/** An ember flake: hot for the whole fall, cooling only once it lies. */
const RAMP_FLAKE = rampOf({ stops: [BRIGHT, FLAME, EMBER, COAL, FIRE_DEEP, SOOT], at: [0, 0.5, 0.68, 0.8, 0.9, 1], steps: 7 });
/** A lick where a flake lands. */
const RAMP_LICK = rampOf({ stops: [BRIGHT, FLAME, EMBER], at: [0, 0.5, 0.85] });
/** The warm haze rim. */
const RAMP_HAZE = rampOf({ stops: [EMBER, SOOT, SMOKE_THIN], at: [0, 0.4, 0.9], steps: 4 });

const HOLD = curveOf('hold');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST = curveOf('mist');
const SWELL = curveOf('swell');
/** A settling grain: holds, fades only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
/** A strike puff: born most of its size, swells a touch, thins away. */
const PUFF_SIZE = curveOf([0, 0.6, 0.3, 1, 0.7, 1.05, 1, 0.8]);
const PUFF_A = curveOf([0, 0.7, 0.15, 0.95, 0.6, 0.8, 1, 0]);

// ------------------------------------------------------------ recipes

/** Turf clods: thrown, tumbling, bouncing, lying, FLECKING the dirt. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.0, speedVar: 0.5, life: 2.6, lifeVar: 0.3,
  size: 0.065, sizeVar: 0.3, gravity: 0, spin: 9,
  vz: 2.3, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 6,
};

/** The strike puff: low overlapping masses that settle where they stall. */
const PUFF: BurstOpts = {
  shape: 'blob', speed: 0.85, speedVar: 0.45, life: 0.95, lifeVar: 0.3,
  size: 0.3, sizeVar: 0.25, gravity: 0, drag: 2.6,
  z: 0.04, vz: 0.4, zg: 1.3, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: PUFF_SIZE, alphaCurve: PUFF_A,
  wave: 'noise', waveHz: 1.6, waveAmp: 0.25, spin: 0.4,
};

/** Fletch chips: ivory slivers spun off the vane, rocking down, lying. */
const CHIP: BurstOpts = {
  shape: 'shard', speed: 0.9, speedVar: 0.5, life: 1.7, lifeVar: 0.3,
  size: 0.05, sizeVar: 0.3, gravity: 0, spin: 14,
  vz: 1.7, zg: 5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_CHIP, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  wave: 'sine', waveHz: 3, waveAmp: 0.25,
};

/** The scratch skirt: flat slivers racing out along the turf. */
const SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 2.8, speedVar: 0.4, life: 0.42, lifeVar: 0.25,
  size: 0.05, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground',
  ramp: RAMP_SKIRT, alphaCurve: FADE_LATE,
};

/** Fines that hang over the wound and sift down. */
const SIFT: BurstOpts = {
  shape: 'mote', speed: 0.4, speedVar: 0.6, life: 1.6, lifeVar: 0.3,
  size: 0.045, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.12, vz: 0.9, zg: 1.6, mass: 0.7, land: 'settle', layer: 'world', shadow: 0,
  jitter: 2, ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The shaft's quiver: a glint at the nock as it stops shaking. */
const QUIVER: BurstOpts = {
  shape: 'glint', speed: 0.15, speedVar: 0.5, life: 0.45, lifeVar: 0.2,
  size: 0.11, sizeVar: 0.2, gravity: 0, z: 0.3, vz: 0.25, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_FLASH, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The string's flash at the chest. */
const STRING_FLASH: BurstOpts = {
  ...QUIVER, z: 0.75, size: 0.14, life: 0.28, vz: 0.1,
};

/** A pale veil that stands a beat over the wound and settles. */
const VEIL: BurstOpts = {
  shape: 'blob', speed: 0.1, speedVar: 0.5, life: 1.6, lifeVar: 0.3,
  size: 0.3, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.05, vz: 0.22, zg: 0.3, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_VEIL, sizeCurve: SWELL, alphaCurve: curveOf([0, 0.2, 0.3, 0.5, 0.65, 0.45, 1, 0]),
  wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

/** The flight line: a lit streak flying the aim at altitude, gone in a blink. */
const LINE: BurstOpts = {
  shape: 'streak', speed: 7, speedVar: 0.15, life: 0.16, lifeVar: 0.25,
  size: 0.06, sizeVar: 0.2, gravity: 0, layer: 'world', shadow: 0,
  ramp: RAMP_LINE, alphaCurve: FADE_OUT,
};

/** Chaff shed in the wake, at flight height, dying in the air. */
const WAKE: BurstOpts = {
  shape: 'mote', speed: 0.25, speedVar: 0.5, life: 0.55, lifeVar: 0.3,
  size: 0.05, sizeVar: 0.3, gravity: 0, vz: 0.1, zg: 0.6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_CHIP, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** The landing's puff, spawned where a falling shaft strikes (no mark: a puff is not a pock). */
const LAND_PUFF_ID = defineRecipe({
  colors: [PALE, LOAM],
  opts: { ...PUFF, size: 0.22, speed: 0.7, life: 0.8 },
  count: 3,
});
/** The landing's pock: dark grains kicked out of the hole that die and fleck the turf small. */
const LAND_POCK_ID = defineRecipe({
  colors: [SHADE, LOAM],
  opts: {
    shape: 'square', speed: 0.5, speedVar: 0.5, life: 0.45, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
    gravity: 0, vz: 0.8, zg: 9, land: 'die', layer: 'world', shadow: 0,
    ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: HOLD, mark: 'fleck', markLife: 7,
  },
  count: 2,
});
/** The landing's chips, spawned where a falling shaft strikes. */
const LAND_CHIPS_ID = defineRecipe({
  colors: [FLETCH, IVORY],
  opts: { ...CHIP, speed: 0.7, vz: 1.3 },
  count: 3,
});

/** A shaft falling out of the sky: a steep streak that dies on the dirt. */
const FALL_SHAFT: BurstOpts = {
  shape: 'streak', speed: 0.5, speedVar: 0.5, life: 1.4, lifeVar: 0.1,
  size: 0.07, sizeVar: 0.15, gravity: 0,
  vz: -9.5, zg: 6, land: 'die', layer: 'world', shadow: 0.8,
  ramp: RAMP_SHAFT, sizeCurve: HOLD, alphaCurve: HOLD,
  onLand: LAND_PUFF_ID,
};

/** Down sifting out of the sky after the shafts. */
const SKY_DOWN: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.6, life: 2.6, lifeVar: 0.3,
  size: 0.045, sizeVar: 0.3, gravity: 0, drag: 0.6,
  vz: -0.4, zg: 0.6, land: 'settle', layer: 'world', shadow: 0,
  wave: 'sine', waveHz: 1.4, waveAmp: 0.35,
  ramp: RAMP_DOWN, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** A flushed feather: thrown up, rocking down on a sine, lying. */
const FEATHER: BurstOpts = {
  shape: 'shard', speed: 0.7, speedVar: 0.5, life: 2.8, lifeVar: 0.3,
  size: 0.075, sizeVar: 0.3, gravity: 0, spin: 5,
  vz: 2.6, zg: 2.2, mass: 0.5, land: 'settle', layer: 'world', shadow: 0.4,
  ramp: RAMP_DOWN, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  wave: 'sine', waveHz: 1.6, waveAmp: 0.5, waveAxis: 'x',
};

/** Down fines: lighter, jittering, sinking slow. */
const DOWN_FINE: BurstOpts = {
  shape: 'mote', speed: 0.5, speedVar: 0.6, life: 2.4, lifeVar: 0.3,
  size: 0.045, sizeVar: 0.3, gravity: 0, drag: 1.0,
  vz: 1.9, zg: 1.1, mass: 0.9, jitter: 1.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DOWN, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The vane heroes: bigger ivory feathers that lie and are remembered. */
const VANE: BurstOpts = {
  ...FEATHER, size: 0.09, vz: 2.2, zg: 3, spin: 3, life: 3.0,
  ramp: RAMP_CHIP, mark: 'fleck', markLife: 6,
};

/** Late down: born at a hand's height, sinking, no throw. */
const LATE_DOWN: BurstOpts = {
  ...DOWN_FINE, speed: 0.2, z: 1.0, vz: 0, zg: 0.8, life: 2.0,
};

/** An ember flake: slow, wobbling, hot all the way down, charring where it lies. */
const LAND_LICK_ID = defineRecipe({
  colors: [BRIGHT, FLAME],
  opts: {
    shape: 'lick', speed: 0.1, speedVar: 0.5, life: 0.4, lifeVar: 0.3, size: 0.12, sizeVar: 0.3,
    gravity: 0, vz: 0.9, zg: 1.5, layer: 'world', shadow: 0, flicker: 0.3, ramp: RAMP_LICK,
  },
  count: 1,
});
const FLAKE: BurstOpts = {
  shape: 'shard', speed: 0.25, speedVar: 0.6, life: 3.4, lifeVar: 0.25,
  size: 0.06, sizeVar: 0.3, gravity: 0, spin: 2.5,
  vz: -0.45, zg: 0.35, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: RAMP_FLAKE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  wave: 'sine', waveHz: 1.2, waveAmp: 0.4, flicker: 0.25,
  mark: 'char', markLife: 8, onLand: LAND_LICK_ID,
};

/** Heat glints falling with the flakes. */
const EMBER_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.2, speedVar: 0.6, life: 0.7, lifeVar: 0.3, size: 0.07, sizeVar: 0.3,
  gravity: 0, vz: -0.3, zg: 0.3, mass: 0.5, layer: 'world', shadow: 0, flicker: 0.4,
  ramp: rampOf({ stops: [HEART, BRIGHT, FLAME], at: [0, 0.4, 0.8] }), alphaCurve: FADE_OUT,
};

/** The warm haze rim: thin smoke standing at the edge of the burning snow. */
const HAZE: BurstOpts = {
  shape: 'blob', speed: 0.15, speedVar: 0.5, life: 1.6, lifeVar: 0.3,
  size: 0.3, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.1, vz: 0.35, zg: -0.05, mass: 0.3, layer: 'world', shadow: 0,
  ramp: RAMP_HAZE, sizeCurve: SWELL, alphaCurve: MIST,
  wave: 'noise', waveHz: 0.9, waveAmp: 0.25, spin: 0.3,
};

// ------------------------------------------------------------ effects

/**
 * archery.thunk — THE ARROW LANDS. The school's impact: a shove of
 * turf, a low puff that settles, ivory chips spun off the vane, a
 * scratch skirt, a glint at the nock as the shaft stops quivering,
 * fines sifting down. The clods fleck the ground: the wound is kept.
 */
const thunk: EffectDef = {
  id: 'archery.thunk',
  name: 'Archery — thunk',
  story: 'the shaft strikes: turf clods thrown and bouncing → a low puff of earth settles around the wound → fletch chips spin off the vane and lie → a scratch skirt splays on the turf → the nock glints as the quiver stills → fines sift down and the flecks stay',
  layers: [
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 0.6, strength: -1.2, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'turf clods', recipe: recipe([LOAM, SHADE], CLOD), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'strike puff', recipe: recipe([LOAM, PALE, SHADE], { ...PUFF, speed: 0.55, size: 0.34, drag: 3.2 }), count: 6, tier: 'body', arrange: 'disc', radius: 0.05 },
    { kind: 'burst', name: 'fletch chips', recipe: recipe([FLETCH, IVORY], CHIP), count: 8, tier: 'body' },
    { kind: 'burst', name: 'scratch skirt', recipe: recipe([SAND, PALE], SKIRT), count: 8, tier: 'fine', arrange: 'rim', radius: 0.08, outward: 2.8 },
    { kind: 'burst', name: 'nock glint', recipe: recipe([IVORY, FLETCH], QUIVER), count: 2, tier: 'fine', at: 0.05 },
    { kind: 'burst', name: 'sift', recipe: recipe([SAND, PALE], SIFT), count: 6, tier: 'fine', arrange: 'disc', radius: 0.12, at: 0.06 },
    { kind: 'burst', name: 'settling veil', recipe: recipe([PALE, SAND], { ...VEIL, size: 0.24, life: 1.2 }), count: 3, tier: 'body', arrange: 'disc', radius: 0.15, at: 0.2 },
  ],
};

/**
 * archery.loose — THE STRING SNAPS. The departure: a flash at the
 * chest where the string was, chips shed off the vane down the aim,
 * the foot's scuff behind, one clod that hops and stays. Cheap.
 */
const loose: EffectDef = {
  id: 'archery.loose',
  name: 'Archery — loose',
  story: 'the string snaps: a white flash at the chest → vane chips shed down the aim on true height → the planted foot scuffs a breath of earth behind → one clod hops and lies → the dust of the hand lifts and thins',
  layers: [
    { kind: 'field', name: 'recoil', field: { kind: 'attract', radius: 0.5, strength: -1.0, dur: 0.2, attack: 0.02, release: 0.1 } },
    { kind: 'burst', name: 'string flash', recipe: recipe(['#ffffff', IVORY], STRING_FLASH), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'vane chips', recipe: recipe([FLETCH, IVORY], { ...CHIP, speed: 2.2, speedVar: 0.4, z: 0.7, vz: 0.6, zg: 5, life: 1.2 }), count: 6, tier: 'body', arrange: 'cone', spread: 1.0 },
    { kind: 'burst', name: 'foot scuff', recipe: recipe([PALE, LOAM], { ...PUFF, size: 0.24, speed: 0.7, life: 0.8, drag: 2.8 }), count: 4, tier: 'body', arrange: 'cone', dirOff: Math.PI, spread: 1.1 },
    { kind: 'burst', name: 'skitter', recipe: recipe([SAND, PALE], { ...SIFT, shape: 'square', speed: 1.0, vz: 0.9, zg: 7, life: 0.9, mass: 0, jitter: 0 }), count: 6, tier: 'fine', arrange: 'cone', dirOff: Math.PI, spread: 1.0 },
    { kind: 'burst', name: 'clod', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 0.8, vz: 1.4, life: 1.4, size: 0.06, markLife: 3 }), count: 1, tier: 'hero', arrange: 'cone', dirOff: Math.PI, spread: 0.6 },
    { kind: 'burst', name: 'hand dust', recipe: recipe([PALE, SAND], { ...VEIL, size: 0.2, life: 0.9, z: 0.6, vz: 0.3 }), count: 3, tier: 'fine', at: 0.08 },
  ],
};

/**
 * archery.fall — THE SKY LETS GO. Shafts drop onto the disc as steep
 * falling streaks with contact shadows, on staggered clocks; each one
 * THUNKS where it lands through its own landing recipe (puff + flecks,
 * or fletch chips); down sifts out of the sky after; the disc shivers
 * with a scratch skirt when the first wave strikes; clods thrown by
 * the thunks lie and fleck; a pale haze stands and settles.
 */
const fall: EffectDef = {
  id: 'archery.fall',
  name: 'Archery — fall',
  story: 'shafts drop out of the sky onto the disc as steep streaks on staggered clocks, each thunking a puff and flecks where it lands → a second wave lands in fletch chips → the turf shivers and clods fly where they struck → down sifts out of the sky after → a pale haze stands over the pocked ground and settles',
  layers: [
    { kind: 'burst', name: 'shafts', recipe: recipe([WOOD, WOOD_DARK, FLETCH], FALL_SHAFT), count: 4, tier: 'hero', arrange: 'disc', radiusK: 0.85, dz: 2.4, every: 0.14, times: 3, decay: 0.85 },
    { kind: 'burst', name: 'shafts II', recipe: recipe([WOOD, WOOD_DARK], { ...FALL_SHAFT, onLand: LAND_POCK_ID, vz: -8.5 }), count: 3, tier: 'hero', arrange: 'disc', radiusK: 0.85, dz: 2.4, at: 0.07, every: 0.14, times: 2, decay: 0.85 },
    { kind: 'burst', name: 'shafts III', recipe: recipe([WOOD, FLETCH], { ...FALL_SHAFT, onLand: LAND_CHIPS_ID, vz: -9 }), count: 2, tier: 'hero', arrange: 'disc', radiusK: 0.8, dz: 2.4, at: 0.11, every: 0.14, times: 2, decay: 0.85 },
    { kind: 'burst', name: 'ground shiver', recipe: recipe([SAND, PALE], SKIRT), count: 8, tier: 'fine', arrange: 'disc', radiusK: 0.85, at: 0.24 },
    { kind: 'burst', name: 'turf clods', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 0.8, vz: 2.0 }), count: 4, tier: 'hero', arrange: 'disc', radiusK: 0.8, at: 0.26 },
    { kind: 'burst', name: 'down sifts', recipe: recipe([DOWN_LIGHT, DOWN], SKY_DOWN), count: 8, tier: 'fine', arrange: 'disc', radiusK: 0.9, dz: 1.8, at: 0.15 },
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 1.2, strength: -0.8, dur: 0.5, attack: 0.05, release: 0.3 }, radiusK: 0.9 },
    { kind: 'emit', name: 'haze', arrange: 'disc', radiusK: 0.7, at: 0.4, rate: 8, dur: 1.2, attack: 0.15, release: 0.6, tier: 'body',
      pops: [
        { colors: [PALE, SAND], opts: VEIL, weight: 2 },
        { colors: [SAND, PALE], opts: { ...SIFT, z: 0.4, vz: 0, zg: 2 }, weight: 1, tier: 'fine' },
      ] },
  ],
};

/** The feathers' shared layers, colored per bird. */
function feathersOf(id: string, name: string, story: string, light: string, mid: string, shade: string, ramp: number, vaneRamp: number): EffectDef {
  return {
    id,
    name,
    story,
    layers: [
      { kind: 'field', name: 'wing gust', field: { kind: 'lift', radius: 0.9, strength: 0.45, dur: 0.35, height: 0.9, attack: 0.02, release: 0.2 } },
      { kind: 'burst', name: 'feathers', recipe: recipe([light, mid], { ...FEATHER, ramp, vz: 1.7, zg: 2.6 }), count: 8, tier: 'body' },
      { kind: 'burst', name: 'down', recipe: recipe([light, mid], { ...DOWN_FINE, ramp, vz: 1.2, zg: 1.4 }), count: 12, tier: 'fine' },
      { kind: 'burst', name: 'vanes', recipe: recipe([mid, shade], { ...VANE, ramp: vaneRamp }), count: 3, tier: 'hero' },
      { kind: 'burst', name: 'wing puff', recipe: recipe([PALE, LOAM], { ...PUFF, size: 0.22, speed: 0.6, life: 0.8 }), count: 3, tier: 'body', arrange: 'disc', radius: 0.1 },
      { kind: 'emit', name: 'late down', arrange: 'disc', radius: 0.35, at: 0.4, rate: 10, dur: 0.9, attack: 0.1, release: 0.4, tier: 'fine',
        pops: [{ colors: [light, mid], opts: { ...LATE_DOWN, ramp } }] },
    ],
  };
}

/**
 * archery.feathers — THE FLUSH. What was hiding there takes wing: down
 * thrown up on the gust, rocking down on a sine, lying grey where it
 * fell; three ivory vanes lie and are remembered.
 */
const feathers = feathersOf(
  'archery.feathers',
  'Archery — feathers',
  'the covey flushes: a gust lifts a burst of down and feathers off the wound → they rock down on a sine on true height → the vanes lie where they fell and the ground keeps them → late down sifts out of the air',
  DOWN_LIGHT, DOWN, DOWN_SHADE, RAMP_DOWN, RAMP_CHIP,
);

/**
 * archery.black_feathers — THE MOLT OF THE MURDER. The same flush in
 * crow: black feathers wobble down and pile.
 */
const blackFeathers = feathersOf(
  'archery.black_feathers',
  'Archery — black feathers',
  'the flock wheels and molts: black feathers knocked loose rock down on a sine on true height → they lie where they fell and pile beat over beat → dark down sifts out of the air after',
  CROW_SHEEN, CROW, CROW_DEEP, RAMP_CROW, RAMP_CROW,
);

/**
 * archery.flight — THE SHOT IN THE AIR. Near → far: the string's flash
 * at the near anchor, a lit flight line flying the aim at altitude,
 * chaff shed in its wake, and at the far anchor the arrival: turf,
 * puff, chips, flecks. A bolt hop or a dash-arrow in one voice.
 */
const flight: EffectDef = {
  id: 'archery.flight',
  name: 'Archery — flight',
  story: 'the string flashes at the chest → a lit line flies the aim at altitude, chaff shed in its wake → at the far anchor the shaft thunks: turf thrown, a low puff, fletch chips spun off the vane, a scratch skirt, flecks the ground keeps',
  layers: [
    { kind: 'burst', name: 'string flash', recipe: recipe(['#ffffff', IVORY], STRING_FLASH), count: 2, tier: 'fine' },
    { kind: 'burst', name: 'flight line', recipe: recipe([IVORY, FLETCH], LINE), count: 10, tier: 'hero', arrange: 'path', dz: 0.5, aimed: true },
    { kind: 'burst', name: 'wake chaff', recipe: recipe([FLETCH, IVORY], WAKE), count: 8, tier: 'fine', arrange: 'path', dz: 0.5 },
    { kind: 'emit', name: 'lingering chaff', arrange: 'path', toFar: true, dz: 0.5, rate: 14, dur: 0.4, attack: 0.02, release: 0.15, tier: 'fine',
      pops: [{ colors: [FLETCH, VANE_DULL], opts: { ...WAKE, life: 0.7 } }] },
    { kind: 'burst', name: 'arrival clods', recipe: recipe([LOAM, SHADE], CLOD), count: 3, tier: 'hero', arrange: 'far', at: 0.05 },
    { kind: 'burst', name: 'arrival puff', recipe: recipe([LOAM, PALE, SHADE], PUFF), count: 4, tier: 'body', arrange: 'far', at: 0.05 },
    { kind: 'burst', name: 'arrival chips', recipe: recipe([FLETCH, IVORY], CHIP), count: 6, tier: 'body', arrange: 'far', at: 0.05 },
    { kind: 'burst', name: 'arrival skirt', recipe: recipe([SAND, PALE], { ...SKIRT, speed: 2.4 }), count: 8, tier: 'fine', arrange: 'far', at: 0.05 },
    { kind: 'burst', name: 'nock glint', recipe: recipe([IVORY, FLETCH], QUIVER), count: 2, tier: 'fine', arrange: 'far', at: 0.1 },
  ],
};

/**
 * archery.cinderfall — THE BURNING SNOW. Ember flakes descend over the
 * disc from height, slow and wobbling, hot the whole way down; where
 * one lands a lick stands a breath and the flake lies, cooling through
 * orange to soot and CHARRING the dirt. Heat glints fall with them, a
 * lift carries the haze, a warm haze rim stands, a flicker-light
 * breathes. Cued on a beat while the field holds: the drift is built
 * from what actually landed.
 */
const cinderfall: EffectDef = {
  id: 'archery.cinderfall',
  name: 'Archery — cinderfall',
  story: 'ember flakes descend out of the sky over the disc, slow and wobbling, hot all the way down → each lands in a lick and lies, cooling orange to soot and charring the dirt → heat glints fall among them → a warm haze rim stands on the lift → the char drift outlives the rain',
  layers: [
    { kind: 'burst', name: 'flakes', recipe: recipe([FLAME, EMBER, BRIGHT], FLAKE), count: 7, tier: 'hero', arrange: 'disc', radiusK: 0.9, dz: 2.3 },
    { kind: 'burst', name: 'late flakes', recipe: recipe([FLAME, EMBER], { ...FLAKE, vz: -0.6, size: 0.05 }), count: 4, tier: 'body', arrange: 'disc', radiusK: 0.9, dz: 2.0, at: 0.35 },
    { kind: 'burst', name: 'heat glints', recipe: recipe([HEART, BRIGHT], EMBER_GLINT), count: 6, tier: 'fine', arrange: 'disc', radiusK: 0.8, dz: 1.6 },
    { kind: 'field', name: 'lift', field: { kind: 'lift', radius: 1.2, strength: 0.6, dur: 0.7, height: 1.5, attack: 0.1, release: 0.3 }, radiusK: 0.8 },
    { kind: 'emit', name: 'haze rim', arrange: 'ring', radiusK: 0.9, rate: 8, dur: 0.7, attack: 0.1, release: 0.3, tier: 'body',
      pops: [{ colors: [SOOT, EMBER], opts: HAZE }] },
    { kind: 'glow', name: 'ember light', r: 1.2, rgb: FIRE_GLOW, a: 0.14, dur: 0.75, attack: 0.05, release: 0.35, flicker: 0.3, radiusK: 1 },
  ],
};

export const ARCHERY_EFFECTS: EffectDef[] = [thunk, loose, fall, feathers, blackFeathers, flight, cinderfall];

// ------------------------------------------------------------ plans
//
// Wire reality, per the server: a projectile fan lands as one `blast`
// (radius 0.55, no far anchor, no heading) at EACH wound; ground arts
// telegraph (a pure instrument, no plan) then `blast` at the target with
// the art's radius (scale ≈ 1.35 at r2); channels re-run that per beat;
// `dash`/`bolt`/`beam` carry x→x2; `field` lives for its ticks and
// re-speaks any `every` cue; `nova` is at the caster.

export const ARCHERY_PLANS: Record<string, AbilityPlan> = {
  // ---- THE SIGNATURE LAW: the archery wave -------------------------------

  // Five arrows, five thunks, each a modest one — the fan is many, not heavy.
  volley: { cues: [{ id: 'archery.thunk', scale: 0.75 }] },
  // The through-bore: the heavy shaft's thunk, then a low shove of earth as it punches on through.
  piercing_bolt: { cues: [{ id: 'archery.thunk', scale: 1.05 }, { id: 'dust.slam', scale: 0.45, at: 0.04 }] },
  // The roll writes itself on the turf (kick + a gouge along the escape line), then the string twangs at the rise.
  tumble_shot: { cues: [{ id: 'dust.kick', scale: 1.6 }, { id: 'dust.gouge', scale: 0.55, at: 0.05 }, { id: 'archery.loose', scale: 0.9, atFar: true, at: 0.4 }] },
  // The darkened patch pays off as wood: shafts drop on staggered clocks; feathers sift off the standing thicket.
  rain_of_arrows: { cues: [{ id: 'archery.fall', scale: 1.4, radiusK: 0.85 }, { id: 'archery.feathers', scale: 0.6, radiusK: 0.6, at: 0.45 }] },
  // The held note: each beat's blast is one surge of steep streaks out of the owned sky.
  storm_of_shafts: { cues: [{ id: 'archery.fall', scale: 1.05, radiusK: 0.8 }] },
  // Buried to the feathers: the whole field's weight lands, and the sink shoves the earth a beat later.
  longshot: { cues: [{ id: 'archery.thunk', scale: 1.25 }, { id: 'dust.slam', scale: 0.4, at: 0.1 }] },
  // The stake drives, then eight teeth snap out of the turf; the jaw waits in silence after.
  snare_shot: { cues: [{ id: 'archery.thunk', scale: 0.9 }, { id: 'dust.slam', scale: 0.55, at: 0.12 }] },
  // Every hop is a flight: flash at the corner, the line, the thunk at the next body.
  ricochet: { cues: [{ id: 'archery.flight', scale: 0.85 }] },
  // Counted to two: ONE great shaft drops plumb at the center, the crater punches out, fletch dust lifts off it.
  skyfall_shot: { cues: [{ id: 'archery.fall', scale: 0.5, radiusK: 0.15 }, { id: 'dust.slam', scale: 1.5, at: 0.24 }, { id: 'archery.feathers', scale: 0.5, radiusK: 0.4, at: 0.45 }] },
  // The wound keeps no wood: a small thunk, then the pale after-image lifts out of it like smoke.
  phantom_flight: { cues: [{ id: 'archery.thunk', scale: 0.6 }, { id: 'smoke.wisp', scale: 0.5, at: 0.12 }] },
  // The seeker's coil: five modest thunks, storm-chips crackling at each terminus.
  arrow_tempest: { cues: [{ id: 'archery.thunk', scale: 0.7 }, { id: 'storm.charge', scale: 0.35, at: 0.05 }] },
  // The no-further bar: four thunks, each with a radial shove — the knockback written in dust.
  warden_volley: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'dust.slam', scale: 0.4, at: 0.05 }] },

  // ---- THE SECOND BREATH SPEAKS: the loosed sky ---------------------------

  // The whole lane kneels: a heavy thunk, then the chaff shoved flat to both sides.
  kingshot: { cues: [{ id: 'archery.thunk', scale: 1.3 }, { id: 'dust.slam', scale: 0.5, at: 0.06 }] },
  // Every beat's arrow arrives still singing: a light thunk with the note's hum crackling on the wound.
  stringsong: { cues: [{ id: 'archery.thunk', scale: 0.6 }, { id: 'storm.charge', scale: 0.3, at: 0.02 }] },
  // The stoop: the gold hour flashes on the ring, the strike slams the center, feathers knocked loose lie.
  hawks_hour: { cues: [{ id: 'arcane.bloom', scale: 0.55 }, { id: 'dust.slam', scale: 1.1, at: 0.08 }, { id: 'archery.feathers', scale: 1.0, radiusK: 0.5, at: 0.15 }] },
  // The great quill: cold breathed down the lane on the wind, down tufts drifting onto it, the quill's point set at the far end (rime rails grow beat over beat).
  winterflight: { cues: [{ id: 'frost.breath', scale: 0.9 }, { id: 'archery.feathers', scale: 0.45, at: 0.15 }, { id: 'frost.shards', scale: 0.5, atFar: true, at: 0.3 }] },
  // The coal-tipped shaft lands and STAYS: the thunk, then the head bursts as a live coal that keeps burning in its scorch.
  emberhead: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'fire.burst', scale: 0.55, at: 0.03 }] },
  // The weft through the warp: the storm speaks the zap, the shuttle's own flight and loom-knot ride under it.
  skyloom: { cues: [{ id: 'storm.arc', scale: 0.8 }, { id: 'archery.flight', scale: 0.5, at: 0.02 }] },
  // The displaced light: the heavy shot leaves, the dark is drawn in at the mouth, and NIGHT arrives at the far end where the spent shaft lies in the stain.
  gloamshaft: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'shadow.burst', scale: 0.7, at: 0.02 }, { id: 'shadow.burst', scale: 1.1, atFar: true, at: 0.28 }] },
  // The hairpin: a light thunk per beat, molted feathers wobbling down where the harrier has been.
  harrier: { cues: [{ id: 'archery.thunk', scale: 0.55 }, { id: 'archery.feathers', scale: 0.7, radiusK: 0.5, at: 0.1 }] },
  // Noon comes down: one shaft point-first, then the flare of noon where it buries, then the burning pillar stands and its ash ring keeps the appointment.
  zenith: { cues: [{ id: 'archery.fall', scale: 0.45, radiusK: 0.15 }, { id: 'arcane.bloom', scale: 1.3, at: 0.2 }, { id: 'fire.pillar', scale: 1.1, at: 0.25 }] },
  // The wheeling murder, per beat: the flock's dark at flight height, the dive strikes blood, black feathers pile.
  crowsong: { cues: [{ id: 'shadow.wisps', scale: 0.7, radiusK: 0.6 }, { id: 'blood.hit', scale: 0.6, at: 0.15 }, { id: 'archery.black_feathers', scale: 0.8, radiusK: 0.6, at: 0.25 }] },

  // ---- THE ARMORY REMEMBERS: the archer's twelve --------------------------

  // The blazed trail: the axe-head's thunk, then the notch beads red at its lower corner.
  broadhead: { cues: [{ id: 'archery.thunk', scale: 1.0 }, { id: 'blood.hit', scale: 0.7, at: 0.06 }] },
  // Three arrows, three coveys: a light thunk and the flush of down off each wound.
  wingbeat: { cues: [{ id: 'archery.thunk', scale: 0.55 }, { id: 'archery.feathers', scale: 0.9, at: 0.03 }] },
  // The jaw of spring: the rim erupts as the tusks break the turf; sap stains keep the ring after.
  verdant_burst: { cues: [{ id: 'dust.slam', scale: 1.1, radiusK: 0.85 }, { id: 'venom.pool', scale: 0.5, radiusK: 0.7, at: 0.9 }] },
  // The parted curtain: the note passes through — a thunk, and the parted air hangs pale a beat.
  windsong: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'water.mist', scale: 0.4, at: 0.04 }] },
  // The hedge laid: five modest thunks, the barbs biting a little blood at each.
  thorn_fan: { cues: [{ id: 'archery.thunk', scale: 0.65 }, { id: 'blood.hit', scale: 0.35, at: 0.1 }] },
  // The pack's eyes: a small thunk, the winter dusk curling beneath, cold biting at the wound.
  howling_loose: { cues: [{ id: 'archery.thunk', scale: 0.5 }, { id: 'frost.shards', scale: 0.4, at: 0.02 }, { id: 'frost.fog', scale: 0.5, at: 0.04 }] },
  // The shut trap: the cage's bars stand up around the rim, the lock click-flashes at the center, the bars sublime to mist.
  hoarfrost: { cues: [{ id: 'frost.shards', scale: 1.4, radiusK: 1.0 }, { id: 'frost.nova', scale: 1.0, at: 0.35 }, { id: 'frost.fog', scale: 0.7, radiusK: 0.8, at: 1.4 }] },
  // The remembered flight: it lands, the violet pinhole flashes, and the after-images drift up and dissolve.
  ghost_shaft: { cues: [{ id: 'archery.thunk', scale: 0.5 }, { id: 'shadow.burst', scale: 0.55, at: 0.02 }, { id: 'smoke.wisp', scale: 0.4, at: 0.25 }] },
  // The burning snow: the shaft comes back down first, then the flakes keep coming on the field's beat and the char drift grows.
  cinder_rain: { cues: [{ id: 'archery.fall', scale: 0.45, radiusK: 0.3 }, { id: 'archery.cinderfall', scale: 1.1, radiusK: 0.9, at: 0.2, every: 0.8 }] },
  // The road cleared: a full thunk, then the royal gold flares and its ring races out — the crowd parting.
  kings_arrow: { cues: [{ id: 'archery.thunk', scale: 1.0 }, { id: 'arcane.bloom', scale: 0.65, at: 0.03 }] },
  // The chart of the night: seven small thunks, a star igniting where each fell.
  starfall_arrows: { cues: [{ id: 'archery.thunk', scale: 0.45 }, { id: 'arcane.bloom', scale: 0.42, at: 0.02 }] },
  // The hanging rail: the railshot leaves, the rail hangs and re-forms along the corridor, then it overloads at the wall the ray died on.
  skyrend: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'storm.arc', scale: 1.3, at: 0.02 }, { id: 'storm.strike', scale: 0.85, atFar: true, at: 0.45 }] },
};
