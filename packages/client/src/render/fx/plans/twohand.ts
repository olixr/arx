/**
 * TWOHAND — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
 * library; roster-only effects live in TWOHAND_EFFECTS and register
 * through the library index.
 *
 * THE SCHOOL OF WEIGHT AND AFTERMATH. Everything here is thrown,
 * dropped, or split — so the school speaks DUST above all (its home
 * material: the great landings are dust.slam at rising weights, the
 * furrows are dust.gouge), BLOOD where an edge bites, and its own iron
 * where the library has no word for it:
 *
 *   twohand.swath      the sweep's wake — the MOWN LINE: dust and chips
 *                      thrown down the aim in a wide flat fan, settling
 *                      as a skirt of flecks where the front rank stood
 *   twohand.fissure    the ground splits along the aim in beats — tear
 *                      clods walking out station by station, the shelf
 *                      subsiding, a dust seep breathing from the mouth
 *   twohand.stonefall  stones REMEMBER the ground: slabs and shards fall
 *                      from true height onto the disc, each landing in
 *                      its own puff, then the slam ring and plume when
 *                      the mass arrives, a veil after
 *   twohand.forge      a forge LIT, not a fire burning: the iron ring at
 *                      the boots, anvil-sparks popping on their own
 *                      clocks, embers climbing, a coal bed that chars
 *
 * Every cue below is sized to the wire it answers: a jab is 0.55, a
 * full sweep 1.3–1.6, the county coming down 2.0. Arcs anchor at the
 * caster and aim down `dir`; ground smashes at the mark; leaps speak
 * twice (dash then blast — see the engine note at the foot).
 */

import { curveOf, rampOf } from '../curves.js';
import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef, Layer } from '../effects.js';
import { recipe } from '../effects.js';
import { defineRecipe, type BurstOpts } from '../../particles.js';
import { SAND, PALE, LOAM, SHADE, DEEP, DUST_GLOW, RAMP_MASS, RAMP_CLOD, RAMP_FINE, RAMP_VEIL } from '../library/dust.js';
import { HEART, BRIGHT, FLAME, EMBER, COAL, DEEP as FIRE_DEEP, SOOT, FIRE_GLOW, RAMP_EMBER, RAMP_COAL } from '../library/fire.js';

// ---------------------------------------------------------------------------
// Shared matter — dust's own laws (ONE-VOICE with library/dust.ts)
// ---------------------------------------------------------------------------

const HOLD = curveOf('hold');
const SWELL = curveOf('swell');
const BLOOM = curveOf('bloom');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
/** Mass: born at two thirds, swells past full, holds, thins late. */
const MASS_SIZE = curveOf([0, 0.55, 0.25, 1, 0.6, 1.15, 1, 0.85]);
/** Mass alpha: dense fast, a long hold, letting go in the last third. */
const MASS_A = curveOf([0, 0.5, 0.12, 1, 0.66, 0.9, 1, 0]);
/** A settling grain: holds its size, fades only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
/** A kicked breath: born full, swells a touch, thins away. */
const KICK_SIZE = curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]);
const KICK_A = curveOf([0, 0.95, 0.5, 0.8, 1, 0]);
/** The veil's alpha: born thin, thickens, stands, lets go. */
const VEIL_A = curveOf([0, 0.2, 0.3, 0.55, 0.65, 0.5, 1, 0]);
/** Chips: turf and stone shorn off, pale in flight, dulling where they lie. */
const RAMP_CHIP = rampOf({ stops: [SAND, PALE, SHADE, DEEP], at: [0, 0.35, 0.7, 0.92], steps: 5 });

/** The pressure ring, flat on the floor. */
const SHOCKFRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: ['#e2c384', PALE, LOAM], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.7, 0.5, 2.6, 1, 3.3]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** Flat slivers racing out along the floor. */
const SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.3, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 4.8, layer: 'ground',
  ramp: rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.45, 0.8] }), alphaCurve: FADE_LATE,
};

/** A thrown mass: low, settling as it stalls. */
const MASS: BurstOpts = {
  shape: 'blob', speed: 1.1, speedVar: 0.4, life: 1.5, lifeVar: 0.3,
  size: 0.42, sizeVar: 0.25, gravity: 0, drag: 2.2,
  z: 0.06, vz: 0.5, zg: 1.2, mass: 0.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: MASS_SIZE, alphaCurve: MASS_A,
  wave: 'noise', waveHz: 1.6, waveAmp: 0.3, spin: 0.35,
};

/** The plume over a strike point: lofted, swelling, sifting down. */
const PLUME: BurstOpts = {
  shape: 'blob', speed: 0.45, speedVar: 0.5, life: 1.9, lifeVar: 0.3,
  size: 0.44, sizeVar: 0.25, gravity: 0, drag: 1.4,
  z: 0.1, vz: 1.0, zg: 1.3, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, PALE, '#c9a978', SAND], at: [0, 0.32, 0.66, 1], steps: 6 }),
  sizeCurve: SWELL, alphaCurve: curveOf('smoke'),
  wave: 'noise', waveHz: 1.2, waveAmp: 0.35, spin: 0.5,
};

