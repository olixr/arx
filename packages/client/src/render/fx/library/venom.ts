/**
 * VENOM — poison is a LIQUID first, a cloud second.
 *
 * The story, each layer on its own clock:
 *
 *   GOUT      the flash of the sac bursting — a fresh, pale-hearted
 *             blob that flares and is gone in a third of a second
 *   GOBBETS   the heroes: fat wet masses thrown up on true height,
 *             stretching as they fly, landing HARD into a wide splat
 *             whose fleck stays on the dirt for seconds
 *   BEADS     the drops — a dozen faceted teardrops arcing high and
 *             splatting where they land; every one leaves a fleck
 *   SPRAY     the fines riding every wet throw — tiny drops that
 *             fall fast and speckle the ground with pinprick stains
 *   MURK      the cloud — not smoke: heavier than air, born low and
 *             DENSE, overlapping blobs that swell into one body
 *             around whoever stands there, drying from bright to
 *             the near-black of an old stain; noise on x so it rolls
 *   MOTES     the fresh bright breath INSIDE the murk — the living
 *             poison in the dead cloud; they rise, the murk does not
 *   BUBBLES   motes blooming on the wet ground and POPPING into a
 *             spatter of pin-drops that mark the dirt (a recipe)
 *   DRIPS     heavy beads falling off the edge of things late,
 *             splatting one at a time — the aftermath's slow clock
 *   GLOW      the sickly light, faint, never hot
 *
 * Venom leads BRIGHT (fresh green) and dries DARK: every ramp runs
 * fresh → bright → toxin → murk → dried, posterized, and the cold
 * end is the stain the ground keeps. The world remembers every bead.
 *
 * Sizes are authored for the street scale (~48–64 px/tile): a mass is
 * a third of a tile, beads are ≥ 0.07 (their footprint is 1.8× the
 * drop, so a bead's stain reads on grass), fines are dots.
 * Palette shared with render/matter/venom.ts — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { defineRecipe, type BurstOpts, type EmitterPop } from '../../particles.js';

export const FRESH = '#8fd968';
export const BRIGHT = '#6dbf4a';
export const TOXIN = '#4c8c33';
export const MURK = '#3a6626';
export const DRIED = '#2b4a1d';
/** The pale heart of a fresh gob — the highlight, not a sixth voice. */
const PALE = '#c8f0a8';

export const VENOM_GLOW = '120, 220, 90';

/** The bead's whole life: fresh in the air, dried on the ground. */
export const RAMP_BEAD = rampOf({ stops: [FRESH, BRIGHT, TOXIN, MURK, DRIED], at: [0, 0.3, 0.6, 0.85, 1], steps: 6 });
/** Beads that dry FAST — laid straight onto a puddle, they stain at once. */
const RAMP_BEAD_QUICK = rampOf({ stops: [BRIGHT, TOXIN, MURK, DRIED], at: [0, 0.25, 0.55, 0.85], steps: 5 });
/** The murk: born bright-ish, most of its life toxin/murk, dying dried. */
export const RAMP_MURK = rampOf({ stops: [BRIGHT, TOXIN, MURK, DRIED], at: [0, 0.22, 0.6, 0.95], steps: 6 });
/** The dense low cloud: never bright, always heavy. */
const RAMP_MURK_DEEP = rampOf({ stops: [TOXIN, MURK, DRIED], at: [0, 0.5, 0.92], steps: 5 });
/** The fresh motes inside the cloud: bright the whole way, one dip. */
const RAMP_MOTE = rampOf({ stops: [PALE, FRESH, BRIGHT], at: [0, 0.35, 0.85] });
/** The puddle body: wet and bright, then a long dark hold. */
const RAMP_POOL = rampOf({ stops: [BRIGHT, TOXIN, MURK, DRIED], at: [0, 0.18, 0.45, 0.8], steps: 6 });

