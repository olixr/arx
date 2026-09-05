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
import { SAND, PALE, LOAM, SHADE, RAMP_MASS, RAMP_CLOD, RAMP_FINE, RAMP_VEIL, DUST_GLOW } from '../library/dust.js';
import { GOLD, AMBER, WARM, ARCANE_GLOW } from '../library/arcane.js';
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


// ------------------------------------------ THE MASTERED HAND: the voice
//
// THE PATIENT EYE (techniques v3, Phase 4). The archer BRANDS (the sunder
// page is her mark), PLANTS (snares, briars, fire on the ground), LOOSES
// (the quick shaft on the move) and then reads what she left. The
// library had no word for a mark that STAYS on a body, a mark SPENT, a
// snare that closes, a briar that breaks the turf, or the string's last
// heavy note — so the school authors five more, all wood, vane, hemp,
// hawk-gold and green-wood:
//
//   archery.brand        THE HAWK'S MARK — the brand that stays: a ring
//                        of hawk-eye glints circling the chest for the
//                        window, gold rising off the body, a gold ring
//                        laid on the ground that the turf keeps
//   archery.brand_break  THE BRAND SPENT — the payoff's detonation on a
//                        branded body: the mark shatters into gold shards
//                        and sparks, an ivory shock ring, the earth shoved
//   archery.snare        THE JAW CLOSES — the hemp cord cinches inward,
//                        iron teeth fly up at the rim and lie, the cord
//                        ticks with glints while the patch is held
//   archery.briar        THE THORNS BREAK THE TURF — green-wood thorns
//                        stand up out of the disc in waves, sap flecks
//                        the dirt, the patch is DRAGGED to center
//   archery.crescendo    THE LAST NOTE — the string's final heavy loose
//                        arriving: a vane flash, an ivory ring at the
//                        entry, a crown of chips, turf shoved wide
//
// Every re-curated plan speaks three acts on the wire's kind, adds
// `onFollow` for a payoff landed inside its window, `onFinale` for a
// held note's last beat, and a standing `<art>:aftermath` plan for the
// ground the art leaves.

/** Hawk gold, the school's brand — the sunder page in the archer's hand. */
const HAWK = GOLD;
const HAWK_DEEP = AMBER;
const HAWK_DULL = WARM;
/** Hemp cord and iron teeth — the snare. */
const HEMP = '#c4aa74';
const HEMP_DARK = '#8f7a4e';
const IRON = '#7a7f88';
const IRON_DARK = '#454952';
/** Green wood — the briar. */
const LEAF = '#8ab85a';
const GREENWOOD = '#5a9a4a';
const GREENWOOD_DEEP = '#3f6e34';
const SAP_DARK = '#2c4a26';

/** The brand's glint: white heart to hawk gold to warm. */
const RAMP_HAWK = rampOf({ stops: ['#fff7dc', HAWK, HAWK_DEEP], at: [0, 0.35, 0.85] });
/** A gold shard: bright in flight, warm where it lies. */
const RAMP_HAWK_SHARD = rampOf({ stops: [HAWK, HAWK_DEEP, HAWK_DULL], at: [0, 0.4, 0.9], steps: 4 });
/** The gold laid on the ground: lit, then the turf's warm. */
const RAMP_HAWK_GROUND = rampOf({ stops: [HAWK, HAWK_DEEP, HAWK_DULL, LOAM], at: [0, 0.3, 0.7, 1], steps: 5 });
/** The cord. */
const RAMP_HEMP = rampOf({ stops: [HEMP, HEMP_DARK, WOOD_DARK], at: [0, 0.5, 0.9], steps: 3 });
/** Iron teeth: a glint, then iron, then the dark of a thing lying in grass. */
const RAMP_IRON = rampOf({ stops: ['#aeb3bc', IRON, IRON_DARK], at: [0, 0.3, 0.85], steps: 4 });
/** A thorn: pale tip, green wood, sap-dark where it stands. */
const RAMP_THORN = rampOf({ stops: [LEAF, GREENWOOD, GREENWOOD_DEEP, SAP_DARK], at: [0, 0.3, 0.7, 1], steps: 5 });
/** Sap: bright green to the dark it dries to. */
const RAMP_SAP = rampOf({ stops: [LEAF, GREENWOOD_DEEP, SAP_DARK], at: [0, 0.4, 0.9], steps: 3 });
/** Leaf fines. */
const RAMP_LEAF = rampOf({ stops: [LEAF, GREENWOOD, GREENWOOD_DEEP], at: [0, 0.5, 0.9], steps: 3 });
/** The ivory ring and the crescendo's flash. */
const RAMP_IVORY_RING = rampOf({ stops: ['#ffffff', IVORY, WOOD], at: [0, 0.45, 0.9] });

/** A hawk-eye glint circling the chest. */
const EYE: BurstOpts = {
  shape: 'glint', speed: 0.05, speedVar: 0.5, life: 0.55, lifeVar: 0.25,
  size: 0.1, sizeVar: 0.25, gravity: 0, layer: 'world', shadow: 0,
  ramp: RAMP_HAWK, sizeCurve: FLARE, alphaCurve: FADE_OUT, flicker: 0.2,
};
/** THE MARK: a gold ring hung at the chest, breathing, for the window. */
const MARK_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 3.0, lifeVar: 0.05, size: 0.46, sizeVar: 0.05, gravity: 0,
  z: 0.8, layer: 'world', shadow: 0, ringWidth: 0.08,
  ramp: rampOf({ stops: [HAWK, HAWK_DEEP, HAWK], at: [0, 0.5, 1], steps: 3 }),
  sizeCurve: curveOf([0, 0.6, 0.1, 1, 0.5, 0.92, 0.9, 1, 1, 0.8]), alphaCurve: curveOf([0, 0, 0.08, 0.85, 0.85, 0.75, 1, 0]),
  wave: 'sine', waveHz: 1.2, waveAmp: 0.06, waveAxis: 'z',
};
/** Gold rising off a branded body. */
const BRAND_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.6, life: 1.1, lifeVar: 0.3,
  size: 0.045, sizeVar: 0.3, gravity: 0, drag: 0.6,
  vz: 0.55, zg: -0.1, layer: 'world', shadow: 0, jitter: 1.2,
  ramp: RAMP_HAWK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};
