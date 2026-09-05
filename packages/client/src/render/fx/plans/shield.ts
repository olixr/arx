/**
 * SHIELD — ability plans (particles v6 phase 5). THE WALL'S VOICE.
 *
 * Twenty-two abilities: the shield school's twelve (fxSigsShield.ts)
 * and the ten breath arts (fxSigsShieldBreath.ts). The school's grammar
 * is MASONRY AND IRON — laid courses, struck rims, brass that rings —
 * and the library speaks it through four roster effects and the dust,
 * arcane, fire, frost and water materials:
 *
 *   shield.rim_spark  iron struck: a white cap where the blow met the
 *                     rim, a chevron of glints sheared back the way it
 *                     came, hot sparks thrown forward that land and
 *                     prick the dirt. The block law's own word, cheap
 *                     enough to say often.
 *   shield.masonry    one course laid: a press seat on the ground, stone
 *                     chips thrown and bouncing, mortar grit raining and
 *                     lying, a pale mortar puff, and the mason's white
 *                     level-line snapping across the work a beat later.
 *   shield.merlons    the ground's own masonry standing up at the rim
 *                     (radiusK): blocks rise and go back under, chips and
 *                     grit off the lip, the crater floor sinking a shade.
 *   shield.brass      the bell: a brass mouth rings at guard height,
 *                     sound rings walk the yard, brass shaken off the
 *                     boss bounces and lies at the rim for seconds, an
 *                     echo answers a second on.
 *
 * Wards (set_the_wall, shield_roof, turned_blow, unbroken, hold_the_line)
 * stand on arcane.sigil — warm gold, the one light the wall allows.
 * 'buff' wires live 750ms and 'block' 380ms: their plans are one-ceremony
 * rites with no `every`. hold_the_line rides a real 7-second field.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';
import { PALE, LOAM, SHADE, RAMP_CLOD } from '../library/dust.js';

// ---------------------------------------------------------------------------
// Palette — iron, stone, brass (the school's own unowned metals)
// ---------------------------------------------------------------------------

const IRON_WHITE = '#f4f7fa';
const STEEL = '#c8d2dc';
const IRON = '#8ea4b8';
const IRON_DEEP = '#4e5a68';
const HOT_WHITE = '#fff2e0';
const HEAT = '#ffd0a8';
const EMBER = '#c9541f';

const STONE_LIT = '#d2d6d9';
const STONE = '#a0a6ac';
const STONE_SHADE = '#70777e';
const STONE_DEEP = '#4b5157';
const MORTAR = '#d8cfbe';
const MORTAR_DUST = '#bfb4a2';

const BRASS_WHITE = '#fff2c8';
const BRASS = '#f2dc9a';
const BRASS_MID = '#d9b45e';
const BRASS_DEEP = '#a07c34';
const BRASS_DARK = '#6c5220';

const IRON_GLOW = '215, 228, 242';
const STONE_GLOW = '205, 200, 190';
const BRASS_GLOW = '242, 210, 130';

const RAMP_IRON = rampOf({ stops: [IRON_WHITE, STEEL, IRON, IRON_DEEP], at: [0, 0.3, 0.65, 0.92], steps: 5 });
const RAMP_HEAT = rampOf({ stops: [HOT_WHITE, HEAT, EMBER, IRON_DEEP], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_STONE = rampOf({ stops: [STONE_LIT, STONE, STONE_SHADE, STONE_DEEP], at: [0, 0.35, 0.7, 0.95], steps: 4 });
const RAMP_MORTAR = rampOf({ stops: [MORTAR, MORTAR_DUST, STONE], at: [0, 0.45, 0.9], steps: 4 });
const RAMP_BRASS = rampOf({ stops: [BRASS_WHITE, BRASS, BRASS_MID, BRASS_DEEP], at: [0, 0.25, 0.6, 0.92], steps: 5 });
const RAMP_BRASS_LIE = rampOf({ stops: [BRASS, BRASS_MID, BRASS_DEEP, BRASS_DARK], at: [0, 0.3, 0.7, 0.95], steps: 4 });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
const BOLT_A = curveOf([0, 1, 0.6, 0.9, 1, 0]);

// ---------------------------------------------------------------------------
// shield.rim_spark — iron struck
// ---------------------------------------------------------------------------

/** The white cap where the blow met the rim, at guard height. */
const CAP: BurstOpts = {
  shape: 'blob', speed: 0.1, life: 0.16, lifeVar: 0.1, size: 0.34, sizeVar: 0.1, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: ['#ffffff', IRON_WHITE, STEEL] }), core: '#ffffff', coreK: 0.5,
};