const HOLD = curveOf('hold');
const SWELL = curveOf('swell');
const BLOOM = curveOf('bloom');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SMOKE_A = curveOf('smoke');
const MIST = curveOf('mist');
/** A drop fattens as it slows, then holds — never shrinks to nothing in the air. */
const BEAD_SIZE = curveOf([0, 0.85, 0.3, 1, 1, 1]);
/** The puddle: spreads over the first act, holds, and is reclaimed late. */
/** The first breath arrives as a BODY: born near full, hangs, thins. */
const BREATH_SIZE = curveOf([0, 0.75, 0.2, 1, 0.6, 1, 1, 0.8]);
const POOL_SIZE = curveOf([0, 0.6, 0.2, 1, 0.8, 1, 1, 0.7]);
const POOL_ALPHA = curveOf([0, 0.5, 0.1, 0.9, 0.7, 0.9, 1, 0]);

// ---------------------------------------------------------------------------
// Recipes — the sub-emitters the grains name.
// ---------------------------------------------------------------------------

/** A bubble's pop: three pin-drops hop out and mark the dirt where they die. */
const POP: BurstOpts = {
  shape: 'drop', speed: 0.7, speedVar: 0.5, life: 0.32, lifeVar: 0.3, size: 0.04, sizeVar: 0.3,
  gravity: 0, z: 0.03, vz: 0.9, zg: 8, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_BEAD_QUICK, sizeCurve: HOLD, mark: 'fleck', markLife: 2.6,
};
const POP_ID = defineRecipe({ colors: [FRESH, BRIGHT], opts: POP, count: 3, countVar: 1 });

/** A bubble: blooms on the wet ground, pops into spatter. */
const BUBBLE: BurstOpts = {
  shape: 'mote', speed: 0.04, life: 0.55, lifeVar: 0.4, size: 0.07, sizeVar: 0.35, gravity: 0,
  z: 0.02, vz: 0.14, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_MOTE, sizeCurve: BLOOM, alphaCurve: FADE_LATE, onDeath: POP_ID,
};
const BUBBLE_ID = defineRecipe({ colors: [FRESH, BRIGHT], opts: BUBBLE, count: 1 });

/** A bead's landing breath: one murk mote rising off the splat. */
const LAND_MURK: BurstOpts = {
  shape: 'mote', speed: 0.1, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.2, sizeVar: 0.3, gravity: 0,
  z: 0.05, vz: 0.22, zg: 0, layer: 'world', shadow: 0, spin: 0.4,
  ramp: RAMP_MURK_DEEP, sizeCurve: SWELL, alphaCurve: MIST,
};
const LAND_MURK_ID = defineRecipe({ colors: [TOXIN, MURK], opts: LAND_MURK, count: 1 });

/** A spit bead's landing: a mass of murk AND a bubble — the landing zone's small cloud. */
const LAND_CLOUD: BurstOpts = {
  ...LAND_MURK, shape: 'blob', size: 0.34, life: 1.3, vz: 0.14, ramp: RAMP_MURK, alphaCurve: SMOKE_A, wave: 'noise', waveHz: 1.2, waveAmp: 0.2,
};
const LAND_CLOUD_ID = defineRecipe({ colors: [TOXIN, MURK], opts: LAND_CLOUD, count: 1 });

/** A bead's lasting stain: two low drops that die on the dirt and are remembered for seconds. */
const LAND_STAIN: BurstOpts = {
  shape: 'drop', speed: 0.35, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.075, sizeVar: 0.3,
  gravity: 0, z: 0.02, vz: 0.7, zg: 8, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_BEAD_QUICK, sizeCurve: HOLD, mark: 'fleck', markLife: 5.5,
};
const LAND_STAIN_ID = defineRecipe({ colors: [BRIGHT, TOXIN], opts: LAND_STAIN, count: 2 });

// ---------------------------------------------------------------------------
// The grains.
// ---------------------------------------------------------------------------