/** The gold laid on the ground under the mark: streaks lying flat, kept as flecks. */
const GOLD_RING: BurstOpts = {
  shape: 'streak', align: true, speed: 0.35, speedVar: 0.4, life: 2.8, lifeVar: 0.25,
  size: 0.06, sizeVar: 0.25, gravity: 0, drag: 3, layer: 'ground',
  ramp: RAMP_HAWK_GROUND, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 4,
};
/** The ring's pulse: glints popping on the gold ring. */
const RING_POP: BurstOpts = {
  shape: 'glint', speed: 0.05, speedVar: 0.5, life: 0.4, lifeVar: 0.3,
  size: 0.07, sizeVar: 0.3, gravity: 0, z: 0.02, layer: 'world', shadow: 0,
  ramp: RAMP_HAWK, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};
/** The brand shattering: gold shards on true height, spun, lying, flecking. */
const GOLD_SHARD: BurstOpts = {
  shape: 'shard', speed: 1.8, speedVar: 0.5, life: 1.6, lifeVar: 0.3,
  size: 0.06, sizeVar: 0.3, gravity: 0, spin: 12,
  z: 0.7, vz: 2.2, zg: 6, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: RAMP_HAWK_SHARD, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 5,
};
/** Sparks off the breaking brand: fast glints that die in the air. */
const GOLD_SPARK: BurstOpts = {
  shape: 'glint', speed: 2.6, speedVar: 0.5, life: 0.5, lifeVar: 0.3,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 1.5,
  z: 0.7, vz: 1.5, zg: 5, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_HAWK, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** An ivory shock ring at chest height, gone in a breath. */
const IVORY_RING: BurstOpts = {
  shape: 'streak', align: true, speed: 4, speedVar: 0.15, life: 0.32, lifeVar: 0.2,
  size: 0.07, sizeVar: 0.2, gravity: 0, drag: 2, z: 0.6, layer: 'world', shadow: 0,
  ramp: RAMP_IVORY_RING, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** The gold after-ring on the ground where the brand broke. */
const AFTER_RING: BurstOpts = {
  ...GOLD_RING, speed: 1.2, life: 0.9, drag: 4, alphaCurve: FADE_LATE, mark: undefined,
};
/** The hemp cord racing inward along the turf. */
const CORD: BurstOpts = {
  shape: 'streak', align: true, speed: 1.8, speedVar: 0.25, life: 0.55, lifeVar: 0.2,
  size: 0.07, sizeVar: 0.2, gravity: 0, drag: 1.5, layer: 'ground',
  ramp: RAMP_HEMP, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};
/** An iron tooth: flung up at the rim, lying where it fell. */
const TOOTH: BurstOpts = {
  shape: 'streak', speed: 0.3, speedVar: 0.5, life: 2.4, lifeVar: 0.25,
  size: 0.095, sizeVar: 0.2, gravity: 0, spin: 2,
  vz: 1.9, zg: 6, land: 'settle', layer: 'world', shadow: 0.4,
  ramp: RAMP_IRON, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};
/** Glints ticking on the held cord. */
const CORD_TICK: BurstOpts = {
  shape: 'glint', speed: 0.05, speedVar: 0.5, life: 0.35, lifeVar: 0.3,
  size: 0.06, sizeVar: 0.3, gravity: 0, z: 0.04, layer: 'world', shadow: 0,
  ramp: RAMP_IRON, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};
/** A thorn standing up out of the turf, then lying in it. */
const THORN: BurstOpts = {
  shape: 'streak', speed: 0.25, speedVar: 0.5, life: 2.2, lifeVar: 0.25,
  size: 0.085, sizeVar: 0.25, gravity: 0, spin: 3,
  vz: 2.4, zg: 5, land: 'settle', layer: 'world', shadow: 0.4,
  ramp: RAMP_THORN, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 5,
};
/** Sap flecks kicked out of the broken turf. */
const SAP: BurstOpts = {
  shape: 'square', speed: 0.8, speedVar: 0.5, life: 0.6, lifeVar: 0.3,
  size: 0.05, sizeVar: 0.3, gravity: 0, vz: 1.4, zg: 7, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_SAP, sizeCurve: HOLD, alphaCurve: HOLD, mark: 'fleck', markLife: 6,
};
/** Leaf fines lifted with the thorns, rocking down. */
const LEAF_FINE: BurstOpts = {
  shape: 'mote', speed: 0.5, speedVar: 0.6, life: 1.6, lifeVar: 0.3,
  size: 0.045, sizeVar: 0.3, gravity: 0, drag: 1.0,
  vz: 1.2, zg: 1.2, mass: 0.5, land: 'settle', layer: 'world', shadow: 0,
  wave: 'sine', waveHz: 1.6, waveAmp: 0.4, ramp: RAMP_LEAF, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

// ------------------------------------------------------------ effects II

/**
 * archery.brand — THE HAWK'S MARK. The opener's word made visible: a
 * strike flash, then a ring of hawk-eye glints circles the chest for
 * the window, gold rises off the body, and a gold ring is laid on the
 * ground that pulses on its beats and stays as flecks. The mark that
 * STAYS until a payoff spends it.
 */
const brand: EffectDef = {
  id: 'archery.brand',
  name: 'Archery — brand',
  story: 'the hawk marks the body: a gold strike flash at the chest → hawk-eye glints circle the chest for the window → gold rises off the branded body → a gold ring is laid on the ground and pulses on its beats → the turf keeps the ring in flecks',
  layers: [
    { kind: 'burst', name: 'strike flash', recipe: recipe(['#fff7dc', HAWK], { ...EYE, size: 0.2, life: 0.3, z: 0.75 }), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'the mark', recipe: recipe([HAWK, HAWK_DEEP], MARK_RING), count: 1, tier: 'hero', dz: 0 },
    { kind: 'emit', name: 'hawk eyes', arrange: 'orbit', radius: 0.3, dz: 0.85, orbitSpeed: 5, rate: 18, dur: 3.0, attack: 0.1, release: 0.5, tier: 'hero',
      pops: [{ colors: [HAWK, '#fff7dc'], opts: { ...EYE, size: 0.13 } }] },
    { kind: 'emit', name: 'gold rising', arrange: 'disc', radius: 0.22, dz: 0.35, rate: 10, dur: 3.0, attack: 0.2, release: 0.6, tier: 'fine',
      pops: [{ colors: [HAWK, HAWK_DEEP], opts: BRAND_MOTE }] },
    { kind: 'burst', name: 'gold ring', recipe: recipe([HAWK, HAWK_DEEP], GOLD_RING), count: 14, tier: 'body', arrange: 'rim', radiusK: 0.8, outward: 0.35 },
    { kind: 'burst', name: 'ring pulse', recipe: recipe([HAWK, '#fff7dc'], RING_POP), count: 6, tier: 'fine', arrange: 'ring', radiusK: 0.8, at: 0.3, every: 0.75, times: 3, decay: 0.85 },
    { kind: 'glow', name: 'brand light', r: 0.55, rgb: ARCANE_GLOW, a: 0.24, dur: 3.0, attack: 0.1, release: 0.6, flicker: 0.25, dz: 0.3 },
  ],
};

/**
 * archery.brand_break — THE BRAND SPENT. The payoff lands on a branded
 * body and the mark shatters: an ivory shock ring at the chest, the
 * flash, gold shards flung on true height that lie and fleck, sparks
 * that die in the air, turf shoved out from the wound, a gold
 * after-ring on the ground.
 */
const brandBreak: EffectDef = {
  id: 'archery.brand_break',
  name: 'Archery — brand break',
  story: 'the brand is spent: an ivory shock ring snaps out at the chest → the mark flares white → gold shards fling on true height, spin, and lie flecking the turf → sparks die in the air → the earth is shoved from the wound → a gold after-ring races out on the ground and fades',
  layers: [
    { kind: 'burst', name: 'shock ring', recipe: recipe(['#ffffff', IVORY], IVORY_RING), count: 12, tier: 'hero', arrange: 'ring', radius: 0.15 },
    { kind: 'burst', name: 'mark flare', recipe: recipe(['#fff7dc', HAWK], { ...EYE, size: 0.42, life: 0.32, z: 0.75 }), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'mark bursts', recipe: recipe([HAWK, '#fff7dc'], { ...MARK_RING, life: 0.45, lifeVar: 0.1, size: 0.5, ringWidth: 0.1, sizeCurve: curveOf([0, 0.5, 0.5, 1.6, 1, 2.2]), alphaCurve: FADE_OUT, wave: undefined }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'gold shards', recipe: recipe([HAWK, HAWK_DEEP], { ...GOLD_SHARD, speed: 1.3, drag: 1.2 }), count: 10, tier: 'body' },
    { kind: 'burst', name: 'sparks', recipe: recipe([HAWK, '#fff7dc'], GOLD_SPARK), count: 14, tier: 'fine' },
    { kind: 'burst', name: 'turf', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 1.2 }), count: 3, tier: 'hero' },
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 0.7, strength: -1.6, dur: 0.25, attack: 0.02, release: 0.12 } },
    { kind: 'burst', name: 'after-ring', recipe: recipe([HAWK, HAWK_DEEP], AFTER_RING), count: 10, tier: 'fine', arrange: 'rim', radius: 0.12, outward: 1.4, at: 0.06 },
    { kind: 'glow', name: 'break light', r: 0.8, rgb: ARCANE_GLOW, a: 0.3, dur: 0.35, attack: 0.02, release: 0.25, dz: 0.4 },
  ],
};

