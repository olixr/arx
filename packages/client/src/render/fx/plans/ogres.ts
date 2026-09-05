/**
 * OGRES — ability plans (particles v6 phase 5): THE HILL COMES DOWN.
 *
 * Curated by the ogres' master pass: one plan per ability id in
 * fxSigsOgres.ts, cued into the effect library, plus the four effects
 * the library could not speak — the MILLSTONE (a wheel that falls flat
 * and lies), the COMBED GRASS (a lawn flattened by a voice), the
 * ROCKFALL (stones from ABOVE with their racing shadows), and SUPPER
 * (a gnawed bone dropped in its grease). One grammar: WEIGHT ARRIVING.
 * Everything lands, bounces once at most, and then LIES THERE.
 *
 * Wire facts: ground_aoe → `blast` at the fuse (780 ms, r = the def);
 * projectile → `blast` at the landing (r = splash); nova → `nova`;
 * flurry → `arc` per pulse (r = range); self_buff → `buff` (750 ms).
 * The painted club print, the rolling wheel and the fist-prints are
 * drawing and stay; what lives here is the matter.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import { defineRecipe, type BurstOpts } from '../../particles.js';
import { SAND, PALE as DUST_PALE, LOAM, SHADE, DEEP as DUST_DEEP, DUST_GLOW } from '../library/dust.js';

const HOLD = curveOf('hold');
const SWELL = curveOf('swell');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST = curveOf('mist');
/** A lying grain: holds, and is taken back by the turf only at the end. */
const LIE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

const RAMP_DUST = rampOf({ stops: [SHADE, LOAM, DUST_PALE, '#c9a978'], at: [0, 0.3, 0.62, 1], steps: 6 });
const RAMP_FINE = rampOf({ stops: ['#e2c384', SAND, DUST_PALE, LOAM], at: [0, 0.3, 0.65, 1], steps: 5 });
const RAMP_CLOD = rampOf({ stops: [LOAM, SHADE, DUST_DEEP], at: [0, 0.55, 0.9], steps: 4 });

/** The shared floor shock. */
const SHOCKFRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: ['#e2c384', DUST_PALE, LOAM], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.7, 0.5, 2.6, 1, 3.3]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** A dust mass shoved out low, settling as it stalls. */
const MASS: BurstOpts = {
  shape: 'blob', speed: 1.1, speedVar: 0.4, life: 1.5, lifeVar: 0.3, size: 0.42, sizeVar: 0.25,
  gravity: 0, drag: 2.2, z: 0.06, vz: 0.5, zg: 1.2, mass: 0.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: curveOf([0, 0.55, 0.25, 1, 0.6, 1.15, 1, 0.85]), alphaCurve: curveOf([0, 0.5, 0.12, 1, 0.66, 0.9, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.3, spin: 0.35,
};

/** Fines: thrown high, falling fast, lying. */
const FINE: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 2.0, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 0.4, vz: 2.4, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** A clod hero: thrown, bouncing, lying, flecking. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.2, speedVar: 0.5, life: 2.8, lifeVar: 0.3, size: 0.075, sizeVar: 0.3,
  gravity: 0, spin: 9, vz: 2.7, zg: 8, land: 'bounce', bounce: 0.42, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 7,
};

/** The pale veil that settles after. */
const VEIL: BurstOpts = {
  shape: 'blob', speed: 0.1, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.36, sizeVar: 0.25,
  gravity: 0, drag: 0.8, z: 0.05, vz: 0.2, zg: 0.3, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, DUST_PALE, '#c9a978'], at: [0, 0.45, 1], steps: 4 }), sizeCurve: SWELL,
  alphaCurve: curveOf([0, 0.2, 0.3, 0.55, 0.65, 0.5, 1, 0]), wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

// ---------------------------------------------------------------------------
// ogres.millstone — THE WHEEL COMES TO REST
// ---------------------------------------------------------------------------

const RIM = '#d8d0ba';
const FACE = '#8f8672';
const FACE_SHADE = '#6a624f';
const FACE_DEEP = '#4c463a';

