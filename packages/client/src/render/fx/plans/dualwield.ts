/**
 * DUALWIELD — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass and re-voiced by THE MASTERED HAND Phase 4 (THE
 * VOICE): one plan per ability id, cues into the effect
 * library; roster-only effects live in DUALWIELD_EFFECTS and register
 * through the library index.
 *
 * THE TWIN SCHOOL'S GRAMMAR IS TIME: everything answers twice. The
 * school's own brick, `dualwield.twin_steel`, is two cuts of real steel
 * ninety milliseconds apart on mirrored diagonals — the answering beat
 * crosses the first — and every arc in the ladder speaks it at its own
 * weight, then borrows the library for what the steel collected (blood),
 * what the landing threw (dust), and what the breath arts add (frost,
 * fire, storm, gold). `dualwield.steel_ring` is the school's ring-and-
 * echo (the off hand laid over the main); `dualwield.silver_reel` is the
 * winding bobbin the brief named as a story the library cannot tell.
 *
 * Wire notes that shaped the timings: flurries re-broadcast `arc` per
 * beat, so a per-beat plan stays light; leaps carry the SAME id on the
 * launch `dash` (radius 0, x2 = the landing) and the landing `blast`, so
 * landing cues ride `atFar` with `at` ≈ flight time and their second
 * speaking is the second knife; projectiles speak `blast` at the wound
 * (radius 0.55). Dash wires carry radius 0 — library layers keyed on
 * radiusK collapse there, so dash cues name effects with fixed reach.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

// ---------------------------------------------------------------------------
// THE SCHOOL'S STEEL — palette shared with the STEEL style family in
// abilityFx.ts and the knife the signatures paint (ONE-VOICE).
// ---------------------------------------------------------------------------
const WHITE = '#ffffff';
const EDGE = '#eef2f8';
const LIT = '#e8eef8';
const STEEL = '#c6ccd6';
const DULL = '#b8bec8';
const DARK = '#5a6068';
const INK = '#3c3f47';
const STEEL_GLOW = '200, 208, 220';
/** The yard the knives cut over — dust's own palette. */
const SAND = '#d8b06a';
const PALE = '#b89468';
const LOAM = '#a8825a';
const SHADE = '#8a6f4d';
/** The school's cold road — frost's own palette. */
const F_CORE = '#eaf6ff';
const F_PALE = '#b8dcf2';
const F_ICE = '#7db3d8';
const F_DEEP = '#4d7fa6';
const F_MIST = '#cfe0ea';
const FROST_GLOW = '150, 208, 240';

const RAMP_SPARK = rampOf({ stops: [WHITE, LIT, DULL, DARK], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_WAKE = rampOf({ stops: [EDGE, STEEL, DULL, DARK], at: [0, 0.3, 0.7, 0.95], steps: 4 });
const RAMP_SCUFF = rampOf({ stops: [SAND, PALE, LOAM, SHADE], at: [0, 0.3, 0.7, 1], steps: 4 });
const RAMP_RIME = rampOf({ stops: [F_CORE, F_PALE, F_ICE, F_DEEP], at: [0, 0.3, 0.65, 0.9], steps: 6 });
const RAMP_THREAD = rampOf({ stops: [WHITE, F_CORE, F_PALE, F_ICE], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_FOG = rampOf({ stops: [F_MIST, F_PALE, F_ICE], at: [0, 0.5, 0.9], steps: 4 });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const PULSE = curveOf('pulse');
const SWELL = curveOf('swell');
const MIST_A = curveOf('mist');
/** A settled grain: holds, lets go only at the end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
/** The cut hanging in the air: born full, thinning as it stalls. */
const WAKE_SIZE = curveOf([0, 0.6, 0.15, 1, 0.6, 0.9, 1, 0.3]);
const WAKE_A = curveOf([0, 1, 0.5, 0.8, 1, 0]);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** The strike moment: a white steel star that flashes once and means it. */
const STRIKE_STAR: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 0.16, lifeVar: 0.1, size: 0.3, sizeVar: 0.1, gravity: 0,
  z: 0.5, layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, EDGE, LIT], at: [0, 0.5, 0.85] }), core: WHITE, coreK: 0.5,
};

/** Steel sparks scratched off the edge: fast, low, dead on the dirt. */
const STEEL_SPARK: BurstOpts = {
  shape: 'streak', speed: 3.2, speedVar: 0.5, life: 0.42, lifeVar: 0.25, size: 0.05, sizeVar: 0.25,
  gravity: 0, z: 0.45, vz: 1.2, zg: 10, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  trail: 2, trailColor: DULL, ramp: RAMP_SPARK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The knife's wake: a filled smear lens hanging where the cut was. */
const WAKE: BurstOpts = {
  shape: 'streak', align: true, speed: 1.3, speedVar: 0.2, life: 0.4, lifeVar: 0.15,
  size: 0.28, sizeVar: 0.15, gravity: 0, drag: 6, z: 0.5, layer: 'world', shadow: 0,
  ramp: RAMP_WAKE, sizeCurve: WAKE_SIZE, alphaCurve: WAKE_A, core: EDGE, coreK: 0.35,
};

/** The pressed scuff under a stroke: yard grain lying where the foot turned. */
const SCUFF: BurstOpts = {
  shape: 'square', align: true, speed: 0.35, speedVar: 0.5, life: 2.4, lifeVar: 0.3,
  size: 0.05, sizeVar: 0.3, gravity: 0, drag: 4, layer: 'ground', shadow: 0,
  ramp: RAMP_SCUFF, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 3.5,
};

/** Grit the ring throws: thrown, landing, lying, flecking. */
const RING_GRIT: BurstOpts = {
  shape: 'square', speed: 1.4, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, drag: 0.6, vz: 1.2, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_SCUFF, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
};

/** The strike ring: a real ribbon band with a white leading edge, flat on the floor. */
const STRIKE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.55, lifeVar: 0.04, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.1,
  ramp: rampOf({ stops: [WHITE, LIT, STEEL, DULL], at: [0, 0.25, 0.6, 0.9] }),
  sizeCurve: curveOf([0, 0.3, 0.55, 3.2, 1, 3.9]), alphaCurve: curveOf([0, 1, 0.5, 0.75, 1, 0]),
};

/** The echo: the off hand's darker band chasing half a step behind. */
const ECHO_RING: BurstOpts = {
  ...STRIKE_RING, ringWidth: 0.06, life: 0.5,
  ramp: rampOf({ stops: [STEEL, DULL, DARK, INK], at: [0, 0.3, 0.65, 0.9] }),
  alphaCurve: curveOf([0, 0.8, 0.5, 0.6, 1, 0]),
};

/** The yard pressed flat outward under the ring: slivers racing the floor. */
const PRESSED: BurstOpts = {
  shape: 'streak', align: true, speed: 3.2, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground', shadow: 0,
  ramp: rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.45, 0.8] }), alphaCurve: FADE_LATE,
};

