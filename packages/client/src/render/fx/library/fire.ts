/**
 * FIRE — the exemplar the whole library is held to.
 *
 * The combustion story, each layer on its own clock:
 *
 *   SHOCKFRONT the pressure ring racing out on the ground — the
 *              impact read, gone in a third of a second
 *   HEART      the white-hot flash you cannot look at — a flare that
 *              collapses in a quarter second
 *   BODY       the flame mass: BIG irregular blobs born in a small
 *              disc, spreading and stalling on drag, DWINDLING down a
 *              posterized eight-band ramp (heart → bright → flame →
 *              ember → deep → soot) with a brighter core that dies
 *              first, riding value-noise on x. The body stays LOW —
 *              fire is a floor thing; only its embers and smoke climb
 *   TONGUES    licks leaping off the body — two hot bands only (ONE-
 *              SHOT COHORTS DIE BRIGHT), gone before they sadden
 *   EMBERS     fines scratched loose and LIFTED BY THE HEAT — the
 *              convection field pulls them into a column, gravity
 *              brings them back, they trail and die on the dirt
 *   SPARKS     ballistic streaks, fast, few, dead on landing
 *   COALS      the heroes: thrown, landing, lying where they fell,
 *              cooling through red to soot and leaving CHAR where they
 *              burn out — the floor remembers this fire
 *   SMOKE      the aftermath, born dark and dense, swelling wide as it
 *              climbs on noise, thinning pale — its own late clock
 *   SHIMMER    heat glints climbing fast through the column
 *   LIFT       the convection field: an updraft with a gather at its
 *              base, the invisible layer that makes fire read HOT
 *   RESIDUE    the burning floor: flamelets standing up out of an
 *              EMBER BED for seconds after the blast; the bed's coals
 *              char the dirt as they die
 *   GLOW       the flicker-light on everything nearby, then the ember
 *              glow that outlives the flame
 *
 * Six effects share these recipes: burst (the detonation), plume (a
 * standing burn that catches, burns, and dies down), floor (a front
 * races out, the ground burns and chars), fan (an aimed stream that
 * scorches where it lands), trail (a flame wall along a path that
 * chars a line), pillar (an omen, then the column from below).
 *
 * Sizes are authored for the street scale (~48–64 px/tile): the flame
 * mass is a third of a tile so it reads as MASS, fines are dots.
 * Palette shared with render/matter/fire.ts — ONE-VOICE.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

export const HEART = '#fff3c4';
export const BRIGHT = '#ffe9a3';
export const FLAME = '#ffca66';
export const EMBER = '#e8823a';
export const COAL = '#c9541f';
export const DEEP = '#8c3a26';
export const SOOT = '#4a4248';
export const SMOKE = '#5a5560';
export const SMOKE_THIN = '#7d7787';

export const FIRE_GLOW = '255, 170, 80';

/** The full combustion ramp, eight flat bands hot → soot. */
export const RAMP_BODY = rampOf({
  stops: [HEART, BRIGHT, FLAME, EMBER, DEEP, SOOT],
  at: [0, 0.1, 0.27, 0.52, 0.78, 1],
  steps: 8,
});
/** Cohort-safe: hot bands only. */
export const RAMP_TONGUE = rampOf({ stops: [BRIGHT, FLAME, EMBER], at: [0, 0.5, 0.85] });
/** Embers glow long, then dim to a dead red. */
export const RAMP_EMBER = rampOf({ stops: [BRIGHT, FLAME, EMBER, DEEP], at: [0, 0.35, 0.7, 0.92], steps: 6 });
/** Coals: the lying heroes cool slowly through five bands. */
export const RAMP_COAL = rampOf({ stops: [FLAME, EMBER, COAL, DEEP, SOOT], at: [0, 0.2, 0.45, 0.72, 0.92], steps: 7 });
/** Smoke born dark, thinning pale. */
export const RAMP_SMOKE = rampOf({ stops: [SOOT, SMOKE, SMOKE_THIN], at: [0, 0.45, 0.85], steps: 5 });

const DWINDLE = curveOf('dwindle');
const FLARE = curveOf('flare');
const SWELL = curveOf('swell');
const FADE_LATE = curveOf('fadeLate');
const SMOKE_A = curveOf('smoke');
const FADE_OUT = curveOf('fadeOut');
const BLOOM = curveOf('bloom');
const HOLD = curveOf('hold');

/** The flame mass — big, low, spreading then stalling, dwindling. */
const BODY: BurstOpts = {
  shape: 'blob', align: true, speed: 1.1, speedVar: 0.55, life: 0.84, lifeVar: 0.35,
  size: 0.36, sizeVar: 0.35, gravity: 0, drag: 2.6,
  vz: 0.55, zg: -0.12, mass: 0.35, layer: 'world', shadow: 0,
  ramp: RAMP_BODY, sizeCurve: DWINDLE, alphaCurve: FADE_LATE,
  wave: 'noise', waveHz: 2.2, waveAmp: 0.45, waveAxis: 'x',
  core: HEART, coreK: 0.45, flicker: 0.15,
};

