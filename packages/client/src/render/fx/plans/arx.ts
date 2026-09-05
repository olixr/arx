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

// ---------------------------------------------------------------------------
// THE REACTIONS (THE MASTERED HAND, Phase 4). Arx's grammar is the
// reaction table: one spark laid, the second spark detonates it. The
// library had no voice for the DETONATION itself — the moment two
// elements meet on one body — so the school authors its three here.
// Every arx payoff that follows a spark speaks one of these on its
// onFollow; nothing in any other school may cue them.
// ---------------------------------------------------------------------------

const DWINDLE = curveOf('dwindle');
const SMOKE_A = curveOf('smoke');

// The clash palette: fire's heart and frost's core, and the steam between.
const F_HEART = '#fff3c4';
const F_BRIGHT = '#ffe9a3';
const F_FLAME = '#ffca66';
const F_EMBER = '#e8823a';
const F_COAL = '#c9541f';
const F_SOOT = '#4a4248';
const F_SMOKE = '#5a5560';
const F_SMOKE_THIN = '#7d7787';
const I_CORE = '#eaf6ff';
const I_PALE = '#b8dcf2';
const I_ICE = '#7db3d8';
const I_DEEP = '#4d7fa6';
const I_MIST = '#cfe0ea';
const S_CORE = '#f2f8ff';
const S_HOT = '#cfe8ff';
const S_CHARGE = '#9db8e8';
const S_HALO = '#6f86c9';
const STEAM = '#f7fbfc';
const FIRE_GLOW = '255, 170, 80';
const FROST_GLOW = '150, 208, 240';
const STORM_GLOW = '190, 215, 255';

// ---- arx.thermal_shock — fire meets cold. A hot ring and a cold ring
// race out of one point a beat apart, the clash flashes white, a body
// of STEAM blooms and climbs on its own lift, scald drops arc on true
// height and splat, the cracked rime skates out and lies, and a wet fog
// hangs over the spot after.
const RAMP_HOT_RING = rampOf({ stops: [F_HEART, F_FLAME, F_EMBER], at: [0, 0.5, 0.9] });
const RAMP_COLD_RING = rampOf({ stops: [I_CORE, I_PALE, I_ICE], at: [0, 0.5, 0.9] });
const RAMP_STEAM = rampOf({ stops: ['#ffffff', STEAM, I_MIST, I_PALE], at: [0, 0.3, 0.7, 0.95], steps: 5 });
const RAMP_SCALD = rampOf({ stops: [F_HEART, F_FLAME, I_PALE, I_ICE], at: [0, 0.3, 0.7, 0.95], steps: 4 });
const RAMP_RIME = rampOf({ stops: [I_CORE, I_PALE, I_ICE, I_DEEP], at: [0, 0.3, 0.7, 0.95], steps: 5 });

const HOT_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.36, lifeVar: 0.04, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_HOT_RING, ringWidth: 0.08,
  sizeCurve: curveOf([0, 0.3, 0.5, 3.0, 1, 3.8]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};
