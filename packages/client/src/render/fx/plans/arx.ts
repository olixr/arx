/**
 * ARX — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in ARX_EFFECTS and register through the
 * library index.
 *
 * The roster: fxSigsArx.ts (eleven set-pieces of the caster school)
 * and fxSigsArxBreath.ts (THE BREATH BETWEEN RUNGS — five casted, five
 * channeled). Every plan below was reasoned from the ability's mechanic
 * (shape / reach / status) and its signature's story; the painted
 * centerpiece (rails, discs, doors, candles) stays the signature's,
 * the MATTER is the library's. Where the library had no voice for the
 * story — a wind that leaves no mark, a silver moon, a visitor from
 * the far sky — the effect is authored here under the library's laws.
 *
 * Wire kinds (from the server's shape executors):
 *   chain_zap → 'bolt' per hop (x→x2) · dash_strike/blink → 'warp'
 *   (x = the door left, x2 = the door arrived) · ground_aoe → 'blast'
 *   at the fuse (channeled: one per beat) · beam → 'beam' (x→x2; one
 *   per beat when channeled) · nova → 'nova' (one per beat when
 *   channeled) · projectile_fan → 'blast' at each wound · ground_field
 *   → 'field' for fieldTicks · self_buff → 'buff' · summon → 'summon'.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { SAND, LOAM, SHADE, DEEP as EARTH } from '../library/dust.js';

// ===========================================================================
// Roster-only effects
// ===========================================================================

const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const BLOOM = curveOf('bloom');
const FLARE = curveOf('flare');
const SWELL = curveOf('swell');
const MIST_A = curveOf('mist');
const SOLID = curveOf('solid');

// ---------------------------------------------------------------------------
// arx.gust — WINDSHEAR, "the bent field". The one art in the wave that
// leaves no mark, on purpose: a gust front rings out, torn leaves fly
// spinning over the ring on true height and DIE where they land (no
// fleck), two mint crests break away, a pale wind-haze is shoved
// outward by a repel field and thins, and the air settles. Palette is
// the ability's face (VERDANT mint): mid #c2e8c8, deep #4a7a62, spark
// #f4fff6, with the meadow's own leaf greens for the torn matter.
// ---------------------------------------------------------------------------

const GUST_WHITE = '#f4fff6';
const GUST_MINT = '#c2e8c8';
const GUST_PALE = '#9fd4b0';
const GUST_DEEP = '#4a7a62';
const LEAF_LIGHT = '#8fc46a';
const LEAF = '#5f9a44';
const LEAF_DARK = '#3d6a30';
const GUST_GLOW = '196, 232, 200';

const RAMP_CREST = rampOf({ stops: [GUST_WHITE, GUST_MINT, GUST_PALE, GUST_DEEP], at: [0, 0.3, 0.65, 0.92] });
const RAMP_LEAF = rampOf({ stops: [LEAF_LIGHT, LEAF, LEAF_DARK], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_HAZE = rampOf({ stops: [GUST_MINT, GUST_PALE, GUST_DEEP], at: [0, 0.5, 0.92], steps: 4 });

/** The gust front — a mint pressure ring racing to the ring's edge. */
const GUST_FRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.04, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: RAMP_CREST, ringWidth: 0.07,
  sizeCurve: curveOf([0, 0.3, 0.5, 3.2, 1, 4.4]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** A torn leaf: a shard flung outward, spinning, that dies on the grass without a mark. */
const TORN_LEAF: BurstOpts = {
  shape: 'shard', align: false, speed: 2.4, speedVar: 0.45, life: 1.4, lifeVar: 0.3, size: 0.11, sizeVar: 0.3,
  gravity: 0, drag: 1.1, spin: 11, z: 0.2, vz: 2.4, zg: 4.5, mass: 1.6, land: 'die', layer: 'world', shadow: 0.4,
  ramp: RAMP_LEAF, sizeCurve: HOLD, alphaCurve: SOLID,
  wave: 'noise', waveHz: 2.4, waveAmp: 0.5,
};

/** Leaf fines — small torn bits riding the front, no residue. */
const LEAF_FINE: BurstOpts = {
  ...TORN_LEAF, size: 0.05, sizeVar: 0.3, speed: 2.9, speedVar: 0.5, life: 0.9, vz: 1.6, zg: 4, spin: 16, shadow: 0, mass: 2.2,
};

/** The wind-haze — pale masses shoved outward and thinning. */
const WIND_HAZE: BurstOpts = {
  shape: 'mote', speed: 2.0, speedVar: 0.4, life: 0.85, lifeVar: 0.3, size: 0.34, sizeVar: 0.3,
  gravity: 0, drag: 2.2, z: 0.12, vz: 0.35, zg: 0.3, mass: 1.0, layer: 'world', shadow: 0, spin: 0.5,
  ramp: RAMP_HAZE, sizeCurve: curveOf([0, 0.5, 0.3, 1, 0.75, 0.95, 1, 0.45]), alphaCurve: curveOf([0, 0.55, 0.2, 0.62, 0.7, 0.4, 1, 0]),
  wave: 'noise', waveHz: 1.8, waveAmp: 0.3,
};

/** Grass-dust glints whipped up off the bowing blades. */
const WHIP_GLINT: BurstOpts = {
  shape: 'glint', speed: 1.6, speedVar: 0.5, life: 0.6, lifeVar: 0.35, size: 0.06, gravity: 0,
  z: 0.05, vz: 1.2, zg: 2.4, mass: 1.5, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: [GUST_WHITE, GUST_MINT, GUST_PALE], at: [0, 0.4, 0.85] }), sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** The settling — a slow pale breath sinking back onto the grass. */