/** The rim arc: a short thick ring snapping open at the contact. */
const RIM: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.2, lifeVar: 0.05, size: 0.26, sizeVar: 0.05, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [IRON_WHITE, STEEL, IRON], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.6, 0.5, 1.4, 1, 1.7]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]), ringWidth: 0.16,
};

/** The chevron: glints sheared back the way the blow came. */
const SHEAR: BurstOpts = {
  shape: 'streak', align: true, speed: 2.8, speedVar: 0.3, life: 0.28, lifeVar: 0.2, size: 0.075, sizeVar: 0.25,
  gravity: 0, z: 0.55, vz: 0.5, zg: 3, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
  ramp: RAMP_IRON, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

/** Hot sparks thrown forward and down; they land and prick the dirt. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 2.1, speedVar: 0.6, life: 0.5, lifeVar: 0.3, size: 0.045, gravity: 0,
  z: 0.5, vz: 1.4, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.6, trail: 6, trailColor: HEAT,
  ramp: RAMP_HEAT, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 1.4,
};

export const shieldRimSpark: EffectDef = {
  id: 'shield.rim_spark',
  name: 'Shield — rim spark',
  story: 'iron struck: a white cap flares where the blow met the rim → the rim arc snaps open → a chevron of glints shears back the way the blow came → hot sparks fly forward, land and prick the dirt',
  layers: [
    { kind: 'burst', name: 'cap', recipe: recipe(['#ffffff', IRON_WHITE], CAP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'rim arc', recipe: recipe([IRON_WHITE, STEEL], RIM), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'shear chevron', recipe: recipe([IRON_WHITE, STEEL, IRON], SHEAR), count: 6, tier: 'body', arrange: 'cone', dirOff: Math.PI, spread: 0.35 },
    { kind: 'burst', name: 'hot sparks', recipe: recipe([HOT_WHITE, HEAT], SPARK), count: 5, tier: 'hero', arrange: 'cone', spread: 0.9 },
    { kind: 'burst', name: 'spark fines', recipe: recipe([HEAT, EMBER], { ...SPARK, size: 0.035, life: 0.4, trail: 0 }), count: 8, tier: 'fine', arrange: 'cone', spread: 1.1 },
    { kind: 'glow', name: 'strike light', r: 0.7, rgb: IRON_GLOW, a: 0.2, dur: 0.18, attack: 0.01, release: 0.14, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// shield.masonry — one course laid
// ---------------------------------------------------------------------------

/** The press seat: a ring pressed into the ground where the block sat. */
const SEAT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.32, lifeVar: 0.05, size: 0.34, sizeVar: 0.04, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [MORTAR, STONE, STONE_SHADE], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.6, 0.5, 1.4, 1, 1.7]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** The block itself: a stone square descending into its slot and staying. */
const BLOCK: BurstOpts = {
  shape: 'square', speed: 0, life: 1.5, lifeVar: 0.1, size: 0.22, sizeVar: 0.1, gravity: 0,
  z: 0.7, vz: 0, zg: 6, land: 'settle', layer: 'world', shadow: 0.7,
  ramp: rampOf({ stops: [STONE_LIT, STONE, STONE_SHADE], at: [0, 0.5, 0.9], steps: 3 }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Stone chips: thrown, tumbling, bouncing, lying, flecking the dirt. */
const CHIP: BurstOpts = {
  shape: 'shard', speed: 0.75, speedVar: 0.5, life: 2.6, lifeVar: 0.3, size: 0.08, sizeVar: 0.3, gravity: 0, spin: 8,
  vz: 2.4, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world',
  ramp: RAMP_STONE, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 6,
};

/** Mortar grit: fines raining and lying. */
const GRIT: BurstOpts = {
  shape: 'square', speed: 1.0, speedVar: 0.6, life: 1.9, lifeVar: 0.35, size: 0.04, sizeVar: 0.3, gravity: 0, drag: 0.4,
  vz: 1.9, zg: 7, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MORTAR, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The mortar puff: a pale mass squeezed out from under the block. */
const MORTAR_PUFF: BurstOpts = {
  shape: 'blob', speed: 0.5, speedVar: 0.5, life: 1.1, lifeVar: 0.3, size: 0.3, sizeVar: 0.25, gravity: 0, drag: 2.2,
  z: 0.05, vz: 0.35, zg: 1.2, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MORTAR, sizeCurve: curveOf([0, 0.7, 0.3, 1.1, 1, 0.8]), alphaCurve: curveOf([0, 0.9, 0.5, 0.75, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/** The mason's string: a white level-line flashing across the top of the work. */
const LEVEL_LINE: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.22, lifeVar: 0.02, size: 0.5, sizeVar: 0.02, gravity: 0, z: 0.85,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: ['#ffffff', IRON_WHITE, STEEL], at: [0, 0.5, 0.85] }),
  sizeCurve: curveOf([0, 0.8, 1, 1.1]), alphaCurve: FADE_OUT, ringWidth: 0.06,
};

export const shieldMasonry: EffectDef = {
  id: 'shield.masonry',
  name: 'Shield — masonry',
  story: 'one course laid: the block descends into its slot and seats with a press ring → stone chips fly and bounce and lie → mortar grit rains and stays → a pale mortar puff squeezes out → the mason\'s white level-line snaps across the top of the work',
  layers: [
    { kind: 'field', name: 'seat pressure', field: { kind: 'attract', radius: 0.9, strength: -1.2, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'seat', recipe: recipe([MORTAR, STONE], SEAT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'block', recipe: recipe([STONE_LIT, STONE], BLOCK), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'chips', recipe: recipe([STONE_LIT, STONE, STONE_SHADE], CHIP), count: 5, tier: 'hero' },
    { kind: 'burst', name: 'grit', recipe: recipe([MORTAR, MORTAR_DUST], GRIT), count: 16, tier: 'fine' },
    { kind: 'burst', name: 'mortar puff', recipe: recipe([MORTAR, MORTAR_DUST, STONE], MORTAR_PUFF), count: 5, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'level line', recipe: recipe(['#ffffff', IRON_WHITE], LEVEL_LINE), count: 1, tier: 'hero', at: 0.35 },
    { kind: 'glow', name: 'stone light', r: 0.8, rgb: STONE_GLOW, a: 0.08, dur: 0.3, attack: 0.02, release: 0.2 },
  ],
};

// ---------------------------------------------------------------------------
// shield.merlons — the ground's own masonry stands up at the rim
// ---------------------------------------------------------------------------

/** A merlon block: rises out of the rim, holds a beat, goes back under. */
const MERLON: BurstOpts = {
  shape: 'square', speed: 0, life: 0.95, lifeVar: 0.15, size: 0.17, sizeVar: 0.2, gravity: 0,
  z: 0.02, vz: 0.9, zg: 1.9, land: 'die', layer: 'world', shadow: 0.6,
  ramp: RAMP_STONE, sizeCurve: curveOf([0, 0.5, 0.2, 1, 0.8, 1, 1, 0.6]), alphaCurve: FADE_LATE,
};

/** The crater floor sinking a shade: dark ground squares that stay. */
const SINK: BurstOpts = {
  shape: 'square', speed: 0.05, life: 2.6, lifeVar: 0.3, size: 0.12, sizeVar: 0.35, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [STONE_SHADE, STONE_DEEP, SHADE], at: [0, 0.4, 0.85], steps: 3 }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.1, 0.55, 0.7, 0.5, 1, 0]),
};

/** Dust off the lip: low puffs shoved outward. */
const LIP_DUST: BurstOpts = {
  shape: 'blob', speed: 0.9, speedVar: 0.4, life: 1.3, lifeVar: 0.3, size: 0.28, sizeVar: 0.25, gravity: 0, drag: 2.4,
  z: 0.04, vz: 0.4, zg: 1.2, mass: 0.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [SHADE, LOAM, PALE, MORTAR_DUST], at: [0, 0.3, 0.62, 1], steps: 5 }),
  sizeCurve: curveOf([0, 0.55, 0.25, 1, 0.6, 1.1, 1, 0.8]), alphaCurve: curveOf([0, 0.6, 0.15, 1, 0.66, 0.9, 1, 0]),
  wave: 'noise', waveHz: 1.5, waveAmp: 0.3,
};

