/**
 * BLOOD — the wound made visible (mastered pass, particles v6 phase 5).
 *
 * Blood is the heaviest liquid in the game and it NEVER GLOWS: no glow
 * layer anywhere in this file — its anchors are hero gobbets and, for
 * the drink, an attract field. Its whole voice is weight and
 * consequence: what hit, where it flew, where it dried. Every effect
 * here is built so the MARK STORY reads afterwards — a fight should
 * leave a history on the dirt that a passer-by can read.
 *
 * The vocabulary, each layer on its own clock:
 *
 *   CUT LINE   the fast red streaks along the blow — the first frame's
 *              read of direction, gone in a third of a second
 *   GOUT       the wet mass leaving the wound: overlapping blobs that
 *              flare and collapse (the only "mass" blood has — it is a
 *              liquid, so the mass is the moment it leaves the body)
 *   SPATTER    drops on TRUE HEIGHT arcing low along the blow, landing
 *              'splat' → the engine's spatter fines + a fleck that stays
 *   GOBBETS    the heroes: two or three heavy drops that land, SLIDE on
 *              the ground (land 'settle' + drag), and leave a SMEAR
 *              where they finally stop — the readable history
 *   MIST       fines: a cloud of tiny beads with no shadow, dead fast
 *   DRIP       the late voice: the wound keeps giving, drops falling
 *              from body height and splatting under the figure
 *   POOL       the puddle body: ground-layer blobs that grow slowly
 *              and darken through the drying ramp, fed by low seep
 *              drops whose flecks overlap into one stain
 *   DRINK      lifesteal: everything flows the WRONG way — an attract
 *              field gathers flecks and beads out of a ring, they rise
 *              on z into the heart, and a last dark pulse closes it
 *
 * Color: WET crimson at birth, drying through RED → DARK → CLOT to the
 * near-black DRIED every fighter knows. Posterized ramps only. Sizes
 * are authored for the street scale (~48–64 px/tile).
 * Palette shared with render/matter/blood.ts — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const WET = '#d84a3a';
export const RED = '#b8362a';
export const DARK = '#8e2a20';
export const CLOT = '#63201a';
export const DRIED = '#421410';
/** An intermediate stop between RED and DARK — the drying wet band. */
const DRYING = '#a3301f';

/** The full drying ramp: wet → red → dark → clot → dried, six bands. */
export const RAMP_DRY = rampOf({ stops: [WET, RED, DARK, CLOT, DRIED], at: [0, 0.3, 0.55, 0.8, 1], steps: 6 });
/** Spatter: stays wet longer, lands as CLOT flecks (the splat stain reads the ramp's end). */
export const RAMP_SPATTER = rampOf({ stops: [WET, RED, DRYING, CLOT], at: [0, 0.45, 0.75, 1], steps: 5 });
/** The gobbet: a long wet flight, dries only once it lies still. */
export const RAMP_GOBBET = rampOf({ stops: [WET, RED, DARK, CLOT, DRIED], at: [0, 0.4, 0.7, 0.88, 1], steps: 7 });
/** The gout mass: wet, red, gone. */
const RAMP_GOUT = rampOf({ stops: [WET, RED, DARK], at: [0, 0.5, 0.85] });
/** The pool body: red at the seep, blackening as it dries. */
const RAMP_POOL = rampOf({ stops: [RED, DARK, CLOT, DRIED], at: [0, 0.35, 0.7, 1], steps: 6 });
/** Drink: dark blood, brightening toward WET as it reaches the heart (a ramp read backwards is legal). */
const RAMP_DRINK = rampOf({ stops: [CLOT, DARK, RED, WET], at: [0, 0.3, 0.65, 0.9], steps: 5 });