const COLD_RING: BurstOpts = { ...HOT_RING, life: 0.44, ramp: RAMP_COLD_RING, ringWidth: 0.06, sizeCurve: curveOf([0, 0.3, 0.5, 3.4, 1, 4.4]) };
const CLASH: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.24, lifeVar: 0.12, size: 0.7, sizeVar: 0.2, gravity: 0, z: 0.2, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#ffffff', F_HEART, STEAM], at: [0, 0.4, 0.85] }), core: '#ffffff', coreK: 0.5, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};
const STEAM_MASS: BurstOpts = {
  shape: 'blob', align: true, speed: 1.3, speedVar: 0.5, life: 1.1, lifeVar: 0.3, size: 0.42, sizeVar: 0.3, gravity: 0, drag: 2.4,
  vz: 1.2, zg: -0.2, mass: 0.45, layer: 'world', shadow: 0, ramp: RAMP_STEAM, core: '#ffffff', coreK: 0.35,
  sizeCurve: SWELL, alphaCurve: SMOKE_A, wave: 'noise', waveHz: 2.0, waveAmp: 0.4,
};
const SCALD: BurstOpts = {
  shape: 'drop', speed: 1.6, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.08, sizeVar: 0.3, gravity: 0,
  vz: 2.4, zg: 8, land: 'splat', layer: 'world', ramp: RAMP_SCALD, sizeCurve: HOLD, alphaCurve: SOLID, mark: 'fleck', markLife: 4,
};
const CRACKED_RIME: BurstOpts = {
  shape: 'shard', align: false, speed: 1.4, speedVar: 0.5, life: 2.2, lifeVar: 0.35, size: 0.11, sizeVar: 0.3, gravity: 0,
  vz: 2.0, zg: 7, land: 'settle', bounce: 0.2, spin: 8, layer: 'world', shadow: 0.45,
  ramp: RAMP_RIME, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'frost', markLife: 4,
};
const RIME_SPLINTER: BurstOpts = { ...CRACKED_RIME, size: 0.05, speed: 2.6, speedVar: 0.6, life: 0.8, vz: 1.8, land: 'die', shadow: 0, mark: undefined, spin: 14 };
const STEAM_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.6, speedVar: 0.5, life: 0.7, lifeVar: 0.35, size: 0.065, gravity: 0, z: 0.3, vz: 0.9, zg: -0.1,
  mass: 1.2, layer: 'world', shadow: 0, flicker: 0.5, ramp: rampOf({ stops: ['#ffffff', STEAM, I_PALE], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
const WET_FOG_POPS: EmitterPop[] = [
  { colors: [STEAM, I_MIST], opts: { ...STEAM_MASS, speed: 0.25, drag: 1.0, life: 1.3, size: 0.3, vz: 0.35, zg: 0, mass: 0.2, alphaCurve: curveOf([0, 0, 0.25, 0.32, 0.65, 0.26, 1, 0]) }, weight: 1.5, tier: 'body' },
  { colors: [STEAM, I_PALE], opts: { ...STEAM_GLINT, size: 0.05, vz: 0.5, life: 0.9 }, weight: 0.6, tier: 'fine' },
];

export const arxThermalShock: EffectDef = {
  id: 'arx.thermal_shock',
  name: 'Arx — thermal shock (fire meets cold)',
  story: 'the second spark meets the first: a hot ring and a cold ring race out of one point a beat apart, the clash flashes white, a body of steam blooms and climbs on its own lift, scald drops arc on true height and splat, the cracked rime skates out and lies, and a wet fog hangs over the spot',
  layers: [
    { kind: 'field', name: 'the steam lift', field: { kind: 'lift', radius: 1.2, strength: 2.2, dur: 1.2, height: 2.2, release: 0.4 }, radiusK: 1 },
    { kind: 'burst', name: 'the clash', recipe: recipe(['#ffffff', F_HEART], CLASH), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'hot ring', recipe: recipe([F_HEART, F_FLAME], HOT_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'cold ring', recipe: recipe([I_CORE, I_PALE], COLD_RING), count: 1, tier: 'hero', at: 0.07 },
    { kind: 'burst', name: 'steam body', recipe: recipe(['#ffffff', STEAM, I_MIST], STEAM_MASS), count: 12, tier: 'body', arrange: 'disc', radius: 0.25, dz: 0.05 },
    { kind: 'burst', name: 'steam rim', recipe: recipe([STEAM, I_MIST], { ...STEAM_MASS, speed: 1.6, size: 0.36 }), count: 10, tier: 'body', arrange: 'rim', radius: 0.4, radiusK: 0.4, outward: 1.6, at: 0.1 },
    { kind: 'burst', name: 'scald drops', recipe: recipe([F_HEART, F_FLAME], SCALD), count: 7, tier: 'hero' },
    { kind: 'burst', name: 'cracked rime', recipe: recipe([I_CORE, I_PALE], CRACKED_RIME), count: 6, tier: 'hero', arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'rime splinters', recipe: recipe([I_PALE, I_ICE], RIME_SPLINTER), count: 10, tier: 'fine' },
    { kind: 'burst', name: 'steam glints', recipe: recipe(['#ffffff', STEAM], STEAM_GLINT), count: 8, tier: 'fine', arrange: 'disc', radius: 0.3, dz: 0.3 },
    { kind: 'emit', name: 'wet fog', arrange: 'disc', radius: 0.7, radiusK: 0.7, dz: 0.1, at: 0.4, rate: 10, dur: 1.6, attack: 0.2, release: 0.6, tier: 'body', pops: WET_FOG_POPS },
    { kind: 'glow', name: 'the heat', r: 1.6, rgb: FIRE_GLOW, a: 0.32, dur: 0.3, attack: 0.01, release: 0.2, radiusK: 0.8 },
    { kind: 'glow', name: 'the cold after', r: 1.9, rgb: FROST_GLOW, a: 0.2, at: 0.1, dur: 1.4, attack: 0.1, release: 0.8, radiusK: 1 },
  ],
};

// ---- arx.shatter — chill meets shock. The ice on a body takes the
// charge and BREAKS: a white crack, a frost ring, glass shards flung
// on true height that land and rime where they lie, splinters, and
// static — span bolts re-forming on the ring, afterglow arcs crawling
// between the glass — under a cold flicker.
const RAMP_SHATTER_GLASS = rampOf({ stops: ['#ffffff', I_CORE, I_PALE, I_ICE, I_DEEP], at: [0, 0.15, 0.5, 0.8, 1], steps: 6 });
const GLASS: BurstOpts = {
  shape: 'shard', align: false, speed: 2.2, speedVar: 0.5, life: 2.4, lifeVar: 0.4, size: 0.13, sizeVar: 0.3, gravity: 0,
  z: 0.3, vz: 2.6, zg: 8, land: 'settle', bounce: 0.25, spin: 12, layer: 'world', shadow: 0.5, flicker: 0.3,
  ramp: RAMP_SHATTER_GLASS, sizeCurve: curveOf([0, 1, 0.85, 1, 1, 0.6]), alphaCurve: curveOf([0, 1, 0.8, 1, 0.94, 0.4, 1, 0]), mark: 'frost', markLife: 4,
};
const SHATTER_GLASS_FINE: BurstOpts = { ...GLASS, size: 0.05, speed: 3.0, speedVar: 0.6, life: 0.8, vz: 2.0, zg: 7, spin: 18, land: 'die', shadow: 0, mark: undefined };
const CRACK: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.22, lifeVar: 0.1, size: 0.62, sizeVar: 0.2, gravity: 0, z: 0.2, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#ffffff', S_CORE, I_PALE], at: [0, 0.4, 0.85] }), core: '#ffffff', coreK: 0.5, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};
const FROST_RING: BurstOpts = { ...COLD_RING, life: 0.34, sizeCurve: curveOf([0, 0.3, 0.5, 2.6, 1, 3.2]) };
const STATIC: BurstOpts = {
  shape: 'bolt', life: 0.22, lifeVar: 0.3, size: 0.09, gravity: 0, layer: 'world', shadow: 0,
  z: 0.1, z2: 0.1, boltRate: 14, boltBranch: 0.5, fade: S_HALO, fadeAt: 2, alphaCurve: FADE_OUT,
};
const ION: BurstOpts = {
  shape: 'glint', speed: 2.2, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.055, gravity: 0, z: 0.2, drag: 0.6, layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: [S_CORE, S_HOT, S_CHARGE], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
const S_SPARK: BurstOpts = {
  shape: 'streak', speed: 3.0, speedVar: 0.4, life: 0.34, lifeVar: 0.3, size: 0.04, gravity: 0, z: 0.2, layer: 'world', shadow: 0, flicker: 0.6,
  ramp: rampOf({ stops: [S_CORE, S_HOT] }), sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
const FROST_DUST: BurstOpts = {
  shape: 'puff', speed: 1.3, speedVar: 0.4, life: 0.8, lifeVar: 0.3, size: 0.24, sizeVar: 0.3, gravity: 0, drag: 3.0, vz: 0.4, zg: 0.8,
  land: 'settle', layer: 'world', shadow: 0, ramp: rampOf({ stops: [I_CORE, I_MIST, I_PALE], at: [0, 0.5, 0.9] }), sizeCurve: SWELL, alphaCurve: SMOKE_A,
};

export const arxShatter: EffectDef = {
  id: 'arx.shatter',
  name: 'Arx — shatter (chill meets shock)',
  story: 'the ice on a body takes the charge and breaks: a white crack and a frost ring, glass shards flung on true height that land and rime where they lie, splinters, cold dust off the rim, and static — span bolts re-forming on the ring, afterglow arcs crawling between the glass — under a cold flicker',
  layers: [
    { kind: 'field', name: 'the break', field: { kind: 'attract', radius: 1.4, strength: -4.5, dur: 0.3, attack: 0.01, release: 0.15 }, radiusK: 0.9 },
    { kind: 'burst', name: 'white crack', recipe: recipe(['#ffffff', S_CORE], CRACK), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'frost ring', recipe: recipe([I_CORE, I_PALE], FROST_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'the glass', recipe: recipe(['#ffffff', I_CORE, I_PALE], GLASS), count: 10, tier: 'hero', arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'splinters', recipe: recipe([I_PALE, I_ICE], SHATTER_GLASS_FINE), count: 18, tier: 'fine' },
    { kind: 'burst', name: 'static', recipe: recipe([S_CORE, S_HOT], STATIC), count: 5, tier: 'hero', arrange: 'ring', radius: 0.5, radiusK: 0.5, span: 0.6, every: 0.12, times: 3 },
    { kind: 'burst', name: 'ions', recipe: recipe([S_CORE, S_HOT, S_CHARGE], ION), count: 12, tier: 'fine', dz: 0.1 },
    { kind: 'burst', name: 'sparks', recipe: recipe([S_CORE, S_HOT], S_SPARK), count: 6, tier: 'fine' },
    { kind: 'burst', name: 'cold dust', recipe: recipe([I_CORE, I_MIST], FROST_DUST), count: 8, tier: 'body', arrange: 'rim', radius: 0.3, outward: 1.4, at: 0.04 },
    { kind: 'burst', name: 'afterglow arcs', recipe: recipe([S_HOT, S_CHARGE], { ...STATIC, size: 0.07, z: 0.06, z2: 0.06 }), count: 2, tier: 'body', arrange: 'disc', radius: 0.9, radiusK: 0.9, span: 0.45, at: 0.5, every: 0.16, times: 4 },
    { kind: 'glow', name: 'the crack\'s light', r: 1.5, rgb: STORM_GLOW, a: 0.4, dur: 0.25, attack: 0.01, release: 0.18 },
    { kind: 'glow', name: 'cold flicker', r: 1.7, rgb: FROST_GLOW, a: 0.16, at: 0.1, dur: 1.6, attack: 0.05, release: 0.9, flicker: 0.4, radiusK: 1 },
  ],
};

// ---- arx.combust — shock meets burn. The charge on a burning body
// goes off as flash-fire: bolts stab down out of the sky into the
// heart, a fire front races out, a flame mass bursts up on its own
// lift with racers skittering across it, embers ride the heat, coals
// land and char, and a brief burning floor smokes off.
const RAMP_FLASHFIRE = rampOf({ stops: ['#ffffff', F_HEART, F_FLAME, F_EMBER, F_COAL, F_SOOT], at: [0, 0.12, 0.35, 0.6, 0.82, 1], steps: 7 });
const FLASHFIRE: BurstOpts = {
  shape: 'blob', speed: 0.6, life: 0.26, lifeVar: 0.15, size: 0.72, sizeVar: 0.2, gravity: 0, z: 0.2, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#ffffff', S_HOT, F_HEART], at: [0, 0.35, 0.8] }), core: '#ffffff', coreK: 0.5, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};
const FIRE_FRONT: BurstOpts = { ...HOT_RING, life: 0.38, ringWidth: 0.09, sizeCurve: curveOf([0, 0.3, 0.5, 3.2, 1, 4.0]) };
const FLAME_MASS: BurstOpts = {
  shape: 'blob', align: true, speed: 1.4, speedVar: 0.55, life: 0.9, lifeVar: 0.35, size: 0.38, sizeVar: 0.35, gravity: 0, drag: 2.6,
  vz: 0.7, zg: -0.12, mass: 0.35, layer: 'world', shadow: 0, ramp: RAMP_FLASHFIRE, core: F_HEART, coreK: 0.45, flicker: 0.15,
  sizeCurve: DWINDLE, alphaCurve: FADE_LATE, wave: 'noise', waveHz: 2.2, waveAmp: 0.45,
};
const SKY_BOLT: BurstOpts = {
  shape: 'bolt', life: 0.3, lifeVar: 0.15, size: 0.14, gravity: 0, layer: 'overlay', shadow: 0,
  z: 3.2, z2: 0, boltRate: 11, boltBranch: 0.7, fade: S_HALO, fadeAt: 2, alphaCurve: curveOf([0, 1, 0.3, 1, 0.6, 0.5, 1, 0]),
};
const RACER: BurstOpts = { ...STATIC, size: 0.1, life: 0.26, boltRate: 13, drag: 2.5, z: 0.06, z2: 0.06 };
const EMBER_LIFT: BurstOpts = {
  shape: 'square', speed: 1.2, speedVar: 0.5, life: 1.2, lifeVar: 0.35, size: 0.05, sizeVar: 0.3, gravity: 0,
  vz: 1.4, zg: 1.2, mass: 1.6, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: [F_BRIGHT, F_FLAME, F_EMBER, F_COAL], at: [0, 0.3, 0.7, 0.95], steps: 4 }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};
const COAL: BurstOpts = {
  shape: 'square', align: true, speed: 1.4, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.09, sizeVar: 0.3, gravity: 0,
  vz: 2.2, zg: 7.5, land: 'settle', bounce: 0.3, spin: 5, layer: 'world', shadow: 0.5, flicker: 0.3,
  ramp: rampOf({ stops: [F_FLAME, F_EMBER, F_COAL, F_SOOT], at: [0, 0.3, 0.7, 0.95], steps: 5 }), sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 5,
};
const SOOT_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.3, speedVar: 0.5, life: 1.5, lifeVar: 0.3, size: 0.3, sizeVar: 0.3, gravity: 0, vz: 0.7, zg: -0.15, mass: 0.3,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [F_SOOT, F_SMOKE, F_SMOKE_THIN], at: [0, 0.5, 0.92], steps: 4 }), sizeCurve: SWELL, alphaCurve: SMOKE_A,
};
const FLAMELET: BurstOpts = {
  shape: 'lick', speed: 0.15, life: 0.6, lifeVar: 0.35, size: 0.14, sizeVar: 0.3, gravity: 0, vz: 0.8, zg: -0.2, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: rampOf({ stops: [F_HEART, F_FLAME, F_EMBER, F_COAL], at: [0, 0.35, 0.7, 0.95], steps: 4 }), sizeCurve: DWINDLE, alphaCurve: FADE_LATE,
};
const COMBUST_FLOOR_POPS: EmitterPop[] = [
  { colors: [F_BRIGHT, F_FLAME, F_EMBER], opts: FLAMELET, weight: 1.6, tier: 'body' },
  { colors: [F_SOOT, F_SMOKE], opts: { ...SOOT_PUFF, size: 0.2, life: 1.2 }, weight: 0.5, tier: 'body' },
  { colors: [F_FLAME, F_EMBER], opts: { ...EMBER_LIFT, speed: 0.4, vz: 1.0 }, weight: 0.7, tier: 'fine' },
];

export const arxCombust: EffectDef = {
  id: 'arx.combust',
  name: 'Arx — combust (shock meets burn)',
  story: 'the charge on a burning body goes off as flash-fire: bolts stab down out of the sky into the heart, a fire front races out, a flame mass bursts up on its own lift with racers skittering across it, embers ride the heat, coals land and char, and a brief burning floor smokes off',
  layers: [
    { kind: 'field', name: 'the heat', field: { kind: 'lift', radius: 1.3, strength: 2.6, dur: 1.4, height: 2.2, release: 0.5 }, radiusK: 1 },
    { kind: 'burst', name: 'sky bolts', recipe: recipe([S_CORE, '#ffffff'], SKY_BOLT), count: 2, tier: 'hero', arrange: 'disc', radius: 0.12, span: 0.15 },
    { kind: 'burst', name: 'flash-fire', recipe: recipe(['#ffffff', S_HOT], FLASHFIRE), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'fire front', recipe: recipe([F_BRIGHT, F_FLAME], FIRE_FRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'flame mass', recipe: recipe([F_HEART, F_BRIGHT, F_FLAME], FLAME_MASS), count: 14, tier: 'body', arrange: 'disc', radius: 0.25, dz: 0.04 },
    { kind: 'burst', name: 'racers', recipe: recipe([S_CORE, S_HOT], RACER), count: 6, tier: 'hero', arrange: 'rim', radius: 0.45, radiusK: 0.45, outward: 3.2, span: 0.7, at: 0.04, every: 0.11, times: 2 },
    { kind: 'burst', name: 'embers', recipe: recipe([F_FLAME, F_EMBER, F_BRIGHT], EMBER_LIFT), count: 22, tier: 'fine' },
    { kind: 'burst', name: 'coals', recipe: recipe([F_EMBER, F_COAL], COAL), count: 6, tier: 'hero' },
    { kind: 'burst', name: 'sparks', recipe: recipe([S_CORE, S_HOT], { ...S_SPARK, speed: 2.8 }), count: 8, tier: 'fine' },
    { kind: 'emit', name: 'burning floor', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.3, rate: 22, dur: 1.8, attack: 0.15, release: 0.7, tier: 'body', pops: COMBUST_FLOOR_POPS },
    { kind: 'emit', name: 'smoke', arrange: 'disc', radius: 0.35, dz: 0.4, at: 0.35, rate: 9, dur: 1.4, attack: 0.2, release: 0.6, tier: 'body',
      pops: [{ colors: [F_SOOT, F_SMOKE, F_SMOKE_THIN], opts: SOOT_PUFF, tier: 'body' }] },
    { kind: 'glow', name: 'the fire', r: 1.7, rgb: FIRE_GLOW, a: 0.4, dur: 0.35, attack: 0.01, release: 0.25, radiusK: 0.9 },
    { kind: 'glow', name: 'the stroke', r: 1.2, rgb: STORM_GLOW, a: 0.22, dur: 0.3, attack: 0.01, release: 0.2, flicker: 0.6, dz: 1.0 },
    { kind: 'glow', name: 'ember glow', r: 1.3, rgb: FIRE_GLOW, a: 0.14, at: 0.4, dur: 1.8, attack: 0.1, release: 0.8, flicker: 0.4, radiusK: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// THE GROUND THAT STAYS (THE MASTERED HAND, Phase 4). Two aftermath zones
// the library had no voice for: the crown's seam left standing open, and
// the shelf's drain that keeps dragging. Both are STANDING beats — cued
// on `every` for the field's life — so each speaks one breath of its
// zone (≤ 1.2 s of matter) and the re-speak carries the rest.
// ---------------------------------------------------------------------------

// ---- arx.rift — REALM REND's aftermath, "the seam stays open". The
// corridor was torn; where the splinter went home a gap stands in the
// ground — a dark teal mouth with a violet under-glow — and static
// re-forms across it on beats, splinters lift off the lips and lie,
// ions climb, and the dark inhales what lies near. Shock every beat.
const RIFT_TEAL = '#9ae8de';
const RIFT_SEA = '#3f9aa0';
const RIFT_DARK = '#123640';
const RIFT_INK = '#0c1a22';
const RIFT_VIOLET = '#e8b0ff';
const RIFT_VIOLET_DEEP = '#6e4a9a';
const RIFT_GLOW = '154, 232, 222';

const RAMP_GAP = rampOf({ stops: [RIFT_DARK, RIFT_INK, RIFT_DARK], at: [0, 0.5, 1], steps: 3 });
const RAMP_LIP = rampOf({ stops: [RIFT_VIOLET, RIFT_VIOLET_DEEP, RIFT_DARK], at: [0, 0.55, 0.95], steps: 4 });
const RAMP_RIFT_GLASS = rampOf({ stops: ['#ffffff', RIFT_TEAL, RIFT_SEA, RIFT_DARK], at: [0, 0.2, 0.7, 1], steps: 5 });

/** The gap: a dark mouth lying on the ground, breathing, gone by the next beat. */
const GAP: BurstOpts = {
  shape: 'blob', speed: 0, life: 1.25, lifeVar: 0.05, size: 0.62, sizeVar: 0.1, gravity: 0, layer: 'ground',
  ramp: RAMP_GAP, sizeCurve: curveOf([0, 0.6, 0.2, 1, 0.8, 1, 1, 0.7]), alphaCurve: curveOf([0, 0, 0.15, 0.9, 0.8, 0.85, 1, 0]),
  wave: 'sine', waveHz: 1.4, waveAmp: 0.06, waveAxis: 'x',
};
/** The lips: violet under-glow motes lying along the mouth's edge. */
const LIP: BurstOpts = {
  shape: 'mote', speed: 0.02, life: 1.1, lifeVar: 0.2, size: 0.22, sizeVar: 0.2, gravity: 0, layer: 'ground',
  ramp: RAMP_LIP, sizeCurve: curveOf([0, 0.5, 0.3, 1, 0.8, 0.95, 1, 0.6]), alphaCurve: curveOf([0, 0, 0.2, 0.7, 0.7, 0.6, 1, 0]),
};
/** The violet rim: a hard ring of under-glow lying around the mouth. */
const RIFT_RIM: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.1, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [RIFT_VIOLET, RIFT_VIOLET_DEEP, RIFT_DARK], at: [0, 0.6, 0.95], steps: 4 }), ringWidth: 0.09,
  sizeCurve: curveOf([0, 0.9, 0.2, 1.25, 0.85, 1.3, 1, 1.1]), alphaCurve: curveOf([0, 0, 0.15, 0.75, 0.75, 0.6, 1, 0]),
};
/** Static re-forming across the gap: short span bolts on the ring. */
const RIFT_STATIC: BurstOpts = {
  shape: 'bolt', life: 0.2, lifeVar: 0.3, size: 0.09, gravity: 0, layer: 'world', shadow: 0,
  z: 0.08, z2: 0.08, boltRate: 14, boltBranch: 0.5, fade: RIFT_SEA, fadeAt: 2, alphaCurve: FADE_OUT,
};
/** Splinters lifted off the lips on true height that fall back and lie. */
const RIFT_SPLINTER: BurstOpts = {
  shape: 'shard', align: false, speed: 0.5, speedVar: 0.6, life: 1.4, lifeVar: 0.3, size: 0.09, sizeVar: 0.3, gravity: 0,
  z: 0.05, vz: 2.0, zg: 7, land: 'settle', bounce: 0.2, spin: 9, layer: 'world', shadow: 0.4, flicker: 0.35,
  ramp: RAMP_RIFT_GLASS, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 3,
};
/** Ions: teal glints climbing off the mouth. */
const RIFT_ION: BurstOpts = {
  shape: 'glint', speed: 0.3, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.06, gravity: 0, z: 0.1, vz: 1.3, zg: -0.3,
  mass: 1.2, layer: 'world', shadow: 0, flicker: 0.55, ramp: rampOf({ stops: ['#ffffff', RIFT_TEAL, RIFT_SEA], at: [0, 0.5, 0.9] }),
  sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** The under-glow haze breathing up out of the gap. */
const RIFT_HAZE_POPS: EmitterPop[] = [
  { colors: [RIFT_VIOLET, RIFT_VIOLET_DEEP], opts: { shape: 'mote', speed: 0.2, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.22, sizeVar: 0.3, gravity: 0, z: 0.05, vz: 0.5, zg: -0.1, mass: 0.4, layer: 'world', shadow: 0, ramp: RAMP_LIP, sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.25, 0.4, 0.65, 0.32, 1, 0]) }, weight: 1.4, tier: 'body' },
  { colors: [RIFT_TEAL, RIFT_SEA], opts: { ...RIFT_ION, size: 0.05, vz: 0.9 }, weight: 0.6, tier: 'fine' },
];

export const arxRift: EffectDef = {
  id: 'arx.rift',
  name: 'Arx — rift (the seam stays open)',
  story: 'one breath of the torn ground: a dark teal mouth lies open with violet under-glow along its lips, static re-forms across it on beats, splinters lift off the edge on true height and fall back to lie, ions climb, a haze breathes up out of the gap and the dark inhales what lies near — the crown\'s seam, still crackling',
  layers: [
    { kind: 'field', name: 'the inhale', field: { kind: 'attract', radius: 1.4, strength: 1.6, dur: 1.0, attack: 0.1, release: 0.3 }, radiusK: 0.9 },
    { kind: 'burst', name: 'the gap', recipe: recipe([RIFT_DARK, RIFT_INK], GAP), count: 4, tier: 'hero', arrange: 'disc', radius: 0.22, radiusK: 0.22 },
    { kind: 'burst', name: 'violet rim', recipe: recipe([RIFT_VIOLET, RIFT_VIOLET_DEEP], RIFT_RIM), count: 1, tier: 'hero', radiusK: 0.55 },
    { kind: 'burst', name: 'the lips', recipe: recipe([RIFT_VIOLET, RIFT_VIOLET_DEEP], LIP), count: 10, tier: 'body', arrange: 'ring', radius: 0.4, radiusK: 0.4 },
    { kind: 'burst', name: 'static', recipe: recipe([RIFT_TEAL, '#ffffff'], RIFT_STATIC), count: 3, tier: 'hero', arrange: 'ring', radius: 0.45, radiusK: 0.45, span: 0.8, at: 0.05, every: 0.28, times: 3 },
    { kind: 'burst', name: 'splinters', recipe: recipe(['#ffffff', RIFT_TEAL, RIFT_SEA], RIFT_SPLINTER), count: 5, tier: 'hero', arrange: 'ring', radius: 0.4, radiusK: 0.4, at: 0.1 },
    { kind: 'burst', name: 'ions', recipe: recipe(['#ffffff', RIFT_TEAL], RIFT_ION), count: 14, tier: 'fine', arrange: 'disc', radius: 0.4, radiusK: 0.4, at: 0.05 },
    { kind: 'emit', name: 'under-glow haze', arrange: 'disc', radius: 0.35, radiusK: 0.35, at: 0.1, rate: 16, dur: 0.9, attack: 0.1, release: 0.3, tier: 'body', pops: RIFT_HAZE_POPS },
    { kind: 'glow', name: 'the seam\'s light', r: 1.4, rgb: RIFT_GLOW, a: 0.18, dur: 1.1, attack: 0.1, release: 0.4, flicker: 0.5, radiusK: 0.9 },
  ],
};

// ---- arx.riptide — UNDERTOW's aftermath, "the drain keeps dragging".
// The blast fell back but the ground is still a plughole: a foam ring
// contracts to the eye, runnels of water crawl inward along the floor,
// wet flecks are dragged in and splat, the eye gulps dark, and a cold
// mist is pulled in over it. Chill every beat and a pull toward center.
const TIDE_WHITE = '#f0f8fc';
const TIDE_FOAM = '#d8ecf7';
const TIDE_LIGHT = '#9cc9e8';
const TIDE_CHANNEL = '#7db3d8';
const TIDE_DEEP = '#5b8fb8';
const TIDE_EYE = '#2f5678';
const TIDE_GLOW = '175, 208, 232';

const RAMP_FOAM = rampOf({ stops: [TIDE_WHITE, TIDE_FOAM, TIDE_LIGHT, TIDE_CHANNEL], at: [0, 0.3, 0.7, 0.95] });
const RAMP_RUNNEL = rampOf({ stops: [TIDE_LIGHT, TIDE_CHANNEL, TIDE_DEEP], at: [0, 0.5, 0.9] });
const RAMP_EYE = rampOf({ stops: [TIDE_DEEP, TIDE_EYE, TIDE_DEEP], at: [0, 0.5, 1], steps: 3 });

/** The foam ring — born at the rim and pulled in to the eye. */
const FOAM_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.9, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_FOAM, ringWidth: 0.07,
  sizeCurve: curveOf([0, 4.2, 0.6, 1.6, 1, 0.4]), alphaCurve: curveOf([0, 0, 0.1, 0.8, 0.75, 0.7, 1, 0]),
};
/** Runnels — streaks crawling inward along the floor toward the eye. */
const RUNNEL: BurstOpts = {
  shape: 'streak', align: true, speed: 2.6, speedVar: 0.3, life: 0.85, lifeVar: 0.25, size: 0.15, sizeVar: 0.25, gravity: 0, drag: 0.5,
  layer: 'ground', ramp: RAMP_RUNNEL, sizeCurve: HOLD, alphaCurve: curveOf([0, 0.2, 0.2, 0.85, 0.8, 0.8, 1, 0]),
};
/** Wet flecks — drops dragged in on a low arc that splat and stay. */
const DRAGGED_DROP: BurstOpts = {
  shape: 'drop', speed: 1.6, speedVar: 0.4, life: 1.2, lifeVar: 0.3, size: 0.07, sizeVar: 0.3, gravity: 0,
  z: 0.05, vz: 1.4, zg: 6, land: 'splat', layer: 'world', mass: 1.4,
  ramp: rampOf({ stops: [TIDE_WHITE, TIDE_LIGHT, TIDE_CHANNEL], at: [0, 0.3, 0.75] }), sizeCurve: HOLD, alphaCurve: SOLID, mark: 'fleck', markLife: 3,
};
/** The eye — the dark gulp at the center. */
const EYE: BurstOpts = {
  shape: 'blob', speed: 0, life: 1.0, lifeVar: 0.05, size: 0.42, sizeVar: 0.1, gravity: 0, layer: 'ground',
  ramp: RAMP_EYE, sizeCurve: curveOf([0, 0.4, 0.5, 1, 0.85, 0.9, 1, 0.3]), alphaCurve: curveOf([0, 0, 0.2, 0.85, 0.8, 0.8, 1, 0]),
};
/** Cold mist — pale masses pulled in over the drain by the field. */
const TIDE_MIST_POPS: EmitterPop[] = [
  { colors: [TIDE_FOAM, TIDE_LIGHT], opts: { shape: 'mote', speed: 0.3, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.4, sizeVar: 0.2, gravity: 0, z: 0.12, vz: 0.15, zg: 0, mass: 0.9, layer: 'world', shadow: 0, ramp: rampOf({ stops: [TIDE_FOAM, TIDE_LIGHT, TIDE_CHANNEL], at: [0, 0.5, 0.92], steps: 4 }), sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.25, 0.4, 0.65, 0.32, 1, 0]) }, weight: 1.5, tier: 'body' },
  { colors: [TIDE_WHITE, TIDE_FOAM], opts: { shape: 'glint', speed: 0.4, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.05, gravity: 0, z: 0.1, mass: 1.5, layer: 'world', shadow: 0, flicker: 0.5, ramp: rampOf({ stops: [TIDE_WHITE, TIDE_LIGHT] }), sizeCurve: HOLD, alphaCurve: FADE_OUT }, weight: 0.6, tier: 'fine' },
];

