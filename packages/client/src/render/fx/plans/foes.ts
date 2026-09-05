/**
 * FOES — ability plans (particles v6 phase 5): THE WILD'S VOICES.
 *
 * Curated by the foes' master pass: one plan per ability id in
 * fxSigsFoes.ts, cued into the effect library, plus the roster-only
 * effects the library could not speak (silk, grave bone, knitting
 * growth, grave-light). Every plan is read from the RECEIVING END:
 * a foe's art must say THREAT in one glance — bigger scales than a
 * player's jab, heavy residue, a standing zone that keeps speaking.
 *
 * Wire facts the cues are timed on (server → client):
 *   ground_aoe  → `blast` at the fuse's end (780 ms), radius = the def
 *   ground_field→ `field` living fieldTicks (3.5–4.5 s); `every` re-speaks
 *   melee_arc   → `arc` (300 ms), radius = range, aimed by dir
 *   dash_strike → `dash` from x/y to x2/y2 (radius 0 — no radiusK cues)
 *   leap_slam   → `dash` (departure→landing) then `blast` at the landing
 *   nova/pulse  → `nova` per pulse; summon → `summon` (500 ms, r 1.4)
 *   beam        → `beam` x→x2, radius = half width (0.3)
 *   projectile  → `blast` at the landing, radius = splash (0.55 default)
 *   self_buff   → `buff` (750 ms) at the caster
 *
 * The painted centerpieces (the silk tent, the ribcage, the harpoons,
 * the club print) stay — they are drawing. What lives here is the
 * MATTER: the fines, the mass, the heroes that land and the marks
 * that outlive the wire.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';
import { SAND, PALE as DUST_PALE, LOAM, SHADE, DEEP as DUST_DEEP } from '../library/dust.js';

// ---------------------------------------------------------------------------
// Shared curves
// ---------------------------------------------------------------------------

const HOLD = curveOf('hold');
const SWELL = curveOf('swell');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST = curveOf('mist');
const SMOKE_A = curveOf('smoke');
/** A lying grain: holds, and is taken back by the turf only at the end. */
const LIE_A = curveOf([0, 1, 0.85, 1, 1, 0]);
/** A slab of light: arrives fast, holds most of its life, lets go. */
const SLAB_A = curveOf([0, 0.25, 0.12, 0.6, 0.8, 0.55, 1, 0]);

// ---------------------------------------------------------------------------
// foes.silk — THE PITCHED NET (web_snare)
// ---------------------------------------------------------------------------

const SILK = '#f4f2ea';
const SILK_PALE = '#dcd9cc';
const SILK_GREY = '#b4b0a2';
const STAKE = '#6e6250';
const STAKE_DARK = '#4a4236';