/** The wheel upright: a fat hoop standing on its edge, wobbling. */
const WHEEL_UP: BurstOpts = {
  shape: 'ring', ringWidth: 0.3, speed: 0.05, speedVar: 0, life: 0.85, lifeVar: 0.05, size: 0.62, sizeVar: 0.05,
  gravity: 0, z: 0.3, vz: 0, zg: 0, layer: 'world', shadow: 0.9,
  ramp: rampOf({ stops: [RIM, FACE], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: curveOf([0, 1, 0.9, 1, 1, 0]),
  wave: 'sine', waveHz: 2.2, waveAmp: 0.35, waveAxis: 'x',
};

/** The wheel flat: a hoop with its eye lying in the grass nine seconds. */
const WHEEL_FLAT: BurstOpts = {
  shape: 'ring', ringWidth: 0.3, speed: 0, speedVar: 0, life: 9, lifeVar: 0.05, size: 0.62, sizeVar: 0.05,
  gravity: 0, layer: 'ground', shadow: 0,
  ramp: rampOf({ stops: [FACE, FACE_SHADE, FACE_DEEP], at: [0, 0.5, 0.95], steps: 3 }),
  sizeCurve: curveOf([0, 0.85, 0.06, 1, 1, 1]), alphaCurve: curveOf([0, 1, 0.9, 1, 1, 0]),
};

/** Dust chasing the rim. */
const RIM_DUST: BurstOpts = {
  shape: 'blob', speed: 0.6, speedVar: 0.5, life: 0.8, lifeVar: 0.3, size: 0.26, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.02, vz: 0.3, zg: 1.0, mass: 0.3, layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]), alphaCurve: curveOf([0, 0.95, 0.5, 0.8, 1, 0]),
};