export const arxRiptide: EffectDef = {
  id: 'arx.riptide',
  name: 'Arx — riptide (the drain keeps dragging)',
  story: 'one breath of the plughole: a foam ring is born at the rim and pulled in to the eye, runnels of water crawl inward along the floor, wet flecks are dragged in on low arcs and splat where they land, the eye gulps dark at the center, and a cold mist is drawn in over the drain — the ground still pulling after the sea fell back',
  layers: [
    { kind: 'field', name: 'the drag', field: { kind: 'attract', radius: 2.4, strength: 3.2, dur: 1.0, attack: 0.05, release: 0.3 }, radiusK: 1.1 },
    { kind: 'burst', name: 'foam ring', recipe: recipe([TIDE_WHITE, TIDE_FOAM], FOAM_RING), count: 1, tier: 'hero', radiusK: 1 },
    { kind: 'burst', name: 'runnels', recipe: recipe([TIDE_LIGHT, TIDE_CHANNEL], RUNNEL), count: 14, tier: 'body', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: -2.6 },
    { kind: 'burst', name: 'inner ring', recipe: recipe([TIDE_FOAM, TIDE_LIGHT], { ...FOAM_RING, ringWidth: 0.045, life: 0.7, sizeCurve: curveOf([0, 2.6, 0.6, 1.1, 1, 0.3]) }), count: 1, tier: 'hero', radiusK: 1, at: 0.3 },
    { kind: 'burst', name: 'wet flecks', recipe: recipe([TIDE_WHITE, TIDE_LIGHT], DRAGGED_DROP), count: 6, tier: 'hero', arrange: 'rim', radius: 0.9, radiusK: 0.9, outward: -1.6, at: 0.1 },
    { kind: 'burst', name: 'the eye', recipe: recipe([TIDE_DEEP, TIDE_EYE], EYE), count: 2, tier: 'hero', arrange: 'disc', radius: 0.08, at: 0.15 },
    { kind: 'burst', name: 'second runnels', recipe: recipe([TIDE_CHANNEL, TIDE_DEEP], { ...RUNNEL, speed: 1.8, size: 0.07, life: 0.7 }), count: 8, tier: 'fine', arrange: 'rim', radius: 0.7, radiusK: 0.7, outward: -1.8, at: 0.35 },
    { kind: 'emit', name: 'cold mist', arrange: 'disc', radius: 0.45, radiusK: 0.45, dz: 0.1, at: 0.15, rate: 9, dur: 0.8, attack: 0.1, release: 0.3, tier: 'body', pops: TIDE_MIST_POPS },
    { kind: 'glow', name: 'wet light', r: 1.6, rgb: TIDE_GLOW, a: 0.14, dur: 1.0, attack: 0.1, release: 0.4, radiusK: 0.9 },
  ],
};

