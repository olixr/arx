/**
 * COMBAT — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
 * library; roster-only effects live in COMBAT_EFFECTS and register
 * through the library index.
 *
 * THE VETERAN'S SCHOOL: dust and brass. Kicked grit, drill-yard iron,
 * one horn note — never an element, never a single school's steel. The
 * library's dust carries most of the ladder (kick, slam, billow, gouge);
 * blood is the ledger. Three stories the library could not tell are
 * authored here: `combat.brass_wave` (the hammered-brass pressure ring
 * that cools where it stops — the shout, the long fight, the gathered
 * breath, the crossroads), `combat.iron_scrap` (camp junk that clangs,
 * bounces, and LIES THERE — thrown iron, loose iron), and
 * `combat.chalk_line` (the lesson written student to student in chalk,
 * not lightning).
 *
 * Wire notes: melee arcs carry no far anchor (path layers collapse
 * there), charges carry radius 0 and x2 = the mark (≈ 0.46–0.69 s of
 * travel), beams carry radius = half width (0.3), the watch's fuse
 * speaks `blast` per pulse at the target ring, and the chain speaks
 * `bolt` per hop with x2 = the next student.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';

// ---------------------------------------------------------------------------
// Palettes — the GOLD family's brass, the STEEL family's iron, the yard's
// dust (render/matter/dust.ts), chalk on slate (ONE-VOICE with the sigs).
// ---------------------------------------------------------------------------
const WHITE = '#ffffff';
const BRASS_LIT = '#fff8d8';
const BRASS = '#e8c04c';
const BRASS_DEEP = '#9a7a1c';
const BRASS_DARK = '#5e4a12';
const BRASS_GLOW = '240, 200, 90';
const IRON_LIT = '#c6ccd6';
const IRON = '#8a8f98';
const IRON_DARK = '#4a4e58';
const IRON_SPARK = '#e8eef8';
const IRON_GLOW = '200, 208, 220';
const SAND = '#d8b06a';
const PALE = '#b89468';
const LOAM = '#a8825a';
const SHADE = '#8a6f4d';
const DEEP = '#6e5a44';
const CHALK = '#f4f1e8';
const CHALK_BODY = '#d9d4c4';
const CHALK_DIM = '#b8b3a4';
const SLATE = '#2c2a33';
const CHALK_GLOW = '235, 230, 215';

const RAMP_BRASS_RING = rampOf({ stops: [WHITE, BRASS_LIT, BRASS, BRASS_DEEP], at: [0, 0.2, 0.55, 0.9] });
const RAMP_BRASS_COOL = rampOf({ stops: [BRASS, BRASS_DEEP, BRASS_DARK, SHADE], at: [0, 0.3, 0.65, 0.92], steps: 5 });
const RAMP_BRASS_GLINT = rampOf({ stops: [WHITE, BRASS_LIT, BRASS, BRASS_DEEP], at: [0, 0.3, 0.65, 0.92], steps: 5 });
const RAMP_GRIT = rampOf({ stops: [SAND, PALE, LOAM, SHADE], at: [0, 0.3, 0.7, 1], steps: 4 });
const RAMP_IRON = rampOf({ stops: [IRON_LIT, IRON, IRON_DARK], at: [0, 0.12, 0.5], steps: 4 });
const RAMP_IRON_SPARK = rampOf({ stops: [WHITE, IRON_SPARK, IRON, IRON_DARK], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_DUST = rampOf({ stops: [SHADE, LOAM, PALE, SAND], at: [0, 0.3, 0.62, 1], steps: 5 });
const RAMP_CHALK = rampOf({ stops: [CHALK, CHALK_BODY, CHALK_DIM], at: [0, 0.55, 0.9], steps: 4 });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SWELL = curveOf('swell');
/** A settled grain: holds, lets go only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
/** A piece that lies for ten seconds and only then is forgotten. */
const LIE_A = curveOf([0, 1, 0.94, 1, 1, 0]);
/** Chalk: written bright, dulling, wiped at the end. */
const CHALK_A = curveOf([0, 0.95, 0.15, 1, 0.85, 0.8, 1, 0]);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** The hammered brass wave: a ring with a white leading edge, flat on the floor. */
const BRASS_WAVE: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.46, lifeVar: 0.04, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.12, ramp: RAMP_BRASS_RING,
  sizeCurve: curveOf([0, 0.25, 0.55, 3.2, 1, 3.9]), alphaCurve: curveOf([0, 1, 0.55, 0.8, 1, 0]),
};

