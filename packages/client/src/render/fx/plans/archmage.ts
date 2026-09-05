/**
 * ARCHMAGE — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
 * library; roster-only effects live in ARCHMAGE_EFFECTS and register
 * through the library index.
 *
 * The roster: fxSigsArchmageA.ts (THE ARMORY REMEMBERS 5a — the eleven
 * staff arts) and fxSigsArchmageB.ts (5b — the ten heavy staff arts).
 * Down here Arx stops asking the world and starts TELLING it; every
 * plan below was reasoned from the ability's mechanic (shape / reach /
 * status) and its signature's story. The painted statement (tablets,
 * millstones, the unlit door) stays the signature's; the matter is the
 * library's. Where the library had no voice — a briar thicket, a bone
 * abacus, a rain that spares the center, an unsewn teal seam — the
 * effect is authored here under the library's laws.
 *
 * Wire kinds (from the server's shape executors):
 *   nova → 'nova' · pulse_nova → one 'nova' per pulse · chain_zap →
 *   'bolt' per hop (x→x2) · projectile_fan → 'blast' r0.55 at each
 *   wound · ground_aoe → 'blast' at the fuse · ground_field → 'field'
 *   for fieldTicks (cues with `every` re-speak while it stands) ·
 *   beam → 'beam' (x→x2).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { CORE as STORM_CORE, HOT as STORM_HOT, CHARGE as STORM_CHARGE, HALO as STORM_HALO, STORM_GLOW } from '../library/storm.js';
import { DEEP as WATER_DEEP, CHANNEL as WATER_CHANNEL, LIGHT as WATER_LIGHT, FOAM as WATER_FOAM } from '../library/water.js';

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
const SMOKE_A = curveOf('smoke');

// ---------------------------------------------------------------------------
// archmage.briar — OVERGROWTH, "the rising thicket". One beat of the
// field: canes spring up at seeded points and STAY, thorn flecks are
// thrown off them and lie, leaf fines fly, pollen glints rise, and a
// low green haze breathes at the roots. The plan re-speaks it beat by
// beat so the circle visibly thickens — the field-kind's law. Palette
// is the VERDANT face: mid #7ac46a, deep #3a6a34, spark #c8e89a.
// ---------------------------------------------------------------------------

const BRIAR_PALE = '#eaffd8';
const BRIAR_SPARK = '#c8e89a';
const BRIAR_LEAF = '#7ac46a';
const BRIAR_CANE = '#4f8a3e';
const BRIAR_DEEP = '#3a6a34';
const BRIAR_THORN = '#2a4a24';
const BRIAR_GLOW = '140, 208, 120';

const RAMP_CANE = rampOf({ stops: [BRIAR_LEAF, BRIAR_CANE, BRIAR_DEEP, BRIAR_THORN], at: [0, 0.3, 0.75, 1], steps: 5 });
const RAMP_LEAFLET = rampOf({ stops: [BRIAR_SPARK, BRIAR_LEAF, BRIAR_DEEP], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_ROOT_HAZE = rampOf({ stops: [BRIAR_LEAF, BRIAR_DEEP, BRIAR_THORN], at: [0, 0.55, 0.95], steps: 4 });

/** A cane: a tapered tongue that grows up out of the ground, stands, and wilts. */
const CANE: BurstOpts = {
  shape: 'lick', speed: 0.06, speedVar: 0.3, life: 3.6, lifeVar: 0.3, size: 0.4, sizeVar: 0.3, gravity: 0,
  vz: 1.1, zg: 1.1, land: 'die', layer: 'world', shadow: 0.4, flicker: 0,
  ramp: RAMP_CANE,
  sizeCurve: curveOf([0, 0.2, 0.18, 1, 0.8, 1, 1, 0.3]), alphaCurve: curveOf([0, 0.8, 0.1, 1, 0.85, 1, 1, 0]),
};

/** A thorn: a dark shard flung off a cane that lands and lies. */
const THORN: BurstOpts = {
  shape: 'shard', align: true, speed: 1.2, speedVar: 0.5, life: 3.0, lifeVar: 0.35, size: 0.075, sizeVar: 0.3, gravity: 0,
  z: 0.3, vz: 1.6, zg: 7, land: 'settle', spin: 8, layer: 'world', shadow: 0.4,
  ramp: rampOf({ stops: [BRIAR_CANE, BRIAR_DEEP, BRIAR_THORN], at: [0, 0.4, 0.85] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'fleck', markLife: 4,
};

/** Leaflets — fines torn loose by the growth, dying on the grass. */
const LEAFLET: BurstOpts = {
  shape: 'shard', speed: 1.4, speedVar: 0.6, life: 0.9, lifeVar: 0.35, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.2, vz: 1.8, zg: 5, land: 'die', spin: 13, layer: 'world', shadow: 0,
  ramp: RAMP_LEAFLET, sizeCurve: HOLD, alphaCurve: SOLID, wave: 'noise', waveHz: 2, waveAmp: 0.35,
};

/** Pollen — glints lifting off the canes, breathing on z. */
const POLLEN: BurstOpts = {
  shape: 'glint', speed: 0.12, speedVar: 0.5, life: 1.2, lifeVar: 0.4, size: 0.05, gravity: 0,
  z: 0.3, vz: 0.5, zg: -0.1, layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: [BRIAR_PALE, BRIAR_SPARK, BRIAR_LEAF], at: [0, 0.5, 0.9] }), sizeCurve: BLOOM, alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.5, waveAmp: 0.3, waveAxis: 'z',
};