const HOLD = curveOf('hold');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SOLID = curveOf('solid');
const FADE_IN = curveOf('fadeIn');
/** Drink matter arrives fast and is SWALLOWED in its last quarter — nothing flies out the far side. */
const DRINK_ALPHA = curveOf([0, 0, 0.12, 1, 0.7, 1, 1, 0]);
/** A drop fattens a touch on landing, then lies flat and shrinks into its smear. */
const GOBBET_SIZE = curveOf([0, 1, 0.5, 1.05, 0.8, 0.9, 1, 0.5]);
/** The pool grows for most of its life, then the turf takes it. */
const POOL_SIZE = curveOf([0, 0.35, 0.25, 0.8, 0.6, 1, 1, 0.92]);
const POOL_ALPHA = curveOf([0, 0.6, 0.2, 0.9, 0.78, 0.9, 1, 0]);

/** The cut line: fast streaks along the blow, no shadow, gone. */
const CUT: BurstOpts = {
  shape: 'streak', speed: 3.4, speedVar: 0.45, life: 0.34, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 0.5, zg: 7, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WET, RED, DARK], at: [0, 0.55, 0.85] }), alphaCurve: FADE_LATE,
};

/** The gout: overlapping wet blobs leaving the wound — the mass. */
const GOUT: BurstOpts = {
  shape: 'blob', align: true, speed: 1.6, speedVar: 0.45, life: 0.34, lifeVar: 0.2, size: 0.27, sizeVar: 0.25,
  gravity: 0, z: 0.5, vz: 0.4, zg: 4, drag: 2.2, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_GOUT, sizeCurve: FLARE, alphaCurve: FADE_OUT, core: WET, coreK: 0.4,
};

/** Spatter drops: true-height arcs, splat where they land. */
const SPATTER: BurstOpts = {
  shape: 'drop', speed: 2.3, speedVar: 0.55, life: 1.6, size: 0.075, sizeVar: 0.35, gravity: 0,
  z: 0.5, vz: 1.7, zg: 9, land: 'splat', layer: 'world',
  ramp: RAMP_SPATTER, sizeCurve: HOLD, alphaCurve: SOLID,
};

/** The hero gobbet: heavy, lands, SLIDES, and leaves a smear where it stops. */
const GOBBET: BurstOpts = {
  shape: 'drop', speed: 2.0, speedVar: 0.35, life: 2.1, lifeVar: 0.2, size: 0.135, sizeVar: 0.2, gravity: 0,
  z: 0.5, vz: 2.1, zg: 8, land: 'settle', layer: 'world',
  ramp: RAMP_GOBBET, sizeCurve: GOBBET_SIZE, alphaCurve: FADE_LATE,
  mark: 'smear', markLife: 7,
};

/** Mist: the finest beads, born in a cloud and dead in a breath. */
const MIST: BurstOpts = {
  shape: 'drop', speed: 3.0, speedVar: 0.7, life: 0.34, lifeVar: 0.4, size: 0.04, sizeVar: 0.4, gravity: 0,
  z: 0.55, vz: 0.6, zg: 7, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WET, RED, DARK], at: [0, 0.5, 0.8] }), sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** A drip: a drop letting go from body height, straight down, splat. */
const DRIP: BurstOpts = {
  shape: 'drop', speed: 0.08, life: 1.4, size: 0.065, sizeVar: 0.3, gravity: 0,
  vz: -0.15, zg: 7, land: 'splat', layer: 'world',
  ramp: RAMP_SPATTER, sizeCurve: HOLD, alphaCurve: SOLID,
};

/** A pulse bead: the wound's rhythm, lower and shorter than a strike. */
const PULSE_BEAD: BurstOpts = {
  ...SPATTER, speed: 1.7, speedVar: 0.5, vz: 1.4, zg: 8, size: 0.08, sizeVar: 0.3, z: 0.55,
};

/** Seep: low drops that barely leave the ground — their flecks build the pool. */
const SEEP: BurstOpts = {
  shape: 'drop', speed: 0.4, speedVar: 0.6, life: 0.9, size: 0.09, sizeVar: 0.35, gravity: 0,
  z: 0.06, vz: 0.4, zg: 6, land: 'splat', layer: 'world', shadow: 0,
  ramp: RAMP_SPATTER, sizeCurve: HOLD, alphaCurve: SOLID,
};

