/**
 * FROST — cold is a thing that ARRIVES, and the ground remembers it.
 *
 * Every frost effect is a temperature change told in three acts: the
 * INTAKE (the air is pulled toward the point — mist and glints
 * sucked in, the breath before the cold), the SHOCK (a pale ring on
 * the ground, a crack of white, the cold mass rolling out LOW), and
 * the AFTERMATH (shards that landed lie and melt into RIME, a cold
 * fog that sinks — cold air falls — and a frost bed crusting the
 * dirt where it stood). Frost's ramp runs core → pale → ice → deep:
 * matter that dims as it thaws. Nothing here billows; it crystallizes.
 *
 * The layers' jobs, by name:
 *
 *   INTAKE     the attract field + mist motes and glints born on a
 *              rim and driven INTO the heart — the breath in
 *   SHOCK RING the pale pressure hoop on the ground; a second, deeper
 *              hoop a beat behind
 *   HEART      the white crack you cannot look at, a quarter second
 *   COLD MASS  BIG overlapping mist bodies rolling out low and
 *              stalling on drag — the cold itself, read as MASS
 *   SHARDS     heroes: slabs flung spinning on true height, landing,
 *              LYING where they fell, melting into rime
 *   HAIL       body shards that die on impact and rime the dirt
 *   SPRAY      fines — crystal dust, no residue
 *   GLINTS     ice dust winking while the ground is fresh
 *   FOG        the late voice: FEW, BIG, overlapping motes sinking to
 *              the floor — one fog, never confetti
 *   FROST BED  ground squares that die on the dirt and crust it —
 *              the temperature the ground remembers
 *   GLOW       the cold light, brief
 *
 * Sizes are authored for the street scale (~48–64 px/tile). Palette
 * shared with render/matter/frost.ts — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const CORE = '#eaf6ff';
export const PALE = '#b8dcf2';
export const ICE = '#7db3d8';
export const DEEP = '#4d7fa6';
export const MIST = '#cfe0ea';
/** Intermediate stops for the posterized ramps. */
const FROST_WHITE = '#f6fbff';
const MIST_THIN = '#dce9f0';

export const FROST_GLOW = '150, 208, 240';

/** Shards: core → pale → ice → deep, six flat bands. */
const RAMP_SHARD = rampOf({ stops: [CORE, PALE, ICE, DEEP], at: [0, 0.3, 0.65, 0.9], steps: 6 });
/** Mist: born pale, dims to ice as it thaws. */
const RAMP_MIST = rampOf({ stops: [MIST, PALE, ICE], at: [0, 0.5, 0.88], steps: 4 });
/** The cold mass: white at the crack, ice by the time it stalls. */
const RAMP_COLD = rampOf({ stops: [FROST_WHITE, MIST, PALE, ICE], at: [0, 0.2, 0.55, 0.9], steps: 6 });
/** Fog thins pale: the cold becoming weather. */
const RAMP_FOG = rampOf({ stops: [MIST, MIST_THIN, PALE, ICE], at: [0, 0.35, 0.7, 0.95], steps: 5 });
/** Spears: white-cored ice dimming to deep as they sink. */
const RAMP_SPEAR = rampOf({ stops: [CORE, PALE, ICE, DEEP], at: [0, 0.45, 0.8, 0.96], steps: 5 });

const MIST_A = curveOf('mist');
const SWELL = curveOf('swell');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const HOLD = curveOf('hold');
const SMOKE_A = curveOf('smoke');
/** A spike growing out of the ground, standing, then sinking back. */
const SPIKE_GROW = curveOf([0, 0.25, 0.22, 1, 0.72, 1, 1, 0.35]);
/** A crust that arrives, holds, and is taken by the thaw. */
const CRUST_A = curveOf([0, 0, 0.15, 0.85, 0.7, 0.85, 1, 0]);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** The shard hero — flung on true height, lands, lies, melts into rime. */
const SHARD: BurstOpts = {
  shape: 'shard', speed: 1.7, speedVar: 0.5, life: 1.5, lifeVar: 0.3, size: 0.085, sizeVar: 0.3,
  gravity: 0, spin: 9, vz: 2.3, zg: 8, land: 'settle', layer: 'world',
  ramp: RAMP_SHARD, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'frost', markLife: 5.5,
};

