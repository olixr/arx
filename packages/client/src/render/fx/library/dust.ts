/**
 * DUST — the weight of the world.
 *
 * Dust has no life of its own: every grain was THROWN, flies
 * ballistic, hangs one beat at the top of its arc, and comes back to
 * the dirt it came from. It rolls out LOW, it billows, and above all
 * it SETTLES — a grain that lands with `settle` becomes ground-layer
 * matter and drags to a stop where it fell; the settled clods ARE the
 * residue, and the hero clods leave a lasting fleck scatter. Dust that
 * vanishes mid-air is just gray fire.
 *
 * The earthbreaker story (dust.slam), each layer on its own clock:
 *
 *   SHOCKFRONT  the pressure ring racing out flat on the ground
 *   SKIRT       flat slivers driven out along the floor behind the ring
 *   WAVEFRONT   the rim-arranged wall of dust masses shoved outward —
 *               big overlapping puffs born dark loam, thinning pale as
 *               they thin out, settling as ground dust when they stall
 *   PLUME       the billow that swallows the strike point — lofted a
 *               hand's height, swelling, sifting back down
 *   PRESSURE    a short repel field: the air itself shoves the mass out
 *   CLODS       the heroes: shards thrown on true height, tumbling,
 *               BOUNCING, lying where they stop, each leaving a FLECK
 *   ROCKS       three heavier heroes thrown lower and shorter
 *   FINES       the rain of earth: thrown high, falling fast, lying there
 *   HANG        fines that ride the plume and sift down slower
 *   ROLL        the second wave: low creepers that crawl out under the
 *               wavefront and stop
 *   VEIL        the late voice: a thin pale haze that stands and settles
 *               for seconds after
 *   GLOW        the impact's own faint warm ground light (a ≤ 0.12)
 *
 * Sizes for the street scale (~48–64 px/tile): a mass is a third of a
 * tile so lobes merge into one body; fines are dots. Palette shared
 * with render/matter/dust.ts — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const SAND = '#d8b06a';
export const PALE = '#b89468';
export const LOAM = '#a8825a';
export const SHADE = '#8a6f4d';
export const DEEP = '#6e5a44';
/** Intermediate stops for the posterized ramps. */
const HAZE = '#c9a978';
const DRY = '#e2c384';

/** The impact's ground light — warm earth, never a lamp. */
export const DUST_GLOW = '214, 172, 112';

/** A thrown mass: born dark loam, thinning to pale as it spreads. */
export const RAMP_MASS = rampOf({ stops: [SHADE, LOAM, PALE, HAZE], at: [0, 0.3, 0.62, 1], steps: 6 });
/** The plume above the strike: slightly lighter, sunlit on top. */
export const RAMP_PLUME = rampOf({ stops: [LOAM, PALE, HAZE, SAND], at: [0, 0.32, 0.66, 1], steps: 6 });
/** Clods: the earth's own color, darkening as they lie in shadow. */
export const RAMP_CLOD = rampOf({ stops: [LOAM, SHADE, DEEP], at: [0, 0.55, 0.9], steps: 4 });
/** Fines: bright sand catching light in flight, dulling on the ground. */
export const RAMP_FINE = rampOf({ stops: [DRY, SAND, PALE, LOAM], at: [0, 0.3, 0.65, 1], steps: 5 });
/** The veil: pale and thin from birth. */
export const RAMP_VEIL = rampOf({ stops: [LOAM, PALE, HAZE], at: [0, 0.45, 1], steps: 4 });

const SWELL = curveOf('swell');
const SMOKE_A = curveOf('smoke');
const HOLD = curveOf('hold');
const FADE_LATE = curveOf('fadeLate');
const FADE_OUT = curveOf('fadeOut');
const MIST = curveOf('mist');
const BLOOM = curveOf('bloom');
/** Mass: born at two thirds, swells past full, holds, thins late. */
const MASS_SIZE = curveOf([0, 0.55, 0.25, 1, 0.6, 1.15, 1, 0.85]);
/** Mass alpha: dense fast, a long hold, letting go in the last third. */
const MASS_A = curveOf([0, 0.5, 0.12, 1, 0.66, 0.9, 1, 0]);
/** A kicked breath: born full, swells a touch, thins away. */
const KICK_SIZE = curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]);
const KICK_A = curveOf([0, 0.95, 0.5, 0.8, 1, 0]);
/** A settling grain: holds its size, fades only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);

/** The pressure ring, flat on the floor. */
const SHOCKFRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [DRY, PALE, LOAM], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.7, 0.5, 2.6, 1, 3.3]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** Flat slivers racing out along the floor. */
const SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.4, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground',
  ramp: rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.45, 0.8] }), alphaCurve: FADE_LATE,
};