const RAMP_SILK = rampOf({ stops: [SILK, SILK_PALE, SILK_GREY], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_STAKE = rampOf({ stops: [STAKE, STAKE_DARK], at: [0, 0.8] });

/** A strand: a streak flung along the floor, laid out by drag. */
const STRAND: BurstOpts = {
  shape: 'streak', speed: 3.6, speedVar: 0.25, life: 1.6, lifeVar: 0.25, size: 0.1, sizeVar: 0.3,
  gravity: 0, drag: 3.2, z: 0.05, vz: 0.2, zg: 0.8, land: 'settle', layer: 'world', shadow: 0,
  mass: 1.2, ramp: RAMP_SILK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** A guy-line: drawn from the rim INTO the peak. */
const GUY: BurstOpts = {
  ...STRAND, speed: 2.4, life: 0.55, drag: 0.4, z: 0.12, vz: 0.6, zg: 1.4, mass: 0,
};

/** A stake: a slab pegged into the rim, lying nine seconds. */
const STAKE_PEG: BurstOpts = {
  shape: 'shard', speed: 0.04, speedVar: 0, life: 9, lifeVar: 0.1, size: 0.14, sizeVar: 0.15,
  gravity: 0, spin: 0, layer: 'ground', shadow: 0, ramp: RAMP_STAKE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** Dust at each stake as it bites. */
const STAKE_DUST: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.22, sizeVar: 0.3,
  gravity: 0, drag: 1.8, z: 0.02, vz: 0.5, zg: 0.8, layer: 'world', shadow: 0, spin: 0.4,
  ramp: rampOf({ stops: [DUST_PALE, SAND, LOAM], at: [0, 0.5, 0.9] }), sizeCurve: SWELL, alphaCurve: SMOKE_A,
};

/** Silk dust: glints shaken off the net. */
const SILK_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.25, speedVar: 0.6, life: 0.7, lifeVar: 0.4, size: 0.055, gravity: 0,
  z: 0.3, vz: 0.3, zg: 2.0, land: 'die', layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: curveOf('pulse'),
};

/** The sagging canopy: pale motes sinking off the gores. */
const SAG: BurstOpts = {
  shape: 'mote', speed: 0.1, speedVar: 0.5, life: 1.2, lifeVar: 0.3, size: 0.13, sizeVar: 0.3,
  gravity: 0, drag: 0.8, z: 0.4, vz: -0.08, zg: 0.35, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_SILK, sizeCurve: SWELL, alphaCurve: MIST,
};

/** The gores: the canopy itself — pale translucent sheets lying over the circle. */
const GORE: BurstOpts = {
  shape: 'blob', speed: 0.05, speedVar: 0.5, life: 3.4, lifeVar: 0.15, size: 0.55, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.1, ramp: RAMP_SILK, sizeCurve: curveOf([0, 0.5, 0.1, 1, 0.8, 0.95, 1, 0.6]),
  alphaCurve: curveOf([0, 0, 0.06, 0.38, 0.8, 0.34, 1, 0]),
};

/** The shiver: short strands drawn inward on the ratchet's beat. */
const SHIVER: BurstOpts = {
  ...STRAND, speed: 1.6, life: 0.45, drag: 1.2, z: 0.08, vz: 0.35, zg: 1.6, mass: 2.5, land: 'die',
};

export const foesSilk: EffectDef = {
  id: 'foes.silk',
  name: 'Foes — silk',
  story: 'the net is thrown: strands fling out from the peak and lie along the floor → six stakes bite the rim in a puff of dust → the canopy sags in pale motes → on every beat the net TIGHTENS, strands drawn inward and shivering → the stake ring lies nine seconds',
  layers: [
    { kind: 'field', name: 'the throw', field: { kind: 'attract', radius: 1.6, strength: -3, dur: 0.25, attack: 0.02, release: 0.1 }, radiusK: 1.1 },
    { kind: 'burst', name: 'strands', recipe: recipe([SILK, SILK_PALE], STRAND), count: 14, tier: 'hero', arrange: 'rim', radius: 0.1, outward: 3.0 },
    { kind: 'burst', name: 'gores', recipe: recipe([SILK, SILK_PALE], GORE), count: 7, tier: 'body', arrange: 'disc', radius: 0.55, radiusK: 0.55, at: 0.04 },
    { kind: 'burst', name: 'guy lines', recipe: recipe([SILK, SILK_PALE], GUY), count: 6, tier: 'hero', arrange: 'rim', radius: 0.95, radiusK: 0.95, outward: -2.4, at: 0.05 },
    { kind: 'burst', name: 'stakes', recipe: recipe([STAKE, STAKE_DARK], STAKE_PEG), count: 6, tier: 'hero', arrange: 'ring', radius: 0.95, radiusK: 0.95, at: 0.12 },
    { kind: 'burst', name: 'stake dust', recipe: recipe([DUST_PALE, SAND], STAKE_DUST), count: 6, tier: 'body', arrange: 'ring', radius: 0.95, radiusK: 0.95, at: 0.12 },
    { kind: 'burst', name: 'silk dust', recipe: recipe([SILK, SILK_PALE], SILK_GLINT), count: 12, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.1 },
    { kind: 'emit', name: 'sag', arrange: 'disc', radius: 0.7, radiusK: 0.7, dz: 0.1, at: 0.3, rate: 7, dur: 3.0, attack: 0.3, release: 0.8, tier: 'body',
      pops: [{ colors: [SILK_PALE, SILK_GREY], opts: SAG }] },
    { kind: 'field', name: 'ratchet', field: { kind: 'attract', radius: 1.8, strength: 2.6, dur: 0.3, attack: 0.03, release: 0.12 }, radiusK: 1.1, at: 0.5, every: 0.5, times: 5 },
    { kind: 'burst', name: 'shiver', recipe: recipe([SILK, SILK_PALE], SHIVER), count: 8, tier: 'body', arrange: 'rim', radius: 0.6, radiusK: 0.6, outward: -1.4, at: 0.5, every: 0.5, times: 5, decay: 0.85 },
    { kind: 'burst', name: 'shiver glints', recipe: recipe([SILK, SILK_PALE], SILK_GLINT), count: 3, tier: 'fine', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.5, every: 0.5, times: 5 },
  ],
};

// ---------------------------------------------------------------------------
// foes.bone_rise — THE TWO GRAVES OPEN (raise_the_fallen)
// ---------------------------------------------------------------------------

const BONE = '#efe8d4';
const BONE_SHADE = '#cdc3a8';
const BONE_DEEP = '#9a8f78';
const GRAVE_COLD = '#b8c4d8';
const CHANT = '#9a94b8';

const RAMP_BONE = rampOf({ stops: [BONE, BONE_SHADE, BONE_DEEP], at: [0, 0.6, 0.95], steps: 4 });
const RAMP_SOIL = rampOf({ stops: [SHADE, LOAM, DUST_PALE], at: [0, 0.4, 0.9], steps: 5 });
const RAMP_CLOD = rampOf({ stops: [LOAM, SHADE, DUST_DEEP], at: [0, 0.55, 0.9], steps: 4 });

/** The mound heaving: dark soil masses shoved up and out. */
const HEAVE: BurstOpts = {
  shape: 'blob', speed: 0.7, speedVar: 0.4, life: 1.2, lifeVar: 0.3, size: 0.38, sizeVar: 0.25,
  gravity: 0, drag: 2.0, z: 0.04, vz: 1.1, zg: 3.0, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_SOIL, sizeCurve: curveOf([0, 0.55, 0.25, 1, 0.6, 1.1, 1, 0.8]), alphaCurve: curveOf([0, 0.6, 0.12, 1, 0.66, 0.9, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.3, spin: 0.35,
};

/** Soil clods: thrown, bouncing, lying, flecking the dirt. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.1, speedVar: 0.5, life: 2.8, lifeVar: 0.3, size: 0.075, sizeVar: 0.3,
  gravity: 0, spin: 9, vz: 2.6, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 7,
};

/** The bone fountain's heroes: chips on real height that land and LIE eight seconds. */
const BONE_CHIP: BurstOpts = {
  shape: 'shard', speed: 0.75, speedVar: 0.5, life: 8, lifeVar: 0.12, size: 0.085, sizeVar: 0.3,
  gravity: 0, spin: 10, vz: 3.0, zg: 8, land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: RAMP_BONE, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 6,
};

/** Bone dust: fines that fly with the chips and settle. */
const BONE_FINE: BurstOpts = {
  shape: 'square', speed: 1.0, speedVar: 0.6, life: 2.0, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 0.4, vz: 2.2, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_BONE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** The soil ring: the opened grave's rim, lying. */
const SOIL_RING: BurstOpts = {
  shape: 'square', speed: 0.05, life: 8, lifeVar: 0.1, size: 0.07, sizeVar: 0.3, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [SHADE, DUST_DEEP] }), sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** Grave breath: the cold that leaves an opened grave. */
const GRAVE_BREATH: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.4, lifeVar: 0.3, size: 0.2, sizeVar: 0.3,
  gravity: 0, drag: 0.8, z: 0.1, vz: 0.5, zg: -0.05, layer: 'world', shadow: 0, spin: 0.3,
  ramp: rampOf({ stops: [GRAVE_COLD, '#d8dde8', '#e8ecf2'], at: [0, 0.5, 0.9], steps: 3 }), sizeCurve: SWELL, alphaCurve: MIST,
};

/** The chanter's word: an arc of grave-light to each mound. */
const CALL: BurstOpts = {
  shape: 'bolt', speed: 0, life: 0.28, size: 0.05, gravity: 0, z: 0.6, layer: 'world', shadow: 0,
  boltRate: 14, boltBranch: 0.2, alphaCurve: FADE_OUT,
};

/** One grave, offset `along` the aim (the summon's dir is 0 → ±x). */
function grave(tag: string, along: number, at: number, hint: string): EffectDef['layers'] {
  return [
    { kind: 'burst', name: `heave ${tag}`, recipe: recipe([SHADE, LOAM], HEAVE), count: 8, tier: 'body', arrange: 'disc', radius: 0.16, along, at },
    { kind: 'burst', name: `clods ${tag}`, recipe: recipe([LOAM, SHADE], CLOD), count: 6, tier: 'hero', along, at },
    { kind: 'burst', name: `bone fountain ${tag}`, recipe: recipe([BONE, BONE_SHADE], BONE_CHIP), count: 8, tier: 'hero', along, at, dz: 0.1 },
    { kind: 'burst', name: `bone dust ${tag}`, recipe: recipe([BONE, BONE_SHADE], BONE_FINE), count: 14, tier: 'fine', along, at, dz: 0.1 },
    { kind: 'burst', name: `grave breath ${tag} (${hint})`, recipe: recipe([GRAVE_COLD, '#d8dde8'], GRAVE_BREATH), count: 5, tier: 'body', arrange: 'disc', radius: 0.2, along, at: at + 0.15 },
    { kind: 'burst', name: `soil ring ${tag}`, recipe: recipe([SHADE, DUST_DEEP], SOIL_RING), count: 7, tier: 'hero', arrange: 'ring', radius: 0.36, along, at: at + 0.25 },
  ];
}

export const foesBoneRise: EffectDef = {
  id: 'foes.bone_rise',
  name: 'Foes — bone rise',
  story: 'the chanter speaks two arcs of grave-light → two burial mounds heave up at its flanks one after the other → soil clods and a fountain of bone chips fly on true height and rain back → grave breath leaves each hole → the opened graves keep a soil ring and a scatter of bone eight seconds',
  layers: [
    { kind: 'burst', name: 'the call', recipe: recipe([CHANT, '#c8c4dc'], CALL), count: 2, tier: 'hero', span: 0.9 },
    ...grave('A', 0.9, 0.02, 'first'),
    ...grave('B', -0.9, 0.24, 'second'),
    { kind: 'glow', name: 'grave light', r: 1.4, rgb: '154, 148, 184', a: 0.12, dur: 0.9, attack: 0.05, release: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// foes.knit — THE FIVE STITCHES (gnawed_mending)
// ---------------------------------------------------------------------------

const LEAF = '#7ac46a';
const LEAF_BRIGHT = '#a8e08a';
const LEAF_DEEP = '#3f7a36';
const LITTER = '#8a7a3a';
const LITTER_DARK = '#5e5228';
const KNOT = '#f0ffe0';

const RAMP_LITTER = rampOf({ stops: [LITTER, LEAF_DEEP, LEAF], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_STITCH = rampOf({ stops: [KNOT, LEAF_BRIGHT, LEAF, LEAF_DEEP], at: [0, 0.25, 0.6, 0.9], steps: 5 });

/** The root heartbeat: one ground ring, green, once. */
const ROOT_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [LEAF_BRIGHT, LEAF, LEAF_DEEP], at: [0, 0.45, 0.85] }),
  sizeCurve: curveOf([0, 0.4, 0.55, 2.4, 1, 2.9]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** Leaf litter drawn INTO the body — matter flowing inward means interrupt it. */
const LEAF_IN: BurstOpts = {
  shape: 'shard', speed: 1.2, speedVar: 0.4, life: 1.5, lifeVar: 0.3, size: 0.07, sizeVar: 0.35,
  gravity: 0, drag: 0.4, spin: 6, z: 0.15, vz: 0.35, zg: -0.1, mass: 2.4, layer: 'world', shadow: 0,
  ramp: RAMP_LITTER, sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.15, 1, 0.8, 1, 1, 0]),
};

/** A stitch: a green thread yanking shut at chest height. */
const STITCH: BurstOpts = {
  shape: 'lick', speed: 0.35, speedVar: 0.4, life: 0.5, lifeVar: 0.2, size: 0.27, sizeVar: 0.25,
  gravity: 0, z: 0.7, vz: 0.5, zg: -0.2, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_STITCH, sizeCurve: FLARE, alphaCurve: FADE_OUT, core: KNOT, coreK: 0.4,
};

/** The knot-pop: a white glint where the stitch closes. */
const KNOT_POP: BurstOpts = {
  shape: 'glint', speed: 0.3, speedVar: 0.5, life: 0.35, size: 0.09, gravity: 0, z: 0.8, vz: 0.4, zg: 0,
  layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: FLARE,
};

/** A spent leaf: one per stitch, dropping from the chest to lie seven seconds. */
const SPENT_LEAF: BurstOpts = {
  shape: 'shard', speed: 0.2, speedVar: 0.5, life: 7, lifeVar: 0.1, size: 0.075, sizeVar: 0.2,
  gravity: 0, spin: 3, z: 0.8, vz: 0.1, zg: 2.4, land: 'settle', layer: 'world',
  wave: 'sine', waveHz: 1.4, waveAmp: 0.3, ramp: rampOf({ stops: [LITTER, LITTER_DARK], at: [0, 0.85] }),
  sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 5,
};

/** Growth haze: fresh green motes breathing off the working. */
const GROWTH: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.16, sizeVar: 0.3,
  gravity: 0, drag: 1.0, z: 0.2, vz: 0.4, zg: -0.05, layer: 'world', shadow: 0, spin: 0.3,
  ramp: rampOf({ stops: [LEAF_BRIGHT, LEAF, LEAF_DEEP], at: [0, 0.5, 0.9], steps: 4 }), sizeCurve: SWELL, alphaCurve: MIST,
};

export const foesKnit: EffectDef = {
  id: 'foes.knit',
  name: 'Foes — knit',
  story: 'the ground gives one root heartbeat → leaf litter spirals INTO the body on a pull (matter flowing inward means interrupt it) → five green stitches yank shut one per beat, each with a white knot-pop → every stitch drops one spent leaf at the feet, five leaves lying seven seconds',
  layers: [
    { kind: 'burst', name: 'root heartbeat', recipe: recipe([LEAF_BRIGHT, LEAF], ROOT_RING), count: 1, tier: 'hero' },
    { kind: 'field', name: 'the draw', field: { kind: 'attract', radius: 1.7, strength: 5.5, dur: 2.0, attack: 0.05, release: 0.3 } },
    { kind: 'field', name: 'the turn', field: { kind: 'vortex', radius: 1.6, strength: 2.4, dur: 2.0, attack: 0.1, release: 0.3 } },
    { kind: 'burst', name: 'litter in', recipe: recipe([LITTER, LEAF_DEEP, LEAF], LEAF_IN), count: 14, tier: 'body', arrange: 'rim', radius: 1.3, outward: -1.2 },
    { kind: 'burst', name: 'litter in II', recipe: recipe([LITTER, LEAF], LEAF_IN), count: 10, tier: 'body', arrange: 'rim', radius: 1.2, outward: -1.1, at: 0.45 },
    { kind: 'burst', name: 'stitches', recipe: recipe([LEAF_BRIGHT, KNOT], STITCH), count: 3, tier: 'hero', at: 0.15, every: 0.15, times: 4 },
    { kind: 'burst', name: 'knot pops', recipe: recipe([KNOT, LEAF_BRIGHT], KNOT_POP), count: 3, tier: 'fine', at: 0.2, every: 0.15, times: 4 },
    { kind: 'burst', name: 'spent leaves', recipe: recipe([LITTER, LITTER_DARK], SPENT_LEAF), count: 1, tier: 'hero', at: 0.22, every: 0.15, times: 4 },
    { kind: 'emit', name: 'growth haze', arrange: 'disc', radius: 0.28, dz: 0.3, at: 0.1, rate: 10, dur: 1.2, attack: 0.1, release: 0.5, tier: 'body',
      pops: [{ colors: [LEAF_BRIGHT, LEAF], opts: GROWTH }] },
    { kind: 'glow', name: 'green glow', r: 1.1, rgb: '120, 200, 100', a: 0.14, dur: 1.2, attack: 0.1, release: 0.6, flicker: 0.2, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// foes.grave_light — THE DOOR AJAR (grave_mist)
// ---------------------------------------------------------------------------

const TOMB_LIGHT = '#e4f3ff';
const TOMB_PALE = '#b8dcf2';
const TOMB_ICE = '#8ac4e8';
const FERN = '#eef7fc';

const RAMP_TOMB = rampOf({ stops: [TOMB_LIGHT, TOMB_PALE, TOMB_ICE], at: [0, 0.55, 0.92], steps: 4 });
const RAMP_TOMB_FOG = rampOf({ stops: [TOMB_PALE, '#dce9f0', TOMB_ICE], at: [0, 0.5, 0.95], steps: 4 });

/** The slab of spilled light lying across the ground. */
const SLAB: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 1.1, lifeVar: 0.1, size: 1.05, sizeVar: 0.15, gravity: 0, layer: 'ground',
  ramp: RAMP_TOMB, sizeCurve: curveOf([0, 0.55, 0.12, 1, 1, 1.06]), alphaCurve: SLAB_A,
};

/** The threshold: a pale ring that races out as the door creaks. */
const THRESHOLD: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [TOMB_LIGHT, TOMB_PALE, TOMB_ICE], at: [0, 0.45, 0.85] }),
  sizeCurve: curveOf([0, 0.4, 0.6, 3.0, 1, 3.6]), alphaCurve: curveOf([0, 0.9, 0.5, 0.6, 1, 0]),
};

/** The fog bank rolling off the slab's far edge — few, big, sinking. */
const FOG_BANK: BurstOpts = {
  shape: 'mote', speed: 0.35, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.44, sizeVar: 0.25,
  gravity: 0, drag: 0.8, z: 0.2, vz: 0, zg: 0.18, layer: 'world', shadow: 0, spin: 0.25, mass: 0.6,
  ramp: RAMP_TOMB_FOG, sizeCurve: SWELL, alphaCurve: MIST, wave: 'noise', waveHz: 0.5, waveAmp: 0.22,
};

/** A hoarfrost fern: a streak etched out from the slab's long side, lying eight seconds. */
const FERN_ETCH: BurstOpts = {
  shape: 'streak', speed: 0.09, speedVar: 0.3, life: 8, lifeVar: 0.1, size: 0.11, sizeVar: 0.3,
  gravity: 0, layer: 'ground', shadow: 0, ramp: rampOf({ stops: [FERN, TOMB_PALE, TOMB_ICE], at: [0, 0.6, 0.95], steps: 3 }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.05, 0.9, 0.85, 0.9, 1, 0]),
};

/** The standing curtain of light at the hinge. */
const CURTAIN: BurstOpts = {
  shape: 'lick', speed: 0.08, speedVar: 0.5, life: 0.8, lifeVar: 0.3, size: 0.3, sizeVar: 0.3,
  gravity: 0, z: 0.05, vz: 0.5, zg: -0.15, layer: 'world', shadow: 0, flicker: 0.15,
  ramp: RAMP_TOMB, sizeCurve: curveOf('dwindle'), alphaCurve: FADE_LATE, core: '#ffffff', coreK: 0.3,
};

/** Spectres: pale motes rising slow off the light. */
const SPECTRE: BurstOpts = {
  shape: 'mote', speed: 0.08, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.14, sizeVar: 0.3,
  gravity: 0, drag: 0.6, z: 0.1, vz: 0.35, zg: -0.02, layer: 'world', shadow: 0,
  wave: 'sine', waveHz: 0.8, waveAmp: 0.18, ramp: RAMP_TOMB, sizeCurve: SWELL, alphaCurve: MIST,
};

/** Glints winking in the grave-light. */
const TOMB_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.1, life: 0.9, lifeVar: 0.4, size: 0.07, gravity: 0, z: 0.03,
  layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: curveOf('pulse'),
};

/** The cold floor: frost bed squares that crust the dirt. */
const COLD_BED: BurstOpts = {
  shape: 'square', speed: 0.04, life: 0.9, lifeVar: 0.4, size: 0.075, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [TOMB_LIGHT, TOMB_PALE, TOMB_ICE], at: [0, 0.4, 0.8] }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.15, 0.85, 0.7, 0.85, 1, 0]), mark: 'frost', markLife: 6,
};