/** The white flash. */
const HEART_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.26, lifeVar: 0.15, size: 0.62, sizeVar: 0.2,
  gravity: 0, z: 0.2, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: ['#ffffff', HEART, BRIGHT], at: [0, 0.4, 0.8] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** The pressure ring on the ground. */
const SHOCKFRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.34, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [BRIGHT, FLAME, EMBER], at: [0, 0.4, 0.75] }),
  sizeCurve: curveOf([0, 0.35, 0.55, 2.6, 1, 3.1]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** Leaping tongues. */
const TONGUE: BurstOpts = {
  shape: 'lick', speed: 0.8, life: 0.55, size: 0.14, sizeVar: 0.3, gravity: 0,
  vz: 1.3, zg: -0.3, mass: 0.6, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_TONGUE,
};

/** Lifted embers — fines with mass, so the convection owns them. */
const EMBER_FINE: BurstOpts = {
  shape: 'square', align: true, speed: 1.2, speedVar: 0.7, life: 1.7, lifeVar: 0.4,
  size: 0.045, sizeVar: 0.35, gravity: 0, drag: 0.8,
  vz: 1.2, zg: 1.6, mass: 1.6, land: 'die', layer: 'world', shadow: 0,
  flicker: 0.6, jitter: 3.5, trail: 5, trailColor: DEEP,
  ramp: RAMP_EMBER, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Ballistic sparks. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 2.0, speedVar: 0.6, life: 0.5, size: 0.045,
  gravity: 0, vz: 2.4, zg: 7, land: 'die', layer: 'world', shadow: 0,
  flicker: 0.5, trail: 7, trailColor: DEEP,
};

/** Coal heroes: thrown, landing, lying, cooling, CHARRING the dirt. */
const COAL_HERO: BurstOpts = {
  shape: 'square', align: true, speed: 1.1, speedVar: 0.5, life: 2.3, lifeVar: 0.3,
  size: 0.075, sizeVar: 0.25, gravity: 0,
  vz: 2.0, zg: 7, land: 'settle', bounce: 0.3, layer: 'world', flicker: 0.5,
  ramp: RAMP_COAL, sizeCurve: curveOf([0, 1, 0.8, 0.9, 1, 0.55]), alphaCurve: FADE_LATE,
  mark: 'char', markLife: 6.5,
};

/** Smoke — the late voice: dense, wide, climbing on noise. */
const SMOKE_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.42, speedVar: 0.5, life: 2.4, lifeVar: 0.35, size: 0.32, sizeVar: 0.3,
  gravity: 0, drag: 0.9, vz: 0.55, zg: -0.12, mass: 0.3, layer: 'world', shadow: 0,
  ramp: RAMP_SMOKE, sizeCurve: SWELL, alphaCurve: SMOKE_A,
  wave: 'noise', waveHz: 1.0, waveAmp: 0.45, spin: 0.5,
};

/** Haze — the smoke between the smoke. */
const SMOKE_HAZE: BurstOpts = {
  ...SMOKE_PUFF, shape: 'mote', size: 0.2, speed: 0.3, vz: 0.4, life: 2.6,
  ramp: rampOf({ stops: [SMOKE, SMOKE_THIN, '#948da0'], steps: 4 }), alphaCurve: curveOf('mist'),
};

/** Heat shimmer — fast bright glints riding the column. */
const SHIMMER: BurstOpts = {
  shape: 'glint', speed: 0.25, life: 0.6, size: 0.06, gravity: 0,
  vz: 2.0, zg: -0.6, mass: 1.2, layer: 'world', shadow: 0,
  alphaCurve: FADE_OUT, sizeCurve: BLOOM,
};

/** Flamelets standing up out of the ember bed — the burning floor. */
const FLAMELET: BurstOpts = {
  shape: 'lick', speed: 0.15, life: 0.6, lifeVar: 0.4, size: 0.14, sizeVar: 0.35,
  gravity: 0, vz: 0.5, zg: -0.25, layer: 'world', shadow: 0, flicker: 0.35,
  ramp: rampOf({ stops: [FLAME, EMBER, DEEP], at: [0, 0.55, 0.88] }),
  sizeCurve: DWINDLE, core: BRIGHT, coreK: 0.35,
};