/** The wavefront masses — big puffs shoved out, low, settling as they stall. */
const MASS: BurstOpts = {
  shape: 'blob', speed: 1.1, speedVar: 0.4, life: 1.5, lifeVar: 0.3,
  size: 0.42, sizeVar: 0.25, gravity: 0, drag: 2.2,
  z: 0.06, vz: 0.5, zg: 1.2, mass: 0.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: MASS_SIZE, alphaCurve: MASS_A,
  wave: 'noise', waveHz: 1.6, waveAmp: 0.3, spin: 0.35,
};

/** The plume: the billow that swallows the strike point and sifts down. */
const PLUME: BurstOpts = {
  shape: 'blob', speed: 0.45, speedVar: 0.5, life: 1.9, lifeVar: 0.3,
  size: 0.44, sizeVar: 0.25, gravity: 0, drag: 1.4,
  z: 0.1, vz: 1.0, zg: 1.3, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_PLUME, sizeCurve: SWELL, alphaCurve: SMOKE_A,
  wave: 'noise', waveHz: 1.2, waveAmp: 0.35, spin: 0.5,
};

/** Low creepers — the second wave crawling out under the wall. */
const CREEPER: BurstOpts = {
  shape: 'blob', speed: 0.9, speedVar: 0.45, life: 1.7, lifeVar: 0.3,
  size: 0.34, sizeVar: 0.3, gravity: 0, drag: 1.8,
  z: 0.03, vz: 0.15, zg: 0.6, mass: 0.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: MASS_SIZE, alphaCurve: MASS_A,
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25, spin: 0.4,
};

/** Clod heroes: thrown, tumbling, bouncing, lying, FLECKING the dirt. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.2, speedVar: 0.5, life: 2.8, lifeVar: 0.3,
  size: 0.075, sizeVar: 0.3, gravity: 0, spin: 9,
  vz: 2.7, zg: 8, land: 'bounce', bounce: 0.42, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 7,
};

/** Rocks: heavier, thrown lower, shorter, still marking. */
const ROCK: BurstOpts = {
  ...CLOD, shape: 'square', align: true, size: 0.1, sizeVar: 0.25, speed: 0.9,
  vz: 2.0, spin: 5, bounce: 0.3, life: 3.2, markLife: 8,
};

/** The rain of earth: thrown high, falling fast, lying where it lands. */
const FINE: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 2.0, lifeVar: 0.35,
  size: 0.042, sizeVar: 0.3, gravity: 0, drag: 0.4,
  vz: 2.4, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Fines that hang in the plume and sift down slow. */