/** The cooled ring: where the wave stopped it stands, brass to dark, and crumbles. */
const COOLED_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.6, lifeVar: 0.1, size: 2.3, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.05, ramp: RAMP_BRASS_COOL,
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.1, 0.7, 0.7, 0.55, 1, 0]),
};

/** The yard pressed flat outward: slivers racing the floor behind the ring. */
const PRESSED: BurstOpts = {
  shape: 'streak', align: true, speed: 3.4, speedVar: 0.4, life: 0.5, lifeVar: 0.25,
  size: 0.055, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground', shadow: 0,
  ramp: rampOf({ stops: [SAND, PALE, LOAM], at: [0, 0.45, 0.8] }), alphaCurve: FADE_LATE,
};

/** Brass glints thrown off the wave's rim. */
const BRASS_GLINT: BurstOpts = {
  shape: 'glint', speed: 1.7, speedVar: 0.4, life: 0.5, lifeVar: 0.3, size: 0.065, gravity: 0,
  z: 0.3, vz: 0.6, zg: 2.2, layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_BRASS_GLINT, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** The low dust skirt shoved out under the band — masses that overlap. */
const RIM_DUST: BurstOpts = {
  shape: 'blob', speed: 1.0, speedVar: 0.3, life: 1.0, lifeVar: 0.2, size: 0.38, sizeVar: 0.2,
  gravity: 0, drag: 2.4, z: 0.04, vz: 0.25, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, PALE, SAND, SAND], at: [0, 0.3, 0.62, 1], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.4, 0.12, 0.7, 0.66, 0.55, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.25, spin: 0.35,
};

/** Yard grit thrown by the wave: lands, lies, flecks — the tamped ring. */
const GRIT: BurstOpts = {
  shape: 'square', speed: 1.5, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, drag: 0.6, vz: 1.2, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_GRIT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4.5,
};

/** The horn's own star over the caster. */
const HORN_STAR: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 0.18, size: 0.34, sizeVar: 0.1, gravity: 0, z: 0.9,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, BRASS_LIT, BRASS], at: [0, 0.5, 0.85] }), core: WHITE, coreK: 0.5,
};

/** The clang: a grey spark star where iron met ground. */
const CLANG_STAR: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 0.14, size: 0.32, sizeVar: 0.1, gravity: 0, z: 0.3,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, IRON_SPARK, IRON_LIT], at: [0, 0.5, 0.85] }), core: WHITE, coreK: 0.5,
};

/** One rising sound-hoop — the only ceremony the throw gets. */
const SOUND_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.32, lifeVar: 0.05, size: 0.3, sizeVar: 0.02, gravity: 0,
  z: 0.25, vz: 0.9, zg: 0, layer: 'world', shadow: 0, ringWidth: 0.06,
  ramp: rampOf({ stops: [IRON_SPARK, IRON_LIT, IRON], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.4, 1, 1.6]), alphaCurve: FADE_OUT,
};