export const foesGraveLight: EffectDef = {
  id: 'foes.grave_light',
  name: 'Foes — grave light',
  story: 'a slab of pale grave-light spills across the ground and a threshold ring races out → a bank of true fog rolls off its far edge and sinks → a curtain of light leans at the hinge, spectres rise off it, glints wink → hoarfrost ferns etch out from its long side and the frost bed crusts the floor — the ferns lie eight seconds where the light fell',
  layers: [
    { kind: 'burst', name: 'the slab', recipe: recipe([TOMB_LIGHT, TOMB_PALE], SLAB), count: 3, tier: 'hero', arrange: 'disc', radius: 0.35, radiusK: 0.35 },
    { kind: 'burst', name: 'threshold', recipe: recipe([TOMB_LIGHT, TOMB_PALE], THRESHOLD), count: 1, tier: 'hero' },
    { kind: 'field', name: 'cold falls', field: { kind: 'wind', radius: 2.0, strength: 0.4, dur: 2.4, dir: 0.6, attack: 0.2, release: 0.6 }, radiusK: 1.2 },
    { kind: 'burst', name: 'fog bank', recipe: recipe([TOMB_PALE, '#dce9f0'], FOG_BANK), count: 10, tier: 'body', arrange: 'rim', radius: 0.8, radiusK: 0.8, outward: 0.45 },
    { kind: 'burst', name: 'ferns', recipe: recipe([FERN, TOMB_PALE], FERN_ETCH), count: 6, tier: 'hero', arrange: 'rim', radius: 0.55, radiusK: 0.55, outward: 0.09, at: 0.2 },
    { kind: 'emit', name: 'curtain', arrange: 'disc', radius: 0.22, radiusK: 0.22, rate: 8, dur: 2.0, attack: 0.15, release: 0.6, tier: 'body',
      pops: [{ colors: [TOMB_LIGHT, TOMB_PALE], opts: CURTAIN }] },
    { kind: 'emit', name: 'spectres', arrange: 'disc', radius: 0.6, radiusK: 0.6, dz: 0.05, at: 0.2, rate: 9, dur: 2.2, attack: 0.3, release: 0.7, tier: 'fine',
      pops: [{ colors: [TOMB_LIGHT, TOMB_PALE], opts: SPECTRE }] },
    { kind: 'burst', name: 'glints', recipe: recipe([TOMB_LIGHT, '#ffffff'], TOMB_GLINT), count: 4, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.3, every: 0.3, times: 5 },
    { kind: 'burst', name: 'cold floor', recipe: recipe([TOMB_PALE, TOMB_ICE], COLD_BED), count: 6, tier: 'hero', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.4 },
    { kind: 'glow', name: 'grave glow', r: 1.3, rgb: '150, 208, 240', a: 0.2, dur: 2.4, attack: 0.1, release: 0.8, radiusK: 1 },
  ],
};

