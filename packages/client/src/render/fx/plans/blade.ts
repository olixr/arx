/**
 * BLADE — THE ONEHAND SCHOOL'S VOICE (particles v6 phase 5; THE MASTERED
 * HAND Phase 4). Every onehand art — the twenty-one rungs and the thirty-
 * eight secrets the blade teaches any hand — speaks one curated plan here
 * (this file outranks core/melee/sneak by the index's spread order); the
 * school's own effects live in BLADE_EFFECTS and register through the
 * library index.
 *
 * THE STEEL HAS NO MATERIAL: the library speaks fire, frost, storm, dust,
 * arcane, shadow, blood, venom, water, smoke — never the edge itself. A
 * cut's voice here is what the edge does to the world (blood, dust,
 * scorch, rime) plus two roster-only steel effects for what only the
 * edge can say:
 *
 *   blade.glint   THE SHARPENING SHOWER — an aimed fan of steel glints
 *                 and filings off the edge, a white bite-flash at the
 *                 point, filings that land and prick the dirt. The
 *                 cut's own voice, sized by the cut.
 *   blade.mirror  THE MIRROR-FLASH — an unaimed white negative flash
 *                 that collapses, a chime ring on the ground, a rim of
 *                 glints thrown on true height that wink where they
 *                 land. A bell, a stamp, a word read aloud.
 *
 * Wire kinds (from the server): melee_arc → arc (300 ms), flurry → three
 * arc beats, nova → nova, dash_strike → dash (near = departure, far =
 * arrival), chain_zap → one bolt per hop (far = the struck), ground_aoe →
 * blast after its telegraph, projectile_fan → blast at the hit (radius
 * 0.55), beam → beam per beat, self_buff → buff. Channels arrive one
 * wire cast per beat, so their plans are light and speak per beat.
 * `every` only re-speaks while the wire fx lives (≤ 0.8 s) — standing
 * acts are written with `at` delays instead.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { CORE as ICE_CORE, PALE as ICE_PALE, ICE, DEEP as ICE_DEEP, MIST as ICE_MIST } from '../library/frost.js';
import { SAND, PALE as DUST_PALE, LOAM, SHADE, DEEP as DUST_DEEP } from '../library/dust.js';
import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';

// ---------------------------------------------------------------------------
// The steel palette — the STEEL style family's five: white heart, bright
// steel, worn steel, dark steel, and the hot spark the edge throws.
// ---------------------------------------------------------------------------

const HEART = '#ffffff';
const BRIGHT = '#f4f2ec';
const STEEL = '#d8d4cc';
const WORN = '#a8a49c';
const DARK = '#6a6862';
const SPARK_HOT = '#fff3c4';
const SPARK = '#ffd98a';

const STEEL_GLOW = '244, 242, 236';

/** A glint's life: white, steel, worn, gone — four flat bands. */
const RAMP_GLINT = rampOf({ stops: [HEART, BRIGHT, STEEL, WORN], at: [0, 0.25, 0.6, 0.9], steps: 4 });
/** A filing: born hot off the edge, cooling to steel, lying dark. */
const RAMP_FILING = rampOf({ stops: [SPARK_HOT, SPARK, STEEL, WORN, DARK], at: [0, 0.2, 0.45, 0.75, 0.95], steps: 6 });
/** The mirror flash: white that shows steel at its rim as it dies. */
const RAMP_FLASH = rampOf({ stops: [HEART, BRIGHT, STEEL], at: [0, 0.55, 0.85] });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const BLOOM = curveOf('bloom');
/** A lying grain: full until the last fifth. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);

/** The bite: a white flare at the point, gone in a fifth of a second. */
const BITE: BurstOpts = {
  shape: 'blob', speed: 0.3, life: 0.24, lifeVar: 0.15, size: 0.44, sizeVar: 0.2, gravity: 0,
  z: 0.45, layer: 'world', shadow: 0, ramp: RAMP_FLASH, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: HEART, coreK: 0.5,
};

/** Steel glints: the sharpening shower, fast fines that wink out. */
const GLINT: BurstOpts = {
  shape: 'glint', speed: 2.2, speedVar: 0.5, life: 0.38, lifeVar: 0.35, size: 0.06, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 0.9, zg: 5, land: 'die', layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_GLINT, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** Filings: streaks off the edge on true height that land and prick the dirt. */
const FILING: BurstOpts = {
  shape: 'streak', align: true, speed: 2.8, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 1.6, zg: 8, land: 'die', layer: 'world', shadow: 0, flicker: 0.4,
  trail: 6, trailColor: WORN, ramp: RAMP_FILING, sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'fleck', markLife: 2.2,
};

/** Shavings: the heroes — curled steel thrown farther, bouncing, lying bright for a while. */
const SHAVING: BurstOpts = {
  shape: 'shard', speed: 1.6, speedVar: 0.45, life: 2.4, lifeVar: 0.3, size: 0.075, sizeVar: 0.25,
  gravity: 0, spin: 11, z: 0.5, vz: 2.2, zg: 8, land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: rampOf({ stops: [BRIGHT, STEEL, WORN, DARK], at: [0, 0.3, 0.7, 0.92], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
};

/** The chime: a ground ring that rings out and thins. */
const CHIME: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.4, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [HEART, BRIGHT, STEEL, WORN], at: [0, 0.35, 0.7, 0.9] }),
  sizeCurve: curveOf([0, 0.3, 0.5, 2.2, 1, 2.8]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** The mirror: a white disc at chest height that pops and collapses — the negative moment. */
const MIRROR: BurstOpts = {
  shape: 'blob', speed: 0.1, life: 0.3, lifeVar: 0.1, size: 0.7, sizeVar: 0.1, gravity: 0,
  z: 0.6, layer: 'world', shadow: 0, ramp: RAMP_FLASH, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: HEART, coreK: 0.6,
};

/** Rim glints thrown up off the chime on true height, winking where they land. */
const RIM_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.9, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.06, sizeVar: 0.3,
  gravity: 0, z: 0.1, vz: 2.4, zg: 7, land: 'die', layer: 'world', shadow: 0, flicker: 0.7,
  ramp: RAMP_GLINT, sizeCurve: BLOOM, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 1.6,
};

/** A steel dust: the fines that hang a breath where the flash was. */
const STEEL_DUST: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, z: 0.55, vz: 0.2, zg: 1.5, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_GLINT, sizeCurve: HOLD, alphaCurve: curveOf('mist'),
};

/**
 * blade.glint — THE SHARPENING SHOWER. Aimed down params.dir: the bite
 * flashes white at the point, a fan of glints and filings sprays off
 * the edge on true height, shavings fly farthest and lie, filings prick
 * the dirt. Anticipation is the bite; impact the shower; aftermath the
 * shavings lying bright on the ground.
 */
const bladeGlint: EffectDef = {
  id: 'blade.glint',
  name: 'Blade — glint',
  story: 'the edge bites white at the point → a fan of steel glints and hot filings sprays down the aim on true height → curled shavings fly farthest, bounce, and lie bright → filings prick the dirt → a steel dust hangs one breath',
  layers: [
    { kind: 'burst', name: 'bite', recipe: recipe([HEART, BRIGHT], BITE), count: 1, tier: 'body' },
    { kind: 'burst', name: 'glint fan', recipe: recipe([HEART, BRIGHT, STEEL], GLINT), count: 14, tier: 'fine', arrange: 'cone', spread: 0.7, along: 0.3 },
    { kind: 'burst', name: 'filings', recipe: recipe([SPARK_HOT, SPARK, STEEL], FILING), count: 9, tier: 'body', arrange: 'cone', spread: 0.55, along: 0.3 },
    { kind: 'burst', name: 'shavings', recipe: recipe([BRIGHT, STEEL], SHAVING), count: 3, tier: 'hero', arrange: 'cone', spread: 0.6, along: 0.3 },
    { kind: 'burst', name: 'second scrape', recipe: recipe([BRIGHT, STEEL], { ...GLINT, speed: 1.6, life: 0.3 }), count: 6, tier: 'fine', arrange: 'cone', spread: 0.9, along: 0.3, at: 0.07 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 8, tier: 'fine', arrange: 'cone', spread: 0.8, along: 0.35, at: 0.1 },
    { kind: 'burst', name: 'bite glints', recipe: recipe([HEART, SPARK_HOT], { ...GLINT, speed: 0.8, life: 0.25, size: 0.07 }), count: 5, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.45 },
    { kind: 'glow', name: 'bite light', r: 0.9, rgb: STEEL_GLOW, a: 0.3, dur: 0.2, release: 0.14, dz: 0.4 },
  ],
};

/**
 * blade.mirror — THE MIRROR-FLASH. Unaimed: a white disc pops at chest
 * height and collapses, a chime ring rings out on the ground, glints
 * are thrown up off the rim on true height and wink where they land, a
 * steel dust hangs where the disc was. The bell, the stamp, the word
 * read aloud — every ability that rings rather than cuts.
 */
