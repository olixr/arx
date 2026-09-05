/**
 * DUALWIELD — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
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
  shape: 'streak', speed: 3.2, speedVar: 0.5, life: 0.3, lifeVar: 0.25, size: 0.045, sizeVar: 0.25,
  gravity: 0, z: 0.45, vz: 1.2, zg: 10, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  trail: 2, trailColor: DULL, ramp: RAMP_SPARK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The knife's wake: a filled smear lens hanging where the cut was. */
const WAKE: BurstOpts = {
  shape: 'streak', align: true, speed: 1.3, speedVar: 0.2, life: 0.24, lifeVar: 0.15,
  size: 0.26, sizeVar: 0.15, gravity: 0, drag: 6, z: 0.5, layer: 'world', shadow: 0,
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
  shape: 'ring', speed: 0, life: 0.4, lifeVar: 0.04, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.1,
  ramp: rampOf({ stops: [WHITE, LIT, STEEL, DULL], at: [0, 0.25, 0.6, 0.9] }),
  sizeCurve: curveOf([0, 0.3, 0.55, 3.2, 1, 3.9]), alphaCurve: curveOf([0, 1, 0.5, 0.75, 1, 0]),
};

/** The echo: the off hand's darker band chasing half a step behind. */
const ECHO_RING: BurstOpts = {
  ...STRIKE_RING, ringWidth: 0.06, life: 0.38,
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
  shape: 'blob', speed: 1.0, speedVar: 0.3, life: 1.0, lifeVar: 0.2, size: 0.38, sizeVar: 0.2,
  gravity: 0, drag: 2.4, z: 0.04, vz: 0.25, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, PALE, SAND, SAND], at: [0, 0.3, 0.62, 1], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.4, 0.12, 0.7, 0.66, 0.55, 1, 0]),
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
      { kind: 'burst', name: 'shear star', recipe: recipe([WHITE, WHITE], { ...STRIKE_STAR, size: 0.4, life: 0.2, z: 0.55 }), count: 1, tier: 'hero', along, at: 0.11 },
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
    { kind: 'burst', name: 'dust skirt', recipe: recipe([PALE, LOAM], RIM_DUST), count: 12, tier: 'body', arrange: 'rim', radius: 0.3, outward: 1.1, at: 0.06 },
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

export const DUALWIELD_EFFECTS: EffectDef[] = [twinSteel, twinBite, steelRing, silverReel];

