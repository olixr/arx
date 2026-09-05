/**
 * STORM — electricity SURGES, it does not sprinkle.
 *
 * Every arc in this file is a `bolt`: a seeded polyline from a grain
 * to its far anchor that RE-FORMS on its own strike beat (boltRate),
 * never per frame. Nothing here drifts — storm matter exists, snaps,
 * re-forms, and is gone. Blue-white only; storm and radiance are
 * different voices. Palette shared with render/matter/storm.ts.
 *
 * The strike, act by act:
 *
 *   GATHER     the attract field and the charge motes — the air
 *              decides; glints ring the foot and are pulled in, then
 *              CLIMB (the upward leader the sky answers)
 *   LEADER     a thin dim stepped leader feels down from the sky a
 *              beat before the return stroke
 *   BOLT       the return stroke: the sky-to-ground hero, re-forming
 *              on its beat, then a second thinner stroke
 *   SHOCK      a hard ring racing out on the ground — the impact read
 *   BLOOM      the plasma mass at the foot: overlapping blobs born in
 *              a tight disc, flaring white and dying blue in five
 *              bands — the MASS, not rubble
 *   IONS       fines ringing out and dying; SPARKS scratch out fast,
 *              land, and prick the dirt with flecks
 *   DUST       slammed off the rim by the pressure
 *   CHAR       heroes thrown low that die on the dirt and SCORCH it —
 *              the ground remembers where the sky touched
 *   AFTERGLOW  ground arcs crawling between the char for a second
 *   HAZE       the late voice: scorched-dirt haze rising off the char
 *   GLOW       the flash light, then a flickering afterglow
 *
 * THE FAR-ANCHOR TRICK (storm.arc, storm.nova): the composer can bind
 * a burst's far anchor only to a random `span` heading, never to the
 * cast's x2/y2 — so a bolt that must reach a target is built the
 * other way round: the grain's anchor is its birthplace and its HEAD
 * moves. A rim bolt with `outward` races out from the rim; a path
 * bolt with `mass` under an attract field reaches back toward the
 * caster. The bolt spans birthplace→head, which lies on the line by
 * construction. (Engine ask: `toFar` on bolt bursts.)
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const CORE = '#f2f8ff';
export const HOT = '#cfe8ff';
export const CHARGE = '#9db8e8';
export const HALO = '#6f86c9';
export const FADEOUT = '#4d5a8c';
/** Intermediate stops past FADEOUT for the cloud's dark mass. */
export const CLOUD = '#353c62';
export const CLOUD_DEEP = '#242942';

export const STORM_GLOW = '190, 215, 255';

const SAND = '#d8b06a';
const LOAM = '#a8825a';
const SHADE = '#8a6f4d';
/** Scorched soil — what the char ramp ends on. */
const SCORCH = '#3a3442';