/** The bead — venom's drop. Thrown high on true height, splats on the dirt. */
const BEAD: BurstOpts = {
  shape: 'drop', speed: 1.1, speedVar: 0.5, life: 2.0, size: 0.1, sizeVar: 0.25, gravity: 0,
  vz: 2.5, zg: 8, land: 'splat', layer: 'world', ramp: RAMP_BEAD, sizeCurve: BEAD_SIZE,
  trail: 3, trailColor: TOXIN,
};

/** The gobbet — the wet MASS thrown with the beads; lands as a wide stain. */
const GOBBET: BurstOpts = {
  shape: 'blob', align: true, speed: 0.9, speedVar: 0.5, life: 2.0, size: 0.2, sizeVar: 0.25, gravity: 0,
  vz: 2.0, zg: 8, land: 'splat', layer: 'world', ramp: RAMP_BEAD, sizeCurve: HOLD,
  core: PALE, coreK: 0.35, onLand: LAND_MURK_ID,
};

/** Spray — the fines that ride every wet throw. */
const SPRAY: BurstOpts = {
  shape: 'drop', speed: 2.0, speedVar: 0.6, life: 1.2, size: 0.045, sizeVar: 0.35, gravity: 0,
  vz: 2.0, zg: 9, land: 'splat', layer: 'world', shadow: 0, ramp: RAMP_BEAD, sizeCurve: HOLD,
};

/** The gout flash — the sac bursting. */
const GOUT: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.3, lifeVar: 0.15, size: 0.3, sizeVar: 0.2, gravity: 0,
  z: 0.25, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [PALE, FRESH, BRIGHT], at: [0, 0.4, 0.8] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT, core: '#e6ffd0', coreK: 0.4,
};

/** The murk mass — heavier than air, born low, swelling into one body. */
const MURK_MASS: BurstOpts = {
  shape: 'blob', speed: 0.34, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.44, sizeVar: 0.3,
  gravity: 0, drag: 1.3, z: 0.12, vz: 0.07, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_MURK, sizeCurve: SWELL, alphaCurve: SMOKE_A, spin: 0.3,
  wave: 'noise', waveHz: 0.7, waveAmp: 0.3, mass: 0.5,
};

/** The deep murk — the floor of the cloud: darker, lower, slower. */
const MURK_DEEP: BurstOpts = {
  ...MURK_MASS, size: 0.48, z: 0.04, vz: 0.03, speed: 0.22, life: 2.6, ramp: RAMP_MURK_DEEP, alphaCurve: curveOf([0, 0.4, 0.2, 0.85, 0.65, 0.8, 1, 0]),
};

/** The fresh motes inside the cloud — the living poison, rising. */
const MOTE: BurstOpts = {
  shape: 'mote', speed: 0.18, speedVar: 0.5, life: 1.1, lifeVar: 0.4, size: 0.11, sizeVar: 0.4,
  gravity: 0, z: 0.1, vz: 0.35, zg: 0, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_MOTE, sizeCurve: BLOOM, alphaCurve: FADE_LATE, wave: 'sine', waveHz: 1.4, waveAmp: 0.2, mass: 0.8,
};

/** A heavy drip falling off the edge of things. */
const DRIP: BurstOpts = {
  shape: 'drop', speed: 0.06, life: 1.6, size: 0.095, sizeVar: 0.25, gravity: 0,
  z: 0.9, vz: -0.25, zg: 6, land: 'splat', layer: 'world', ramp: RAMP_BEAD, sizeCurve: BEAD_SIZE,
  onLand: BUBBLE_ID, trail: 2, trailColor: BRIGHT,
};

/** A low drop laid onto the puddle — dries as it lands. */
const LAY: BurstOpts = {
  shape: 'drop', speed: 0.3, speedVar: 0.6, life: 0.9, size: 0.085, sizeVar: 0.3, gravity: 0,
  z: 0.2, vz: 0.5, zg: 6, land: 'splat', layer: 'world', shadow: 0, ramp: RAMP_BEAD_QUICK, sizeCurve: HOLD,
};

