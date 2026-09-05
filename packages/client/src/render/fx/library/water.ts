/**
 * WATER — the honest liquid, mastered (particles v6, phase 5).
 *
 * Water tells the truth about physics harder than any other matter:
 * everything that goes up comes down, everything that comes down
 * SPLATS, and the ground shows a ring where it struck. Its story has
 * three voices on every effect:
 *
 *   DROPS    the body — teardrops on true height, arcing on vz and
 *            falling back to splat (the engine's splat spawns the
 *            spatter and leaves a pale WET FLECK on the dirt by
 *            itself). Heroes carry an `onLand` recipe: a RIPPLE ring
 *            popping where they strike
 *   RIPPLES  `ring` silhouettes on the ground layer expanding on a
 *            fadeOut — staggered two or three at different `at` so
 *            they read as concentric rings walking out
 *   MIST     round `mote` masses (vapour has no corners) that swell,
 *            hang on the `mist` alpha, and drift on a gentle wind;
 *            glints wink inside the spray
 *
 * Palette shared with render/matter/water.ts — ONE-VOICE: deep
 * channel blue → foam white, clear and pale, never neon cyan. The
 * glow is the faint cool light off wet things (a ≤ 0.14), never a
 * lamp. Sizes are authored for the street scale (~48–64 px/tile).
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { defineRecipe, type BurstOpts, type EmitterPop } from '../../particles.js';

export const DEEP = '#5b8fb8';
export const CHANNEL = '#7db3d8';
export const LIGHT = '#9cc9e8';
export const FOAM = '#d8ecf7';
export const WHITE = '#f0f8fc';
/** Intermediate stop for the posterized mist ramp — pale, still blue. */
export const PALE = '#bcdcef';

/** The light off wet things: cool, faint, never a lamp. */
export const WATER_GLOW = '175, 208, 232';

/** A drop born bright with the sky on it, settling to channel blue. */
export const RAMP_DROP = rampOf({ stops: [WHITE, LIGHT, CHANNEL], at: [0, 0.3, 0.75] });
/** The heavy drop keeps a deep heart in flight but stains pale. */
export const RAMP_HEAVY = rampOf({ stops: [LIGHT, CHANNEL, DEEP, CHANNEL], at: [0, 0.3, 0.6, 0.9] });
/** Crown water: foam that turns to body as it falls. */
export const RAMP_CROWN = rampOf({ stops: [WHITE, FOAM, LIGHT, CHANNEL], at: [0, 0.3, 0.7, 1], steps: 5 });
/** Mist thins from foam to pale to nothing-blue. */
export const RAMP_MIST = rampOf({ stops: [FOAM, PALE, LIGHT], at: [0, 0.5, 0.9], steps: 4 });
/** A ripple's rim: foam at the crest, channel as it spreads. */
export const RAMP_RIPPLE = rampOf({ stops: [FOAM, LIGHT, CHANNEL], at: [0, 0.45, 0.85] });

const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST_A = curveOf('mist');
const SWELL = curveOf('swell');
const FLARE = curveOf('flare');
const PULSE = curveOf('pulse');
/** A ripple walks out: born small, spreading fast, then coasting. */
const RIPPLE_GROW = curveOf([0, 0.25, 0.35, 1.9, 0.7, 2.9, 1, 3.4]);
/** A small ripple, one beat. */
const POP_GROW = curveOf([0, 0.3, 0.5, 1.8, 1, 2.4]);
/** The crown: flung up full, fattening on the way down. */
const CROWN_SIZE = curveOf([0, 0.7, 0.3, 1, 0.75, 0.85, 1, 0.55]);

// ---------------------------------------------------------------------------
// Sub-recipes — what a drop does when it lands (registered once).
// ---------------------------------------------------------------------------

/** The small ripple popping where a drop struck — a ground ring. */
const RIPPLE_POP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.2, size: 0.11, sizeVar: 0.2, gravity: 0,
  layer: 'ground', ramp: RAMP_RIPPLE, sizeCurve: POP_GROW, alphaCurve: FADE_OUT,
};