const RAMP_ION = rampOf({ stops: [CORE, HOT, CHARGE, HALO], at: [0, 0.3, 0.6, 0.9], steps: 5 });
const RAMP_DUST = rampOf({ stops: [SAND, LOAM, SHADE], at: [0, 0.45, 0.85] });
/** The plasma mass: white heart → blue-white → charge → halo, five flat bands. */
const RAMP_BLOOM = rampOf({ stops: ['#ffffff', CORE, HOT, CHARGE, HALO], at: [0, 0.18, 0.4, 0.68, 0.92], steps: 5 });
const RAMP_CHAR = rampOf({ stops: [HOT, HALO, FADEOUT, SCORCH], at: [0, 0.3, 0.55, 0.8], steps: 5 });
const RAMP_HAZE = rampOf({ stops: [FADEOUT, SHADE], at: [0, 0.7], steps: 3 });
const RAMP_CLOUD = rampOf({ stops: [CLOUD_DEEP, CLOUD, FADEOUT], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_LIT = rampOf({ stops: [HOT, CHARGE, HALO, CLOUD], at: [0, 0.3, 0.6, 0.9], steps: 4 });

const FADE_OUT = curveOf('fadeOut');
const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const BLOOM = curveOf('bloom');
const SWELL = curveOf('swell');
const SMOKE_A = curveOf('smoke');
const FADE_LATE = curveOf('fadeLate');
/** A bolt's voice: full for most of its life, a snap off at the end. */
const BOLT_A = curveOf([0, 1, 0.6, 0.9, 1, 0]);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** The return stroke: sky → ground, re-forming on its beat, on top of everything. */
const BOLT: BurstOpts = {
  shape: 'bolt', life: 0.34, lifeVar: 0.15, size: 0.15, gravity: 0, layer: 'overlay', shadow: 0,
  z: 3.4, z2: 0, boltRate: 11, boltBranch: 0.75, fade: HALO, fadeAt: 2,
  alphaCurve: BOLT_A,
};

/** The stepped leader: thin, dim, feeling down a beat before the stroke. */
const LEADER: BurstOpts = {
  ...BOLT, size: 0.06, life: 0.12, lifeVar: 0.1, z: 3.6, boltRate: 16, boltBranch: 0.9, fade: FADEOUT,
  alphaCurve: curveOf([0, 0.5, 0.5, 0.8, 1, 0.3]),
};

/** The flash blob at the foot. */
const FLASH: BurstOpts = {
  shape: 'blob', speed: 0.4, life: 0.2, size: 0.4, sizeVar: 0.15, gravity: 0, z: 0.1,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: ['#ffffff', CORE, HOT] }), core: '#ffffff', coreK: 0.5,
};

/** The plasma mass — overlapping blobs, flaring, dying blue. */
const PLASMA: BurstOpts = {
  shape: 'blob', align: true, speed: 1.0, speedVar: 0.5, life: 0.32, lifeVar: 0.3,
  size: 0.28, sizeVar: 0.3, gravity: 0, drag: 5, vz: 0.6, zg: 0.4, layer: 'world', shadow: 0,
  ramp: RAMP_BLOOM, sizeCurve: curveOf([0, 0.7, 0.15, 1, 0.5, 0.7, 1, 0.2]), alphaCurve: FADE_LATE,
  core: '#ffffff', coreK: 0.4, flicker: 0.25,
};

/** The pressure ring on the ground. */
const SHOCK: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.3, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [CORE, HOT, CHARGE, HALO], at: [0, 0.3, 0.6, 0.85] }),
  sizeCurve: curveOf([0, 0.4, 0.5, 2.5, 1, 3.1]), alphaCurve: curveOf([0, 1, 0.45, 0.65, 1, 0]),
};

/** Ionized glints — the crackle ringing out of every discharge. */
const ION: BurstOpts = {
  shape: 'glint', speed: 1.5, speedVar: 0.5, life: 0.55, lifeVar: 0.4, size: 0.065, gravity: 0,
  vz: 0.6, zg: 1.5, layer: 'world', shadow: 0, flicker: 0.7, jitter: 6,
  ramp: RAMP_ION, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** Charge motes — born on the ring, pulled into the heart by the field. */
const CHARGE_MOTE: BurstOpts = {
  shape: 'glint', speed: 0.1, life: 0.3, lifeVar: 0.3, size: 0.055, gravity: 0, mass: 2.5,
  vz: 1.6, zg: -2, layer: 'world', shadow: 0, flicker: 0.6,
  alphaCurve: curveOf('fadeIn'), sizeCurve: BLOOM,
};

/** Sparks: ballistic streaks that die on the dirt and prick it. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 2.4, speedVar: 0.6, life: 0.4, size: 0.045, gravity: 0,
  vz: 2.6, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.6, trail: 8, trailColor: HALO,
  fade: CHARGE, fadeAt: 0.6, mark: 'fleck', markLife: 1.4,
};

/** Dust slammed off the rim. */
const DUST: BurstOpts = {
  shape: 'puff', speed: 1.1, speedVar: 0.4, life: 0.9, lifeVar: 0.3, size: 0.17, sizeVar: 0.3,
  gravity: 0, drag: 3, vz: 0.5, zg: 1.2, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: SWELL, alphaCurve: SMOKE_A,
};

/** Char heroes: thrown low, dying on the dirt, SCORCHING it. */
const CHAR: BurstOpts = {
  shape: 'square', align: true, speed: 0.5, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.11, sizeVar: 0.3,
  gravity: 0, vz: 0.8, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_CHAR, sizeCurve: HOLD, mark: 'char', markLife: 6,
};

/** Afterglow arcs crawling on the ground between the char. */
const AFTER_ARC: BurstOpts = {
  shape: 'bolt', life: 0.22, lifeVar: 0.3, size: 0.07, gravity: 0, layer: 'world', shadow: 0,
  z: 0.06, z2: 0.06, boltRate: 14, boltBranch: 0.3, fade: HALO, fadeAt: 2, alphaCurve: FADE_OUT,
};

/** Scorched-dirt haze — the late voice off the char. */
const HAZE: BurstOpts = {
  shape: 'mote', speed: 0.18, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.24, sizeVar: 0.3,
  gravity: 0, drag: 1.2, vz: 0.45, zg: -0.1, layer: 'world', shadow: 0,
  ramp: RAMP_HAZE, sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.2, 0.42, 0.6, 0.34, 1, 0]),
  wave: 'noise', waveHz: 1.2, waveAmp: 0.3,
};