/** Clod heroes: thrown, tumbling, bouncing, lying, FLECKING the dirt. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.2, speedVar: 0.5, life: 2.8, lifeVar: 0.3,
  size: 0.075, sizeVar: 0.3, gravity: 0, spin: 9,
  vz: 2.7, zg: 8, land: 'bounce', bounce: 0.42, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  mark: 'fleck', markLife: 7,
};

/** The rain of earth: thrown high, falling fast, lying where it lands. */
const FINE: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 2.0, lifeVar: 0.35,
  size: 0.042, sizeVar: 0.3, gravity: 0, drag: 0.4,
  vz: 2.4, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Fines that hang in the air and sift down slow. */
const HANG: BurstOpts = {
  shape: 'mote', speed: 0.45, speedVar: 0.6, life: 2.0, lifeVar: 0.35,
  size: 0.05, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.15, vz: 1.0, zg: 1.6, mass: 0.8, land: 'settle', layer: 'world', shadow: 0,
  jitter: 2.2, ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The veil: thin pale haze standing after, settling. */
const VEIL: BurstOpts = {
  shape: 'blob', speed: 0.1, speedVar: 0.5, life: 2.6, lifeVar: 0.3,
  size: 0.38, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.05, vz: 0.22, zg: 0.3, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_VEIL, sizeCurve: SWELL, alphaCurve: VEIL_A,
  wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

/** The sift: fines dropping out of a standing cloud. */
const SIFT: BurstOpts = {
  ...FINE, shape: 'mote', speed: 0.2, size: 0.04, vz: 0, z: 0.5, zg: 2.2, life: 1.6, drag: 0.8,
  alphaCurve: FADE_LATE,
};

const VEIL_POPS = [
  { colors: [PALE, '#c9a978'], opts: VEIL, weight: 2 },
  { colors: [SAND, PALE], opts: SIFT, weight: 1.2, tier: 'fine' as const },
];

// ---------------------------------------------------------------------------
// twohand.swath — THE MOWN LINE
// ---------------------------------------------------------------------------

/** The pressed skirt: fat ground streaks racing out the arc's whole reach. */
const SWATH_SKIRT: BurstOpts = {
  ...SKIRT, speed: 6.0, speedVar: 0.35, drag: 3.2, life: 0.6, lifeVar: 0.2, size: 0.075,
};

/** The wake's mass: shoved down the aim fast and low, stalling at the arc's reach. */
const SWATH_MASS: BurstOpts = {
  ...MASS, speed: 4.2, speedVar: 0.35, drag: 2.3, life: 1.4, size: 0.4, vz: 0.35, zg: 1.3, mass: 0.5,
};

/** Chips shorn off the front rank: shards on true height that bounce and lie. */
const SWATH_CHIP: BurstOpts = {
  ...CLOD, speed: 3.0, speedVar: 0.4, life: 2.4, size: 0.07, spin: 11, vz: 1.6, bounce: 0.4,
  ramp: RAMP_CHIP, markLife: 6,
};

/** The wake's grit — thrown along the aim, lying in a scatter at the reach. */
const SWATH_GRIT: BurstOpts = {
  ...FINE, speed: 3.4, speedVar: 0.55, life: 1.8, vz: 1.4, drag: 0.4,
};

/** The second breath: pale puffs rolling on past the front. */
const SWATH_VEIL: BurstOpts = {
  ...VEIL, speed: 1.6, speedVar: 0.5, life: 2.0, size: 0.34, drag: 1.4, vz: 0.25, zg: 0.4,
};

/**
 * twohand.swath — a great sweep's wake, aimed along params.dir: the
 * arc's whole width (a wide flat fan) of pressed dust and shorn chips
 * thrown down the aim, hanging fines that sift back, a pale second
 * breath rolling on, and a skirt of flecks where the front rank stood.
 */
export const twohandSwath: EffectDef = {
  id: 'twohand.swath',
  name: 'Twohand — swath',
  story: 'the edge passes → a wide flat fan of pressed dust races down the aim, chips shorn off the front rank fly on true height and bounce → grit rains and lies in a scatter → a pale second breath rolls on and hanging fines sift back → the mown line keeps its flecks',
  layers: [
    { kind: 'field', name: 'the shove', field: { kind: 'wind', radius: 2.4, strength: 0.7, dur: 0.45, attack: 0.02, release: 0.2 }, aimed: true, along: 1.0 },
    { kind: 'burst', name: 'pressed skirt', recipe: recipe([SAND, PALE], SWATH_SKIRT), count: 20, tier: 'fine', arrange: 'cone', spread: 2.4, along: 0.3 },
    { kind: 'burst', name: 'mown mass', recipe: recipe([LOAM, SHADE, PALE], SWATH_MASS), count: 18, tier: 'body', arrange: 'cone', spread: 2.2, along: 0.35 },
    { kind: 'burst', name: 'chips', recipe: recipe([SAND, PALE, SHADE], SWATH_CHIP), count: 6, tier: 'hero', arrange: 'cone', spread: 2.0, along: 0.4 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, '#e2c384', PALE], SWATH_GRIT), count: 14, tier: 'fine', arrange: 'cone', spread: 2.4, along: 0.3 },
    { kind: 'burst', name: 'second breath', recipe: recipe([PALE, '#c9a978'], SWATH_VEIL), count: 7, tier: 'body', arrange: 'cone', spread: 2.3, along: 0.9, at: 0.1 },
    { kind: 'emit', name: 'hang', arrange: 'cone', aimed: true, spread: 2.2, along: 0.9, at: 0.12, rate: 30, dur: 0.45, attack: 0.02, release: 0.15, tier: 'fine',
      pops: [{ colors: [SAND, PALE], opts: { ...HANG, speed: 1.4 }, tier: 'fine' }] },
    { kind: 'glow', name: 'ground light', r: 1.3, rgb: DUST_GLOW, a: 0.08, dur: 0.35, attack: 0.02, release: 0.25, along: 1.2 },
  ],
};