/** Knife glints riding the ring's rim. */
const RIM_GLINT: BurstOpts = {
  shape: 'glint', speed: 1.6, speedVar: 0.4, life: 0.45, lifeVar: 0.3, size: 0.065, gravity: 0,
  z: 0.3, vz: 0.5, zg: 2, layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_SPARK, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** A low skirt of yard dust shoved out under the band — masses that overlap. */
const RIM_DUST: BurstOpts = {
  shape: 'blob', speed: 1.0, speedVar: 0.3, life: 1.0, lifeVar: 0.2, size: 0.46, sizeVar: 0.2,
  gravity: 0, drag: 2.4, z: 0.04, vz: 0.25, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, PALE, SAND, SAND], at: [0, 0.3, 0.62, 1], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.3, 0.12, 0.5, 0.66, 0.4, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.25, spin: 0.35,
};

/** The silver thread: a glint head trailing silver, drawn into the spool. */
const THREAD: BurstOpts = {
  shape: 'glint', speed: 1.7, speedVar: 0.15, life: 1.0, lifeVar: 0.12, size: 0.07, sizeVar: 0.2,
  gravity: 0, drag: 0.4, mass: 2.4, z: 0.15, layer: 'world', shadow: 0, flicker: 0.3,
  trail: 4, trailColor: F_PALE, ramp: RAMP_THREAD, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Rime the thread sheds as it takes up the slack: lies along the curve. */
const RIME: BurstOpts = {
  shape: 'shard', speed: 0.5, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.07, sizeVar: 0.3,
  gravity: 0, spin: 8, vz: 0.5, zg: 3.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_RIME, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'frost', markLife: 5,
};

/** The bobbin: a small standing spool of cold light at the feet, breathing. */
const BOBBIN: BurstOpts = {
  shape: 'blob', speed: 0.05, life: 0.95, lifeVar: 0.1, size: 0.3, sizeVar: 0.1, gravity: 0,
  z: 0.1, layer: 'world', shadow: 0.5, sizeCurve: PULSE, alphaCurve: FADE_LATE,
  ramp: rampOf({ stops: [WHITE, F_CORE, F_PALE], at: [0, 0.5, 0.9] }), core: WHITE, coreK: 0.4,
};

/** The take-up: the reel tightening its last turn, a cold flare. */
const TAKE_UP: BurstOpts = {
  shape: 'blob', speed: 0.5, life: 0.22, size: 0.32, sizeVar: 0.15, gravity: 0, z: 0.15,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, F_CORE, F_PALE], at: [0, 0.45, 0.85] }),
};

/** Cold breath at the ankles where the spool stands. */
const FOOT_FOG: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.34, sizeVar: 0.25,
  gravity: 0, drag: 0.8, z: 0.1, zg: 0.15, layer: 'world', shadow: 0, spin: 0.25,
  ramp: RAMP_FOG, sizeCurve: SWELL, alphaCurve: MIST_A, wave: 'noise', waveHz: 0.5, waveAmp: 0.2, mass: 0.8,
};