/** A heavier strike: a wider ripple with a foam bead standing at its heart. */
const RIPPLE_STRIKE: BurstOpts = {
  ...RIPPLE_POP, life: 0.7, size: 0.2, sizeCurve: RIPPLE_GROW,
};

const FOAM_BEAD: BurstOpts = {
  shape: 'mote', speed: 0.12, life: 0.3, lifeVar: 0.3, size: 0.06, sizeVar: 0.3, gravity: 0,
  z: 0.02, vz: 0.5, zg: 4, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WHITE, FOAM] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

const R_POP = defineRecipe({ colors: [FOAM, LIGHT], opts: RIPPLE_POP, count: 1 });
const R_STRIKE = defineRecipe({ colors: [FOAM, LIGHT], opts: RIPPLE_STRIKE, count: 1 });
const R_BEAD = defineRecipe({ colors: [WHITE, FOAM], opts: FOAM_BEAD, count: 2, inherit: 0.15 });
/** Crown water landing: a ripple pop AND a foam bead standing in it. */
const R_CROWN_LAND = defineRecipe({ colors: [FOAM, LIGHT], opts: { ...RIPPLE_POP, size: 0.08, life: 0.36 }, count: 1 });
/** A stream drop striking at range: a fan of fines skidding forward. */
const R_FAN = defineRecipe({
  colors: [LIGHT, FOAM],
  opts: {
    shape: 'drop', speed: 0.7, speedVar: 0.5, life: 0.4, size: 0.035, sizeVar: 0.3, gravity: 0,
    vz: 0.9, zg: 7, land: 'die', layer: 'world', shadow: 0, ramp: RAMP_DROP, sizeCurve: HOLD,
  },
  count: 2, inherit: 0.45,
});
/** Mist shed along a stream — motes that keep some of the flight. */
const R_STREAM_MIST = defineRecipe({
  colors: [FOAM, PALE],
  opts: {
    shape: 'mote', speed: 0.15, life: 0.7, lifeVar: 0.3, size: 0.16, sizeVar: 0.3, gravity: 0,
    drag: 2.4, zg: 0.4, land: 'die', layer: 'world', shadow: 0,
    ramp: RAMP_MIST, sizeCurve: SWELL, alphaCurve: MIST_A,
  },
  count: 1, inherit: 0.35,
});

// ---------------------------------------------------------------------------
// The grains
// ---------------------------------------------------------------------------

/** The hero drop: thrown on true height, splatting, popping a ripple. */
const DROP_HERO: BurstOpts = {
  shape: 'drop', speed: 1.1, speedVar: 0.5, life: 2.2, size: 0.08, sizeVar: 0.3, gravity: 0,
  vz: 2.6, zg: 9, land: 'splat', layer: 'world',
  ramp: RAMP_DROP, sizeCurve: HOLD, onLand: R_STRIKE,
};

/** Body drops: the bulk of the throw, splatting into flecks. */
const DROP_BODY: BurstOpts = {
  shape: 'drop', speed: 1.4, speedVar: 0.6, life: 1.8, size: 0.055, sizeVar: 0.35, gravity: 0,
  vz: 2.2, zg: 9, land: 'die', layer: 'world',
  ramp: RAMP_DROP, sizeCurve: HOLD, onLand: R_POP,
};

/** Fine spray: the dots between the drops, dying where they land. */
const DROP_FINE: BurstOpts = {
  shape: 'drop', speed: 1.9, speedVar: 0.6, life: 1.2, size: 0.038, sizeVar: 0.35, gravity: 0,
  vz: 1.8, zg: 9, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_DROP, sizeCurve: HOLD,
};