/** Hail — body shards that die where they strike and rime the dirt. */
const HAIL: BurstOpts = {
  ...SHARD, size: 0.062, sizeVar: 0.2, speed: 2.1, life: 0.9, vz: 1.8, zg: 7,
  land: 'die', markLife: 4,
};

/** Crystal dust — fines, no residue. */
const SPRAY: BurstOpts = {
  shape: 'shard', speed: 2.4, speedVar: 0.6, life: 0.7, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, spin: 14, vz: 1.6, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_SHARD, sizeCurve: HOLD,
};

/** Ice-dust glints on the fresh ground. */
const GLINT: BurstOpts = {
  shape: 'glint', speed: 0.12, life: 0.9, lifeVar: 0.4, size: 0.07, gravity: 0, z: 0.03,
  layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: curveOf('pulse'),
};

/** The cold mass — big overlapping bodies rolling out LOW, stalling. */
const COLD_MASS: BurstOpts = {
  shape: 'mote', speed: 1.5, speedVar: 0.5, life: 0.8, lifeVar: 0.3, size: 0.36, sizeVar: 0.3,
  gravity: 0, drag: 2.8, z: 0.06, vz: 0.15, zg: 0.4, layer: 'world', shadow: 0, spin: 0.6,
  ramp: RAMP_COLD, sizeCurve: curveOf([0, 0.55, 0.25, 1, 0.7, 0.9, 1, 0.5]), alphaCurve: FADE_LATE,
  wave: 'noise', waveHz: 1.6, waveAmp: 0.3,
};

/** The late fog — FEW, BIG, overlapping, sinking (cold air falls). */
const FOG: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 2.6, lifeVar: 0.3, size: 0.44, sizeVar: 0.25,
  gravity: 0, drag: 0.7, z: 0.22, vz: 0, zg: 0.18, layer: 'world', shadow: 0, spin: 0.25,
  ramp: RAMP_FOG, sizeCurve: SWELL, alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.5, waveAmp: 0.22, mass: 0.9,
};

/** A cold puff — a short breath of mist at a foot. */
const COLD_PUFF: BurstOpts = {
  shape: 'mote', speed: 0.35, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.3, sizeVar: 0.3,
  gravity: 0, drag: 1.6, z: 0.02, vz: 0.5, zg: 0.6, layer: 'world', shadow: 0, spin: 0.5,
  ramp: RAMP_MIST, sizeCurve: SWELL, alphaCurve: SMOKE_A,
};

/** The pressure hoop on the ground. */
const SHOCK_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', sizeCurve: curveOf([0, 0.2, 0.6, 3.4, 1, 4]), alphaCurve: FADE_LATE,
};

/** The white crack at the heart. */
const HEART: BurstOpts = {
  shape: 'blob', speed: 0.6, life: 0.24, size: 0.34, sizeVar: 0.2, gravity: 0, z: 0.2,
  layer: 'world', shadow: 0, sizeCurve: curveOf('flare'), alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: ['#ffffff', CORE, PALE], at: [0, 0.45, 0.85] }),
};

/** Intake mist — born on the rim, driven INTO the heart. */
const INTAKE_MIST: BurstOpts = {
  shape: 'mote', speed: 2.6, speedVar: 0.3, spread: 0.2, life: 0.34, lifeVar: 0.2, size: 0.22, sizeVar: 0.3,
  gravity: 0, drag: 0, mass: 3, z: 0.12, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [MIST, PALE, CORE], at: [0, 0.5, 0.85] }),
  alphaCurve: curveOf('fadeIn'), sizeCurve: curveOf([0, 1, 0.7, 0.8, 1, 0.3]),
};

/** Intake glints — dust drawn to the point. */
const INTAKE_GLINT: BurstOpts = {
  shape: 'glint', speed: 2.2, speedVar: 0.4, spread: 0.3, life: 0.3, size: 0.06, gravity: 0,
  mass: 3, z: 0.25, layer: 'world', shadow: 0, alphaCurve: curveOf('fadeIn'),
};

/** The frost bed — a ground square that dies on the dirt and crusts it. */
const FROST_BED: BurstOpts = {
  shape: 'square', speed: 0.04, life: 0.9, lifeVar: 0.4, size: 0.075, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [CORE, PALE, ICE], at: [0, 0.4, 0.8] }),
  sizeCurve: HOLD, alphaCurve: CRUST_A, mark: 'frost', markLife: 6,
};