/** The pool body: a ground-layer blob that grows and blackens. */
const POOL: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 4.8, lifeVar: 0.1, size: 0.42, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.1,
  ramp: RAMP_POOL, sizeCurve: POOL_SIZE, alphaCurve: POOL_ALPHA,
  mark: 'smear', markLife: 3.6,
};

/** The pool's dark heart, born later inside the body. */
const CLOT_HEART: BurstOpts = {
  ...POOL, size: 0.2, life: 3.6, ramp: rampOf({ stops: [DARK, CLOT, DRIED], at: [0, 0.4, 0.85], steps: 4 }),
  sizeCurve: curveOf([0, 0.4, 0.4, 1, 1, 0.9]), mark: 'fleck', markLife: 3,
};

/** Rim gobbets settling at the pool's edge, smearing as they stop. */
const RIM_GOBBET: BurstOpts = {
  ...GOBBET, speed: 0.7, speedVar: 0.4, z: 0.25, vz: 0.9, zg: 7, life: 1.5, size: 0.11, markLife: 6,
};

/** Drink flecks: ground-hugging squares with mass, gathered by the field. */
const DRINK_FLECK: BurstOpts = {
  shape: 'square', align: true, speed: 0.9, speedVar: 0.4, life: 0.7, lifeVar: 0.3, size: 0.045, sizeVar: 0.4,
  gravity: 0, z: 0.03, vz: 0.35, zg: 0, drag: 1.1, mass: 1.8, land: 'none', layer: 'world', shadow: 0,
  ramp: RAMP_DRINK, sizeCurve: HOLD, alphaCurve: DRINK_ALPHA,
};

/** Drink beads: heavier drops that rise on z as they are pulled in. */
const DRINK_BEAD: BurstOpts = {
  shape: 'drop', speed: 1.0, speedVar: 0.4, life: 0.8, lifeVar: 0.25, size: 0.075, sizeVar: 0.3,
  gravity: 0, z: 0.05, vz: 0.75, zg: 0, drag: 1.0, mass: 1.5, land: 'none', layer: 'world', shadow: 0,
  ramp: RAMP_DRINK, sizeCurve: HOLD, alphaCurve: DRINK_ALPHA,
};

/** Drink heroes: gobbets out of the ring, rising fastest into the heart. */
const DRINK_GOBBET: BurstOpts = {
  ...DRINK_BEAD, size: 0.11, sizeVar: 0.2, speed: 1.4, vz: 1.0, life: 0.68, mass: 1.7,
};

/** The circle of the bargain: a dark hoop on the dirt that CLOSES on the heart. */
const CLOSING_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.95, lifeVar: 0.05, size: 2.2, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [CLOT, DARK, RED], at: [0, 0.5, 0.85] }),
  sizeCurve: curveOf([0, 1, 0.15, 0.95, 0.7, 0.35, 1, 0.08]), alphaCurve: curveOf([0, 0, 0.1, 0.8, 0.8, 0.7, 1, 0]),
};

/** The heart pulse: a dark blob at chest height that flares and closes. */
const HEART_PULSE: BurstOpts = {
  shape: 'blob', speed: 0.15, life: 0.44, lifeVar: 0.15, size: 0.38, sizeVar: 0.2, gravity: 0,
  z: 0.6, vz: 0.1, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [RED, DARK, CLOT], at: [0, 0.35, 0.75] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: WET, coreK: 0.3,
};

const DRIP_POPS: EmitterPop[] = [
  { colors: [RED, DARK], opts: DRIP, weight: 1, tier: 'body' },
];

const SEEP_POPS: EmitterPop[] = [
  { colors: [RED, DARK], opts: SEEP, weight: 2.2, tier: 'body' },
  { colors: [WET, RED], opts: { ...SEEP, size: 0.045, speed: 0.5, life: 0.6 }, weight: 1, tier: 'fine' },
];

const DRINK_POPS: EmitterPop[] = [
  { colors: [DARK, CLOT], opts: DRINK_FLECK, weight: 2.2, tier: 'fine' },
  { colors: [RED, DARK], opts: DRINK_BEAD, weight: 1.2, tier: 'body' },
];

