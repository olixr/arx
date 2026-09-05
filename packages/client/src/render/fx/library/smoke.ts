/**
 * SMOKE — what remains when matter gives up.
 *
 * Smoke has weight only as haze: it leaves no marks, lands nothing,
 * burns nothing. Its whole craft is two reads — MASS against rubble,
 * and the dense→pale color story. Every effect here is built from
 * the same four voices, each on its own clock:
 *
 *   BOULDER   the mass: BIG puffs and blobs born shoulder to shoulder
 *             in a small disc, swelling to full and HOLDING — the lobes
 *             merge into one body, never a scatter of chits
 *   HAZE      the smoke between the smoke: round motes, born
 *             translucent, thickening, dissolving late — they bind the
 *             boulder's edge and carry the pale act
 *   CREEPERS  the floor voice: smoke that hugs the ground and slides
 *             out before it remembers up
 *   GHOSTS    the late voice: big pale motes at low alpha that hang
 *             where the dense body was, so a dispersing cloud thins as
 *             ONE fading mass instead of breaking into lozenges
 *
 * The bomb: a pressure ring on the ground, the boulder swelling LOW
 * (a smokescreen does not chimney), creepers, a standing veil that
 * blinds the field, ghosts that hang. The veil: a dense heart and a
 * thinning skirt over a disc — a body standing inside is swallowed,
 * the edge lets the world through. The wisp: a thread that thickens
 * mid-flight and ghosts out high. The ring: one rolling vortex ring —
 * the crisp hoop, a torus of puffs riding it, a haze halo, a soft
 * inner puff — the read a cannon or a puffed pipe makes. The trail:
 * a smoky wake from the cast point to the far anchor, dense at the
 * near end, ghosting along the far end, creepers sinking to the dirt.
 *
 * Born dark and dense, thinning pale only late — the inverse of
 * fire's ramp, because dispersing smoke lets the sky through. Wobble
 * is noise, never a rail. Palette shared with render/matter/smoke.ts
 * — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const BORN = '#3f3945';
export const DENSE = '#5a5560';
export const MID = '#6e6878';
export const THIN = '#8a8394';
export const GHOST = '#a39cae';

/** The body's story: dark for most of its life, pale only at the end. */
const RAMP_BILLOW = rampOf({ stops: [BORN, DENSE, MID, THIN], at: [0, 0.4, 0.75, 0.95], steps: 6 });
/** Haze is born already halfway to the sky. */
const RAMP_HAZE = rampOf({ stops: [MID, THIN, GHOST], at: [0, 0.5, 0.85], steps: 4 });
/** Creepers: the floor voice, a shade lighter than the boulder. */
const RAMP_CREEP = rampOf({ stops: [DENSE, MID, THIN], at: [0, 0.5, 0.9], steps: 4 });
/** Ghosts: pale from birth, gone to the sky. */
const RAMP_GHOST = rampOf({ stops: [THIN, GHOST, GHOST], at: [0, 0.4, 1], steps: 3 });
/** The whole dense→pale story in one grain — the rolling ring. */
const RAMP_RING = rampOf({ stops: [BORN, DENSE, MID, THIN, GHOST], at: [0, 0.3, 0.55, 0.8, 1], steps: 7 });

/** Born at two thirds, swelling to full, holding — a mass, not a seed. */
const BOULDER = curveOf([0, 0.66, 0.2, 1, 0.7, 1.05, 1, 0.9]);
/** Dense through the hold, letting go late. */
const THICK_A = curveOf([0, 0.7, 0.15, 0.95, 0.6, 0.9, 1, 0]);
/** A thread's grain: born small, thickening past mid-life, holding. */
const THICKEN = curveOf([0, 0.4, 0.35, 0.8, 0.7, 1, 1, 0.95]);
/** Ghosts: translucent from birth, a slow long exit. */
const GHOST_A = curveOf([0, 0.18, 0.25, 0.42, 0.6, 0.36, 1, 0]);
const SWELL = curveOf('swell');
const MIST_A = curveOf('mist');
const SMOKE_A = curveOf('smoke');