// ---------------------------------------------------------------------------
// The plans — one per ability, reasoned from the mechanic and the story.
// ---------------------------------------------------------------------------
export const DUALWIELD_PLANS: Record<string, AbilityPlan> = {
  // The one-two: two arc beats 250 ms apart; each beat's twin steel already answers itself, so the pair stays a jab.
  twin_cut: { cues: [{ id: 'dualwield.twin_steel', scale: 0.8 }] },
  // The two wakes: a heel scuff at the launch, then at the exit (6.8 tiles at dash speed ≈ 0.38 s) the twin steel pinches into its X and the toll beads red.
  heron_step: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dualwield.twin_bite', scale: 0.9, atFar: true, at: 0.36 },
      { id: 'blood.hit', scale: 0.6, atFar: true, at: 0.4 },
    ],
  },
  // The crossing point: each knife's blast is a wound — the X-flare of steel snaps there and the bleed follows a blink later.
  crossed_throw: { cues: [{ id: 'dualwield.twin_bite', scale: 0.7 }, { id: 'blood.hit', scale: 0.55, at: 0.06 }] },
  // The glass step: a 750 ms ceremony of light gathering to the hip and snapping into a standing orbit — the mirror lending a hand, gold family.
  mirrored_hand: { cues: [{ id: 'arcane.bloom', scale: 0.65 }] },
  // The counter-round: the ring and its echo run the turn, and where the edges pass each other the steel sparks.
  turning_reel: { cues: [{ id: 'dualwield.steel_ring', scale: 1.25 }, { id: 'dualwield.twin_steel', scale: 1.0, at: 0.1 }] },
  // The spool: two ribbons whip round the body and tie off at the sternum — the drink's gather-and-close, nothing landing; the hems drag a ring in the dust.
  red_ribbons: { cues: [{ id: 'blood.drink', scale: 0.6 }, { id: 'dust.kick', scale: 0.4, at: 0.12 }] },
  // Two points down: the launch kicks; a shadow marks the landing; the leap (9 tiles ≈ 0.64 s) lands as a slam with both knives driving in — the landing wire's second speaking is the second knife.
  swallows_dive: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dust.kick', scale: 0.5, atFar: true },
      { id: 'dust.slam', scale: 1.1, atFar: true, at: 0.62 },
      { id: 'dualwield.twin_bite', scale: 1.3, atFar: true, at: 0.66 },
    ],
  },
  // The thread snaps: a heavy paired close (the execute's weight) and the wound it opens; blood is the school's ink for a cut that lands.
  the_shears: { cues: [{ id: 'dualwield.twin_steel', scale: 1.4 }, { id: 'blood.hit', scale: 0.8, at: 0.1 }] },
  // The ring and its echo: each of three pulses (450 ms apart) is the strike ring with the off hand's band laid over it.
  storm_of_two: { cues: [{ id: 'dualwield.steel_ring', scale: 1.0 }] },
  // Count the hands: five arc beats 250 ms apart — each beat one light pair of steel so the overlap reads as a storm, never a wall.
  hundred_hands: { cues: [{ id: 'dualwield.twin_steel', scale: 0.65 }] },
  // The second word: two heavy gold-lit beats 150 ms apart — twin steel at weight, and the drain riding home as gold motes gathered to the heart.
  two_answers: { cues: [{ id: 'dualwield.twin_steel', scale: 1.3 }, { id: 'arcane.bloom', scale: 0.6, at: 0.12 }] },

  // ---- THE SECOND BREATH — the dualwield breath arts
  // The second toll: both edges ring — twin steel at weight, then the storm crackle at the chord and the chime glints falling.
  two_bells: { cues: [{ id: 'dualwield.twin_steel', scale: 1.2 }, { id: 'storm.nova', scale: 0.5, at: 0.14 }] },
  // The dropped knot: three channel beats — each a light pair of steel and the blood where the red ribbon bit, pulsing along the cut.
  ribbonwork: { cues: [{ id: 'dualwield.twin_steel', scale: 0.7 }, { id: 'blood.spray', scale: 0.55, at: 0.08 }] },
  // The facing crescents: each wound gets its sky — steel where the blade bit, then silver light rising and standing in counter-orbit over it.
  twin_moons: { cues: [{ id: 'dualwield.twin_bite', scale: 0.7 }, { id: 'arcane.orbit', scale: 0.55, at: 0.1 }] },
  // The winding bobbin: each of three pulses winds the same thread inward onto the spool; the frost bloom and rime pile along the curve.
  silver_reel: { cues: [{ id: 'dualwield.silver_reel', scale: 1.0 }] },
  // Two wicks, one breath: three strikes 300 ms apart — steel first, then the wick's fan of fire down the aim; heat builds by stacking.
  matched_flame: { cues: [{ id: 'dualwield.twin_steel', scale: 0.8 }, { id: 'fire.fan', scale: 0.75, at: 0.06 }] },
  // The suture staple: every hop is a seam — the bolt spans thrower to seam, and static closes the wound at the far end.
  stormstitch: { cues: [{ id: 'storm.arc', scale: 0.7 }, { id: 'storm.nova', scale: 0.45, atFar: true, at: 0.1 }] },
  // The landing that breaks: launch kick, a shadow at the landing; at 8 tiles (≈ 0.57 s) dust slams at yours and the mirror breaks in frost — the landing wire's second speaking is the ghost's.
  mirrorfall: {
    cues: [
      { id: 'dust.kick', scale: 0.7 },
      { id: 'dust.kick', scale: 0.5, atFar: true },
      { id: 'dust.slam', scale: 0.9, atFar: true, at: 0.55 },
      { id: 'frost.shards', scale: 0.75, atFar: true, at: 0.6 },
    ],
  },
  // Warp and weft: four channel beats — a light pair of steel per beat, the lattice of light standing beneath the loom.
  the_weave: { cues: [{ id: 'dualwield.twin_steel', scale: 0.65 }, { id: 'arcane.sigil', scale: 0.45, at: 0.05 }] },
  // The door-seam: the first cut opens a standing seam of light past the aim, the last slams it shut — steel at execute weight and the radiant shatter as the door closes.
  first_and_last: { cues: [{ id: 'dualwield.twin_steel', scale: 1.3 }, { id: 'arcane.shatter', scale: 0.6, at: 0.16 }] },
  // Three ghosts deep: deliberately the lightest voice — each wound a needle of steel and nothing more; restraint is the craft.
  hummingbird: { cues: [{ id: 'dualwield.twin_bite', scale: 0.5 }] },
};