/** An ice spear — a tapered tongue that stands on its foot, pointing up. */
const SPEAR: BurstOpts = {
  shape: 'lick', speed: 0.05, speedVar: 0, life: 1.25, lifeVar: 0.2, size: 0.36, sizeVar: 0.25,
  gravity: 0, vz: 1.3, zg: 1.9, land: 'die', layer: 'world', shadow: 0.6,
  ramp: RAMP_SPEAR, sizeCurve: SPIKE_GROW, alphaCurve: FADE_LATE, core: FROST_WHITE, coreK: 0.42,
};

/** Splinters — shards spat spinning off a spear as it rises. */
const SPLINTER: BurstOpts = {
  ...SPRAY, speed: 0.9, speedVar: 0.5, vz: 3.0, zg: 8, life: 0.8, size: 0.05, spin: 16,
};

/** Fog populations: FEW and BIG so the lobes merge into one cold fog. */
const FOG_POPS: EmitterPop[] = [
  { colors: [MIST, PALE], opts: FOG, weight: 2.2, tier: 'body' },
  { colors: [MIST_THIN, PALE], opts: { ...FOG, size: 0.3, z: 0.08, zg: 0.1, life: 2.0 }, weight: 1, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// frost.nova
// ---------------------------------------------------------------------------

/**
 * frost.nova — the cold detonation every frost impact builds on.
 */
export const frostNova: EffectDef = {
  id: 'frost.nova',
  name: 'Frost — nova',
  story: 'the intake breath gathers mist and glints into the heart → the white crack, the shock ring → the cold mass rolls out low → shards fly on true height, land, lie, and melt into rime → glints wink → the fog sinks and the frost bed crusts the ground',
  layers: [
    { kind: 'field', name: 'intake', field: { kind: 'attract', radius: 1.8, strength: 12, dur: 0.28, attack: 0.02, release: 0.08 } },
    { kind: 'burst', name: 'intake mist', recipe: recipe([MIST, PALE], INTAKE_MIST), count: 10, tier: 'body', arrange: 'rim', radius: 1.2, outward: -2.6 },
    { kind: 'burst', name: 'intake glints', recipe: recipe([CORE, PALE], INTAKE_GLINT), count: 8, tier: 'fine', arrange: 'rim', radius: 1.4, outward: -2.4 },
    { kind: 'burst', name: 'heart', recipe: recipe([CORE, '#ffffff'], HEART), count: 3, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'shock ring', recipe: recipe([CORE, PALE], SHOCK_RING), count: 1, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'second ring', recipe: recipe([PALE, ICE], { ...SHOCK_RING, life: 0.5, size: 0.3 }), count: 1, tier: 'hero', at: 0.32 },
    { kind: 'burst', name: 'cold mass', recipe: recipe([FROST_WHITE, MIST, PALE], COLD_MASS), count: 14, tier: 'body', at: 0.24, arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'shards', recipe: recipe([CORE, PALE, ICE], SHARD), count: 10, tier: 'hero', at: 0.24, dz: 0.2 },
    { kind: 'burst', name: 'hail', recipe: recipe([PALE, ICE], HAIL), count: 10, tier: 'body', at: 0.24, dz: 0.15 },
    { kind: 'burst', name: 'spray', recipe: recipe([CORE, PALE, MIST], SPRAY), count: 18, tier: 'fine', at: 0.24, dz: 0.1 },
    { kind: 'burst', name: 'second mass', recipe: recipe([MIST, PALE], { ...COLD_MASS, size: 0.3, speed: 1.0, life: 0.7 }), count: 8, tier: 'body', at: 0.36, arrange: 'disc', radius: 0.3 },
    { kind: 'burst', name: 'glints', recipe: recipe([CORE, PALE], GLINT), count: 12, tier: 'fine', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.4 },
    { kind: 'burst', name: 'late glints', recipe: recipe([CORE, PALE], GLINT), count: 4, tier: 'fine', arrange: 'disc', radius: 1.0, radiusK: 1, at: 0.9, every: 0.35, times: 4 },
    { kind: 'burst', name: 'frost bed', recipe: recipe([CORE, PALE, ICE], FROST_BED), count: 8, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.5 },
    { kind: 'emit', name: 'fog', arrange: 'disc', radius: 0.75, radiusK: 0.75, at: 0.45, rate: 17, dur: 2.0, attack: 0.25, release: 0.8, tier: 'body', pops: FOG_POPS },
    { kind: 'glow', name: 'glow', r: 1.6, rgb: FROST_GLOW, a: 0.26, at: 0.24, dur: 0.9, attack: 0.02, release: 0.6, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// frost.fog
// ---------------------------------------------------------------------------

/**
 * frost.fog — a cold fog settling on a disc: one fog, sinking and
 * drifting, glints inside it, rime crusting the ground beneath.
 */
export const frostFog: EffectDef = {
  id: 'frost.fog',
  name: 'Frost — fog',
  story: 'one cold fog settles on the disc and drifts on a slow wind, glints wink inside it, and the ground beneath it rimes over',
  layers: [
    { kind: 'field', name: 'drift', field: { kind: 'wind', radius: 1.8, strength: 0.45, dur: 3.2, dir: 0.4 } },
    { kind: 'emit', name: 'fog', arrange: 'disc', radius: 0.9, radiusK: 0.9, rate: 18, dur: 3.0, attack: 0.3, release: 0.9, pops: FOG_POPS },
    { kind: 'burst', name: 'first breath', recipe: recipe([MIST, PALE], { ...FOG, life: 2.2 }), count: 5, tier: 'body', arrange: 'disc', radius: 0.6, radiusK: 0.6 },
    { kind: 'burst', name: 'glints', recipe: recipe([CORE, PALE], GLINT), count: 3, tier: 'fine', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.3, every: 0.3, times: 8 },
    { kind: 'burst', name: 'frost bed', recipe: recipe([PALE, ICE], { ...FROST_BED, life: 0.7, markLife: 4.5 }), count: 3, tier: 'hero', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.4, every: 0.45, times: 5 },
    { kind: 'glow', name: 'glow', r: 1.3, rgb: FROST_GLOW, a: 0.14, dur: 3.2, attack: 0.4, release: 0.9, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// frost.shards — the spikes
// ---------------------------------------------------------------------------

/**
 * frost.shards — ice spears erupting from the ground on a ring: a
 * frost ring races out to the ring's edge, the crust forms at each
 * foot, spears stand up out of it spitting splinters, glints, a cold
 * puff at every foot, and the rime stays where each spear stood.
 */
export const frostShards: EffectDef = {
  id: 'frost.shards',
  name: 'Frost — shards',
  story: 'a frost ring races out → the crust forms on the ring → ice spears stand up out of each foot spitting spinning splinters, a cold puff at every foot → an outer ring of lesser spikes → glints → the spears sink back and the rime stays where each one stood',
  layers: [
    { kind: 'burst', name: 'frost ring', recipe: recipe([CORE, PALE], { ...SHOCK_RING, life: 0.36, size: 0.4 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'crust', recipe: recipe([CORE, PALE], { ...FROST_BED, size: 0.1, life: 1.3, markLife: 6.5 }), count: 8, tier: 'hero', arrange: 'ring', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'spears', recipe: recipe([CORE, PALE, ICE], SPEAR), count: 8, tier: 'hero', arrange: 'ring', radius: 0.8, radiusK: 0.8, at: 0.06 },
    { kind: 'burst', name: 'foot puffs', recipe: recipe([MIST, PALE], COLD_PUFF), count: 8, tier: 'body', arrange: 'ring', radius: 0.8, radiusK: 0.8, at: 0.06 },
    { kind: 'burst', name: 'splinters', recipe: recipe([CORE, PALE], SPLINTER), count: 20, tier: 'fine', arrange: 'ring', radius: 0.8, radiusK: 0.8, at: 0.08 },
    { kind: 'burst', name: 'shards', recipe: recipe([PALE, ICE], { ...HAIL, speed: 0.9, vz: 2.4, size: 0.065 }), count: 8, tier: 'body', arrange: 'ring', radius: 0.8, radiusK: 0.8, at: 0.1 },
    { kind: 'burst', name: 'outer crust', recipe: recipe([PALE, ICE], { ...FROST_BED, size: 0.08, life: 1.1, markLife: 5 }), count: 8, tier: 'hero', arrange: 'ring', radius: 1.25, radiusK: 1.25, at: 0.16 },
    { kind: 'burst', name: 'lesser spikes', recipe: recipe([PALE, ICE], { ...SPEAR, size: 0.24, life: 1.0, vz: 1.2, zg: 1.9 }), count: 8, tier: 'body', arrange: 'ring', radius: 1.25, radiusK: 1.25, at: 0.2 },
    { kind: 'burst', name: 'outer puffs', recipe: recipe([MIST, PALE], { ...COLD_PUFF, size: 0.2 }), count: 8, tier: 'body', arrange: 'ring', radius: 1.25, radiusK: 1.25, at: 0.2 },
    { kind: 'burst', name: 'glints', recipe: recipe([CORE, PALE], GLINT), count: 6, tier: 'fine', arrange: 'ring', radius: 0.8, radiusK: 0.8, at: 0.3, every: 0.3, times: 3 },
    { kind: 'field', name: 'cold rolls out', field: { kind: 'attract', radius: 1.9, strength: -0.9, dur: 1.6, attack: 0.1, release: 0.5 }, radiusK: 1.9 },
    { kind: 'emit', name: 'ground fog', arrange: 'ring', radius: 0.9, radiusK: 0.9, at: 0.5, rate: 9, dur: 1.5, attack: 0.3, release: 0.7, tier: 'body', pops: FOG_POPS },
    { kind: 'glow', name: 'glow', r: 1.5, rgb: FROST_GLOW, a: 0.22, dur: 1.0, attack: 0.03, release: 0.6, radiusK: 1.2 },
  ],
};

// ---------------------------------------------------------------------------
// frost.breath — the aimed cone of cold
// ---------------------------------------------------------------------------

/** The breath mass — mist bodies blown out in a cone, sinking to the floor. */
const BREATH_MASS: BurstOpts = {
  ...COLD_MASS, speed: 3.2, speedVar: 0.4, drag: 1.7, life: 0.95, lifeVar: 0.25, size: 0.38,
  z: 0.5, vz: 0.1, zg: 0.9, land: 'settle', sizeCurve: curveOf([0, 0.45, 0.3, 1, 0.75, 1, 1, 0.5]),
};

/** Breath hail — shards that fly the cone, land, and rime the cone floor. */
const BREATH_HAIL: BurstOpts = {
  ...HAIL, speed: 3.4, speedVar: 0.45, life: 1.1, z: 0.5, vz: 0.4, zg: 3.5, markLife: 4.5,
};

/** Rime sliding along the cone floor — ground squares that die and crust it. */
const BREATH_RIME: BurstOpts = {
  ...FROST_BED, speed: 2.6, speedVar: 0.6, drag: 2.6, life: 0.8, lifeVar: 0.3, size: 0.07, markLife: 5,
};

/** The breath populations for the sustained gust. */
const BREATH_POPS: EmitterPop[] = [
  { colors: [FROST_WHITE, MIST, PALE], opts: BREATH_MASS, weight: 2.4, tier: 'body' },
  { colors: [CORE, PALE], opts: { ...SPRAY, speed: 3.6, z: 0.5, zg: 3, spin: 12 }, weight: 1.4, tier: 'fine' },
  { colors: [PALE, ICE], opts: BREATH_HAIL, weight: 0.6, tier: 'body' },
];

/**
 * frost.breath — an aimed cone of cold: glints drawn to the mouth, the
 * mist masses out and sinks along the cone, hail rimes the cone floor,
 * a lingering fog drifts on a wind aimed with the breath.
 */
export const frostBreath: EffectDef = {
  id: 'frost.breath',
  name: 'Frost — breath',
  story: 'glints are drawn to the mouth → the cold masses out in a cone and sinks to the floor → shard fines and hail fly it, the hail landing and riming the cone floor → rime slides along the ground → a lingering fog drifts on a wind aimed with the breath',
  layers: [
    { kind: 'burst', name: 'intake', recipe: recipe([CORE, PALE], { ...INTAKE_GLINT, speed: 1.6, life: 0.22 }), count: 6, tier: 'fine', arrange: 'rim', radius: 0.5, outward: -1.8, dz: 0.55 },
    { kind: 'burst', name: 'intake mist', recipe: recipe([MIST, PALE], { ...INTAKE_MIST, size: 0.16, life: 0.2, mass: 0 }), count: 5, tier: 'body', arrange: 'rim', radius: 0.45, outward: -2.2, dz: 0.5 },
    { kind: 'burst', name: 'first gust', recipe: recipe([FROST_WHITE, MIST, PALE], BREATH_MASS), count: 12, tier: 'body', arrange: 'cone', spread: 0.5, at: 0.1 },
    { kind: 'burst', name: 'hail', recipe: recipe([PALE, ICE], BREATH_HAIL), count: 8, tier: 'hero', arrange: 'cone', spread: 0.55, at: 0.1 },
    { kind: 'burst', name: 'fines', recipe: recipe([CORE, PALE, MIST], { ...SPRAY, speed: 3.8, z: 0.5, zg: 3, spin: 12 }), count: 16, tier: 'fine', arrange: 'cone', spread: 0.6, at: 0.1 },
    { kind: 'emit', name: 'gust', arrange: 'cone', aimed: true, spread: 0.5, at: 0.16, rate: 34, dur: 0.55, attack: 0.05, release: 0.2, tier: 'body', pops: BREATH_POPS },
    { kind: 'burst', name: 'floor rime', recipe: recipe([CORE, PALE, ICE], BREATH_RIME), count: 8, tier: 'hero', arrange: 'cone', spread: 0.5, at: 0.3 },
    { kind: 'burst', name: 'floor rime far', recipe: recipe([PALE, ICE], { ...BREATH_RIME, speed: 3.6, drag: 2.2, life: 1.0 }), count: 5, tier: 'hero', arrange: 'cone', spread: 0.4, at: 0.45 },
    { kind: 'field', name: 'cold wind', field: { kind: 'wind', radius: 2.6, strength: 2.2, dur: 2.0, attack: 0.1, release: 0.6 }, aimed: true },
    { kind: 'emit', name: 'lingering fog', arrange: 'cone', aimed: true, spread: 0.55, at: 0.4, rate: 12, dur: 1.8, attack: 0.2, release: 0.7, tier: 'body',
      pops: [
        { colors: [MIST, PALE], opts: { ...FOG, speed: 1.1, speedVar: 0.4, size: 0.4, z: 0.12, zg: 0.12, life: 2.2, mass: 1.2 }, weight: 2, tier: 'body' },
        { colors: [MIST_THIN, PALE], opts: { ...FOG, speed: 0.9, size: 0.28, z: 0.05, zg: 0.06, life: 1.8, mass: 1.2 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'burst', name: 'glints', recipe: recipe([CORE, PALE], { ...GLINT, speed: 1.4, life: 0.7 }), count: 4, tier: 'fine', arrange: 'cone', spread: 0.5, at: 0.5, every: 0.3, times: 3 },
    { kind: 'glow', name: 'mouth glow', r: 1.0, rgb: FROST_GLOW, a: 0.22, dur: 0.6, attack: 0.03, release: 0.4, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// frost.pillar — the column of ice
// ---------------------------------------------------------------------------

/** A pillar tier — spears standing at altitude, the column's stack. */
const PILLAR_SPEAR: BurstOpts = {
  ...SPEAR, speed: 0.12, speedVar: 0.5, vz: 0.9, zg: 0.9, life: 1.3, lifeVar: 0.15, size: 0.4,
  land: 'none', shadow: 0, sizeCurve: curveOf([0, 0.3, 0.18, 1, 0.78, 1, 1, 0.3]),
};

/** Shards thrown off the column, landing and riming the base. */
const PILLAR_SHARD: BurstOpts = {
  ...SHARD, speed: 1.3, speedVar: 0.5, vz: 1.4, zg: 7, life: 1.6, size: 0.08,
};

/**
 * frost.pillar — a column of ice erupting at the point: glints and
 * mist gather in, the ring shocks, the column stacks up tier over
 * tier, shards fall off it and rime the base, then it comes apart.
 */
export const frostPillar: EffectDef = {
  id: 'frost.pillar',
  name: 'Frost — pillar',
  story: 'glints and mist gather to the point → the white crack, the frost ring → the column stacks up tier over tier, shards thrown off it landing and riming the base → glints ride the column → it comes apart in a shatter, and the frost bed and a sinking fog stay at its foot',
  layers: [
    { kind: 'field', name: 'gather', field: { kind: 'attract', radius: 1.6, strength: 10, dur: 0.3, attack: 0.02, release: 0.08 } },
    { kind: 'burst', name: 'gathering glints', recipe: recipe([CORE, PALE], INTAKE_GLINT), count: 12, tier: 'fine', arrange: 'rim', radius: 1.1, outward: -2.4, dz: 0.2 },
    { kind: 'burst', name: 'gathering mist', recipe: recipe([MIST, PALE], INTAKE_MIST), count: 8, tier: 'body', arrange: 'rim', radius: 0.95, outward: -2.4 },
    { kind: 'burst', name: 'heart', recipe: recipe([CORE, '#ffffff'], { ...HEART, size: 0.3 }), count: 2, tier: 'hero', at: 0.28, dz: 0.3 },
    { kind: 'burst', name: 'frost ring', recipe: recipe([CORE, PALE], { ...SHOCK_RING, size: 0.4 }), count: 1, tier: 'hero', at: 0.28 },
    { kind: 'burst', name: 'base mass', recipe: recipe([FROST_WHITE, MIST, PALE], { ...COLD_MASS, speed: 1.1, size: 0.32, life: 0.7 }), count: 9, tier: 'body', at: 0.28, arrange: 'disc', radius: 0.16 },
    { kind: 'burst', name: 'tier one', recipe: recipe([CORE, PALE, ICE], PILLAR_SPEAR), count: 4, tier: 'hero', at: 0.28, arrange: 'disc', radius: 0.14 },
    { kind: 'burst', name: 'tier two', recipe: recipe([CORE, PALE, ICE], { ...PILLAR_SPEAR, size: 0.34, life: 1.2 }), count: 3, tier: 'hero', at: 0.36, arrange: 'disc', radius: 0.1, dz: 0.4 },
    { kind: 'burst', name: 'tier three', recipe: recipe([CORE, PALE], { ...PILLAR_SPEAR, size: 0.28, life: 1.1 }), count: 3, tier: 'hero', at: 0.44, arrange: 'disc', radius: 0.08, dz: 0.8 },
    { kind: 'burst', name: 'the tip', recipe: recipe([CORE, FROST_WHITE], { ...PILLAR_SPEAR, size: 0.22, life: 1.0, vz: 1.1 }), count: 2, tier: 'hero', at: 0.52, dz: 1.15 },
    { kind: 'burst', name: 'base shards', recipe: recipe([CORE, PALE, ICE], PILLAR_SHARD), count: 8, tier: 'hero', at: 0.3, dz: 0.2 },
    { kind: 'burst', name: 'high shards', recipe: recipe([PALE, ICE], { ...PILLAR_SHARD, vz: 0.6, life: 1.7 }), count: 6, tier: 'body', at: 0.46, dz: 0.9 },
    { kind: 'burst', name: 'spray', recipe: recipe([CORE, PALE, MIST], { ...SPRAY, vz: 2.4 }), count: 16, tier: 'fine', at: 0.3, dz: 0.3 },
    { kind: 'burst', name: 'column glints', recipe: recipe([CORE, PALE], { ...GLINT, z: 0, vz: 1.2, zg: 0, life: 0.55, speed: 0.2 }), count: 4, tier: 'fine', at: 0.5, every: 0.22, times: 4, dz: 0.4 },
    { kind: 'burst', name: 'shatter', recipe: recipe([CORE, PALE, ICE], { ...PILLAR_SHARD, speed: 1.6, vz: 0.8, life: 1.4 }), count: 8, tier: 'body', at: 1.35, dz: 0.7 },
    { kind: 'burst', name: 'shatter dust', recipe: recipe([MIST, PALE], { ...COLD_PUFF, size: 0.3, vz: 0.2, zg: 0.9 }), count: 7, tier: 'body', at: 1.35, dz: 0.6 },
    { kind: 'burst', name: 'foot crust', recipe: recipe([CORE, PALE], { ...FROST_BED, size: 0.09, life: 0.8, markLife: 6.5 }), count: 6, tier: 'hero', arrange: 'ring', radius: 0.32, at: 0.3 },
    { kind: 'burst', name: 'frost bed', recipe: recipe([CORE, PALE, ICE], FROST_BED), count: 7, tier: 'hero', arrange: 'disc', radius: 0.5, at: 0.6 },
    { kind: 'emit', name: 'foot fog', arrange: 'disc', radius: 0.55, at: 0.7, rate: 10, dur: 1.9, attack: 0.3, release: 0.8, tier: 'body', pops: FOG_POPS },
    { kind: 'glow', name: 'glow', r: 1.5, rgb: FROST_GLOW, a: 0.28, at: 0.28, dur: 1.3, attack: 0.03, release: 0.7 },
    { kind: 'glow', name: 'column glow', r: 0.9, rgb: FROST_GLOW, a: 0.16, at: 0.5, dur: 0.9, attack: 0.1, release: 0.5, dz: 0.8 },
  ],
};

export const FROST_EFFECTS: EffectDef[] = [frostNova, frostFog, frostShards, frostBreath, frostPillar];