/** The boulder grain — big, low, spreading a little and stalling. */
const BILLOW: BurstOpts = {
  shape: 'puff', speed: 0.55, speedVar: 0.5, life: 2.6, lifeVar: 0.3, size: 0.46, sizeVar: 0.3,
  gravity: 0, drag: 1.8, vz: 0.2, zg: -0.04, layer: 'world', shadow: 0,
  ramp: RAMP_BILLOW, sizeCurve: BOULDER, alphaCurve: THICK_A,
  wave: 'noise', waveHz: 0.7, waveAmp: 0.28, spin: 0.35, mass: 0.4,
};

const BILLOW_BLOB: BurstOpts = { ...BILLOW, shape: 'blob', size: 0.4, spin: 0.5 };

/** Haze — round motes, born translucent, thickening, dissolving. */
const HAZE: BurstOpts = {
  shape: 'mote', speed: 0.3, life: 3.0, lifeVar: 0.3, size: 0.26, gravity: 0, drag: 0.9,
  vz: 0.16, zg: -0.03, layer: 'world', shadow: 0,
  ramp: RAMP_HAZE, sizeCurve: SWELL, alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.6, waveAmp: 0.22, mass: 0.3,
};

/** Creepers — the floor voice, sliding out low. */
const CREEPER: BurstOpts = {
  shape: 'puff', speed: 0.9, speedVar: 0.4, life: 2.0, size: 0.3, gravity: 0, drag: 1.8,
  z: 0.03, vz: 0.06, zg: -0.02, layer: 'world', shadow: 0,
  ramp: RAMP_CREEP, sizeCurve: BOULDER, alphaCurve: THICK_A,
  wave: 'sine', waveHz: 0.5, waveAmp: 0.14,
};

/** Ghosts — big pale motes at low alpha that hold a thinning cloud together. */
const GHOST_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.14, speedVar: 0.5, life: 3.0, lifeVar: 0.25, size: 0.6, sizeVar: 0.2,
  gravity: 0, drag: 0.8, vz: 0.12, zg: -0.02, layer: 'world', shadow: 0,
  ramp: RAMP_GHOST, sizeCurve: SWELL, alphaCurve: GHOST_A,
  wave: 'noise', waveHz: 0.5, waveAmp: 0.2, spin: 0.2, mass: 0.3,
};

/** The pressure ring on the ground — the only hard thing a bomb makes. */
const PRESSURE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.1, size: 0.6, sizeVar: 0.05, gravity: 0,
  layer: 'ground', sizeCurve: curveOf([0, 0.3, 1, 3.2]), alphaCurve: curveOf('fadeOut'),
};

/** The veil's heart: a slow dense boulder grain. */
const VEIL_BODY: BurstOpts = { ...BILLOW, size: 0.36, speed: 0.25, life: 2.4 };
/** The veil's skirt: thinner, paler, born already letting light through. */
const VEIL_SKIRT: BurstOpts = {
  ...BILLOW, size: 0.36, speed: 0.22, life: 2.2, sizeVar: 0.2, drag: 1.4,
  ramp: RAMP_CREEP, alphaCurve: curveOf([0, 0.5, 0.2, 0.75, 0.6, 0.6, 1, 0]),
};

export const VEIL_POPS: EmitterPop[] = [
  { colors: [DENSE, MID], opts: VEIL_BODY, weight: 1.6, tier: 'body' },
  { colors: [MID, THIN], opts: HAZE, weight: 1.4, tier: 'fine' },
];

export const SKIRT_POPS: EmitterPop[] = [
  { colors: [MID, THIN], opts: VEIL_SKIRT, weight: 1.2, tier: 'body' },
  { colors: [THIN, GHOST], opts: { ...HAZE, size: 0.3, speed: 0.2 }, weight: 1.6, tier: 'fine' },
];

/**
 * smoke.bomb — the smokescreen. The boulder is the read: born dense,
 * swelling low, one body. Protected. The ghosts are the late act.
 */
