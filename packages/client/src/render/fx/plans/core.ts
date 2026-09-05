/**
 * CORE — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in CORE_EFFECTS and register through the
 * library index.
 *
 * THE ROSTER'S OWN MATERIAL: three of the seven founding arts are
 * STEEL — a blade's edge, a spun blade, a hurled edge — and the
 * library owns no steel. Three roster effects say it once so every
 * steel art (here, the melee wave, the sneak wave) inherits it:
 *
 *   core.steel_ring  the halo of edges — slivers racing out low on a
 *                    ring, landing and lying with a nick each, grind
 *                    glints, a dust skirt (nova-shaped)
 *   core.steel_cut   the strobe edge — an aimed lane of slivers, the
 *                    grind-spark star where it bit, hot grains lying
 *                    along the through-lane cooling white → orange →
 *                    black (arc/dash/beam-shaped, `along` the aim)
 *   core.cyclone     the blade inhales — a vortex and a lift wake the
 *                    loose ground into a turning skirt, chips ride the
 *                    spin and are slung wide, a churned ring is laid
 *
 * Every plan carries its one-line rationale. Wire kinds noted per
 * ability are what the server casts with (gameServer's shape switch).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { SAND, PALE, LOAM, SHADE, DEEP as DUST_DEEP } from '../library/dust.js';

// ---------------------------------------------------------------------------
// STEEL — the roster's palette (FX_STYLES' STEEL family: ONE-VOICE)
// ---------------------------------------------------------------------------

export const WHITE = '#ffffff';
export const BRIGHT = '#e8eef8';
export const STEEL = '#b8bec8';
export const DARK = '#5a6068';
export const INK = '#2e3136';
/** The hot end of a bitten edge: white → orange → black. */
const HOT = '#ffd08a';
const ORANGE = '#e8823a';
const COOLED = '#6a3a2a';
const BLACK = '#3a3438';

const STEEL_GLOW = '200, 208, 220';

/** A sliver's life: bright in flight, steel as it lies, dark at rest. */
const RAMP_EDGE = rampOf({ stops: [WHITE, BRIGHT, STEEL, DARK], at: [0, 0.15, 0.55, 0.95], steps: 5 });
/** A grind spark: white, then gone. */
const RAMP_SPARK = rampOf({ stops: [WHITE, BRIGHT, STEEL], at: [0, 0.5, 0.9] });
/** The cooling line: white heat stepping down to soot. */
const RAMP_HOT = rampOf({ stops: [WHITE, HOT, ORANGE, COOLED, BLACK], at: [0, 0.12, 0.35, 0.7, 0.95], steps: 7 });
/** Ground chips: loam darkening as they lie. */
const RAMP_CHIP = rampOf({ stops: [LOAM, SHADE, DUST_DEEP], at: [0, 0.55, 0.9], steps: 4 });
/** Dust fines: bright in the air, dull on the ground. */
const RAMP_FINE = rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.4, 0.9], steps: 4 });
/** The kicked breath of dust. */
const RAMP_DUST = rampOf({ stops: [LOAM, PALE, SAND], at: [0, 0.45, 1], steps: 4 });

const HOLD = curveOf('hold');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SWELL = curveOf('swell');
const SMOKE_A = curveOf('smoke');
/** A lying grain: holds, fades only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.82, 1, 1, 0]);
/** A kicked breath: born full, swells a touch, thins away. */
const BREATH_SIZE = curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]);
const BREATH_A = curveOf([0, 0.95, 0.5, 0.8, 1, 0]);

/** The grind flash — a white blob that flares and collapses. */
const GRIND_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.2, life: 0.2, lifeVar: 0.15, size: 0.3, sizeVar: 0.2, gravity: 0, z: 0.4,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [WHITE, BRIGHT, STEEL], at: [0, 0.5, 0.85] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** An edge: a flat sliver flying low, spinning, landing and LYING with a nick. */
const EDGE: BurstOpts = {
  shape: 'shard', align: true, speed: 3.0, speedVar: 0.18, life: 1.6, lifeVar: 0.3,
  size: 0.1, sizeVar: 0.25, gravity: 0, drag: 1.2, spin: 12,
  z: 0.3, vz: 0.9, zg: 7, land: 'settle', layer: 'world', shadow: 0.5,
  ramp: RAMP_EDGE, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 6,
};