const bladeMirror: EffectDef = {
  id: 'blade.mirror',
  name: 'Blade — mirror',
  story: 'a white disc pops at chest height and collapses → the chime rings out flat on the ground → glints leap off the rim on true height and wink where they land → a steel dust hangs where the flash was → the light lets go',
  layers: [
    { kind: 'burst', name: 'mirror', recipe: recipe([HEART, BRIGHT], MIRROR), count: 1, tier: 'body' },
    { kind: 'burst', name: 'chime', recipe: recipe([HEART, BRIGHT], CHIME), count: 1, tier: 'body' },
    { kind: 'burst', name: 'rim glints', recipe: recipe([HEART, BRIGHT, STEEL], RIM_GLINT), count: 12, tier: 'body', arrange: 'rim', radiusK: 0.55, outward: 0.8 },
    { kind: 'burst', name: 'inner glints', recipe: recipe([BRIGHT, STEEL], { ...RIM_GLINT, vz: 3.0, life: 0.55 }), count: 8, tier: 'fine', arrange: 'disc', radius: 0.35, at: 0.05 },
    { kind: 'burst', name: 'hero glints', recipe: recipe([HEART, SPARK_HOT], { ...RIM_GLINT, size: 0.085, life: 0.9, vz: 2.8, markLife: 3.2 }), count: 3, tier: 'hero', arrange: 'rim', radiusK: 0.4, outward: 1.1 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 10, tier: 'fine', arrange: 'disc', radius: 0.4, at: 0.12 },
    { kind: 'glow', name: 'flash', r: 1.1, rgb: STEEL_GLOW, a: 0.3, dur: 0.24, release: 0.16, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// THE DUELIST'S VOICE — the onehand school's own effects (THE MASTERED HAND,
// Phase 4: THE VOICE). Four words hang in the air — stagger, sunder,
// riposte, root — and two grounds keep burning. Each is steel first: the
// library owns no edge, so the school says what only the edge can.
//
//   onehand.stagger_ring   THE REELING BELL — the stagger word: a bell ring
//                          slams flat and races out, a second lags (the
//                          reel), glints hang and swing before they drop,
//                          pale flecks print the ring on the floor.
//   onehand.sunder_crack   THE CRACKED GUARD — the sunder word, aimed: a
//                          split flash, a fissure of char laid in a LINE
//                          down the aim that stays, shards heaved off the
//                          crack, hot grit cooling along it.
//   onehand.riposte        THE CROSSED STROKE — the payoff detonation: a
//                          white heart flash and an X of steel lanes, a
//                          chime, hot filings lying bright.
//   onehand.thrown_stone   THE THROWN STONE — the finale: a mass flare and
//                          a double bell, heavy slivers thrown far and
//                          lying, a glint shower on true height, a dust
//                          skirt shoved off the rim.
//   onehand.rime_sheet     THE RIME RING — the frost ground: a sheet of
//                          rime laid square by square, ice teeth standing
//                          at the rim, cold fog lying low, sparkle.
//   onehand.broken_ground  THE OPENED EARTH — the sunder ground: char
//                          spokes cracking out, clods heaved and lying,
//                          the ground breathing dust while it stands.
// ---------------------------------------------------------------------------

const INK = '#2e3136';
const DUST_GLOW = '214, 172, 112';
const RIME_GLOW = '184, 220, 242';

/** A crack: hot at the split, then worn steel, then the dark it lies as. */
const RAMP_CRACK = rampOf({ stops: [SPARK_HOT, WORN, DARK, INK], at: [0, 0.12, 0.4, 0.9], steps: 5 });
/** Earth cracks: loam darkening to ink. */
const RAMP_EARTH_CRACK = rampOf({ stops: [LOAM, SHADE, DUST_DEEP, INK], at: [0, 0.3, 0.65, 0.92], steps: 5 });
/** Ground clods: loam to shade as they lie. */
const RAMP_CLOD = rampOf({ stops: [LOAM, SHADE, DUST_DEEP], at: [0, 0.55, 0.9], steps: 4 });
/** Dust fines: bright in the air, dull on the ground. */
const RAMP_DUSTFINE = rampOf({ stops: [SAND, DUST_PALE, LOAM], at: [0, 0.4, 0.9], steps: 4 });
/** Rime: core white to ice as it lies. */
const RAMP_RIME = rampOf({ stops: [ICE_CORE, ICE_PALE, ICE, ICE_DEEP], at: [0, 0.25, 0.6, 0.92], steps: 5 });
/** Cold fog: mist thinning to ice. */
const RAMP_COLD = rampOf({ stops: [ICE_MIST, ICE_PALE, ICE], at: [0, 0.5, 0.95], steps: 4 });

const MIST_A = curveOf('mist');
/** A slow lying grain that only lets go at the end. */
const LIE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

/** The bell: a steel-white ring that slams flat on the floor and races out. */
const BELL_RING: BurstOpts = {
  shape: 'ring', ringWidth: 0.16, speed: 0, life: 0.6, lifeVar: 0.05, size: 0.55, sizeVar: 0.02, gravity: 0,
  layer: 'ground',
  ramp: rampOf({ stops: [HEART, BRIGHT, STEEL, WORN], at: [0, 0.35, 0.7, 0.92] }),
  sizeCurve: curveOf([0, 0.4, 0.4, 3.6, 1, 5.0]), alphaCurve: curveOf([0, 1, 0.6, 0.85, 1, 0]),
};

/** Reel glints: thrown up slow off the rim, HANGING and swinging before they drop. */
const REEL_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.5, speedVar: 0.4, life: 1.1, lifeVar: 0.25, size: 0.07, sizeVar: 0.3,
  gravity: 0, z: 0.2, vz: 2.0, zg: 2.6, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  wave: 'sine', waveHz: 2.2, waveAmp: 0.18, waveAxis: 'x',
  ramp: RAMP_GLINT, sizeCurve: BLOOM, alphaCurve: FADE_LATE,
};

/** Reel motes: the fines that hang in the ring and sway. */
const REEL_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 0.5, zg: 0.8, layer: 'world', shadow: 0, flicker: 0.3,
  wave: 'sine', waveHz: 1.6, waveAmp: 0.14, waveAxis: 'x',
  ramp: RAMP_GLINT, sizeCurve: HOLD, alphaCurve: MIST_A,
};

/** Rim flecks: pale steel squares that drop at the rim and PRINT the ring. */
const RIM_FLECK: BurstOpts = {
  shape: 'square', speed: 0.15, speedVar: 0.4, life: 0.5, lifeVar: 0.2, size: 0.07, sizeVar: 0.25,
  gravity: 0, z: 0.06, vz: 0.5, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [BRIGHT, STEEL, WORN], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, mark: 'fleck', markLife: 3.5,
};

/** The dust skirt: flat fines racing out along the floor. */
const DUST_SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.2, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground', ramp: RAMP_DUSTFINE, alphaCurve: FADE_LATE,
};