/**
 * blood.hit — a weapon strike's spatter, aimed along params.dir.
 * Anticipation: the cut line. Impact: the gout, spatter arcing and
 * splatting, gobbets flying farthest. Aftermath: gobbets slide and
 * smear, the wound drips, the mist is already gone.
 */
export const bloodHit: EffectDef = {
  id: 'blood.hit',
  name: 'Blood — hit',
  story: 'the cut line along the blow → a wet gout leaves the wound → spatter arcs on true height and splats → heavy gobbets land, slide and SMEAR → mist dies in a breath → the wound drips after',
  layers: [
    { kind: 'burst', name: 'cut line', recipe: recipe([WET, RED], CUT), count: 6, tier: 'fine', arrange: 'cone', spread: 0.5 },
    { kind: 'burst', name: 'gout', recipe: recipe([WET, RED], GOUT), count: 4, tier: 'body', arrange: 'cone', spread: 0.6 },
    { kind: 'burst', name: 'spatter', recipe: recipe([WET, RED, DARK], SPATTER), count: 8, tier: 'body', arrange: 'cone', spread: 0.8 },
    { kind: 'burst', name: 'gobbets', recipe: recipe([RED, DARK], GOBBET), count: 3, tier: 'hero', arrange: 'cone', spread: 0.7 },
    { kind: 'burst', name: 'mist', recipe: recipe([WET, RED], MIST), count: 12, tier: 'fine', arrange: 'cone', spread: 1.1 },
    { kind: 'burst', name: 'near spatter', recipe: recipe([RED, DARK], { ...SPATTER, speed: 1.0, speedVar: 0.6, vz: 0.9, size: 0.07 }), count: 6, tier: 'body', arrange: 'cone', spread: 1.2 },
    { kind: 'burst', name: 'second spurt', recipe: recipe([RED, DARK], { ...SPATTER, speed: 1.4, vz: 1.1, size: 0.065 }), count: 4, tier: 'body', arrange: 'cone', spread: 0.9, at: 0.08 },
    { kind: 'emit', name: 'drip', dz: 0.75, at: 0.4, rate: 5, dur: 1.3, attack: 0.05, release: 0.6, tier: 'body', pops: DRIP_POPS },
  ],
};

/**
 * blood.spray — a wound's pulse: a cone of beads every ~0.4s for
 * ~1.5s, each pulse smaller (the heavy voices fire on fewer beats),
 * splats accumulating on the dirt in the same direction.
 */
export const bloodSpray: EffectDef = {
  id: 'blood.spray',
  name: 'Blood — spray',
  story: 'a wound pulses: a cone of beads every 0.4s for a second and a half, each pulse weaker than the last, the splats piling up along the same line',
  layers: [
    { kind: 'burst', name: 'first gush', recipe: recipe([WET, RED], GOUT), count: 3, tier: 'body', arrange: 'cone', spread: 0.5 },
    { kind: 'burst', name: 'gobbets', recipe: recipe([RED, DARK], { ...GOBBET, speed: 1.0, vz: 1.2 }), count: 2, tier: 'hero', arrange: 'cone', spread: 0.6, every: 0.8, times: 1 },
    { kind: 'burst', name: 'pulse', recipe: recipe([WET, RED, DARK], PULSE_BEAD), count: 4, tier: 'body', arrange: 'cone', spread: 0.6, every: 0.4, times: 3 },
    { kind: 'burst', name: 'strong beats', recipe: recipe([WET, RED], { ...PULSE_BEAD, speed: 2.0, vz: 1.6 }), count: 3, tier: 'body', arrange: 'cone', spread: 0.5, every: 0.4, times: 1 },
    { kind: 'burst', name: 'fine spray', recipe: recipe([WET, RED], MIST), count: 8, tier: 'fine', arrange: 'cone', spread: 0.8, every: 0.4, times: 1 },
    { kind: 'burst', name: 'weak beats', recipe: recipe([RED, DARK], { ...PULSE_BEAD, speed: 0.9, vz: 0.8, size: 0.065 }), count: 3, tier: 'body', arrange: 'cone', spread: 0.5, at: 1.6, every: 0.4, times: 1 },
    { kind: 'emit', name: 'dribble', dz: 0.55, at: 0.3, rate: 4, dur: 1.9, attack: 0.1, release: 0.9, tier: 'body', pops: DRIP_POPS },
  ],
};