// ---------------------------------------------------------------------------
// twohand.fissure — THE GROUND PICKS A SIDE
// ---------------------------------------------------------------------------

/** The crack's clods: thrown UP off the line, tumbling, landing beside it. */
const TEAR: BurstOpts = {
  ...CLOD, speed: 0.35, speedVar: 0.5, vz: 2.2, zg: 8, life: 2.6, size: 0.07, bounce: 0.3, markLife: 7,
};

/** The crack's own low burst: a mass torn up along the line, holding the line. */
const RIP: BurstOpts = {
  ...MASS, speed: 0.3, speedVar: 0.5, drag: 2.4, vz: 0.6, zg: 1.6, life: 1.7, size: 0.4, mass: 0.2,
  sizeCurve: curveOf([0, 0.75, 0.25, 1.05, 0.65, 1.15, 1, 0.85]),
};

/** Fines thrown up out of the crack. */
const SPIT: BurstOpts = { ...FINE, speed: 0.8, vz: 1.8, life: 1.7 };

/** The shelf that drops a step: heavier slabs thrown low, lying, marking. */
const SLAB: BurstOpts = {
  ...CLOD, shape: 'square', align: true, size: 0.1, sizeVar: 0.25, speed: 0.5, speedVar: 0.4,
  vz: 1.3, spin: 5, bounce: 0.3, life: 3.0, markLife: 8,
};

/** One station of the crack: its tear, its rip, its fines — `along` the aim, on its beat. */
function fissureStation(i: number): Layer[] {
  const along = 0.35 + i * 0.45;
  const at = i * 0.07;
  const n = i + 1;
  return [
    { kind: 'burst', name: `tear ${n}`, recipe: recipe([LOAM, SHADE], TEAR), count: 4, tier: 'hero', along, at },
    { kind: 'burst', name: `rip ${n}`, recipe: recipe([LOAM, SHADE, PALE], RIP), count: 3, tier: 'body', along, at },
    { kind: 'burst', name: `fines ${n}`, recipe: recipe([SAND, PALE], SPIT), count: 5, tier: 'fine', along, at },
  ];
}

/**
 * twohand.fissure — the ground splits along params.dir from the cast
 * point: four stations walk out on beats, each throwing clods and a
 * torn mass off the line; the near and far shelf drop a step (slabs
 * thrown low, lying where they stop); a dust seep breathes from the
 * mouth after; the clods and their flecks stay along the crack.
 */
export const twohandFissure: EffectDef = {
  id: 'twohand.fissure',
  name: 'Twohand — fissure',
  story: 'the crack walks out along the aim in four beats → at every station clods are thrown up off the line and a torn mass rips up → the near and far shelves drop a step, slabs lying where they stop → a dust seep breathes from the mouth → the crack keeps its clods and flecks',
  layers: [
    { kind: 'field', name: 'the split', field: { kind: 'attract', radius: 1.3, strength: -1.2, dur: 0.45, attack: 0.02, release: 0.25 }, along: 0.9 },
    ...fissureStation(0),
    ...fissureStation(1),
    ...fissureStation(2),
    ...fissureStation(3),
    { kind: 'burst', name: 'near shelf', recipe: recipe([SHADE, DEEP], SLAB), count: 3, tier: 'hero', along: 0.6, at: 0.3 },
    { kind: 'burst', name: 'far shelf', recipe: recipe([SHADE, DEEP], SLAB), count: 3, tier: 'hero', along: 1.45, at: 0.38 },
    { kind: 'emit', name: 'seep', arrange: 'disc', radius: 0.35, along: 1.0, at: 0.4, rate: 16, dur: 1.6, attack: 0.15, release: 0.6, tier: 'body', pops: VEIL_POPS },
    { kind: 'glow', name: 'ground light', r: 1.1, rgb: DUST_GLOW, a: 0.1, dur: 0.5, attack: 0.02, release: 0.35, along: 0.9 },
  ],
};

// ---------------------------------------------------------------------------
// twohand.stonefall — THE STONES REMEMBER
// ---------------------------------------------------------------------------

/** The puff a stone raises where it lands. */
const LAND_PUFF: BurstOpts = {
  shape: 'blob', speed: 0.8, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.26, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.03, vz: 0.3, zg: 1.0, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: KICK_SIZE, alphaCurve: KICK_A, wave: 'noise', waveHz: 1.4, waveAmp: 0.2,
};
const LAND_PUFF_ID = defineRecipe({ colors: [PALE, LOAM], opts: LAND_PUFF, count: 3, countVar: 1 });
const LAND_PUFF_SMALL_ID = defineRecipe({ colors: [PALE, LOAM], opts: { ...LAND_PUFF, size: 0.2, life: 0.7 }, count: 1 });