/**
 * archery.snare — THE JAW CLOSES. The snare lands and shuts: the stake
 * drives (clods), the hemp cord races INWARD along the turf, iron teeth
 * fly up at the rim and lie, a cinch drags the caught toward the
 * center, dust puffs at the rim, and the cord ticks with glints for as
 * long as the patch is held. No light: hemp and iron do not glow.
 */
const snare: EffectDef = {
  id: 'archery.snare',
  name: 'Archery — snare',
  story: 'the snare shuts: the stake drives and clods fly → the hemp cord races inward along the turf → iron teeth fly up at the rim and lie in the grass → the cinch drags the patch to center → dust puffs at the rim and the turf scratches → glints tick on the held cord',
  layers: [
    { kind: 'burst', name: 'stake drives', recipe: recipe([LOAM, SHADE], CLOD), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'cord cinches', recipe: recipe([HEMP, HEMP_DARK], CORD), count: 22, tier: 'body', arrange: 'rim', radiusK: 1.0, outward: -1.8 },
    { kind: 'burst', name: 'iron teeth', recipe: recipe([IRON, IVORY], TOOTH), count: 8, tier: 'hero', arrange: 'rim', radiusK: 0.85, at: 0.12 },
    { kind: 'field', name: 'cinch', field: { kind: 'attract', radius: 1.4, strength: 1.4, dur: 0.45, attack: 0.05, release: 0.2 }, radiusK: 1.0 },
    { kind: 'burst', name: 'stake dust', recipe: recipe([PALE, LOAM], { ...PUFF, size: 0.3, speed: 0.35, life: 0.85 }), count: 6, tier: 'body', arrange: 'disc', radiusK: 0.4, at: 0.1 },
    { kind: 'burst', name: 'scratch', recipe: recipe([SAND, PALE], SKIRT), count: 8, tier: 'fine', arrange: 'disc', radiusK: 0.8, at: 0.15 },
    { kind: 'emit', name: 'cord held', arrange: 'rim', radiusK: 0.7, outward: -0.5, rate: 14, dur: 1.5, attack: 0.15, release: 0.5, tier: 'body',
      pops: [{ colors: [HEMP, HEMP_DARK], opts: { ...CORD, speed: 0.5, life: 0.7, drag: 0.5 } }] },
    { kind: 'emit', name: 'cord ticks', arrange: 'ring', radiusK: 0.7, rate: 10, dur: 1.5, attack: 0.2, release: 0.5, tier: 'fine',
      pops: [{ colors: [IRON, HEMP], opts: CORD_TICK }] },
  ],
};