/** Root haze — a low green breath at the foot of the thicket. */
const ROOT_HAZE: BurstOpts = {
  shape: 'mote', speed: 0.25, speedVar: 0.5, life: 1.5, lifeVar: 0.3, size: 0.3, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.05, vz: 0.18, zg: 0.15, layer: 'world', shadow: 0, spin: 0.4,
  ramp: RAMP_ROOT_HAZE, sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.2, 0.36, 0.65, 0.3, 1, 0]),
  wave: 'noise', waveHz: 1.0, waveAmp: 0.22,
};

/** The soil heaving as a cane breaks ground — a small dark puff at each foot. */
const HEAVE: BurstOpts = {
  shape: 'puff', speed: 0.4, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.18, sizeVar: 0.3, gravity: 0, drag: 2,
  vz: 0.5, zg: 1.2, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#8a6f4d', '#6e5a44'], at: [0, 0.8] }), sizeCurve: SWELL, alphaCurve: SMOKE_A,
};

export const archmageBriar: EffectDef = {
  id: 'archmage.briar',
  name: 'Archmage — briar (overgrowth)',
  story: 'one beat of the thicket: the soil heaves and canes grow up out of the circle and STAND, thorns are flung off them and lie in the grass, leaflets fly, pollen lifts off the growth breathing on z, a low green haze breathes at the roots — and the canes wilt together at the end',
  layers: [
    { kind: 'burst', name: 'soil heaves', recipe: recipe(['#8a6f4d', '#6e5a44'], HEAVE), count: 6, tier: 'body', arrange: 'disc', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'canes', recipe: recipe([BRIAR_LEAF, BRIAR_CANE], { ...CANE, life: 4.0 }), count: 5, tier: 'hero', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.05 },
    { kind: 'burst', name: 'lesser canes', recipe: recipe([BRIAR_CANE, BRIAR_DEEP], { ...CANE, size: 0.28, life: 3.0, vz: 0.9, shadow: 0 }), count: 3, tier: 'body', arrange: 'disc', radius: 0.95, radiusK: 0.95, at: 0.18 },
    { kind: 'burst', name: 'thorns', recipe: recipe([BRIAR_DEEP, BRIAR_THORN], THORN), count: 6, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.12 },
    { kind: 'burst', name: 'leaflets', recipe: recipe([BRIAR_SPARK, BRIAR_LEAF], LEAFLET), count: 10, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.08 },
    { kind: 'burst', name: 'pollen', recipe: recipe([BRIAR_PALE, BRIAR_SPARK], POLLEN), count: 4, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, dz: 0.4, at: 0.4, every: 0.3, times: 6 },
    { kind: 'emit', name: 'root haze', arrange: 'disc', radius: 0.75, radiusK: 0.75, at: 0.2, rate: 9, dur: 2.4, attack: 0.3, release: 0.8, tier: 'body',
      pops: [{ colors: [BRIAR_LEAF, BRIAR_DEEP], opts: ROOT_HAZE, tier: 'body' }] },
    { kind: 'field', name: 'the growth lifts', field: { kind: 'lift', radius: 1.2, strength: 0.6, dur: 2.0, height: 1.0, attack: 0.2, release: 0.6 }, radiusK: 1 },
    { kind: 'glow', name: 'green light', r: 1.3, rgb: BRIAR_GLOW, a: 0.12, dur: 2.6, attack: 0.3, release: 0.9, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// archmage.marrow — MARROW_PULSE, "the counting knuckles". One toll of
// the rib-lantern: a bone-pale double ring rolls out on the ground,
// five knucklebones stand lit in a ring around the caster and keep the
// tally, grave-light motes rise pale off the circle, bone chips are
// thrown and lie, and a cold breath hangs at the ankles. Palette is the
// BONE face: core #fffcf0, mid #e2dcc8, deep #8a8474, with the grave's
// grey-green for the light.
// ---------------------------------------------------------------------------

const BONE_WHITE = '#fffcf0';
const BONE = '#e2dcc8';
const BONE_SHADE = '#b8b09a';
const BONE_DEEP = '#8a8474';
const GRAVE_LIGHT = '#c6d4bc';
const GRAVE_GREEN = '#8a9484';
const GRAVE_DARK = '#4e5a4c';
const BONE_GLOW = '220, 214, 190';

const RAMP_TOLL = rampOf({ stops: [BONE_WHITE, BONE, BONE_SHADE, BONE_DEEP], at: [0, 0.35, 0.7, 0.95] });
const RAMP_KNUCKLE = rampOf({ stops: [BONE_WHITE, BONE, BONE, BONE_SHADE], at: [0, 0.2, 0.75, 1], steps: 4 });
const RAMP_GRAVE = rampOf({ stops: [GRAVE_LIGHT, GRAVE_GREEN, GRAVE_DARK], at: [0, 0.5, 0.92], steps: 5 });
const RAMP_CHIP = rampOf({ stops: [BONE, BONE_SHADE, BONE_DEEP], at: [0, 0.5, 0.9], steps: 4 });

/** The toll — a bone-pale ring rolling out on the ground. */
const TOLL_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.6, lifeVar: 0.04, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_TOLL, ringWidth: 0.06,
  sizeCurve: curveOf([0, 0.3, 0.55, 3.0, 1, 3.9]), alphaCurve: curveOf([0, 0.95, 0.5, 0.7, 1, 0]),
};

/** A knucklebone — a pale glint standing on the ring, lit for the toll's whole count. */
const KNUCKLE: BurstOpts = {
  shape: 'square', speed: 0, life: 2.4, lifeVar: 0.15, size: 0.12, sizeVar: 0.12, gravity: 0, z: 0.1,
  layer: 'world', shadow: 0.35, flicker: 0.3, ramp: RAMP_KNUCKLE, core: BONE_WHITE, coreK: 0.4,
  sizeCurve: curveOf([0, 0.4, 0.12, 1, 0.85, 1, 1, 0.5]), alphaCurve: curveOf([0, 0, 0.08, 1, 0.8, 1, 1, 0]),
};

/** Grave-light — pale grey-green motes rising off the circle. */
const GRAVE_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.4, lifeVar: 0.35, size: 0.16, sizeVar: 0.35, gravity: 0,
  z: 0.04, vz: 0.42, zg: -0.05, layer: 'world', shadow: 0, flicker: 0.25,
  ramp: RAMP_GRAVE, sizeCurve: BLOOM, alphaCurve: MIST_A, wave: 'sine', waveHz: 0.9, waveAmp: 0.18,
};

/** Bone chips — small shards thrown off the toll that land and lie. */
const CHIP: BurstOpts = {
  shape: 'shard', align: true, speed: 1.1, speedVar: 0.5, life: 2.2, lifeVar: 0.35, size: 0.065, sizeVar: 0.3, gravity: 0,
  z: 0.15, vz: 1.7, zg: 7, land: 'settle', spin: 9, layer: 'world', shadow: 0.35,
  ramp: RAMP_CHIP, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 4,
};

/** The cold breath — a low grey fog at the ankles (chill). */
const COLD_BREATH: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.3, sizeVar: 0.3, gravity: 0, drag: 1.4,
  z: 0.08, vz: 0.05, zg: 0.15, layer: 'world', shadow: 0, spin: 0.3,
  ramp: rampOf({ stops: [GRAVE_LIGHT, BONE_SHADE, GRAVE_GREEN], at: [0, 0.5, 0.92], steps: 4 }), sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.2, 0.34, 0.65, 0.28, 1, 0]),
  wave: 'noise', waveHz: 1.0, waveAmp: 0.2,
};