/** A slab of the sky: falls from true height, lands, bounces once, lies, marks. */
const BOULDER: BurstOpts = {
  shape: 'square', align: true, speed: 0.15, speedVar: 0.5, life: 3.0, lifeVar: 0.2, size: 0.14, sizeVar: 0.2,
  gravity: 0, spin: 3.5, z: 2.6, vz: -0.6, zg: 9, land: 'bounce', bounce: 0.22, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 8, onLand: LAND_PUFF_ID,
};

/** Lesser stones falling with the slabs. */
const STONE: BurstOpts = {
  ...BOULDER, shape: 'shard', size: 0.085, sizeVar: 0.3, spin: 8, z: 2.4, vz: -0.3, bounce: 0.35, life: 2.8, markLife: 7,
  onLand: LAND_PUFF_SMALL_ID,
};

/** Grit falling behind the stones, lying where it lands. */
const GRIT_RAIN: BurstOpts = {
  ...FINE, speed: 0.2, speedVar: 0.6, life: 2.2, z: 2.2, vz: -0.2, zg: 8, drag: 0,
};

/** The beat the mass reaches the ground (z 2.6 at zg 9). */
const LANDING = 0.68;

/**
 * twohand.stonefall — stones fall from the sky onto the disc: slabs
 * and shards on true height, each raising a puff where it lands, grit
 * raining after; when the mass arrives the ground answers with the
 * slam ring, wavefront and plume; a second rank lands a beat later; a
 * veil settles; the stones lie where they stopped and keep their flecks.
 */
export const twohandStonefall: EffectDef = {
  id: 'twohand.stonefall',
  name: 'Twohand — stonefall',
  story: 'slabs and shards drop out of the sky onto the disc, grit raining behind them → each lands in its own puff, bounces once and lies → when the mass arrives the ground shocks: ring, wavefront, plume → a second rank lands a beat later → a veil settles and the stones keep their flecks',
  layers: [
    { kind: 'burst', name: 'slabs', recipe: recipe([LOAM, SHADE], BOULDER), count: 5, tier: 'hero', arrange: 'disc', radius: 0.45, radiusK: 0.45 },
    { kind: 'burst', name: 'stones', recipe: recipe([LOAM, SHADE, DEEP], STONE), count: 8, tier: 'hero', arrange: 'disc', radius: 0.65, radiusK: 0.65, at: 0.05 },
    { kind: 'burst', name: 'grit rain', recipe: recipe([SAND, PALE], GRIT_RAIN), count: 16, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.08 },
    { kind: 'burst', name: 'second rank', recipe: recipe([SHADE, DEEP], STONE), count: 4, tier: 'hero', arrange: 'disc', radius: 0.5, radiusK: 0.5, at: 0.3 },
    { kind: 'field', name: 'pressure', field: { kind: 'attract', radius: 1.3, strength: -1.6, dur: 0.4, attack: 0.02, release: 0.22 }, at: LANDING },
    { kind: 'burst', name: 'shockfront', recipe: recipe(['#e2c384', SAND], SHOCKFRONT), count: 1, tier: 'hero', at: LANDING },
    { kind: 'burst', name: 'skirt', recipe: recipe([SAND, PALE], SKIRT), count: 12, tier: 'fine', arrange: 'rim', radius: 0.12, outward: 3.2, at: LANDING },
    { kind: 'burst', name: 'wavefront', recipe: recipe([LOAM, SHADE, PALE], MASS), count: 12, tier: 'body', arrange: 'rim', radius: 0.2, outward: 1.0, at: LANDING + 0.02 },
    { kind: 'burst', name: 'plume', recipe: recipe([LOAM, PALE], PLUME), count: 8, tier: 'body', arrange: 'disc', radius: 0.2, at: LANDING + 0.02 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.55, radiusK: 0.55, at: LANDING + 0.3, rate: 12, dur: 1.6, attack: 0.15, release: 0.6, tier: 'body', pops: VEIL_POPS },
    { kind: 'glow', name: 'ground light', r: 1.3, rgb: DUST_GLOW, a: 0.11, dur: 0.4, attack: 0.02, release: 0.3, at: LANDING },
  ],
};

// ---------------------------------------------------------------------------
// twohand.forge — THE STANDING FORGE
// ---------------------------------------------------------------------------

/** The iron annulus at the boots: dark iron, standing the whole working. */
const IRON_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.0, lifeVar: 0.05, size: 0.62, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.16, ramp: rampOf({ stops: [FIRE_DEEP, SOOT], at: [0, 0.7] }),
  sizeCurve: curveOf([0, 0.7, 0.2, 1.05, 0.7, 1.05, 1, 0.95]), alphaCurve: curveOf([0, 0.9, 0.7, 0.9, 1, 0]),
};

/** The lit inner rim: hot iron that cools ember → coal in bands. */
const FORGE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.8, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.12, ramp: rampOf({ stops: [FLAME, EMBER, COAL, FIRE_DEEP], at: [0, 0.3, 0.65, 0.9], steps: 5 }),
  sizeCurve: curveOf([0, 0.6, 0.25, 1.1, 0.7, 1.08, 1, 0.95]), alphaCurve: curveOf([0, 1, 0.6, 0.85, 1, 0]),
};