export const shieldMerlons: EffectDef = {
  id: 'shield.merlons',
  name: 'Shield — merlons',
  story: 'the ground picks a side: a shock ring races out → merlon blocks stand up out of the rim, shedding chips and grit as they rise → dust rolls off the lip → the crater floor sinks a shade and stays dark → the blocks hold a beat and go back under',
  layers: [
    { kind: 'field', name: 'lip pressure', field: { kind: 'attract', radius: 1.4, strength: -1.0, dur: 0.4, attack: 0.02, release: 0.2 }, radiusK: 1.0 },
    { kind: 'burst', name: 'shock', recipe: recipe([MORTAR, STONE], { ...SEAT, size: 0.5, life: 0.4, sizeCurve: curveOf([0, 0.7, 0.5, 2.4, 1, 3.1]) }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'merlons', recipe: recipe([STONE_LIT, STONE, STONE_SHADE], MERLON), count: 8, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0, at: 0.06 },
    { kind: 'burst', name: 'chips', recipe: recipe([STONE, STONE_SHADE], CHIP), count: 8, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.7 },
    { kind: 'burst', name: 'grit', recipe: recipe([MORTAR_DUST, STONE], GRIT), count: 14, tier: 'fine', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.9 },
    { kind: 'burst', name: 'lip dust', recipe: recipe([LOAM, PALE, MORTAR_DUST], { ...LIP_DUST, size: 0.26, drag: 3.2 }), count: 16, tier: 'body', arrange: 'rim', radius: 0.95, radiusK: 0.95, outward: 0.4 },
    { kind: 'burst', name: 'crater sinks', recipe: recipe([STONE_SHADE, STONE_DEEP], SINK), count: 8, tier: 'body', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.1 },
    { kind: 'burst', name: 'soil clods', recipe: recipe([LOAM, SHADE], { shape: 'shard', speed: 0.9, speedVar: 0.5, life: 2.4, size: 0.07, gravity: 0, spin: 9, vz: 2.2, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world', ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 6 }),
      count: 3, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.8, at: 0.06 },
    { kind: 'glow', name: 'rim light', r: 1.2, rgb: STONE_GLOW, a: 0.1, dur: 0.5, attack: 0.02, release: 0.35, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// shield.brass — the bell
// ---------------------------------------------------------------------------

/** The bronze mouth: a brass ring at guard height, trembling out-of-round. */
const MOUTH: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.55, lifeVar: 0.05, size: 0.45, sizeVar: 0.03, gravity: 0, z: 0.6,
  layer: 'world', shadow: 0, ramp: RAMP_BRASS, ringWidth: 0.14,
  sizeCurve: curveOf([0, 0.8, 0.15, 1.12, 0.3, 0.9, 0.45, 1.08, 0.6, 0.94, 0.75, 1.04, 1, 1]),
  alphaCurve: FADE_LATE,
};

/** A sound ring walking the yard on the ground (radiusK on the cast). */
const SOUND_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.04, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [BRASS_WHITE, BRASS, BRASS_MID, BRASS_DEEP], at: [0, 0.3, 0.6, 0.9] }),
  sizeCurve: curveOf([0, 0.4, 0.5, 2.6, 1, 4.0]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]), ringWidth: 0.07,
};

/** Brass shaken off the boss: glints that bounce true and lie. */
const SHAKEN: BurstOpts = {
  shape: 'glint', speed: 1.3, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.06, sizeVar: 0.25, gravity: 0,
  z: 0.6, vz: 1.2, zg: 7, land: 'bounce', bounce: 0.45, layer: 'world', flicker: 0.4,
  ramp: RAMP_BRASS, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 3,
};

/** Brass grains lying at the rim: where the sound stopped. */
const LIE: BurstOpts = {
  shape: 'square', speed: 0.15, speedVar: 0.5, life: 8, lifeVar: 0.1, size: 0.05, sizeVar: 0.25, gravity: 0,
  z: 0.06, vz: 0.35, zg: 4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_BRASS_LIE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The chime: glints breathing on a z-wave around the rim. */
const CHIME: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.6, lifeVar: 0.3, size: 0.06, gravity: 0, z: 0.1, vz: 0.4, zg: 0,
  layer: 'world', shadow: 0, flicker: 0.6, ramp: RAMP_BRASS, sizeCurve: curveOf('bloom'), alphaCurve: FADE_OUT,
  wave: 'sine', waveHz: 3, waveAmp: 0.3, waveAxis: 'z',
};

export const shieldBrass: EffectDef = {
  id: 'shield.brass',
  name: 'Shield — brass',
  story: 'the bell: the brass mouth rings out-of-round at guard height → three sound rings peel off it and walk the yard → brass shaken off the boss bounces true → a circle of brass grains lies at the rim where the sound stopped → an echo answers a second on',
  layers: [
    { kind: 'burst', name: 'mouth', recipe: recipe([BRASS_WHITE, BRASS], MOUTH), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'sound rings', recipe: recipe([BRASS_WHITE, BRASS], SOUND_RING), count: 1, tier: 'hero', every: 0.22, times: 2 },
    { kind: 'burst', name: 'shaken brass', recipe: recipe([BRASS_WHITE, BRASS, BRASS_MID], SHAKEN), count: 10, tier: 'body' },
    { kind: 'emit', name: 'chime', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.05, at: 0.1, rate: 18, dur: 0.9, attack: 0.05, release: 0.3, tier: 'fine',
      pops: [{ colors: [BRASS_WHITE, BRASS], opts: CHIME, tier: 'fine' }] },
    { kind: 'burst', name: 'brass lies at the rim', recipe: recipe([BRASS, BRASS_MID], LIE), count: 12, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.2, at: 0.3 },
    { kind: 'burst', name: 'echo', recipe: recipe([BRASS_MID, BRASS_DEEP], { ...SOUND_RING, life: 0.6, ringWidth: 0.05, alphaCurve: curveOf([0, 0.55, 0.5, 0.4, 1, 0]) }), count: 1, tier: 'body', at: 1.0, every: 0.35, times: 1 },
    { kind: 'glow', name: 'brass light', r: 1.1, rgb: BRASS_GLOW, a: 0.2, dur: 0.7, attack: 0.02, release: 0.5, flicker: 0.3, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const SHIELD_PLANS: Record<string, AbilityPlan> = {
  // ---- the school (fxSigsShield.ts) ---------------------------------------

  // The doorslam: iron meets the mark at guard height, then the ground takes a blunt press stamp under it.
  shield_bash: { cues: [{ id: 'shield.rim_spark', scale: 1.1 }, { id: 'dust.slam', scale: 0.55, at: 0.05 }] },
  // The raised course: a gold ward stands where the feet plant, and one course of stone is laid around them.
  set_the_wall: { cues: [{ id: 'arcane.sigil', scale: 0.8 }, { id: 'shield.masonry', scale: 0.9, at: 0.1 }] },
  // The bow wave: the road is plowed along the chord, and at the drive's end (7.2 tiles at charge speed) the stop-stamp and the rim's spark.
  shield_rush: { cues: [
    { id: 'dust.gouge', scale: 0.8 },
    { id: 'dust.slam', scale: 0.7, atFar: true, at: 0.55 },
    { id: 'shield.rim_spark', scale: 0.8, atFar: true, at: 0.55 },
  ] },
  // The toll: a shout with iron in it — the brass ring walks the yard to the taunt's reach, sparks off the rim as it leaves.
  draw_iron: { cues: [{ id: 'shield.brass', scale: 1.3, radiusK: 1 }, { id: 'shield.rim_spark', scale: 0.6 }] },
  // The iron sky: the ward goes up over the shoulders, then one beat of weather strikes the pitch and gutters off.
  shield_roof: { cues: [{ id: 'arcane.sigil', scale: 0.7, z: 0.9 }, { id: 'water.rain', scale: 0.45, radiusK: 0.9, at: 0.25 }] },
  // The mirror angle: a small ward, then ONE blow is shown the trick — the rim sparks and a little heat drips off the facet's low corner.
  turned_blow: { cues: [
    { id: 'arcane.sigil', scale: 0.6 },
    { id: 'shield.rim_spark', scale: 1.1, at: 0.3 },
    { id: 'fire.burst', scale: 0.3, at: 0.34 },
  ] },
  // The risen course: the rim driven home slams the earth, and the ground's own merlons stand up at the blast lip; the dust hangs after.
  rampart_break: { cues: [
    { id: 'dust.slam', scale: 1.5, radiusK: 1 },
    { id: 'shield.merlons', scale: 1.4, radiusK: 1, at: 0.08 },
    { id: 'dust.billow', scale: 0.6, at: 0.5 },
  ] },
  // The loosed rim: the wheel bites the mark with a rim-spark star and leaves a small rim-dent in the ground.
  wheel_of_iron: { cues: [{ id: 'shield.rim_spark', scale: 1.2 }, { id: 'dust.slam', scale: 0.45, at: 0.04 }] },
  // The drawn line: a gold ward keeps the ground (re-spoken as it fades), the iron border is re-laid on every pulse, and the boots plant once.
  hold_the_line: { cues: [
    { id: 'arcane.sigil', scale: 1.0, radiusK: 0.8, every: 3 },
    { id: 'shield.merlons', scale: 0.6, radiusK: 1, every: 1.0 },
    { id: 'dust.kick', scale: 0.5 },
  ] },
  // The ring of walls: the great gold ward, then the muster closes ranks — brass rings once and the shields lock with a spark.
  unbroken: { cues: [
    { id: 'arcane.sigil', scale: 1.3 },
    { id: 'shield.brass', scale: 1.0, at: 0.55 },
    { id: 'shield.rim_spark', scale: 0.8, at: 0.6 },
  ] },
  // The trophy stakes: each pulse's brass wave crosses the yard and plants its own ring of posts at the rim.
  champions_wall: { cues: [{ id: 'shield.brass', scale: 1.0, radiusK: 1 }, { id: 'shield.merlons', scale: 0.7, radiusK: 1, at: 0.1 }] },
  // The rim spark: the block law's own voice, cheap enough to say often; the wire's radius already carries how much was blocked.
  shield_block: { cues: [{ id: 'shield.rim_spark', scale: 0.55 }] },

  // ---- the second breath (fxSigsShieldBreath.ts) --------------------------

  // The oval mouth: struck iron rings like a bell — the strike's spark, the brass mouth and its sound rings, and a second echo a beat on.
  iron_toll: { cues: [
    { id: 'shield.brass', scale: 1.4, radiusK: 1 },
    { id: 'shield.rim_spark', scale: 0.9 },
    { id: 'shield.brass', scale: 0.6, radiusK: 1.1, at: 1.0 },
  ] },
  // The peeled curl: each beat the rim bites and throws hot curls downfield; the bench keeps its floor.
  grindstone: { cues: [{ id: 'shield.rim_spark', scale: 1.0 }, { id: 'dust.kick', scale: 0.45, at: 0.05 }] },
  // The door in the dirt: the slab lands flat, dust blasts from under its edges, hinge-bolts fly and bounce, the dust hangs.
  doorfall: { cues: [
    { id: 'dust.slam', scale: 1.5, radiusK: 1 },
    { id: 'shield.masonry', scale: 1.1, at: 0.05 },
    { id: 'dust.billow', scale: 0.5, at: 0.4 },
  ] },
  // The portcullis: each beat the gate clangs home at the near mouth, cold runs the lane, and rime rails freeze at the far mouth.
  held_gate: { cues: [
    { id: 'shield.masonry', scale: 0.6 },
    { id: 'frost.breath', scale: 0.7, at: 0.05 },
    { id: 'frost.shards', scale: 0.5, atFar: true, at: 0.15 },
  ] },
  // The traveling polish: the brass ring is the wavefront, radiance stands in it, and fire takes the rim and keeps burning.
  sunbrass: { cues: [
    { id: 'shield.brass', scale: 1.5, radiusK: 1 },
    { id: 'arcane.bloom', scale: 0.6, at: 0.05 },
    { id: 'fire.floor', scale: 0.6, radiusK: 0.8, at: 0.15 },
  ] },
  // The turning spokes: each beat one wall-segment slaps outward — masonry at the rim, dust kicked off its tip.
  millwall: { cues: [{ id: 'shield.merlons', scale: 0.8, radiusK: 1 }, { id: 'dust.slam', scale: 0.45, radiusK: 0.5, at: 0.05 }] },
  // The parted sea: the launch kicks, the anchor lands 8 tiles on at leap speed and parts the water — the splash, the standing rain-walls, cold fog in the lane.
  anchorfall: { cues: [
    { id: 'dust.kick', scale: 0.6 },
    { id: 'water.splash', scale: 1.6, radiusK: 1, atFar: true, at: 0.57 },
    { id: 'water.rain', scale: 0.8, radiusK: 0.9, atFar: true, at: 0.62 },
    { id: 'frost.fog', scale: 0.5, radiusK: 0.5, atFar: true, at: 0.9 },
  ] },
  // The mortar tap: every strike is a brick laid — one course seated, dust kicked at the feet.
  patient_wall: { cues: [{ id: 'shield.masonry', scale: 0.8 }, { id: 'dust.kick', scale: 0.5, at: 0.05 }] },
  // The planted standard: the pole strikes the ring's heart, radiance stands in the court, and fire takes the rim and holds the claim.
  standing_sun: { cues: [
    { id: 'dust.slam', scale: 0.6 },
    { id: 'arcane.sigil', scale: 1.2, radiusK: 0.8 },
    { id: 'fire.floor', scale: 0.7, radiusK: 0.9, at: 0.1 },
  ] },
  // The compass towers: each beat the cold garrisons the rim in spears and leaves rime at their feet; the thinnest fog at the center.
  winterhold: { cues: [{ id: 'frost.shards', scale: 0.9, radiusK: 1 }, { id: 'frost.fog', scale: 0.35, radiusK: 0.3, at: 0.2 }] },
};

export const SHIELD_EFFECTS: EffectDef[] = [shieldRimSpark, shieldMasonry, shieldMerlons, shieldBrass];