/** The crown: fat blobs flung up off the rim, fattening as they fall. */
const CROWN: BurstOpts = {
  shape: 'blob', align: true, speed: 0.55, speedVar: 0.4, life: 0.75, lifeVar: 0.2, size: 0.2, sizeVar: 0.3,
  gravity: 0, drag: 0.6, vz: 2.1, zg: 8, land: 'die', layer: 'world',
  ramp: RAMP_CROWN, sizeCurve: CROWN_SIZE, alphaCurve: FADE_LATE,
  core: WHITE, coreK: 0.4, onLand: R_CROWN_LAND,
};

/** The sheet: the flat pale flash where the body hit. */
const SHEET: BurstOpts = {
  shape: 'blob', speed: 0.4, life: 0.24, lifeVar: 0.15, size: 0.44, sizeVar: 0.2, gravity: 0,
  z: 0.06, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WHITE, FOAM, LIGHT], at: [0, 0.45, 0.85] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The big ripple set: rings walking out on the ground. */
const RIPPLE: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.9, lifeVar: 0.08, size: 0.42, sizeVar: 0.04, gravity: 0,
  layer: 'ground', ramp: RAMP_RIPPLE, sizeCurve: RIPPLE_GROW, alphaCurve: FADE_OUT,
};

/** Mist: big round lobes that swell, hang, and thin — vapour has no corners. */
const MIST: BurstOpts = {
  shape: 'mote', speed: 0.22, speedVar: 0.5, life: 1.9, lifeVar: 0.3, size: 0.3, sizeVar: 0.25,
  gravity: 0, drag: 1.2, z: 0.1, vz: 0.32, zg: 0.06, mass: 0.7, layer: 'world', shadow: 0,
  ramp: RAMP_MIST, sizeCurve: SWELL, alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

/** The low haze between the mist — thinner, closer to the ground. */
const HAZE: BurstOpts = {
  ...MIST, size: 0.16, speed: 0.2, vz: 0.2, life: 1.9, z: 0.04,
  ramp: rampOf({ stops: [PALE, LIGHT, '#a9cfe6'], steps: 3 }),
};

/** Glints: the sun caught in the spray. */
const GLINT: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 0.5, lifeVar: 0.4, size: 0.055, gravity: 0, z: 0.25,
  vz: 0.3, zg: 0.4, land: 'die', layer: 'world', shadow: 0,
  alphaCurve: FADE_OUT, sizeCurve: PULSE,
};

/** Rain streak: falls from height at speed, splats, pops a ripple. */
const RAIN_STREAK: BurstOpts = {
  shape: 'streak', speed: 0.06, life: 2.0, size: 0.05, sizeVar: 0.3, gravity: 0,
  vz: -4.2, zg: 5, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LIGHT, CHANNEL], at: [0, 0.6] }), sizeCurve: HOLD, onLand: R_POP,
};

/** Fine rain: thinner streaks, no ripple, dies on the ground. */
const RAIN_FINE: BurstOpts = {
  ...RAIN_STREAK, size: 0.032, vz: -4.6, land: 'die', onLand: 0,
  ramp: rampOf({ stops: [FOAM, LIGHT], at: [0, 0.6] }),
};

/** Heavy rain hero: a fat drop that strikes and rings wide. */
const RAIN_HEAVY: BurstOpts = {
  shape: 'drop', speed: 0.05, life: 2.0, size: 0.07, sizeVar: 0.25, gravity: 0,
  vz: -3.6, zg: 5, land: 'splat', layer: 'world',
  ramp: RAMP_HEAVY, sizeCurve: HOLD, onLand: R_STRIKE,
};

/** Jet streak: the pressured line of the stream. */
const JET_STREAK: BurstOpts = {
  shape: 'streak', speed: 3.6, speedVar: 0.3, life: 1.2, size: 0.06, sizeVar: 0.25, gravity: 0,
  vz: 0.9, zg: 5, land: 'die', layer: 'world',
  ramp: rampOf({ stops: [WHITE, LIGHT, CHANNEL], at: [0, 0.4, 0.85] }), sizeCurve: HOLD,
  onLand: R_FAN, shed: R_STREAM_MIST, shedRate: 5,
};