/** One low breath of dust. */
const DUST_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.9, speedVar: 0.5, life: 0.75, lifeVar: 0.3, size: 0.22, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.04, vz: 0.3, zg: 1.0, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, DUST_PALE, SAND], at: [0, 0.45, 1], steps: 4 }),
  sizeCurve: curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]), alphaCurve: curveOf([0, 0.8, 0.5, 0.6, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/**
 * onehand.stagger_ring — THE REELING BELL. The stagger word: a bell ring
 * slams flat and races out, a second thinner ring lags behind it (the
 * reel), glints leap off the rim on true height and HANG, swinging, before
 * they drop; pale flecks print the ring on the floor for a few seconds.
 */
const onehandStaggerRing: EffectDef = {
  id: 'onehand.stagger_ring',
  name: 'Onehand — stagger ring',
  story: 'the bell slams flat on the floor and races out → a second ring lags — the reel → glints leap off the rim on true height and hang, swinging, before they drop → pale flecks print the ring on the floor → a dust skirt is shoved off the rim',
  layers: [
    { kind: 'field', name: 'the shove', field: { kind: 'attract', radius: 1.4, strength: -1.8, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'bell', recipe: recipe([HEART, BRIGHT], BELL_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'reel bell', recipe: recipe([BRIGHT, STEEL], { ...BELL_RING, size: 0.45, life: 0.5 }), count: 1, tier: 'body', at: 0.16 },
    { kind: 'burst', name: 'reel glints', recipe: recipe([HEART, BRIGHT, STEEL], REEL_GLINT), count: 12, tier: 'body', arrange: 'rim', radiusK: 0.55, outward: 0.5 },
    { kind: 'burst', name: 'hang motes', recipe: recipe([BRIGHT, STEEL], REEL_MOTE), count: 12, tier: 'fine', arrange: 'disc', radius: 0.5, radiusK: 0.5, at: 0.1 },
    { kind: 'burst', name: 'rim flecks', recipe: recipe([BRIGHT, STEEL], RIM_FLECK), count: 10, tier: 'hero', arrange: 'rim', radiusK: 0.9, outward: 0.2, at: 0.05 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([SAND, DUST_PALE], DUST_SKIRT), count: 8, tier: 'body', arrange: 'rim', radius: 0.1, outward: 3.0 },
    { kind: 'glow', name: 'bell light', r: 1.2, rgb: STEEL_GLOW, a: 0.24, dur: 0.3, release: 0.2 },
  ],
};

/** The fissure: dark squares flung low down the aim that land and CHAR a line. */
const FISSURE: BurstOpts = {
  shape: 'square', align: true, speed: 4.2, speedVar: 0.95, life: 0.9, lifeVar: 0.2, size: 0.085, sizeVar: 0.25,
  gravity: 0, drag: 0.6, z: 0.03, vz: 0.35, zg: 2.0, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_CRACK, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 6,
};

/** Crack shards: dark steel heaved off the split, bouncing, lying. */
const CRACK_SHARD: BurstOpts = {
  ...SHAVING, size: 0.085, speed: 1.2, vz: 2.6, life: 2.2,
  ramp: rampOf({ stops: [BRIGHT, STEEL, WORN, DARK], at: [0, 0.2, 0.55, 0.9], steps: 5 }),
};

/** Hot grit: the crack's heat lying along it, cooling. */
const HOT_GRIT: BurstOpts = {
  shape: 'square', align: true, speed: 1.6, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, drag: 2, z: 0.2, vz: 1.4, zg: 7, land: 'settle', layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_FILING, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 3,
};

/**
 * onehand.sunder_crack — THE CRACKED GUARD. Aimed down params.dir: the
 * guard splits with a white flash, a fissure of char is laid in a LINE
 * down the aim and stays, dark shards heave off the crack and lie, hot
 * grit cools along the seam, the seam breathes one puff of dust.
 */
const onehandSunderCrack: EffectDef = {
  id: 'onehand.sunder_crack',
  name: 'Onehand — sunder crack',
  story: 'the guard splits with a white flash → a fissure of char is laid in a line down the aim and STAYS → dark steel shards heave off the crack, bounce and lie → hot grit cools along the seam → the seam breathes one puff of dust',
  layers: [
    { kind: 'burst', name: 'split flash', recipe: recipe([HEART, BRIGHT], { ...BITE, size: 0.5 }), count: 1, tier: 'hero', along: 0.35 },
    { kind: 'burst', name: 'fissure', recipe: recipe([WORN, DARK], FISSURE), count: 16, tier: 'hero', arrange: 'cone', spread: 0.08, along: 0.2 },
    { kind: 'burst', name: 'crack shards', recipe: recipe([STEEL, WORN], CRACK_SHARD), count: 4, tier: 'hero', arrange: 'cone', spread: 0.6, along: 0.4 },
    { kind: 'burst', name: 'hot grit', recipe: recipe([SPARK_HOT, SPARK], HOT_GRIT), count: 10, tier: 'body', arrange: 'cone', spread: 0.5, along: 0.4 },
    { kind: 'burst', name: 'seam dust', recipe: recipe([DUST_PALE, SAND], { ...DUST_PUFF, speed: 0.8, size: 0.2, life: 0.6 }), count: 4, tier: 'body', arrange: 'cone', spread: 0.5, along: 0.5 },
    { kind: 'burst', name: 'second split', recipe: recipe([DARK, INK], { ...FISSURE, size: 0.06, speed: 2.4, markLife: 4 }), count: 6, tier: 'fine', arrange: 'cone', spread: 0.25, along: 0.3, at: 0.1 },
    { kind: 'glow', name: 'split light', r: 0.8, rgb: STEEL_GLOW, a: 0.18, dur: 0.2, release: 0.14, along: 0.35 },
  ],
};

/** A cross lane: fast glints down one arm of the X. */
const CROSS_LANE: BurstOpts = { ...GLINT, shape: 'streak', align: true, speed: 3.4, speedVar: 0.3, life: 0.5, size: 0.095, trail: 6, trailColor: BRIGHT, flicker: 0.2 };

/**
 * onehand.riposte — THE CROSSED STROKE. Aimed: the payoff detonation — a
 * white heart flash at the point, an X of four steel lanes racing out of
 * it, the chime on the floor, hot filings that fly farthest and lie
 * bright, sparks off the heart, a steel dust one breath after.
 */
const onehandRiposte: EffectDef = {
  id: 'onehand.riposte',
  name: 'Onehand — riposte',
  story: 'the heart flashes white at the point → an X of four steel lanes races out of it → the chime rings on the floor → hot filings fly farthest and lie bright → sparks pop off the heart → a steel dust hangs one breath',
  layers: [
    { kind: 'burst', name: 'heart', recipe: recipe([HEART, BRIGHT], { ...MIRROR, size: 0.55, z: 0.5 }), count: 1, tier: 'hero', along: 0.3 },
    { kind: 'burst', name: 'lane fore-right', recipe: recipe([HEART, BRIGHT, STEEL], CROSS_LANE), count: 6, tier: 'body', arrange: 'cone', spread: 0.1, dirOff: 0.6, along: 0.3, dz: 0.45 },
    { kind: 'burst', name: 'lane fore-left', recipe: recipe([HEART, BRIGHT, STEEL], CROSS_LANE), count: 6, tier: 'body', arrange: 'cone', spread: 0.1, dirOff: -0.6, along: 0.3, dz: 0.45 },
    { kind: 'burst', name: 'lane aft-right', recipe: recipe([HEART, BRIGHT, STEEL], CROSS_LANE), count: 6, tier: 'body', arrange: 'cone', spread: 0.1, dirOff: Math.PI - 0.6, along: 0.3, dz: 0.45 },
    { kind: 'burst', name: 'lane aft-left', recipe: recipe([HEART, BRIGHT, STEEL], CROSS_LANE), count: 6, tier: 'body', arrange: 'cone', spread: 0.1, dirOff: Math.PI + 0.6, along: 0.3, dz: 0.45 },
    { kind: 'burst', name: 'chime', recipe: recipe([HEART, BRIGHT], CHIME), count: 1, tier: 'body', along: 0.3 },
    { kind: 'burst', name: 'hot filings', recipe: recipe([SPARK_HOT, SPARK], { ...SHAVING, size: 0.07, ramp: RAMP_FILING, life: 2.0, markLife: 4 }), count: 4, tier: 'hero', arrange: 'cone', spread: 0.9, along: 0.3 },
    { kind: 'burst', name: 'heart sparks', recipe: recipe([HEART, SPARK_HOT], { ...GLINT, speed: 1.2, life: 0.3, size: 0.06 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.15, dz: 0.45, along: 0.3 },
    { kind: 'burst', name: 'second heart', recipe: recipe([BRIGHT, STEEL], { ...MIRROR, size: 0.35, z: 0.5 }), count: 1, tier: 'body', at: 0.06, along: 0.3 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 6, tier: 'fine', arrange: 'disc', radius: 0.3, at: 0.08, along: 0.3 },
    { kind: 'glow', name: 'heart light', r: 1.0, rgb: STEEL_GLOW, a: 0.3, dur: 0.22, release: 0.15, dz: 0.45, along: 0.3 },
  ],
};

/** The mass flare: a big white blob at chest height that pops and collapses. */
const MASS_FLARE: BurstOpts = { ...MIRROR, size: 0.9, life: 0.34, z: 0.55, coreK: 0.6 };

/** Heavy slivers: the stone's steel thrown far and LYING for seconds. */
const HEAVY_SLIVER: BurstOpts = {
  shape: 'shard', align: true, speed: 3.6, speedVar: 0.3, life: 3.2, lifeVar: 0.3, size: 0.07, sizeVar: 0.3,
  gravity: 0, drag: 1.2, spin: 12, z: 0.4, vz: 1.8, zg: 7, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [BRIGHT, STEEL, WORN, DARK], at: [0, 0.1, 0.35, 0.8], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 6,
};

/**
 * onehand.thrown_stone — THE THROWN STONE. Unaimed, the finale: a mass
 * flare pops at chest height, a double bell rings out on the floor, heavy
 * slivers are thrown far and lie for seconds, a glint shower leaps on true
 * height, filings fly the rim, a dust skirt is shoved out, a low breath of
 * dust and a steel dust follow.
 */
const onehandThrownStone: EffectDef = {
  id: 'onehand.thrown_stone',
  name: 'Onehand — thrown stone',
  story: 'a mass flare pops at chest height → a double bell rings out on the floor → heavy slivers are thrown far and LIE for seconds → a glint shower leaps on true height → filings fly the rim → the dust skirt is shoved out → a low breath of dust and a steel dust follow',
  layers: [
    { kind: 'field', name: 'the throw', field: { kind: 'attract', radius: 1.6, strength: -2.2, dur: 0.35, attack: 0.02, release: 0.18 } },
    { kind: 'burst', name: 'mass flare', recipe: recipe([HEART, BRIGHT], MASS_FLARE), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'bell', recipe: recipe([HEART, BRIGHT], BELL_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'second bell', recipe: recipe([BRIGHT, STEEL], { ...BELL_RING, size: 0.6, life: 0.55 }), count: 1, tier: 'body', at: 0.12 },
    { kind: 'burst', name: 'heavy slivers', recipe: recipe([BRIGHT, STEEL], HEAVY_SLIVER), count: 10, tier: 'hero', arrange: 'rim', radius: 0.15, outward: 3.4, dz: 0.35 },
    { kind: 'burst', name: 'glint shower', recipe: recipe([HEART, BRIGHT, STEEL], { ...RIM_GLINT, vz: 3.2, life: 0.8, speed: 1.2 }), count: 16, tier: 'fine', arrange: 'disc', radius: 0.3, dz: 0.3 },
    { kind: 'burst', name: 'filings', recipe: recipe([SPARK_HOT, SPARK, STEEL], { ...FILING, speed: 3.2 }), count: 10, tier: 'body', arrange: 'rim', radius: 0.1, outward: 3.0, dz: 0.3 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([SAND, DUST_PALE], DUST_SKIRT), count: 10, tier: 'body', arrange: 'rim', radius: 0.1, outward: 3.4 },
    { kind: 'burst', name: 'second flare', recipe: recipe([BRIGHT, STEEL], { ...MASS_FLARE, size: 0.6, life: 0.3 }), count: 1, tier: 'body', at: 0.05 },
    { kind: 'burst', name: 'dust breath', recipe: recipe([DUST_PALE, SAND], DUST_PUFF), count: 4, tier: 'body', arrange: 'rim', radius: 0.2, outward: 1.0, at: 0.1 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 8, tier: 'fine', arrange: 'disc', radius: 0.5, at: 0.2 },
    { kind: 'glow', name: 'stone light', r: 1.4, rgb: STEEL_GLOW, a: 0.36, dur: 0.3, release: 0.22, dz: 0.5 },
  ],
};

/** Rime squares: born a hand up, dropping at once to lie as FROST on the floor. */
const RIME_SQUARE: BurstOpts = {
  shape: 'square', speed: 0.1, speedVar: 0.5, life: 0.35, lifeVar: 0.2, size: 0.075, sizeVar: 0.3,
  gravity: 0, z: 0.15, vz: 0, zg: 5, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_RIME, sizeCurve: HOLD, alphaCurve: HOLD, mark: 'frost', markLife: 5,
};

/** Ice teeth: standing shards at the rim that grow, hold, and let go. */
const ICE_TOOTH: BurstOpts = {
  shape: 'shard', speed: 0, life: 2.6, lifeVar: 0.2, size: 0.14, sizeVar: 0.3, gravity: 0, spin: 0,
  z: 0.02, vz: 0, zg: 0, land: 'none', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [ICE_CORE, ICE_PALE, ICE, ICE_DEEP], at: [0, 0.3, 0.7, 0.95], steps: 5 }),
  sizeCurve: curveOf([0, 0.2, 0.2, 1, 0.8, 1, 1, 0]), alphaCurve: curveOf([0, 0.4, 0.15, 1, 0.85, 0.9, 1, 0]),
};

/** Cold fog: low blobs that lie in the ring and thin. */
const COLD_FOG: BurstOpts = {
  shape: 'blob', speed: 0.25, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.36, sizeVar: 0.25,
  gravity: 0, drag: 1.5, z: 0.08, vz: 0.05, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_COLD, sizeCurve: curveOf('swell'), alphaCurve: curveOf([0, 0, 0.2, 0.45, 0.7, 0.35, 1, 0]),
  wave: 'noise', waveHz: 0.7, waveAmp: 0.12,
};

/** Sparkle: slow glints rising off the rime. */
const SPARKLE: BurstOpts = {
  shape: 'glint', speed: 0.1, speedVar: 0.5, life: 1.4, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 0.1, vz: 0.5, zg: 0.4, layer: 'world', shadow: 0, flicker: 0.7,
  ramp: rampOf({ stops: [ICE_CORE, ICE_PALE, ICE_MIST], at: [0, 0.5, 0.9] }), sizeCurve: BLOOM, alphaCurve: FADE_LATE,
};

const RIME_BREATH_POPS: EmitterPop[] = [
  { colors: [ICE_MIST, ICE_PALE], opts: { shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.2, lifeVar: 0.3, size: 0.045, sizeVar: 0.3, gravity: 0, z: 0.1, vz: 0.3, zg: 0.3, layer: 'world', shadow: 0, flicker: 0.3, ramp: RAMP_COLD, sizeCurve: HOLD, alphaCurve: MIST_A }, weight: 1, tier: 'fine' },
];

/**
 * onehand.rime_sheet — THE RIME RING. Unaimed, the frost ground: a sheet
 * of rime is laid square by square across the disc (frost marks that
 * stay), ice teeth stand up at the rim and hold, cold fog lies low in the
 * ring, a crust of rime rings the edge, sparkle rises, the ring breathes
 * cold while it stands.
 */
const onehandRimeSheet: EffectDef = {
  id: 'onehand.rime_sheet',
  name: 'Onehand — rime sheet',
  story: 'a sheet of rime is laid square by square across the disc and STAYS → ice teeth stand up at the rim and hold → cold fog lies low in the ring → a crust of rime rings the edge → sparkle rises off the sheet → the ring breathes cold while it stands',
  layers: [
    { kind: 'burst', name: 'rime sheet', recipe: recipe([ICE_CORE, ICE_PALE], RIME_SQUARE), count: 18, tier: 'hero', arrange: 'disc', radius: 1.0, radiusK: 0.9 },
    { kind: 'burst', name: 'ice teeth', recipe: recipe([ICE_CORE, ICE_PALE], ICE_TOOTH), count: 8, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 0.85 },
    { kind: 'burst', name: 'cold fog', recipe: recipe([ICE_MIST, ICE_PALE], COLD_FOG), count: 8, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.7 },
    { kind: 'burst', name: 'crust', recipe: recipe([ICE_PALE, ICE], { ...RIME_SQUARE, size: 0.06, markLife: 6 }), count: 12, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1.0, at: 0.15 },
    { kind: 'burst', name: 'sparkle', recipe: recipe([ICE_CORE, ICE_PALE], SPARKLE), count: 10, tier: 'fine', arrange: 'disc', radius: 1.0, radiusK: 0.8, at: 0.2 },
    { kind: 'emit', name: 'cold breath', arrange: 'disc', radius: 1.0, radiusK: 0.6, rate: 8, dur: 1.6, attack: 0.2, release: 0.5, tier: 'fine', pops: RIME_BREATH_POPS },
    { kind: 'glow', name: 'rime light', r: 1.3, rgb: RIME_GLOW, a: 0.14, dur: 1.8, attack: 0.2, release: 0.6, radiusK: 0.9 },
  ],
};

/** Earth cracks: loam squares flung low on every side that land and char spokes. */
const EARTH_CRACK: BurstOpts = { ...FISSURE, speed: 3.2, ramp: RAMP_EARTH_CRACK, markLife: 7 };

/** Clods: the heroes, heaved up, bouncing, lying. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 1.0, speedVar: 0.5, life: 2.8, lifeVar: 0.3, size: 0.1, sizeVar: 0.3,
  gravity: 0, spin: 8, z: 0.1, vz: 2.4, zg: 7, land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 6,
};

/** Heave: low masses of earth lifted and settling back. */
const HEAVE: BurstOpts = { ...DUST_PUFF, speed: 0.5, life: 0.9, size: 0.28, vz: 0.6, zg: 1.2 };

/** Grit: fines thrown up off the cracks, settling. */
const GRIT: BurstOpts = {
  shape: 'square', speed: 0.9, speedVar: 0.6, life: 1.4, lifeVar: 0.35, size: 0.045, sizeVar: 0.3,
  gravity: 0, drag: 0.5, mass: 1.0, vz: 1.8, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUSTFINE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

const SEEP_POPS: EmitterPop[] = [
  { colors: [DUST_PALE, SAND], opts: { shape: 'mote', speed: 0.2, speedVar: 0.6, life: 1.4, lifeVar: 0.35, size: 0.05, gravity: 0, drag: 0.8, z: 0.05, vz: 0.9, zg: 1.2, mass: 1.0, land: 'settle', layer: 'world', shadow: 0, jitter: 1.5, ramp: RAMP_DUSTFINE, sizeCurve: HOLD, alphaCurve: FADE_LATE }, weight: 1, tier: 'fine' },
];

/**
 * onehand.broken_ground — THE OPENED EARTH. Unaimed, the sunder ground:
 * char spokes crack out on every side and STAY, clods heave up and lie,
 * the ground lifts in a low heave and settles back, grit is thrown up,
 * a lift keeps dust seeping off the cracks while the ground stands.
 */
const onehandBrokenGround: EffectDef = {
  id: 'onehand.broken_ground',
  name: 'Onehand — broken ground',
  story: 'char spokes crack out on every side and STAY → clods heave up, bounce and lie → the ground lifts in a low heave and settles back → grit is thrown up off the cracks → dust seeps off the broken floor on a slow lift while it stands',
  layers: [
    { kind: 'burst', name: 'spokes', recipe: recipe([SHADE, DUST_DEEP], EARTH_CRACK), count: 14, tier: 'hero', arrange: 'rim', radius: 0.15, outward: 3.2 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 6, tier: 'hero', arrange: 'disc', radius: 1.0, radiusK: 0.6 },
    { kind: 'burst', name: 'heave', recipe: recipe([LOAM, DUST_PALE], HEAVE), count: 8, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.7 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, DUST_PALE, LOAM], GRIT), count: 14, tier: 'fine', arrange: 'disc', radius: 1.0, radiusK: 0.6 },
    { kind: 'field', name: 'the lift', field: { kind: 'lift', radius: 1.2, strength: 1.4, dur: 1.0, height: 0.8, attack: 0.05, release: 0.3 } },
    { kind: 'emit', name: 'seep', arrange: 'disc', radius: 1.0, radiusK: 0.5, rate: 8, dur: 1.4, attack: 0.1, release: 0.4, tier: 'fine', pops: SEEP_POPS },
    { kind: 'burst', name: 'second heave', recipe: recipe([DUST_PALE, SAND], { ...HEAVE, size: 0.2, life: 0.8 }), count: 4, tier: 'body', arrange: 'rim', radius: 1.0, radiusK: 0.8, at: 0.5 },
    { kind: 'glow', name: 'ground light', r: 1.1, rgb: DUST_GLOW, a: 0.08, dur: 0.5, attack: 0.03, release: 0.3 },
  ],
};

// The briar — the plant word from a sword: dark thorn, bramble wood, leaf, pale leaf, sap.
const THORN = '#3b4a25';
const BRAMBLE = '#5b3f2a';
const LEAF = '#6f9a3c';
const PALE_LEAF = '#b7cf6a';
const SAP = '#e6f0a0';
const BRIAR_GLOW = '120, 160, 70';

/** A thorn's life: sap-pale at the tip, green, then the dark wood it stands as. */
const RAMP_THORN = rampOf({ stops: [PALE_LEAF, LEAF, THORN, BRAMBLE], at: [0, 0.1, 0.35, 0.95], steps: 5 });
/** A leaf: pale in the air, green, dull on the ground. */
const RAMP_LEAF = rampOf({ stops: [SAP, PALE_LEAF, LEAF, THORN], at: [0, 0.2, 0.55, 0.95], steps: 5 });

/** Thorns: dark shards that STAND up out of the patch, hold, and let go. */
const THORN_STAND: BurstOpts = {
  ...ICE_TOOTH, size: 0.19, sizeVar: 0.35, life: 2.8, shadow: 0.25, ramp: RAMP_THORN,
  sizeCurve: curveOf([0, 0.15, 0.15, 1, 0.85, 1, 1, 0]), alphaCurve: curveOf([0, 0.5, 0.12, 1, 0.88, 0.9, 1, 0]),
};

/** Bramble stems: woody streaks standing in the patch between the thorns — the briar's mass. */
const BRAMBLE_STEM: BurstOpts = {
  ...ICE_TOOTH, shape: 'streak', size: 0.15, sizeVar: 0.3, life: 2.6, shadow: 0.2,
  ramp: rampOf({ stops: [LEAF, BRAMBLE, THORN], at: [0, 0.3, 0.95], steps: 4 }),
  sizeCurve: curveOf([0, 0.2, 0.15, 1, 0.85, 1, 1, 0]), alphaCurve: curveOf([0, 0.5, 0.12, 0.95, 0.88, 0.85, 1, 0]),
};

/** Leaf litter: squares raked off the swing on true height that land and lie as flecks. */
const LEAF_LITTER: BurstOpts = {
  shape: 'square', speed: 1.6, speedVar: 0.6, life: 1.6, lifeVar: 0.35, size: 0.065, sizeVar: 0.3,
  gravity: 0, drag: 1.4, spin: 6, z: 0.3, vz: 1.6, zg: 5, land: 'settle', layer: 'world', shadow: 0,
  wave: 'sine', waveHz: 3, waveAmp: 0.12, waveAxis: 'x',
  ramp: RAMP_LEAF, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 4,
};

/** The rake: bramble streaks whipped down the aim, fast, shedding. */
const BRAMBLE_WHIP: BurstOpts = {
  shape: 'streak', align: true, speed: 3.2, speedVar: 0.4, life: 0.4, lifeVar: 0.3, size: 0.08, sizeVar: 0.3,
  gravity: 0, z: 0.35, vz: 0.2, zg: 3, land: 'die', layer: 'world', shadow: 0, trail: 5, trailColor: LEAF,
  ramp: RAMP_THORN, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** Barbs: the heroes — dark thorn shards thrown up off the rake that land and prick the floor. */
const BARB: BurstOpts = {
  shape: 'shard', align: true, speed: 1.4, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.075, sizeVar: 0.25,
  gravity: 0, spin: 9, z: 0.3, vz: 2.4, zg: 8, land: 'bounce', bounce: 0.25, layer: 'world', shadow: 0.2,
  ramp: rampOf({ stops: [LEAF, THORN, BRAMBLE], at: [0, 0.3, 0.9], steps: 4 }), sizeCurve: HOLD, alphaCurve: LIE_A,
  mark: 'fleck', markLife: 5,
};

/** Green haze: the patch's low breath. */
const GREEN_HAZE: BurstOpts = {
  ...COLD_FOG, size: 0.3, life: 1.6, ramp: rampOf({ stops: [PALE_LEAF, LEAF, THORN], at: [0, 0.5, 0.95], steps: 4 }),
  alphaCurve: curveOf([0, 0, 0.2, 0.3, 0.7, 0.22, 1, 0]),
};

const SAP_POPS: EmitterPop[] = [
  { colors: [SAP, PALE_LEAF], opts: { shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.1, lifeVar: 0.3, size: 0.045, sizeVar: 0.3, gravity: 0, z: 0.1, vz: 0.45, zg: 0.5, layer: 'world', shadow: 0, flicker: 0.4, ramp: RAMP_LEAF, sizeCurve: HOLD, alphaCurve: MIST_A }, weight: 1, tier: 'fine' },
];

/**
 * onehand.briar_patch — THE BRIAR PLANTED. Aimed down params.dir: the
 * rake whips bramble down the aim, leaf litter is thrown off the swing
 * and lies, thorns STAND up out of the patch and hold, barbs land and
 * prick the floor, a green haze lies low, sap motes rise while it stands.
 */
const onehandBriarPatch: EffectDef = {
  id: 'onehand.briar_patch',
  name: 'Onehand — briar patch',
  story: 'the rake whips bramble down the aim → leaf litter is thrown off the swing on true height and lies → thorns STAND up out of the patch and hold → barbs land and prick the floor → a green haze lies low → sap motes rise while the briar stands',
  layers: [
    { kind: 'burst', name: 'the rake', recipe: recipe([LEAF, THORN], BRAMBLE_WHIP), count: 8, tier: 'body', arrange: 'cone', spread: 0.5, along: 0.2 },
    { kind: 'burst', name: 'leaf litter', recipe: recipe([PALE_LEAF, LEAF], LEAF_LITTER), count: 14, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.6, along: 0.4 },
    { kind: 'burst', name: 'thorns', recipe: recipe([THORN, BRAMBLE], THORN_STAND), count: 12, tier: 'hero', arrange: 'disc', radius: 1.0, radiusK: 0.75, along: 0.4, at: 0.08 },
    { kind: 'burst', name: 'bramble stems', recipe: recipe([BRAMBLE, THORN], BRAMBLE_STEM), count: 8, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.65, along: 0.4, at: 0.12 },
    { kind: 'burst', name: 'barbs', recipe: recipe([LEAF, THORN], BARB), count: 5, tier: 'hero', arrange: 'cone', spread: 0.7, along: 0.3 },
    { kind: 'burst', name: 'green haze', recipe: recipe([PALE_LEAF, LEAF], GREEN_HAZE), count: 5, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.6, along: 0.4, at: 0.15 },
    { kind: 'emit', name: 'sap', arrange: 'disc', radius: 1.0, radiusK: 0.55, along: 0.4, rate: 6, dur: 1.6, attack: 0.2, release: 0.5, tier: 'fine', pops: SAP_POPS },
    { kind: 'glow', name: 'briar light', r: 1.0, rgb: BRIAR_GLOW, a: 0.1, dur: 1.2, attack: 0.1, release: 0.5, along: 0.4 },
  ],
};

export const BLADE_EFFECTS: EffectDef[] = [
  bladeGlint, bladeMirror,
  onehandStaggerRing, onehandSunderCrack, onehandRiposte, onehandThrownStone, onehandRimeSheet, onehandBrokenGround,
  onehandBriarPatch,
];

// ---------------------------------------------------------------------------
// The plans — THE DUELIST'S TEMPO (THE MASTERED HAND, Phase 4: THE VOICE).
// Every onehand art speaks here: the twenty-one rungs, the thirty-eight
// secrets the blade teaches any hand. Wire kinds: melee_arc → arc; flurry →
// arc beats; nova → nova; pulse_nova → one blast per pulse; dash_strike →
// dash (near = departure, far = arrival); leap_slam → dash + blast at the
// landing; chain_zap → one bolt per hop; ground_aoe → blast after its fuse;
// projectile_fan → blast at the hit; beam → beam per beat; self_buff → buff.
// `onFollow` is the payoff's detonation (added at arrival, ×1.15);
// `onFinale` a held note's last beat (×1.35); `<art>:aftermath` the ground
// that keeps burning (kind field; plant at 0, re-speak on `every`).
// ---------------------------------------------------------------------------

export const BLADE_PLANS: Record<string, AbilityPlan> = {
  // ===================== THE RUNGS =====================

  // Rung 5 heavy_slam — arc, casted, STAGGER. The raised blade comes down:
  // the edge bites the aim, the ground takes the weight, and the bell of
  // the stagger reels out around what it landed on.
  heavy_slam: { cues: [
    { id: 'blade.glint', scale: 0.9 },
    { id: 'onehand.stagger_ring', scale: 1.3 },
    { id: 'dust.slam', at: 0.06, scale: 0.9 },
  ] },
  // Rung 10 ember_edge — arc, casted, RIPOSTE payoff (follows stagger/
  // riposte, burns). The kindled wake: the edge bites, the cut is a fan of
  // drawn fire, coals lie after. Landed inside the window the riposte
  // crosses white through the fire and the fire BURSTS.
  ember_edge: {
    cues: [
      { id: 'blade.glint', scale: 0.5 },
      { id: 'fire.fan', scale: 1.1 },
      { id: 'fire.floor', at: 0.4, scale: 0.55 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 1.0 },
      { id: 'fire.burst', at: 0.05, scale: 0.7 },
      { id: 'fire.floor', at: 0.5, scale: 0.5 },
    ],
  },
  // Rung 15 bull_rush — dash, SUNDER answer. The bow wave: the furrow tears
  // the lane, and where the shoulder lands the guard CRACKS — a fissure of
  // char down the line of the charge, the bow-crest breaking off the nose.
  bull_rush: { cues: [
    { id: 'dust.gouge', scale: 1.2 },
    { id: 'onehand.sunder_crack', atFar: true, at: 0.34, scale: 1.1 },
    { id: 'dust.billow', atFar: true, at: 0.36, scale: 0.6 },
  ] },
  // Rung 20 millwork — arc per beat, held, follows riposte, finale ×2. The
  // grindstone round: sparks off the rim and grit per turn; begun on a
  // riposte the wheel grinds a hot cross; the last turn THROWS THE STONE.
  millwork: {
    cues: [
      { id: 'blade.glint', scale: 1.0 },
      { id: 'core.steel_ring', scale: 0.45 },
      { id: 'dust.kick', at: 0.1, scale: 0.6 },
    ],
    onFollow: [{ id: 'onehand.riposte', scale: 0.7 }],
    onFinale: [
      { id: 'onehand.thrown_stone', scale: 1.3 },
      { id: 'dust.slam', at: 0.05, scale: 0.9 },
    ],
  },
  // Rung 25 whirlwind — one blast per pulse, SUNDER opener. Each turn the
  // blade inhales the loose ground and slings its chips, and the ring it
  // touched cracks — spokes of char under every guard it opened.
  whirlwind: { cues: [
    { id: 'core.cyclone', scale: 1.0 },
    { id: 'blade.mirror', at: 0.02, scale: 0.6 },
    { id: 'onehand.broken_ground', at: 0.05, scale: 0.75 },
  ] },
  // Rung 30 levinstroke — blast at the hit, casted, follows sunder ×1.5.
  // The sky's seam: the levin re-lights top-down onto the wound and the
  // standing charge crackles out; loosed at a cracked guard the riposte
  // crosses and the whole charge DISCHARGES half again.
  levinstroke: {
    cues: [
      { id: 'storm.strike', scale: 0.9 },
      { id: 'storm.nova', at: 0.3, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 0.9 },
      { id: 'storm.nova', at: 0.05, scale: 0.9, radiusK: 1.3 },
    ],
  },
  // Rung 35 warcry — buff, RIPOSTE answer. The risen hoop: the shout wakes
  // the ward underfoot and it snaps into a hoop that stands; the steel
  // rings once at the throat — the riposte word is open.
  warcry: { cues: [
    { id: 'arcane.bloom', scale: 0.9 },
    { id: 'blade.mirror', at: 0.1, scale: 0.7 },
    { id: 'arcane.orbit', at: 0.9, scale: 0.7 },
  ] },
  // Rung 40 red_ledger — beam per beat, held, vs sunder, finale ×2. The
  // ruled line: each entry is taken at the far end and drawn home; the
  // CLOSED ACCOUNT takes the whole balance — the debtor sprays, the drink
  // runs deep, the ledger pools under them.
  red_ledger: {
    cues: [
      { id: 'blood.hit', atFar: true, at: 0.05, scale: 0.6 },
      { id: 'blood.drink', scale: 0.8 },
    ],
    onFinale: [
      { id: 'blood.spray', atFar: true, at: 0.05, scale: 1.0 },
      { id: 'blood.drink', at: 0.15, scale: 1.3 },
      { id: 'blood.pool', atFar: true, at: 0.5, scale: 0.6 },
    ],
  },
  // Rung 45 steel_wave — blast per edge hit, follows stagger ×1.5. The
  // strobe edge shows itself at the wound as a halo of slivers; thrown at
  // a reeling body the edges cross and bite half again.
  steel_wave: {
    cues: [{ id: 'core.steel_ring', scale: 0.9 }],
    onFollow: [{ id: 'onehand.riposte', scale: 0.8 }],
  },
  // Rung 50 cold_iron — blast after the fuse, casted, ROOT; rank III leaves
  // the rime ring. The nail of winter: the iron rings as it is planted,
  // the white crack, hoarfrost claws out as ice teeth, cold fog sinks.
  cold_iron: { cues: [
    { id: 'blade.mirror', at: 0.02, scale: 0.6 },
    { id: 'frost.nova', scale: 0.8 },
    { id: 'frost.shards', scale: 1.2 },
    { id: 'frost.fog', at: 0.7, scale: 0.6 },
  ] },
  // cold_iron's ground — THE RIME RING: the sheet is laid at once and the
  // ring keeps breathing cold, re-rimed on the beat, for its life.
  'cold_iron:aftermath': { cues: [
    { id: 'onehand.rime_sheet', scale: 1.0 },
    { id: 'frost.fog', every: 0.8, scale: 0.35 },
    { id: 'onehand.rime_sheet', every: 1.2, scale: 0.5 },
  ] },
  // Rung 54 bloodlust — buff, answer (lifesteal; every cut sunders). The
  // vein tree: blood runs the wrong way into the heart, the sworn ground
  // drinks the drip, and the hunger whets the edge — a halo of steel.
  bloodlust: { cues: [
    { id: 'blood.drink', scale: 1.0 },
    { id: 'core.steel_ring', at: 0.3, scale: 0.5 },
    { id: 'blood.pool', at: 0.6, scale: 0.55 },
  ] },
  // Rung 58 frostwork — nova per beat, held, finale ×2. The window fern:
  // new arms of frost stand out of the ring each beat, a thin fog behind;
  // THE LAST RING cracks the whole pane and lays the rime sheet.
  frostwork: {
    cues: [
      { id: 'frost.shards', scale: 0.55 },
      { id: 'frost.fog', at: 0.3, scale: 0.4 },
    ],
    onFinale: [
      { id: 'frost.nova', scale: 1.3 },
      { id: 'onehand.rime_sheet', at: 0.1, scale: 1.0 },
    ],
  },
  // Rung 62 stagger_stomp — nova, casted, STAGGER. The ground swell: the
  // heel drives a bulge out, the stagger bell reels the whole ring, and a
  // fainter second front reaches the rim.
  stagger_stomp: { cues: [
    { id: 'onehand.stagger_ring', scale: 1.5 },
    { id: 'dust.slam', at: 0.04, scale: 1.0 },
    { id: 'dust.slam', at: 0.35, scale: 0.6, radiusK: 1.4 },
  ] },
  // Rung 66 first_light — dash, casted, follows riposte ×1.3. The door left
  // open: the posts stand at the departure, the afterline runs, you arrive
  // like morning; out of the guard the arrival crosses and SHATTERS.
  first_light: {
    cues: [
      { id: 'arcane.sigil', scale: 0.6 },
      { id: 'arcane.beam', scale: 1.0 },
      { id: 'arcane.bloom', atFar: true, at: 0.15, scale: 1.1 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.18, scale: 1.0 },
      { id: 'arcane.shatter', atFar: true, at: 0.2, scale: 0.8 },
    ],
  },
  // Rung 70 headsman_stroke — arc, follows root/stagger, vs sunder, execute.
  // The black arc and the toll: one clean cut, a near-black arc that stops
  // dead, a modest stain; on a kneeling neck the verdict crosses white and
  // the red is not modest.
  headsman_stroke: {
    cues: [
      { id: 'core.steel_cut', scale: 0.9 },
      { id: 'shadow.burst', at: 0.05, scale: 0.9 },
      { id: 'blood.pool', at: 0.5, scale: 0.35 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 1.2 },
      { id: 'blood.spray', at: 0.08, scale: 0.9 },
    ],
  },
  // Rung 74 live_iron — bolt per hop, held, finale ×1.5. The aurora banner:
  // the jag to the struck, a churning charge over the landing, a small
  // discharge; THE LAST PEAL throws the whole charge down from the sky.
  live_iron: {
    cues: [
      { id: 'storm.arc', scale: 0.8 },
      { id: 'storm.nova', atFar: true, at: 0.05, scale: 0.4 },
      { id: 'storm.cloud', atFar: true, at: 0.1, scale: 0.5 },
    ],
    onFinale: [
      { id: 'storm.strike', atFar: true, at: 0.05, scale: 1.2 },
      { id: 'storm.nova', scale: 1.0 },
    ],
  },
  // Rung 78 earthbreaker — leap (dash + blast at the landing), SUNDER,
  // aftermath. The verdict: the heel kicks off, the crown of earth leaps
  // around the landing, and the ground under every guard OPENS.
  earthbreaker: { cues: [
    { id: 'dust.kick', scale: 0.7 },
    { id: 'dust.slam', atFar: true, at: 0.62, scale: 1.8 },
    { id: 'onehand.broken_ground', atFar: true, at: 0.66, scale: 1.2 },
  ] },
  // earthbreaker's ground — THE OPENED EARTH keeps biting: the broken floor
  // heaves again on the beat and breathes dust for its life.
  'earthbreaker:aftermath': { cues: [
    { id: 'onehand.broken_ground', scale: 1.0 },
    { id: 'dust.billow', every: 0.8, scale: 0.4 },
    { id: 'onehand.broken_ground', every: 1.2, scale: 0.55 },
  ] },
  // Rung 82 gloomfall — nova, casted, consumes sunder ×1.5, follows sunder
  // (wider). The lamps go out: the dark arrives, lamp-flames gutter, dusk
  // lowers, a smoke stub climbs; after a sunder the night GRASPS every
  // cracked guard and spreads wider.
  gloomfall: {
    cues: [
      { id: 'shadow.burst', scale: 1.4 },
      { id: 'shadow.wisps', at: 0.1, scale: 0.9 },
      { id: 'shadow.veil', at: 0.5, scale: 0.8 },
      { id: 'smoke.wisp', at: 1.3, scale: 0.5 },
    ],
    onFollow: [
      { id: 'shadow.grasp', at: 0.05, scale: 1.0, radiusK: 1.3 },
      { id: 'shadow.burst', at: 0.12, scale: 0.9, radiusK: 1.3 },
    ],
  },
  // Rung 86 noonfall — blast per fall over the stake, held, finale ×2. The
  // noon bell: each fall slams and rings the ring, the bleached ring stands
  // a beat; THE NOON STROKE shatters the light and scorches the stake.
  noonfall: {
    cues: [
      { id: 'arcane.bloom', scale: 0.8 },
      { id: 'arcane.sigil', at: 0.1, scale: 0.5 },
    ],
    onFinale: [
      { id: 'arcane.shatter', scale: 1.2 },
      { id: 'arcane.bloom', at: 0.05, scale: 1.3, radiusK: 1.2 },
      { id: 'fire.floor', at: 0.4, scale: 0.5 },
    ],
  },
  // Rung 90 warlords_descent — CROWN: leap (dash + blast) + buff, casted,
  // STAGGER, held ground. The unwound spiral: the crater at the landing,
  // the ward breaking outward gold, and the stagger bell reeling the ring.
  warlords_descent: { cues: [
    { id: 'dust.kick', scale: 0.6 },
    { id: 'dust.slam', atFar: true, at: 0.55, scale: 1.7 },
    { id: 'arcane.bloom', atFar: true, at: 0.57, scale: 1.4 },
    { id: 'arcane.shatter', atFar: true, at: 0.62, scale: 1.3 },
    { id: 'onehand.stagger_ring', atFar: true, at: 0.62, scale: 1.5 },
    { id: 'arcane.sigil', atFar: true, at: 0.75, scale: 1.0 },
  ] },
  // warlords_descent's ground — THE PLANTED BANNER: the sigil stands on the
  // broken floor and the halo keeps re-forming on the beat — the ground is
  // yours, shielded and quick while you stand on it.
  'warlords_descent:aftermath': { cues: [
    { id: 'arcane.sigil', scale: 1.1 },
    { id: 'onehand.broken_ground', at: 0.05, scale: 0.7 },
    { id: 'arcane.orbit', every: 1.0, scale: 0.6 },
    { id: 'arcane.sigil', every: 1.5, scale: 0.6 },
  ] },
  // The page oathbound_edge — arc, follows riposte ×1.4, drains. The molten
  // seal: the edge cuts, the crown-seal is stamped, the repayment gathers
  // back, the seal spends itself; sworn out of a riposte the oath crosses
  // white and the arm drinks.
  oathbound_edge: {
    cues: [
      { id: 'core.steel_cut', scale: 0.8 },
      { id: 'arcane.sigil', scale: 0.9 },
      { id: 'arcane.bloom', at: 0.5, scale: 0.6 },
      { id: 'arcane.shatter', at: 1.3, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 1.0 },
      { id: 'blood.drink', at: 0.3, scale: 0.9 },
    ],
  },

  // ===================== THE SECRET SHELF =====================

  // crescent_sweep — nova, REND opener. The moon that waxes: chips shed off
  // the horn as the blade laps, the pivot's heel scuff, the bleed lands at
  // the far side of the lap and the rend keeps weeping.
  crescent_sweep: { cues: [
    { id: 'core.steel_ring', scale: 1.0 },
    { id: 'dust.kick', scale: 0.6 },
    { id: 'blood.hit', at: 0.28, scale: 0.6 },
    { id: 'blood.spray', at: 0.5, scale: 0.5 },
  ] },
  // lunge — dash, follows sunder/hook ×1.4. The thread pulled taut: heels
  // scuff, the whip-crack star at the arrival, red pin-pricks; through a
  // crack or onto a hooked body the point crosses and the wound sprays.
  lunge: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'core.steel_cut', atFar: true, at: 0.36, scale: 1.0 },
      { id: 'blood.hit', atFar: true, at: 0.42, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.38, scale: 1.0 },
      { id: 'blood.spray', atFar: true, at: 0.45, scale: 0.6 },
    ],
  },
  // shadowstep — blink, RIPOSTE answer, follows vanish ×1.5. The knife
  // arrives before you: the dark closes at the departure, bursts at the
  // arrival, the steel bites; out of a vanish it crosses and the dark grasps.
  shadowstep: {
    cues: [
      { id: 'shadow.veil', scale: 0.6 },
      { id: 'shadow.burst', atFar: true, at: 0.05, scale: 0.7 },
      { id: 'blade.glint', atFar: true, at: 0.1, scale: 0.7 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.12, scale: 1.0 },
      { id: 'shadow.grasp', atFar: true, at: 0.1, scale: 0.7 },
    ],
  },
  // shockwave — nova, casted, STAGGER. The bell of earth: three swells
  // pumping outward, each weaker, and the stagger bell reeling the ring
  // wide — the shelf's stagger, raised and warned like the school's.
  shockwave: { cues: [
    { id: 'onehand.stagger_ring', scale: 1.7 },
    { id: 'dust.slam', at: 0.04, scale: 1.4 },
    { id: 'dust.slam', at: 0.22, scale: 1.0, radiusK: 1.2 },
    { id: 'dust.slam', at: 0.44, scale: 0.7, radiusK: 1.4 },
  ] },
  // sundering_chop — arc, casted, SUNDER opener. The committed overhead:
  // the edge bites down the aim, the ground takes it, and the guard CRACKS
  // — a fissure of char down the line of the cut.
  sundering_chop: { cues: [
    { id: 'core.steel_cut', scale: 1.0 },
    { id: 'dust.slam', at: 0.05, scale: 0.9 },
    { id: 'onehand.sunder_crack', at: 0.06, scale: 1.2 },
  ] },
  // thorn_lash — arc, PLANT opener, bleeds, leaves the barbed patch. The
  // growing whip: the edge bites, the rake whips bramble down the aim and
  // the briar is PLANTED a stride ahead — thorns stand, litter lies — and
  // the wound weeps into it.
  thorn_lash: { cues: [
    { id: 'blade.glint', scale: 0.5 },
    { id: 'onehand.briar_patch', scale: 1.0 },
    { id: 'blood.hit', at: 0.06, scale: 0.7 },
    { id: 'blood.spray', at: 0.35, scale: 0.5 },
  ] },
  // thorn_lash's ground — THE BRIAR PATCH: the thorns keep standing and the
  // barbs keep bleeding whatever stands in them; the patch re-grows on the
  // beat and pools red.
  'thorn_lash:aftermath': { cues: [
    { id: 'onehand.briar_patch', scale: 1.0 },
    { id: 'blood.pool', at: 0.3, scale: 0.5 },
    { id: 'onehand.briar_patch', every: 1.2, scale: 0.45 },
    { id: 'blood.spray', every: 0.8, scale: 0.35 },
  ] },
  // quicksilver — three arc beats, follows riposte/left/right ×1.3, quickens.
  // The three bells: each beat a small mirror-flash and a pinprick; in the
  // link each crosses light and the hand's halo QUICKENS.
  quicksilver: {
    cues: [
      { id: 'blade.mirror', scale: 0.55 },
      { id: 'blood.hit', at: 0.05, scale: 0.35 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 0.6 },
      { id: 'arcane.orbit', at: 0.1, scale: 0.5 },
    ],
  },
  // riptide — dash, CHILL opener, frost wake. The low tide: the surge leaves
  // as a jet, cold drags at the cut where it arrives, the foam returns.
  riptide: { cues: [
    { id: 'water.jet', scale: 0.8 },
    { id: 'frost.breath', atFar: true, at: 0.25, scale: 0.6 },
    { id: 'water.splash', atFar: true, at: 0.3, scale: 0.9 },
  ] },
  // riptide's ground — THE FROST WAKE: the road stays rimed; cold fog and
  // sea-mist keep breathing off it on the beat.
  'riptide:aftermath': { cues: [
    { id: 'onehand.rime_sheet', scale: 0.8 },
    { id: 'frost.fog', every: 0.8, scale: 0.35 },
    { id: 'water.mist', every: 1.2, scale: 0.3 },
  ] },
  // cinder_arc — arc, follows chill/stagger ×1.5, burns. The blown coals:
  // the edge bites, the crescent is a fan of flame, the coals lie; through
  // the cold or a reeling body the ember seam crosses and BURSTS.
  cinder_arc: {
    cues: [
      { id: 'blade.glint', scale: 0.5 },
      { id: 'fire.fan', scale: 1.0 },
      { id: 'fire.floor', at: 0.35, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 0.9 },
      { id: 'fire.burst', at: 0.05, scale: 0.8 },
    ],
  },
  // winters_edge — arc, CHILL opener. The slow cut: the seam is scored and
  // only THEN the cold arrives, lying on the line as fog.
  winters_edge: { cues: [
    { id: 'blade.glint', scale: 0.6 },
    { id: 'frost.breath', at: 0.15, scale: 0.9 },
    { id: 'frost.fog', at: 0.8, scale: 0.5 },
  ] },
  // reapers_arc — arc per beat, held, vs bleed, finale ×2. The tithe sheaf:
  // each sweep throws chaff and bleeds; THE TITHE on the last swing throws
  // the stone through the row and the row sprays and pools.
  reapers_arc: {
    cues: [
      { id: 'dust.billow', scale: 0.7 },
      { id: 'blood.hit', at: 0.05, scale: 0.7 },
      { id: 'dust.kick', at: 0.6, scale: 0.4 },
    ],
    onFinale: [
      { id: 'onehand.thrown_stone', scale: 1.0 },
      { id: 'blood.spray', at: 0.05, scale: 1.1 },
      { id: 'blood.pool', at: 0.5, scale: 0.7 },
    ],
  },
  // red_harvest — one blast per pulse, REND. The wheel of cuts: every edge
  // flashes as one, the cuts weep, the wheel of stains stays printed.
  red_harvest: { cues: [
    { id: 'blade.mirror', scale: 1.1 },
    { id: 'blood.spray', at: 0.12, scale: 1.0 },
    { id: 'blood.pool', at: 0.6, scale: 0.7 },
  ] },
  // storm_brand — bolt per hop, BRAND opener. The blade of lightning: the
  // arc re-forms to the struck, the point sticks in with a discharge and a
  // steel bite, and the brand scorches the mark.
  storm_brand: { cues: [
    { id: 'storm.arc', scale: 1.0 },
    { id: 'blade.glint', atFar: true, scale: 0.5 },
    { id: 'storm.nova', atFar: true, at: 0.08, scale: 0.6 },
    { id: 'fire.floor', atFar: true, at: 0.15, scale: 0.35 },
  ] },
  // kings_decree — nova, follows rally (throws ×1.5). The proclamation: the
  // scroll unrolls, the words are the shockwave, the court is thrown;
  // after a rally the throw goes half again as far and the ring reels.
  kings_decree: {
    cues: [
      { id: 'arcane.sigil', scale: 0.7 },
      { id: 'arcane.bloom', at: 0.3, scale: 1.3 },
      { id: 'dust.slam', at: 0.35, scale: 1.1 },
    ],
    onFollow: [
      { id: 'dust.slam', at: 0.05, scale: 1.3, radiusK: 1.4 },
      { id: 'onehand.stagger_ring', at: 0.1, scale: 1.0 },
    ],
  },
  // sunburst — nova, follows chill/brand ×1.4, burns. The sun wheel: gold
  // races out, dawn happens here as fire, scorch keeps the wheel; on a
  // marked ring dawn BURSTS wider and the scorch runs deeper.
  sunburst: {
    cues: [
      { id: 'arcane.bloom', scale: 1.0 },
      { id: 'fire.burst', at: 0.05, scale: 1.3 },
      { id: 'fire.floor', at: 0.5, scale: 0.6 },
    ],
    onFollow: [
      { id: 'fire.burst', at: 0.1, scale: 1.2, radiusK: 1.2 },
      { id: 'fire.floor', at: 0.6, scale: 0.7 },
    ],
  },
  // starfall_strike — blast after the fuse, SUNDER opener, burning crater.
  // The kept appointment: the crater slams, the fragment shatters into
  // glass, the ground under every guard opens, the burn stays.
  starfall_strike: { cues: [
    { id: 'dust.slam', scale: 1.2 },
    { id: 'arcane.shatter', at: 0.02, scale: 1.3 },
    { id: 'onehand.broken_ground', at: 0.05, scale: 0.9 },
    { id: 'fire.floor', at: 0.4, scale: 0.6 },
  ] },
  // starfall's ground — THE BURNING CRATER: the floor keeps burning and
  // smoking on the beat for its life.
  'starfall_strike:aftermath': { cues: [
    { id: 'fire.floor', scale: 1.0 },
    { id: 'fire.floor', every: 1.0, scale: 0.6 },
    { id: 'smoke.wisp', every: 1.5, scale: 0.4 },
  ] },
  // vow_unbroken — buff, RIPOSTE answer, follows wall (refund). The counted
  // oath: a halo stands for the term and three of the tally's clicks ring;
  // sworn behind a wall the ward seals it and the bell rings louder.
  vow_unbroken: {
    cues: [
      { id: 'arcane.orbit', scale: 0.7 },
      { id: 'blade.mirror', scale: 0.45 },
      { id: 'blade.mirror', at: 2.0, scale: 0.45 },
      { id: 'blade.mirror', at: 4.0, scale: 0.45 },
    ],
    onFollow: [
      { id: 'arcane.sigil', scale: 0.6 },
      { id: 'blade.mirror', at: 0.2, scale: 0.9 },
    ],
  },
  // kept_ground — nova per beat, held, finale ×1.5, leaves the kept ground.
  // The doorwarden's stand: the point is planted and the ring of edges
  // bites each beat; THE HELD DOOR throws the stone and stamps the ground.
  kept_ground: {
    cues: [
      { id: 'blade.mirror', scale: 0.5 },
      { id: 'core.steel_ring', scale: 0.7 },
      { id: 'dust.kick', scale: 0.4 },
    ],
    onFinale: [
      { id: 'onehand.thrown_stone', scale: 0.9 },
      { id: 'arcane.sigil', at: 0.1, scale: 0.8 },
    ],
  },
  // kept_ground's ground — THE KEPT GROUND: the ward stands with a ring of
  // steel round it; stand on it armored, the halo re-forming on the beat.
  'kept_ground:aftermath': { cues: [
    { id: 'arcane.sigil', scale: 1.0 },
    { id: 'core.steel_ring', at: 0.1, scale: 0.5 },
    { id: 'arcane.orbit', every: 1.0, scale: 0.5 },
    { id: 'arcane.sigil', every: 1.6, scale: 0.5 },
  ] },
  // drag_under — arc, CHILL opener, vs burn. The kelp hands: the sweep is a
  // wave, the hands drag down, the chill lies after as fog.
  drag_under: { cues: [
    { id: 'water.jet', scale: 0.9 },
    { id: 'shadow.grasp', at: 0.2, scale: 0.7 },
    { id: 'frost.fog', at: 0.6, scale: 0.5 },
  ] },
  // spoken_light — nova, follows rally ×1.5 (wider). The echo before the
  // word: the circle goes white once, the light rings out, the word lands
  // late; answered to a rally it goes white AGAIN, a step wider.
  spoken_light: {
    cues: [
      { id: 'blade.mirror', scale: 1.4 },
      { id: 'arcane.bloom', at: 0.05, scale: 0.9 },
      { id: 'blade.mirror', at: 0.5, scale: 0.8, radiusK: 1.2 },
      { id: 'dust.kick', at: 0.5, scale: 0.5 },
    ],
    onFollow: [
      { id: 'blade.mirror', at: 0.1, scale: 1.2, radiusK: 1.3 },
      { id: 'arcane.bloom', at: 0.15, scale: 1.1, radiusK: 1.3 },
    ],
  },
  // slagfall — blast after the fuse, BURN opener, keeps burning. The cooling
  // cake: the mouthful lands, keeps burning as a plume, smokes as it cools.
  slagfall: { cues: [
    { id: 'dust.slam', scale: 0.7 },
    { id: 'fire.burst', scale: 1.2 },
    { id: 'fire.plume', at: 0.3, scale: 0.8 },
    { id: 'fire.floor', at: 0.5, scale: 0.7 },
    { id: 'smoke.wisp', at: 1.0, scale: 0.6 },
  ] },
  // slagfall's ground — THE STANDING MELT: the forge on the ground keeps
  // burning, a low plume, smoke on the beat.
  'slagfall:aftermath': { cues: [
    { id: 'fire.floor', scale: 1.0 },
    { id: 'fire.plume', at: 0.1, scale: 0.5 },
    { id: 'fire.floor', every: 1.0, scale: 0.6 },
    { id: 'smoke.wisp', every: 1.4, scale: 0.4 },
  ] },
  // sky_splits — bolt per hop, follows chill ×1.3. The seam and the drop:
  // per hop the bolt drops vertically onto the mark; after a chill every
  // throat it reaches SHATTERS.
  sky_splits: {
    cues: [
      { id: 'storm.strike', atFar: true, scale: 0.9 },
      { id: 'storm.arc', scale: 0.5 },
    ],
    onFollow: [
      { id: 'storm.nova', atFar: true, at: 0.08, scale: 0.9 },
      { id: 'frost.shards', atFar: true, at: 0.1, scale: 0.5 },
    ],
  },
  // green_verse — dash, VENOM opener, follows loose ×1.4. The sown line: the
  // dash furrows the line, the bite is an aimed gob, the venom stains;
  // sung after a loosed shaft the bite crosses and the venom BURSTS.
  green_verse: {
    cues: [
      { id: 'dust.gouge', scale: 0.7 },
      { id: 'venom.spit', atFar: true, at: 0.25, scale: 0.8 },
      { id: 'venom.pool', atFar: true, at: 0.5, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.28, scale: 0.8 },
      { id: 'venom.burst', atFar: true, at: 0.3, scale: 0.8 },
    ],
  },
  // sun_court — nova, follows taunt/stagger ×1.3 (wider), burns. The raised
  // dais: the ward wakes underfoot, light races out, everyone else is
  // thrown down the stairs and burns; on the called-out the sentence is
  // wider and hotter.
  sun_court: {
    cues: [
      { id: 'arcane.sigil', scale: 1.1 },
      { id: 'arcane.bloom', at: 0.1, scale: 0.8 },
      { id: 'dust.slam', at: 0.15, scale: 1.0 },
      { id: 'fire.floor', at: 0.3, scale: 0.7 },
    ],
    onFollow: [
      { id: 'fire.burst', at: 0.15, scale: 1.1, radiusK: 1.3 },
      { id: 'dust.slam', at: 0.2, scale: 0.8, radiusK: 1.3 },
    ],
  },
  // still_air — nova, casted, ROOT opener, rank III leaves the cold. The
  // hung dust: the blade held still rings once, the cold arrives and a fog
  // HANGS; when the stillness ends everything drops at once.
  still_air: { cues: [
    { id: 'blade.mirror', at: 0.02, scale: 0.5 },
    { id: 'frost.nova', scale: 0.6 },
    { id: 'frost.fog', scale: 1.1 },
    { id: 'dust.kick', at: 1.6, scale: 0.5 },
  ] },
  // still_air's ground — THE STILLED AIR: the air stays cold where it
  // stopped; the rime sheet is laid and the fog keeps hanging on the beat.
  'still_air:aftermath': { cues: [
    { id: 'onehand.rime_sheet', scale: 0.9 },
    { id: 'frost.fog', every: 0.9, scale: 0.4 },
  ] },
};