/** The ember bed: coals glowing in the char, each charring as it dies. */
const EMBER_BED: BurstOpts = {
  shape: 'square', speed: 0.04, life: 1.4, lifeVar: 0.4, size: 0.065, sizeVar: 0.3,
  gravity: 0, z: 0.01, layer: 'world', shadow: 0, flicker: 0.7,
  ramp: rampOf({ stops: [FLAME, EMBER, COAL, DEEP], at: [0, 0.3, 0.6, 0.88], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 5,
};

const FLOOR_SOOT: BurstOpts = {
  ...SMOKE_PUFF, size: 0.14, vz: 0.45, life: 1.6, speed: 0.12, waveAmp: 0.25,
};

/** A standing fire's mixed-age body: born bright, never cream. */
const RAMP_PLUME = rampOf({ stops: [BRIGHT, FLAME, EMBER, DEEP, SOOT], at: [0, 0.22, 0.52, 0.8, 1], steps: 7 });

/** Sustained plume populations (FINE GRAIN LAW: fines, body, heroes). */
export const PLUME_POPS: EmitterPop[] = [
  { colors: [BRIGHT, FLAME], opts: { ...BODY, size: 0.3, life: 0.7, speed: 0.3, speedVar: 0.4, drag: 1.5, vz: 0.45, ramp: RAMP_PLUME, core: BRIGHT }, weight: 2.6, tier: 'body' },
  { colors: [BRIGHT, FLAME], opts: { ...TONGUE, speed: 0.3, vz: 1.2, life: 0.5 }, weight: 1.0, tier: 'body' },
  { colors: [FLAME, EMBER], opts: { ...EMBER_FINE, vz: 1.0, life: 1.4 }, weight: 0.8, tier: 'fine' },
  { colors: ['#ffd27a', BRIGHT], opts: SPARK, weight: 0.3, tier: 'fine' },
];

export const FLOOR_POPS: EmitterPop[] = [
  { colors: [FLAME, EMBER, BRIGHT], opts: FLAMELET, weight: 2.6, tier: 'body' },
  { colors: [EMBER, COAL], opts: EMBER_BED, weight: 0.9, tier: 'hero' },
  { colors: [SOOT, SMOKE], opts: FLOOR_SOOT, weight: 0.7, tier: 'body' },
  { colors: [FLAME, EMBER], opts: { ...EMBER_FINE, vz: 0.9, life: 1.1, size: 0.04 }, weight: 0.8, tier: 'fine' },
];

/** A standing fire's smoke: a column, not a scatter (tight speed roll). */
const PLUME_SMOKE: BurstOpts = { ...SMOKE_PUFF, size: 0.3, sizeVar: 0.2, speed: 0.16, speedVar: 0.3, vz: 0.42, zg: -0.06, life: 1.9, lifeVar: 0.25, waveAmp: 0.22, sizeCurve: curveOf([0, 0.5, 0.25, 0.95, 0.6, 1, 1, 0.85]) };

/** The standing body: slow, low, overlapping, born bright. */
const PLUME_BODY: BurstOpts = { ...BODY, size: 0.3, life: 0.7, speed: 0.3, speedVar: 0.4, drag: 1.5, vz: 0.45, ramp: RAMP_PLUME, core: BRIGHT };

/** The aimed gout's body: fast, low, riding the breath wind. */
const GOUT_BODY: BurstOpts = { ...BODY, speed: 3.2, speedVar: 0.25, drag: 1.6, vz: 0.3, zg: -0.1, life: 0.62, size: 0.36, mass: 0.5, waveAmp: 0.25 };

/** The flame wall's body: stands where it is born. */
const WALL_BODY: BurstOpts = { ...BODY, size: 0.36, sizeVar: 0.25, life: 0.8, speed: 0.22, speedVar: 0.4, drag: 1.8, vz: 0.5, zg: -0.1, ramp: RAMP_PLUME, core: BRIGHT };

/** Populations of a standing wall along a path. */
const WALL_POPS: EmitterPop[] = [
  { colors: [BRIGHT, FLAME], opts: { ...WALL_BODY, size: 0.36, life: 0.72 }, weight: 3.0, tier: 'body' },
  { colors: [BRIGHT, FLAME], opts: { ...TONGUE, speed: 0.3, vz: 1.2 }, weight: 0.9, tier: 'body' },
  { colors: [FLAME, EMBER], opts: { ...EMBER_FINE, vz: 1.0, life: 1.4 }, weight: 1.2, tier: 'fine' },
];

/** The pillar's column masses: born at altitude, still climbing. */
const COLUMN_BODY: BurstOpts = {
  ...BODY, speed: 0.35, speedVar: 0.4, drag: 2.0, life: 0.8, lifeVar: 0.25, zg: -0.5, mass: 0.6,
  wave: 'noise', waveHz: 2.6, waveAmp: 0.4, waveAxis: 'x', sizeCurve: curveOf([0, 0.85, 0.2, 1, 0.55, 0.8, 0.85, 0.35, 1, 0]),
};
/** The column's upper masses run cooler: flame → ember → deep → soot. */
const RAMP_COLUMN_HIGH = rampOf({ stops: [FLAME, EMBER, DEEP, SOOT], at: [0, 0.35, 0.72, 0.92], steps: 6 });
/** The pillar erupts on this beat; everything before it is the omen. */
const ERUPT = 0.45;

/**
 * fire.burst — the detonation every fire impact builds on.
 */
export const fireBurst: EffectDef = {
  id: 'fire.burst',
  name: 'Fire — burst',
  story: 'shockfront → flash → the flame mass spreads low and dwindles → embers ride the heat → coals land and char → smoke swells wide → the floor keeps burning on its ember bed',
  layers: [
    { kind: 'field', name: 'lift', field: { kind: 'lift', radius: 1.2, strength: 2.4, dur: 1.4, height: 2.0, release: 0.5 } },
    { kind: 'burst', name: 'shockfront', recipe: recipe([BRIGHT, FLAME], SHOCKFRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'heart', recipe: recipe([HEART, '#ffffff'], HEART_FLASH), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'body', recipe: recipe([HEART, BRIGHT, FLAME], BODY), count: 16, tier: 'body', arrange: 'disc', radius: 0.22, dz: 0.04 },
    { kind: 'burst', name: 'tongues', recipe: recipe([BRIGHT, FLAME], TONGUE), count: 10, tier: 'body' },
    { kind: 'burst', name: 'embers', recipe: recipe([FLAME, EMBER, BRIGHT], EMBER_FINE), count: 26, tier: 'fine' },
    { kind: 'burst', name: 'sparks', recipe: recipe(['#ffd27a', BRIGHT], SPARK), count: 9, tier: 'fine' },
    { kind: 'burst', name: 'coals', recipe: recipe([EMBER, COAL], COAL_HERO), count: 6, tier: 'hero' },
    { kind: 'burst', name: 'shimmer', recipe: recipe([HEART, BRIGHT], SHIMMER), count: 7, tier: 'fine', at: 0.08 },
    { kind: 'burst', name: 'second body', recipe: recipe([FLAME, EMBER], { ...BODY, size: 0.3, life: 0.6, speed: 0.6 }), count: 8, tier: 'body', at: 0.14, arrange: 'disc', radius: 0.25, dz: 0.28 },
    { kind: 'emit', name: 'smoke', arrange: 'disc', radius: 0.3, dz: 0.25, at: 0.2, rate: 30, dur: 1.4, attack: 0.05, release: 0.5, tier: 'body',
      pops: [
        { colors: [SOOT, SMOKE], opts: SMOKE_PUFF, weight: 2 },
        { colors: [SMOKE, SMOKE_THIN], opts: SMOKE_HAZE, weight: 1, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'burning floor', arrange: 'disc', radius: 0.5, at: 0.3, rate: 40, dur: 3.0, attack: 0.15, release: 1.0, tier: 'body',
      pops: FLOOR_POPS },
    { kind: 'glow', name: 'glow', r: 1.8, rgb: FIRE_GLOW, a: 0.36, dur: 1.2, attack: 0.02, release: 0.7, flicker: 0.35 },
    { kind: 'glow', name: 'ember glow', r: 1.1, rgb: FIRE_GLOW, a: 0.16, at: 1.0, dur: 2.4, attack: 0.2, release: 1.2, flicker: 0.5 },
  ],
};

/**
 * fire.plume — a standing burn: brazier, campfire, burning body.
 *
 * Three acts: it CATCHES (a kindle flash and a first body that
 * merges into one low mass), it BURNS (sustained mixed-age body with
 * tongues leaping off it, embers riding the chimney, a smoke column
 * from half a second on, a spark now and then, an ember bed charring
 * the dirt beneath), and it DIES DOWN (the last coals drop and
 * settle, flamelets stand in the bed, one soot breath, an ember glow
 * that outlives the flame).
 */
export const firePlume: EffectDef = {
  id: 'fire.plume',
  name: 'Fire — plume',
  story: 'it catches: a kindle flash, a first body → it burns: mixed-age mass, tongues, embers in the chimney, smoke above, a spark now and then, a bed charring the dirt → it dies down: coals drop, flamelets in the bed, ember glow',
  layers: [
    { kind: 'field', name: 'chimney', field: { kind: 'lift', radius: 1.0, strength: 2.6, dur: 3.6, height: 2.8, release: 0.8 } },
    { kind: 'burst', name: 'kindle', recipe: recipe([HEART, BRIGHT], { ...HEART_FLASH, size: 0.38, life: 0.22 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'catch', recipe: recipe([BRIGHT, FLAME], { ...PLUME_BODY, life: 0.8 }), count: 7, tier: 'body', arrange: 'disc', radius: 0.1 },
    { kind: 'emit', name: 'body', arrange: 'disc', radius: 0.12, rate: 46, dur: 3.0, attack: 0.12, release: 0.5, tier: 'body', pops: PLUME_POPS },
    { kind: 'emit', name: 'embers', arrange: 'disc', radius: 0.16, dz: 0.15, rate: 22, dur: 3.0, attack: 0.3, release: 0.6, tier: 'fine',
      pops: [
        { colors: [FLAME, EMBER, BRIGHT], opts: { ...EMBER_FINE, vz: 1.0, life: 1.5 }, weight: 2, tier: 'fine' },
        { colors: [HEART, BRIGHT], opts: SHIMMER, weight: 0.7, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'smoke', arrange: 'disc', radius: 0.14, dz: 0.5, at: 0.5, rate: 24, dur: 2.7, attack: 0.4, release: 0.6, tier: 'body',
      pops: [
        { colors: [SOOT, SMOKE], opts: PLUME_SMOKE, weight: 2 },
        { colors: [SMOKE, SMOKE_THIN], opts: { ...SMOKE_HAZE, speedVar: 0.3, size: 0.18 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'burst', name: 'spit', recipe: recipe(['#ffd27a', BRIGHT], SPARK), count: 3, tier: 'fine', at: 0.5, every: 0.45, times: 5 },
    { kind: 'emit', name: 'bed', arrange: 'disc', radius: 0.17, at: 0.3, rate: 5, dur: 3.2, attack: 0.5, release: 0.8, tier: 'hero',
      pops: [{ colors: [EMBER, COAL], opts: { ...EMBER_BED, life: 1.8, markLife: 6 }, tier: 'hero' }] },
    { kind: 'burst', name: 'collapse', recipe: recipe([EMBER, COAL], { ...COAL_HERO, speed: 0.5, vz: 1.2, zg: 6, life: 2.0 }), count: 4, tier: 'hero', at: 2.9, arrange: 'disc', radius: 0.12 },
    { kind: 'emit', name: 'dying', arrange: 'disc', radius: 0.2, at: 3.0, rate: 22, dur: 1.3, attack: 0.1, release: 0.7, tier: 'body',
      pops: [
        { colors: [FLAME, EMBER], opts: { ...FLAMELET, size: 0.12 }, weight: 2 },
        { colors: [SOOT, SMOKE], opts: FLOOR_SOOT, weight: 1 },
      ] },
    { kind: 'glow', name: 'glow', r: 1.3, rgb: FIRE_GLOW, a: 0.28, dur: 3.3, attack: 0.15, release: 0.6, flicker: 0.4 },
    { kind: 'glow', name: 'ember glow', r: 0.9, rgb: FIRE_GLOW, a: 0.14, at: 3.1, dur: 1.9, attack: 0.3, release: 1.0, flicker: 0.5 },
  ],
};

/**
 * fire.floor — burning ground that outlives its blast.
 *
 * IGNITION: a ground ring races out to the reach and a low mass
 * catches at the heart, then spreads to the rim on a second beat.
 * BURN: flamelets stand out of an ember bed across the disc, coals
 * pop out and land, shimmer climbs, low soot crawls up. DYING: the
 * flamelets thin, the last coals char where they lie, and the char
 * field is what the ground remembers for seconds after.
 */
export const fireFloor: EffectDef = {
  id: 'fire.floor',
  name: 'Fire — burning floor',
  story: 'a ground ring races out and the heart catches → the fire spreads to the rim → flamelets stand out of an ember bed that chars the dirt, coals pop and land, soot crawls up → the last coals char the floor that outlives the blast',
  layers: [
    { kind: 'field', name: 'heat', field: { kind: 'lift', radius: 1.2, strength: 1.4, dur: 4.4, height: 1.4, release: 0.8 }, radiusK: 1.2 },
    { kind: 'burst', name: 'ignition front', recipe: recipe([BRIGHT, FLAME], { ...SHOCKFRONT, life: 0.4, sizeCurve: curveOf([0, 0.3, 0.6, 3.0, 1, 3.4]) }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'heart', recipe: recipe([HEART, BRIGHT, FLAME], { ...BODY, size: 0.34, life: 0.9, speed: 0.6, drag: 2.2 }), count: 11, tier: 'body', arrange: 'disc', radius: 0.35, radiusK: 0.35 },
    { kind: 'burst', name: 'spreading front', recipe: recipe([BRIGHT, FLAME], { ...BODY, size: 0.32, life: 0.62, speed: 1.4, speedVar: 0.25, drag: 2.4 }), count: 12, tier: 'body', at: 0.1, arrange: 'rim', outward: 1.4, radius: 0.3, radiusK: 0.3 },
    { kind: 'emit', name: 'flamelets', arrange: 'disc', radius: 0.75, radiusK: 0.75, rate: 70, dur: 4.0, attack: 0.25, release: 1.3, tier: 'body', pops: FLOOR_POPS },
    { kind: 'burst', name: 'pops', recipe: recipe([EMBER, COAL], { ...COAL_HERO, vz: 1.6, speed: 0.6, life: 1.8 }), count: 2, tier: 'hero',
      arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.3, every: 0.42, times: 7 },
    { kind: 'burst', name: 'shimmer', recipe: recipe([HEART, BRIGHT], SHIMMER), count: 4, tier: 'fine', at: 0.2, every: 0.35, times: 9, arrange: 'disc', radius: 0.6, radiusK: 0.6 },
    { kind: 'emit', name: 'soot', arrange: 'disc', radius: 0.5, radiusK: 0.5, dz: 0.25, at: 0.6, rate: 7, dur: 3.4, attack: 0.4, release: 0.8, tier: 'body',
      pops: [{ colors: [SOOT, SMOKE], opts: { ...SMOKE_PUFF, size: 0.18, speed: 0.2, vz: 0.28, life: 1.4, waveAmp: 0.25 } }] },
    { kind: 'burst', name: 'last coals', recipe: recipe([EMBER, COAL], { ...EMBER_BED, life: 2.0, markLife: 6.5 }), count: 6, tier: 'hero', at: 3.7, arrange: 'disc', radius: 0.6, radiusK: 0.6 },
    { kind: 'glow', name: 'glow', r: 1.4, rgb: FIRE_GLOW, a: 0.24, dur: 4.2, attack: 0.2, release: 1.0, flicker: 0.45, radiusK: 1 },
    { kind: 'glow', name: 'ember glow', r: 1.0, rgb: FIRE_GLOW, a: 0.12, at: 3.6, dur: 2.2, attack: 0.3, release: 1.2, flicker: 0.5, radiusK: 1 },
  ],
};

/**
 * fire.fan — the breath-weapon shape, aimed along `dir`.
 *
 * MOUTH: a flash at the lips. GOUT: three cohorts of flame mass on a
 * stutter so the cone reads as a STREAM, not a puff — the wind field
 * carries body, embers and soot along the aim; tongues lead, embers
 * scatter past, sparks scratch the far air. LANDING: coals thrown to
 * the far end land and char a scorched fan on the dirt, and flamelets
 * thrown with them stall and stand where the breath struck. EXHALE:
 * soot blown down the aim after the flame.
 */
export const fireFan: EffectDef = {
  id: 'fire.fan',
  name: 'Fire — fan',
  story: 'a flash at the mouth → a stream of flame mass down the aim, tongues leading, embers past it → coals land and char a scorched fan, flamelets stand where the breath struck → one soot exhale blown down the aim',
  layers: [
    { kind: 'field', name: 'breath wind', field: { kind: 'wind', radius: 1.8, strength: 3.0, dur: 0.75, attack: 0.02, release: 0.3 }, aimed: true },
    { kind: 'burst', name: 'mouth', recipe: recipe([HEART, '#ffffff'], { ...HEART_FLASH, size: 0.42, life: 0.2 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'gout', recipe: recipe([HEART, BRIGHT, FLAME], GOUT_BODY), count: 9, tier: 'body', arrange: 'cone', spread: 0.55 },
    { kind: 'burst', name: 'gout II', recipe: recipe([BRIGHT, FLAME], { ...GOUT_BODY, speed: 2.8, size: 0.32 }), count: 8, tier: 'body', at: 0.07, arrange: 'cone', spread: 0.5 },
    { kind: 'burst', name: 'gout III', recipe: recipe([FLAME, EMBER], { ...GOUT_BODY, speed: 2.4, size: 0.32, life: 0.55 }), count: 7, tier: 'body', at: 0.14, arrange: 'cone', spread: 0.45 },
    { kind: 'burst', name: 'tongues', recipe: recipe([BRIGHT, FLAME], { ...TONGUE, speed: 3.2, speedVar: 0.35, vz: 0.5, mass: 0.4 }), count: 8, tier: 'body', arrange: 'cone', spread: 0.6 },
    { kind: 'burst', name: 'embers', recipe: recipe([FLAME, EMBER], { ...EMBER_FINE, speed: 3.4, speedVar: 0.5, vz: 0.9, zg: 3, life: 1.2 }), count: 16, tier: 'fine', arrange: 'cone', spread: 0.8 },
    { kind: 'burst', name: 'sparks', recipe: recipe(['#ffd27a', BRIGHT], { ...SPARK, speed: 3.6 }), count: 6, tier: 'fine', arrange: 'cone', spread: 0.7 },
    { kind: 'burst', name: 'scorch', recipe: recipe([EMBER, COAL], { ...COAL_HERO, speed: 2.6, speedVar: 0.35, vz: 0.9, zg: 5, life: 2.0, markLife: 6 }), count: 7, tier: 'hero', arrange: 'cone', spread: 0.5 },
    { kind: 'burst', name: 'struck ground', recipe: recipe([FLAME, EMBER, BRIGHT], { ...FLAMELET, speed: 3.0, speedVar: 0.3, drag: 2.8, life: 0.9, lifeVar: 0.3, size: 0.15, vz: 0.2, mass: 0 }), count: 9, tier: 'body', at: 0.12, arrange: 'cone', spread: 0.45 },
    { kind: 'burst', name: 'struck bed', recipe: recipe([EMBER, COAL], { ...EMBER_BED, speed: 2.8, speedVar: 0.3, drag: 2.8, life: 1.4, markLife: 5 }), count: 6, tier: 'hero', at: 0.2, arrange: 'cone', spread: 0.4 },
    { kind: 'emit', name: 'exhale', arrange: 'cone', aimed: true, spread: 0.5, rate: 18, dur: 0.7, attack: 0.08, release: 0.3, tier: 'body', at: 0.15,
      pops: [{ colors: [SMOKE, SOOT], opts: { ...SMOKE_PUFF, size: 0.22, speed: 1.6, speedVar: 0.3, vz: 0.4, life: 1.6 } }] },
    { kind: 'glow', name: 'glow', r: 1.2, rgb: FIRE_GLOW, a: 0.28, dur: 0.55, release: 0.3, flicker: 0.3 },
  ],
};

/**
 * fire.trail — a burning line from the cast point to the far anchor
 * (params x2/y2): a flame wall, a fuse, a spilled-oil road.
 *
 * FUSE: sparks scratch along the whole length — the line catches.
 * WALL: a first body along the path merges into one low wall; a
 * sustained path emitter keeps it standing with tongues leaping and
 * embers lifted; an ember bed under it chars a line into the dirt;
 * coals hop off and land beside it; smoke climbs from the wall's
 * back. DYING: the wall drops to flamelets in the bed, a soot breath,
 * and the charred line is what is left.
 */
export const fireTrail: EffectDef = {
  id: 'fire.trail',
  name: 'Fire — trail',
  story: 'a fuse of sparks scratches the line → a flame wall stands along it, tongues leaping, embers lifted, smoke off its back → an ember bed chars a line into the dirt, coals hop and land → the wall drops to flamelets and the charred line remains',
  layers: [
    { kind: 'field', name: 'lift', field: { kind: 'lift', radius: 2.4, strength: 1.6, dur: 3.2, height: 2.0, release: 0.8 } },
    { kind: 'burst', name: 'fuse', recipe: recipe(['#ffd27a', BRIGHT], { ...SPARK, speed: 0.5, vz: 1.4, zg: 6, life: 0.4 }), count: 18, tier: 'fine', arrange: 'path' },
    { kind: 'burst', name: 'fuse glints', recipe: recipe([HEART, BRIGHT], { ...SHIMMER, life: 0.35, size: 0.07 }), count: 10, tier: 'fine', arrange: 'path' },
    { kind: 'burst', name: 'catch', recipe: recipe([HEART, BRIGHT, FLAME], WALL_BODY), count: 20, tier: 'body', at: 0.06, arrange: 'path' },
    { kind: 'emit', name: 'wall', arrange: 'path', toFar: true, rate: 72, dur: 2.7, attack: 0.15, release: 0.8, tier: 'body', pops: WALL_POPS },
    { kind: 'emit', name: 'bed', arrange: 'path', toFar: true, at: 0.2, rate: 9, dur: 3.2, attack: 0.4, release: 0.8, tier: 'hero',
      pops: [{ colors: [EMBER, COAL], opts: { ...EMBER_BED, life: 1.7, markLife: 6.5 }, tier: 'hero' }] },
    { kind: 'burst', name: 'coals', recipe: recipe([EMBER, COAL], { ...COAL_HERO, speed: 0.5, vz: 1.4, zg: 6, life: 2.2 }), count: 6, tier: 'hero', at: 0.1, arrange: 'path' },
    { kind: 'emit', name: 'smoke', arrange: 'path', toFar: true, dz: 0.45, at: 0.5, rate: 15, dur: 2.4, attack: 0.4, release: 0.6, tier: 'body',
      pops: [
        { colors: [SOOT, SMOKE], opts: { ...PLUME_SMOKE, size: 0.26, speedVar: 0.2 }, weight: 2 },
        { colors: [SMOKE, SMOKE_THIN], opts: { ...SMOKE_HAZE, size: 0.16 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'burst', name: 'shimmer', recipe: recipe([HEART, BRIGHT], SHIMMER), count: 4, tier: 'fine', at: 0.3, every: 0.3, times: 8, arrange: 'path' },
    { kind: 'emit', name: 'dying', arrange: 'path', toFar: true, at: 2.7, rate: 26, dur: 1.4, attack: 0.1, release: 0.8, tier: 'body',
      pops: [
        { colors: [FLAME, EMBER], opts: { ...FLAMELET, size: 0.12 }, weight: 2 },
        { colors: [SOOT, SMOKE], opts: FLOOR_SOOT, weight: 1 },
      ] },
    { kind: 'glow', name: 'glow', r: 1.7, rgb: FIRE_GLOW, a: 0.26, dur: 3.0, attack: 0.15, release: 0.8, flicker: 0.4 },
  ],
};

/**
 * fire.pillar — the strike from below.
 *
 * OMEN: the ground glows and a ring of heat closes in; embers are
 * DRAWN into the heart by an attract field (the air rushing in).
 * ERUPTION: a shockfront and a flash, then flame masses stacked up a
 * column at rising altitudes on four beats — base, mid, top, crown —
 * each cooler than the one below; tongues and embers race up the
 * updraft, shimmer climbs, a smoke cap blooms over the crown. RAIN:
 * coals thrown up come back down, settle, and char a scatter around
 * the foot; a burning floor stands in the crater on its ember bed.
 */
export const firePillar: EffectDef = {
  id: 'fire.pillar',
  name: 'Fire — pillar',
  story: 'the ground glows and embers are drawn into the heart → a shockfront, a flash, and a column of flame masses stacks up on four beats → coals rain back down and char, a smoke cap blooms over the crown → a burning floor stands in the crater',
  layers: [
    { kind: 'glow', name: 'omen', r: 1.1, rgb: FIRE_GLOW, a: 0.22, dur: 0.5, attack: 0.35, release: 0.1, flicker: 0.5 },
    { kind: 'field', name: 'indraft', field: { kind: 'attract', radius: 1.6, strength: 4.0, dur: 0.48, attack: 0.05, release: 0.1 } },
    { kind: 'burst', name: 'omen ring', recipe: recipe([EMBER, FLAME], { ...SHOCKFRONT, life: 0.46, ramp: rampOf({ stops: [EMBER, FLAME, BRIGHT], at: [0, 0.5, 0.85] }), sizeCurve: curveOf([0, 2.6, 0.7, 1.1, 1, 0.5]), alphaCurve: curveOf([0, 0.5, 0.6, 1, 1, 0.8]) }), count: 1, tier: 'hero' },
    { kind: 'emit', name: 'gathering embers', arrange: 'rim', radius: 1.0, outward: -1.6, rate: 80, dur: 0.42, attack: 0.04, release: 0.08, tier: 'fine',
      pops: [{ colors: [FLAME, EMBER, BRIGHT], opts: { ...EMBER_FINE, size: 0.055, speed: 1.6, speedVar: 0.3, life: 0.62, lifeVar: 0.2, vz: 0.12, zg: 0, mass: 2.2, trail: 9, alphaCurve: curveOf('fadeIn') }, tier: 'fine' }] },
    { kind: 'burst', name: 'ground heat', recipe: recipe([EMBER, COAL, FLAME], { ...EMBER_BED, size: 0.09, life: 0.42, lifeVar: 0.2, flicker: 0.8, mark: undefined, ramp: rampOf({ stops: [DEEP, COAL, EMBER, FLAME], at: [0, 0.3, 0.65, 0.9], steps: 5 }) }), count: 12, tier: 'body', at: 0.1, arrange: 'disc', radius: 0.32 },
    { kind: 'field', name: 'updraft', field: { kind: 'lift', radius: 1.3, strength: 3.4, dur: 1.4, height: 3.2, attack: 0.02, release: 0.5 }, at: ERUPT },
    { kind: 'burst', name: 'shockfront', recipe: recipe([BRIGHT, FLAME], SHOCKFRONT), count: 1, tier: 'hero', at: ERUPT },
    { kind: 'burst', name: 'heart', recipe: recipe([HEART, '#ffffff'], { ...HEART_FLASH, size: 0.55 }), count: 2, tier: 'hero', at: ERUPT, dz: 0.3 },
    { kind: 'burst', name: 'column base', recipe: recipe([HEART, BRIGHT, FLAME], { ...COLUMN_BODY, size: 0.38, vz: 2.2 }), count: 10, tier: 'body', at: ERUPT, arrange: 'disc', radius: 0.16, dz: 0.05 },
    { kind: 'burst', name: 'column mid', recipe: recipe([BRIGHT, FLAME], { ...COLUMN_BODY, size: 0.36, vz: 2.0 }), count: 8, tier: 'body', at: ERUPT + 0.06, arrange: 'disc', radius: 0.15, dz: 0.6 },
    { kind: 'burst', name: 'column top', recipe: recipe([FLAME, EMBER], { ...COLUMN_BODY, size: 0.33, vz: 1.7, ramp: RAMP_COLUMN_HIGH }), count: 7, tier: 'body', at: ERUPT + 0.12, arrange: 'disc', radius: 0.15, dz: 1.2 },
    { kind: 'burst', name: 'crown', recipe: recipe([FLAME, EMBER], { ...COLUMN_BODY, size: 0.32, vz: 1.2, life: 0.7, ramp: RAMP_COLUMN_HIGH }), count: 6, tier: 'body', at: ERUPT + 0.18, arrange: 'disc', radius: 0.18, dz: 1.8 },
    { kind: 'burst', name: 'tongues', recipe: recipe([BRIGHT, FLAME], { ...TONGUE, speed: 0.5, vz: 2.8, zg: -0.6, life: 0.6 }), count: 10, tier: 'body', at: ERUPT, arrange: 'disc', radius: 0.14 },
    { kind: 'burst', name: 'embers', recipe: recipe([FLAME, EMBER, BRIGHT], { ...EMBER_FINE, speed: 0.9, vz: 3.0, zg: 1.4, life: 1.8 }), count: 24, tier: 'fine', at: ERUPT, arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'shimmer', recipe: recipe([HEART, BRIGHT], { ...SHIMMER, vz: 3.0, life: 0.8 }), count: 5, tier: 'fine', at: ERUPT + 0.05, every: 0.15, times: 4, arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'coal rain', recipe: recipe([EMBER, COAL], { ...COAL_HERO, speed: 0.9, speedVar: 0.5, vz: 3.4, zg: 6, life: 2.6, markLife: 6.5 }), count: 8, tier: 'hero', at: ERUPT + 0.1, arrange: 'disc', radius: 0.15 },
    { kind: 'emit', name: 'smoke cap', arrange: 'disc', radius: 0.3, dz: 2.1, at: ERUPT + 0.3, rate: 26, dur: 1.0, attack: 0.1, release: 0.4, tier: 'body',
      pops: [
        { colors: [SOOT, SMOKE], opts: { ...SMOKE_PUFF, speed: 0.55, speedVar: 0.35, vz: 0.3, life: 2.2 }, weight: 2 },
        { colors: [SMOKE, SMOKE_THIN], opts: { ...SMOKE_HAZE, vz: 0.3 }, weight: 1, tier: 'fine' },
      ] },
    { kind: 'emit', name: 'crater floor', arrange: 'disc', radius: 0.42, at: ERUPT + 0.45, rate: 34, dur: 2.4, attack: 0.2, release: 1.0, tier: 'body', pops: FLOOR_POPS },
    { kind: 'glow', name: 'glow', r: 2.0, rgb: FIRE_GLOW, a: 0.4, dur: 0.9, attack: 0.02, release: 0.5, flicker: 0.35, at: ERUPT },
    { kind: 'glow', name: 'ember glow', r: 1.1, rgb: FIRE_GLOW, a: 0.16, at: ERUPT + 0.9, dur: 2.2, attack: 0.2, release: 1.2, flicker: 0.5 },
  ],
};

export const FIRE_EFFECTS: EffectDef[] = [fireBurst, firePlume, fireFloor, fireFan, fireTrail, firePillar];
