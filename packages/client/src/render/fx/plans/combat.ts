/**
 * COMBAT — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
 * library; roster-only effects live in COMBAT_EFFECTS and register
 * through the library index.
 *
 * THE VETERAN'S SCHOOL: dust and brass. Kicked grit, drill-yard iron,
 * one horn note — never an element, never a single school's steel. The
 * library's dust carries most of the ladder (kick, slam, billow, gouge);
 * blood is the ledger. Eight stories the library could not tell are
 * authored here: `combat.brass_wave` (the hammered-brass pressure ring
 * that cools where it stops — the shout, the long fight, the gathered
 * breath, the crossroads), `combat.iron_scrap` (camp junk that clangs,
 * bounces, and LIES THERE — thrown iron, loose iron),
 * `combat.chalk_line` (the lesson written student to student in chalk,
 * not lightning), and THE VOICE's five (THE MASTERED HAND, Phase 4):
 * `combat.rally_brand` (the blood up — the `rally` word on the man),
 * `combat.shove` (the `stagger` word — the line thrown back off its
 * feet down the aim), `combat.horn_call` (the one horn note: the
 * school's flourish on every landed follow and every held note's last
 * beat), `combat.ground_pulse` (the tamped ring — the drum's beat, the
 * watch's strike, the HELD GROUND answering back), and
 * `combat.guard_open` (the seam found: The Opening's face).
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
const IRON_INK = '#2e3138';
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
const RAMP_IRON = rampOf({ stops: [IRON_LIT, IRON, IRON_DARK, IRON_INK], at: [0, 0.12, 0.4, 0.8], steps: 4 });
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
  size: 0.12, sizeVar: 0.3, gravity: 0, drag: 0.3, spin: 7, z: 0.3, vz: 2.2, zg: 8,
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


// ---------------------------------------------------------------------------
// THE VOICE (Phase 4) — the rally's red brass, the shove, the horn, the
// tamped ring, the opened guard. Recipes first, then the five effects.
// ---------------------------------------------------------------------------
const RALLY_LIT = '#f0b07a';
const RALLY = '#c4553d';
const RALLY_DEEP = '#7e3324';
const RALLY_GLOW = '235, 120, 80';

const RAMP_RALLY_FLARE = rampOf({ stops: [WHITE, RALLY_LIT, RALLY], at: [0, 0.4, 0.85] });
const RAMP_RALLY_HOOP = rampOf({ stops: [RALLY_LIT, BRASS, RALLY, RALLY_DEEP], at: [0, 0.3, 0.65, 0.92], steps: 5 });
const RAMP_RALLY_GLINT = rampOf({ stops: [WHITE, BRASS, RALLY, RALLY_DEEP], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_FLEX = rampOf({ stops: [DEEP, SHADE, LOAM, PALE], at: [0, 0.3, 0.65, 0.95], steps: 4 });
const RAMP_TAMPED = rampOf({ stops: [BRASS, BRASS_DEEP, BRASS_DARK, SHADE], at: [0, 0.2, 0.55, 0.9], steps: 5 });

/** The heart flare: the blood comes up, a red-brass star at the chest. */
const HEART_FLARE: BurstOpts = {
  shape: 'glint', speed: 0.15, life: 0.26, size: 0.6, sizeVar: 0.1, gravity: 0, z: 0.72,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: RAMP_RALLY_FLARE, core: WHITE, coreK: 0.5,
};

/** One hoop rising off the shoulders, red brass cooling as it climbs. */
const RALLY_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.44, lifeVar: 0.05, size: 0.55, sizeVar: 0.02, gravity: 0,
  z: 0.35, vz: 1.1, zg: 0, layer: 'world', shadow: 0, ringWidth: 0.09,
  ramp: RAMP_RALLY_HOOP, sizeCurve: curveOf([0, 0.5, 1, 2.0]), alphaCurve: FADE_OUT,
};

/** The stance branded: a red-brass ring flashes wide at the feet and holds the beat. */
const STANCE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.6, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.09, ramp: RAMP_RALLY_HOOP,
  sizeCurve: curveOf([0, 0.4, 0.3, 1.6, 1, 1.75]), alphaCurve: curveOf([0, 1, 0.5, 0.75, 1, 0]),
};