/**
 * blood.pool — the puddle under a body: seep drops lay flecks that
 * overlap into a stain over a ground-layer pool body that grows and
 * blackens; slow drips from above; gobbets settle at the rim and
 * smear. Five seconds of lasting impact.
 */
export const bloodPool: EffectDef = {
  id: 'blood.pool',
  name: 'Blood — pool',
  story: 'a puddle grows under a body: seep drops lay flecks that overlap into one stain, the pool body darkens as it dries, drips fall into it, gobbets settle and smear at the rim',
  layers: [
    { kind: 'burst', name: 'pool body', recipe: recipe([RED, DARK], POOL), count: 5, tier: 'hero', arrange: 'disc', radius: 0.14 },
    { kind: 'emit', name: 'seep', arrange: 'disc', radius: 0.3, rate: 15, dur: 2.4, attack: 0.2, release: 0.8, tier: 'body', pops: SEEP_POPS },
    { kind: 'burst', name: 'rim gobbets', recipe: recipe([RED, DARK], RIM_GOBBET), count: 3, tier: 'hero', at: 0.15 },
    { kind: 'burst', name: 'first spill', recipe: recipe([RED, DARK], { ...SEEP, speed: 0.6, vz: 0.5, size: 0.08 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'emit', name: 'drips', dz: 0.85, at: 0.5, rate: 3, dur: 2.6, attack: 0.1, release: 0.8, tier: 'body', pops: DRIP_POPS },
    { kind: 'burst', name: 'clot heart', recipe: recipe([DARK, CLOT], CLOT_HEART), count: 2, tier: 'hero', arrange: 'disc', radius: 0.1, at: 1.4 },
    { kind: 'burst', name: 'late spread', recipe: recipe([DARK, CLOT], { ...POOL, size: 0.24, life: 3.2 }), count: 2, tier: 'body', arrange: 'ring', radius: 0.2, at: 1.0 },
  ],
};

/**
 * blood.drink — lifesteal: blood flowing the WRONG way. An attract
 * field gathers flecks and beads out of a ring, they rise on z into
 * the heart, and a last dark pulse closes the bargain. No splats.
 */
export const bloodDrink: EffectDef = {
  id: 'blood.drink',
  name: 'Blood — drink',
  story: 'the tithe: an attract field gathers flecks and beads inward off a ring, they rise into the heart, and a last dark pulse closes at the chest — nothing lands',
  layers: [
    { kind: 'field', name: 'the pull', field: { kind: 'attract', radius: 1.5, strength: 10, dur: 1.15, attack: 0.05, release: 0.25 }, radiusK: 1.4 },
    { kind: 'emit', name: 'gather', arrange: 'rim', radius: 1.1, radiusK: 1.0, outward: -1.1, rate: 44, dur: 0.85, attack: 0.06, release: 0.25, pops: DRINK_POPS },
    { kind: 'burst', name: 'ring gobbets', recipe: recipe([RED, DARK], DRINK_GOBBET), count: 5, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 0.95, outward: -1.4, at: 0.1, every: 0.25, times: 1 },
    { kind: 'burst', name: 'closing ring', recipe: recipe([CLOT, DARK], CLOSING_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'first flecks', recipe: recipe([DARK, CLOT], DRINK_FLECK), count: 12, tier: 'fine', arrange: 'rim', radius: 1.1, radiusK: 1.0, outward: -1.0 },
    { kind: 'burst', name: 'heart pulse', recipe: recipe([DARK, CLOT], HEART_PULSE), count: 3, tier: 'hero', at: 0.85 },
    { kind: 'burst', name: 'last beat', recipe: recipe([CLOT, DRIED], { ...HEART_PULSE, size: 0.22, life: 0.36, core: DARK }), count: 2, tier: 'body', at: 1.12 },
  ],
};

export const BLOOD_EFFECTS: EffectDef[] = [bloodHit, bloodSpray, bloodPool, bloodDrink];