/** The puddle body — a ground-stratum mass that spreads, holds, is reclaimed. */
const PUDDLE: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 4.6, lifeVar: 0.2, size: 0.42, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.05,
  ramp: RAMP_POOL, sizeCurve: POOL_SIZE, alphaCurve: POOL_ALPHA,
};

/** Murk rising off the puddle — thin, low, slow. */
const POOL_MURK: BurstOpts = {
  ...MURK_MASS, shape: 'mote', size: 0.24, sizeVar: 0.35, z: 0.03, vz: 0.16, speed: 0.1, life: 1.6,
  ramp: RAMP_MURK_DEEP, alphaCurve: MIST, waveAmp: 0.18,
};

export const CLOUD_POPS: EmitterPop[] = [
  { colors: [TOXIN, MURK], opts: MURK_MASS, weight: 2, tier: 'body' },
  { colors: [MURK, TOXIN], opts: MURK_DEEP, weight: 1.2, tier: 'body' },
  { colors: [FRESH, BRIGHT], opts: MOTE, weight: 1.4, tier: 'fine' },
  { colors: [BRIGHT, TOXIN], opts: { ...LAY, z: 0.5, vz: 0.1, speed: 0.15, size: 0.07, ramp: RAMP_BEAD }, weight: 0.35, tier: 'hero' },
];

const POOL_POPS: EmitterPop[] = [
  { colors: [BRIGHT, TOXIN], opts: LAY, weight: 1, tier: 'hero' },
];