/** Red-brass glints thrown up off the stance; they fall and lie as flecks. */
const RALLY_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.7, speedVar: 0.4, life: 0.9, lifeVar: 0.3, size: 0.09, sizeVar: 0.25, gravity: 0,
  z: 0.6, vz: 1.7, zg: 5.5, land: 'settle', layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_RALLY_GLINT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 3.5,
};

/** The heels scuff: a small breath of grit at the stance. */
const HEEL_SCUFF: BurstOpts = {
  shape: 'blob', speed: 0.55, speedVar: 0.4, life: 0.7, lifeVar: 0.3, size: 0.24, sizeVar: 0.25,
  gravity: 0, drag: 2.8, z: 0.03, vz: 0.25, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: SWELL, alphaCurve: curveOf([0, 0.8, 0.5, 0.7, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.2, spin: 0.3,
};

/** The shock crescent leading the shove: a white ring that races out flat. */
const SHOCK_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.34, lifeVar: 0.04, size: 0.55, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.14, ramp: rampOf({ stops: [WHITE, SAND, PALE], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.3, 1, 2.8]), alphaCurve: curveOf([0, 1, 0.6, 0.7, 1, 0]),
};

/** The yard pressed FORWARD under the shove: aimed slivers racing the floor. */
const PRESSED_FWD: BurstOpts = {
  ...PRESSED, speed: 4.4, speedVar: 0.35, life: 0.55,
};

/** The dust wall rolled forward in the cone — masses that overlap. */
const DUST_WALL: BurstOpts = {
  shape: 'blob', speed: 2.6, speedVar: 0.3, life: 0.95, lifeVar: 0.2, size: 0.5, sizeVar: 0.2,
  gravity: 0, drag: 2.2, z: 0.05, vz: 0.35, zg: 1.0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, PALE, SAND, SAND], at: [0, 0.3, 0.62, 1], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.45, 0.15, 0.75, 0.7, 0.55, 1, 0]),
  wave: 'noise', waveHz: 1.6, waveAmp: 0.25, spin: 0.35,
};

/** Clods flung forward that bounce and lie. */
const CLOD_FWD: BurstOpts = {
  shape: 'shard', align: true, speed: 2.3, speedVar: 0.4, life: 5.0, lifeVar: 0.1,
  size: 0.09, sizeVar: 0.3, gravity: 0, drag: 0.4, spin: 6, z: 0.15, vz: 2.1, zg: 8,
  land: 'bounce', bounce: 0.3, layer: 'world',
  ramp: RAMP_GRIT, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 5,
};

/** Boot skids pressed FORWARD into the floor: the feet going out from under them. */
const BOOT_SKID: BurstOpts = {
  ...SKID, speed: 1.9, speedVar: 0.35, life: 3.4, size: 0.07,
};

/** Grit thrown in the fan of the shove. */
const GRIT_FAN: BurstOpts = {
  ...GRIT, speed: 1.9, speedVar: 0.45, life: 2.2,
};

/** The sound hoops of the horn: brass rings rising and widening on beats. */
const HORN_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.48, lifeVar: 0.04, size: 0.46, sizeVar: 0.02, gravity: 0,
  z: 0.55, vz: 1.0, zg: 0, layer: 'world', shadow: 0, ringWidth: 0.09,
  ramp: rampOf({ stops: [WHITE, BRASS_LIT, BRASS, BRASS_DEEP], at: [0, 0.25, 0.6, 0.92], steps: 5 }),
  sizeCurve: curveOf([0, 0.45, 1, 2.0]), alphaCurve: FADE_OUT,
};

/** Brass shed off each hoop, falling to lie as brass flecks. */
const HORN_SHED: BurstOpts = {
  ...BRASS_GLINT, speed: 0.9, z: 0.8, vz: 0.8, zg: 4.2, life: 0.9, land: 'settle',
  alphaCurve: SETTLE_A, mark: 'fleck', markLife: 3,
};

/** The ground flexes: a dark ring races the disc (the drumhead). */
const FLEX_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.38, lifeVar: 0.04, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ringWidth: 0.14, ramp: RAMP_FLEX,
  sizeCurve: curveOf([0, 0.3, 1, 2.2]), alphaCurve: curveOf([0, 1, 0.6, 0.8, 1, 0]),
};

/** The drum's body: a low thud of yard dust at the centre, masses that overlap. */
const THUD: BurstOpts = {
  ...DENT, size: 0.36, speed: 0.9, life: 0.8,
};