/**
 * archery.briar — THE THORNS BREAK THE TURF. The seed arrow takes: the
 * roots heave the turf, green-wood thorns stand up out of the disc in
 * two waves and lie where they stood, sap flecks the dirt, leaf fines
 * rock down, and the patch is DRAGGED to center. Re-spoken on a beat it
 * is the planted patch keeping its teeth.
 */
const briar: EffectDef = {
  id: 'archery.briar',
  name: 'Archery — briar',
  story: 'the seed takes: roots heave the turf and clods fly → green-wood thorns stand up out of the disc in waves and lie where they stood → sap flecks the dirt → leaf fines rock down → the patch is dragged to center → a rustle of leaf stays on the rim',
  layers: [
    { kind: 'burst', name: 'root heave', recipe: recipe([LOAM, SHADE], CLOD), count: 4, tier: 'hero', arrange: 'disc', radiusK: 0.6 },
    { kind: 'burst', name: 'thorns', recipe: recipe([GREENWOOD, GREENWOOD_DEEP, LEAF], THORN), count: 10, tier: 'hero', arrange: 'disc', radiusK: 0.85, every: 0.18, times: 2, decay: 0.8 },
    { kind: 'burst', name: 'sap flecks', recipe: recipe([LEAF, GREENWOOD_DEEP], SAP), count: 10, tier: 'body', arrange: 'disc', radiusK: 0.8 },
    { kind: 'burst', name: 'leaf fines', recipe: recipe([LEAF, GREENWOOD], LEAF_FINE), count: 8, tier: 'fine', arrange: 'disc', radiusK: 0.9 },
    { kind: 'field', name: 'gather', field: { kind: 'attract', radius: 1.4, strength: 1.2, dur: 0.5, attack: 0.05, release: 0.25 }, radiusK: 1.1 },
    { kind: 'burst', name: 'turf puff', recipe: recipe([LOAM, PALE], { ...PUFF, size: 0.3, speed: 0.45, life: 0.85 }), count: 5, tier: 'body', arrange: 'disc', radiusK: 0.35 },
    { kind: 'emit', name: 'rim rustle', arrange: 'rim', radiusK: 0.9, rate: 6, dur: 1.0, attack: 0.15, release: 0.4, tier: 'fine', outward: 0.3,
      pops: [{ colors: [LEAF, GREENWOOD], opts: { ...LEAF_FINE, vz: 0.6, life: 1.2 } }] },
  ],
};

/**
 * archery.crescendo — THE LAST NOTE. The held note's final beat, or a
 * payoff's heavy arrival: the vane flashes, an ivory ring snaps out at
 * the shaft's entry, a crown of fletch chips flies, turf is shoved wide
 * by a stronger blow, a bigger puff, a doubled skirt, fines sift. The
 * thunk, heavier, and saying so.
 */
const crescendo: EffectDef = {
  id: 'archery.crescendo',
  name: 'Archery — crescendo',
  story: 'the last note lands: the vane flashes white → an ivory ring snaps out at the entry → a crown of fletch chips flies and lies → turf is shoved wide and clods bounce → a bigger puff settles → a doubled scratch skirt splays → fines sift and the flecks stay',
  layers: [
    { kind: 'burst', name: 'vane flash', recipe: recipe(['#ffffff', IVORY], { ...QUIVER, size: 0.2, z: 0.6, life: 0.3 }), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'entry ring', recipe: recipe(['#ffffff', IVORY], { ...IVORY_RING, z: 0.3, speed: 3.5 }), count: 12, tier: 'hero', arrange: 'ring', radius: 0.15 },
    { kind: 'burst', name: 'chip crown', recipe: recipe([FLETCH, IVORY], { ...CHIP, vz: 2.4, speed: 1.1 }), count: 12, tier: 'body' },
    { kind: 'burst', name: 'turf', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 1.3, vz: 2.8 }), count: 5, tier: 'hero' },
    { kind: 'burst', name: 'strike puff', recipe: recipe([LOAM, PALE, SHADE], { ...PUFF, speed: 0.6, size: 0.36, drag: 3 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.1 },
    { kind: 'burst', name: 'doubled skirt', recipe: recipe([SAND, PALE], SKIRT), count: 12, tier: 'fine', arrange: 'rim', radius: 0.1, outward: 3.4 },
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 0.8, strength: -2.0, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'sift', recipe: recipe([SAND, PALE], SIFT), count: 8, tier: 'fine', arrange: 'disc', radius: 0.15, at: 0.08 },
    { kind: 'glow', name: 'strike light', r: 0.7, rgb: DUST_GLOW, a: 0.2, dur: 0.3, attack: 0.02, release: 0.2 },
  ],
};