/** Anvil sparks: hot glints thrown up off the ring, bouncing, charring a dot. */
const ANVIL_SPARK: BurstOpts = {
  shape: 'glint', speed: 1.4, speedVar: 0.5, life: 0.7, lifeVar: 0.35, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.1, vz: 2.6, zg: 7.5, land: 'bounce', bounce: 0.35, layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_EMBER, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 2.5,
};

/** Embers climbing the column on the chimney's lift. */
const EMBER_CLIMB: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.6, life: 1.2, lifeVar: 0.35, size: 0.05, sizeVar: 0.3, gravity: 0,
  drag: 1.0, z: 0.1, vz: 0.9, zg: -0.4, mass: 1.2, layer: 'world', shadow: 0, flicker: 0.5, jitter: 1.6,
  ramp: RAMP_EMBER, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The coal bed under the ring: squares that glow and char the dirt. */
const COAL_BED: BurstOpts = {
  shape: 'square', speed: 0.1, life: 1.4, lifeVar: 0.3, size: 0.075, sizeVar: 0.3, gravity: 0,
  layer: 'ground', flicker: 0.7, ramp: RAMP_COAL, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 4,
};

/** The mirage over the shoulders: pale glints breathing at head height. */
const HEAT_SHIMMER: BurstOpts = {
  shape: 'glint', speed: 0.15, life: 0.5, lifeVar: 0.3, size: 0.06, gravity: 0,
  z: 0.8, vz: 0.7, zg: 0, layer: 'world', shadow: 0, flicker: 0.8,
  ramp: rampOf({ stops: [HEART, BRIGHT, FLAME], at: [0, 0.5, 0.85] }), sizeCurve: BLOOM, alphaCurve: FADE_OUT,
};

/**
 * twohand.forge — a forge lit on a body: the iron ring at the boots, a
 * coal bed under it charring the dirt, anvil-sparks popping off the
 * ring on their own clocks, embers climbing the column on the chimney's
 * lift, a mirage shiver over the shoulders, and a warm light.
 */