/** Grit hopping straight up off the disc and falling back to lie. */
const HOP_GRIT: BurstOpts = {
  shape: 'square', speed: 0.15, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.062, sizeVar: 0.3,
  gravity: 0, drag: 0.5, vz: 1.5, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_GRIT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 3.5,
};

/** The tamped rim: brass-dark grains that stand on the ring for the beat. */
const TAMPED: BurstOpts = {
  shape: 'square', speed: 0, life: 1.4, lifeVar: 0.08, size: 0.11, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: RAMP_TAMPED, sizeCurve: HOLD,
  alphaCurve: curveOf([0, 1, 0.7, 0.8, 1, 0]),
};

/** The rim's low dust breath, shoved out and settling. */
const RIM_BREATH: BurstOpts = {
  ...RIM_DUST, speed: 0.8, size: 0.4, life: 0.9,
};

/** The seam found: a tall white slit at chest height. */
const SLIT: BurstOpts = {
  shape: 'glint', speed: 0.1, life: 0.36, size: 0.9, sizeVar: 0.08, gravity: 0, z: 0.7,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: [WHITE, BRASS_LIT, BRASS], at: [0, 0.55, 0.9] }), core: WHITE, coreK: 0.6,
};

/** The crack ring off the seam. */
const CRACK_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.04, size: 0.3, sizeVar: 0.02, gravity: 0,
  z: 0.6, vz: 0.2, zg: 0, layer: 'world', shadow: 0, ringWidth: 0.1,
  ramp: rampOf({ stops: [WHITE, BRASS_LIT, BRASS, BRASS_DEEP], at: [0, 0.3, 0.65, 0.92], steps: 4 }),
  sizeCurve: curveOf([0, 0.25, 1, 2.4]), alphaCurve: FADE_OUT,
};

/** Iron sparks streaking out of the seam down the aim. */
const SEAM_SPARKS: BurstOpts = {
  ...IRON_SPARKS, speed: 3.2, z: 0.6, vz: 0.5, life: 0.55, size: 0.05,
};

/** Brass spall off the guard's fittings: glints thrown down the aim that land and lie as flecks. */
const BRASS_SPALL: BurstOpts = {
  ...BRASS_GLINT, speed: 2.4, speedVar: 0.4, z: 0.6, vz: 1.2, zg: 6, life: 1.1, lifeVar: 0.25, size: 0.08,
  land: 'settle', alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
};

/** The seam scar: the opened line pressed into the floor where the guard failed, brass cooling to dark. */
const SEAM_SCAR: BurstOpts = {
  shape: 'streak', align: true, speed: 0.9, speedVar: 0.25, life: 3.6, lifeVar: 0.15,
  size: 0.11, sizeVar: 0.25, gravity: 0, drag: 6, layer: 'ground', shadow: 0,
  ramp: RAMP_BRASS_COOL, sizeCurve: HOLD, alphaCurve: curveOf([0, 1, 0.7, 0.75, 1, 0]),
};

/** Splinters of the guard: iron shards that bounce and lie a while. */
const GUARD_SPLINTER: BurstOpts = {
  ...PIECE, speed: 1.7, life: 4.5, size: 0.11, z: 0.55, vz: 1.6,
  ramp: rampOf({ stops: [IRON_LIT, IRON_DARK, IRON_INK], at: [0, 0.1, 0.5], steps: 4 }),
};

// ---------------------------------------------------------------------------
// combat.rally_brand — THE BLOOD UP
// ---------------------------------------------------------------------------
/**
 * The veteran's word to himself: the heart flares red brass at the
 * chest, one hoop rises off the shoulders, red-brass glints are thrown
 * up off the stance and fall to lie as flecks, the heels scuff a breath
 * of grit, and an echo hoop follows. It is the `rally` word made
 * visible — every art that puts his blood up wears it.
 */