export const smokeBomb: EffectDef = {
  id: 'smoke.bomb',
  name: 'Smoke — bomb',
  story: 'a pressure ring, a boulder of billows born dense and swelling out low, haze behind, creepers on the floor, a veil that stands and blinds, ghosts that hang where the boulder was',
  layers: [
    { kind: 'burst', name: 'pressure ring', recipe: recipe([THIN, GHOST], PRESSURE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'boulder', recipe: recipe([BORN, DENSE], BILLOW), count: 10, tier: 'body', arrange: 'disc', radius: 0.18, dz: 0.2 },
    { kind: 'burst', name: 'boulder blobs', recipe: recipe([BORN, DENSE], BILLOW_BLOB), count: 6, tier: 'body', arrange: 'disc', radius: 0.2, dz: 0.35 },
    { kind: 'burst', name: 'creepers', recipe: recipe([DENSE, MID], CREEPER), count: 9, tier: 'body' },
    { kind: 'burst', name: 'haze', recipe: recipe([MID, THIN], HAZE), count: 8, tier: 'fine', at: 0.12, arrange: 'disc', radius: 0.3 },
    { kind: 'burst', name: 'second bloom', recipe: recipe([DENSE, MID], { ...BILLOW, size: 0.4, speed: 0.35 }), count: 6, tier: 'body', at: 0.25, arrange: 'disc', radius: 0.3, dz: 0.5 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.6, radiusK: 0.6, dz: 0.15, at: 0.3, rate: 20, dur: 2.8, attack: 0.2, release: 1.0, pops: VEIL_POPS },
    { kind: 'burst', name: 'ghosts', recipe: recipe([THIN, GHOST], GHOST_MOTE), count: 5, tier: 'fine', at: 1.3, every: 0.7, times: 2, arrange: 'disc', radius: 0.4, dz: 0.3 },
  ],
};

/**
 * smoke.veil — a standing curtain. A dense heart over the inner disc,
 * a thinning skirt out to the reach, creepers sliding past the edge:
 * a body inside is swallowed; the edge lets the world through.
 */
export const smokeVeil: EffectDef = {
  id: 'smoke.veil',
  name: 'Smoke — veil',
  story: 'a first breath fills the heart, a dense curtain stands over the inner disc and thins to a skirt at the edge — a body inside is swallowed, the rim lets the world through, ghosts hang as it lifts',
  layers: [
    { kind: 'burst', name: 'first breath', recipe: recipe([BORN, DENSE], { ...BILLOW, speed: 0.4 }), count: 9, tier: 'hero', arrange: 'disc', radius: 0.3, radiusK: 0.3, dz: 0.15 },
    { kind: 'burst', name: 'first skirt', recipe: recipe([DENSE, MID], { ...VEIL_SKIRT, size: 0.4, speed: 0.4 }), count: 10, tier: 'body', arrange: 'rim', radius: 0.55, radiusK: 0.55, outward: 0.45, dz: 0.1 },
    { kind: 'emit', name: 'heart', arrange: 'disc', radius: 0.55, radiusK: 0.55, dz: 0.15, rate: 26, dur: 3.0, attack: 0.25, release: 0.9, pops: VEIL_POPS },
    { kind: 'emit', name: 'skirt', arrange: 'disc', radius: 1.0, radiusK: 1, dz: 0.1, rate: 22, dur: 3.0, attack: 0.35, release: 0.9, pops: SKIRT_POPS },
    { kind: 'emit', name: 'creepers', arrange: 'rim', radius: 0.9, radiusK: 0.9, rate: 8, dur: 2.6, outward: 0.5, attack: 0.3, release: 0.8,
      pops: [{ colors: [DENSE, MID], opts: { ...CREEPER, size: 0.3 } }] },
    { kind: 'burst', name: 'ghosts', recipe: recipe([THIN, GHOST], GHOST_MOTE), count: 5, tier: 'fine', at: 1.6, every: 0.7, times: 3, arrange: 'disc', radius: 0.7, radiusK: 0.7, dz: 0.3 },
  ],
};

/** The wisp's thread grain: slow, stacked, thickening as it climbs. */
const THREAD: BurstOpts = {
  ...BILLOW, size: 0.24, sizeVar: 0.25, speed: 0.05, speedVar: 0.5, vz: 0.42, zg: -0.04, life: 2.8, lifeVar: 0.25,
  drag: 0.6, waveAmp: 0.2, waveHz: 0.55, sizeCurve: THICKEN, alphaCurve: SMOKE_A, mass: 0.5,
};

/** A slow chimney of smoke — chimneys, smolder, a doused fire. */
export const smokeWisp: EffectDef = {
  id: 'smoke.wisp',
  name: 'Smoke — wisp',
  story: 'a first curl, then a thread of smoke climbing on noise, thickening into a column mid-flight, ghosting out high where the draft lets go',
  layers: [
    { kind: 'field', name: 'draft', field: { kind: 'lift', radius: 0.5, strength: 1.2, dur: 3.5, height: 3, release: 0.6 } },
    { kind: 'burst', name: 'first curl', recipe: recipe([BORN, DENSE], { ...THREAD, size: 0.26, vz: 0.5, sizeCurve: BOULDER }), count: 4, tier: 'hero', arrange: 'disc', radius: 0.07 },
    { kind: 'emit', name: 'thread', arrange: 'disc', radius: 0.07, rate: 22, dur: 3.2, attack: 0.15, release: 0.8,
      pops: [
        { colors: [DENSE, MID], opts: THREAD, weight: 1.6, tier: 'body' },
        { colors: [MID, THIN], opts: { ...HAZE, size: 0.16, vz: 0.4, zg: -0.04, speed: 0.08, mass: 0.5 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'burst', name: 'puff', recipe: recipe([BORN, DENSE], { ...THREAD, size: 0.28, speed: 0.12, vz: 0.55 }), count: 3, tier: 'body', at: 0.7, every: 0.9, times: 2, arrange: 'disc', radius: 0.08 },
    { kind: 'burst', name: 'ghosts', recipe: recipe([THIN, GHOST], { ...GHOST_MOTE, size: 0.3, vz: 0.3, life: 2.2, speed: 0.08 }), count: 2, tier: 'fine', at: 0.9, every: 0.45, times: 5, dz: 1.0, arrange: 'disc', radius: 0.12 },
  ],
};

/**
 * The rolling hoop — the `ring` silhouette on the world layer. `size`
 * is its diameter; the size curve is the expansion law; it rises on z
 * and slows. Drifts along the aim so a cannon's ring leaves the muzzle.
 */
const RING_LIFE = 2.4;
/** The hoop's diameter at birth, tiles; it grows LINEARLY to 1.42× that. */
const HOOP_SIZE = 0.7;
const HOOP_GROW = curveOf([0, 0.6, 1, 1.42]);
/** The rim's radius at birth. */
const RIM_R0 = HOOP_SIZE * 0.5 * 0.6;
/** Radial speed that keeps the torus puffs on the hoop's rim (a hair
 *  past the stroke, so the puffs wear the outside of the hoop). */
const RIM_SPEED = ((HOOP_SIZE * 0.5 * (1.42 - 0.6)) / RING_LIFE) * 1.3;
/** The ring's climb: vz and the gravity that slows it. */
const RING_VZ = 0.62;
const RING_ZG = 0.14;
/** Where the rim stands at the ghost ring's cue (1.0 s). */
const GHOST_AT = 1.0;
const GHOST_R = RIM_R0 + RIM_SPEED * GHOST_AT;
const GHOST_Z = 0.12 + RING_VZ * GHOST_AT - 0.5 * RING_ZG * GHOST_AT * GHOST_AT;
const HOOP: BurstOpts = {
  shape: 'ring', speed: 0, speedVar: 0, life: RING_LIFE, lifeVar: 0, size: HOOP_SIZE, sizeVar: 0,
  gravity: 0, vz: RING_VZ, zg: RING_ZG, layer: 'world', shadow: 0,
  ramp: RAMP_RING, sizeCurve: HOOP_GROW,
  alphaCurve: curveOf([0, 0.95, 0.45, 0.85, 0.8, 0.45, 1, 0]),
};

/** The torus body: puffs riding the hoop's rim outward and up. */
const TORUS: BurstOpts = {
  shape: 'puff', speed: RIM_SPEED, speedVar: 0, life: RING_LIFE, lifeVar: 0.08, size: 0.23, sizeVar: 0.15,
  gravity: 0, vz: RING_VZ, zg: RING_ZG, layer: 'world', shadow: 0, spin: 0.6,
  ramp: RAMP_RING, sizeCurve: curveOf([0, 0.7, 0.3, 1, 0.7, 1.25, 1, 1.4]),
  alphaCurve: curveOf([0, 0.85, 0.4, 0.9, 0.75, 0.5, 1, 0]),
  wave: 'noise', waveHz: 0.8, waveAmp: 0.06,
};

/** The haze halo around the ring — fines that ride the updraft. */
const HALO: BurstOpts = {
  ...HAZE, size: 0.18, speed: 0.3, speedVar: 0.3, vz: RING_VZ, zg: RING_ZG, life: 1.9, lifeVar: 0.3, drag: 0.5, mass: 0.4,
};

/** The soft inner puff that lags under the hoop's eye. */
const INNER_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.08, life: 1.0, lifeVar: 0.2, size: 0.22, sizeVar: 0.2, gravity: 0, drag: 1.2,
  vz: 0.4, zg: 0.12, layer: 'world', shadow: 0, spin: 0.4,
  ramp: rampOf({ stops: [DENSE, MID, THIN, GHOST], at: [0, 0.35, 0.7, 0.95], steps: 5 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.55, 0.3, 0.5, 1, 0]),
  wave: 'noise', waveHz: 0.7, waveAmp: 0.12,
};

/**
 * smoke.ring — one rolling vortex ring: a cannon's mouth, a puffed
 * pipe. The hoop is the hero; the torus puffs are its mass; the halo
 * and the inner puff are the smoke it drags along.
 */
export const smokeRing: EffectDef = {
  id: 'smoke.ring',
  name: 'Smoke — ring',
  story: 'a dense hoop rolls out of the mouth and rises as it widens, a torus of puffs riding its rim, a haze halo around it, a soft puff lagging in its eye — it pales and lets go high',
  layers: [
    { kind: 'field', name: 'updraft', field: { kind: 'lift', radius: 0.7, strength: 0.9, dur: 1.8, height: 2.2, release: 0.5 } },
    { kind: 'burst', name: 'hoop', recipe: recipe([BORN], HOOP), count: 1, tier: 'hero', dz: 0.12 },
    { kind: 'burst', name: 'hoop lip', recipe: recipe([DENSE], { ...HOOP, size: HOOP_SIZE * 0.88 }), count: 1, tier: 'hero', dz: 0.12 },
    { kind: 'burst', name: 'torus', recipe: recipe([BORN, DENSE], TORUS), count: 12, tier: 'body', arrange: 'rim', radius: RIM_R0, outward: RIM_SPEED, dz: 0.12 },
    { kind: 'burst', name: 'halo', recipe: recipe([MID, THIN], HALO), count: 8, tier: 'fine', arrange: 'rim', radius: RIM_R0 + 0.1, outward: RIM_SPEED + 0.12, dz: 0.1 },
    { kind: 'burst', name: 'inner puff', recipe: recipe([DENSE, MID], INNER_PUFF), count: 3, tier: 'body', arrange: 'disc', radius: 0.08, dz: 0.05 },
    { kind: 'burst', name: 'ghost ring', recipe: recipe([THIN, GHOST], { ...GHOST_MOTE, size: 0.36, speed: RIM_SPEED, speedVar: 0, vz: 0.42, zg: 0.1, life: 1.5, lifeVar: 0.1, drag: 0, mass: 0 }),
      count: 9, tier: 'fine', at: GHOST_AT, arrange: 'rim', radius: GHOST_R, outward: RIM_SPEED, dz: GHOST_Z },
    { kind: 'emit', name: 'exhale', rate: 14, dur: 0.4, attack: 0.02, release: 0.2, tier: 'fine',
      pops: [{ colors: [MID, THIN], opts: { ...HAZE, size: 0.13, speed: 0.1, vz: 0.5, zg: 0.05, life: 1.6, mass: 0.6 } }] },
  ],
};

/** The wake grain — a small boulder that drifts and stalls along the path. */
const WAKE: BurstOpts = {
  ...BILLOW, size: 0.34, sizeVar: 0.25, speed: 0.14, speedVar: 0.5, vz: 0.3, zg: -0.03, life: 2.2, lifeVar: 0.3,
  drag: 1.2, waveAmp: 0.2, ramp: RAMP_CREEP, alphaCurve: curveOf([0, 0.55, 0.25, 0.8, 0.6, 0.65, 1, 0]),
};

/** The wake's far voice: pale, translucent, born letting light through. */
const WAKE_GHOST: BurstOpts = {
  ...HAZE, size: 0.32, speed: 0.12, vz: 0.22, life: 2.4, ramp: RAMP_HAZE, alphaCurve: MIST_A,
};

/** Creepers along the wake: born a hand up, sinking to lie on the dirt. */
const SINKER: BurstOpts = {
  shape: 'puff', speed: 0.2, speedVar: 0.5, life: 2.4, lifeVar: 0.25, size: 0.26, sizeVar: 0.25, gravity: 0, drag: 1.4,
  z: 0.35, vz: -0.12, zg: 0.3, land: 'settle', layer: 'world', shadow: 0, spin: 0.3,
  ramp: RAMP_CREEP, sizeCurve: BOULDER, alphaCurve: THICK_A,
  wave: 'sine', waveHz: 0.5, waveAmp: 0.1,
};

export const TRAIL_POPS: EmitterPop[] = [
  { colors: [MID, THIN], opts: WAKE, weight: 1.4, tier: 'body' },
  { colors: [THIN, GHOST], opts: WAKE_GHOST, weight: 1.2, tier: 'fine' },
];

/**
 * smoke.trail — a smoky wake along a path (cast point → x2/y2). The
 * near end is dense: a source boulder and a source exhale sit on top
 * of the uniform wake, so the far end is only the wake's pale voice.
 */
export const smokeTrail: EffectDef = {
  id: 'smoke.trail',
  name: 'Smoke — trail',
  story: 'a dense boulder at the source, a wake of small billows laid along the path that pales toward the far end, creepers sinking to lie on the dirt, ghosts hanging where the wake was',
  layers: [
    { kind: 'field', name: 'draft', field: { kind: 'lift', radius: 0.6, strength: 1.1, dur: 1.8, height: 2.0, release: 0.5 } },
    { kind: 'burst', name: 'source', recipe: recipe([BORN, DENSE], { ...BILLOW, size: 0.4, speed: 0.3 }), count: 7, tier: 'hero', arrange: 'disc', radius: 0.15, dz: 0.2 },
    { kind: 'burst', name: 'first wake', recipe: recipe([DENSE, MID], WAKE), count: 8, tier: 'body', arrange: 'path', dz: 0.15 },
    { kind: 'emit', name: 'wake', arrange: 'path', toFar: true, dz: 0.15, rate: 36, dur: 1.4, attack: 0.05, release: 0.5, pops: TRAIL_POPS },
    { kind: 'emit', name: 'source exhale', arrange: 'disc', radius: 0.22, dz: 0.2, rate: 16, dur: 1.1, attack: 0.05, release: 0.5, tier: 'body',
      pops: [{ colors: [BORN, DENSE], opts: { ...BILLOW, size: 0.34, speed: 0.2, life: 2.4 } }] },
    { kind: 'emit', name: 'creepers', arrange: 'path', toFar: true, rate: 9, dur: 1.3, attack: 0.1, release: 0.5, tier: 'body',
      pops: [{ colors: [DENSE, MID], opts: SINKER }] },
    { kind: 'burst', name: 'ghosts', recipe: recipe([THIN, GHOST], { ...GHOST_MOTE, size: 0.5, life: 2.6 }), count: 6, tier: 'fine', at: 1.2, every: 0.6, times: 2, arrange: 'path', dz: 0.3 },
  ],
};

export const SMOKE_EFFECTS: EffectDef[] = [smokeBomb, smokeVeil, smokeWisp, smokeRing, smokeTrail];