/** Jet drops: the body of the stream, splatting in a fan at range. */
const JET_DROP: BurstOpts = {
  shape: 'drop', speed: 3.2, speedVar: 0.4, life: 1.4, size: 0.07, sizeVar: 0.3, gravity: 0,
  vz: 1.0, zg: 5, land: 'splat', layer: 'world',
  ramp: RAMP_DROP, sizeCurve: HOLD, onLand: R_POP,
};

/** Stream mist: motes riding the jet and stalling on drag. */
const JET_MIST: BurstOpts = {
  shape: 'mote', speed: 2.4, speedVar: 0.4, life: 0.9, lifeVar: 0.3, size: 0.15, sizeVar: 0.3,
  gravity: 0, drag: 2.6, vz: 0.5, zg: 0.6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_MIST, sizeCurve: SWELL, alphaCurve: MIST_A,
};

/** A drop condensing out of standing spray and falling. */
const CONDENSE: BurstOpts = {
  shape: 'drop', speed: 0.05, life: 1.2, size: 0.06, sizeVar: 0.3, gravity: 0,
  z: 0.7, vz: -0.15, zg: 5, land: 'splat', layer: 'world',
  ramp: RAMP_DROP, sizeCurve: HOLD, onLand: R_STRIKE,
};

// ---------------------------------------------------------------------------
// Populations
// ---------------------------------------------------------------------------

export const MIST_POPS: EmitterPop[] = [
  { colors: [FOAM, PALE], opts: MIST, weight: 2.2, tier: 'body' },
  { colors: [PALE, LIGHT], opts: HAZE, weight: 1.2, tier: 'fine' },
];

export const RAIN_POPS: EmitterPop[] = [
  { colors: [LIGHT, CHANNEL], opts: RAIN_STREAK, weight: 2.0, tier: 'body' },
  { colors: [FOAM, LIGHT], opts: RAIN_FINE, weight: 1.6, tier: 'fine' },
  { colors: [LIGHT, CHANNEL], opts: RAIN_HEAVY, weight: 0.35, tier: 'hero' },
];