export const ARX_EFFECTS: EffectDef[] = [arxGust, arxMoonrise, arxCometfall, arxThermalShock, arxShatter, arxCombust, arxRift, arxRiptide];

// ===========================================================================
// The plans — THE MASTERED HAND, Phase 4: THE VOICE. Every rung and page
// of THE ELEMENTAL LEDGER re-curated to what it now does: openers lay a
// spark and leave ground (`<art>:aftermath` is the standing zone the
// server sends as its own field fx), payoffs detonate the spark they
// read (onFollow speaks a REACTION — arx.thermal_shock / arx.shatter /
// arx.combust — the school's own grammar), channels crescendo on their
// last beat (onFinale), answers stay quick and quiet.
// ===========================================================================

export const ARX_PLANS: Record<string, AbilityPlan> = {
  // arc_bolt — 'bolt' per hop. ANSWER + the signature's third press: the
  // crack leaps caster→struck and the struck body sheds static; thrown
  // at a chilled body the ice SHATTERS at the far end (Shatter).
  arc_bolt: {
    cues: [
      { id: 'storm.arc', scale: 1.25 },
      { id: 'storm.nova', atFar: true, at: 0.06, scale: 0.7, radiusK: 0.55 },
    ],
    onFollow: [{ id: 'arx.shatter', atFar: true, at: 0.08, scale: 0.95 }],
  },
  // blink — 'warp'. ANSWER: the door left collapses (bloom), the door
  // arrived cracks open (shatter). Stepping right after a spark SPENDS
  // it: the charge is drawn off the body at the door left and the far
  // door blooms brighter for the refund.
  blink: {
    cues: [
      { id: 'arcane.bloom', scale: 0.55 },
      { id: 'arcane.shatter', atFar: true, scale: 0.9 },
    ],
    onFollow: [
      { id: 'storm.charge', scale: 0.5, radiusK: 0.5 },
      { id: 'arcane.bloom', atFar: true, at: 0.1, scale: 0.6 },
    ],
  },
  // meteor_shard — casted, fused 'blast' r2.2, burn + shove. OPENER: the
  // called stone lands as fire (burst), the earth is thrown (slam), the
  // stone smokes as it cools (wisp); the burning ground is its own field.
  meteor_shard: { cues: [
    { id: 'fire.burst', scale: 1.5 },
    { id: 'dust.slam', scale: 1.0, at: 0.04 },
    { id: 'fire.floor', at: 0.3, scale: 0.7, radiusK: 0.6 },
    { id: 'smoke.wisp', at: 0.7, scale: 0.9 },
  ] },
  // meteor_shard:aftermath — the fire the sky left, re-lit every 1.6 s
  // for 3.2 s (rank IV 4 s), smoke off the cinder field.
  'meteor_shard:aftermath': { cues: [
    { id: 'fire.floor', scale: 0.9, radiusK: 0.9, every: 1.6 },
    { id: 'smoke.wisp', at: 0.5, scale: 0.5, every: 2.2 },
  ] },
  // maelstrom — channeled, one 'blast' r2.6 per beat (×3), chill + pull.
  // PAYOFF: each beat the sea arrives (splash, rain into the eye, mist);
  // opened on a BURNING yard the cold meets the fire in the drain —
  // Thermal Shock at the eye.
  maelstrom: {
    cues: [
      { id: 'water.splash', scale: 1.3, radiusK: 0.8 },
      { id: 'water.rain', at: 0.15, scale: 0.55, radiusK: 0.6 },
      { id: 'water.mist', at: 0.3, scale: 0.7 },
    ],
    onFollow: [{ id: 'arx.thermal_shock', at: 0.2, scale: 1.15, radiusK: 0.9 }],
  },
  // wickfire — casted projectile, 'blast' r0.55 at the wound, burn.
  // OPENER, the signature's first press: the flame arrives still hungry
  // (burst) and catches on the body (plume); the fire on the ground is
  // the aftermath field's own voice.
  wickfire: { cues: [
    { id: 'fire.burst', scale: 0.9 },
    { id: 'fire.plume', at: 0.3, scale: 0.7 },
  ] },
  // wickfire:aftermath — the wick's fire standing where it landed, the
  // ember bed re-lit every 1.2 s for 2.4–3.2 s.
  'wickfire:aftermath': { cues: [
    { id: 'fire.floor', scale: 0.75, radiusK: 1, every: 1.2 },
  ] },
  // rime_river — channeled 'beam' per beat (×3), chill, finale ×2.5.
  // SUSTAIN: each beat winter pours down the corridor and the road rimes;
  // the LAST reach breaks its bank — an ice column stands where the river
  // ends and spears stand around it.
  rime_river: {
    cues: [
      { id: 'frost.breath', scale: 0.9 },
      { id: 'frost.fog', atFar: true, at: 0.5, scale: 0.6, radiusK: 0.7 },
    ],
    onFinale: [
      { id: 'frost.pillar', atFar: true, at: 0.1, scale: 1.0 },
      { id: 'frost.shards', atFar: true, at: 0.3, scale: 0.9, radiusK: 0.9 },
    ],
  },
  // windshear — casted 'nova' r2.6, shove + shock. OPENER: the whole sky
  // handed back (the roster's gust: front, torn leaves, settling air) and
  // the static it leaves on every body — arcs racing the ring behind it.
  windshear: { cues: [
    { id: 'arx.gust', scale: 1.3 },
    { id: 'storm.nova', at: 0.22, scale: 0.8, radiusK: 0.9 },
  ] },
  // stonerise — channeled fused 'blast' r2.0 per beat (×3), finale ×2.5.
  // SUSTAIN: each beat a row of earth stands up (slam) and the quarry dust
  // rolls; under CHILLED bodies the ice breaks with the row (Shatter);
  // the keystone row is the finale — the tallest slam, the widest dust.
  stonerise: {
    cues: [
      { id: 'dust.slam', scale: 1.0 },
      { id: 'dust.billow', at: 0.3, scale: 0.55 },
    ],
    onFollow: [{ id: 'arx.shatter', at: 0.06, scale: 0.9 }],
    onFinale: [
      { id: 'dust.slam', at: 0.05, scale: 1.7, radiusK: 1.2 },
      { id: 'dust.billow', at: 0.45, scale: 1.0, radiusK: 1.1 },
    ],
  },
  // geyser — casted fused 'blast' r2.0, chill + throw. PAYOFF: the deep
  // answers (splash crown, real falling water, the pool's haze); woken
  // under a SHOCKED body the cold shatters the charge (Shatter); the
  // scalding pool is its own field.
  geyser: {
    cues: [
      { id: 'water.splash', scale: 1.5 },
      { id: 'water.rain', at: 0.3, scale: 0.9, radiusK: 0.6 },
      { id: 'water.mist', at: 0.8, scale: 0.8 },
    ],
    onFollow: [{ id: 'arx.shatter', at: 0.12, scale: 1.05 }],
  },
  // geyser:aftermath — the scald pool: steam standing, and the well
  // burping every 1.2 s for 2.4–3.2 s.
  'geyser:aftermath': { cues: [
    { id: 'water.mist', scale: 0.8, radiusK: 1, every: 1.2 },
    { id: 'water.splash', at: 0.4, scale: 0.45, radiusK: 0.4, every: 1.2 },
  ] },
  // anvil_sky — channeled 'nova' r2.4 per beat (×4), shock, finale ×2.5.
  // SUSTAIN: every beat the hammer falls (strike) and the scale flies
  // (nova); the forge bell is the last fall — a heavier stroke, the ring
  // lit wide, the anvil's shock in the ground (slam).
  anvil_sky: {
    cues: [
      { id: 'storm.strike', scale: 1.0 },
      { id: 'storm.nova', at: 0.08, scale: 0.7, radiusK: 1 },
    ],
    onFinale: [
      { id: 'storm.strike', at: 0.05, scale: 0.6 },
      { id: 'dust.slam', at: 0.12, scale: 0.9 },
      { id: 'storm.nova', at: 0.3, scale: 0.85, radiusK: 1.15 },
    ],
  },
  // hollowcall — casted fused 'blast' r2.2, pull + root. OPENER, the
  // school's one hold: the nothing opens and INVITES (grasp), then snaps
  // shut (burst); the mouth keeps chewing as its own field.
  hollowcall: { cues: [
    { id: 'shadow.grasp', scale: 1.3 },
    { id: 'shadow.burst', at: 1.0, scale: 0.8, radiusK: 0.7 },
  ] },
  // hollowcall:aftermath — the mouth keeps chewing: the dark inhales every
  // 1.5 s for 2.4–3.2 s under a standing veil.
  'hollowcall:aftermath': { cues: [
    { id: 'shadow.grasp', scale: 0.9, radiusK: 1, every: 1.5 },
    { id: 'shadow.veil', at: 0.2, scale: 0.6, radiusK: 0.9, every: 3.0 },
  ] },
  // burning_glass — channeled 'beam' per beat (×3), burn, finale ×2.5.
  // SUSTAIN: the noon narrowed to a line that ends in fire; the last
  // focusing burns WHITE — a shatter of light and a fire column at the
  // point.
  burning_glass: {
    cues: [
      { id: 'arcane.beam', scale: 1.25 },
      { id: 'fire.fan', at: 0.05, scale: 0.45 },
      { id: 'fire.burst', atFar: true, at: 0.12, scale: 0.55 },
      { id: 'fire.floor', atFar: true, at: 0.4, scale: 0.4, radiusK: 0.5 },
    ],
    onFinale: [
      { id: 'arcane.shatter', atFar: true, at: 0.05, scale: 1.1 },
      { id: 'fire.pillar', atFar: true, at: 0.1, scale: 0.95 },
    ],
  },
  // moonrise — casted 'nova' r2.4, chill. OPENER: the early moon (the
  // roster's silver disc, glade, moths, dew that rimes); the silver sheet
  // on the ground is its own field.
  moonrise: { cues: [
    { id: 'arx.moonrise', scale: 1.3 },
  ] },
  // moonrise:aftermath — the silver sheet: a moonlit frost fog re-laid
  // every 1.6 s for 4–5 s, riming the ground under it.
  'moonrise:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.9, radiusK: 1, every: 1.6 },
  ] },
  // cometfall — channeled fused 'blast' r2.2 per beat (×4), shock, finale
  // ×2. SUSTAIN: one visitor per beat (head, tail, star-glass, the shock
  // after); over an open HOLLOW the stone falls heavier (the earth thrown
  // wider); the last visitor is the biggest — a heavier comet, a slam, a
  // wide nova.
  cometfall: {
    cues: [
      { id: 'arx.cometfall', scale: 1.1 },
      { id: 'storm.nova', at: 0.42, scale: 0.4, radiusK: 0.55 },
    ],
    onFollow: [{ id: 'dust.slam', at: 0.32, scale: 1.0, radiusK: 0.9 }],
    onFinale: [
      { id: 'arx.cometfall', at: 0.05, scale: 1.6 },
      { id: 'dust.slam', at: 0.38, scale: 1.2, radiusK: 1.1 },
      { id: 'storm.nova', at: 0.5, scale: 0.85, radiusK: 1 },
    ],
  },
  // frost_lance — casted 'beam' x→x2, chill. PAYOFF, the signature's
  // second press: the cold pours down the corridor, the far end is
  // PIERCED (spears stand where the rail struck), the corridor fogs;
  // cast down a BURNING body the fire answers — Thermal Shock at the
  // far end; the ice road is its own field.
  frost_lance: {
    cues: [
      { id: 'frost.breath', scale: 1.0 },
      { id: 'frost.shards', atFar: true, at: 0.12, scale: 0.7, radiusK: 0.6 },
      { id: 'frost.fog', at: 0.9, scale: 0.5 },
    ],
    onFollow: [{ id: 'arx.thermal_shock', atFar: true, at: 0.12, scale: 1.1 }],
  },
  // frost_lance:aftermath — the ice road: fog riming the floor every
  // 1.4 s, a few spears standing up again every 2 s, for 2.4–3.2 s.
  'frost_lance:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.7, radiusK: 1, every: 1.4 },
    { id: 'frost.shards', at: 0.2, scale: 0.4, radiusK: 0.7, every: 2.0 },
  ] },
  // ward_shell — ground_field 'field' 8–10 s, r2.0, THE HELD GROUND.
  // ANSWER: a circle of quiet light on the floor (sigil, re-spoken every
  // 2.5 s) and the halo that wraps whoever stands in it (orbit, every 4 s).
  ward_shell: { cues: [
    { id: 'arcane.sigil', scale: 1.0, radiusK: 1, every: 2.5 },
    { id: 'arcane.orbit', at: 0.15, scale: 0.85, every: 4.0 },
  ] },
  // ember_fan — projectile_fan, a 'blast' r0.55 at each of three wounds.
  // OPENER, the cheap wide burn: each finger burns where it lands and
  // leaves its handprint of coals guttering.
  ember_fan: { cues: [
    { id: 'fire.burst', scale: 0.7 },
    { id: 'fire.floor', at: 0.2, scale: 0.55, radiusK: 0.6 },
  ] },
  // stormcall — casted ground_field 'field' 5–6 s, r2.2, shock every
  // 0.6 s. PAYOFF: the sky petitioned (cloud every 3 s), striking on its
  // own clock (strike every 1.25 s), arcs scorching the circle (nova every
  // 2.5 s); asked over a BURNING yard every strike is Combust — the
  // flash-fire goes off twice as the appointment opens.
  stormcall: {
    cues: [
      { id: 'storm.cloud', scale: 1.2, every: 3.0 },
      { id: 'storm.strike', at: 0.5, scale: 0.9, every: 1.25 },
      { id: 'storm.nova', at: 0.55, scale: 0.6, radiusK: 0.8, every: 2.5 },
    ],
    onFollow: [
      { id: 'arx.combust', at: 0.6, scale: 1.2, radiusK: 0.8 },
      { id: 'arx.combust', at: 1.9, scale: 0.9, radiusK: 0.8 },
    ],
  },
  // mirror_image — 'summon' (the decoy plants where you stood). ANSWER:
  // the pane splits (shatter); the copy's ward firms up where it stands.
  mirror_image: { cues: [
    { id: 'arcane.shatter', scale: 0.7 },
    { id: 'arcane.sigil', at: 0.05, scale: 0.6, radiusK: 0.5 },
  ] },
  // daybreak — casted fused 'blast' r2.4, burn, the CROWN. Act one: noon
  // gathers (bloom) and FALLS as a column of fire (pillar), the light-
  // lanes stripe the ground (sigil) and the floor catches; act two, on a
  // chilled or charged yard, noon comes down wider — Thermal Shock and
  // Combust both go off at radius ×1.25; act three is the aftermath field.
  daybreak: {
    cues: [
      { id: 'arcane.bloom', scale: 1.7 },
      { id: 'fire.pillar', at: 0.25, scale: 1.3, radiusK: 0.8 },
      { id: 'fire.floor', at: 0.5, scale: 0.9, radiusK: 0.85 },
      { id: 'arcane.sigil', at: 0.8, scale: 1.1, radiusK: 1 },
    ],
    onFollow: [
      { id: 'arx.thermal_shock', at: 0.35, scale: 1.3, radiusK: 1.25 },
      { id: 'arx.combust', at: 0.5, scale: 1.0, radiusK: 1.25 },
    ],
  },
  // daybreak:aftermath — the ground goes on burning: the noon's floor
  // re-lit every 1.5 s for 4–5 s, smoke off it.
  'daybreak:aftermath': { cues: [
    { id: 'fire.floor', scale: 1.0, radiusK: 1, every: 1.5 },
    { id: 'smoke.wisp', at: 0.6, scale: 0.6, every: 2.5 },
  ] },
  // winters_fall — PAGE, channeled fused 'blast' r2.2 per beat (×4),
  // chill, finale ×2. SUSTAIN: each volley of winter cracks the patch
  // (nova) and stands spears in it; the closing of winter is the last
  // volley — a column of ice stacks up out of the patch.
  winters_fall: {
    cues: [
      { id: 'frost.nova', scale: 1.0 },
      { id: 'frost.shards', at: 0.2, scale: 0.7, radiusK: 0.8 },
    ],
    onFinale: [
      { id: 'frost.pillar', at: 0.05, scale: 1.3 },
      { id: 'frost.nova', at: 0.02, scale: 1.2, radiusK: 1.1 },
    ],
  },
  // riftwalker_step — PAGE, 'warp' with damage + shock at the crossing.
  // ANSWER: the corridor zips shut where you left, the exit spills the
  // dark and crackles; taken through a CHILLED body the crossing is
  // Shatter at the far side.
  riftwalker_step: {
    cues: [
      { id: 'shadow.burst', scale: 0.6 },
      { id: 'shadow.burst', atFar: true, at: 0.05, scale: 0.75 },
      { id: 'storm.nova', atFar: true, at: 0.14, scale: 0.55, radiusK: 0.5 },
    ],
    onFollow: [{ id: 'arx.shatter', atFar: true, at: 0.12, scale: 0.95 }],
  },

  // ---------------------------------------------- the first staves (the
  // shelf's two arx starters are seated in core.ts; the school's entry
  // outranks it).
  // frost_nova — 'nova' r2.6, chill 80. OPENER, the cheapest chill: one
  // cold crack and the mass rolling out; the sheet of ice is its own field.
  frost_nova: { cues: [
    { id: 'frost.nova', scale: 1.2 },
  ] },
  // frost_nova:aftermath — the sheet: frost fog riming the ring every
  // 1.4 s for 2.4 s.
  'frost_nova:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.7, radiusK: 1, every: 1.4 },
  ] },
  // fireburst — fused 'blast' r1.8, burn. PAYOFF: the delayed blast
  // (burst) and the floor catching; on a BRANDED body the fire finds the
  // mark — a column stands on it and the brand is spent as gold glass;
  // the standing fire is its own field.
  fireburst: {
    cues: [
      { id: 'fire.burst', scale: 1.2 },
      { id: 'fire.floor', at: 0.3, scale: 0.7, radiusK: 0.7 },
    ],
    onFollow: [
      { id: 'fire.pillar', at: 0.1, scale: 0.9, radiusK: 0.8 },
      { id: 'arcane.shatter', at: 0.15, scale: 0.5, radiusK: 0.6 },
    ],
  },
  // fireburst:aftermath — the fire standing where it bloomed, re-lit
  // every 1.4 s for 2.4 s.
  'fireburst:aftermath': { cues: [
    { id: 'fire.floor', scale: 0.8, radiusK: 1, every: 1.4 },
  ] },
};