/** Grey sparks off the clang: fast, low, dead on the dirt. */
const IRON_SPARKS: BurstOpts = {
  shape: 'streak', speed: 2.3, speedVar: 0.5, life: 0.36, lifeVar: 0.3, size: 0.042, sizeVar: 0.25,
  gravity: 0, z: 0.2, vz: 1.8, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  trail: 6, trailColor: IRON, ramp: RAMP_IRON_SPARK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The pieces: honest camp scrap, spinning, bouncing on true arcs, LYING THERE. */
const PIECE: BurstOpts = {
  shape: 'shard', align: true, speed: 1.0, speedVar: 0.5, life: 9.5, lifeVar: 0.05,
  size: 0.1, sizeVar: 0.3, gravity: 0, drag: 0.3, spin: 7, z: 0.3, vz: 2.2, zg: 8,
  land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: RAMP_IRON, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 6,
};

/** The dent: a low breath of yard dust where the bundle hit. */
const DENT: BurstOpts = {
  shape: 'blob', speed: 0.7, speedVar: 0.45, life: 0.9, lifeVar: 0.3, size: 0.28, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.03, vz: 0.35, zg: 1.0, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]), alphaCurve: curveOf([0, 0.95, 0.5, 0.8, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25, spin: 0.4,
};

/** Skid scratches where the pieces got away, pressed into the floor. */
const SKID: BurstOpts = {
  shape: 'streak', align: true, speed: 1.4, speedVar: 0.4, life: 3.0, lifeVar: 0.2,
  size: 0.06, sizeVar: 0.3, gravity: 0, drag: 5, layer: 'ground', shadow: 0,
  ramp: rampOf({ stops: [LOAM, SHADE, DEEP], at: [0, 0.4, 0.8] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Grit rained off the dent, lying where it lands. */
const GRIT_RAIN: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 2.0, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 0.4, vz: 2.2, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_GRIT, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The slate shadow under the chalk line. */
const SLATE_LINE: BurstOpts = {
  shape: 'square', align: true, speed: 0, life: 5.6, lifeVar: 0.08, size: 0.085, sizeVar: 0.25,
  gravity: 0, layer: 'ground', shadow: 0, sizeCurve: HOLD,
  alphaCurve: curveOf([0, 0.4, 0.1, 0.5, 0.85, 0.45, 1, 0]),
};

/** The chalk itself: honest wobble, skipping where it left the board, wiped at the end. */
const CHALK_LINE: BurstOpts = {
  shape: 'square', speed: 0.06, speedVar: 0.5, life: 6.0, lifeVar: 0.08, size: 0.06, sizeVar: 0.4,
  gravity: 0, drag: 6, layer: 'ground', shadow: 0, jitter: 0.6,
  ramp: RAMP_CHALK, sizeCurve: HOLD, alphaCurve: CHALK_A,
};

/** Chalk dust lifting off the fresh line. */
const CHALK_DUST: BurstOpts = {
  shape: 'mote', speed: 0.25, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, drag: 1.0, z: 0.05, vz: 0.35, zg: 0.5, layer: 'world', shadow: 0, jitter: 1.5,
  ramp: RAMP_CHALK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The knuckle's rap at the far end: flash, then echo. */
const RAP: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 0.16, size: 0.3, sizeVar: 0.1, gravity: 0, z: 0.45,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, CHALK, CHALK_BODY], at: [0, 0.5, 0.85] }), core: WHITE, coreK: 0.5,
};

/** The chalked ring at the student's feet: the diagram's next node. */
const FEET_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 5.0, lifeVar: 0.08, size: 0.55, sizeVar: 0.03, gravity: 0,
  layer: 'ground', ringWidth: 0.09, ramp: RAMP_CHALK,
  sizeCurve: curveOf([0, 0.7, 0.08, 1, 1, 1]), alphaCurve: CHALK_A,
};

/** Chalk dust puffed where the knuckle struck, lying after. */
const RAP_DUST: BurstOpts = {
  ...CHALK_DUST, speed: 0.6, vz: 0.5, zg: 2.0, life: 1.2, land: 'settle',
};