export const ARCHERY_EFFECTS: EffectDef[] = [thunk, loose, fall, feathers, blackFeathers, flight, cinderfall, brand, brandBreak, snare, briar, crescendo];

// ------------------------------------------------------------ plans
//
// Wire reality, per the server: a projectile fan lands as one `blast`
// (radius 0.55, no far anchor, no heading) at EACH wound; ground arts
// telegraph (a pure instrument, no plan) then `blast` at the target with
// the art's radius (scale ≈ 1.35 at r2); channels re-run that per beat;
// `dash`/`bolt`/`beam` carry x→x2; `field` lives for its ticks and
// re-speaks any `every` cue; `nova` is at the caster. THE MASTERED HAND:
// a cast landed inside its follow window arrives with flourish `follow`
// (onFollow cues added, ×1.15); a held note's last beat with `finale`
// (onFinale, ×1.35); an art's aftermath arrives as its own `field` fx
// `<art>:aftermath` at the field's radius for the field's life.

export const ARCHERY_PLANS: Record<string, AbilityPlan> = {
  // ---- THE PATIENT EYE: the rungs ----------------------------------------

  // ANSWER, `loose`. The roll writes itself on the turf (kick + gouge along the escape line), the string snaps at the rise and a covey flushes out of the roll — the loosed word, seen.
  tumble_shot: { cues: [{ id: 'dust.kick', scale: 1.6 }, { id: 'dust.gouge', scale: 0.55, at: 0.05 }, { id: 'archery.loose', scale: 1.0, atFar: true, at: 0.35 }, { id: 'archery.feathers', scale: 0.5, radiusK: 0.4, atFar: true, at: 0.4 }] },
  // PAYOFF reads brand. The full draw buries to the fletching (heavy thunk, the lane's chaff shoved flat); inside the brand window the mark SHATTERS on the body — gold shards, the ivory ring, the earth shoved.
  kingshot: { cues: [{ id: 'archery.thunk', scale: 1.3 }, { id: 'dust.slam', scale: 0.5, at: 0.06 }], onFollow: [{ id: 'archery.brand_break', scale: 1.2, at: 0.02 }] },
  // OPENER, `brand`. One line, and every body on it wears the hawk's mark: the thunk, then the brand STAYS — eyes circling the chest, gold on the ground.
  longshot: { cues: [{ id: 'archery.thunk', scale: 1.15 }, { id: 'dust.slam', scale: 0.35, at: 0.08 }, { id: 'archery.brand', scale: 1.0, at: 0.1 }] },
  // SUSTAIN, storm, finale ×1.5, reads `loose`. Each beat's arrow arrives still singing (thunk + crackle); sung after a loosed shot the wound sparks wider; the last note lands as the crescendo under a storm ring.
  stringsong: { cues: [{ id: 'archery.thunk', scale: 0.9 }, { id: 'storm.charge', scale: 0.5, at: 0.02 }, { id: 'storm.nova', scale: 0.3, at: 0.03 }], onFollow: [{ id: 'storm.nova', scale: 0.45, at: 0.05 }], onFinale: [{ id: 'archery.crescendo', scale: 1.0 }, { id: 'storm.strike', scale: 0.8, at: 0.05 }] },
  // PAYOFF reads brand|plant. The called sky lands: shafts on staggered clocks, feathers off the thicket; over a branded or planted patch a second, wider wave falls and the earth is slammed at the rim.
  rain_of_arrows: { cues: [{ id: 'archery.fall', scale: 1.4, radiusK: 0.85 }, { id: 'archery.feathers', scale: 0.6, radiusK: 0.6, at: 0.45 }], onFollow: [{ id: 'archery.fall', scale: 1.0, radiusK: 1.15, at: 0.35 }, { id: 'dust.slam', scale: 0.9, radiusK: 1.0, at: 0.55 }] },
  // OPENER, `brand`, the signature setup. The gold hour flashes on the ring, the stoop slams the center, feathers lie — and the whole ring is BRANDED: the hawk's eyes at the heart, a gold ring the size of the hour laid on the ground.
  hawks_hour: { cues: [{ id: 'arcane.bloom', scale: 0.55 }, { id: 'dust.slam', scale: 1.0, at: 0.08 }, { id: 'archery.feathers', scale: 0.9, radiusK: 0.5, at: 0.15 }, { id: 'archery.brand', scale: 1.5, radiusK: 1.25, at: 0.12 }] },
  // ANSWER, `plant`, licensed ROOT. The snare lands and the jaw closes: cord cinching inward, iron teeth at the rim, the caught dragged to center, the cord ticking while it holds.
  snare_shot: { cues: [{ id: 'archery.snare', scale: 1.2, radiusK: 1.0 }] },
  // Rank IV: frost on the cord — the ground stays cold after the snare lets go: a rime sheet standing on the patch, spears at the rim, re-fogged on its beats.
  'snare_shot:aftermath': { cues: [{ id: 'frost.shards', scale: 0.5, radiusK: 0.9 }, { id: 'frost.fog', scale: 0.8, radiusK: 0.95, at: 0.2, every: 0.9 }] },
  // SUSTAIN, drawn cold shot, reads `plant`. One drawn shaft of winter down the line (breath + down drifting onto it, the quill's point set at the far end); down a planted patch the far end cracks — spears and a cold nova where the caught stand.
  winterflight: { cues: [{ id: 'frost.breath', scale: 0.9 }, { id: 'archery.feathers', scale: 0.45, at: 0.15 }, { id: 'frost.shards', scale: 0.5, atFar: true, at: 0.3 }], onFollow: [{ id: 'frost.nova', scale: 0.7, atFar: true, at: 0.3 }, { id: 'frost.shards', scale: 0.8, atFar: true, at: 0.35 }] },
  // Rank IV: the line stays frozen behind the shaft — rime rails, a fog that keeps re-settling.
  'winterflight:aftermath': { cues: [{ id: 'frost.shards', scale: 0.45, radiusK: 0.8 }, { id: 'frost.fog', scale: 0.8, radiusK: 1.0, at: 0.15, every: 0.9 }] },
  // PAYOFF reads brand. Every hop is a flight (flash, line, thunk at the next body); loosed at a branded body the mark breaks where the carom lands.
  ricochet: { cues: [{ id: 'archery.flight', scale: 1.1 }], onFollow: [{ id: 'archery.brand_break', scale: 0.9, atFar: true, at: 0.1 }] },
  // OPENER, `plant`, burn + aftermath. The fireball that leaves fire: two campfire shafts arc down, the heads burst as one flame mass, the floor catches under them.
  emberhead: { cues: [{ id: 'archery.fall', scale: 0.5, radiusK: 0.3 }, { id: 'fire.burst', scale: 0.95, at: 0.2 }, { id: 'fire.floor', scale: 0.7, radiusK: 0.85, at: 0.5 }] },
  // The ground burns on after the pair: an ember bed re-catching on its beats, flakes still coming down out of the heat.
  'emberhead:aftermath': { cues: [{ id: 'fire.floor', scale: 0.85, radiusK: 0.95, every: 1.0 }, { id: 'archery.cinderfall', scale: 0.55, radiusK: 0.8, at: 0.4, every: 1.3 }] },
  // PAYOFF reads brand, the signature's second press. Two heavy shafts punch through (thunk + the chaff shoved); inside the brand both strike half again and the mark shatters on the line.
  twin_strike: { cues: [{ id: 'archery.thunk', scale: 0.95 }, { id: 'dust.slam', scale: 0.35, at: 0.06 }], onFollow: [{ id: 'archery.brand_break', scale: 1.1, at: 0.02 }] },
  // SUSTAIN, finale ×1.5, reads brand. The shuttle stitches foe to foe (the zap, the shuttle's own flight under it); off a branded body every pass holds a charge; the last pass strikes the far body and drives the shuttle home.
  skyloom: { cues: [{ id: 'storm.arc', scale: 0.8 }, { id: 'archery.flight', scale: 0.5, at: 0.02 }], onFollow: [{ id: 'storm.charge', scale: 0.5, atFar: true, at: 0.05 }], onFinale: [{ id: 'storm.strike', scale: 0.9, atFar: true, at: 0.05 }, { id: 'archery.crescendo', scale: 0.9, atFar: true, at: 0.1 }] },
  // ANSWER, knockback + licensed STAGGER. Counted to two: ONE great shaft drops plumb, the crater punches out, the crowd is thrown in a rolling cloud, fletch dust lifts off it.
  skyfall_shot: { cues: [{ id: 'archery.fall', scale: 0.5, radiusK: 0.15 }, { id: 'dust.slam', scale: 1.6, at: 0.24 }, { id: 'dust.billow', scale: 0.6, radiusK: 0.9, at: 0.4 }, { id: 'archery.feathers', scale: 0.5, radiusK: 0.4, at: 0.45 }] },
  // OPENER, `brand`, licensed WEAKEN + aftermath. The displaced light: the shot leaves, the dark is drawn in at the mouth, NIGHT arrives at the far end — and the hawk's mark burns gold inside the gloam.
  gloamshaft: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'shadow.burst', scale: 0.7, at: 0.02 }, { id: 'shadow.burst', scale: 1.1, atFar: true, at: 0.28 }, { id: 'archery.brand', scale: 0.9, atFar: true, at: 0.35 }] },
  // The gloam pools where the shaft passed: a veil that stands and re-fills on its beats, soul-flames waking in it.
  'gloamshaft:aftermath': { cues: [{ id: 'shadow.veil', scale: 0.9, radiusK: 1.0, every: 0.9 }, { id: 'shadow.wisps', scale: 0.5, radiusK: 0.7, at: 0.2 }] },
  // PAYOFF, drawn, returns, reads brand|plant. Out pale (a small thunk, the after-image lifting as smoke), home red (the wound beads); through a branded body or a planted patch the ghost bites both ways — the mark breaks, the blood sprays.
  phantom_flight: { cues: [{ id: 'archery.thunk', scale: 0.6 }, { id: 'smoke.wisp', scale: 0.5, at: 0.12 }, { id: 'blood.hit', scale: 0.4, at: 0.3 }], onFollow: [{ id: 'archery.brand_break', scale: 0.9, at: 0.02 }, { id: 'blood.spray', scale: 0.6, at: 0.25 }] },
  // SUSTAIN, finale ×2, reads `loose`. The wing that circles: a light thunk per pass, molted feathers where it has been; hungrier off a loosed shot; the last pass takes double — the crescendo, and the whole covey in the air.
  harrier: { cues: [{ id: 'archery.thunk', scale: 0.65 }, { id: 'archery.feathers', scale: 0.9, radiusK: 0.5, at: 0.1 }], onFollow: [{ id: 'archery.feathers', scale: 0.6, radiusK: 0.6, at: 0.3 }], onFinale: [{ id: 'archery.crescendo', scale: 1.0 }, { id: 'archery.feathers', scale: 1.3, radiusK: 0.8, at: 0.15 }] },
  // PAYOFF, staked volley, finale ×1.5, reads brand|plant. Each beat is one surge of shafts out of the owned sky; over a branded or planted patch a wider second wave; the last volley blackens the sky (a churning cloud), falls thickest and slams the earth.
  storm_of_shafts: { cues: [{ id: 'archery.fall', scale: 1.05, radiusK: 0.8 }], onFollow: [{ id: 'archery.fall', scale: 0.7, radiusK: 1.15, at: 0.3 }], onFinale: [{ id: 'storm.cloud', scale: 0.9, radiusK: 0.8 }, { id: 'archery.fall', scale: 1.3, radiusK: 0.9, at: 0.25 }, { id: 'dust.slam', scale: 0.8, radiusK: 0.9, at: 0.6 }] },
  // OPENER, `plant`, burn + aftermath. Noon comes down: one shaft point-first, the flare of noon where it buries, the burning pillar stands, and the court is set alight under it.
  zenith: { cues: [{ id: 'archery.fall', scale: 0.45, radiusK: 0.15 }, { id: 'arcane.bloom', scale: 1.3, at: 0.2 }, { id: 'fire.pillar', scale: 1.1, at: 0.25 }, { id: 'fire.floor', scale: 0.6, radiusK: 0.9, at: 0.7 }] },
  // The fire stays planted: the court's floor re-catching on its beats, noon's light still pulsing over it.
  'zenith:aftermath': { cues: [{ id: 'fire.floor', scale: 1.0, radiusK: 0.95, every: 1.0 }, { id: 'arcane.bloom', scale: 0.4, radiusK: 0.5, at: 0.3, every: 1.6 }] },
  // SUSTAIN, bleed, finale ×1.5, reads `plant`. The wheeling murder per call: the flock's dark at flight height, the dive strikes blood, black feathers pile; hungrier over a planted patch; the last call — the whole flock lands at once, black feathers everywhere, the field opened.
  crowsong: { cues: [{ id: 'shadow.wisps', scale: 0.7, radiusK: 0.6 }, { id: 'blood.hit', scale: 0.6, at: 0.15 }, { id: 'archery.black_feathers', scale: 0.8, radiusK: 0.6, at: 0.25 }], onFollow: [{ id: 'blood.spray', scale: 0.5, at: 0.3 }], onFinale: [{ id: 'shadow.burst', scale: 0.8, radiusK: 0.7, at: 0.05 }, { id: 'archery.black_feathers', scale: 1.5, radiusK: 0.9, at: 0.15 }, { id: 'blood.spray', scale: 0.9, at: 0.2 }] },
  // CROWN, storm seekers, brands, reads brand|plant|loose. Five throats: a modest thunk, storm-chips crackling at each terminus, and every body found wears the hawk's mark; read off a word the storm breaks the marks it finds in a ring of lightning.
  arrow_tempest: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'storm.charge', scale: 0.5, at: 0.05 }, { id: 'storm.nova', scale: 0.45, at: 0.04 }, { id: 'archery.brand', scale: 0.7, at: 0.12 }], onFollow: [{ id: 'archery.brand_break', scale: 0.8, at: 0.02 }, { id: 'storm.nova', scale: 0.45, at: 0.08 }] },
  // ANSWER (the page), `loose`, knockback, reads `plant`. The no-further bar: four thunks, each with a radial shove; over a planted patch the shafts land as the crescendo and the shove doubles.
  warden_volley: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'dust.slam', scale: 0.4, at: 0.05 }], onFollow: [{ id: 'archery.crescendo', scale: 0.7 }, { id: 'dust.slam', scale: 0.6, at: 0.1 }] },

  // ---- THE SECRET SHELF: the bow's cross-school spice ---------------------

  // PAYOFF reads stagger|brand. Five arrows, five modest thunks; on a reeling or branded line every shaft breaks the mark.
  volley: { cues: [{ id: 'archery.thunk', scale: 0.75 }], onFollow: [{ id: 'archery.brand_break', scale: 0.7, at: 0.02 }] },
  // PAYOFF, vs sunder (consume). The through-bore: the heavy shaft's thunk, then a low shove of earth as it punches on through — the crack it spends is the brand the eye already sees.
  piercing_bolt: { cues: [{ id: 'archery.thunk', scale: 1.05 }, { id: 'dust.slam', scale: 0.45, at: 0.04 }] },
  // OPENER, `rend`, bleed. The axe-head's thunk, the notch beads red, and the wound is LEFT — a pool for the shears to read.
  broadhead: { cues: [{ id: 'archery.thunk', scale: 1.0 }, { id: 'blood.hit', scale: 0.7, at: 0.06 }, { id: 'blood.pool', scale: 0.45, at: 0.5 }] },
  // ANSWER, `loose`, reads vanish. The skip back: the heel kicks, the string snaps at the far foot, three coveys flush; from the dark the feathers bite half again — the arrival is the crescendo out of a burst of dark.
  wingbeat: { cues: [{ id: 'dust.kick', scale: 1.2 }, { id: 'archery.loose', scale: 0.9, atFar: true, at: 0.25 }, { id: 'archery.feathers', scale: 0.9, atFar: true, at: 0.3 }], onFollow: [{ id: 'shadow.burst', scale: 0.5, atFar: true, at: 0.2 }, { id: 'archery.crescendo', scale: 0.7, atFar: true, at: 0.35 }] },
  // OPENER, `plant`, pull, bleed + aftermath. The seed takes: the briar breaks the turf, drags the patch to center, opens what it catches.
  verdant_burst: { cues: [{ id: 'archery.briar', scale: 1.2, radiusK: 1.0 }, { id: 'blood.hit', scale: 0.4, at: 0.3 }] },
  // The thorns stay: the planted patch re-grows its teeth on its beats and keeps tugging the caught to center.
  'verdant_burst:aftermath': { cues: [{ id: 'archery.briar', scale: 0.85, radiusK: 0.9, every: 0.9 }] },
  // PAYOFF, drawn, reads rally. The note passes through — a thunk, the parted air hanging pale; sung on a rally it lands as the crescendo and the whole line's air parts.
  windsong: { cues: [{ id: 'archery.thunk', scale: 0.8 }, { id: 'water.mist', scale: 0.4, at: 0.04 }], onFollow: [{ id: 'archery.crescendo', scale: 1.0 }, { id: 'water.mist', scale: 0.6, at: 0.1 }] },
  // PAYOFF, bleed, reads rend|expose. The hedge laid: five modest thunks, the barbs biting a little blood; on an opened body the briar breaks the turf under each and the wound sprays.
  thorn_fan: { cues: [{ id: 'archery.thunk', scale: 0.65 }, { id: 'blood.hit', scale: 0.35, at: 0.1 }], onFollow: [{ id: 'archery.briar', scale: 0.5, radiusK: 0.5, at: 0.05 }, { id: 'blood.spray', scale: 0.5, at: 0.15 }] },
  // OPENER, `chill`, reads `loose`. The pack's eyes: a small thunk, winter dusk curling beneath, cold biting at the wound; after a quick shot the pack runs harder — a cold nova at each bite.
  howling_loose: { cues: [{ id: 'archery.thunk', scale: 0.5 }, { id: 'frost.shards', scale: 0.4, at: 0.02 }, { id: 'frost.fog', scale: 0.5, at: 0.04 }], onFollow: [{ id: 'frost.nova', scale: 0.5, at: 0.05 }] },
  // ANSWER, `chill`, knockback + aftermath. The stamped limb: the cage's bars stand up around the rim, the lock click-flashes at the center, the bars sublime to mist — and the rime STAYS.
  hoarfrost: { cues: [{ id: 'frost.shards', scale: 1.4, radiusK: 1.0 }, { id: 'frost.nova', scale: 1.0, at: 0.35 }, { id: 'frost.fog', scale: 0.7, radiusK: 0.8, at: 1.4 }] },
  // The rime sheet on the floor: spears at the rim, the fog re-settling on its beats, the ground riming under it.
  'hoarfrost:aftermath': { cues: [{ id: 'frost.shards', scale: 0.4, radiusK: 0.9 }, { id: 'frost.fog', scale: 0.9, radiusK: 1.0, at: 0.2, every: 0.9 }] },
  // PAYOFF reads vanish. The remembered flight: it lands, the violet pinhole flashes, after-images drift up; from the dark it arrives as the crescendo out of a burst of night.
  ghost_shaft: { cues: [{ id: 'archery.thunk', scale: 0.5 }, { id: 'shadow.burst', scale: 0.55, at: 0.02 }, { id: 'smoke.wisp', scale: 0.4, at: 0.25 }], onFollow: [{ id: 'shadow.burst', scale: 1.0, at: 0.02 }, { id: 'archery.crescendo', scale: 0.9, at: 0.05 }] },
  // SUSTAIN, `plant`, burn, reads burn. The burning snow: the shaft comes back down first, the flakes keep coming on the field's beat, the floor catches under them; over a body already burning the first fall detonates.
  cinder_rain: { cues: [{ id: 'archery.fall', scale: 0.45, radiusK: 0.3 }, { id: 'archery.cinderfall', scale: 1.1, radiusK: 0.9, at: 0.2, every: 0.8 }, { id: 'fire.floor', scale: 0.5, radiusK: 0.8, at: 1.2, every: 1.6 }], onFollow: [{ id: 'fire.burst', scale: 0.8, radiusK: 0.6, at: 0.3 }] },
  // PAYOFF reads taunt|stagger. The road cleared: a full thunk, the royal gold flares and its ring races out; on the called-out or reeling line the shot lands as the crescendo and the gold ward shatters.
  kings_arrow: { cues: [{ id: 'archery.thunk', scale: 1.0 }, { id: 'arcane.bloom', scale: 0.65, at: 0.03 }], onFollow: [{ id: 'archery.crescendo', scale: 1.1 }, { id: 'arcane.shatter', scale: 0.6, at: 0.05 }] },
  // SUSTAIN, finale ×1.5, reads hollow. The chart of the night: seven small thunks, a star igniting where each fell; under a hollowed sky the stars shatter; the last fall — the crescendo under a full bloom.
  starfall_arrows: { cues: [{ id: 'archery.thunk', scale: 0.45 }, { id: 'arcane.bloom', scale: 0.42, at: 0.02 }], onFollow: [{ id: 'arcane.shatter', scale: 0.4, at: 0.04 }], onFinale: [{ id: 'arcane.bloom', scale: 0.9, at: 0.05 }, { id: 'archery.crescendo', scale: 0.7 }] },
  // OPENER, drawn, `shock` + aftermath. The railshot: the string snaps, the rail hangs and re-forms along the corridor, then it overloads at the wall the ray died on.
  skyrend: { cues: [{ id: 'archery.loose', scale: 0.8 }, { id: 'storm.arc', scale: 1.3, at: 0.02 }, { id: 'storm.strike', scale: 1.1, atFar: true, at: 0.45 }] },
  // The line keeps crackling after the shaft has gone: a held charge re-peaking on its beats, a static ring re-snapping on the slower one.
  'skyrend:aftermath': { cues: [{ id: 'storm.nova', scale: 0.4, radiusK: 0.7, every: 1.2 }, { id: 'storm.charge', scale: 0.9, radiusK: 0.8, at: 0.2, every: 0.6 }] },
  // PAYOFF, the longest draw, reads wall|plant. Drawn past the ear: the heaviest thunk on the shelf, the chaff shoved flat, feathers knocked loose; behind a raised wall or over planted ground it lands as the crescendo and the earth is slammed.
  full_draw: { cues: [{ id: 'archery.thunk', scale: 1.4 }, { id: 'dust.slam', scale: 0.6, at: 0.06 }, { id: 'archery.feathers', scale: 0.4, radiusK: 0.5, at: 0.2 }], onFollow: [{ id: 'archery.crescendo', scale: 1.3 }, { id: 'dust.slam', scale: 0.7, at: 0.12 }] },
};