// ---------------------------------------------------------------------------
// storm.strike
// ---------------------------------------------------------------------------

export const stormStrike: EffectDef = {
  id: 'storm.strike',
  name: 'Storm — strike',
  story: 'charge gathers and climbs, a leader feels down, the stroke lands and re-forms, the ground shocks and blooms white, ions ring out, sparks prick the dirt, dust slams off the rim, char scorches, afterglow arcs crawl, haze rises',
  layers: [
    { kind: 'field', name: 'gather', field: { kind: 'attract', radius: 1.5, strength: 9, dur: 0.24, attack: 0.02, release: 0.06 } },
    { kind: 'burst', name: 'charge', recipe: recipe([HOT, CHARGE], CHARGE_MOTE), count: 14, tier: 'fine', arrange: 'ring', radius: 1.0 },
    { kind: 'burst', name: 'charge climb', recipe: recipe([CORE, HOT], { ...CHARGE_MOTE, vz: 3.2, life: 0.2, mass: 0 }), count: 7, tier: 'fine', at: 0.12 },
    { kind: 'burst', name: 'leader', recipe: recipe([CHARGE, HOT], LEADER), count: 1, tier: 'hero', at: 0.16, span: 0.35 },
    { kind: 'burst', name: 'bolt', recipe: recipe([CORE, HOT], BOLT), count: 1, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'second stroke', recipe: recipe([HOT, CHARGE], { ...BOLT, size: 0.09, life: 0.24, z: 3.2, boltRate: 13 }), count: 1, tier: 'hero', at: 0.31, span: 0.25 },
    { kind: 'burst', name: 'shockfront', recipe: recipe([CORE, HOT], SHOCK), count: 1, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'flash', recipe: recipe([CORE, '#ffffff'], FLASH), count: 3, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'plasma bloom', recipe: recipe([CORE, HOT, '#ffffff'], PLASMA), count: 9, tier: 'body', arrange: 'disc', radius: 0.14, at: 0.24, dz: 0.05 },
    { kind: 'burst', name: 'ions', recipe: recipe([CORE, HOT, CHARGE], ION), count: 16, tier: 'fine', at: 0.24, dz: 0.1 },
    { kind: 'burst', name: 'sparks', recipe: recipe([CORE, HOT], SPARK), count: 10, tier: 'fine', at: 0.24 },
    { kind: 'burst', name: 'dust rim', recipe: recipe([SAND, LOAM], { ...DUST, size: 0.2, drag: 3.6 }), count: 9, tier: 'body', arrange: 'rim', radius: 0.3, outward: 1.2, at: 0.25 },
    { kind: 'burst', name: 'char', recipe: recipe([HOT, CHARGE], CHAR), count: 8, tier: 'hero', arrange: 'disc', radius: 0.2, at: 0.25 },
    { kind: 'burst', name: 'afterglow arcs', recipe: recipe([HOT, CHARGE], AFTER_ARC), count: 2, tier: 'body', arrange: 'disc', radius: 0.35, span: 0.5, at: 0.42, every: 0.16, times: 6 },
    { kind: 'emit', name: 'haze', arrange: 'disc', radius: 0.25, at: 0.5, rate: 9, dur: 0.9, attack: 0.1, release: 0.4, tier: 'body',
      pops: [{ colors: [FADEOUT, SHADE], opts: HAZE }] },
    { kind: 'glow', name: 'flash light', r: 2.3, rgb: STORM_GLOW, a: 0.4, at: 0.24, dur: 0.3, attack: 0.01, release: 0.22 },
    { kind: 'glow', name: 'afterglow', r: 1.1, rgb: STORM_GLOW, a: 0.14, at: 0.5, dur: 1.0, attack: 0.05, release: 0.6, flicker: 0.6 },
  ],
};