/** The lantern's flash — a pale blob at the chest as the toll leaves. */
const LANTERN: BurstOpts = {
  shape: 'blob', speed: 0.2, life: 0.26, lifeVar: 0.1, size: 0.32, sizeVar: 0.2, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [BONE_WHITE, BONE, GRAVE_LIGHT], at: [0, 0.45, 0.85] }), core: '#ffffff', coreK: 0.4,
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

export const archmageMarrow: EffectDef = {
  id: 'archmage.marrow',
  name: 'Archmage — marrow (the counting toll)',
  story: 'the rib-lantern tolls: a pale flash at the chest, a bone-white double ring rolls out on the ground, five knucklebones stand lit in a ring and keep the tally, grave-light rises off the circle, bone chips are thrown and lie in the grass, and a cold breath hangs at the ankles',
  layers: [
    { kind: 'burst', name: 'lantern', recipe: recipe([BONE_WHITE, BONE], LANTERN), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'the toll', recipe: recipe([BONE_WHITE, BONE], TOLL_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'the echo', recipe: recipe([BONE, BONE_SHADE], { ...TOLL_RING, life: 0.66, size: 0.36, sizeCurve: curveOf([0, 0.3, 0.55, 2.7, 1, 3.6]) }), count: 1, tier: 'hero', at: 0.1 },
    { kind: 'burst', name: 'knucklebones', recipe: recipe([BONE_WHITE, BONE], KNUCKLE), count: 5, tier: 'hero', arrange: 'ring', radius: 0.62 },
    { kind: 'burst', name: 'grave-light', recipe: recipe([GRAVE_LIGHT, GRAVE_GREEN], GRAVE_MOTE), count: 10, tier: 'body', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.05 },
    { kind: 'burst', name: 'bone chips', recipe: recipe([BONE, BONE_SHADE], CHIP), count: 7, tier: 'hero', arrange: 'disc', radius: 0.2, at: 0.02 },
    { kind: 'burst', name: 'late light', recipe: recipe([GRAVE_LIGHT, GRAVE_GREEN], { ...GRAVE_MOTE, size: 0.12, life: 1.1 }), count: 3, tier: 'fine', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.4, every: 0.3, times: 4 },
    { kind: 'emit', name: 'cold breath', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.25, rate: 9, dur: 1.4, attack: 0.2, release: 0.6, tier: 'body',
      pops: [{ colors: [GRAVE_LIGHT, BONE_SHADE], opts: COLD_BREATH, tier: 'body' }] },
    { kind: 'glow', name: 'lantern light', r: 1.6, rgb: BONE_GLOW, a: 0.2, dur: 0.5, attack: 0.02, release: 0.35, dz: 0.5 },
    { kind: 'glow', name: 'bone glow', r: 1.1, rgb: BONE_GLOW, a: 0.1, at: 0.3, dur: 2.0, attack: 0.2, release: 0.8, flicker: 0.3, radiusK: 0.8 },
  ],
};

// ---------------------------------------------------------------------------
// archmage.eyewall — EYE_OF_THE_STORM, "the quiet disc". One pulse of
// the walking weather: the calm ring marks the dry center, and the
// rain falls ONLY on the band around it — streaks from height that
// splat dark flecks, ring bolts re-forming on the band, spray at the
// rim — while a vortex walks the weather round. What stays is the
// proof: a rained-dark ring around a circle the storm never touched.
// Palette: storm's blue-white for the bolts, water's clear pale for
// the rain (never cyan-neon).
// ---------------------------------------------------------------------------

const EYE_GLOW = '200, 215, 240';

const RAMP_RAIN = rampOf({ stops: [WATER_FOAM, WATER_LIGHT, WATER_CHANNEL, WATER_DEEP], at: [0, 0.3, 0.6, 0.85] });
const RAMP_CALM = rampOf({ stops: ['#e8ecf6', '#c8d0e8', '#8a98c0'], at: [0, 0.5, 0.9] });

/** Rain on the band: streaks falling from height, splatting dark where they land. */
const BAND_RAIN: BurstOpts = {
  shape: 'streak', speed: 0.2, speedVar: 0.4, life: 0.7, lifeVar: 0.2, size: 0.12, sizeVar: 0.25, gravity: 0,
  z: 1.7, vz: -6.5, zg: 3, land: 'splat', layer: 'world', shadow: 0,
  ramp: RAMP_RAIN, sizeCurve: HOLD, alphaCurve: curveOf([0, 0.7, 0.2, 0.9, 1, 0.8]), mark: 'fleck', markLife: 4,
};

/** Rain fines — thinner, faster, no mark. */
const BAND_RAIN_FINE: BurstOpts = {
  ...BAND_RAIN, size: 0.07, life: 0.55, vz: -7.5, land: 'die', mark: undefined,
};

/** The calm — a pale still ring at the dry disc's edge. */
const CALM_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.9, lifeVar: 0.05, size: 0.9, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: RAMP_CALM, ringWidth: 0.05,
  sizeCurve: curveOf([0, 0.85, 0.2, 1, 1, 1.02]), alphaCurve: curveOf([0, 0, 0.12, 0.85, 0.7, 0.6, 1, 0]),
};