const CHALK_SIFT_POPS: EmitterPop[] = [
  { colors: [CHALK, CHALK_BODY], opts: CHALK_DUST, weight: 1, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// combat.brass_wave — THE HAMMERED BRASS
// ---------------------------------------------------------------------------
/**
 * The voice leaves the body as one brass pressure wave: a ring with a
 * white leading edge races out flat, the yard is pressed flat outward
 * under it, glints fly off its rim, a low dust skirt is shoved out —
 * and at reach the wave COOLS IN PLACE, a standing ring that ages
 * brass → dark → crumbling while the grit it threw lies tamped.
 */
export const brassWave: EffectDef = {
  id: 'combat.brass_wave',
  name: 'Combat — brass wave',
  story: 'a horn star over the caster → one hammered brass ring races out flat, the yard pressed outward under it, glints off the rim, a low dust skirt shoved out → at reach the wave cools in place: a standing ring ages brass to dark and crumbles → the grit it threw lies tamped in the yard',
  layers: [
    { kind: 'burst', name: 'horn star', recipe: recipe([WHITE, BRASS_LIT], HORN_STAR), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'brass wave', recipe: recipe([WHITE, BRASS_LIT], BRASS_WAVE), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'pressed yard', recipe: recipe([SAND, PALE], PRESSED), count: 14, tier: 'fine', arrange: 'rim', radius: 0.25, outward: 3.4 },
    { kind: 'burst', name: 'rim glints', recipe: recipe([BRASS_LIT, WHITE], BRASS_GLINT), count: 9, tier: 'fine', arrange: 'rim', radius: 0.45, outward: 1.9, at: 0.04 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([PALE, LOAM], RIM_DUST), count: 12, tier: 'body', arrange: 'rim', radius: 0.3, outward: 1.1, at: 0.06 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, PALE], GRIT), count: 7, tier: 'hero', arrange: 'rim', radius: 0.4, outward: 1.6 },
    { kind: 'burst', name: 'cooled ring', recipe: recipe([BRASS, BRASS_DEEP], COOLED_RING), count: 1, tier: 'hero', at: 0.4 },
    { kind: 'glow', name: 'brass light', r: 1.6, rgb: BRASS_GLOW, a: 0.24, dur: 0.42, attack: 0.01, release: 0.3 },
    { kind: 'glow', name: 'cooling light', r: 1.2, rgb: BRASS_GLOW, a: 0.1, at: 0.4, dur: 1.2, attack: 0.05, release: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// combat.iron_scrap — THE JUNK THAT STAYS
// ---------------------------------------------------------------------------
/**
 * Camp iron arrives with the blast: a clang star and one rising sound
 * hoop, grey sparks scratched off the dent, and three honest pieces of
 * scrap still spinning — they bounce on true arcs and then just LIE
 * THERE for ten seconds beside their skid scratches and the dent's
 * grit.
 */
export const ironScrap: EffectDef = {
  id: 'combat.iron_scrap',
  name: 'Combat — iron scrap',
  story: 'a clang star and one rising sound-hoop → grey sparks scratched off the dent → three pieces of camp scrap still spinning bounce on true arcs and lie there for ten seconds → a low dust dent, skid scratches where the pieces got away, grit lying where it fell',
  layers: [
    { kind: 'burst', name: 'clang star', recipe: recipe([WHITE, IRON_SPARK], CLANG_STAR), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'sound hoop', recipe: recipe([IRON_SPARK, IRON_LIT], SOUND_HOOP), count: 1, tier: 'hero', at: 0.02 },
    { kind: 'burst', name: 'grey sparks', recipe: recipe([IRON_SPARK, WHITE], IRON_SPARKS), count: 10, tier: 'fine' },
    { kind: 'burst', name: 'pieces', recipe: recipe([IRON_LIT, IRON], PIECE), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'dent', recipe: recipe([LOAM, PALE, SHADE], DENT), count: 5, tier: 'body', arrange: 'disc', radius: 0.12 },
    { kind: 'burst', name: 'skid scratches', recipe: recipe([SHADE, LOAM], SKID), count: 5, tier: 'hero', at: 0.03 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, PALE], GRIT_RAIN), count: 8, tier: 'fine' },
    { kind: 'glow', name: 'clang light', r: 0.8, rgb: IRON_GLOW, a: 0.12, dur: 0.2, attack: 0.01, release: 0.14, dz: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// combat.chalk_line — THE CHALK LINE
// ---------------------------------------------------------------------------
/**
 * The chain is chalk: a hand-drawn white line writes student to
 * student on a slate shadow, chalk dust lifting off the fresh stroke;
 * at the far end the teacher's knuckle raps twice, flash and echo, and
 * the student's feet are chalked in a ring. The line stays six seconds
 * of diagram, then wipes.
 */
export const chalkLine: EffectDef = {
  id: 'combat.chalk_line',
  name: 'Combat — chalk line',
  story: 'a slate shadow lays the path → a hand-drawn chalk line writes student to student, dust lifting off the fresh stroke → the knuckle raps the far end twice, flash and echo, chalk puffing where it struck → the student\'s feet are chalked in a ring → six seconds of diagram, then it wipes',
  layers: [
    { kind: 'burst', name: 'slate shadow', recipe: recipe([SLATE, SLATE], SLATE_LINE), count: 14, tier: 'body', arrange: 'path' },
    { kind: 'burst', name: 'chalk line', recipe: recipe([CHALK, CHALK_BODY], CHALK_LINE), count: 18, tier: 'hero', arrange: 'path', at: 0.03 },
    { kind: 'emit', name: 'chalk sifts', arrange: 'path', toFar: true, rate: 14, dur: 0.6, attack: 0.02, release: 0.2, tier: 'fine', pops: CHALK_SIFT_POPS },
    { kind: 'burst', name: 'rap', recipe: recipe([WHITE, CHALK], RAP), count: 1, tier: 'hero', arrange: 'far', at: 0.12 },
    { kind: 'burst', name: 'rap echo', recipe: recipe([WHITE, CHALK], { ...RAP, size: 0.22 }), count: 1, tier: 'hero', arrange: 'far', at: 0.26 },
    { kind: 'burst', name: 'rap dust', recipe: recipe([CHALK, CHALK_BODY], RAP_DUST), count: 6, tier: 'body', arrange: 'far', at: 0.12 },
    { kind: 'burst', name: 'feet ring', recipe: recipe([CHALK, CHALK_BODY], FEET_RING), count: 1, tier: 'hero', arrange: 'far', at: 0.2 },
    { kind: 'glow', name: 'board light', r: 0.7, rgb: CHALK_GLOW, a: 0.1, dur: 0.3, attack: 0.02, release: 0.2 },
  ],
};

export const COMBAT_EFFECTS: EffectDef[] = [brassWave, ironScrap, chalkLine];

// ---------------------------------------------------------------------------
// The plans — one per ability, reasoned from the mechanic and the story.
// ---------------------------------------------------------------------------
export const COMBAT_PLANS: Record<string, AbilityPlan> = {
  // The first drop: the cut is plain; the signature is the wound that drips after — blood.hit's late drip is the ledger's first entry. A heel scuff for the stance.
  first_blood: { cues: [{ id: 'blood.hit', scale: 0.85 }, { id: 'dust.kick', scale: 0.4 }] },
  // The dust arrives with you: a rolling bank chases the charge down the aim, the furrows are plowed along the line, and half a beat after the body stops (6 tiles at charge speed ≈ 0.46 s) the bank breaks over the landing.
  shoulder_check: {
    cues: [
      { id: 'dust.billow', scale: 0.8 },
      { id: 'dust.gouge', scale: 0.6, at: 0.05 },
      { id: 'dust.slam', scale: 0.9, atFar: true, at: 0.5 },
    ],
  },
  // The yard stops: one hammered brass wave at full reach — the grass lies pressed flat outward under it.
  war_shout: { cues: [{ id: 'combat.brass_wave', scale: 1.4 }] },
  // The chest fills: the inhale draws motes to the heart, the held moment flares at the sternum, the release stands as a ring — the bloom's gather-and-flare ceremony, kept small.
  second_breath: { cues: [{ id: 'arcane.bloom', scale: 0.55 }] },
  // Camp iron: each wound is one landed piece of junk that bounces and lies — three throws, three pieces on the field.
  loose_iron: { cues: [{ id: 'combat.iron_scrap', scale: 0.7 }] },
  // The staked ground: three stakes drive in one after another (a kick each), then the line snaps taut and the claimed square is slammed.
  hold_fast: {
    cues: [
      { id: 'dust.kick', scale: 0.45 },
      { id: 'dust.kick', scale: 0.45, at: 0.17 },
      { id: 'dust.kick', scale: 0.45, at: 0.34 },
      { id: 'dust.slam', scale: 0.6, at: 0.52 },
    ],
  },
  // The line bends: one squat earthen wall-wave rolls the breadth of the arc on the wind, and the slam leaves the skid marks that say somebody stood there.
  break_the_line: { cues: [{ id: 'dust.billow', scale: 1.3 }, { id: 'dust.slam', scale: 0.8, at: 0.1 }] },
  // Daylight in the guard: drill-yard dust drifts at the strike, the door holds one readable beat, then snaps shut in a radiant shatter with afterlight on the floor.
  the_opening: { cues: [{ id: 'dust.kick', scale: 0.5 }, { id: 'arcane.shatter', scale: 0.75, at: 0.3 }] },
  // The grindstone: four beats 250 ms apart, each a wet chisel-stroke of blood and an abrasion of dust under it.
  no_quarter: { cues: [{ id: 'blood.hit', scale: 0.55 }, { id: 'dust.kick', scale: 0.4, at: 0.04 }] },
  // The wave returns: three pulses 500 ms apart, each a brass wave that cools where it stops — three rings of different ages stacked.
  the_long_fight: { cues: [{ id: 'combat.brass_wave', scale: 1.1 }] },
  // The crossroads: the brass wave runs the four roads out, and the compass paver's ward pulses under the caster.
  four_roads: { cues: [{ id: 'combat.brass_wave', scale: 1.2 }, { id: 'arcane.sigil', scale: 0.6, at: 0.05 }] },

  // ---- THE SECOND BREATH — the combat breath arts
  // Measured twice, paid once: two cheap ghost measures (a breath of dust each), then the one wavefront rolls to the rim on the wind.
  measured_blow: {
    cues: [
      { id: 'dust.kick', scale: 0.35 },
      { id: 'dust.kick', scale: 0.35, at: 0.12 },
      { id: 'dust.billow', scale: 0.9, at: 0.26 },
    ],
  },
  // The drumhead: each of three beats strikes the skin — the ground flexes and grit hops — and the heels kick dust at the drummer's stance.
  drumbeat: { cues: [{ id: 'dust.slam', scale: 0.8 }, { id: 'dust.kick', scale: 0.5, at: 0.05 }] },
  // The junk that stays: the bundle arrives with the blast and lies there; the slam is the bitten dent under it.
  thrown_iron: { cues: [{ id: 'combat.iron_scrap', scale: 1.3 }, { id: 'dust.slam', scale: 0.6 }] },
  // The winter exhale: each of three beats is a fog wedge rolled down the lane on the breath's wind; the far end of the corridor rimes over (beam radius is half-width 0.3, hence radiusK 3).
  ironbreath: {
    cues: [
      { id: 'frost.breath', scale: 1.0 },
      { id: 'frost.fog', scale: 0.6, radiusK: 3, atFar: true, at: 0.35 },
    ],
  },
  // The fifth milestone: the heel kicks off, the road is gouged the length of the charge, and at the pass-through (9 tiles at charge speed ≈ 0.69 s) blood sprays.
  fifth_road: {
    cues: [
      { id: 'dust.kick', scale: 0.6 },
      { id: 'dust.gouge', scale: 0.8, at: 0.04 },
      { id: 'blood.spray', scale: 0.7, atFar: true, at: 0.66 },
    ],
  },
  // The bolt that never gets up: each beat a dry low crack — arcs racing the ground — a rumble half-ring felt through the boots, and the old storm's rain arriving late with petrichor flecks.
  old_thunder: {
    cues: [
      { id: 'storm.nova', scale: 0.6 },
      { id: 'dust.slam', scale: 0.5, at: 0.05 },
      { id: 'water.rain', scale: 0.45, at: 1.1 },
    ],
  },
  // All of it at once: no ceremony owed — the whole brass wave at weight and the full dust slam in the same breath; the veil's drift-back refills the yard.
  gathered_breath: { cues: [{ id: 'combat.brass_wave', scale: 1.7 }, { id: 'dust.slam', scale: 1.3, at: 0.02 }] },
  // The watch-lantern: each pulse is the pale pool sliding the ground (a cold fog held small on the 2.1 ring) and one caught heel kicking where the light passed.
  long_watch: { cues: [{ id: 'frost.fog', scale: 0.7, radiusK: 0.55 }, { id: 'dust.kick', scale: 0.4, at: 0.25 }] },
  // The copper seams: the strike is modest; the spectacle is the tithe pulled home — the library's drink — and the till settling into a ring at the feet after.
  scarworn: {
    cues: [
      { id: 'blood.hit', scale: 0.6 },
      { id: 'blood.drink', scale: 0.9, at: 0.05 },
      { id: 'dust.kick', scale: 0.4, at: 0.95 },
    ],
  },
  // The chalk line: every hop writes the lesson student to student in chalk, raps the far end twice, and chalks the next node's feet.
  last_lesson: { cues: [{ id: 'combat.chalk_line', scale: 1.0 }] },
};