const SETTLE_POPS: EmitterPop[] = [
  { colors: [GUST_MINT, GUST_PALE], opts: { ...WIND_HAZE, speed: 0.3, drag: 1.0, life: 1.1, size: 0.2, sizeVar: 0.25, vz: -0.05, zg: 0.2, mass: 0.3, alphaCurve: curveOf([0, 0, 0.25, 0.3, 0.6, 0.26, 1, 0]) }, weight: 1.6, tier: 'body' },
  { colors: [LEAF, LEAF_DARK], opts: { ...LEAF_FINE, speed: 0.5, vz: 0.4, zg: 2.5, life: 0.8, mass: 0.4 }, weight: 0.6, tier: 'fine' },
];

export const arxGust: EffectDef = {
  id: 'arx.gust',
  name: 'Arx — gust (windshear)',
  story: 'the sky is handed back all at once: a mint front rings out to the edge, the wind-haze is shoved outward and thins, torn leaves fly spinning over the ring on true height and die where they land, glints whip off the bowing blades, a second crest breaks away, and the air settles — no mark, on purpose',
  layers: [
    { kind: 'field', name: 'the front', field: { kind: 'attract', radius: 2.6, strength: -5.5, dur: 0.6, attack: 0.02, release: 0.25 }, radiusK: 1.1 },
    { kind: 'burst', name: 'gust front', recipe: recipe([GUST_WHITE, GUST_MINT], GUST_FRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'wind-haze', recipe: recipe([GUST_MINT, GUST_PALE, GUST_WHITE], WIND_HAZE), count: 12, tier: 'body', arrange: 'rim', radius: 0.2, outward: 1.6, dz: 0.05 },
    { kind: 'burst', name: 'torn leaves', recipe: recipe([LEAF_LIGHT, LEAF, LEAF_DARK], TORN_LEAF), count: 9, tier: 'hero', arrange: 'disc', radius: 0.35, radiusK: 0.35 },
    { kind: 'burst', name: 'leaf fines', recipe: recipe([LEAF_LIGHT, LEAF], LEAF_FINE), count: 18, tier: 'fine', arrange: 'disc', radius: 0.4, radiusK: 0.4 },
    { kind: 'burst', name: 'whipped glints', recipe: recipe([GUST_WHITE, GUST_MINT], WHIP_GLINT), count: 12, tier: 'fine', arrange: 'ring', radius: 0.7, radiusK: 0.7, at: 0.06 },
    { kind: 'burst', name: 'second crest', recipe: recipe([GUST_MINT, GUST_PALE], { ...GUST_FRONT, life: 0.5, size: 0.4, sizeCurve: curveOf([0, 0.5, 0.6, 3.0, 1, 3.8]) }), count: 1, tier: 'hero', at: 0.16 },
    { kind: 'burst', name: 'outer leaves', recipe: recipe([LEAF, LEAF_DARK], { ...TORN_LEAF, speed: 1.6, size: 0.09, life: 1.2, vz: 1.8 }), count: 7, tier: 'body', arrange: 'ring', radius: 1.0, radiusK: 1.0, at: 0.14 },
    { kind: 'burst', name: 'far haze', recipe: recipe([GUST_PALE, GUST_DEEP], { ...WIND_HAZE, speed: 1.2, size: 0.28, life: 0.7 }), count: 8, tier: 'body', arrange: 'rim', radius: 1.1, radiusK: 1.1, outward: 1.2, at: 0.2 },
    { kind: 'emit', name: 'the air settles', arrange: 'disc', radius: 0.9, radiusK: 0.9, dz: 0.3, at: 0.5, rate: 10, dur: 1.0, attack: 0.15, release: 0.5, tier: 'body', pops: SETTLE_POPS },
    { kind: 'glow', name: 'mint light', r: 2.0, rgb: GUST_GLOW, a: 0.16, dur: 0.5, attack: 0.02, release: 0.35, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// arx.moonrise — MOONRISE, "the early moon". A silver disc climbs out
// of the ring's horizon and hangs; the ground below turns to a moonlit
// glade — a pale rim, moonflowers opening as ground glints, silver dew
// that RIMES the grass (chill) — while moths drift in slow orbits
// around the light. The moon fades last. Palette is the face: mid
// #d8e2f8, deep #46548a, spark #ffffff, glow 190,205,250.
// ---------------------------------------------------------------------------

const MOON_WHITE = '#ffffff';
const MOON_SILVER = '#eef2ff';
const MOON_PALE = '#d8e2f8';
const MOON_BLUE = '#9fb0e0';
const MOON_DEEP = '#46548a';
const MOON_GLOW = '190, 205, 250';

const RAMP_MOON = rampOf({ stops: [MOON_WHITE, MOON_SILVER, MOON_PALE, MOON_BLUE], at: [0, 0.55, 0.85, 1], steps: 5 });
const RAMP_GLADE = rampOf({ stops: [MOON_PALE, MOON_BLUE, MOON_DEEP], at: [0, 0.5, 0.92], steps: 4 });
const RAMP_MOTH = rampOf({ stops: [MOON_SILVER, MOON_PALE, MOON_BLUE], at: [0, 0.5, 0.9] });

/** The moon itself: one big silver blob climbing slowly, holding, fading last. */
const MOON: BurstOpts = {
  shape: 'mote', speed: 0, life: 3.2, lifeVar: 0.05, size: 0.7, sizeVar: 0.04, gravity: 0,
  z: 0.6, vz: 0.42, zg: 0.16, layer: 'world', shadow: 0, spin: 0,
  ramp: RAMP_MOON, core: MOON_WHITE, coreK: 0.62,
  sizeCurve: curveOf([0, 0.35, 0.25, 1, 0.8, 1, 1, 0.75]), alphaCurve: curveOf([0, 0, 0.12, 1, 0.78, 1, 1, 0]),
};

/** The halo — a wide pale ring standing under the moon on the ground: the ring's horizon. */
const HORIZON: BurstOpts = {
  shape: 'ring', speed: 0, life: 2.8, lifeVar: 0.05, size: 1.0, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_GLADE, ringWidth: 0.05,
  sizeCurve: curveOf([0, 0.5, 0.2, 1, 1, 1.05]), alphaCurve: curveOf([0, 0, 0.15, 0.85, 0.7, 0.7, 1, 0]),
};

/** Moonlight lanes — pale ground motes lighting the glade beneath. */
const GLADE_LIGHT: BurstOpts = {
  shape: 'mote', speed: 0.05, life: 2.4, lifeVar: 0.3, size: 0.4, sizeVar: 0.3, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [MOON_PALE, MOON_BLUE], at: [0, 0.9] }),
  sizeCurve: curveOf([0, 0.5, 0.3, 1, 1, 0.9]), alphaCurve: curveOf([0, 0, 0.2, 0.3, 0.75, 0.28, 1, 0]),
};

/** Moonflowers — ground glints that bloom open where the light falls. */
const MOONFLOWER: BurstOpts = {
  shape: 'glint', speed: 0.02, life: 1.6, lifeVar: 0.4, size: 0.13, sizeVar: 0.3, gravity: 0, z: 0.03,
  layer: 'world', shadow: 0, flicker: 0.2, ramp: rampOf({ stops: [MOON_WHITE, MOON_PALE, MOON_BLUE], at: [0, 0.5, 0.9] }),
  sizeCurve: BLOOM, alphaCurve: FADE_LATE,
};

/** Silver dew — fines that settle and RIME the grass: the chill the moon lays down. */
const DEW: BurstOpts = {
  shape: 'square', speed: 0.3, speedVar: 0.5, life: 1.1, lifeVar: 0.4, size: 0.055, sizeVar: 0.3, gravity: 0,
  z: 0.5, vz: -0.2, zg: 1.4, land: 'die', layer: 'world', shadow: 0, flicker: 0.4,
  ramp: rampOf({ stops: [MOON_SILVER, MOON_PALE, MOON_BLUE], at: [0, 0.4, 0.85] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'frost', markLife: 4,
};

/** Moths — pale glints drifting in slow orbits around the light, breathing on z. */
const MOTH: BurstOpts = {
  shape: 'glint', speed: 0.06, speedVar: 0.4, life: 1.5, lifeVar: 0.3, size: 0.07, sizeVar: 0.25, gravity: 0, drag: 0.2,
  layer: 'world', shadow: 0, flicker: 0.55, ramp: RAMP_MOTH, sizeCurve: curveOf('pulse'), alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.1, waveAmp: 0.32, waveAxis: 'z', jitter: 1.2,
};

/** The limb-shine — glints on the moon's edge as it climbs. */
const LIMB: BurstOpts = {
  shape: 'glint', speed: 0.04, life: 0.7, lifeVar: 0.3, size: 0.08, gravity: 0, layer: 'world', shadow: 0, flicker: 0.5,
  vz: 0.4, zg: 0, ramp: rampOf({ stops: [MOON_WHITE, MOON_SILVER] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

const MOTH_POPS: EmitterPop[] = [
  { colors: [MOON_SILVER, MOON_PALE], opts: MOTH, weight: 1.6, tier: 'body' },
  { colors: [MOON_PALE, MOON_BLUE], opts: { ...MOTH, size: 0.05, life: 1.2, waveAmp: 0.4 }, weight: 1, tier: 'fine' },
];

export const arxMoonrise: EffectDef = {
  id: 'arx.moonrise',
  name: 'Arx — moonrise',
  story: 'the moon is brought up early: a silver disc climbs out of the ring\'s horizon and hangs, the ground below turns to a moonlit glade — a pale rim, moonflowers opening as the light falls — silver dew settles and rimes the grass, moths drift in slow orbits around the light, and the moon fades last',
  layers: [
    { kind: 'burst', name: 'horizon', recipe: recipe([MOON_PALE, MOON_BLUE], HORIZON), count: 1, tier: 'hero', radiusK: 1 },
    { kind: 'burst', name: 'the moon', recipe: recipe([MOON_WHITE, MOON_SILVER], MOON), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'moon body', recipe: recipe([MOON_SILVER, MOON_PALE], { ...MOON, size: 0.56, z: 0.56, life: 3.0, coreK: 0.4 }), count: 2, tier: 'hero', arrange: 'disc', radius: 0.04 },
    { kind: 'burst', name: 'glade light', recipe: recipe([MOON_PALE, MOON_BLUE], GLADE_LIGHT), count: 8, tier: 'body', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.1 },
    { kind: 'burst', name: 'limb shine', recipe: recipe([MOON_WHITE, MOON_SILVER], LIMB), count: 5, tier: 'fine', arrange: 'ring', radius: 0.3, dz: 0.9, at: 0.3, every: 0.35, times: 5 },
    { kind: 'burst', name: 'moonflowers', recipe: recipe([MOON_WHITE, MOON_PALE], MOONFLOWER), count: 4, tier: 'hero', arrange: 'disc', radius: 0.95, radiusK: 0.95, at: 0.35, every: 0.4, times: 5 },
    { kind: 'burst', name: 'silver dew', recipe: recipe([MOON_SILVER, MOON_PALE], DEW), count: 3, tier: 'hero', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.5, every: 0.5, times: 4 },
    { kind: 'emit', name: 'moths', arrange: 'orbit', radius: 0.55, dz: 0.9, at: 0.5, rate: 14, dur: 2.2, attack: 0.4, release: 0.7, orbitSpeed: 1.6, tier: 'body', pops: MOTH_POPS },
    { kind: 'emit', name: 'counter moths', arrange: 'orbit', radius: 0.38, dz: 1.15, at: 0.8, rate: 7, dur: 1.9, attack: 0.4, release: 0.6, orbitSpeed: -1.1, tier: 'fine',
      pops: [{ colors: [MOON_PALE, MOON_BLUE], opts: { ...MOTH, size: 0.055, waveAmp: 0.45 }, tier: 'fine' }] },
    { kind: 'glow', name: 'moonlight', r: 2.2, rgb: MOON_GLOW, a: 0.3, dur: 3.2, attack: 0.5, release: 1.0, dz: 0.9, radiusK: 1 },
    { kind: 'glow', name: 'glade glow', r: 1.6, rgb: MOON_GLOW, a: 0.14, at: 0.3, dur: 2.6, attack: 0.4, release: 0.9, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// arx.cometfall — COMETFALL, "the visitor". One guest from very far
// away: a teal-white head drags a violet-flecked tail down the whole
// sky, lands in a burst star, throws ejecta, and leaves STAR-GLASS
// standing in the cracked ring — shards that glimmer and go dark one
// by one. Palette is the face: mid #9ae8de, deep #2a6a7a, spark
// #e8b0ff (the violet tail), glow 154,232,222.
// ---------------------------------------------------------------------------

const COMET_WHITE = '#f4fffd';
const COMET_TEAL = '#9ae8de';
const COMET_SEA = '#4fb3ad';
const COMET_DEEP = '#2a6a7a';
const COMET_VIOLET = '#e8b0ff';
const COMET_VIOLET_DEEP = '#8a5ab8';
const COMET_GLOW = '154, 232, 222';

const RAMP_HEAD = rampOf({ stops: [COMET_WHITE, COMET_TEAL, COMET_SEA], at: [0, 0.6, 1] });
const RAMP_TAIL = rampOf({ stops: [COMET_VIOLET, COMET_VIOLET_DEEP, COMET_DEEP], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_GLASS = rampOf({ stops: [COMET_WHITE, COMET_TEAL, COMET_TEAL, COMET_SEA, COMET_DEEP], at: [0, 0.15, 0.6, 0.85, 1], steps: 6 });
const RAMP_FLASH = rampOf({ stops: ['#ffffff', COMET_WHITE, COMET_TEAL], at: [0, 0.4, 0.85] });
const RAMP_EJECTA = rampOf({ stops: [LOAM, SHADE, EARTH], at: [0, 0.55, 0.9], steps: 4 });

/** The head: a bright streak falling from the upper air onto the point, dying on the dirt. */
const HEAD: BurstOpts = {
  shape: 'streak', speed: 0.12, speedVar: 0.1, life: 0.34, lifeVar: 0.04, size: 0.2, sizeVar: 0.1, gravity: 0,
  z: 3.4, vz: -9.5, zg: 2, land: 'die', layer: 'overlay', shadow: 0,
  ramp: RAMP_HEAD, core: '#ffffff', coreK: 0.5, sizeCurve: HOLD, alphaCurve: SOLID,
  trail: 26, trailColor: COMET_VIOLET,
};

/** The violet-flecked tail: motes shed high on the head's line, hanging in the sky. */
const TAIL: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 0.55, lifeVar: 0.3, size: 0.09, sizeVar: 0.35, gravity: 0,
  z: 2.6, vz: -5.0, zg: 1, layer: 'overlay', shadow: 0, flicker: 0.5, land: 'die',
  ramp: RAMP_TAIL, sizeCurve: curveOf('dwindle'), alphaCurve: FADE_OUT,
};

/** The burst star — the flash at arrival. */
const STAR_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.24, lifeVar: 0.1, size: 0.6, sizeVar: 0.2, gravity: 0, z: 0.15,
  layer: 'world', shadow: 0, ramp: RAMP_FLASH, core: '#ffffff', coreK: 0.5, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The crack — a teal pressure ring racing out on the ground. */
const CRACK_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.36, lifeVar: 0.04, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [COMET_WHITE, COMET_TEAL, COMET_SEA], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.35, 0.5, 2.6, 1, 3.3]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** Star-glass: shards thrown on true height that land, STAND, glimmer, and go dark one by one. */
const STAR_GLASS: BurstOpts = {
  shape: 'shard', align: false, speed: 1.4, speedVar: 0.5, life: 4.2, lifeVar: 0.45, size: 0.13, sizeVar: 0.3, gravity: 0,
  z: 0.2, vz: 2.6, zg: 8, land: 'settle', bounce: 0.2, spin: 7, layer: 'world', shadow: 0.5, flicker: 0.45,
  ramp: RAMP_GLASS, sizeCurve: curveOf([0, 1, 0.85, 1, 1, 0.6]), alphaCurve: curveOf([0, 1, 0.8, 1, 0.92, 0.35, 1, 0]),
  mark: 'fleck', markLife: 5,
};

/** Glass fines — quick teal splinters, dead on landing. */
const GLASS_FINE: BurstOpts = {
  ...STAR_GLASS, size: 0.055, speed: 2.4, speedVar: 0.6, life: 0.9, lifeVar: 0.3, vz: 2.0, zg: 7, spin: 15, land: 'die', shadow: 0, mark: undefined,
};

/** Ejecta — clods thrown long and lying in the cracked ring. */
const EJECTA: BurstOpts = {
  shape: 'square', align: true, speed: 1.8, speedVar: 0.5, life: 2.0, lifeVar: 0.3, size: 0.09, sizeVar: 0.3, gravity: 0,
  vz: 2.2, zg: 8, land: 'settle', bounce: 0.35, spin: 6, layer: 'world', shadow: 0.5,
  ramp: RAMP_EJECTA, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 4,
};

/** Dust slammed off the crater rim. */
const CRATER_DUST: BurstOpts = {
  shape: 'puff', speed: 1.3, speedVar: 0.4, life: 0.9, lifeVar: 0.3, size: 0.24, sizeVar: 0.3, gravity: 0, drag: 2.8,
  vz: 0.5, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [SAND, LOAM, SHADE], at: [0, 0.45, 0.85] }), sizeCurve: SWELL, alphaCurve: curveOf('smoke'),
};

/** Teal glimmer on the glass — glints winking where the visitor lies. */
const GLIMMER: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.5, lifeVar: 0.4, size: 0.08, gravity: 0, z: 0.08, layer: 'world', shadow: 0, flicker: 0.6,
  ramp: rampOf({ stops: [COMET_WHITE, COMET_TEAL] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The sky-wake — a violet haze hanging where the tail passed, thinning. */
const WAKE: BurstOpts = {
  shape: 'mote', speed: 0.1, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.2, sizeVar: 0.3, gravity: 0,
  z: 1.8, vz: 0.1, zg: 0, layer: 'overlay', shadow: 0,
  ramp: RAMP_TAIL, sizeCurve: SWELL, alphaCurve: MIST_A,
};

/** The head's arrival is at 0.30 s (z 3.4 at −9.5 tiles/s with zg 2). */
const ARRIVE = 0.3;

export const arxCometfall: EffectDef = {
  id: 'arx.cometfall',
  name: 'Arx — cometfall',
  story: 'a visitor from the far sky: a teal-white head drags a violet-flecked tail down the whole sky → it arrives in a burst star and a crack ring, ejecta thrown long and lying, dust off the rim → star-glass shards fly on true height, land, and STAND in the ring, glimmering and going dark one by one → the violet wake thins high above',
  layers: [
    { kind: 'burst', name: 'the head', recipe: recipe([COMET_WHITE, COMET_TEAL], HEAD), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'the tail', recipe: recipe([COMET_VIOLET, COMET_VIOLET_DEEP], TAIL), count: 9, tier: 'body', arrange: 'disc', radius: 0.1, dz: 0.7 },
    { kind: 'burst', name: 'tail lower', recipe: recipe([COMET_VIOLET, COMET_TEAL], { ...TAIL, z: 1.6, vz: -4.0, life: 0.35 }), count: 6, tier: 'fine', arrange: 'disc', radius: 0.08, at: 0.1 },
    { kind: 'burst', name: 'burst star', recipe: recipe([COMET_WHITE, '#ffffff'], STAR_FLASH), count: 3, tier: 'hero', at: ARRIVE },
    { kind: 'burst', name: 'crack ring', recipe: recipe([COMET_WHITE, COMET_TEAL], CRACK_RING), count: 1, tier: 'hero', at: ARRIVE },
    { kind: 'burst', name: 'star-glass', recipe: recipe([COMET_WHITE, COMET_TEAL], STAR_GLASS), count: 9, tier: 'hero', arrange: 'disc', radius: 0.15, at: ARRIVE },
    { kind: 'burst', name: 'glass fines', recipe: recipe([COMET_TEAL, COMET_SEA], GLASS_FINE), count: 18, tier: 'fine', at: ARRIVE, dz: 0.1 },
    { kind: 'burst', name: 'ejecta', recipe: recipe([LOAM, SHADE], { ...EJECTA, size: 0.06, sizeVar: 0.25 }), count: 4, tier: 'hero', at: ARRIVE },
    { kind: 'burst', name: 'crater dust', recipe: recipe([SAND, LOAM], CRATER_DUST), count: 10, tier: 'body', arrange: 'rim', radius: 0.25, outward: 1.4, at: ARRIVE + 0.02 },
    { kind: 'burst', name: 'second crack', recipe: recipe([COMET_TEAL, COMET_SEA], { ...CRACK_RING, life: 0.44, size: 0.35 }), count: 1, tier: 'hero', at: ARRIVE + 0.1 },
    { kind: 'burst', name: 'glimmer', recipe: recipe([COMET_WHITE, COMET_TEAL], GLIMMER), count: 3, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: ARRIVE + 0.5, every: 0.3, times: 9 },
    { kind: 'emit', name: 'sky-wake', arrange: 'disc', radius: 0.2, dz: 0.2, at: 0.05, rate: 14, dur: 0.7, attack: 0.05, release: 0.3, tier: 'fine',
      pops: [{ colors: [COMET_VIOLET, COMET_VIOLET_DEEP], opts: { ...WAKE, size: 0.14 }, tier: 'fine' }] },
    { kind: 'glow', name: 'the head\'s light', r: 1.2, rgb: COMET_GLOW, a: 0.2, dur: 0.32, attack: 0.02, release: 0.2, dz: 1.8 },
    { kind: 'glow', name: 'arrival flash', r: 2.4, rgb: COMET_GLOW, a: 0.4, at: ARRIVE, dur: 0.3, attack: 0.01, release: 0.22 },
    { kind: 'glow', name: 'glass glow', r: 1.3, rgb: COMET_GLOW, a: 0.14, at: ARRIVE + 0.3, dur: 3.2, attack: 0.1, release: 1.4, flicker: 0.5, radiusK: 0.9 },
  ],
};

export const ARX_EFFECTS: EffectDef[] = [arxGust, arxMoonrise, arxCometfall];

// ===========================================================================
// The plans
// ===========================================================================

export const ARX_PLANS: Record<string, AbilityPlan> = {
  // ------------------------------------------------------------ fxSigsArx
  // arc_bolt — chain_zap 'bolt' per hop. The seam is the arc itself
  // (storm.arc spans caster→struck on its beat); the struck body sheds
  // static: a small storm.nova at the far end.
  arc_bolt: { cues: [
    { id: 'storm.arc', scale: 1.0 },
    { id: 'storm.nova', atFar: true, at: 0.06, scale: 0.5, radiusK: 0.5 },
  ] },
  // blink — 'warp' (x = the door left, x2 = the door arrived). The
  // departure door COLLAPSES (arcane.bloom gathers the light inward and
  // seals with a flare); the arrival door cracks open (arcane.shatter
  // at the far end: heart, shock ring, glass slivers).
  blink: { cues: [
    { id: 'arcane.bloom', scale: 0.55 },
    { id: 'arcane.shatter', atFar: true, scale: 0.6 },
  ] },
  // meteor_shard — ground_aoe 'blast' r2.2, burn. The sky throws first:
  // the detonation, the ejecta thrown long and lying, the embedded stone
  // smoking as it cools, and the molten edge that keeps burning.
  meteor_shard: { cues: [
    { id: 'fire.burst', scale: 1.4 },
    { id: 'dust.slam', scale: 0.9, at: 0.04 },
    { id: 'fire.floor', at: 0.3, scale: 0.6, radiusK: 0.5 },
    { id: 'smoke.wisp', at: 0.7, scale: 0.9 },
  ] },
  // maelstrom — channeled ground_aoe, one 'blast' r2.6 per beat (×3).
  // Each beat the sea arrives: the splash crowns and rings walk out,
  // drawn spray falls back into the eye, a mist hangs over the drain.
  maelstrom: { cues: [
    { id: 'water.splash', scale: 1.3, radiusK: 0.8 },
    { id: 'water.rain', at: 0.15, scale: 0.55, radiusK: 0.6 },
    { id: 'water.mist', at: 0.3, scale: 0.7 },
  ] },
  // frost_lance — 'beam' x→x2, chill. The cold pours down the corridor
  // (frost.breath aimed from the hand), the far end is PIERCED — ice
  // spears stand where the rail struck — and the corridor floor rimes
  // over as the rail shatters into glitter and fog.
  frost_lance: { cues: [
    { id: 'frost.breath', scale: 1.0 },
    { id: 'frost.shards', atFar: true, at: 0.12, scale: 0.7, radiusK: 0.6 },
    { id: 'frost.fog', at: 0.9, scale: 0.5 },
  ] },
  // ward_shell — self_buff 'buff' (8 s shield). Quiet light builds a
  // shelter: the standing ward wakes underfoot and the halo wraps the
  // body pane by pane; the wire's radius (0.9) is not the shell's size.
  ward_shell: { cues: [
    { id: 'arcane.sigil', scale: 0.9 },
    { id: 'arcane.orbit', at: 0.15, scale: 0.85 },
  ] },
  // ember_fan — projectile_fan, a 'blast' r0.55 at each of three wounds.
  // Each finger burns where it lands: a small detonation and the
  // handprint of coals guttering on its own clock after it.
  ember_fan: { cues: [
    { id: 'fire.burst', scale: 0.7 },
    { id: 'fire.floor', at: 0.2, scale: 0.55, radiusK: 0.6 },
  ] },
  // stormcall — ground_field 'field' 5 s, r2.2, shock every 0.6 s. The
  // anvil overhead (storm.cloud re-spoken every 3 s), striking on its
  // own clock (storm.strike every 1.25 s), each strike throwing arcs
  // across the circle that scorch it (storm.nova, wide, every 2.5 s).
  stormcall: { cues: [
    { id: 'storm.cloud', scale: 1.2, every: 3.0 },
    { id: 'storm.strike', at: 0.5, scale: 0.9, every: 1.25 },
    { id: 'storm.nova', at: 0.55, scale: 0.6, radiusK: 0.8, every: 2.5 },
  ] },
  // mirror_image — 'summon' (the decoy plants where you stood). The pane
  // splits: glass slivers rain off the split and die with a glint; the
  // copy's ward firms up where it stands and holds for a breath.
  mirror_image: { cues: [
    { id: 'arcane.shatter', scale: 0.7 },
    { id: 'arcane.sigil', at: 0.05, scale: 0.6, radiusK: 0.5 },
  ] },
  // daybreak — ground_aoe 'blast' r2.4, damage 15 (the finisher). Dawn
  // delivered: the light gathers and the heart flares white with a ring
  // racing out (the risen disc), the light-lanes stripe the ground
  // (sigil), then the early morning burns off into gold dust (shatter).
  daybreak: { cues: [
    { id: 'arcane.bloom', scale: 1.7 },
    { id: 'arcane.sigil', at: 0.8, scale: 1.1, radiusK: 1 },
    { id: 'arcane.shatter', at: 2.4, scale: 0.7 },
  ] },
  // riftwalker_step — 'warp' (blink travel), damage 8 + shock at the
  // emergence. The corridor of void zips shut where you left; the exit
  // spills the dark and crackles with the shock you dragged through.
  riftwalker_step: { cues: [
    { id: 'shadow.burst', scale: 0.6 },
    { id: 'shadow.burst', atFar: true, at: 0.05, scale: 0.75 },
    { id: 'storm.nova', atFar: true, at: 0.14, scale: 0.55, radiusK: 0.5 },
  ] },

  // ------------------------------------------------------ fxSigsArxBreath
  // wickfire — projectile_fan (one lit wick), 'blast' r0.55 at the wound,
  // burn. The flame arrives still hungry and DIVIDES: the splash, then a
  // standing burn that catches, burns, and gutters out candle by candle,
  // the wax-bright ring of drips kept on the floor.
  wickfire: { cues: [
    { id: 'fire.burst', scale: 0.8 },
    { id: 'fire.plume', at: 0.3, scale: 0.7 },
    { id: 'fire.floor', at: 0.5, scale: 0.5, radiusK: 0.7 },
  ] },
  // rime_river — channeled 'beam' x→x2 per beat (×3), chill. One beat
  // of the pour: winter runs downhill from the hand, the road it crosses
  // is paved with rime, and the fog stays written downstream.
  rime_river: { cues: [
    { id: 'frost.breath', scale: 0.9 },
    { id: 'frost.fog', atFar: true, at: 0.5, scale: 0.6, radiusK: 0.7 },
  ] },
  // windshear — 'nova' r2.6, damage 11. The sky handed back all at once:
  // the roster's own gust — the front, the torn leaves that die where
  // they land, the settling air. No mark, on purpose.
  windshear: { cues: [
    { id: 'arx.gust', scale: 1.3 },
  ] },
  // stonerise — channeled ground_aoe, 'blast' r2.0 per beat (×3). The
  // ground stands up: a slam of earth as the row rises (clods flung and
  // lying), the quarry dust rolling off the teeth as they sink.
  stonerise: { cues: [
    { id: 'dust.slam', scale: 1.0 },
    { id: 'dust.billow', at: 0.3, scale: 0.55 },
  ] },
  // geyser — ground_aoe 'blast' r2.0, damage 12, chill. The deep answers:
  // the column throws a crown that falls back (splash), keeps shedding
  // real falling water for a breath (rain), and the pool's haze dries
  // last of all (mist).
  geyser: { cues: [
    { id: 'water.splash', scale: 1.5 },
    { id: 'water.rain', at: 0.3, scale: 0.9, radiusK: 0.6 },
    { id: 'water.mist', at: 0.8, scale: 0.8 },
  ] },
  // anvil_sky — channeled 'nova' r2.4 per beat (×4), shock. One beat of
  // the forge: the hammer is the bolt from straight overhead (strike),
  // and the scale it flings is the arcs racing across the glowing ring.
  anvil_sky: { cues: [
    { id: 'storm.strike', scale: 1.0 },
    { id: 'storm.nova', at: 0.08, scale: 0.7, radiusK: 1 },
  ] },
  // hollowcall — ground_aoe 'blast' r2.2, damage 12. A small nothing
  // opens and everything nearby is INVITED: the grasp draws the dark in
  // and clenches; then the hollow snaps shut (burst) and leaves the
  // stain where light kept arriving late.
  hollowcall: { cues: [
    { id: 'shadow.grasp', scale: 1.3 },
    { id: 'shadow.burst', at: 1.0, scale: 0.8, radiusK: 0.7 },
  ] },
  // burning_glass — channeled 'beam' x→x2 per beat (×3), burn. The noon
  // narrowed through the lens: one line of light (arcane.beam) that
  // ENDS IN FIRE — a detonation at the far end and the charred floor
  // that keeps embers crossing it.
  burning_glass: { cues: [
    { id: 'arcane.beam', scale: 0.9 },
    { id: 'fire.burst', atFar: true, at: 0.12, scale: 0.55 },
    { id: 'fire.floor', atFar: true, at: 0.4, scale: 0.4, radiusK: 0.5 },
  ] },
  // moonrise — 'nova' r2.4, damage 13, chill. The early moon: the
  // roster's own silver disc, glade, moths, and the dew that rimes.
  moonrise: { cues: [
    { id: 'arx.moonrise', scale: 1.3 },
  ] },
  // cometfall — channeled ground_aoe, 'blast' r2.2 per beat (×4), shock.
  // One visitor per beat: the roster's own comet — head, tail, burst
  // star, star-glass — and the shock it carries crackling out after it.
  cometfall: { cues: [
    { id: 'arx.cometfall', scale: 1.1 },
    { id: 'storm.nova', at: 0.42, scale: 0.4, radiusK: 0.55 },
  ] },
};