export const twohandForge: EffectDef = {
  id: 'twohand.forge',
  name: 'Twohand — forge',
  story: 'the forge ring lights at the boots over a coal bed → anvil-sparks pop off the ring and bounce, charring dots → embers climb the column on the chimney → the air over the shoulders shivers → the ring re-lights once and the working settles to a coal-glow',
  layers: [
    { kind: 'field', name: 'chimney', field: { kind: 'lift', radius: 0.8, strength: 2.2, dur: 1.0, height: 1.8, attack: 0.03, release: 0.3 } },
    { kind: 'burst', name: 'iron ring', recipe: recipe([FIRE_DEEP, SOOT], IRON_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'lit rim', recipe: recipe([FLAME, EMBER], FORGE_RING), count: 1, tier: 'hero', at: 0.03 },
    { kind: 'burst', name: 'coal bed', recipe: recipe([EMBER, COAL], COAL_BED), count: 6, tier: 'hero', arrange: 'ring', radius: 0.32 },
    { kind: 'burst', name: 'first sparks', recipe: recipe([BRIGHT, FLAME], ANVIL_SPARK), count: 10, tier: 'fine', arrange: 'ring', radius: 0.3 },
    { kind: 'emit', name: 'anvil sparks', arrange: 'ring', radius: 0.3, rate: 26, dur: 0.6, attack: 0.02, release: 0.2, tier: 'fine',
      pops: [{ colors: [BRIGHT, FLAME, EMBER], opts: ANVIL_SPARK, tier: 'fine' }] },
    { kind: 'burst', name: 'ember climb', recipe: recipe([FLAME, EMBER], EMBER_CLIMB), count: 12, tier: 'fine', arrange: 'disc', radius: 0.25, dz: 0.1 },
    { kind: 'emit', name: 'mirage', arrange: 'disc', radius: 0.22, dz: 0.7, rate: 14, dur: 0.7, attack: 0.05, release: 0.25, tier: 'fine',
      pops: [{ colors: [HEART, BRIGHT], opts: HEAT_SHIMMER, tier: 'fine' }] },
    { kind: 'burst', name: 'rim re-lights', recipe: recipe([FLAME, EMBER], { ...FORGE_RING, size: 0.4, life: 0.5 }), count: 1, tier: 'hero', at: 0.35 },
    { kind: 'glow', name: 'forge light', r: 1.0, rgb: FIRE_GLOW, a: 0.22, dur: 0.85, attack: 0.03, release: 0.4, flicker: 0.45 },
  ],
};

export const TWOHAND_EFFECTS: EffectDef[] = [twohandSwath, twohandFissure, twohandStonefall, twohandForge];

// ---------------------------------------------------------------------------
// The plans — one per ability, reasoned from its mechanic and its story
// ---------------------------------------------------------------------------

/** Flight times (dashTiles / leap speed 14), where a landing must wait for the body. */
const SKYSUNDER_FLIGHT = 0.75;
const HORIZON_FLIGHT = 0.9;
const FORGEFALL_FLIGHT = 0.65;
const BREAKER_FLIGHT = 0.65;

export const TWOHAND_PLANS: Record<string, AbilityPlan> = {
  // ------------------------------------------------ the great school
  // Wide Swath (arc 2.4 rad, range 2.8): one level stroke — the widest mown line, and the front rank bleeds where it stopped being a rank.
  wide_swath: { cues: [
    { id: 'twohand.swath', scale: 1.5 },
    { id: 'blood.hit', scale: 0.7, at: 0.08 },
  ] },
  // Haft Check (arc 1.1, range 1.7, knockback 2.4): the butt-cap's rude period — a short shove of pressed dust, nothing more; restraint IS the signature.
  haft_check: { cues: [
    { id: 'twohand.swath', scale: 0.55 },
  ] },
  // Iron Pendulum (flurry ×2 → an arc per beat): tick and tock — each swing its own wake and its own cut, the second answering the first.
  iron_pendulum: { cues: [
    { id: 'twohand.swath', scale: 0.9 },
    { id: 'blood.hit', scale: 0.5, at: 0.06 },
  ] },
  // Fault Line (blast r2.0, chill): the edge comes down (a slam) and the ground picks a side (the fissure walks out along the aim); the chill seeps from the crack late.
  fault_line: { cues: [
    { id: 'dust.slam', scale: 0.9 },
    { id: 'twohand.fissure', scale: 1.3, at: 0.05 },
    { id: 'frost.fog', scale: 0.45, at: 0.6 },
  ] },
  // Colossus Stance (buff, 0.75 s wire): a forge LIT, not burning — the iron ring and anvil-sparks, and one wisp of smoke off the working.
  colossus_stance: { cues: [
    { id: 'twohand.forge', scale: 0.9 },
    { id: 'smoke.wisp', scale: 0.5, at: 0.2 },
  ] },
  // Skysunder (leap 10 tiles → dash + blast r2.2): the push-off at the launch, the verdict at the landing mark when the body arrives.
  skysunder: { cues: [
    { id: 'dust.kick', scale: 1.3 },
    { id: 'dust.slam', scale: 1.7, atFar: true, at: SKYSUNDER_FLIGHT },
  ] },
  // Executioner's Arc (arc 1.5, execute): the low lantern — the cut is the whole voice, the droplets fall dark and dry into a pool; the dust barely stirs.
  executioners_arc: { cues: [
    { id: 'blood.hit', scale: 1.3 },
    { id: 'twohand.swath', scale: 0.5 },
    { id: 'blood.pool', scale: 0.5, at: 0.45 },
  ] },
  // Avalanche (flurry ×3 → an arc per beat): three stones down the hill — each beat drops its own boulder into the arc's wake.
  avalanche: { cues: [
    { id: 'twohand.swath', scale: 0.6 },
    { id: 'twohand.stonefall', scale: 0.85 },
  ] },
  // Breaker Charge (charge 8.4 tiles → dash, + blast when locked): the plow line torn the length of the road, the wedge arriving in a burst at the far end.
  breaker_charge: { cues: [
    { id: 'dust.gouge', scale: 1.2 },
    { id: 'dust.slam', scale: 0.9, atFar: true, at: BREAKER_FLIGHT },
  ] },
  // Titan's Verdict (pulse_nova ×3 → a blast per ring, r2.6): every pulse a spoken ring — the earth agreeing in courses that roll out as a bank.
  titans_verdict: { cues: [
    { id: 'dust.slam', scale: 1.25 },
    { id: 'dust.billow', scale: 0.5, at: 0.3 },
  ] },
  // Colossus Arc (arc 2.6, range 2.9): the full turn — the sweep's wake down the aim, and the turn's own ring-out all around the hub a beat later.
  colossus_arc: { cues: [
    { id: 'twohand.swath', scale: 1.2 },
    { id: 'dust.slam', scale: 0.7, at: 0.2 },
  ] },
  // Quakefall (blast r2.3, knockback 2.0): the county comes down — the school's heaviest stamp, fissures walking out of the print, a slow dust bank that settles.
  quakefall: { cues: [
    { id: 'dust.slam', scale: 2.0 },
    { id: 'twohand.fissure', scale: 0.9, at: 0.1 },
    { id: 'dust.billow', scale: 0.9, at: 0.4 },
  ] },
  // Giantsfall (arc 0.7 narrow, dmg 15): the felling stroke buries down the aim — a cleft that parts along the line, and the tall bleed as they come down.
  giantsfall: { cues: [
    { id: 'twohand.fissure', scale: 0.9 },
    { id: 'blood.hit', scale: 1.1, at: 0.05 },
  ] },
  // Whirling Ruin (held arc ×6 beats, full turn, light cuts): the steel weather — each beat one scoured ring of dust off the hub; the calm is the paint.
  whirling_ruin: { cues: [
    { id: 'dust.slam', scale: 0.55 },
  ] },
  // Hewer's Wheel (arc 3.1, bleed): the round — the axe's rougher wake all the way around, and what stood in it bleeds in lengths.
  hewers_wheel: { cues: [
    { id: 'twohand.swath', scale: 1.3 },
    { id: 'blood.hit', scale: 0.75, at: 0.1 },
  ] },
  // Reaver's Due (arc 2.2, knockback 2.6): the toll arm — a flat shove of a sweep, then coin-bright glints thrown after it (gold shards that die with a glint where they land).
  reavers_due: { cues: [
    { id: 'twohand.swath', scale: 1.0 },
    { id: 'arcane.shatter', scale: 0.4, at: 0.25 },
  ] },
  // Mournfield (field r2.3, 6 s, chill): the plot — grave-quiet; a cold fog breathes on the border for the whole stand, pale wisps rise out of it and hang. Nothing bursts.
  mournfield: { cues: [
    { id: 'frost.fog', scale: 1.0, every: 2.0 },
    { id: 'shadow.wisps', scale: 0.7, at: 0.3, every: 3.0 },
  ] },
  // Ash Harvest (arc 2.4, burn): the ember row — the reap's wake, then fire down the same aim whose coals land and stand where the band passed.
  ash_harvest: { cues: [
    { id: 'twohand.swath', scale: 1.0 },
    { id: 'fire.fan', scale: 0.7, at: 0.12 },
  ] },
  // Glacier Sunder (blast r2.2, chill): the shelf calves — the cold detonation (white crack, shards, rime) and the slab's WEIGHT on the ground on the same beat.
  glacier_sunder: { cues: [
    { id: 'frost.nova', scale: 1.3 },
    { id: 'dust.slam', scale: 0.7, at: 0.24 },
  ] },
  // The Crown's Word (pulse_nova ×2 → a blast per pulse, r2.4): spoken twice — each pulse a gold ring cresting in upward sparks, and the word shoving the earth under it.
  crowns_word: { cues: [
    { id: 'arcane.shatter', scale: 0.85 },
    { id: 'dust.slam', scale: 0.5, at: 0.05 },
  ] },
  // Last Argument (arc 2.8, range 3.1, dmg 15): the closing line — the widest wake the school draws, the cut, and the full stop: one bright cross-flash at the end.
  last_argument: { cues: [
    { id: 'twohand.swath', scale: 1.6 },
    { id: 'blood.hit', scale: 0.8, at: 0.05 },
    { id: 'arcane.shatter', scale: 0.8, at: 0.12 },
  ] },
  // Barrow Bite (arc 2.0, bleed ×2): the closed jaws — the bite, then the wound pulsing (bleed power 2), dry bone chips falling out of it.
  barrow_bite: { cues: [
    { id: 'blood.hit', scale: 1.2 },
    { id: 'twohand.swath', scale: 0.45 },
    { id: 'blood.spray', scale: 0.6, at: 0.2 },
  ] },
  // Thunderfell (blast r2.1, shock): the argument overhead — the bolt snaps down at 0.24, the stones arrive at 0.75 while its afterglow is still deciding, the fell's shock ring between.
  thunder_fell: { cues: [
    { id: 'storm.strike', scale: 1.2 },
    { id: 'twohand.stonefall', scale: 0.9, at: 0.05 },
    { id: 'dust.slam', scale: 0.9, at: 0.3 },
  ] },
  // White Heat (buff, burn on hit): the lit forge — hotter than the colossus's: the forge and a steady rise of embers off the body.
  white_heat: { cues: [
    { id: 'twohand.forge', scale: 1.15 },
    { id: 'fire.plume', scale: 0.35, at: 0.1 },
  ] },
  // Pale Crescent (arc 2.5, chill): the ebb — the quietest stroke: a breath of cold down the aim, and frost that HANGS where it passed. No dust.
  pale_crescent: { cues: [
    { id: 'frost.breath', scale: 0.8 },
    { id: 'frost.fog', scale: 0.5, at: 0.5 },
  ] },
  // Horizon Fall (leap 12 tiles → dash + blast r2.4): the brought mountain — the heaviest landing in the file, stones raining a beat after it, the bank standing then lying down.
  horizon_fall: { cues: [
    { id: 'dust.kick', scale: 1.4 },
    { id: 'dust.slam', scale: 2.0, atFar: true, at: HORIZON_FLIGHT },
    { id: 'twohand.stonefall', scale: 1.0, atFar: true, at: HORIZON_FLIGHT + 0.05 },
    { id: 'dust.billow', scale: 0.9, atFar: true, at: HORIZON_FLIGHT + 0.5 },
  ] },
  // The Road Opens (arc 2.3, knockback 3.2): the bar comes down — the shove is the point (the widest push in the wake) over the stamp of the bar hitting the ground.
  road_opens: { cues: [
    { id: 'twohand.swath', scale: 1.35 },
    { id: 'dust.slam', scale: 0.6, at: 0.05 },
  ] },
  // Marsh Light (field r2.2, 5.5 s, venom): the light that collects — fen murk stands on the plot, and motes are DRAWN inward to the lantern on every re-speak.
  marsh_light: { cues: [
    { id: 'venom.cloud', scale: 0.75, every: 2.6 },
    { id: 'arcane.bloom', scale: 0.55, at: 0.3, every: 2.6 },
  ] },
  // Riftfall (blast r2.3, dmg 15): the sky behind the sky — the ward shatters (stars fly and settle where they land), the dark arrives, and the edge lands with weight.
  riftfall: { cues: [
    { id: 'arcane.shatter', scale: 1.2 },
    { id: 'shadow.burst', scale: 0.9, at: 0.05 },
    { id: 'dust.slam', scale: 0.9, at: 0.1 },
  ] },
  // Winter's Hunger (buff, bleed on hit): the empty walk — no burst: blood drawn toward the walker, winter's cold at the feet.
  winters_hunger: { cues: [
    { id: 'blood.drink', scale: 0.75 },
    { id: 'frost.fog', scale: 0.45, at: 0.1 },
  ] },
  // Open Seam (field r2.1, 5 s, pulses 0.8 s): the seam keeps giving — the crack re-opens on every other beat and flashes gold, the floor jumping a stone or two.
  open_seam: { cues: [
    { id: 'twohand.fissure', scale: 0.9, every: 1.6 },
    { id: 'arcane.shatter', scale: 0.5, at: 0.2, every: 1.6 },
  ] },
  // Last Toll (pulse_nova ×3 → a blast per ring, r2.5, shock): the county answers — each ring of the bell a white flash and racing arcs, the ground answering under it.
  last_toll: { cues: [
    { id: 'storm.nova', scale: 1.0 },
    { id: 'dust.slam', scale: 0.45, at: 0.1 },
  ] },

  // ------------------------------------------- the second breath
  // Fell Timber (arc 1.3, cast 1 s): the down tree — the trunk comes down the whole chord: the long argument of dust down the aim, its landing line tearing the ground.
  fell_timber: { cues: [
    { id: 'twohand.swath', scale: 1.4 },
    { id: 'twohand.fissure', scale: 0.7, at: 0.05 },
  ] },
  // Quarry Work (channel: arc ×3, 0.8 s apart, sunder): the drill line — each beat the pick thuds and the split lengthens along the row, rubble rising beat over beat.
  quarry_work: { cues: [
    { id: 'twohand.fissure', scale: 0.75 },
    { id: 'dust.slam', scale: 0.5, at: 0.05 },
  ] },
  // Forgefall (leap 9 tiles → dash + blast r2.2, burn): the cooling brand — a fire path under the arc, fire and dust at once at the landing, and the brand cooling in the dirt after.
  forgefall: { cues: [
    { id: 'fire.trail', scale: 0.6 },
    { id: 'dust.slam', scale: 1.4, atFar: true, at: FORGEFALL_FLIGHT },
    { id: 'fire.burst', scale: 0.9, atFar: true, at: FORGEFALL_FLIGHT },
    { id: 'fire.floor', scale: 0.6, atFar: true, at: FORGEFALL_FLIGHT + 0.3 },
  ] },
  // The Wheelbreaker (channel: beam ×3, range 7): the ram takes the lane — the corridor torn end to end each beat, the shock answering at the far end where the cart breaks.
  wheelbreaker: { cues: [
    { id: 'dust.gouge', scale: 1.0 },
    { id: 'dust.slam', scale: 0.8, atFar: true, at: 0.35 },
  ] },
  // Gravedigger (blast r2.1, knockback PULLS): the grave that pulls — the dark calls everything in, the thrown earth is dragged back into the plot, and the grave exhales once and closes.
  gravedigger: { cues: [
    { id: 'shadow.grasp', scale: 1.2 },
    { id: 'dust.slam', scale: 0.9, at: 0.1 },
    { id: 'dust.billow', scale: 0.6, at: 1.1 },
  ] },
  // Ore Song (channel: nova ×4, 0.8 s apart): the singing vein — each beat a hammered ring rolls out and gold glints leap, bounce, and keep catching light where they lie.
  ore_song: { cues: [
    { id: 'dust.slam', scale: 0.6 },
    { id: 'arcane.shatter', scale: 0.45, at: 0.05 },
  ] },
  // Skyweight (pulse_nova ×2 → a blast per pulse, r2.4): the stones remember — the raised slabs yanked down all at once into the slam ring, twice.
  skyweight: { cues: [
    { id: 'twohand.stonefall', scale: 1.15 },
  ] },
  // The Long Lever (channel: beam ×4, range 8): the place to stand — the near end presses (dust thrown back at the fulcrum), the bar lies the lane, the far end kicks up a slab.
  long_lever: { cues: [
    { id: 'dust.kick', scale: 0.8 },
    { id: 'dust.gouge', scale: 0.8 },
    { id: 'dust.slam', scale: 0.7, atFar: true, at: 0.3 },
  ] },
  // Sunhammer (arc 1.6, burn): the held noon — the library's fire riding the chord, the wake under it, and one gold flash where the swing refuses to leave.
  sunhammer: { cues: [
    { id: 'fire.fan', scale: 1.05 },
    { id: 'twohand.swath', scale: 0.7, at: 0.05 },
    { id: 'arcane.shatter', scale: 0.5, at: 0.1 },
  ] },
  // World's Rim (channel: blast ×4, 0.8 s apart, r2.3, chill): the passing wheel — shatter at the contact point, the grind's worn grains, fog banking off the line every beat.
  worlds_rim: { cues: [
    { id: 'frost.shards', scale: 0.8 },
    { id: 'dust.slam', scale: 0.5, at: 0.1 },
    { id: 'frost.fog', scale: 0.55, at: 0.4 },
  ] },
};

/*
 * ENGINE NOTE — the two-wire arts. A plan is keyed by ability id and
 * speaks on EVERY fx that id casts. A leap slam casts a `dash` (launch
 * → landing, x2 = the mark) and then a `blast` at the landing; a locked
 * charge does the same. The `atFar` landing cues above are timed to the
 * flight so the dash speaks the true landing as the body arrives — and
 * the blast, whose far anchor is its own point, speaks them again a
 * flight-time later as an echo ("a verdict, then its echo"; "two rings
 * a beat apart"). Honest, but a per-kind filter on EffectCue (`kinds?:
 * string[]`) would let the dash carry the launch and the blast the
 * landing without the echo. See the report.
 */