// ---------------------------------------------------------------------------
// storm.charge — a held wind-up on a body
// ---------------------------------------------------------------------------

/** A ground ring that DRAWS IN — the charge gathering, seen on the dirt. */
const DRAW_RING: BurstOpts = {
  ...SHOCK, life: 0.55, ramp: rampOf({ stops: [HALO, CHARGE, HOT], at: [0, 0.5, 0.85] }),
  size: 0.32, sizeCurve: curveOf([0, 2.4, 1, 0.5]), alphaCurve: curveOf([0, 0.25, 0.6, 0.55, 1, 0]),
};

/** Corona glints standing on the body, climbing and popping. */
const CORONA: BurstOpts = {
  shape: 'glint', speed: 0.12, life: 0.36, lifeVar: 0.35, size: 0.06, gravity: 0,
  vz: 0.9, zg: 0, layer: 'world', shadow: 0, flicker: 0.75,
  sizeCurve: BLOOM, alphaCurve: FADE_OUT,
};

const CHARGE_POPS: EmitterPop[] = [
  { colors: [HOT, CHARGE], opts: { ...CHARGE_MOTE, life: 0.8, lifeVar: 0.25, vz: 0.45, zg: 0, drag: 1.6, size: 0.06 }, tier: 'fine' },
];

export const stormCharge: EffectDef = {
  id: 'storm.charge',
  name: 'Storm — charge',
  story: 'a held charge on a body: the ground ring draws in, motes are pulled into the heart and climb it, arcs skip across the body, corona glints pop, the charge peaks in a white flare',
  layers: [
    { kind: 'field', name: 'gather', field: { kind: 'attract', radius: 1.35, strength: 16, dur: 1.6, attack: 0.1, release: 0.3 } },
    { kind: 'burst', name: 'ring draws in', recipe: recipe([HALO, CHARGE], DRAW_RING), count: 1, tier: 'hero', every: 0.6, times: 1 },
    { kind: 'emit', name: 'motes gather', arrange: 'ring', radius: 1.0, rate: 46, dur: 1.45, attack: 0.1, release: 0.3, pops: CHARGE_POPS },
    { kind: 'emit', name: 'corona', arrange: 'disc', radius: 0.2, dz: 0.45, at: 0.2, rate: 24, dur: 1.35, attack: 0.15, release: 0.3, tier: 'body',
      pops: [{ colors: [CORE, HOT], opts: CORONA }] },
    { kind: 'burst', name: 'arcs skip', recipe: recipe([CORE, HOT], { ...AFTER_ARC, z: 0.45, z2: 0.75, size: 0.085, boltRate: 12 }), count: 2, tier: 'body', arrange: 'ring', radius: 0.3, span: 0.5, at: 0.15, every: 0.16, times: 8 },
    { kind: 'burst', name: 'foot static', recipe: recipe([HOT, CHARGE], { ...AFTER_ARC, size: 0.06 }), count: 1, tier: 'body', arrange: 'disc', radius: 0.35, span: 0.4, at: 0.3, every: 0.22, times: 5 },
    { kind: 'burst', name: 'climb', recipe: recipe([CORE, HOT], { ...CHARGE_MOTE, vz: 2.2, life: 0.35, size: 0.045, mass: 0 }), count: 4, tier: 'fine', at: 0.2, every: 0.2, times: 6 },
    { kind: 'burst', name: 'peak flare', recipe: recipe([CORE, '#ffffff'], { ...FLASH, size: 0.26, life: 0.22 }), count: 2, tier: 'hero', at: 1.4, dz: 0.5 },
    { kind: 'burst', name: 'peak ions', recipe: recipe([CORE, HOT], { ...ION, speed: 1.0, life: 0.4 }), count: 10, tier: 'fine', at: 1.4, dz: 0.5 },
    { kind: 'glow', name: 'glow', r: 1.0, rgb: STORM_GLOW, a: 0.2, dur: 1.6, attack: 0.2, release: 0.3, flicker: 0.7 },
    { kind: 'glow', name: 'peak light', r: 1.5, rgb: STORM_GLOW, a: 0.3, at: 1.4, dur: 0.25, attack: 0.01, release: 0.2, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// storm.arc — a bolt between two anchors (the far anchor = params x2/y2)
// ---------------------------------------------------------------------------

/**
 * Channel bolts: born along the path with their anchor at the birth
 * point; the attract field at the caster pulls their heads back
 * along the line, so each spans a stretch of the channel — the
 * return stroke reaching from the target to its source.
 */
const CHANNEL: BurstOpts = {
  shape: 'bolt', life: 0.3, lifeVar: 0.25, size: 0.15, gravity: 0, layer: 'overlay', shadow: 0,
  mass: 1, drag: 4, boltRate: 12, boltBranch: 0.45, fade: HALO, fadeAt: 2, alphaCurve: BOLT_A,
};

/** Bright plasma knots riding the channel. */
const KNOT: BurstOpts = {
  ...FLASH, size: 0.17, life: 0.16, speed: 0.2, z: 0,
};

export const stormArc: EffectDef = {
  id: 'storm.arc',
  name: 'Storm — arc',
  story: 'a bolt spanning caster to target that re-forms on its beat, plasma knots along the channel, ions shed and sparks pricking the dirt, a flash at the source',
  layers: [
    { kind: 'field', name: 'return pull', field: { kind: 'attract', radius: 4.5, strength: 42, dur: 0.44, attack: 0, release: 0.1 } },
    { kind: 'burst', name: 'channel', recipe: recipe([CORE, HOT], CHANNEL), count: 9, tier: 'hero', arrange: 'path', dz: 0.5 },
    { kind: 'burst', name: 'channel re-forms', recipe: recipe([HOT, CHARGE], { ...CHANNEL, size: 0.09, life: 0.26 }), count: 8, tier: 'hero', arrange: 'path', dz: 0.5, at: 0.14 },
    { kind: 'burst', name: 'flash near', recipe: recipe([CORE, '#ffffff'], { ...FLASH, size: 0.26 }), count: 2, tier: 'hero', dz: 0.5 },
    { kind: 'burst', name: 'knots', recipe: recipe([CORE, HOT], KNOT), count: 5, tier: 'body', arrange: 'path', dz: 0.5, at: 0.02, every: 0.12, times: 2 },
    { kind: 'burst', name: 'ions', recipe: recipe([CORE, HOT, CHARGE], { ...ION, speed: 0.6, life: 0.4, zg: 3 }), count: 12, tier: 'fine', arrange: 'path', dz: 0.5 },
    { kind: 'burst', name: 'sparks', recipe: recipe([CORE, HOT], { ...SPARK, speed: 1.2, vz: 1.2, zg: 8 }), count: 5, tier: 'fine', arrange: 'path', dz: 0.5 },
    { kind: 'glow', name: 'glow', r: 0.9, rgb: STORM_GLOW, a: 0.26, dur: 0.3, attack: 0.01, release: 0.2, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// storm.nova — a ring of ground arcs racing outward
// ---------------------------------------------------------------------------

/** Racers: rim bolts whose heads run outward, anchored at the rim. */
const RACER: BurstOpts = {
  shape: 'bolt', life: 0.28, lifeVar: 0.25, size: 0.1, gravity: 0, layer: 'world', shadow: 0,
  z: 0.06, z2: 0.06, drag: 2.5, boltRate: 13, boltBranch: 0.5, fade: HALO, fadeAt: 2, alphaCurve: BOLT_A,
};

/** Tangles: span bolts skittering on the ring's rim. */
const TANGLE: BurstOpts = {
  ...AFTER_ARC, size: 0.075, life: 0.2, boltRate: 15, boltBranch: 0.4,
};

/** Char flecks where arcs touched the dirt — small, short, many. */
const NOVA_CHAR: BurstOpts = {
  ...CHAR, size: 0.07, sizeVar: 0.35, life: 0.32, vz: 0.5, zg: 5, speed: 0.4, markLife: 3.6,
};

/** Blue pricks where the far arcs grounded — gone in two seconds. */
const NOVA_FLECK: BurstOpts = {
  ...NOVA_CHAR, size: 0.055, ramp: rampOf({ stops: [HOT, CHARGE, HALO], at: [0, 0.4, 0.8] }), mark: 'fleck', markLife: 2.2,
};

export const stormNova: EffectDef = {
  id: 'storm.nova',
  name: 'Storm — nova',
  story: 'a white flash, the shockfront rings out and arcs race outward behind it in three waves, tangles skitter on the rim, ions and sparks fly, dust slams, char flecks where the arcs touched the dirt',
  layers: [
    { kind: 'burst', name: 'flash', recipe: recipe([CORE, '#ffffff'], { ...FLASH, size: 0.44 }), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'plasma', recipe: recipe([CORE, HOT], { ...PLASMA, size: 0.24, life: 0.26 }), count: 7, tier: 'body', arrange: 'disc', radius: 0.12 },
    { kind: 'burst', name: 'shockfront', recipe: recipe([CORE, HOT], { ...SHOCK, life: 0.42, sizeCurve: curveOf([0, 0.4, 0.5, 3.2, 1, 4.2]) }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'racers near', recipe: recipe([CORE, HOT], RACER), count: 7, tier: 'hero', arrange: 'rim', radius: 0.25, outward: 3.2, at: 0.02, every: 0.1, times: 1 },
    { kind: 'burst', name: 'racers mid', recipe: recipe([CORE, HOT], { ...RACER, size: 0.09 }), count: 8, tier: 'hero', arrange: 'rim', radius: 0.7, radiusK: 0.7, outward: 3.6, at: 0.12, every: 0.1, times: 1 },
    { kind: 'burst', name: 'racers far', recipe: recipe([HOT, CHARGE], { ...RACER, size: 0.08, life: 0.24 }), count: 9, tier: 'hero', arrange: 'rim', radius: 1.2, radiusK: 1.2, outward: 3.2, at: 0.24, every: 0.1, times: 1 },
    { kind: 'burst', name: 'tangles', recipe: recipe([HOT, CHARGE], TANGLE), count: 4, tier: 'body', arrange: 'ring', radius: 0.9, radiusK: 0.9, span: 0.5, at: 0.18, every: 0.13, times: 5 },
    { kind: 'burst', name: 'ions', recipe: recipe([CORE, HOT, CHARGE], { ...ION, speed: 2.4 }), count: 16, tier: 'fine', dz: 0.1 },
    { kind: 'burst', name: 'sparks', recipe: recipe([CORE, HOT], { ...SPARK, speed: 3.0 }), count: 7, tier: 'fine' },
    { kind: 'burst', name: 'dust rim', recipe: recipe([SAND, LOAM], { ...DUST, size: 0.2, drag: 3.2 }), count: 9, tier: 'body', arrange: 'rim', radius: 0.35, outward: 1.8, at: 0.04 },
    { kind: 'burst', name: 'char near', recipe: recipe([HOT, CHARGE], NOVA_CHAR), count: 6, tier: 'hero', arrange: 'rim', radius: 0.45, radiusK: 0.45, outward: 0.3, at: 0.1 },
    { kind: 'burst', name: 'flecks mid', recipe: recipe([HOT, CHARGE], NOVA_FLECK), count: 8, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.3, at: 0.22 },
    { kind: 'burst', name: 'flecks far', recipe: recipe([HOT, CHARGE], NOVA_FLECK), count: 9, tier: 'hero', arrange: 'rim', radius: 1.5, radiusK: 1.5, outward: 0.3, at: 0.34 },
    { kind: 'burst', name: 'afterglow arcs', recipe: recipe([HOT, CHARGE], AFTER_ARC), count: 2, tier: 'body', arrange: 'disc', radius: 1.2, radiusK: 1.2, span: 0.45, at: 0.5, every: 0.16, times: 5 },
    { kind: 'emit', name: 'haze', arrange: 'ring', radius: 0.9, radiusK: 0.9, at: 0.5, rate: 10, dur: 0.8, attack: 0.1, release: 0.4, tier: 'body',
      pops: [{ colors: [FADEOUT, SHADE], opts: { ...HAZE, size: 0.16 } }] },
    { kind: 'glow', name: 'flash light', r: 2.6, rgb: STORM_GLOW, a: 0.4, dur: 0.22, attack: 0.01, release: 0.16 },
    { kind: 'glow', name: 'ring light', r: 1.6, rgb: STORM_GLOW, a: 0.18, at: 0.1, dur: 0.9, attack: 0.05, release: 0.5, flicker: 0.5, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// storm.cloud — a crackling cloud held overhead
// ---------------------------------------------------------------------------

/** The cloud's dark mass — overlapping puffs churning in place. */
const CLOUD_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.14, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.36, sizeVar: 0.3,
  gravity: 0, drag: 0.6, mass: 0.5, vz: 0.05, zg: 0, layer: 'world', shadow: 0, spin: 0.4,
  ramp: RAMP_CLOUD, sizeCurve: SWELL, alphaCurve: SMOKE_A,
  wave: 'noise', waveHz: 0.9, waveAmp: 0.3,
};

/** A puff lit from inside on the arc's beat. */
const LIT_PUFF: BurstOpts = {
  ...CLOUD_PUFF, shape: 'mote', size: 0.32, life: 0.24, lifeVar: 0.2, ramp: RAMP_LIT, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  wave: undefined, core: CORE, coreK: 0.4,
};

/** Arcs skipping inside the mass. */
const CLOUD_ARC: BurstOpts = {
  shape: 'bolt', life: 0.2, lifeVar: 0.3, size: 0.08, gravity: 0, layer: 'world', shadow: 0,
  boltRate: 14, boltBranch: 0.4, fade: HALO, fadeAt: 2, alphaCurve: FADE_OUT,
};

/** Glints raining down and dying on the dirt. */
const RAIN_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.08, life: 1.2, lifeVar: 0.2, size: 0.045, gravity: 0,
  vz: -0.6, zg: 3.5, land: 'die', layer: 'world', shadow: 0, flicker: 0.6,
  ramp: rampOf({ stops: [CORE, HOT, CHARGE], at: [0, 0.4, 0.8] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'fleck', markLife: 0.45,
};

/** A mini-strike from the cloud base to the ground. */
const MINI_STRIKE: BurstOpts = {
  ...BOLT, size: 0.09, life: 0.2, lifeVar: 0.2, z: 1.3, z2: 0, boltRate: 13, boltBranch: 0.6,
};

const CLOUD_POPS: EmitterPop[] = [
  { colors: [CLOUD_DEEP, CLOUD], opts: CLOUD_PUFF, weight: 1.6, tier: 'body' },
  { colors: [CLOUD_DEEP, CLOUD], opts: { ...CLOUD_PUFF, shape: 'mote', size: 0.4 }, weight: 1.4, tier: 'body' },
  { colors: [CLOUD, FADEOUT], opts: { ...CLOUD_PUFF, shape: 'mote', size: 0.26, life: 1.0 }, weight: 0.8, tier: 'body' },
];

/** The cloud's shadow on the ground — a dark patch that lives as long as the cloud. */
const CLOUD_SHADE: BurstOpts = {
  shape: 'mote', speed: 0.02, life: 3.4, lifeVar: 0.1, size: 0.55, sizeVar: 0.25, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [CLOUD_DEEP] }),
  sizeCurve: curveOf([0, 0.6, 0.2, 1, 0.85, 1, 1, 0.5]), alphaCurve: curveOf([0, 0, 0.15, 0.22, 0.8, 0.22, 1, 0]),
};

export const stormCloud: EffectDef = {
  id: 'storm.cloud',
  name: 'Storm — cloud',
  story: 'a dark cloud gathers overhead and churns, arcs skip inside it and light the puffs on their beats, glints rain down and die on the dirt, mini-strikes lash the ground beneath',
  layers: [
    { kind: 'field', name: 'churn', field: { kind: 'vortex', radius: 0.9, strength: 1.6, dur: 3.2, attack: 0.3, release: 0.5 } },
    { kind: 'burst', name: 'gather', recipe: recipe([CLOUD_DEEP, CLOUD], { ...CLOUD_PUFF, shape: 'mote', size: 0.3, life: 1.0 }), count: 10, tier: 'body', arrange: 'disc', radius: 0.45, dz: 1.55 },
    { kind: 'burst', name: 'shade', recipe: recipe([CLOUD_DEEP], CLOUD_SHADE), count: 5, tier: 'body', arrange: 'disc', radius: 0.25 },
    { kind: 'emit', name: 'mass', arrange: 'disc', radius: 0.5, dz: 1.6, rate: 26, dur: 3.0, attack: 0.3, release: 0.7, pops: CLOUD_POPS },
    { kind: 'burst', name: 'arcs inside', recipe: recipe([CORE, HOT], CLOUD_ARC), count: 2, tier: 'body', arrange: 'disc', radius: 0.4, span: 0.5, dz: 1.65, at: 0.3, every: 0.2, times: 13 },
    { kind: 'burst', name: 'lit puffs', recipe: recipe([HOT, CHARGE], LIT_PUFF), count: 3, tier: 'body', arrange: 'disc', radius: 0.35, dz: 1.6, at: 0.3, every: 0.2, times: 13 },
    { kind: 'emit', name: 'glint rain', arrange: 'disc', radius: 0.5, dz: 1.45, at: 0.4, rate: 16, dur: 2.6, attack: 0.2, release: 0.4, tier: 'fine',
      pops: [{ colors: [CORE, HOT], opts: RAIN_GLINT, tier: 'fine' }] },
    { kind: 'burst', name: 'mini-strike', recipe: recipe([CORE, HOT], MINI_STRIKE), count: 1, tier: 'hero', arrange: 'disc', radius: 0.35, span: 0.2, at: 0.7, every: 0.55, times: 4 },
    { kind: 'burst', name: 'strike flash', recipe: recipe([CORE, HOT], { ...FLASH, size: 0.2, life: 0.16 }), count: 2, tier: 'body', arrange: 'disc', radius: 0.3, at: 0.7, every: 0.55, times: 4 },
    { kind: 'burst', name: 'strike ions', recipe: recipe([CORE, HOT, CHARGE], { ...ION, speed: 1.0, life: 0.4 }), count: 6, tier: 'fine', arrange: 'disc', radius: 0.3, at: 0.7, every: 0.55, times: 4 },
    { kind: 'burst', name: 'strike char', recipe: recipe([HOT, CHARGE], { ...NOVA_CHAR, markLife: 2.6 }), count: 2, tier: 'hero', arrange: 'disc', radius: 0.3, at: 0.7, every: 0.55, times: 4 },
    { kind: 'glow', name: 'cloud light', r: 1.3, rgb: STORM_GLOW, a: 0.18, dz: 1.5, dur: 3.2, attack: 0.4, release: 0.6, flicker: 0.8 },
    { kind: 'glow', name: 'strike light', r: 1.4, rgb: STORM_GLOW, a: 0.28, at: 0.7, dur: 0.16, attack: 0.01, release: 0.12, every: 0.55, times: 4 },
  ],
};

export const STORM_EFFECTS: EffectDef[] = [stormStrike, stormCharge, stormArc, stormNova, stormCloud];