const HANG: BurstOpts = {
  shape: 'mote', speed: 0.45, speedVar: 0.6, life: 2.4, lifeVar: 0.35,
  size: 0.05, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.15, vz: 1.3, zg: 1.6, mass: 0.8, land: 'settle', layer: 'world', shadow: 0,
  jitter: 2.2, ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The veil: thin pale haze standing after, settling. */
const VEIL: BurstOpts = {
  shape: 'blob', speed: 0.1, speedVar: 0.5, life: 2.8, lifeVar: 0.3,
  size: 0.38, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.05, vz: 0.22, zg: 0.3, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_VEIL, sizeCurve: SWELL, alphaCurve: curveOf([0, 0.2, 0.3, 0.55, 0.65, 0.5, 1, 0]),
  wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

/** The sift: fines dropping out of a standing cloud. */
const SIFT: BurstOpts = {
  ...FINE, shape: 'mote', speed: 0.2, size: 0.04, vz: 0, z: 0.5, zg: 2.2, life: 1.6, drag: 0.8,
  alphaCurve: FADE_LATE,
};

/**
 * dust.slam — THE EARTHBREAKER. A ground smash: the shock ring, the
 * wall of dust shoved outward, clods flung and bouncing, fines raining
 * back, a plume over the strike, and a veil that settles after.
 */
export const dustSlam: EffectDef = {
  id: 'dust.slam',
  name: 'Dust — slam',
  story: 'shockfront → the wall of dust shoved outward → clods flung on true height, bouncing and lying → fines rain back → the plume swallows the strike point → a pale veil settles and the flecks stay',
  layers: [
    { kind: 'field', name: 'pressure', field: { kind: 'attract', radius: 1.4, strength: -1.8, dur: 0.45, attack: 0.02, release: 0.25 } },
    { kind: 'burst', name: 'shockfront', recipe: recipe([DRY, SAND], SHOCKFRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'skirt', recipe: recipe([SAND, PALE], SKIRT), count: 14, tier: 'fine', arrange: 'rim', radius: 0.12, outward: 3.4 },
    { kind: 'burst', name: 'wavefront', recipe: recipe([LOAM, SHADE, PALE], MASS), count: 14, tier: 'body', arrange: 'rim', radius: 0.18, outward: 1.1 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 7, tier: 'hero' },
    { kind: 'burst', name: 'rocks', recipe: recipe([SHADE, DEEP], ROCK), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'fines', recipe: recipe([SAND, DRY, PALE], FINE), count: 22, tier: 'fine' },
    { kind: 'burst', name: 'plume', recipe: recipe([LOAM, PALE], PLUME), count: 10, tier: 'body', arrange: 'disc', radius: 0.16 },
    { kind: 'burst', name: 'hang', recipe: recipe([SAND, PALE], HANG), count: 14, tier: 'fine', arrange: 'disc', radius: 0.15, at: 0.08 },
    { kind: 'burst', name: 'roll', recipe: recipe([LOAM, PALE], CREEPER), count: 12, tier: 'body', arrange: 'rim', radius: 0.28, outward: 0.9, at: 0.16 },
    { kind: 'burst', name: 'second plume', recipe: recipe([PALE, LOAM], { ...PLUME, size: 0.32, vz: 0.6, life: 1.6 }), count: 6, tier: 'body', arrange: 'disc', radius: 0.22, dz: 0.3, at: 0.24 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.55, at: 0.5, rate: 18, dur: 1.9, attack: 0.15, release: 0.7, tier: 'body',
      pops: [
        { colors: [PALE, HAZE], opts: VEIL, weight: 2 },
        { colors: [SAND, PALE], opts: SIFT, weight: 1.2, tier: 'fine' },
      ] },
    { kind: 'glow', name: 'ground light', r: 1.3, rgb: DUST_GLOW, a: 0.11, dur: 0.4, attack: 0.02, release: 0.3 },
  ],
};

/**
 * dust.kick — a footfall / skid: one breath of earth thrown behind
 * the heel (params.dir reversed). Cheap: ≤ 25 grains, three fine
 * layers and one clod.
 */
export const dustKick: EffectDef = {
  id: 'dust.kick',
  name: 'Dust — kick',
  story: 'the heel throws one breath of earth backward: a low puff, fines skittering and lying, one clod that hops and stays',
  layers: [
    { kind: 'field', name: 'scuff', field: { kind: 'lift', radius: 0.45, strength: 0.9, dur: 0.25, height: 0.5, attack: 0.02, release: 0.12 } },
    { kind: 'burst', name: 'puff', recipe: recipe([PALE, LOAM], { ...CREEPER, size: 0.27, sizeVar: 0.2, speed: 0.9, life: 0.8, vz: 0.3, zg: 1.0, drag: 2.6, mass: 0.3, sizeCurve: KICK_SIZE, alphaCurve: KICK_A }),
      count: 4, tier: 'body', arrange: 'cone', dirOff: Math.PI, spread: 0.7 },
    { kind: 'burst', name: 'skitter', recipe: recipe([SAND, PALE], { ...FINE, speed: 1.0, vz: 0.9, zg: 7, life: 0.9, size: 0.046 }),
      count: 7, tier: 'fine', arrange: 'cone', dirOff: Math.PI, spread: 0.9 },
    { kind: 'burst', name: 'hang', recipe: recipe([SAND, HAZE], { ...HANG, speed: 0.3, vz: 0.7, zg: 1.8, life: 1.1, size: 0.05 }),
      count: 5, tier: 'fine', arrange: 'cone', dirOff: Math.PI, spread: 1.0, at: 0.04 },
    { kind: 'burst', name: 'clod', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 0.8, vz: 1.4, life: 1.4, size: 0.06, markLife: 3 }),
      count: 1, tier: 'hero', arrange: 'cone', dirOff: Math.PI, spread: 0.5 },
    { kind: 'burst', name: 'second breath', recipe: recipe([PALE, HAZE], { ...VEIL, size: 0.24, speed: 0.45, life: 0.95, vz: 0.2, sizeCurve: KICK_SIZE, alphaCurve: curveOf([0, 0.6, 0.4, 0.7, 1, 0]) }),
      count: 3, tier: 'body', arrange: 'cone', dirOff: Math.PI, spread: 0.8, at: 0.08 },
  ],
};

/** The rolling cloud's mixed body. */
const BILLOW_POPS: EmitterPop[] = [
  { colors: [LOAM, PALE, SHADE], opts: { ...MASS, speed: 0.55, drag: 1.2, life: 2.2, vz: 0.6, zg: 0.9, mass: 0.9, size: 0.38 }, weight: 2.2, tier: 'body' },
  { colors: [PALE, LOAM], opts: { ...CREEPER, speed: 0.5, mass: 0.8, life: 2.0, size: 0.32 }, weight: 1.2, tier: 'body' },
  { colors: [SAND, PALE], opts: { ...HANG, mass: 1.2, vz: 0.9, zg: 1.4, life: 2.2 }, weight: 1.4, tier: 'fine' },
  { colors: [LOAM, SHADE], opts: { ...CLOD, speed: 0.5, vz: 1.4, size: 0.06, life: 2.4, markLife: 5 }, weight: 0.25, tier: 'hero' },
];

/**
 * dust.billow — a rolling cloud drifting on a wind aimed with
 * params.dir: collapse aftermath, dragged cargo, a stampede's wake.
 */
export const dustBillow: EffectDef = {
  id: 'dust.billow',
  name: 'Dust — billow',
  story: 'a rolling cloud: big overlapping masses swell and thin as the wind carries them, creepers crawl low under it, fines sift out and lie in a drift, a clod or two rides along',
  layers: [
    { kind: 'field', name: 'wind', field: { kind: 'wind', radius: 2.6, strength: 1.6, dur: 3.2, attack: 0.2, release: 0.8 }, aimed: true },
    { kind: 'burst', name: 'front', recipe: recipe([LOAM, SHADE, PALE], { ...MASS, speed: 0.7, drag: 1.3, life: 2.4, vz: 0.6, zg: 0.9, mass: 0.9, size: 0.44, sizeCurve: curveOf([0, 0.8, 0.3, 1.1, 0.7, 1.15, 1, 0.85]) }),
      count: 10, tier: 'body', arrange: 'rim', radius: 0.22, outward: 0.6 },
    { kind: 'burst', name: 'grit', recipe: recipe([LOAM, SHADE], { ...CLOD, speed: 0.6, vz: 1.6, size: 0.065, life: 2.6, markLife: 5 }), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'heart', recipe: recipe([SHADE, LOAM], { ...PLUME, speed: 0.3, vz: 0.8, zg: 0.9, mass: 0.7, life: 2.4, size: 0.42 }),
      count: 6, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'emit', name: 'cloud', arrange: 'disc', radius: 0.35, rate: 26, dur: 2.2, attack: 0.1, release: 0.7, tier: 'body', pops: BILLOW_POPS },
    { kind: 'burst', name: 'creepers', recipe: recipe([PALE, LOAM], { ...CREEPER, speed: 0.45, mass: 0.8, life: 2.2, size: 0.38 }),
      count: 10, tier: 'body', arrange: 'disc', radius: 0.3, at: 0.3 },
    { kind: 'burst', name: 'creepers again', recipe: recipe([PALE, HAZE], { ...CREEPER, speed: 0.3, mass: 0.8, life: 2.0, size: 0.36 }),
      count: 8, tier: 'body', arrange: 'disc', radius: 0.35, at: 0.9 },
    { kind: 'emit', name: 'sift', arrange: 'disc', radius: 0.5, at: 0.7, rate: 14, dur: 2.0, attack: 0.2, release: 0.6, tier: 'fine',
      pops: [{ colors: [SAND, PALE], opts: { ...SIFT, mass: 0.6, z: 0.45 } }] },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.6, at: 1.2, rate: 15, dur: 1.9, attack: 0.3, release: 0.7, tier: 'body',
      pops: [{ colors: [PALE, HAZE], opts: { ...VEIL, mass: 0.5, size: 0.42 } }] },
  ],
};