export const FOES_EFFECTS: EffectDef[] = [foesSilk, foesBoneRise, foesKnit, foesGraveLight];

// ---------------------------------------------------------------------------
// THE PLANS — one per ability id in fxSigsFoes.ts.
// ---------------------------------------------------------------------------

export const FOES_PLANS: Record<string, AbilityPlan> = {
  // THE STAKED TORCH (blast r1.8): the brand plants as a burst at the heart, the
  // burn runs OUT to the rim as a burning floor whose ember bed chars the
  // skeleton of the ring, and the brand keeps smoking after.
  cinder_ring: { cues: [
    { id: 'fire.burst', scale: 0.9 },
    { id: 'fire.floor', at: 0.22, scale: 1.3, radiusK: 0.95 },
    { id: 'smoke.wisp', at: 1.2, scale: 0.6 },
  ] },
  // THE PUFFBALL CLOCK (field r2.0, 4.5 s, pulse 750 ms): the seed bursts, the
  // mother's pool spreads and keeps bubbling, and on the field's own pulse a
  // station POPS into a true venom cloud — count the pops, count the seconds.
  miasma_ring: { cues: [
    { id: 'venom.burst', scale: 0.7 },
    { id: 'venom.pool', at: 0.1, scale: 1.2, radiusK: 0.75 },
    { id: 'venom.cloud', at: 0.4, scale: 0.75, radiusK: 0.9, every: 0.75 },
  ] },
  // THE DOOR AJAR (field r2.2, 4 s, pulse 1 s): the grave-light slab re-speaks
  // one notch wider on every pulse (ferns, fog bank, cold floor); a cold fog
  // rolls with it so the standing zone never goes quiet.
  grave_mist: { cues: [
    { id: 'foes.grave_light', scale: 1.3, radiusK: 1, every: 1.0 },
    { id: 'frost.fog', at: 0.3, scale: 0.9, radiusK: 0.8, every: 1.0 },
  ] },
  // THE PITCHED NET (field r1.6, 3.5 s): silk thrown and staked, ratcheting on
  // its own half-second beats inside the effect; one small slam is the pitch
  // landing. The painted tent is drawing and stays.
  web_snare: { cues: [
    { id: 'foes.silk', scale: 1.5, radiusK: 1 },
    { id: 'dust.slam', scale: 0.45 },
  ] },
  // THE MOWN CRESCENT (arc range 2.3): the set feet grind grit, then the cut
  // itself — a wide bleed aimed down the swing. The steel is paint.
  reaping_sweep: { cues: [
    { id: 'dust.kick', scale: 0.8 },
    { id: 'blood.hit', at: 0.1, scale: 1.1 },
  ] },
  // THE FIVE STITCHES (buff): the knit — litter drawn in, five stitches on a
  // count, five spent leaves at the feet. Nothing else; a working, not a blow.
  gnawed_mending: { cues: [
    { id: 'foes.knit', scale: 1.1 },
  ] },
  // THE TWO GRAVES OPEN (summon r1.4): the two mounds burst in sequence inside
  // the effect (bone fountain, soil ring, grave breath) and a low dark veil
  // hangs where the chanter stood — the necromancy's own weather.
  raise_the_fallen: { cues: [
    { id: 'foes.bone_rise', scale: 1.3 },
    { id: 'shadow.veil', at: 0.1, scale: 0.6, radiusK: 0.5 },
  ] },
  // THE RIBCAGE RING (nova r2.4): the white crack and cold mass at the planted
  // blade, ice spears standing up round the rim (the ribs) and riming where
  // they stood, a sinking fog for the aftermath. Big — a champion's word.
  marrow_chill: { cues: [
    { id: 'frost.nova', scale: 1.5 },
    { id: 'frost.shards', at: 0.15, scale: 1.3, radiusK: 0.85 },
    { id: 'frost.fog', at: 0.9, scale: 0.8, radiusK: 0.7 },
  ] },
  // THE PEELED ROAD (dash): the furrow torn along the path, then at the far
  // door the bite — blood thrown forward past it — and the landing's dust
  // where the beast comes down beyond you.
  rending_lunge: { cues: [
    { id: 'dust.gouge', scale: 1.1 },
    { id: 'blood.hit', atFar: true, at: 0.28, scale: 1.3 },
    { id: 'dust.kick', atFar: true, at: 0.34, scale: 0.9 },
  ] },
  // THE BRAKE-FLARE (dash): the smallest foe's smallest voice — a breath of dusk
  // on the folded wings at launch, one honest wound at the brake.
  shrilling_dart: { cues: [
    { id: 'shadow.burst', scale: 0.4 },
    { id: 'blood.hit', atFar: true, at: 0.3, scale: 0.55 },
  ] },
  // THE HARBOR CLOSES (arc range 1.7): the jaws meet in one white clap of cold
  // spray; the cold arrives with it (chill), and the crushed band steams after.
  breakwater_grip: { cues: [
    { id: 'water.splash', at: 0.08, scale: 1.4 },
    { id: 'frost.nova', at: 0.12, scale: 0.6 },
    { id: 'water.mist', at: 0.5, scale: 0.7, radiusK: 0.5 },
  ] },
  // THE BANK ANSWERS (blast r3.2): the pool claps at the king, rain rides the
  // croak, and a standing mist reaches the rim where the fins stood up.
  shoal_call: { cues: [
    { id: 'water.splash', scale: 1.5 },
    { id: 'water.rain', at: 0.2, scale: 0.7, radiusK: 0.5 },
    { id: 'water.mist', at: 0.5, scale: 0.9, radiusK: 0.9 },
  ] },
  // IT IS NOT A REQUEST (blast r3.2): the note made visible — one drilled smoke
  // hoop — then the STAMP: one boot-fall of dust and a rolling wall to the rim.
  warlord_horn: { cues: [
    { id: 'smoke.ring', scale: 1.1 },
    { id: 'dust.slam', at: 0.05, scale: 1.6 },
    { id: 'dust.billow', at: 0.25, scale: 0.9 },
  ] },
  // THE POOL THAT PULLS (field r2.6, 4.5 s, pulse 1 s): a standing spray that
  // re-speaks on the pulse, and a clap on every pulse where the drowned air
  // gets out — the surface swallowing on the server's own clock.
  drowning_surge: { cues: [
    { id: 'water.mist', scale: 1.1, radiusK: 0.9, every: 1.0 },
    { id: 'water.splash', at: 0.15, scale: 0.8, every: 1.0 },
  ] },
  // THE TRENCH SPEAKS ONCE (beam, half-width 0.3, range 9): the pressured jet
  // leaves the trident, the terminus takes the whole trench (splash, a
  // standing mist, the chill of deep water) — the far end is the consequence.
  abyssal_jet: { cues: [
    { id: 'water.jet', scale: 1.7 },
    { id: 'water.splash', atFar: true, at: 0.15, scale: 1.5 },
    { id: 'water.mist', atFar: true, at: 0.4, scale: 0.8, radiusK: 3 },
    { id: 'frost.fog', atFar: true, at: 0.6, scale: 0.5, radiusK: 2.5 },
  ] },
  // THE THRONE'S PLUMBING (nova r2.4 × 3 pulses): each pulse is a geyser —
  // the column's splash and the rain falling back over the ring; three
  // pulses overlap into one erupting pool.
  kingspool_geyser: { cues: [
    { id: 'water.splash', scale: 1.8 },
    { id: 'water.rain', at: 0.2, scale: 1.0, radiusK: 0.8 },
  ] },
  // THE COURT WAS ALWAYS HERE (summon r1.4): water stands first — a splash and
  // a standing mist round the king — then the harpoons rise through it (paint)
  // shedding a second, smaller splash.
  court_of_spears: { cues: [
    { id: 'water.splash', scale: 1.2 },
    { id: 'water.mist', at: 0.15, scale: 0.9, radiusK: 0.8 },
    { id: 'water.splash', at: 0.6, scale: 0.8 },
  ] },
  // THE EEL'S WAKE (dash): one flat splash where a standing body stopped being
  // one, the wash thrown along the lane, and the surfacing splash at the far end.
  shallows_rush: { cues: [
    { id: 'water.splash', scale: 0.7 },
    { id: 'water.jet', scale: 0.9 },
    { id: 'water.splash', atFar: true, at: 0.3, scale: 1.4 },
  ] },
  // THE BITE KEEPS (arc range 1.8): the maw closes in a wet clap; the
  // guard's crack is paint. A low mist hangs where the gulp happened.
  gullet_snap: { cues: [
    { id: 'water.splash', at: 0.08, scale: 1.3 },
    { id: 'water.mist', at: 0.4, scale: 0.6, radiusK: 0.5 },
  ] },
  // WHAT THE GULLET KEPT (blast r0.55 × 5 landings): each gob is a small burst
  // and a puddle that stains — lean on purpose, five can be alive at once.
  gorge_spray: { cues: [
    { id: 'venom.burst', scale: 0.55 },
    { id: 'venom.pool', at: 0.2, scale: 0.6, radiusK: 1.5 },
  ] },
  // A CRATER WEARING SPRAY (dash then blast r2.3): the bank pays at the
  // departure (small), the landing is the game's biggest splash with rain
  // falling back over the ring and a mist that hangs in the crater.
  breaching_crash: { cues: [
    { id: 'water.splash', scale: 0.7 },
    { id: 'water.splash', atFar: true, at: 0.05, scale: 1.8 },
    { id: 'water.rain', atFar: true, at: 0.3, scale: 0.9, radiusK: 0.8 },
    { id: 'water.mist', atFar: true, at: 0.8, scale: 0.7, radiusK: 0.6 },
  ] },
  // THE GROUND REMEMBERS BEING ROCK (blast r1.4): the seat greys over in one
  // slam, the crown of crust stands up (the golems' masonry, smaller), and on
  // the late beat it crumbles to a rolling dust.
  stone_gaze: { cues: [
    { id: 'dust.slam', scale: 0.7 },
    { id: 'golems.masonry', at: 0.1, scale: 0.8, radiusK: 0.8 },
    { id: 'dust.billow', at: 0.9, scale: 0.7 },
  ] },
};