/** Ring bolts — short arcs skittering on the band, re-forming on their beat. */
const BAND_BOLT: BurstOpts = {
  shape: 'bolt', life: 0.22, lifeVar: 0.3, size: 0.085, gravity: 0, layer: 'world', shadow: 0,
  z: 0.4, z2: 0.05, boltRate: 14, boltBranch: 0.45, fade: STORM_HALO, fadeAt: 2, alphaCurve: FADE_OUT,
};

/** A flicker at the band — a small flash where a bolt grounded. */
const BAND_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.3, life: 0.16, size: 0.24, sizeVar: 0.2, gravity: 0, z: 0.1, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#ffffff', STORM_CORE, STORM_HOT] }), core: '#ffffff', coreK: 0.5, sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** Spray — wet fines flung along the band's tangent by the walking weather. */
const BAND_SPRAY: BurstOpts = {
  shape: 'drop', speed: 1.4, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.05, gravity: 0,
  z: 0.1, vz: 1.0, zg: 5, land: 'die', layer: 'world', shadow: 0, mass: 2.0,
  ramp: rampOf({ stops: [WATER_FOAM, WATER_LIGHT] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The wet band — a low mist standing at the foot of the rain. */
const BAND_MIST: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.22, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.04, vz: 0.12, zg: 0.1, layer: 'world', shadow: 0, mass: 0.8,
  ramp: rampOf({ stops: [WATER_FOAM, '#bcdcef', WATER_LIGHT], at: [0, 0.5, 0.9], steps: 4 }), sizeCurve: SWELL, alphaCurve: MIST_A,
};

/** Wet shine — glints where the band's ground is soaked. */
const WET_SHINE: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.4, lifeVar: 0.3, size: 0.05, gravity: 0, z: 0.03, layer: 'world', shadow: 0, flicker: 0.4,
  ramp: rampOf({ stops: ['#f0f8fc', WATER_FOAM] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

const RAIN_POPS: EmitterPop[] = [
  { colors: [WATER_LIGHT, WATER_CHANNEL], opts: BAND_RAIN, weight: 1.4, tier: 'body' },
  { colors: [WATER_FOAM, WATER_LIGHT], opts: BAND_RAIN_FINE, weight: 1.6, tier: 'fine' },
  { colors: [WATER_CHANNEL, WATER_DEEP], opts: { ...BAND_RAIN, size: 0.16, vz: -5.5, markLife: 4.5 }, weight: 0.4, tier: 'hero' },
];

export const archmageEyewall: EffectDef = {
  id: 'archmage.eyewall',
  name: 'Archmage — eyewall (eye of the storm)',
  story: 'one pulse of the walking weather: a calm ring marks the dry center and the rain falls only on the band around it — streaks from height splatting dark flecks, ring bolts re-forming on the band, spray flung along it by the vortex, a wet mist at its foot — leaving a rained-dark ring around a circle the storm never touched',
  layers: [
    { kind: 'field', name: 'the weather walks', field: { kind: 'vortex', radius: 2.2, strength: 3.2, dur: 0.9, attack: 0.05, release: 0.3 }, radiusK: 1 },
    { kind: 'burst', name: 'calm ring', recipe: recipe(['#e8ecf6', '#c8d0e8'], CALM_RING), count: 1, tier: 'hero', radiusK: 0.5 },
    { kind: 'burst', name: 'first sheet', recipe: recipe([WATER_LIGHT, WATER_CHANNEL], BAND_RAIN), count: 14, tier: 'body', arrange: 'ring', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'outer sheet', recipe: recipe([WATER_FOAM, WATER_LIGHT], BAND_RAIN_FINE), count: 14, tier: 'fine', arrange: 'ring', radius: 1.0, radiusK: 1.0, at: 0.04 },
    { kind: 'emit', name: 'band rain', arrange: 'rim', radius: 0.9, radiusK: 0.9, outward: 0.05, rate: 46, dur: 0.75, attack: 0.05, release: 0.25, tier: 'body', pops: RAIN_POPS },
    { kind: 'burst', name: 'ring bolts', recipe: recipe([STORM_CORE, STORM_HOT], BAND_BOLT), count: 2, tier: 'hero', arrange: 'ring', radius: 0.85, radiusK: 0.85, span: 0.45, at: 0.08, every: 0.18, times: 3 },
    { kind: 'burst', name: 'band flicker', recipe: recipe([STORM_CORE, STORM_HOT], BAND_FLASH), count: 2, tier: 'body', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.08, every: 0.18, times: 3 },
    { kind: 'burst', name: 'spray', recipe: recipe([WATER_FOAM, WATER_LIGHT], BAND_SPRAY), count: 12, tier: 'fine', arrange: 'ring', radius: 0.95, radiusK: 0.95, at: 0.06 },
    { kind: 'emit', name: 'wet band', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.3, rate: 12, dur: 0.9, attack: 0.15, release: 0.5, tier: 'body',
      pops: [{ colors: [WATER_FOAM, WATER_LIGHT], opts: BAND_MIST, tier: 'body' }] },
    { kind: 'burst', name: 'wet shine', recipe: recipe(['#f0f8fc', WATER_FOAM], WET_SHINE), count: 3, tier: 'fine', arrange: 'ring', radius: 0.9, radiusK: 0.9, at: 0.4, every: 0.25, times: 3 },
    { kind: 'glow', name: 'band light', r: 1.9, rgb: EYE_GLOW, a: 0.14, dur: 1.0, attack: 0.05, release: 0.5, flicker: 0.5, radiusK: 1 },
    { kind: 'glow', name: 'bolt light', r: 1.6, rgb: STORM_GLOW, a: 0.2, at: 0.08, dur: 0.14, attack: 0.01, release: 0.1, every: 0.18, times: 3, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// archmage.seam — REALM_REND, "the unsewn seam". The corridor from the
// caster to the far end is a seam that POPS open outward: cross-stitch
// slivers fly off it in a sweep near→far over a teal under-glow, a
// white core line stands the length of it, splinters spin off and lie,
// then the seam re-closes from the far end back and one splinter-shard
// GLINTS at the far end, returned and remembered, for nine seconds.
// Palette is the legendary's own face: #ffffff core, #9ae8de teal,
// #2a6a64 deep, #e0fffb spark, glow 160,235,225.
// ---------------------------------------------------------------------------

const SEAM_WHITE = '#ffffff';
const SEAM_SPARK = '#e0fffb';
const SEAM_TEAL = '#9ae8de';
const SEAM_SEA = '#3fa8a0';
const SEAM_DEEP = '#2a6a64';
const SEAM_GLOW = '160, 235, 225';

const RAMP_SEAM = rampOf({ stops: [SEAM_WHITE, SEAM_SPARK, SEAM_TEAL, SEAM_SEA], at: [0, 0.3, 0.7, 0.95], steps: 5 });
const RAMP_UNDER = rampOf({ stops: [SEAM_TEAL, SEAM_SEA, SEAM_DEEP], at: [0, 0.5, 0.92], steps: 4 });
const RAMP_SPLINTER = rampOf({ stops: [SEAM_WHITE, SEAM_TEAL, SEAM_TEAL, SEAM_SEA, SEAM_DEEP], at: [0, 0.2, 0.6, 0.85, 1], steps: 6 });

/** The white core — streaks standing along the line, holding, snapping off. */
const CORE_LINE: BurstOpts = {
  shape: 'streak', speed: 0, life: 0.5, lifeVar: 0.15, size: 0.18, sizeVar: 0.2, gravity: 0,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [SEAM_WHITE, SEAM_SPARK, SEAM_TEAL], at: [0, 0.5, 0.9] }), core: SEAM_WHITE, coreK: 0.5,
  sizeCurve: curveOf([0, 0.5, 0.12, 1, 0.75, 0.9, 1, 0]), alphaCurve: curveOf([0, 1, 0.7, 1, 1, 0]),
};

/** The stitches popping — slivers thrown sideways off the seam on true height. */
const STITCH: BurstOpts = {
  shape: 'shard', align: true, speed: 1.8, speedVar: 0.4, life: 0.7, lifeVar: 0.3, size: 0.1, sizeVar: 0.3, gravity: 0,
  z: 0.4, vz: 1.4, zg: 5, land: 'die', spin: 10, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_SEAM, sizeCurve: HOLD, alphaCurve: SOLID, trail: 4, trailColor: SEAM_TEAL,
};

/** The under-glow — teal ground motes gaping open behind each stitch, then closing. */
const UNDER_GLOW: BurstOpts = {
  shape: 'mote', speed: 0.02, life: 1.6, lifeVar: 0.25, size: 0.22, sizeVar: 0.25, gravity: 0,
  layer: 'ground', ramp: RAMP_UNDER,
  sizeCurve: curveOf([0, 0.4, 0.2, 1, 0.7, 1, 1, 0.3]), alphaCurve: curveOf([0, 0, 0.12, 0.42, 0.7, 0.36, 1, 0]),
};

/** Seam fines — teal glints igniting along the line. */
const SEAM_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.45, lifeVar: 0.3, size: 0.08, sizeVar: 0.25, gravity: 0,
  layer: 'world', shadow: 0, flicker: 0.5, ramp: RAMP_SEAM, sizeCurve: FLARE, alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 3, waveAmp: 0.15, waveAxis: 'z',
};

/** Splinters — shards spun off the seam that land and lie along it. */
const SPLINTER: BurstOpts = {
  shape: 'shard', align: false, speed: 0.9, speedVar: 0.5, life: 2.6, lifeVar: 0.4, size: 0.08, sizeVar: 0.3, gravity: 0,
  z: 0.4, vz: 1.8, zg: 7, land: 'settle', spin: 8, layer: 'world', shadow: 0.4, flicker: 0.35,
  ramp: RAMP_SPLINTER, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 5,
};

/** THE SPLINTER RETURNED — one shard standing at the far end, glinting for nine seconds. */
const RETURNED: BurstOpts = {
  shape: 'shard', speed: 0, life: 9.0, lifeVar: 0.05, size: 0.16, sizeVar: 0.05, gravity: 0,
  z: 0.05, layer: 'world', shadow: 0.5, spin: 0, flicker: 0.6,
  ramp: rampOf({ stops: [SEAM_WHITE, SEAM_SPARK, SEAM_TEAL, SEAM_SEA], at: [0, 0.4, 0.8, 1], steps: 4 }), core: SEAM_WHITE, coreK: 0.4,
  sizeCurve: curveOf([0, 0.3, 0.06, 1, 0.9, 1, 1, 0.4]), alphaCurve: curveOf([0, 1, 0.85, 1, 1, 0]),
};

/** The far end's flash — where the splinter goes home. */
const HOME_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.3, life: 0.28, lifeVar: 0.1, size: 0.5, sizeVar: 0.2, gravity: 0, z: 0.3,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [SEAM_WHITE, SEAM_SPARK, SEAM_TEAL], at: [0, 0.4, 0.85] }), core: SEAM_WHITE, coreK: 0.5,
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The re-closing — a white thread along the line, thinning as the seam shuts. */
const CLOSE_THREAD: BurstOpts = {
  ...CORE_LINE, size: 0.08, life: 0.4, sizeCurve: curveOf([0, 1, 0.6, 0.6, 1, 0]), alphaCurve: FADE_OUT,
};

const STITCH_POPS: EmitterPop[] = [
  { colors: [SEAM_WHITE, SEAM_TEAL], opts: STITCH, weight: 1.4, tier: 'hero' },
  { colors: [SEAM_SPARK, SEAM_TEAL], opts: { ...STITCH, size: 0.06, speed: 2.4, life: 0.5 }, weight: 1.2, tier: 'fine' },
  { colors: [SEAM_TEAL, SEAM_SEA], opts: SPLINTER, weight: 0.5, tier: 'hero' },
];

export const archmageSeam: EffectDef = {
  id: 'archmage.seam',
  name: 'Archmage — seam (realm rend)',
  story: 'the corridor is a seam that POPS open from the caster outward: a white core line stands the length of it, stitches fly off it in a sweep near→far over a teal under-glow gaping open behind each, splinters spin off and lie along the line, the far end flashes as the splinter goes home, the seam re-closes from the far end back — and one shard stands glinting at the far end for nine seconds',
  layers: [
    { kind: 'burst', name: 'core line', recipe: recipe([SEAM_WHITE, SEAM_SPARK], CORE_LINE), count: 14, tier: 'hero', arrange: 'path', dz: 0.5 },
    { kind: 'burst', name: 'core line low', recipe: recipe([SEAM_SPARK, SEAM_TEAL], { ...CORE_LINE, size: 0.12, life: 0.44 }), count: 10, tier: 'body', arrange: 'path', dz: 0.3, at: 0.04 },
    { kind: 'burst', name: 'cast flash', recipe: recipe([SEAM_WHITE, SEAM_SPARK], { ...HOME_FLASH, size: 0.4 }), count: 2, tier: 'hero', dz: 0.4 },
    { kind: 'emit', name: 'stitches pop', arrange: 'path', toFar: true, sweep: 0.42, dz: 0.45, rate: 40, dur: 0.42, attack: 0, release: 0.05, tier: 'hero', pops: STITCH_POPS },
    { kind: 'emit', name: 'under-glow gapes', arrange: 'path', toFar: true, sweep: 0.42, rate: 22, dur: 0.42, attack: 0, release: 0.05, tier: 'body',
      pops: [{ colors: [SEAM_TEAL, SEAM_SEA], opts: UNDER_GLOW, tier: 'body' }] },
    { kind: 'burst', name: 'seam glints', recipe: recipe([SEAM_WHITE, SEAM_TEAL], SEAM_GLINT), count: 12, tier: 'fine', arrange: 'path', dz: 0.5, at: 0.06, every: 0.12, times: 3 },
    { kind: 'burst', name: 'home flash', recipe: recipe([SEAM_WHITE, SEAM_SPARK], HOME_FLASH), count: 2, tier: 'hero', arrange: 'far', at: 0.44, dz: 0.3 },
    { kind: 'burst', name: 'home splinters', recipe: recipe([SEAM_WHITE, SEAM_TEAL], { ...SPLINTER, speed: 1.4, vz: 2.2 }), count: 6, tier: 'hero', arrange: 'far', at: 0.44, dz: 0.2 },
    { kind: 'burst', name: 'the splinter returned', recipe: recipe([SEAM_WHITE, SEAM_SPARK], RETURNED), count: 1, tier: 'hero', arrange: 'far', at: 0.5 },
    { kind: 'burst', name: 'seam re-closes', recipe: recipe([SEAM_SPARK, SEAM_TEAL], CLOSE_THREAD), count: 12, tier: 'body', arrange: 'path', dz: 0.45, at: 0.7 },
    { kind: 'burst', name: 'last thread', recipe: recipe([SEAM_TEAL, SEAM_SEA], { ...CLOSE_THREAD, size: 0.05, life: 0.35 }), count: 8, tier: 'fine', arrange: 'path', dz: 0.4, at: 0.9 },
    { kind: 'glow', name: 'seam light', r: 1.2, rgb: SEAM_GLOW, a: 0.3, dur: 0.9, attack: 0.02, release: 0.5, dz: 0.4 },
    { kind: 'glow', name: 'home light', r: 1.5, rgb: SEAM_GLOW, a: 0.34, at: 0.44, dur: 0.4, attack: 0.02, release: 0.3, dz: 0.3 },
  ],
};

export const ARCHMAGE_EFFECTS: EffectDef[] = [archmageBriar, archmageMarrow, archmageEyewall, archmageSeam];

// ===========================================================================
// The plans
// ===========================================================================

export const ARCHMAGE_PLANS: Record<string, AbilityPlan> = {
  // ------------------------------------------------------- fxSigsArchmageA
  // arcane_ring — 'nova' r2.2, damage 5 (the jab off the heel). The ring
  // SNAPS outward (shatter: heart, shock ring, glass flung on true
  // height); the heel's stamp stays printed at the center (a small sigil).
  arcane_ring: { cues: [
    { id: 'arcane.shatter', scale: 0.9 },
    { id: 'arcane.sigil', at: 0.1, scale: 0.6, radiusK: 0.4 },
  ] },
  // wisp_flare — projectile_fan ×3 that RETURN: a 'blast' r0.55 at every
  // wound, twice per body. Each visit is a small pale flash and a tiny
  // waypoint loop stamped where the ticket was punched.
  wisp_flare: { cues: [
    { id: 'arcane.shatter', scale: 0.45 },
    { id: 'arcane.sigil', at: 0.05, scale: 0.3, radiusK: 0.4 },
  ] },
  // hearth_flare — 'nova' r2.0, burn. The opened stove: the roar (burst),
  // the stove burning through its life (plume: mixed-age mass, embers in
  // the chimney, dies down to coals), the raked coal bed at the center.
  hearth_flare: { cues: [
    { id: 'fire.burst', scale: 1.1 },
    { id: 'fire.plume', at: 0.25, scale: 0.7 },
    { id: 'fire.floor', at: 0.5, scale: 0.5, radiusK: 0.4 },
  ] },
  // undertow — ground_aoe 'blast' r2.2, chill 90. The plughole: the sea
  // takes its turn (splash: rings walk out, wet flecks stay), a haze
  // hangs over the drain, then the mouth gulps shut with one last plip.
  undertow: { cues: [
    { id: 'water.splash', scale: 1.2 },
    { id: 'water.mist', at: 0.3, scale: 0.7, radiusK: 0.7 },
    { id: 'water.splash', at: 1.0, scale: 0.6, radiusK: 0.4 },
  ] },
  // stormlash — chain_zap 'bolt' per hop. The call runs down the line
  // (arc), the promised bolt strikes from straight overhead at the mark
  // (strike, far), and a half-beat later the friends arrive — arcs
  // racing out around it and scorching the cluster (nova, far).
  stormlash: { cues: [
    { id: 'storm.arc', scale: 0.6 },
    { id: 'storm.strike', atFar: true, scale: 1.2 },
    { id: 'storm.nova', atFar: true, at: 0.32, scale: 0.6, radiusK: 0.5 },
  ] },
  // cinderstorm — 'nova' r2.4, burn. The emberstone exhales: a hoop
  // rolls out of the mouth, the flock of embers rides the heat, and
  // where each lands the floor burns down white → orange → soot.
  cinderstorm: { cues: [
    { id: 'smoke.ring', scale: 0.6 },
    { id: 'fire.burst', at: 0.04, scale: 1.0 },
    { id: 'fire.floor', at: 0.2, scale: 0.8, radiusK: 1 },
  ] },
  // glaciate — 'nova' r2.8, chill 2 (the deepest cold). One breath grows
  // one crystal: the cold arrives (nova), its arms stand up across the
  // circle (spears on the ring), the deep cold settles as fog.
  glaciate: { cues: [
    { id: 'frost.nova', scale: 1.4 },
    { id: 'frost.shards', at: 0.35, scale: 1.0, radiusK: 0.8 },
    { id: 'frost.fog', at: 1.0, scale: 0.8 },
  ] },
  // galvanic_arc — chain_zap 'bolt' per hop. The live arc leaps down the
  // line (arc); the pearl hovers at the strike and OVERCHARGES (charge:
  // ring draws in, motes climb, peaks white at 1.4 s); then it POPS —
  // a star of short arcs racing out where the pearl died (nova, far).
  galvanic_arc: { cues: [
    { id: 'storm.arc', scale: 0.8 },
    { id: 'storm.charge', atFar: true, at: 0.05, scale: 0.6 },
    { id: 'storm.nova', atFar: true, at: 1.45, scale: 0.6, radiusK: 0.4 },
  ] },
  // overgrowth — ground_field 'field' 5 s, r2.2, chill every 0.9 s. The
  // roster's own briar, re-spoken every 1.2 s so cane after cane springs
  // up and the circle thickens into a thicket — the burning-snow law.
  overgrowth: { cues: [
    { id: 'archmage.briar', scale: 1.0, every: 1.2 },
  ] },
  // grave_chill — 'nova' r2.4, chill 80. The deep earth exhales through
  // the living: the cold arrives (nova, low), the ground's shadows
  // deepen and grip at the ankle (veil), the pale breath from below
  // hangs over the seams and rimes the dirt (fog).
  grave_chill: { cues: [
    { id: 'frost.nova', scale: 0.7 },
    { id: 'shadow.veil', at: 0.15, scale: 0.6, radiusK: 0.8 },
    { id: 'frost.fog', at: 0.5, scale: 0.9, radiusK: 1 },
  ] },
  // gloom_burst — ground_field 'field' 5.5 s, r1.9, bleed every 0.9 s.
  // The violet orchard: the blight is planted (burst), and every beat a
  // flower opens and sheds — soul-flames waking in a ring and dripping
  // motes into the dirt (wisps, every 1.1 s); the gloom thickens (veil).
  gloom_burst: { cues: [
    { id: 'shadow.burst', scale: 0.8 },
    { id: 'shadow.wisps', at: 0.2, scale: 0.55, every: 1.1 },
    { id: 'shadow.veil', at: 0.4, scale: 0.5, every: 2.6 },
  ] },

  // ------------------------------------------------------- fxSigsArchmageB
  // venom_lash — projectile_fan ×2, a 'blast' r0.55 at each wound. Each
  // serpent's spit lands and SPLITS: the sac bursts into stains, then
  // the two runnels soak in as heavy beads dripping at the feet.
  venom_lash: { cues: [
    { id: 'venom.burst', scale: 0.7 },
    { id: 'venom.drip', at: 0.35, scale: 0.6 },
  ] },
  // magma_orb — projectile_fan, pierce: a 'blast' r0.55 at every body it
  // rolls through. The globe's weight throws earth as it passes (kick),
  // it bursts hot (burst), and the footprint-pool it leaves keeps
  // burning white → orange → soot (floor).
  magma_orb: { cues: [
    { id: 'dust.kick', scale: 0.6 },
    { id: 'fire.burst', scale: 0.9 },
    { id: 'fire.floor', at: 0.2, scale: 0.7, radiusK: 0.8 },
  ] },
  // shatterfrost — 'nova' r2.6, chill 80. The glacier bites down: its
  // weight on the ground (slam, small), the cold detonation (nova), and
  // the millstones' seam spitting chips — spears standing on the ring.
  shatterfrost: { cues: [
    { id: 'dust.slam', scale: 0.5 },
    { id: 'frost.nova', at: 0.02, scale: 1.3 },
    { id: 'frost.shards', at: 0.25, scale: 0.9, radiusK: 0.9 },
  ] },
  // solar_lance — 'beam' x→x2, damage 12, burn. Noon does not travel — it
  // IS: the radiant lance the whole length of the line, the singe where
  // it crosses (a low fan of flame down the aim), and the far end
  // bursting into light shards.
  solar_lance: { cues: [
    { id: 'arcane.beam', scale: 1.4 },
    { id: 'fire.fan', at: 0.08, scale: 0.45 },
    { id: 'arcane.shatter', atFar: true, at: 0.1, scale: 0.6 },
  ] },
  // rune_echo — pulse_nova: three 'nova' r2.2 pulses 0.5 s apart. Every
  // pulse the tablets flash (a small shatter heart + shock ring) and the
  // ward rings pulse; three stacked sigils = call, response, louder.
  rune_echo: { cues: [
    { id: 'arcane.shatter', scale: 0.35 },
    { id: 'arcane.sigil', at: 0.02, scale: 0.7 },
  ] },
  // marrow_pulse — pulse_nova: three 'nova' r2.3 pulses, chill. The
  // roster's own counting toll, once per pulse: the ring rolls out, the
  // knucklebones stand lit, grave-light rises, the chips lie.
  marrow_pulse: { cues: [
    { id: 'archmage.marrow', scale: 1.0 },
  ] },
  // void_rift — ground_field 'field' 5 s, r2.6, every beat DRAGS toward
  // the mouth. The unlit door stands (veil, re-spoken every 3 s) and
  // INHALES on its beat (grasp every 1.6 s: pulled in, clenched, let go).
  void_rift: { cues: [
    { id: 'shadow.veil', scale: 0.9, every: 3.0 },
    { id: 'shadow.grasp', at: 0.1, scale: 1.2, every: 1.6 },
  ] },
  // eye_of_the_storm — pulse_nova: four 'nova' r2.5 pulses 0.45 s apart,
  // shock. The roster's own eyewall, once per pulse: rain and bolts on
  // the band only, the calm disc dry at the center.
  eye_of_the_storm: { cues: [
    { id: 'archmage.eyewall', scale: 0.85 },
  ] },
  // red_eclipse — 'nova' r2.4, drain 35 %, bleed. The reverse rain: the
  // tithe gathers flecks and beads off the ring and lifts them into the
  // heart (drink — nothing lands, nothing glows), and where each thread
  // rose a dark stain stays (pool, small).
  red_eclipse: { cues: [
    { id: 'blood.drink', scale: 1.4 },
    { id: 'blood.pool', at: 0.5, scale: 0.5, radiusK: 0.8 },
  ] },
  // realm_rend — 'beam' x→x2 (range 16), damage 15, shock. The roster's
  // own unsewn seam the length of the corridor, and the shock landing at
  // the far end where the splinter went home.
  realm_rend: { cues: [
    { id: 'archmage.seam', scale: 1.2 },
    { id: 'storm.nova', atFar: true, at: 0.46, scale: 0.5, radiusK: 0.5 },
  ] },
};