/** The furrow's clods: thrown UP off the line, tumbling, landing beside it. */
const TEAR: BurstOpts = {
  ...CLOD, speed: 0.55, speedVar: 0.5, vz: 2.2, zg: 8, life: 2.6, size: 0.07, bounce: 0.38, markLife: 7,
};

/** The furrow's own low burst: a mass torn up along the line. */
const RIP: BurstOpts = {
  ...MASS, speed: 0.45, speedVar: 0.5, drag: 2.0, vz: 0.7, zg: 1.6, life: 1.4, size: 0.38, mass: 0.3,
  sizeCurve: curveOf([0, 0.75, 0.25, 1.05, 0.6, 1.15, 1, 0.85]),
};

/**
 * dust.gouge — a furrow torn along a path to params.x2/y2: the heavy
 * swing's wake, the lodged edge's grit. Clods thrown up along the line
 * on staggered beats, settled clods left along the furrow, a dust wake
 * standing over it after.
 */
export const dustGouge: EffectDef = {
  id: 'dust.gouge',
  name: 'Dust — gouge',
  story: 'the furrow tears along the line in beats: clods thrown up and tumbling to lie beside it, a low mass ripped up along the path, fines skittering, then a dust wake standing over the furrow and settling',
  layers: [
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 1.2, strength: -1.4, dur: 0.5, attack: 0.02, release: 0.3 } },
    { kind: 'emit', name: 'tear 1', arrange: 'path', toFar: true, rate: 44, dur: 0.12, attack: 0, release: 0.04, tier: 'hero',
      pops: [{ colors: [LOAM, SHADE], opts: TEAR, weight: 1, tier: 'hero' }] },
    { kind: 'emit', name: 'tear 2', arrange: 'path', toFar: true, rate: 44, dur: 0.12, attack: 0, release: 0.04, tier: 'hero', at: 0.1,
      pops: [{ colors: [LOAM, SHADE], opts: TEAR, weight: 1, tier: 'hero' }] },
    { kind: 'emit', name: 'tear 3', arrange: 'path', toFar: true, rate: 36, dur: 0.12, attack: 0, release: 0.04, tier: 'hero', at: 0.2,
      pops: [{ colors: [SHADE, DEEP], opts: { ...TEAR, size: 0.06 }, weight: 1, tier: 'hero' }] },
    { kind: 'emit', name: 'rip', arrange: 'path', toFar: true, rate: 130, dur: 0.24, attack: 0, release: 0.08, tier: 'body',
      pops: [
        { colors: [LOAM, SHADE, PALE], opts: RIP, weight: 2 },
        { colors: [SAND, PALE], opts: { ...FINE, speed: 0.8, vz: 1.8, life: 1.7 }, weight: 1.6, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'rip again', arrange: 'path', toFar: true, rate: 70, dur: 0.2, attack: 0, release: 0.08, tier: 'body', at: 0.14,
      pops: [
        { colors: [PALE, LOAM], opts: { ...RIP, size: 0.34, vz: 0.5 }, weight: 2 },
        { colors: [SAND, HAZE], opts: { ...HANG, speed: 0.3, vz: 0.9 }, weight: 1.2, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'wake', arrange: 'path', toFar: true, rate: 28, dur: 1.5, attack: 0.15, release: 0.6, tier: 'body', at: 0.4,
      pops: [
        { colors: [PALE, HAZE], opts: { ...VEIL, size: 0.34, life: 2.2 }, weight: 2 },
        { colors: [SAND, PALE], opts: SIFT, weight: 1, tier: 'fine' },
      ] },
    { kind: 'glow', name: 'ground light', r: 0.9, rgb: DUST_GLOW, a: 0.08, dur: 0.3, attack: 0.02, release: 0.25 },
  ],
};

export const DUST_EFFECTS: EffectDef[] = [dustSlam, dustKick, dustBillow, dustGouge];