export const rallyBrand: EffectDef = {
  id: 'combat.rally_brand',
  name: 'Combat — rally brand',
  story: 'the heart flares red brass at the chest → one hoop rises off the shoulders → red-brass glints thrown up off the stance fall and lie as flecks → the heels scuff a breath of grit → an echo hoop follows and the warm light lets go',
  layers: [
    { kind: 'burst', name: 'heart flare', recipe: recipe([WHITE, RALLY_LIT], HEART_FLARE), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'stance ring', recipe: recipe([RALLY_LIT, RALLY], STANCE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'rising hoop', recipe: recipe([RALLY_LIT, BRASS], RALLY_HOOP), count: 1, tier: 'hero', at: 0.02 },
    { kind: 'burst', name: 'blood glints', recipe: recipe([BRASS, RALLY], RALLY_GLINT), count: 14, tier: 'body', arrange: 'rim', radius: 0.2, outward: 0.7, at: 0.03 },
    { kind: 'burst', name: 'heel scuff', recipe: recipe([PALE, LOAM], HEEL_SCUFF), count: 5, tier: 'body', arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'echo hoop', recipe: recipe([RALLY, BRASS], { ...RALLY_HOOP, size: 0.42, life: 0.36 }), count: 1, tier: 'hero', at: 0.3 },
    { kind: 'glow', name: 'blood light', r: 1.2, rgb: RALLY_GLOW, a: 0.3, dur: 0.6, attack: 0.02, release: 0.45, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// combat.shove — THE LINE GOES BACK
// ---------------------------------------------------------------------------
/**
 * The stagger word: a white shock crescent leads the aim, the yard is
 * pressed forward under it, a dust wall rolls forward in the cone,
 * clods fly and bounce, boot skids are pressed into the floor where
 * their feet went out, and the grit lies in a fan. Aimed by the cast.
 */
export const shove: EffectDef = {
  id: 'combat.shove',
  name: 'Combat — shove',
  story: 'a white shock crescent leads the aim → the yard pressed forward under it → a dust wall rolls forward in the cone, clods flung ahead of it bouncing and lying → boot skids pressed into the floor where their feet went out → grit lies in a fan',
  layers: [
    { kind: 'burst', name: 'shock crescent', recipe: recipe([WHITE, SAND], SHOCK_RING), count: 1, tier: 'hero', along: 0.5 },
    { kind: 'burst', name: 'pressed yard', recipe: recipe([SAND, PALE], PRESSED_FWD), count: 14, tier: 'fine', arrange: 'cone', aimed: true, spread: 0.55, along: 0.15 },
    { kind: 'burst', name: 'dust wall', recipe: recipe([PALE, LOAM], DUST_WALL), count: 14, tier: 'body', arrange: 'cone', aimed: true, spread: 0.5, along: 0.3, at: 0.03 },
    { kind: 'burst', name: 'clods', recipe: recipe([SAND, PALE], CLOD_FWD), count: 7, tier: 'hero', arrange: 'cone', aimed: true, spread: 0.45, along: 0.2 },
    { kind: 'burst', name: 'boot skids', recipe: recipe([SHADE, LOAM], BOOT_SKID), count: 8, tier: 'hero', arrange: 'cone', aimed: true, spread: 0.4, along: 0.6, at: 0.04 },
    { kind: 'burst', name: 'grit fan', recipe: recipe([SAND, PALE], GRIT_FAN), count: 9, tier: 'fine', arrange: 'cone', aimed: true, spread: 0.6, along: 0.2 },
    { kind: 'glow', name: 'yard light', r: 1.2, rgb: '220, 190, 130', a: 0.12, dur: 0.3, attack: 0.01, release: 0.22, along: 0.6 },
  ],
};

// ---------------------------------------------------------------------------
// combat.horn_call — THE ONE HORN NOTE
// ---------------------------------------------------------------------------
/**
 * The school's flourish: the horn star over the caster, three brass
 * sound-hoops rising and widening on beats, brass shed off each hoop
 * falling to lie as flecks, a bright ring at the feet, a brass light
 * that pulses with the note. The landed follow and the held note's
 * last beat both blow it.
 */
export const hornCall: EffectDef = {
  id: 'combat.horn_call',
  name: 'Combat — horn call',
  story: 'the horn star over the caster → three brass sound-hoops rise and widen on beats → brass shed off each hoop falls and lies as flecks → a bright brass ring at the feet → the light pulses with the note and lets go',
  layers: [
    { kind: 'burst', name: 'horn star', recipe: recipe([WHITE, BRASS_LIT], { ...HORN_STAR, z: 1.05, size: 0.55, life: 0.22 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'sound hoops', recipe: recipe([WHITE, BRASS_LIT], HORN_HOOP), count: 1, tier: 'hero', at: 0.02, every: 0.14, times: 2 },
    { kind: 'burst', name: 'brass shed', recipe: recipe([BRASS_LIT, BRASS], HORN_SHED), count: 8, tier: 'body', arrange: 'rim', radius: 0.35, outward: 0.9, at: 0.04, every: 0.14, times: 2, decay: 0.8 },
    { kind: 'burst', name: 'feet ring', recipe: recipe([WHITE, BRASS_LIT], { ...BRASS_WAVE, life: 0.4, sizeCurve: curveOf([0, 0.25, 1, 2.0]) }), count: 1, tier: 'hero', at: 0.06 },
    { kind: 'glow', name: 'horn light', r: 1.3, rgb: BRASS_GLOW, a: 0.26, dur: 0.5, attack: 0.02, release: 0.35, dz: 0.8, flicker: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// combat.ground_pulse — THE TAMPED RING
// ---------------------------------------------------------------------------
/**
 * One beat of ground the veteran owns: the drumhead flexes (a dark
 * ring races the disc), grit hops straight up off the whole disc and
 * falls back to lie, a low dust breath is shoved off the rim, and a
 * brass-dark tamped rim STANDS at the wire's radius for the beat.
 * Drumbeat's beats, the watch's strikes, and the held ground's pulses.
 */
export const groundPulse: EffectDef = {
  id: 'combat.ground_pulse',
  name: 'Combat — ground pulse',
  story: 'the drumhead flexes: a dark ring races the disc → grit hops straight up off the whole disc and falls back to lie → a low dust breath shoved off the rim → a brass-dark tamped rim stands at the reach for the beat → the flecks stay',
  layers: [
    { kind: 'burst', name: 'flex ring', recipe: recipe([DEEP, SHADE], FLEX_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'thud', recipe: recipe([LOAM, PALE, SHADE], THUD), count: 5, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'rim grit', recipe: recipe([SAND, PALE], HOP_GRIT), count: 12, tier: 'hero', arrange: 'rim', radiusK: 0.95, outward: 0.3, at: 0.02 },
    { kind: 'burst', name: 'disc grit', recipe: recipe([SAND, PALE], HOP_GRIT), count: 10, tier: 'body', arrange: 'disc', radiusK: 0.8, at: 0.04 },
    { kind: 'burst', name: 'rim breath', recipe: recipe([PALE, LOAM], RIM_BREATH), count: 12, tier: 'body', arrange: 'rim', radiusK: 0.85, outward: 0.8, at: 0.05 },
    { kind: 'burst', name: 'tamped rim', recipe: recipe([BRASS, BRASS_DEEP], TAMPED), count: 20, tier: 'hero', arrange: 'ring', radiusK: 1.0, at: 0.08 },
    { kind: 'glow', name: 'beat light', r: 1.0, rgb: BRASS_GLOW, a: 0.18, dur: 0.45, attack: 0.02, release: 0.32, radiusK: 1.0 },
  ],
};

// ---------------------------------------------------------------------------
// combat.guard_open — THE GUARD OPENS
// ---------------------------------------------------------------------------
/**
 * The payoff's seam: a tall white slit flares at chest height, a brass
 * crack ring snaps off it, iron sparks streak out of the seam down the
 * aim, splinters of the guard bounce and lie, the heels breathe dust,
 * and the afterlight stands a beat. The Opening's face.
 */
export const guardOpen: EffectDef = {
  id: 'combat.guard_open',
  name: 'Combat — guard open',
  story: 'the seam is found: a tall white slit flares at chest height → a brass crack ring snaps off it → iron sparks and brass spall streak out of the seam down the aim, the spall landing as flecks → splinters of the guard bounce and lie dark on the floor → the seam scar is pressed into the ground where the guard failed → the heels breathe dust → the afterlight stands a beat',
  layers: [
    { kind: 'burst', name: 'slit', recipe: recipe([WHITE, BRASS_LIT], SLIT), count: 1, tier: 'hero', along: 0.6 },
    { kind: 'burst', name: 'crack ring', recipe: recipe([WHITE, BRASS_LIT], CRACK_RING), count: 1, tier: 'hero', along: 0.6, at: 0.02 },
    { kind: 'burst', name: 'seam sparks', recipe: recipe([IRON_SPARK, WHITE], SEAM_SPARKS), count: 18, tier: 'fine', arrange: 'cone', aimed: true, spread: 0.5, along: 0.6 },
    { kind: 'burst', name: 'brass spall', recipe: recipe([BRASS_LIT, BRASS], BRASS_SPALL), count: 10, tier: 'body', arrange: 'cone', aimed: true, spread: 0.55, along: 0.6, at: 0.02 },
    { kind: 'burst', name: 'guard splinters', recipe: recipe([IRON_LIT, IRON], GUARD_SPLINTER), count: 6, tier: 'hero', arrange: 'cone', aimed: true, spread: 0.6, along: 0.6 },
    { kind: 'burst', name: 'seam scar', recipe: recipe([BRASS, BRASS_DEEP], SEAM_SCAR), count: 5, tier: 'hero', arrange: 'cone', aimed: true, spread: 0.3, along: 0.55, at: 0.04 },
    { kind: 'burst', name: 'heel dust', recipe: recipe([PALE, LOAM], HEEL_SCUFF), count: 4, tier: 'body', arrange: 'disc', radius: 0.18 },
    { kind: 'glow', name: 'afterlight', r: 1.0, rgb: BRASS_GLOW, a: 0.32, dur: 0.6, attack: 0.01, release: 0.45, dz: 0.6, along: 0.6 },
  ],
};

export const COMBAT_EFFECTS: EffectDef[] = [brassWave, ironScrap, chalkLine, rallyBrand, shove, hornCall, groundPulse, guardOpen];

// ---------------------------------------------------------------------------
// The plans — one per art, reasoned from what the art NOW does (THE
// MASTERED HAND). Three acts each; `onFollow` for every payoff that
// follows a word, `onFinale` for every held note's last beat,
// `<art>:aftermath` for the two arts that leave HELD GROUND.
// ---------------------------------------------------------------------------
export const COMBAT_PLANS: Record<string, AbilityPlan> = {
  // Rung 5 opener (rally): the cut is plain and bleeds; the signature is the blood coming UP on the veteran a beat later — the rally brand at his chest, his stance ringed red-brass, says the word is his.
  first_blood: { cues: [{ id: 'blood.hit', scale: 1.0 }, { id: 'combat.rally_brand', scale: 1.0, at: 0.14 }] },
  // Rung 15 answer (stagger): the road is gouged under the run, the bank chases him, and half a beat after the body stops (6 tiles ≈ 0.46 s) the whole body goes into them — the shove throws the line back off its feet at the arrival.
  shoulder_check: {
    cues: [
      { id: 'dust.gouge', scale: 0.8 },
      { id: 'dust.billow', scale: 0.7, at: 0.04 },
      { id: 'combat.shove', scale: 1.6, atFar: true, at: 0.46 },
    ],
  },
  // Rung 25 opener (weaken): THE shout — the horn is blown over him and the hammered brass wave runs out to the ring, cooling where it stops; everyone inside it heard it.
  war_shout: { cues: [{ id: 'combat.horn_call', scale: 1.2 }, { id: 'combat.brass_wave', scale: 1.7, at: 0.04 }] },
  // Rung 35 answer (mend page, rally): the chest fills — the bloom's gather-and-flare is the breath drawn — then the blood comes up: the rally brand at the chest as the knitting starts.
  second_breath: { cues: [{ id: 'arcane.bloom', scale: 0.7 }, { id: 'combat.rally_brand', scale: 1.2, at: 0.45 }] },
  // Rung 45 opener (weaken): each hit is one landed piece of camp junk that clangs, bounces and LIES THERE in their face — three throws, three pieces on the field.
  loose_iron: { cues: [{ id: 'combat.iron_scrap', scale: 0.9 }] },
  // Rung 54 answer (stonehide, rally): feet planted — the stamp slams, the ground is tamped in a ring under him, and the word given puts the blood up.
  hold_fast: {
    cues: [
      { id: 'dust.slam', scale: 1.0 },
      { id: 'combat.ground_pulse', scale: 1.0, at: 0.06 },
      { id: 'combat.rally_brand', scale: 1.1, at: 0.32 },
    ],
  },
  // Rung 62 opener (stagger; follows the shout): the wound-up blow walks through the wall — the shove at weight throws the line back off its feet, the step-in slams. After the shout the horn is blown and a second rank goes over.
  break_the_line: {
    cues: [{ id: 'combat.shove', scale: 1.9 }, { id: 'dust.slam', scale: 0.9, at: 0.08 }],
    onFollow: [{ id: 'combat.horn_call', scale: 1.0 }, { id: 'combat.shove', scale: 1.0, at: 0.22 }],
  },
  // Rung 70 payoff (reads weaken, executes, follows stagger): the guard opens — the seam flares, iron sparks and splinters fly down the aim, the cut bleeds. On a staggered foe the horn is blown: it comes straight back.
  the_opening: {
    cues: [{ id: 'combat.guard_open', scale: 1.5 }, { id: 'blood.hit', scale: 0.9, at: 0.06 }],
    onFollow: [{ id: 'combat.horn_call', scale: 1.0, at: 0.02 }],
  },
  // Rung 78 payoff (follows rally, drains): four refusals 250 ms apart, each a wet cut and the tithe pulled home; while the blood is up each one re-brands the rally at his chest.
  no_quarter: {
    cues: [{ id: 'blood.hit', scale: 0.8 }, { id: 'blood.drink', scale: 0.6, at: 0.08 }],
    onFollow: [{ id: 'combat.rally_brand', scale: 0.7, at: 0.1 }],
  },
  // Rung 90 crown (rally; follows weaken/stagger wider; HELD GROUND): three waves 500 ms apart, each a brass wave with the horn over it — rings of three ages stacked; pressed after a word a second, wider wave runs past the first.
  the_long_fight: {
    cues: [{ id: 'combat.brass_wave', scale: 1.5 }, { id: 'combat.horn_call', scale: 1.0, at: 0.02 }],
    onFollow: [{ id: 'combat.brass_wave', scale: 1.0, radiusK: 1.25, at: 0.24 }],
  },
  // The crown's ground (field, 5–7 s): the last wave cools in place as the standing ring, the blood comes up on the man who holds it, and every second the tamped ring answers back under his feet.
  'the_long_fight:aftermath': {
    cues: [
      { id: 'combat.brass_wave', scale: 1.3 },
      { id: 'combat.rally_brand', scale: 0.9, at: 0.15 },
      { id: 'combat.ground_pulse', scale: 1.1, at: 0.5, every: 1.0 },
    ],
  },
  // The unwritten page (answer; follows any word; quickens): the brass wave runs the four roads out, the compass ward pulses under him, and the heel kicks off as he gets moving; after a word the horn is blown.
  four_roads: {
    cues: [
      { id: 'combat.brass_wave', scale: 1.5 },
      { id: 'arcane.sigil', scale: 0.7, at: 0.05 },
      { id: 'dust.kick', scale: 0.7, at: 0.3 },
    ],
    onFollow: [{ id: 'combat.horn_call', scale: 1.0, at: 0.02 }],
  },

  // ---- THE SECOND BREATH — the combat breath arts
  // Rung 10 payoff (follows rally/weaken ×1.5): the measure is taken (a breath of dust at the heel), then the blow lands forward as a shove; in the window the horn is blown and the full slam says half again.
  measured_blow: {
    cues: [{ id: 'dust.kick', scale: 0.7 }, { id: 'combat.shove', scale: 1.3, at: 0.08 }],
    onFollow: [{ id: 'combat.horn_call', scale: 1.0, at: 0.02 }, { id: 'dust.slam', scale: 1.2, at: 0.1 }],
  },
  // Rung 20 sustain (finale ×2; follows rally): every beat the drumhead flexes and the ring is tamped at the reach while the heels kick; the LAST beat blows the horn and the brass wave drives the whole line back. On a rally each beat re-brands.
  drumbeat: {
    cues: [{ id: 'combat.ground_pulse', scale: 1.3 }, { id: 'dust.kick', scale: 0.6, at: 0.05 }],
    onFinale: [{ id: 'combat.horn_call', scale: 1.2 }, { id: 'combat.brass_wave', scale: 1.5, at: 0.05 }],
    onFollow: [{ id: 'combat.rally_brand', scale: 0.8, at: 0.12 }],
  },
  // Rung 30 payoff (follows weaken ×1.5; red ledger): the bundle arrives with the blast and LIES THERE over its dent; thrown after the shout the horn is blown and a second handful of iron lands beside the first.
  thrown_iron: {
    cues: [{ id: 'combat.iron_scrap', scale: 1.5 }, { id: 'dust.slam', scale: 0.8 }],
    onFollow: [{ id: 'combat.horn_call', scale: 0.9 }, { id: 'combat.iron_scrap', scale: 0.9, at: 0.14 }],
  },
  // Rung 40 sustain (chill lane, finale ×2): each beat a winter exhale rolled down the lane, the far end riming over (beam radius is half-width 0.3, so radiusK 3); the last breath bites double — ice spears stand up at the far end under the horn.
  ironbreath: {
    cues: [{ id: 'frost.breath', scale: 1.2 }, { id: 'frost.fog', scale: 0.8, radiusK: 3, atFar: true, at: 0.35 }],
    onFinale: [{ id: 'frost.shards', scale: 1.1, radiusK: 3, atFar: true, at: 0.1 }, { id: 'combat.horn_call', scale: 1.0 }],
  },
  // Rung 50 payoff (charge through the line; follows stagger/rally ×1.5, refunds): the heel kicks off, the road is gouged the length of the run, and at the pass-through (9 tiles ≈ 0.69 s) blood sprays and the shove carries them off it; in the window the horn is blown at the far end.
  fifth_road: {
    cues: [
      { id: 'dust.kick', scale: 0.8 },
      { id: 'dust.gouge', scale: 1.1, at: 0.04 },
      { id: 'blood.spray', scale: 1.0, atFar: true, at: 0.66 },
      { id: 'combat.shove', scale: 1.2, atFar: true, at: 0.68 },
    ],
    onFollow: [{ id: 'combat.horn_call', scale: 1.0, atFar: true, at: 0.72 }, { id: 'blood.hit', scale: 0.9, atFar: true, at: 0.66 }],
  },
  // Rung 58 sustain (shock, finale ×2; follows stagger): each beat a dry low crack of arcs racing the ground and a rumble through the boots; the LAST clap is the true strike from the sky with the horn under it. On a stagger the beat lands full — the slam doubles.
  old_thunder: {
    cues: [{ id: 'storm.nova', scale: 0.8 }, { id: 'dust.slam', scale: 0.7, at: 0.05 }],
    onFinale: [{ id: 'storm.strike', scale: 0.95, at: 0.02 }, { id: 'combat.horn_call', scale: 1.0, at: 0.12 }],
    onFollow: [{ id: 'dust.slam', scale: 1.0, at: 0.06 }],
  },
  // Rung 66 sustain (blast + HELD GROUND 4–5 s): all of it at once — the brass wave at weight, the full slam, and the horn over him in the same breath.
  gathered_breath: {
    cues: [
      { id: 'combat.brass_wave', scale: 2.0 },
      { id: 'dust.slam', scale: 1.5, at: 0.02 },
      { id: 'combat.horn_call', scale: 1.2, at: 0.05 },
    ],
  },
  // The gathered square (field): the wave cools in place as the standing ring, the blood comes up on the man standing harder in it, and the tamped ring answers back every pulse.
  'gathered_breath:aftermath': {
    cues: [
      { id: 'combat.brass_wave', scale: 1.2 },
      { id: 'combat.rally_brand', scale: 0.8, at: 0.2 },
      { id: 'combat.ground_pulse', scale: 1.1, at: 0.4, every: 0.8 },
    ],
  },
  // Rung 74 sustain (staked ground, finale ×2–3): each beat the watch strikes the staked ring — the drumhead flexes there and the rim is tamped — and one caught heel kicks where it landed; the LAST beat is the one they walked into: the brass wave, the horn, the slam.
  long_watch: {
    cues: [{ id: 'combat.ground_pulse', scale: 1.3 }, { id: 'dust.kick', scale: 0.6, at: 0.25 }],
    onFinale: [
      { id: 'combat.brass_wave', scale: 1.4 },
      { id: 'combat.horn_call', scale: 1.1, at: 0.05 },
      { id: 'dust.slam', scale: 1.1, at: 0.08 },
    ],
  },
  // Rung 82 opener (weaken, drains): the scars shown — the cut is modest; the spectacle is the tithe pulled home and the till settling into a ring at his feet after.
  scarworn: {
    cues: [
      { id: 'blood.hit', scale: 0.9 },
      { id: 'blood.drink', scale: 1.1, at: 0.05 },
      { id: 'dust.kick', scale: 0.6, at: 0.95 },
    ],
  },
  // Rung 86 sustain (chain, finale ×2; follows weaken): every hop writes the lesson student to student in chalk and raps the far end; the last word is the loudest — the horn blown at the last student's feet. On a shouted crowd the horn is heard at each hop.
  last_lesson: {
    cues: [{ id: 'combat.chalk_line', scale: 1.3 }],
    onFinale: [{ id: 'combat.horn_call', scale: 1.2, atFar: true, at: 0.14 }],
    onFollow: [{ id: 'combat.horn_call', scale: 0.8, atFar: true, at: 0.2 }],
  },
};