/** Lesser edges: streaks that die where they land. */
const EDGE_FINE: BurstOpts = {
  shape: 'streak', align: true, speed: 3.6, speedVar: 0.5, life: 0.5, lifeVar: 0.3,
  size: 0.06, sizeVar: 0.3, gravity: 0, drag: 1.5,
  z: 0.3, vz: 0.6, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_EDGE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Grind glints: ballistic, flickering, trailing, dead on landing. */
const GRIND: BurstOpts = {
  shape: 'glint', speed: 1.4, speedVar: 0.6, life: 0.42, lifeVar: 0.35, size: 0.055, gravity: 0,
  vz: 2.2, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.6, trail: 5, trailColor: BRIGHT,
  ramp: RAMP_SPARK, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** The pressure ring on the floor — pale steel, gone in a third of a second. */
const PRESSURE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.32, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [WHITE, BRIGHT, STEEL], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.5, 0.5, 2.4, 1, 3.0]), alphaCurve: curveOf([0, 0.9, 0.5, 0.6, 1, 0]),
};

/** The dust skirt: flat fines racing out along the floor. */
const SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.2, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground',
  ramp: RAMP_FINE, alphaCurve: FADE_LATE,
};

/** One low breath of dust. */
const DUST_BREATH: BurstOpts = {
  shape: 'puff', speed: 0.9, speedVar: 0.5, life: 0.75, lifeVar: 0.3, size: 0.24, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.04, vz: 0.3, zg: 1.0, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: BREATH_SIZE, alphaCurve: BREATH_A, wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/** Hot grains: the bitten edge's heat lying along the lane, cooling. */
const HOT_GRAIN: BurstOpts = {
  shape: 'square', align: true, speed: 2.2, speedVar: 0.5, life: 3.2, lifeVar: 0.25,
  size: 0.06, sizeVar: 0.3, gravity: 0, drag: 3,
  z: 0.3, vz: 0.4, zg: 6, land: 'settle', layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_HOT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'char', markLife: 5,
};

/**
 * core.steel_ring — the halo of edges. A nova of steel: a grind flash,
 * slivers racing out low on a ring and lying with a nick each, grind
 * glints off the heart, a dust skirt shoved off the rim.
 */
export const coreSteelRing: EffectDef = {
  id: 'core.steel_ring',
  name: 'Core — steel ring',
  story: 'a grind flash at the heart → a ring of flat steel slivers races out low, spinning, each landing and lying where it stops with a nick in the dirt → grind glints pop off the heart → a dust skirt is shoved off the rim → the slivers wink out one by one',
  layers: [
    { kind: 'field', name: 'pressure', field: { kind: 'attract', radius: 1.2, strength: -1.6, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'pressure ring', recipe: recipe([BRIGHT, STEEL], PRESSURE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'grind flash', recipe: recipe([WHITE, BRIGHT], GRIND_FLASH), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'edges', recipe: recipe([BRIGHT, STEEL], EDGE), count: 10, tier: 'hero', arrange: 'rim', radius: 0.15, outward: 3.0, dz: 0.3 },
    { kind: 'burst', name: 'lesser edges', recipe: recipe([WHITE, STEEL], EDGE_FINE), count: 12, tier: 'fine', arrange: 'rim', radius: 0.12, outward: 3.6, dz: 0.3 },
    { kind: 'burst', name: 'grind glints', recipe: recipe([WHITE, BRIGHT], GRIND), count: 10, tier: 'fine', dz: 0.35 },
    { kind: 'burst', name: 'skirt', recipe: recipe([SAND, PALE], SKIRT), count: 10, tier: 'body', arrange: 'rim', radius: 0.1, outward: 3.2 },
    { kind: 'burst', name: 'dust breath', recipe: recipe([PALE, SAND], { ...DUST_BREATH, size: 0.17, speed: 1.2, life: 0.6, alphaCurve: curveOf([0, 0.65, 0.5, 0.5, 1, 0]) }), count: 3, tier: 'body', arrange: 'rim', radius: 0.15, outward: 1.0 },
    { kind: 'burst', name: 'second edges', recipe: recipe([STEEL, DARK], { ...EDGE, speed: 2.2, size: 0.09, life: 1.3 }), count: 5, tier: 'body', arrange: 'rim', radius: 0.2, outward: 2.2, dz: 0.25, at: 0.08 },
    { kind: 'glow', name: 'cold light', r: 0.9, rgb: STEEL_GLOW, a: 0.1, dur: 0.22, attack: 0.01, release: 0.16 },
  ],
};

/**
 * core.steel_cut — the strobe edge. An aimed lane of steel: slivers
 * fly the aim and lie where they land, a grind-spark star where the
 * edge bit (`along` the aim), hot grains lie along the through-lane
 * cooling white → orange → black, the dust it lifted settles back.
 */
export const coreSteelCut: EffectDef = {
  id: 'core.steel_cut',
  name: 'Core — steel cut',
  story: 'the edge shows itself along the aim: a strobe of flat slivers flies the lane and lies where it lands → a grind-spark star bursts where it bit → hot grains lie along the through-lane and cool white → orange → black → the dust the cut lifted settles back',
  layers: [
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 1.0, strength: -1.2, dur: 0.25, attack: 0.02, release: 0.12 }, along: 0.8 },
    { kind: 'burst', name: 'bite flash', recipe: recipe([WHITE, BRIGHT], GRIND_FLASH), count: 2, tier: 'hero', along: 0.8, dz: 0.4 },
    { kind: 'burst', name: 'slivers', recipe: recipe([BRIGHT, STEEL], { ...EDGE, speed: 3.4, speedVar: 0.4, size: 0.09, life: 1.4 }), count: 6, tier: 'hero', arrange: 'cone', spread: 0.3, dz: 0.4 },
    { kind: 'burst', name: 'strobe fines', recipe: recipe([WHITE, STEEL], { ...EDGE_FINE, speed: 4.2, life: 0.38, trail: 4, trailColor: BRIGHT }), count: 12, tier: 'fine', arrange: 'cone', spread: 0.45, dz: 0.4 },
    { kind: 'burst', name: 'grind star', recipe: recipe([WHITE, BRIGHT], { ...GRIND, speed: 1.7 }), count: 12, tier: 'fine', arrange: 'cone', spread: 1.5, along: 0.8, dz: 0.35 },
    { kind: 'burst', name: 'hot grains', recipe: recipe([WHITE, HOT], HOT_GRAIN), count: 7, tier: 'hero', arrange: 'cone', spread: 0.28, along: 0.5, dz: 0.3 },
    { kind: 'burst', name: 'lifted dust', recipe: recipe([PALE, SAND], { ...DUST_BREATH, speed: 1.8, size: 0.16, life: 0.6, alphaCurve: curveOf([0, 0.7, 0.5, 0.55, 1, 0]) }), count: 4, tier: 'body', arrange: 'cone', spread: 0.5, along: 0.5, dz: 0.15 },
    { kind: 'burst', name: 'second strobe', recipe: recipe([STEEL, DARK], { ...EDGE_FINE, speed: 3.0, life: 0.34 }), count: 6, tier: 'body', arrange: 'cone', spread: 0.4, dz: 0.38, at: 0.09 },
    { kind: 'glow', name: 'bite light', r: 0.8, rgb: STEEL_GLOW, a: 0.1, dur: 0.2, attack: 0.01, release: 0.14, along: 0.8 },
  ],
};

/** The skirt of loose ground the cyclone lifts — masses the vortex owns. */
const CHURN_MASS: BurstOpts = {
  shape: 'blob', speed: 0.2, speedVar: 0.4, life: 0.9, lifeVar: 0.25, size: 0.3, sizeVar: 0.2,
  gravity: 0, drag: 1.8, z: 0.05, vz: 0.4, zg: 1.4, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [PALE, '#c9a978', SAND], at: [0, 0.5, 1], steps: 4 }),
  sizeCurve: curveOf([0, 0.6, 0.25, 1, 0.6, 1.1, 1, 0.85]), alphaCurve: curveOf([0, 0.35, 0.15, 0.6, 0.6, 0.5, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.25, spin: 0.6,
};

/** Chips: the loose ground's heroes, riding the spin then slung wide. */
const CHIP: BurstOpts = {
  shape: 'shard', speed: 1.4, speedVar: 0.5, life: 2.6, lifeVar: 0.3, size: 0.075, sizeVar: 0.3,
  gravity: 0, spin: 12, mass: 0.8, z: 0.1, vz: 1.8, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world',
  ramp: RAMP_CHIP, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 7,
};

/** Grit fines drawn up and thrown out. */
const GRIT: BurstOpts = {
  shape: 'square', speed: 1.0, speedVar: 0.6, life: 1.8, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 0.5, mass: 1.2, vz: 1.6, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The churned ring: ground squares laid where the wind ran. */
const CHURN_RING: BurstOpts = {
  shape: 'square', align: true, speed: 0.12, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.065, sizeVar: 0.3,
  gravity: 0, z: 0.02, vz: 0.3, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_CHIP, sizeCurve: HOLD, mark: 'fleck', markLife: 6,
};

/** Dust hanging in the eye and sifting down. */
const EYE_POPS: EmitterPop[] = [
  { colors: [PALE, SAND], opts: { ...CHURN_MASS, speed: 0.15, size: 0.3, vz: 0.8, zg: 1.2, life: 1.3 }, weight: 1.4, tier: 'body' },
  { colors: [SAND, PALE], opts: { shape: 'mote', speed: 0.3, speedVar: 0.6, life: 1.6, lifeVar: 0.35, size: 0.05, gravity: 0, drag: 1.0, z: 0.2, vz: 1.2, zg: 1.6, mass: 1.0, land: 'settle', layer: 'world', shadow: 0, jitter: 2.0, ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: FADE_LATE }, weight: 1.2, tier: 'fine' },
];

/**
 * core.cyclone — one spun blade. The vortex and a lift wake the loose
 * ground into a turning skirt, chips ride the spin and are slung wide
 * on true arcs, a churned ring is laid where the wind ran, dust hangs
 * in the eye and sifts down. Each pulse of a pulse art is one cast.
 */
export const coreCyclone: EffectDef = {
  id: 'core.cyclone',
  name: 'Core — cyclone',
  story: 'the blade inhales: a vortex and a lift wake around the body and the loose ground is drawn up into a turning skirt → chips ride the spin and are slung wide on true arcs, bouncing and lying → a churned ring of settled earth is laid where the wind ran → dust hangs in the eye and sifts down',
  layers: [
    { kind: 'field', name: 'spin', field: { kind: 'vortex', radius: 1.2, strength: 4.5, dur: 0.6, attack: 0.04, release: 0.2 }, radiusK: 0.8 },
    { kind: 'field', name: 'inhale', field: { kind: 'lift', radius: 1.0, strength: 2.2, dur: 0.5, height: 1.2, attack: 0.03, release: 0.2 } },
    { kind: 'burst', name: 'skirt', recipe: recipe([PALE, SAND], CHURN_MASS), count: 14, tier: 'body', arrange: 'rim', radius: 0.3, outward: 0.12 },
    { kind: 'burst', name: 'chips', recipe: recipe([LOAM, SHADE], CHIP), count: 8, tier: 'hero', arrange: 'rim', radius: 0.35, outward: 1.4 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, PALE, LOAM], GRIT), count: 16, tier: 'fine', arrange: 'rim', radius: 0.3, outward: 1.0 },
    { kind: 'burst', name: 'edge glints', recipe: recipe([WHITE, STEEL], { ...GRIND, speed: 2.2, vz: 0.6, zg: 3, life: 0.36 }), count: 6, tier: 'fine', arrange: 'orbit', radius: 0.5, dz: 0.5 },
    { kind: 'emit', name: 'eye dust', arrange: 'disc', radius: 0.3, rate: 14, dur: 0.7, attack: 0.05, release: 0.3, tier: 'body', pops: EYE_POPS },
    { kind: 'burst', name: 'churn ring', recipe: recipe([LOAM, SHADE], CHURN_RING), count: 10, tier: 'hero', arrange: 'ring', radius: 0.9, radiusK: 0.75, at: 0.35 },
    { kind: 'burst', name: 'sift', recipe: recipe([SAND, PALE], { ...GRIT, shape: 'mote', speed: 0.2, size: 0.04, vz: 0, z: 0.5, zg: 2.2, life: 1.5, mass: 0, drag: 0.8, alphaCurve: FADE_LATE }), count: 8, tier: 'fine', arrange: 'disc', radius: 0.6, at: 0.6 },
    { kind: 'glow', name: 'ground light', r: 1.1, rgb: '214, 172, 112', a: 0.08, dur: 0.35, attack: 0.03, release: 0.25 },
  ],
};

// ---------------------------------------------------------------------------
// THE PLANS
// ---------------------------------------------------------------------------

// The onehand arts once here (whirlwind, crescent_sweep, lunge, shockwave)
// speak in plans/blade.ts — THE MASTERED HAND Phase 4 gave the school one
// voice file; the steel effects stay here for every roster.
export const CORE_PLANS: Record<string, AbilityPlan> = {
  
};

export const CORE_EFFECTS: EffectDef[] = [coreSteelRing, coreSteelCut, coreCyclone];