export const ogresMillstone: EffectDef = {
  id: 'ogres.millstone',
  name: 'Ogres — millstone',
  story: 'a hundredweight of quarried wheel lands on its edge, wobbling upright with dust chasing the rim → it leans and falls FLAT with one last slam — shockfront, a wall of dust, clods and fines thrown → the wheel lies in the grass, eye up, nine seconds — the one piece of loot nobody can carry',
  layers: [
    { kind: 'burst', name: 'the wheel upright', recipe: recipe([RIM, FACE], WHEEL_UP), count: 1, tier: 'hero' },
    { kind: 'emit', name: 'rim dust', arrange: 'disc', radius: 0.2, rate: 18, dur: 0.85, attack: 0.05, release: 0.2, tier: 'body',
      pops: [{ colors: [DUST_PALE, LOAM], opts: RIM_DUST }] },
    { kind: 'burst', name: 'the flat fall', recipe: recipe(['#e2c384', SAND], SHOCKFRONT), count: 1, tier: 'hero', at: 0.85 },
    { kind: 'burst', name: 'the wheel flat', recipe: recipe([FACE, FACE_SHADE], WHEEL_FLAT), count: 1, tier: 'hero', at: 0.86 },
    { kind: 'burst', name: 'slam wall', recipe: recipe([LOAM, SHADE, DUST_PALE], MASS), count: 12, tier: 'body', arrange: 'rim', radius: 0.32, outward: 1.1, at: 0.85 },
    { kind: 'burst', name: 'slam clods', recipe: recipe([LOAM, SHADE], CLOD), count: 6, tier: 'hero', arrange: 'ring', radius: 0.3, at: 0.85 },
    { kind: 'burst', name: 'slam fines', recipe: recipe([SAND, '#e2c384', DUST_PALE], FINE), count: 16, tier: 'fine', arrange: 'ring', radius: 0.3, at: 0.85 },
    { kind: 'field', name: 'pressure', field: { kind: 'attract', radius: 1.4, strength: -1.8, dur: 0.4, attack: 0.02, release: 0.2 }, at: 0.85 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.55, at: 1.2, rate: 12, dur: 1.6, attack: 0.2, release: 0.7, tier: 'body',
      pops: [{ colors: [DUST_PALE, '#c9a978'], opts: VEIL }] },
    { kind: 'glow', name: 'ground light', r: 1.2, rgb: DUST_GLOW, a: 0.1, at: 0.85, dur: 0.4, attack: 0.02, release: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// ogres.combed_grass — THE GRASS LIES DOWN
// ---------------------------------------------------------------------------

const GRASS_LIT = '#9cc05a';
const GRASS = '#6f9a3c';
const GRASS_DEEP = '#4a6e2a';
const AIR = '#ece8d8';

const RAMP_GRASS = rampOf({ stops: [GRASS_LIT, GRASS, GRASS_DEEP], at: [0, 0.25, 0.9], steps: 3 });

/** The shout: a pale hoop racing out — the air arriving. */
const SHOUT: BurstOpts = {
  ...SHOCKFRONT, life: 0.55, size: 0.4, ramp: rampOf({ stops: [AIR, DUST_PALE, '#c9a978'], at: [0, 0.5, 0.9] }),
  sizeCurve: curveOf([0, 0.5, 0.5, 3.2, 1, 4.4]),
};

/** The wavefront: air puffs shoved out fast and gone. */
const GUST: BurstOpts = {
  shape: 'mote', speed: 3.0, speedVar: 0.3, life: 0.6, lifeVar: 0.3, size: 0.34, sizeVar: 0.3,
  gravity: 0, drag: 2.0, z: 0.08, vz: 0.2, zg: 0.4, layer: 'world', shadow: 0, spin: 0.4,
  ramp: rampOf({ stops: [AIR, DUST_PALE, '#c9a978'], at: [0, 0.5, 0.9], steps: 3 }), sizeCurve: SWELL, alphaCurve: FADE_OUT,
};

/** A combed blade: a streak lying down radially, pointing away from the voice. */
const COMBED: BurstOpts = {
  shape: 'streak', speed: 0.09, speedVar: 0.3, life: 6.5, lifeVar: 0.15, size: 0.085, sizeVar: 0.4,
  gravity: 0, layer: 'ground', shadow: 0, ramp: RAMP_GRASS, sizeCurve: HOLD,
  alphaCurve: curveOf([0, 0, 0.03, 1, 0.85, 1, 1, 0]),
};

/** The rush: fast streaks that run out with the wavefront and die. */
const RUSH: BurstOpts = {
  shape: 'streak', speed: 3.4, speedVar: 0.3, life: 0.5, lifeVar: 0.25, size: 0.06, sizeVar: 0.3,
  gravity: 0, drag: 3.0, layer: 'ground', shadow: 0, ramp: RAMP_GRASS, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Loose dust skimming out on the shout. */
const SKIM: BurstOpts = {
  ...FINE, speed: 3.2, speedVar: 0.4, drag: 1.5, vz: 0.6, zg: 4, life: 1.4,
};

/** A spittle-fleck riding the shout. */
const SPITTLE: BurstOpts = {
  shape: 'drop', speed: 2.4, speedVar: 0.4, life: 1.4, size: 0.07, sizeVar: 0.3, gravity: 0,
  z: 0.7, vz: 1.6, zg: 8, land: 'splat', layer: 'world',
  ramp: rampOf({ stops: [AIR, '#d8d0b8', '#b8b09a'], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, mark: 'fleck', markLife: 3,
};

/** Air haze standing where the shout passed. */
const HAZE: BurstOpts = {
  shape: 'mote', speed: 1.2, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.3, sizeVar: 0.3,
  gravity: 0, drag: 1.6, z: 0.1, vz: 0.15, zg: 0.3, layer: 'world', shadow: 0, spin: 0.3,
  ramp: rampOf({ stops: [AIR, DUST_PALE], at: [0, 0.8] }), sizeCurve: SWELL, alphaCurve: MIST,
};

export const ogresCombedGrass: EffectDef = {
  id: 'ogres.combed_grass',
  name: 'Ogres — combed grass',
  story: 'no fire, no stone: the AIR arrives — a pale hoop and a gust race out, loose dust and a spittle-fleck ride the shout → grass streaks lie down radially in three waves to the rim and STAY flat, every blade pointing away from where the voice stood → an air haze stands and thins, and the combed lawn lies six seconds',
  layers: [
    { kind: 'field', name: 'the shove', field: { kind: 'attract', radius: 2.6, strength: -2.6, dur: 0.5, attack: 0.02, release: 0.25 }, radiusK: 1.1 },
    { kind: 'burst', name: 'the shout', recipe: recipe([AIR, DUST_PALE], SHOUT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'gust', recipe: recipe([AIR, DUST_PALE], GUST), count: 12, tier: 'body', arrange: 'rim', radius: 0.2, outward: 3.0 },
    { kind: 'burst', name: 'rush', recipe: recipe([GRASS_LIT, GRASS], RUSH), count: 14, tier: 'fine', arrange: 'rim', radius: 0.15, outward: 3.4 },
    { kind: 'burst', name: 'combed near', recipe: recipe([GRASS_LIT, GRASS], COMBED), count: 16, tier: 'hero', arrange: 'rim', radius: 0.28, radiusK: 0.28, outward: 0.09 },
    { kind: 'burst', name: 'combed mid', recipe: recipe([GRASS, GRASS_LIT], COMBED), count: 16, tier: 'hero', arrange: 'rim', radius: 0.56, radiusK: 0.56, outward: 0.09, at: 0.1 },
    { kind: 'burst', name: 'combed far', recipe: recipe([GRASS, GRASS_DEEP], COMBED), count: 14, tier: 'hero', arrange: 'rim', radius: 0.85, radiusK: 0.85, outward: 0.09, at: 0.2 },
    { kind: 'burst', name: 'loose dust', recipe: recipe([SAND, DUST_PALE], SKIM), count: 16, tier: 'fine', arrange: 'rim', radius: 0.3, outward: 3.2 },
    { kind: 'burst', name: 'spittle', recipe: recipe([AIR, '#d8d0b8'], SPITTLE), count: 3, tier: 'body' },
    { kind: 'emit', name: 'air haze', arrange: 'rim', radius: 0.7, radiusK: 0.7, outward: 1.2, rate: 12, dur: 0.8, attack: 0.05, release: 0.3, tier: 'body',
      pops: [{ colors: [AIR, DUST_PALE], opts: HAZE }] },
  ],
};

// ---------------------------------------------------------------------------
// ogres.rockfall — THE HILLSIDE LETS GO
// ---------------------------------------------------------------------------

const LIT = '#cfc4a2';
const STONE = '#7d7154';
const STONE_DEEP = '#403a28';

const RAMP_STONE = rampOf({ stops: [LIT, STONE, STONE_DEEP], at: [0, 0.4, 0.95], steps: 4 });

/** The landing's dust: masses shoved out under the stone where it hits. */
const LANDING = defineRecipe({
  colors: [LOAM, SHADE, DUST_PALE],
  opts: { ...MASS, speed: 0.9, size: 0.34, life: 1.1, vz: 0.4, zg: 1.4 },
  count: 5,
});

/** A field-stone from ABOVE: born high, falling on true altitude, bouncing once, staying. */
const STONE_FALL: BurstOpts = {
  shape: 'square', speed: 0.06, speedVar: 0.5, life: 8, lifeVar: 0.1, size: 0.24, sizeVar: 0.25,
  gravity: 0, z: 2.6, vz: 0, zg: 9, land: 'bounce', bounce: 0.22, layer: 'world', shadow: 1, spin: 1.5,
  ramp: RAMP_STONE, sizeCurve: HOLD, alphaCurve: curveOf([0, 1, 0.9, 1, 1, 0]), mark: 'fleck', markLife: 8,
  onLand: LANDING,
};

/** Pebbles falling with each stone. */
const PEBBLE: BurstOpts = {
  shape: 'square', speed: 0.2, speedVar: 0.6, life: 3.2, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 2.4, vz: 0, zg: 9, land: 'settle', layer: 'world', shadow: 0.4,
  ramp: RAMP_STONE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

export const ogresRockfall: EffectDef = {
  id: 'ogres.rockfall',
  name: 'Ogres — rockfall',
  story: 'the chant stamps the ground → three field-stones arrive from ABOVE on staggered beats, each dropping on true altitude with its own shadow racing up to meet it, hitting with a slam of dust and STAYING → pebbles and grit rain after → a pale veil settles over a rearranged landscape that lies eight seconds',
  layers: [
    { kind: 'burst', name: 'the stamp', recipe: recipe(['#e2c384', SAND], SHOCKFRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'stone I', recipe: recipe([LIT, STONE], STONE_FALL), count: 1, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7 },
    { kind: 'burst', name: 'pebbles I', recipe: recipe([STONE, LIT], PEBBLE), count: 6, tier: 'fine', arrange: 'disc', radius: 0.7, radiusK: 0.7 },
    { kind: 'burst', name: 'stone II', recipe: recipe([LIT, STONE], STONE_FALL), count: 1, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.18 },
    { kind: 'burst', name: 'pebbles II', recipe: recipe([STONE, LIT], PEBBLE), count: 6, tier: 'fine', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.18 },
    { kind: 'burst', name: 'stone III', recipe: recipe([LIT, STONE], { ...STONE_FALL, size: 0.2 }), count: 1, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.36 },
    { kind: 'burst', name: 'pebbles III', recipe: recipe([STONE, LIT], PEBBLE), count: 6, tier: 'fine', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.36 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, '#e2c384', DUST_PALE], { ...FINE, vz: 1.8, life: 1.7 }), count: 12, tier: 'body', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.78, every: 0.18, times: 2 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 1.1, rate: 12, dur: 1.6, attack: 0.2, release: 0.7, tier: 'body',
      pops: [{ colors: [DUST_PALE, '#c9a978'], opts: VEIL }] },
    { kind: 'glow', name: 'ground light', r: 1.2, rgb: DUST_GLOW, a: 0.08, at: 0.76, dur: 0.6, attack: 0.02, release: 0.4, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// ogres.supper — THE BONE HITS THE GROUND
// ---------------------------------------------------------------------------

const BONE = '#efe8d4';
const BONE_SHADE = '#cdc3a8';
const GREASE = '#a4763e';
const GREASE_DARK = '#5a3a1e';
const CRUMB = '#8a6a3a';

const RAMP_GREASE = rampOf({ stops: [GREASE, '#7a5228', GREASE_DARK], at: [0, 0.5, 0.9], steps: 4 });

/** Grease letting go from the jaw, straight down, smearing. */
const DRIP: BurstOpts = {
  shape: 'drop', speed: 0.1, life: 1.2, size: 0.065, sizeVar: 0.3, gravity: 0,
  z: 0.9, vz: -0.2, zg: 7, land: 'splat', layer: 'world',
  ramp: RAMP_GREASE, sizeCurve: HOLD, mark: 'smear', markLife: 4,
};

/** Juice flung while the jaw works. */
const JUICE: BurstOpts = {
  shape: 'drop', speed: 0.9, speedVar: 0.6, life: 0.6, size: 0.04, sizeVar: 0.35, gravity: 0,
  z: 0.9, vz: 0.5, zg: 8, land: 'die', layer: 'world', shadow: 0, ramp: RAMP_GREASE, sizeCurve: HOLD,
};

/** THE BONE: one pale relic dropped at the swallow, lying eight seconds. */
const THE_BONE: BurstOpts = {
  shape: 'shard', speed: 0.35, speedVar: 0.4, life: 8, lifeVar: 0.05, size: 0.16, sizeVar: 0.1,
  gravity: 0, spin: 4, z: 0.9, vz: 0.3, zg: 7, land: 'bounce', bounce: 0.3, layer: 'world',
  ramp: rampOf({ stops: [BONE, BONE_SHADE], at: [0, 0.85] }), sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 6,
};

/** Crumbs of the meal falling with it. */
const CRUMBS: BurstOpts = {
  shape: 'square', speed: 0.5, speedVar: 0.6, life: 5, lifeVar: 0.3, size: 0.045, sizeVar: 0.35,
  gravity: 0, z: 0.85, vz: 0.2, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [CRUMB, GREASE_DARK], at: [0, 0.8] }), sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** The grease shadow the bone lies in. */
const GREASE_SHADOW: BurstOpts = {
  shape: 'blob', speed: 0, life: 7, lifeVar: 0.1, size: 0.3, sizeVar: 0.15, gravity: 0, layer: 'ground', shadow: 0,
  ramp: rampOf({ stops: [GREASE_DARK, '#4a3018'], at: [0, 0.8] }), sizeCurve: curveOf([0, 0.5, 0.15, 1, 1, 1]),
  alphaCurve: curveOf([0, 0.55, 0.1, 0.6, 0.85, 0.55, 1, 0]),
};

export const ogresSupper: EffectDef = {
  id: 'ogres.supper',
  name: 'Ogres — supper',
  story: 'supper, mid-fight: grease drips and juice flies while the great jaw works → at the swallow the finished bone drops — one pale gnawed relic bouncing once into its grease shadow — with the crumbs of the meal → the bone lies by the great feet eight seconds, the camp\'s whole archaeology, live',
  layers: [
    { kind: 'burst', name: 'grease', recipe: recipe([GREASE, '#7a5228'], DRIP), count: 2, tier: 'hero', arrange: 'disc', radius: 0.12, every: 0.2, times: 3 },
    { kind: 'emit', name: 'the jaw works', arrange: 'disc', radius: 0.1, dz: 0.9, rate: 12, dur: 0.55, attack: 0.05, release: 0.15, tier: 'fine',
      pops: [{ colors: [GREASE, '#c08a4a'], opts: JUICE }] },
    { kind: 'burst', name: 'grease shadow', recipe: recipe([GREASE_DARK], GREASE_SHADOW), count: 1, tier: 'hero', at: 0.5 },
    { kind: 'burst', name: 'the bone', recipe: recipe([BONE, BONE_SHADE], THE_BONE), count: 1, tier: 'hero', at: 0.55 },
    { kind: 'burst', name: 'crumbs', recipe: recipe([CRUMB, GREASE_DARK], CRUMBS), count: 6, tier: 'body', arrange: 'disc', radius: 0.08, at: 0.55 },
  ],
};

export const OGRES_EFFECTS: EffectDef[] = [ogresMillstone, ogresCombedGrass, ogresRockfall, ogresSupper];

// ---------------------------------------------------------------------------
// THE PLANS — one per ability id in fxSigsOgres.ts.
// ---------------------------------------------------------------------------

export const OGRES_PLANS: Record<string, AbilityPlan> = {
  // THE BELL UNDER THE HILL (blast r1.7): the club face prints the turf — the
  // heaviest single slam in the bestiary — the ring wave rolls off it as a
  // billow, and sod tabs flip at the rim. The print itself is paint.
  skull_toll: { cues: [
    { id: 'dust.slam', scale: 2.0 },
    { id: 'dust.billow', at: 0.25, scale: 0.9 },
    { id: 'dust.kick', at: 0.45, scale: 0.8 },
  ] },
  // THE GROUND LOSES THE ARGUMENT (arc per pulse, r2.5): every blow of the
  // flurry stamps its own slam and kicks dust down the aim — no aim, all
  // outcome, three times.
  ogre_tantrum: { cues: [
    { id: 'dust.slam', scale: 1.0 },
    { id: 'dust.kick', at: 0.08, scale: 0.9 },
  ] },
  // THE WHEEL COMES TO REST (blast r1.4 at the landing): the edge-on landing
  // slams, the wheel wobbles upright and falls flat inside the effect, and
  // lies there nine seconds.
  millstone_toss: { cues: [
    { id: 'dust.slam', scale: 1.2 },
    { id: 'ogres.millstone', scale: 1.2 },
  ] },
  // THE ROAD THROWN BACK (blast r0.55 × 3 landings): small and mean — a skid of
  // dust down the flight line and a pinch of slam where the stones seat.
  gravel_rake: { cues: [
    { id: 'dust.kick', scale: 0.8 },
    { id: 'dust.slam', at: 0.05, scale: 0.5 },
  ] },
  // THE GRASS LIES DOWN (nova r3.2): the voice — one smoke hoop leaving the
  // mouth — then the combed lawn to the rim, and a rolling cloud of loose dust
  // driven down the aim after.
  hill_bellow: { cues: [
    { id: 'smoke.ring', scale: 0.9 },
    { id: 'ogres.combed_grass', scale: 1.7, radiusK: 1 },
    { id: 'dust.billow', at: 0.1, scale: 1.0 },
  ] },
  // THE HILLSIDE LETS GO (blast r2.2): three stones from above on their own
  // beats, then a rolling cloud once the last has seated.
  shaken_stones: { cues: [
    { id: 'ogres.rockfall', scale: 1.4, radiusK: 0.8 },
    { id: 'dust.billow', at: 0.9, scale: 0.8 },
  ] },
  // THE BONE HITS THE GROUND (buff): a moment, not a working — the grease,
  // the swallow, the bone in its shadow.
  haunch_gnaw: { cues: [
    { id: 'ogres.supper', scale: 1.0 },
  ] },
};