const POOL_AIR_POPS: EmitterPop[] = [
  { colors: [TOXIN, MURK], opts: POOL_MURK, weight: 1.6, tier: 'body' },
  { colors: [FRESH, BRIGHT], opts: { ...MOTE, size: 0.08, vz: 0.25, life: 0.9 }, weight: 1, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// The effects.
// ---------------------------------------------------------------------------

/**
 * venom.burst — the sac bursts at the body: gobbets and beads thrown
 * up on true height, splatting into stains; the murk swells low
 * around the body; bubbles pop in the wet; late drips.
 */
export const venomBurst: EffectDef = {
  id: 'venom.burst',
  name: 'Venom — burst',
  story: 'the sac bursts → gobbets and beads arc up and SPLAT into stains → murk swells low around the body with fresh motes inside → bubbles pop in the wet → late drips fall → the ground keeps every fleck',
  layers: [
    { kind: 'burst', name: 'gout', recipe: recipe([FRESH, PALE], GOUT), count: 4, tier: 'hero' },
    { kind: 'burst', name: 'sac flash', recipe: recipe([PALE, FRESH], { ...GOUT, size: 0.46, life: 0.22, speed: 0.2, z: 0.35 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'gobbets', recipe: recipe([FRESH, BRIGHT], GOBBET), count: 5, tier: 'hero', dz: 0.3 },
    { kind: 'burst', name: 'beads', recipe: recipe([FRESH, BRIGHT, TOXIN], BEAD), count: 12, tier: 'hero', dz: 0.3 },
    { kind: 'burst', name: 'spray', recipe: recipe([FRESH, BRIGHT], SPRAY), count: 14, tier: 'fine', dz: 0.3 },
    { kind: 'burst', name: 'murk', recipe: recipe([TOXIN, MURK], MURK_MASS), count: 12, tier: 'body', at: 0.1, arrange: 'disc', radius: 0.3 },
    { kind: 'burst', name: 'deep murk', recipe: recipe([MURK, TOXIN], MURK_DEEP), count: 8, tier: 'body', at: 0.22, arrange: 'disc', radius: 0.45 },
    { kind: 'burst', name: 'fresh motes', recipe: recipe([FRESH, BRIGHT], MOTE), count: 9, tier: 'fine', at: 0.2, arrange: 'disc', radius: 0.25 },
    { kind: 'emit', name: 'hang', arrange: 'disc', radius: 0.6, at: 0.35, rate: 28, dur: 1.8, attack: 0.1, release: 0.8, tier: 'body', pops: CLOUD_POPS },
    { kind: 'burst', name: 'bubbles', recipe: recipe([FRESH, BRIGHT], BUBBLE), count: 2, tier: 'fine', arrange: 'disc', radius: 0.55, at: 0.7, every: 0.24, times: 9 },
    { kind: 'burst', name: 'late drips', recipe: recipe([BRIGHT, TOXIN], DRIP), count: 1, tier: 'body', arrange: 'disc', radius: 0.4, at: 1.0, every: 0.38, times: 4 },
    { kind: 'glow', name: 'glow', r: 1.2, rgb: VENOM_GLOW, a: 0.2, dur: 1.8, attack: 0.05, release: 0.9 },
  ],
};

/**
 * venom.cloud — the poison cloud that swallows a body: dense murk
 * masses low around it, bright fresh motes inside, drips falling out
 * of it, bubbles where they land.
 */
export const venomCloud: EffectDef = {
  id: 'venom.cloud',
  name: 'Venom — cloud',
  story: 'a first breath of dense murk swallows the body low → the cloud hangs and rolls, fresh motes rising inside it → drips fall out and splat → bubbles pop in the wet → it dries dark and thins',
  layers: [
    { kind: 'burst', name: 'first breath', recipe: recipe([TOXIN, MURK], { ...MURK_MASS, size: 0.5, sizeCurve: BREATH_SIZE, speed: 0.5 }), count: 16, tier: 'body', arrange: 'disc', radius: 0.45, radiusK: 0.45 },
    { kind: 'burst', name: 'floor murk', recipe: recipe([MURK, TOXIN], MURK_DEEP), count: 10, tier: 'body', at: 0.12, arrange: 'disc', radius: 0.7, radiusK: 0.7 },
    { kind: 'burst', name: 'fresh motes', recipe: recipe([FRESH, BRIGHT], MOTE), count: 8, tier: 'fine', at: 0.15, arrange: 'disc', radius: 0.4, radiusK: 0.4 },
    { kind: 'emit', name: 'cloud', arrange: 'disc', radius: 0.8, radiusK: 0.8, rate: 44, dur: 3.0, attack: 0.3, release: 0.9, tier: 'body', pops: CLOUD_POPS },
    { kind: 'burst', name: 'drips', recipe: recipe([BRIGHT, TOXIN], DRIP), count: 1, tier: 'body', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.5, every: 0.3, times: 8 },
    { kind: 'burst', name: 'bubbles', recipe: recipe([FRESH, BRIGHT], BUBBLE), count: 2, tier: 'fine', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.8, every: 0.25, times: 9 },
    { kind: 'emit', name: 'thinning', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 2.7, rate: 12, dur: 1.3, attack: 0.2, release: 0.7, tier: 'body', pops: POOL_AIR_POPS },
    { kind: 'field', name: 'sink', field: { kind: 'lift', radius: 1.2, strength: -0.5, dur: 3.2, height: 0.8, release: 0.6 }, radiusK: 1.2 },
    { kind: 'glow', name: 'glow', r: 1.3, rgb: VENOM_GLOW, a: 0.14, dur: 3.4, attack: 0.4, release: 1.0, radiusK: 1 },
  ],
};

/**
 * venom.spit — the aimed gob: a lead mass and a cone of beads along
 * params.dir, spray past them, a mist at the mouth; every bead that
 * lands raises its own murk, so the landing zone grows a small cloud
 * out of the matter that struck it, and bubbles pop in the wet.
 */
export const venomSpit: EffectDef = {
  id: 'venom.spit',
  name: 'Venom — spit',
  story: 'an aimed gob: the lead mass and a cone of beads fly along the aim and SPLAT in a fan → spray speckles past them → the landing zone breathes its own small cloud → bubbles pop in the wet',
  layers: [
    { kind: 'burst', name: 'mouth', recipe: recipe([FRESH, PALE], { ...GOUT, size: 0.22, life: 0.22, z: 0.5 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'lead gob', recipe: recipe([FRESH, BRIGHT], { ...GOBBET, speed: 2.1, speedVar: 0.25, vz: 1.4, zg: 6.5, size: 0.24, onLand: LAND_CLOUD_ID }), count: 2, tier: 'hero', arrange: 'cone', spread: 0.12, dz: 0.5 },
    { kind: 'burst', name: 'beads', recipe: recipe([FRESH, BRIGHT, TOXIN], { ...BEAD, speed: 1.9, speedVar: 0.4, vz: 1.5, zg: 7, onLand: LAND_MURK_ID }), count: 6, tier: 'hero', arrange: 'cone', spread: 0.34, dz: 0.5 },
    { kind: 'burst', name: 'wet beads', recipe: recipe([FRESH, BRIGHT], { ...BEAD, speed: 1.8, speedVar: 0.35, vz: 1.4, zg: 7, size: 0.11, onLand: LAND_CLOUD_ID }), count: 3, tier: 'hero', arrange: 'cone', spread: 0.3, dz: 0.5 },
    { kind: 'burst', name: 'spray', recipe: recipe([FRESH, BRIGHT], { ...SPRAY, speed: 2.3, speedVar: 0.55, vz: 1.3, zg: 8 }), count: 12, tier: 'fine', arrange: 'cone', spread: 0.6, dz: 0.5 },
    { kind: 'burst', name: 'mist', recipe: recipe([BRIGHT, TOXIN], { ...MOTE, speed: 1.6, speedVar: 0.5, life: 0.5, size: 0.09, z: 0.5, vz: 0.1, zg: 2, land: 'die', mass: 0 }), count: 8, tier: 'fine', arrange: 'cone', spread: 0.7 },
    { kind: 'burst', name: 'second spit', recipe: recipe([BRIGHT, TOXIN], { ...BEAD, speed: 1.9, speedVar: 0.4, vz: 1.3, zg: 7, size: 0.085, onLand: LAND_STAIN_ID }), count: 4, tier: 'body', arrange: 'cone', spread: 0.4, dz: 0.45, at: 0.1 },
    { kind: 'burst', name: 'dribble', recipe: recipe([BRIGHT, TOXIN], { ...DRIP, z: 0.5, size: 0.065, life: 1.0 }), count: 1, tier: 'body', at: 0.25, every: 0.2, times: 3 },
    { kind: 'glow', name: 'glow', r: 0.9, rgb: VENOM_GLOW, a: 0.16, dur: 0.5, release: 0.3 },
  ],
};

/**
 * venom.pool — the lasting puddle: a ground-stratum body that spreads
 * and holds, a disc of low drops laying flecks into it for three
 * seconds, bubbles blooming and popping into spatter, murk rising,
 * drips falling in. Four to five seconds of a floor you should not
 * stand on.
 */
export const venomPool: EffectDef = {
  id: 'venom.pool',
  name: 'Venom — pool',
  story: 'a puddle spreads on the ground and holds → low drops keep laying flecks into it → bubbles bloom and POP into spatter that marks the dirt → murk rises off it → drips fall in → it dries dark and the turf takes it back',
  layers: [
    { kind: 'burst', name: 'puddle', recipe: recipe([BRIGHT, TOXIN], PUDDLE), count: 8, tier: 'hero', arrange: 'disc', radius: 0.25, radiusK: 0.25 },
    { kind: 'burst', name: 'puddle edge', recipe: recipe([TOXIN, MURK], { ...PUDDLE, size: 0.34, life: 4.2 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.5, radiusK: 0.5, at: 0.3 },
    { kind: 'burst', name: 'first splash', recipe: recipe([FRESH, BRIGHT], { ...LAY, vz: 1.2, speed: 0.6 }), count: 8, tier: 'hero', arrange: 'disc', radius: 0.25, radiusK: 0.25 },
    { kind: 'emit', name: 'lay', arrange: 'disc', radius: 0.55, radiusK: 0.55, rate: 12, dur: 3.2, attack: 0.1, release: 0.8, tier: 'hero', pops: POOL_POPS },
    { kind: 'emit', name: 'murk', arrange: 'disc', radius: 0.5, radiusK: 0.5, rate: 10, dur: 4.2, attack: 0.3, release: 1.2, tier: 'body', pops: POOL_AIR_POPS },
    { kind: 'burst', name: 'bubbles', recipe: recipe([FRESH, BRIGHT], BUBBLE), count: 2, tier: 'fine', arrange: 'disc', radius: 0.45, radiusK: 0.45, at: 0.4, every: 0.2, times: 20 },
    { kind: 'burst', name: 'drips', recipe: recipe([BRIGHT, TOXIN], { ...DRIP, z: 0.7 }), count: 1, tier: 'body', arrange: 'disc', radius: 0.3, radiusK: 0.3, at: 0.6, every: 0.55, times: 6 },
    { kind: 'glow', name: 'glow', r: 1.0, rgb: VENOM_GLOW, a: 0.12, dur: 4.6, attack: 0.3, release: 1.4, radiusK: 1 },
  ],
};

/**
 * venom.drip — a body dripping: heavy beads falling from chest
 * height in a small disc, splatting one by one, a bubble where each
 * lands, a thin murk at the feet.
 */
export const venomDrip: EffectDef = {
  id: 'venom.drip',
  name: 'Venom — drip',
  story: 'heavy beads fall from the body one by one and SPLAT at its feet → a bubble blooms where each lands and pops → a thin murk hangs at the ankles → the ground under the body darkens with flecks',
  layers: [
    { kind: 'burst', name: 'first bead', recipe: recipe([FRESH, BRIGHT], DRIP), count: 2, tier: 'hero', arrange: 'disc', radius: 0.12 },
    { kind: 'emit', name: 'drips', arrange: 'disc', radius: 0.16, dz: 0.9, rate: 7, dur: 2.4, attack: 0.05, release: 0.3, tier: 'hero',
      pops: [{ colors: [FRESH, BRIGHT, TOXIN], opts: { ...DRIP, z: 0 }, weight: 1, tier: 'hero' }, { colors: [BRIGHT, TOXIN], opts: { ...DRIP, z: -0.3, size: 0.08, onLand: LAND_STAIN_ID }, weight: 0.5, tier: 'hero' }] },
    { kind: 'emit', name: 'trickle', arrange: 'disc', radius: 0.1, dz: 0.85, rate: 5, dur: 2.4, attack: 0.1, release: 0.3, tier: 'fine',
      pops: [{ colors: [BRIGHT, TOXIN], opts: { ...SPRAY, z: 0, speed: 0.08, vz: -0.3, zg: 6, size: 0.04, life: 1.4 }, weight: 1, tier: 'fine' }] },
    { kind: 'emit', name: 'thin murk', arrange: 'disc', radius: 0.28, rate: 7, dur: 2.8, attack: 0.3, release: 0.9, tier: 'body',
      pops: [{ colors: [TOXIN, MURK], opts: { ...POOL_MURK, size: 0.2, life: 1.3 }, weight: 1, tier: 'body' }] },
    { kind: 'glow', name: 'glow', r: 0.7, rgb: VENOM_GLOW, a: 0.1, dur: 2.8, attack: 0.3, release: 0.8 },
  ],
};

export const VENOM_EFFECTS: EffectDef[] = [venomBurst, venomCloud, venomSpit, venomPool, venomDrip];