export const JET_POPS: EmitterPop[] = [
  { colors: [WHITE, LIGHT], opts: JET_STREAK, weight: 1.4, tier: 'body' },
  { colors: [LIGHT, CHANNEL], opts: JET_DROP, weight: 1.6, tier: 'hero' },
  { colors: [FOAM, LIGHT], opts: { ...DROP_FINE, speed: 3.0, vz: 0.8, zg: 5, life: 1.2 }, weight: 1.0, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// The effects
// ---------------------------------------------------------------------------

/**
 * water.splash — a body hitting water, a bucket thrown.
 */
export const waterSplash: EffectDef = {
  id: 'water.splash',
  name: 'Water — splash',
  story: 'the sheet flashes pale where the body hits → a crown of fat water flings up off the rim and falls back to splat → drops arc high and pop ripples where they strike → three rings walk out on the ground → a mist puff hangs and thins → wet flecks stay on the dirt',
  layers: [
    { kind: 'burst', name: 'sheet', recipe: recipe([WHITE, FOAM], SHEET), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'first ring', recipe: recipe([FOAM, LIGHT], RIPPLE), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'crown', recipe: recipe([WHITE, FOAM, LIGHT], CROWN), count: 10, tier: 'body', arrange: 'rim', radius: 0.16, outward: 0.6, dz: 0.04 },
    { kind: 'burst', name: 'heroes', recipe: recipe([LIGHT, CHANNEL, WHITE], DROP_HERO), count: 6, tier: 'hero', dz: 0.1 },
    { kind: 'burst', name: 'drops', recipe: recipe([LIGHT, CHANNEL], DROP_BODY), count: 12, tier: 'body', dz: 0.1 },
    { kind: 'burst', name: 'spray', recipe: recipe([FOAM, LIGHT], DROP_FINE), count: 18, tier: 'fine', dz: 0.1 },
    { kind: 'burst', name: 'glints', recipe: recipe([WHITE, FOAM], { ...GLINT, vz: 1.6, zg: 5 }), count: 8, tier: 'fine', at: 0.05 },
    { kind: 'burst', name: 'second ring', recipe: recipe([LIGHT, CHANNEL], { ...RIPPLE, size: 0.34, life: 1.0 }), count: 1, tier: 'hero', at: 0.14 },
    { kind: 'burst', name: 'third ring', recipe: recipe([LIGHT, CHANNEL], { ...RIPPLE, size: 0.28, life: 1.1 }), count: 1, tier: 'hero', at: 0.3 },
    { kind: 'burst', name: 'mist puff', recipe: recipe([FOAM, PALE], { ...MIST, vz: 0.22, zg: 0.12, life: 1.5 }), count: 8, tier: 'body', at: 0.1, arrange: 'disc', radius: 0.22, dz: 0.08 },
    { kind: 'emit', name: 'hang', arrange: 'disc', radius: 0.3, dz: 0.1, at: 0.25, rate: 16, dur: 0.9, attack: 0.1, release: 0.4, tier: 'body',
      pops: [{ colors: [PALE, LIGHT], opts: { ...HAZE, vz: 0.12, zg: 0.1 }, weight: 1 }] },
    { kind: 'burst', name: 'late drops', recipe: recipe([LIGHT, CHANNEL], { ...DROP_BODY, speed: 0.6, vz: 1.4, life: 1.2 }), count: 2, tier: 'body', at: 0.35, every: 0.18, times: 3 },
    { kind: 'glow', name: 'wet light', r: 1.1, rgb: WATER_GLOW, a: 0.12, dur: 0.9, attack: 0.02, release: 0.6 },
  ],
};

/**
 * water.rain — a local downpour on a disc.
 */
export const waterRain: EffectDef = {
  id: 'water.rain',
  name: 'Water — rain',
  story: 'a downpour on a disc: streaks fall from height at speed and splat into flecks, small ripples pop where they land, heavy drops ring wide, a low mist stands at the foot of the rain, the ground shines wet',
  layers: [
    { kind: 'field', name: 'breeze', field: { kind: 'wind', radius: 1.8, strength: 0.35, dur: 3.2, attack: 0.3, release: 0.5 }, radiusK: 1.8, aimed: true },
    { kind: 'burst', name: 'first sheet', recipe: recipe([LIGHT, CHANNEL], RAIN_STREAK), count: 14, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 1, dz: 1.4 },
    { kind: 'emit', name: 'downpour', arrange: 'disc', radius: 1.0, radiusK: 1, dz: 2.2, rate: 58, dur: 3.0, attack: 0.25, release: 0.6, pops: RAIN_POPS },
    { kind: 'burst', name: 'heavy drops', recipe: recipe([LIGHT, CHANNEL], RAIN_HEAVY), count: 2, tier: 'hero', arrange: 'disc', radius: 0.9, radiusK: 0.9, dz: 2.0, at: 0.2, every: 0.35, times: 7 },
    { kind: 'emit', name: 'low mist', arrange: 'disc', radius: 0.9, radiusK: 0.9, dz: 0.02, at: 0.5, rate: 18, dur: 2.7, attack: 0.4, release: 0.8, tier: 'fine',
      pops: [{ colors: [PALE, LIGHT], opts: { ...HAZE, size: 0.2, vz: 0.1, life: 1.8, speed: 0.12 }, weight: 1 }] },
    { kind: 'burst', name: 'wet shine', recipe: recipe([WHITE, FOAM], { ...GLINT, z: 0.03, vz: 0, zg: 0, life: 0.4, size: 0.045 }), count: 3, tier: 'fine', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.8, every: 0.3, times: 8 },
    { kind: 'glow', name: 'wet light', r: 1.2, rgb: WATER_GLOW, a: 0.1, dur: 3.4, attack: 0.5, release: 1.0, radiusK: 1.1 },
  ],
};

/**
 * water.jet — an aimed stream along params.dir.
 */
export const waterJet: EffectDef = {
  id: 'water.jet',
  name: 'Water — jet',
  story: 'a pressured stream leaps out on the aim: streaks and drops in a tight cone on true height, mist shed along the line, the water reaching range and splatting in a fan of fines and ripples, a haze standing where it lands',
  layers: [
    { kind: 'burst', name: 'muzzle', recipe: recipe([WHITE, FOAM], SHEET), count: 1, tier: 'hero', dz: 0.35 },
    { kind: 'burst', name: 'first spit', recipe: recipe([WHITE, LIGHT], JET_STREAK), count: 8, tier: 'body', arrange: 'cone', spread: 0.22, dz: 0.4 },
    { kind: 'burst', name: 'first drops', recipe: recipe([LIGHT, CHANNEL], JET_DROP), count: 5, tier: 'hero', arrange: 'cone', spread: 0.3, dz: 0.4 },
    { kind: 'emit', name: 'stream', arrange: 'cone', spread: 0.2, dz: 0.4, rate: 66, dur: 1.0, attack: 0.05, release: 0.3, aimed: true, pops: JET_POPS },
    { kind: 'emit', name: 'stream mist', arrange: 'cone', spread: 0.4, dz: 0.3, at: 0.08, rate: 22, dur: 0.9, attack: 0.1, release: 0.3, aimed: true, tier: 'fine',
      pops: [{ colors: [FOAM, PALE], opts: { ...JET_MIST, size: 0.2 }, weight: 1 }] },
    { kind: 'burst', name: 'glints', recipe: recipe([WHITE, FOAM], { ...GLINT, speed: 2.8, spread: 0.25, vz: 0.6, zg: 3 }), count: 3, tier: 'fine', arrange: 'cone', spread: 0.25, dz: 0.4, at: 0.1, every: 0.2, times: 4 },
    { kind: 'glow', name: 'wet light', r: 0.9, rgb: WATER_GLOW, a: 0.11, dur: 1.2, attack: 0.05, release: 0.5 },
  ],
};

/**
 * water.mist — a standing spray / fog.
 */
export const waterMist: EffectDef = {
  id: 'water.mist',
  name: 'Water — mist',
  story: 'a standing spray: big pale motes swell and overlap into one drifting fog on a gentle wind, glints wink inside it, a drop condenses out now and then and falls to splat and ring the ground',
  layers: [
    { kind: 'field', name: 'drift', field: { kind: 'wind', radius: 1.8, strength: 0.4, dur: 3.2, attack: 0.3, release: 0.6, dir: 0.3 }, radiusK: 1.8 },
    { kind: 'burst', name: 'first breath', recipe: recipe([FOAM, PALE], MIST), count: 12, tier: 'body', arrange: 'disc', radius: 0.4, radiusK: 0.4, dz: 0.1 },
    { kind: 'emit', name: 'spray', arrange: 'disc', radius: 0.5, radiusK: 0.5, dz: 0.05, rate: 40, dur: 3.0, attack: 0.3, release: 0.9, pops: MIST_POPS },
    { kind: 'burst', name: 'glints', recipe: recipe([WHITE, FOAM], GLINT), count: 3, tier: 'fine', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.3, every: 0.28, times: 9 },
    { kind: 'burst', name: 'condense', recipe: recipe([LIGHT, CHANNEL], CONDENSE), count: 1, tier: 'hero', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.5, every: 0.36, times: 6 },
    { kind: 'glow', name: 'wet light', r: 1.2, rgb: WATER_GLOW, a: 0.1, dur: 3.3, attack: 0.5, release: 0.9, radiusK: 1 },
  ],
};

export const WATER_EFFECTS: EffectDef[] = [waterSplash, waterRain, waterJet, waterMist];