const FOG_POPS: EmitterPop[] = [
  { colors: [F_MIST, F_PALE], opts: FOOT_FOG, weight: 2, tier: 'body' },
  { colors: [F_PALE, F_ICE], opts: { ...FOOT_FOG, size: 0.24, life: 1.2 }, weight: 1, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// dualwield.twin_steel — THE ONE-TWO
// ---------------------------------------------------------------------------
/**
 * Two cuts of real steel: the first stamps one diagonal in front of the
 * caster — star, wake, sparks — and ninety milliseconds later the
 * answer arrives on the OTHER diagonal so the two wakes cross; the
 * crossing flashes a shear star. The ground keeps a pressed scuff.
 */
function twinSteelDef(id: string, name: string, along: number): EffectDef {
  return {
    id,
    name,
    story: 'the first cut stamps one diagonal: a white star, a smear wake, steel sparks scratched low → the answer lands on the other diagonal a blink later and the wakes cross → the crossing flashes a shear star → pressed yard grain lies under the strokes',
    layers: [
      { kind: 'burst', name: 'first star', recipe: recipe([WHITE, EDGE], STRIKE_STAR), count: 1, tier: 'hero', along },
      { kind: 'burst', name: 'first wake', recipe: recipe([EDGE, STEEL], WAKE), count: 3, tier: 'body', along, arrange: 'cone', aimed: true, dirOff: 0.9, spread: 0.15 },
      { kind: 'burst', name: 'first sparks', recipe: recipe([LIT, WHITE], STEEL_SPARK), count: 8, tier: 'fine', along, arrange: 'cone', dirOff: 0.5, spread: 0.55 },
      { kind: 'burst', name: 'second star', recipe: recipe([WHITE, EDGE], { ...STRIKE_STAR, size: 0.28 }), count: 1, tier: 'hero', along, at: 0.09 },
      { kind: 'burst', name: 'second wake', recipe: recipe([EDGE, STEEL], WAKE), count: 3, tier: 'body', along, at: 0.09, arrange: 'cone', aimed: true, dirOff: -0.9, spread: 0.15 },
      { kind: 'burst', name: 'second sparks', recipe: recipe([LIT, WHITE], STEEL_SPARK), count: 8, tier: 'fine', along, at: 0.09, arrange: 'cone', dirOff: -0.5, spread: 0.55 },
      { kind: 'burst', name: 'shear star', recipe: recipe([WHITE, WHITE], { ...STRIKE_STAR, size: 0.44, life: 0.3, z: 0.55 }), count: 1, tier: 'hero', along, at: 0.11 },
      { kind: 'burst', name: 'scuff', recipe: recipe([PALE, LOAM], SCUFF), count: 5, tier: 'hero', along: along * 0.85, at: 0.05, arrange: 'disc', radius: 0.22 },
      { kind: 'glow', name: 'steel light', r: 0.9, rgb: STEEL_GLOW, a: 0.16, dur: 0.24, attack: 0.01, release: 0.16, along, dz: 0.4 },
    ],
  };
}

/** The arc form: the cuts land 0.7 tiles down the aim, in front of the caster. */
export const twinSteel = twinSteelDef('dualwield.twin_steel', 'Dualwield — twin steel', 0.7);
/** The wound form: a blast wire carries no aim, so the cuts land ON the point (thrown knives, landings). */
export const twinBite = twinSteelDef('dualwield.twin_bite', 'Dualwield — twin bite', 0);

// ---------------------------------------------------------------------------
// dualwield.steel_ring — THE RING AND ITS ECHO
// ---------------------------------------------------------------------------
/**
 * The school's nova: a strike ring with a white leading edge races out
 * flat, its darker echo — the off hand's answer — half a step behind;
 * the yard is pressed flat outward under it, knife glints ride the
 * rim, a low dust skirt is shoved out, and grit lands and flecks.
 */
export const steelRing: EffectDef = {
  id: 'dualwield.steel_ring',
  name: 'Dualwield — steel ring',
  story: 'a strike ring with a white leading edge races out flat → its darker echo chases half a step behind, the off hand laid over the main → the yard lies pressed outward, glints ride the rim, a low dust skirt is shoved out → grit lands and flecks the scoured ring',
  layers: [
    { kind: 'burst', name: 'strike ring', recipe: recipe([WHITE, LIT], STRIKE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'echo ring', recipe: recipe([STEEL, DULL], ECHO_RING), count: 1, tier: 'hero', at: 0.12 },
    { kind: 'burst', name: 'pressed yard', recipe: recipe([SAND, PALE], PRESSED), count: 14, tier: 'fine', arrange: 'rim', radius: 0.25, outward: 3.2 },
    { kind: 'burst', name: 'rim glints', recipe: recipe([LIT, WHITE], RIM_GLINT), count: 8, tier: 'fine', arrange: 'rim', radius: 0.45, outward: 1.8, at: 0.04 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([PALE, LOAM], RIM_DUST), count: 8, tier: 'body', arrange: 'rim', radius: 0.3, outward: 1.1, at: 0.06 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, PALE], RING_GRIT), count: 6, tier: 'hero', arrange: 'rim', radius: 0.4, outward: 1.5 },
    { kind: 'glow', name: 'ring light', r: 1.5, rgb: STEEL_GLOW, a: 0.2, dur: 0.36, attack: 0.01, release: 0.26 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.silver_reel — THE WINDING BOBBIN
// ---------------------------------------------------------------------------
/**
 * One cold circle, reeled IN: silver thread heads are born on the
 * ring's rim heading along the tangent and a pull at the heart winds
 * them inward on a spiral onto a small standing bobbin at the feet;
 * rime sheds off the thread and lies along the curve; the last turn
 * takes up with a cold flare and a fog breathes at the ankles.
 */
export const silverReel: EffectDef = {
  id: 'dualwield.silver_reel',
  name: 'Dualwield — silver reel',
  story: 'silver thread heads wake on the rim heading along the tangent → the pull at the heart winds them inward on a spiral onto a small standing bobbin → rime sheds off the thread and lies along the curve → the last turn takes up in a cold flare and fog breathes at the feet',
  layers: [
    { kind: 'field', name: 'the wind-in', field: { kind: 'attract', radius: 2.0, strength: 6.5, dur: 1.15, attack: 0.05, release: 0.2 }, radiusK: 1.05 },
    { kind: 'burst', name: 'thread', recipe: recipe([WHITE, F_CORE], THREAD), count: 12, tier: 'body', arrange: 'orbit', radius: 0.95, radiusK: 0.95, dz: 0.15 },
    { kind: 'burst', name: 'thread again', recipe: recipe([F_CORE, F_PALE], { ...THREAD, speed: 1.4, life: 0.8 }), count: 8, tier: 'body', arrange: 'orbit', radius: 0.7, radiusK: 0.7, dz: 0.15, at: 0.28 },
    { kind: 'burst', name: 'rime shed', recipe: recipe([F_CORE, F_PALE], RIME), count: 8, tier: 'hero', arrange: 'rim', radius: 0.85, radiusK: 0.85, outward: -0.5, at: 0.08 },
    { kind: 'burst', name: 'rime inner', recipe: recipe([F_PALE, F_ICE], { ...RIME, size: 0.06 }), count: 6, tier: 'hero', arrange: 'rim', radius: 0.5, radiusK: 0.5, outward: -0.4, at: 0.42 },
    { kind: 'burst', name: 'bobbin', recipe: recipe([F_CORE, WHITE], BOBBIN), count: 1, tier: 'hero', at: 0.3 },
    { kind: 'burst', name: 'take-up', recipe: recipe([WHITE, F_CORE], TAKE_UP), count: 1, tier: 'hero', at: 1.05 },
    { kind: 'burst', name: 'take-up glints', recipe: recipe([F_CORE, F_PALE], { ...RIM_GLINT, ramp: RAMP_THREAD, speed: 1.2, vz: 0.9 }), count: 8, tier: 'fine', at: 1.05, dz: 0.15 },
    { kind: 'emit', name: 'foot fog', arrange: 'disc', radius: 0.35, at: 0.5, rate: 8, dur: 0.9, attack: 0.15, release: 0.4, tier: 'body', pops: FOG_POPS },
    { kind: 'glow', name: 'cold light', r: 1.2, rgb: FROST_GLOW, a: 0.18, dur: 1.2, attack: 0.1, release: 0.5, radiusK: 0.6 },
  ],
};

// ---------------------------------------------------------------------------
// THE VOICE (THE MASTERED HAND, Phase 4) — the school's new words.
// The weave's grammar is WINDOWS: an opener leaves a hand's word in the
// air, a payoff spends it. So the school gains a brand that STAYS (the
// open hand), a flourish that says the thread was kept, a page for the
// quickened hand, a paired close for its executes, the loom's crossing
// under its held notes, and the frost mirror its one aftermath leaves.
// ---------------------------------------------------------------------------
/** The word's gold — Twin Cut's own plate color, the left hand. */
const GOLD = '#e8d8a0';
const GOLD_MID = '#d9c46a';
const GOLD_DEEP = '#a88a3a';
const GOLD_GLOW = '232, 208, 140';
/** The right hand's pale blue steel — Heron Step's plate. */
const R_PALE = '#dce8f4';
const R_MID = '#9ab4c4';
const R_DEEP = '#5c7a90';
const RIGHT_GLOW = '170, 196, 220';

const RAMP_LEFT = rampOf({ stops: [WHITE, GOLD, GOLD_MID, GOLD_DEEP], at: [0, 0.2, 0.7, 0.95], steps: 5 });
const RAMP_RIGHT = rampOf({ stops: [WHITE, R_PALE, R_MID, R_DEEP], at: [0, 0.2, 0.7, 0.95], steps: 5 });
/** The word breathes: born, holds bright, blinks out only at the window's end. */
const WORD_A = curveOf([0, 0, 0.06, 1, 0.85, 0.9, 1, 0]);
const WORD_SIZE = curveOf([0, 0.4, 0.1, 1, 0.5, 0.8, 0.75, 1, 1, 0.5]);

/** The hand's word: one standing knife glint hanging at the hip for the window. */
const WORD: BurstOpts = {
  shape: 'glint', speed: 0, life: 2.9, lifeVar: 0.03, size: 0.32, sizeVar: 0.05, gravity: 0,
  z: 0.65, layer: 'world', shadow: 0, flicker: 0.25, wave: 'sine', waveHz: 1.6, waveAmp: 0.04, waveAxis: 'z',
  sizeCurve: WORD_SIZE, alphaCurve: WORD_A, core: WHITE, coreK: 0.45,
};
/** Fines the word sheds while it waits: rising, dying. */
const WORD_TICK: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.04, sizeVar: 0.3, gravity: 0,
  z: 0.45, vz: 0.5, zg: -0.3, layer: 'world', shadow: 0, flicker: 0.6, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** The count ring: a thin band lying at the feet while the window is open. */
const COUNT_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 2.9, lifeVar: 0.02, size: 0.5, gravity: 0, layer: 'ground', ringWidth: 0.06,
  sizeCurve: curveOf([0, 0.6, 0.08, 1, 0.9, 1, 1, 0.7]), alphaCurve: curveOf([0, 0, 0.06, 0.95, 0.8, 0.75, 1, 0]),
};
/** The count: a thin band let go from the count ring on every beat of the window. */
const COUNT_PULSE: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, size: 0.5, gravity: 0, layer: 'ground', ringWidth: 0.04,
  sizeCurve: curveOf([0, 1, 1, 2.1]), alphaCurve: curveOf([0, 0.9, 0.6, 0.5, 1, 0]),
};

function openHandDef(id: string, name: string, hand: string, ramp: BurstOpts['ramp'], rgb: string, colors: string[]): EffectDef {
  return {
    id,
    name,
    story: `the ${hand} hand's word is left in the air: a knife glint hangs at the hip and breathes for the window → fines tick off it while it waits → a thin count ring lies at the feet → the word blinks out when the window closes`,
    layers: [
      { kind: 'burst', name: 'the word', recipe: recipe(colors, { ...WORD, ramp }), count: 2, tier: 'hero', arrange: 'rim', radius: 0.32, outward: 0 },
      { kind: 'burst', name: 'the word again', recipe: recipe(colors, { ...WORD, ramp, size: 0.16, life: 2.7 }), count: 2, tier: 'body', arrange: 'rim', radius: 0.44, outward: 0, at: 0.1, dz: 0.15 },
      { kind: 'emit', name: 'ticks', arrange: 'rim', radius: 0.36, rate: 10, dur: 2.5, attack: 0.1, release: 0.3, tier: 'fine', pops: [{ colors, opts: { ...WORD_TICK, ramp }, tier: 'fine' }] },
      { kind: 'burst', name: 'count ring', recipe: recipe(colors, { ...COUNT_RING, ramp }), count: 1, tier: 'hero' },
      { kind: 'burst', name: 'the count', recipe: recipe(colors, { ...COUNT_PULSE, ramp }), count: 1, tier: 'body', at: 0.7, every: 0.7, times: 2 },
      { kind: 'glow', name: 'word light', r: 0.8, rgb, a: 0.2, dur: 2.9, attack: 0.1, release: 0.4, dz: 0.4, flicker: 0.2 },
    ],
  };
}

/** The left hand's word: gold, the opener's brand for the bells and the moons. */
export const leftWord = openHandDef('dualwield.left_word', 'Dualwield — the left word', 'left', RAMP_LEFT, GOLD_GLOW, [WHITE, GOLD]);
/** The right hand's word: pale steel-blue, the brand the reel, the step and the stitch read. */
export const rightWord = openHandDef('dualwield.right_word', 'Dualwield — the right word', 'right', RAMP_RIGHT, RIGHT_GLOW, [WHITE, R_PALE]);

// ---------------------------------------------------------------------------
// dualwield.kept_thread — THE THREAD WAS KEPT (the follow flourish)
// ---------------------------------------------------------------------------
/** Thread heads racing out of the strike point, silver on white. */
const THREAD_OUT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.4, speedVar: 0.25, life: 0.36, lifeVar: 0.15, size: 0.11, sizeVar: 0.2, gravity: 0,
  drag: 2.5, z: 0.45, layer: 'world', shadow: 0, flicker: 0.3, trail: 4, trailColor: LIT,
  ramp: RAMP_SPARK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};
/** The snap ring: a fast thin white band, the reel's tension let go. */
const SNAP_RING: BurstOpts = {
  ...STRIKE_RING, life: 0.3, ringWidth: 0.05,
  sizeCurve: curveOf([0, 0.2, 0.6, 2.6, 1, 3.0]), alphaCurve: curveOf([0, 1, 0.6, 0.7, 1, 0]),
};
export const keptThread: EffectDef = {
  id: 'dualwield.kept_thread',
  name: 'Dualwield — the kept thread',
  story: 'the window was answered: a thin white snap ring lets go at the feet → silver thread heads race out of the strike on trails → the shear star flashes white at the crossing → glints wink where the thread ran → the light holds a breath',
  layers: [
    { kind: 'burst', name: 'snap ring', recipe: recipe([WHITE, LIT], SNAP_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'thread heads', recipe: recipe([WHITE, EDGE], THREAD_OUT), count: 10, tier: 'body', arrange: 'rim', radius: 0.12, outward: 3.4 },
    { kind: 'burst', name: 'snap star', recipe: recipe([WHITE, WHITE], { ...STRIKE_STAR, size: 0.5, life: 0.22, z: 0.6 }), count: 1, tier: 'hero', at: 0.05 },
    { kind: 'burst', name: 'thread glints', recipe: recipe([LIT, WHITE], { ...RIM_GLINT, speed: 0.6, life: 0.55 }), count: 8, tier: 'fine', arrange: 'rim', radius: 0.6, outward: 0.6, at: 0.14 },
    { kind: 'glow', name: 'kept light', r: 1.1, rgb: STEEL_GLOW, a: 0.22, dur: 0.4, attack: 0.01, release: 0.3, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.quickened — THE QUICKENED HAND (the school's self page)
// ---------------------------------------------------------------------------
/** A head of gold light running the hoop fast — the hands moving quicker than the eye. */
const QUICK_HEAD: BurstOpts = {
  shape: 'glint', speed: 0, life: 0.5, lifeVar: 0.1, size: 0.1, sizeVar: 0.15, gravity: 0,
  z: 0.55, layer: 'world', shadow: 0, flicker: 0.2, trail: 5, trailColor: GOLD_MID,
  ramp: RAMP_LEFT, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};
/** Flicks: short gold streaks snapping off the hands. */
const QUICK_FLICK: BurstOpts = {
  shape: 'streak', align: true, speed: 2.2, speedVar: 0.4, life: 0.22, lifeVar: 0.3, size: 0.09, sizeVar: 0.3, gravity: 0,
  drag: 4, z: 0.55, layer: 'world', shadow: 0, ramp: RAMP_LEFT, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** The page's ward: a gold band pulsing once under the feet. */
const QUICK_WARD: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.7, size: 0.55, gravity: 0, layer: 'ground', ringWidth: 0.05,
  ramp: rampOf({ stops: [WHITE, GOLD, GOLD_MID, GOLD_DEEP], at: [0, 0.3, 0.7, 0.95] }),
  sizeCurve: curveOf([0, 0.5, 0.3, 1, 1, 1.1]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};
export const quickened: EffectDef = {
  id: 'dualwield.quickened',
  name: 'Dualwield — the quickened hand',
  story: 'the page is laid on the caster: two heads of gold light run the hoop at chest height faster than the eye → flicks snap off the hands → a gold ward pulses once under the feet → the light lifts as the hands settle into the new tempo',
  layers: [
    { kind: 'emit', name: 'quick heads', arrange: 'orbit', radius: 0.42, dz: 0.55, orbitSpeed: 11, rate: 22, dur: 0.8, attack: 0.02, release: 0.2, tier: 'hero', pops: [{ colors: [WHITE, GOLD], opts: QUICK_HEAD, tier: 'hero' }] },
    { kind: 'burst', name: 'flicks', recipe: recipe([GOLD, GOLD_MID], QUICK_FLICK), count: 10, tier: 'fine', arrange: 'rim', radius: 0.3, outward: 2.2 },
    { kind: 'burst', name: 'flicks again', recipe: recipe([WHITE, GOLD], QUICK_FLICK), count: 8, tier: 'fine', arrange: 'rim', radius: 0.3, outward: 2.0, at: 0.3 },
    { kind: 'burst', name: 'gold ward', recipe: recipe([GOLD, GOLD_MID], QUICK_WARD), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'lift motes', recipe: recipe([GOLD, WHITE], { ...WORD_TICK, ramp: RAMP_LEFT, vz: 0.9, life: 0.7 }), count: 8, tier: 'fine', arrange: 'disc', radius: 0.35, at: 0.5 },
    { kind: 'glow', name: 'quick light', r: 0.9, rgb: GOLD_GLOW, a: 0.16, dur: 0.9, attack: 0.05, release: 0.4, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.shears_close — TWO EDGES, CLOSING (the paired execute)
// ---------------------------------------------------------------------------
/** A closing wake: a smear lens racing INTO the point. */
const CLOSING_WAKE: BurstOpts = { ...WAKE, speed: 3.4, speedVar: 0.1, life: 0.42, size: 0.38, drag: 2 };
export const shearsClose: EffectDef = {
  id: 'dualwield.shears_close',
  name: 'Dualwield — the shears close',
  story: 'two edges from opposite diagonals race INTO the point, their wakes closing like blades of a shear → they meet in one white bite star, twice the one-two\'s size → sparks scratch off the meeting → the yard is pressed flat under the close → steel light holds a beat',
  layers: [
    { kind: 'burst', name: 'closing wakes', recipe: recipe([EDGE, STEEL], CLOSING_WAKE), count: 6, tier: 'body', arrange: 'rim', radius: 0.7, outward: -3.4 },
    { kind: 'burst', name: 'the bite', recipe: recipe([WHITE, WHITE], { ...STRIKE_STAR, size: 0.8, life: 0.4, z: 0.55 }), count: 1, tier: 'hero', at: 0.16 },
    { kind: 'burst', name: 'second bite', recipe: recipe([WHITE, EDGE], { ...STRIKE_STAR, size: 0.44, life: 0.3, z: 0.5 }), count: 1, tier: 'hero', at: 0.24 },
    { kind: 'burst', name: 'shear sparks', recipe: recipe([LIT, WHITE], STEEL_SPARK), count: 16, tier: 'fine', at: 0.16 },
    { kind: 'burst', name: 'pressed yard', recipe: recipe([SAND, PALE], PRESSED), count: 10, tier: 'fine', arrange: 'rim', radius: 0.2, outward: 2.6, at: 0.16 },
    { kind: 'burst', name: 'scuff', recipe: recipe([PALE, LOAM], SCUFF), count: 6, tier: 'hero', arrange: 'disc', radius: 0.26, at: 0.2 },
    { kind: 'glow', name: 'close light', r: 1.0, rgb: STEEL_GLOW, a: 0.24, dur: 0.4, attack: 0.12, release: 0.22, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.loom — WARP AND WEFT (the crossing under a held note)
// ---------------------------------------------------------------------------
/** A thread laid on the floor: an aligned streak shot out and left lying. */
const LOOM_THREAD: BurstOpts = {
  shape: 'streak', align: true, speed: 3.6, speedVar: 0.12, life: 1.0, lifeVar: 0.1, size: 0.23, sizeVar: 0.1, gravity: 0,
  drag: 5, layer: 'ground', shadow: 0, ramp: RAMP_WAKE, sizeCurve: curveOf([0, 0.5, 0.12, 1, 0.85, 0.95, 1, 0.3]), alphaCurve: curveOf([0, 1, 0.7, 0.85, 1, 0]),
};
export const loom: EffectDef = {
  id: 'dualwield.loom',
  name: 'Dualwield — the loom',
  story: 'the crossing: the warp is thrown out on one diagonal and the weft on the other, four threads lying in an X on the floor under the caster → the crossing point flashes a white star where they meet → glints ride the threads out → the loom\'s light stands under the note',
  layers: [
    { kind: 'burst', name: 'warp', recipe: recipe([EDGE, STEEL], LOOM_THREAD), count: 3, tier: 'body', arrange: 'cone', aimed: true, dirOff: 0.75, spread: 0.03 },
    { kind: 'burst', name: 'warp back', recipe: recipe([EDGE, STEEL], LOOM_THREAD), count: 3, tier: 'body', arrange: 'cone', aimed: true, dirOff: 0.75 + Math.PI, spread: 0.03 },
    { kind: 'burst', name: 'weft', recipe: recipe([LIT, DULL], LOOM_THREAD), count: 3, tier: 'body', arrange: 'cone', aimed: true, dirOff: -0.75, spread: 0.03, at: 0.05 },
    { kind: 'burst', name: 'weft back', recipe: recipe([LIT, DULL], LOOM_THREAD), count: 3, tier: 'body', arrange: 'cone', aimed: true, dirOff: -0.75 + Math.PI, spread: 0.03, at: 0.05 },
    { kind: 'burst', name: 'crossing star', recipe: recipe([WHITE, WHITE], { ...STRIKE_STAR, size: 0.36, life: 0.2, z: 0.05 }), count: 1, tier: 'hero', at: 0.06 },
    { kind: 'burst', name: 'thread glints', recipe: recipe([LIT, WHITE], { ...RIM_GLINT, speed: 2.4, life: 0.4, z: 0.08, vz: 0 }), count: 8, tier: 'fine', arrange: 'rim', radius: 0.15, outward: 2.4 },
    { kind: 'glow', name: 'loom light', r: 1.0, rgb: STEEL_GLOW, a: 0.14, dur: 0.6, attack: 0.02, release: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.mirror_sheet — THE REFLECTION STAYS (Mirrorfall's aftermath)
// ---------------------------------------------------------------------------
/** A pane of the mirror lying on the floor: a flat pale square that rimes. */
const PANE: BurstOpts = {
  shape: 'square', speed: 0.1, speedVar: 0.5, life: 1.4, lifeVar: 0.2, size: 0.24, sizeVar: 0.3, gravity: 0,
  drag: 3, layer: 'ground', shadow: 0, spin: 0.25, ramp: RAMP_RIME, sizeCurve: HOLD, alphaCurve: curveOf([0, 0.9, 0.6, 0.75, 1, 0]),
  mark: 'frost', markLife: 4.5,
};
/** The mirror's face: wide pale lobes lying flat, overlapping into one sheet. */
const FACE: BurstOpts = {
  shape: 'blob', speed: 0.05, life: 1.3, lifeVar: 0.15, size: 0.6, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [F_CORE, F_MIST, F_PALE, F_ICE], at: [0, 0.3, 0.7, 0.95], steps: 4 }),
  sizeCurve: curveOf([0, 0.7, 0.2, 1, 1, 0.9]), alphaCurve: curveOf([0, 0.55, 0.5, 0.45, 1, 0]),
};
/** Reflection glints winking on the sheet. */
const REFLECT: BurstOpts = {
  shape: 'glint', speed: 0, life: 0.6, lifeVar: 0.4, size: 0.08, sizeVar: 0.3, gravity: 0, z: 0.03,
  layer: 'world', shadow: 0, flicker: 0.7, ramp: RAMP_THREAD, sizeCurve: PULSE, alphaCurve: FADE_OUT,
};
/** A spear of the mirror standing up out of the sheet. */
const SHARD_UP: BurstOpts = {
  shape: 'shard', speed: 0.1, life: 1.1, lifeVar: 0.2, size: 0.14, sizeVar: 0.25, gravity: 0,
  vz: 1.4, zg: 2.2, land: 'settle', layer: 'world', shadow: 0.4, spin: 0, ramp: RAMP_RIME, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'frost', markLife: 4,
};
/** The sheet's edge ring: a pale band drawn on the rim once per speaking. */
const SHEET_RIM: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.8, size: 1, gravity: 0, layer: 'ground', ringWidth: 0.04,
  ramp: rampOf({ stops: [F_CORE, F_PALE, F_ICE, F_DEEP], at: [0, 0.3, 0.7, 0.95] }),
  sizeCurve: curveOf([0, 0.9, 0.2, 1, 1, 1]), alphaCurve: curveOf([0, 0.9, 0.6, 0.6, 1, 0]),
};
export const mirrorSheet: EffectDef = {
  id: 'dualwield.mirror_sheet',
  name: 'Dualwield — the mirror sheet',
  story: 'the mirror stays: panes of pale glass lie flat over the disc and rime the floor under them → reflection glints wink across the sheet → a few spears of the mirror stand up out of it and settle → cold breath sits at the rim → the edge is drawn once, and the cold light stands',
  layers: [
    { kind: 'burst', name: 'mirror face', recipe: recipe([F_CORE, F_MIST], FACE), count: 7, tier: 'body', arrange: 'disc', radius: 1, radiusK: 0.6 },
    { kind: 'burst', name: 'panes', recipe: recipe([F_CORE, F_PALE], PANE), count: 20, tier: 'body', arrange: 'disc', radius: 1, radiusK: 0.85, at: 0.03 },
    { kind: 'burst', name: 'sheet rim', recipe: recipe([F_CORE, F_PALE], SHEET_RIM), count: 1, tier: 'hero', radiusK: 1 },
    { kind: 'burst', name: 'reflections', recipe: recipe([WHITE, F_CORE], REFLECT), count: 12, tier: 'fine', arrange: 'disc', radius: 1, radiusK: 0.85, at: 0.1 },
    { kind: 'burst', name: 'reflections again', recipe: recipe([F_CORE, F_PALE], REFLECT), count: 10, tier: 'fine', arrange: 'disc', radius: 1, radiusK: 0.85, at: 0.4 },
    { kind: 'burst', name: 'mirror spears', recipe: recipe([F_CORE, F_ICE], SHARD_UP), count: 4, tier: 'hero', arrange: 'rim', radius: 1, radiusK: 0.55, outward: 0.1, at: 0.05 },
    { kind: 'emit', name: 'rim breath', arrange: 'rim', radius: 1, radiusK: 0.95, rate: 6, dur: 0.6, attack: 0.1, release: 0.3, tier: 'body', pops: FOG_POPS },
    { kind: 'glow', name: 'cold light', r: 1, radiusK: 1, rgb: FROST_GLOW, a: 0.14, dur: 0.9, attack: 0.1, release: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.heron_road — THE STEP THROUGH (the dash's road)
// ---------------------------------------------------------------------------
/** The road's wake: a smear lens lying along the stride, born full, thinning. */
const ROAD_WAKE: BurstOpts = { ...WAKE, speed: 0.4, speedVar: 0.3, life: 0.42, lifeVar: 0.15, size: 0.3, sizeVar: 0.2, z: 0.45 };
/** Grit the heel throws along the stride: low, landing, flecking the road. */
const ROAD_GRIT: BurstOpts = { ...RING_GRIT, speed: 0.9, life: 1.8, vz: 0.8, zg: 6, size: 0.045 };
export const heronRoad: EffectDef = {
  id: 'dualwield.heron_road',
  name: 'Dualwield — the heron road',
  story: 'the step through: one edge going in — a white star at the launch → steel wakes lie along the whole stride near to far, the road the body took → glints ride the road, grit is thrown low off the heel and flecks it → pressed scuff at the launch → steel light runs the length of the step',
  layers: [
    { kind: 'burst', name: 'launch star', recipe: recipe([WHITE, EDGE], { ...STRIKE_STAR, size: 0.34 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'the road', recipe: recipe([EDGE, STEEL], ROAD_WAKE), count: 9, tier: 'body', arrange: 'path', aimed: true },
    { kind: 'burst', name: 'the road again', recipe: recipe([LIT, DULL], { ...ROAD_WAKE, size: 0.22, life: 0.5 }), count: 7, tier: 'body', arrange: 'path', aimed: true, at: 0.08 },
    { kind: 'burst', name: 'road glints', recipe: recipe([LIT, WHITE], { ...RIM_GLINT, speed: 0.5, vz: 0.8, life: 0.5 }), count: 8, tier: 'fine', arrange: 'path' },
    { kind: 'burst', name: 'heel grit', recipe: recipe([SAND, PALE], ROAD_GRIT), count: 7, tier: 'hero', arrange: 'path', aimed: true, dirOff: Math.PI, at: 0.04 },
    { kind: 'burst', name: 'launch scuff', recipe: recipe([PALE, LOAM], SCUFF), count: 5, tier: 'hero', arrange: 'disc', radius: 0.22 },
    { kind: 'glow', name: 'road light', r: 0.8, rgb: STEEL_GLOW, a: 0.16, dur: 0.4, attack: 0.01, release: 0.3, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// dualwield.two_moons — THE TWO MOONS (the thrown pair's silver sky)
// ---------------------------------------------------------------------------
/** A moon: a pale glint head running the hoop, trailing silver. */
const MOON: BurstOpts = {
  shape: 'glint', speed: 0, life: 0.55, lifeVar: 0.1, size: 0.13, sizeVar: 0.1, gravity: 0,
  z: 0.6, layer: 'world', shadow: 0, flicker: 0.15, trail: 6, trailColor: F_PALE,
  ramp: RAMP_THREAD, sizeCurve: HOLD, alphaCurve: FADE_LATE, core: WHITE, coreK: 0.5,
};
/** Moon dust: fines the pair sheds on the hoop, drifting down. */
const MOON_DUST: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.045, sizeVar: 0.3, gravity: 0,
  z: 0.55, vz: -0.2, zg: 0.4, layer: 'world', shadow: 0, flicker: 0.5, ramp: RAMP_THREAD, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};
/** The hoop's shadow: a thin silver band on the floor under the two moons. */
const MOON_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.9, size: 0.5, gravity: 0, layer: 'ground', ringWidth: 0.05,
  ramp: rampOf({ stops: [WHITE, R_PALE, R_MID, R_DEEP], at: [0, 0.3, 0.7, 0.95] }),
  sizeCurve: curveOf([0, 0.6, 0.25, 1, 1, 1.05]), alphaCurve: curveOf([0, 1, 0.6, 0.7, 1, 0]),
};
export const twoMoons: EffectDef = {
  id: 'dualwield.two_moons',
  name: 'Dualwield — the two moons',
  story: 'the pair comes home on one orbit: two pale moons run the hoop in COUNTER-orbit over the wound, silver trails crossing twice a turn → moon dust drifts down off the hoop → a thin silver band lies on the floor beneath → the pale light stands while the moons run',
  layers: [
    { kind: 'emit', name: 'the near moon', arrange: 'orbit', radius: 0.48, dz: 0.6, orbitSpeed: 7, rate: 14, dur: 0.9, attack: 0.02, release: 0.25, tier: 'hero', pops: [{ colors: [WHITE, F_CORE], opts: MOON, tier: 'hero' }] },
    { kind: 'emit', name: 'the far moon', arrange: 'orbit', radius: 0.48, dz: 0.6, orbitSpeed: -7, rate: 14, dur: 0.9, attack: 0.02, release: 0.25, tier: 'hero', pops: [{ colors: [WHITE, F_PALE], opts: MOON, tier: 'hero' }] },
    { kind: 'burst', name: 'moon dust', recipe: recipe([F_CORE, F_PALE], MOON_DUST), count: 10, tier: 'fine', arrange: 'rim', radius: 0.45, outward: 0.2, at: 0.15 },
    { kind: 'burst', name: 'moon dust again', recipe: recipe([WHITE, F_CORE], MOON_DUST), count: 8, tier: 'fine', arrange: 'rim', radius: 0.45, outward: 0.2, at: 0.5 },
    { kind: 'burst', name: 'the hoop', recipe: recipe([WHITE, R_PALE], MOON_RING), count: 1, tier: 'body' },
    { kind: 'glow', name: 'moonlight', r: 0.9, rgb: RIGHT_GLOW, a: 0.18, dur: 1.0, attack: 0.05, release: 0.4, dz: 0.5 },
  ],
};

export const DUALWIELD_EFFECTS: EffectDef[] = [
  twinSteel, twinBite, steelRing, silverReel,
  leftWord, rightWord, keptThread, quickened, shearsClose, loom, mirrorSheet, heronRoad, twoMoons,
];

// ---------------------------------------------------------------------------
// The plans — one per art, voiced from its rationale (THE VOICE). Three
// acts each; onFollow = the kept thread (every payoff that follows a word);
// onFinale = the loom's last crossing (every held note with a finale);
// mirrorfall:aftermath = the mirror sheet standing. Wire notes: flurries
// and channels re-broadcast per beat (per-beat plans stay light); leaps
// carry the same id on the launch dash and the landing blast.
// ---------------------------------------------------------------------------
const KEPT = 'dualwield.kept_thread';
const QUICK = 'dualwield.quickened';

export const DUALWIELD_PLANS: Record<string, AbilityPlan> = {
  // ---- THE TWIN SCHOOL — the paired ladder
  // Twin Cut (opener, `left`): two arc beats 250 ms apart, each a one-two of steel with the bleed beading after; the gold word is left hanging at the hip for the bells.
  twin_cut: { cues: [{ id: 'dualwield.twin_steel', scale: 0.85 }, { id: 'blood.hit', scale: 0.4, at: 0.14 }, { id: 'dualwield.left_word', scale: 0.7, at: 0.2 }] },
  // Heron Step (answer, follows `right` → refund): the heel kicks, the step's road is a steel wake laid near→far, the exit pinches into the X at 0.36 s and both edges bleed; kept inside a right word the thread snaps at the launch — the step is already coming back.
  heron_step: {
    cues: [
      { id: 'dualwield.heron_road', scale: 1.0 },
      { id: 'dust.kick', scale: 0.6 },
      { id: 'dualwield.twin_bite', scale: 1.0, atFar: true, at: 0.36 },
      { id: 'blood.hit', scale: 0.7, atFar: true, at: 0.42 },
    ],
    onFollow: [{ id: KEPT, scale: 1.0 }],
  },
  // Crossed Throw (opener, `right`, projectile): each knife's blast is a wound — the X of steel snaps there, the bleed follows, and the right word stands in the wound where the knife bit (a blast wire has no caster).
  crossed_throw: { cues: [{ id: 'dualwield.twin_bite', scale: 0.7 }, { id: 'blood.hit', scale: 0.55, at: 0.06 }, { id: 'dualwield.right_word', scale: 0.55, at: 0.16 }] },
  // Mirrored Hand (answer, self page): the mirror lends a hand — the light gathers and snaps into orbit, then the quickened page runs both hands gold for a beat.
  mirrored_hand: { cues: [{ id: 'arcane.bloom', scale: 0.6 }, { id: QUICK, scale: 1.0, at: 0.35 }, { id: QUICK, scale: 0.8, at: 0.95 }] },
  // Turning Reel (payoff, follows `right` ×1.4 + quicken): the ring and its echo run the full turn and the steel crosses where the edges pass; inside a right word the thread snaps and the LINK quickens the hands.
  turning_reel: {
    cues: [{ id: 'dualwield.steel_ring', scale: 1.3 }, { id: 'dualwield.twin_steel', scale: 1.0, at: 0.1 }],
    onFollow: [{ id: KEPT, scale: 1.1, at: 0.12 }, { id: QUICK, scale: 0.9, at: 0.4 }],
  },
  // Red Ribbons (sustain stance): the tithe's gather-and-close at the chest — nothing lands, the ribbons are what every pass will leave; the hems drag one ring in the dust.
  red_ribbons: { cues: [{ id: 'blood.drink', scale: 0.7 }, { id: 'dust.kick', scale: 0.4, at: 0.12 }, { id: 'blood.spray', scale: 0.35, at: 0.5 }] },
  // Swallow's Dive (answer, follows `left` → refund): the launch kicks, a shadow marks the landing, and at 9 tiles (≈0.64 s) the slam lands with both knives driving in — the landing wire's second speaking is the second knife; kept inside a left word the thread snaps at the launch.
  swallows_dive: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dust.kick', scale: 0.5, atFar: true },
      { id: 'dust.slam', scale: 1.1, atFar: true, at: 0.62 },
      { id: 'dualwield.twin_bite', scale: 1.3, atFar: true, at: 0.66 },
    ],
    onFollow: [{ id: KEPT, scale: 0.8 }],
  },
  // The Shears (payoff: consume bleed, execute, follows `rend`): two edges closing INTO the body and the ribbons spent — the wet gout at the bite and the spray after; inside an open wound the thread snaps and the gout doubles.
  the_shears: {
    cues: [{ id: 'dualwield.shears_close', scale: 1.3 }, { id: 'blood.hit', scale: 0.9, at: 0.18 }, { id: 'blood.spray', scale: 0.5, at: 0.3 }],
    onFollow: [{ id: KEPT, scale: 1.2, at: 0.16 }, { id: 'blood.hit', scale: 0.8, at: 0.36 }],
  },
  // Storm of Two (opener, casted spin-up, `left`): three rings 450 ms apart — each the strike ring with the off hand's band laid over, heavier than the reel for the breath it cost; the last ring leaves the left word (the word cue re-speaks per pulse, so it stays light).
  storm_of_two: { cues: [{ id: 'dualwield.steel_ring', scale: 1.15 }, { id: 'dualwield.twin_steel', scale: 0.8, at: 0.08 }, { id: 'dualwield.left_word', scale: 0.5, at: 0.3 }] },
  // Hundred Hands (crown, follows any word, vs bleed): five arc beats 250 ms apart — each one light pair of steel and a bead of blood so the overlap reads as a storm on a bleeding body; kept inside any word the thread snaps and the LINK quickens the hands.
  hundred_hands: {
    cues: [{ id: 'dualwield.twin_steel', scale: 0.7 }, { id: 'blood.hit', scale: 0.35, at: 0.1 }],
    onFollow: [{ id: KEPT, scale: 0.9, at: 0.05 }, { id: QUICK, scale: 0.8, at: 0.3 }],
  },
  // Two Answers (page payoff, drain, follows either hand): two heavy beats 150 ms apart — steel at weight and the tithe drawn home to the heart; inside a word the thread snaps.
  two_answers: {
    cues: [{ id: 'dualwield.twin_steel', scale: 1.25 }, { id: 'blood.drink', scale: 0.55, at: 0.1 }],
    onFollow: [{ id: KEPT, scale: 1.0, at: 0.08 }],
  },

  // ---- THE SECOND BREATH — the dualwield breath arts
  // Two Bells (payoff, follows `left` ×1.5, shock, `right`): both edges rung together — steel at weight, the peal's storm crack at the chord — and the right word left for the reel; inside a left word the thread snaps and the peal rings again.
  two_bells: {
    cues: [{ id: 'dualwield.twin_steel', scale: 1.2 }, { id: 'storm.nova', scale: 0.7, at: 0.14 }, { id: 'dualwield.right_word', scale: 0.7, at: 0.3 }],
    onFollow: [{ id: KEPT, scale: 1.1, at: 0.1 }, { id: 'storm.nova', scale: 0.45, at: 0.34 }],
  },
  // Ribbonwork (sustain note, 4 crossings, finale ×2, `rend`): each beat is a crossing on the loom, a light pair of steel and the ribbon of blood it leaves; the last crossing closes like the shears and the wound gouts.
  ribbonwork: {
    cues: [{ id: 'dualwield.loom', scale: 0.9 }, { id: 'dualwield.twin_steel', scale: 0.7 }, { id: 'blood.spray', scale: 0.5, at: 0.08 }],
    onFinale: [{ id: 'dualwield.shears_close', scale: 1.0, at: 0.04 }, { id: 'blood.hit', scale: 0.9, at: 0.24 }],
  },
  // Twin Moons (payoff, casted throw, returns, follows either hand): each wound gets its sky — steel where the blade bit, then the school's OWN two moons in counter-orbit over it (silver, never arcane's gold); thrown inside a word the thread snaps at the wound.
  twin_moons: {
    cues: [{ id: 'dualwield.twin_bite', scale: 0.8 }, { id: 'dualwield.two_moons', scale: 1.0, at: 0.1 }],
    onFollow: [{ id: KEPT, scale: 0.8, at: 0.06 }],
  },
  // Silver Reel (sustain note, 4 turns, chill, finale ×2): each turn winds the thread inward onto the bobbin and rime piles along the curve; the last turn cracks the cold — the frost nova on the take-up.
  silver_reel: {
    cues: [{ id: 'dualwield.silver_reel', scale: 1.0 }],
    onFinale: [{ id: 'frost.nova', scale: 0.85, at: 0.3 }, { id: 'dualwield.twin_steel', scale: 0.9, at: 0.5 }],
  },
  // Matched Flame (opener, casted, 3 strikes 300 ms apart, burn, `left`): steel first, then the wick's fan of fire down the aim — heat builds by stacking; the left word is left burning gold at the hip.
  matched_flame: { cues: [{ id: 'dualwield.twin_steel', scale: 0.8 }, { id: 'fire.fan', scale: 0.75, at: 0.06 }, { id: 'dualwield.left_word', scale: 0.5, at: 0.3 }] },
  // Stormstitch (payoff note, chain, follows `right`, vs chill): every hop is a seam — the bolt spans thrower to seam, static closes the wound at the far end; begun inside a right word the thread snaps at the thrower's hand.
  stormstitch: {
    cues: [{ id: 'storm.arc', scale: 0.7 }, { id: 'storm.nova', scale: 0.45, atFar: true, at: 0.1 }],
    onFollow: [{ id: KEPT, scale: 0.7 }],
  },
  // Mirrorfall (opener, casted leap, chill, `right`, AFTERMATH): launch kick and the landing's shadow; at 8 tiles (≈0.57 s) the slam lands, the mirror breaks in frost spears with both knives in it, and the right word stands where you landed — the reflection itself is the aftermath field's own plan.
  mirrorfall: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dust.kick', scale: 0.5, atFar: true },
      { id: 'dust.slam', scale: 0.9, atFar: true, at: 0.55 },
      { id: 'frost.shards', scale: 0.8, atFar: true, at: 0.6 },
      { id: 'dualwield.twin_bite', scale: 0.9, atFar: true, at: 0.64 },
    ],
  },
  // Mirrorfall's aftermath (field, 3 s): the mirror sheet is planted whole at the landing, then re-laid every 0.75 s lighter while it slows whoever crosses; the panes rime the floor for seconds after.
  'mirrorfall:aftermath': { cues: [{ id: 'dualwield.mirror_sheet', scale: 1.0 }, { id: 'dualwield.mirror_sheet', scale: 0.55, every: 0.75 }] },
  // The Weave (sustain note, 5 crossings, finale ×2.5, `rend`): every beat throws the warp and weft under the caster with a light pair of steel and the thread of blood; the last crossing is the shears at full weight and the wound opened wide.
  the_weave: {
    cues: [{ id: 'dualwield.loom', scale: 0.85 }, { id: 'dualwield.twin_steel', scale: 0.65 }, { id: 'blood.spray', scale: 0.4, at: 0.08 }],
    onFinale: [{ id: 'dualwield.shears_close', scale: 1.2, at: 0.04 }, { id: 'blood.hit', scale: 1.0, at: 0.24 }, { id: 'dualwield.loom', scale: 1.3, at: 0.02 }],
  },
  // First and Last (payoff, casted execute, follows `rend`, vs bleed): the first cut opens a seam of light, the last slams the door — steel at execute weight and the radiant shatter as it closes; inside an open wound the thread snaps and the wound gouts.
  first_and_last: {
    cues: [{ id: 'arcane.sigil', scale: 0.45 }, { id: 'dualwield.twin_steel', scale: 1.3, at: 0.05 }, { id: 'arcane.shatter', scale: 0.65, at: 0.22 }],
    onFollow: [{ id: KEPT, scale: 1.2, at: 0.08 }, { id: 'blood.hit', scale: 0.9, at: 0.26 }],
  },
  // Hummingbird (sustain note, 4 visits, finale ×2): deliberately the lightest voice — each visit a needle of steel; the last visit lands twice as hard, both needles and the bead.
  hummingbird: {
    cues: [{ id: 'dualwield.twin_bite', scale: 0.5 }],
    onFinale: [{ id: 'dualwield.twin_bite', scale: 0.8, at: 0.05 }, { id: 'blood.hit', scale: 0.6, at: 0.14 }],
  },
};
