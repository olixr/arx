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
 *   THE MASTERED HAND, Phase 4 (THE VOICE) adds four more:
 *   shield.held_ground  THE HELD GROUND: a kerb course of iron stones drops
 *                     onto the rim, the floor pales to iron, a ward pulse
 *                     walks it on a heartbeat, blows that reach the kerb are
 *                     turned (glints sheared outward). Every `wall` zone.
 *   shield.crack      THE ARMOR CRACKS: the follow's sunder — a white snap,
 *                     plates flung, a star of dark fissures that STAYS.
 *   shield.doorslab   THE DOOR COMES DOWN: one great slab whose shadow
 *                     closes first, lands flat and stays, dust crowning out.
 *   shield.wheel_road THE LOOSED RIM: an iron road down the throw, sparks
 *                     landing along it, the rim's arc snapping at the far end.
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
// shield.held_ground — THE HELD GROUND (THE MASTERED HAND, Phase 4)
// ---------------------------------------------------------------------------
// The school's standing zone: the ground the wall keeps. A kerb course of
// iron-grey stones drops onto the rim and seats; a paved floor darkens
// inside it; a pale ward pulse walks the floor on a heartbeat; blows that
// reach the kerb are TURNED — glints shear outward off the rim; grit rains
// and a low dust stands at the kerb. Spoken on `every` for as long as the
// field lives (hold_the_line, and the aftermath of the wall arts).

/** A kerb stone: an iron-grey block dropped onto the rim that seats and stays the beat. */
const KERB: BurstOpts = {
  shape: 'square', speed: 0, life: 1.4, lifeVar: 0.12, size: 0.16, sizeVar: 0.15, gravity: 0,
  z: 0.45, vz: 0, zg: 7, land: 'settle', layer: 'world', shadow: 0.7,
  ramp: rampOf({ stops: [STEEL, IRON, IRON_DEEP], at: [0, 0.5, 0.92], steps: 3 }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** A paver: a dark ground square inside the kerb, the floor the wall claimed. */
const PAVER: BurstOpts = {
  shape: 'square', speed: 0.02, life: 1.3, lifeVar: 0.2, size: 0.2, sizeVar: 0.3, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [STEEL, IRON, IRON_DEEP], at: [0, 0.5, 0.9], steps: 3 }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.12, 0.8, 0.7, 0.7, 1, 0]),
};

/** The ward pulse: a pale iron ring that walks the floor once a heartbeat. */
const WARD_PULSE: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.55, lifeVar: 0.03, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [IRON_WHITE, STEEL, IRON], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.3, 0.6, 3.2, 1, 3.6]), alphaCurve: curveOf([0, 0.9, 0.6, 0.6, 1, 0]), ringWidth: 0.08,
};

/** A turned blow: a glint sheared outward off the kerb at guard height. */
const TURNED: BurstOpts = {
  ...SHEAR, speed: 1.7, speedVar: 0.3, life: 0.34, lifeVar: 0.2, size: 0.07, z: 0.5, vz: 0.4, zg: 3,
};

export const shieldHeldGround: EffectDef = {
  id: 'shield.held_ground',
  name: 'Shield — held ground',
  story: 'the ground the wall keeps: a kerb course of iron stones drops onto the rim and seats → the floor inside pales to iron → a ward pulse walks the floor on a heartbeat → blows that reach the kerb are turned, glints sheared outward → grit rains and a low dust stands at the kerb',
  layers: [
    { kind: 'burst', name: 'kerb course', recipe: recipe([STEEL, IRON, IRON_DEEP], KERB), count: 12, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0 },
    { kind: 'burst', name: 'pavers', recipe: recipe([IRON, IRON_DEEP], PAVER), count: 14, tier: 'body', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.05 },
    { kind: 'burst', name: 'ward pulse', recipe: recipe([IRON_WHITE, STEEL], WARD_PULSE), count: 1, tier: 'hero', at: 0.1, every: 0.45, times: 1 },
    { kind: 'burst', name: 'turned blows', recipe: recipe([IRON_WHITE, STEEL, IRON], TURNED), count: 8, tier: 'body', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 1.7, at: 0.3 },
    { kind: 'burst', name: 'mortar grit', recipe: recipe([MORTAR_DUST, STONE], GRIT), count: 12, tier: 'fine', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.5 },
    { kind: 'emit', name: 'kerb dust', arrange: 'rim', radius: 0.95, radiusK: 0.95, outward: 0.2, at: 0.05, rate: 9, dur: 0.8, attack: 0.05, release: 0.3, tier: 'body',
      pops: [{ colors: [LOAM, PALE, MORTAR_DUST], opts: { ...LIP_DUST, size: 0.22, speed: 0.4, drag: 3 }, tier: 'body' }] },
    { kind: 'glow', name: 'held light', r: 1.0, rgb: IRON_GLOW, a: 0.12, dur: 1.0, attack: 0.05, release: 0.5, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// shield.crack — THE ARMOR CRACKS (the follow's sunder)
// ---------------------------------------------------------------------------
// A payoff landed on a ringing body: the white snap where the rim met the
// plate, the plate's iron flung in squares that bounce and lie, a star of
// dark fissures that opens on the ground and STAYS, iron fines, a low puff
// of crack dust. The shield school's read edge, seen.

/** The snap: the white cap of the blow that broke the plate. */
const SNAP: BurstOpts = { ...CAP, size: 0.42, life: 0.15 };

/** A fissure: a dark streak that runs out from the blow along the ground and stays. */
const FISSURE: BurstOpts = {
  shape: 'streak', align: true, speed: 1.5, speedVar: 0.2, drag: 5, life: 4.5, lifeVar: 0.2, size: 0.22, sizeVar: 0.3, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [IRON_DEEP, STONE_DEEP, SHADE], at: [0, 0.4, 0.9], steps: 3 }),
  sizeCurve: curveOf([0, 0.5, 0.15, 1, 1, 1]), alphaCurve: curveOf([0, 1, 0.7, 0.85, 1, 0]),
};

/** A plate: a square of the broken armor flung, tumbling, bouncing, lying. */
const PLATE: BurstOpts = {
  ...CHIP, shape: 'square', speed: 0.9, size: 0.1, life: 2.2, spin: 7, ramp: RAMP_IRON, mark: 'fleck', markLife: 5,
};

export const shieldCrack: EffectDef = {
  id: 'shield.crack',
  name: 'Shield — crack',
  story: 'the armor cracks: a white snap where the rim met the plate → the rim arc bursts open → the plate\'s iron flies in squares that bounce and lie → a star of dark fissures runs out along the ground and stays → iron fines rain, a low puff of crack dust',
  layers: [
    { kind: 'burst', name: 'snap', recipe: recipe(['#ffffff', IRON_WHITE], SNAP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'rim burst', recipe: recipe([IRON_WHITE, STEEL], { ...RIM, size: 0.32, ringWidth: 0.2 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'plates', recipe: recipe([STEEL, IRON, IRON_DEEP], PLATE), count: 6, tier: 'hero' },
    { kind: 'burst', name: 'fissures', recipe: recipe([IRON_DEEP, STONE_DEEP], FISSURE), count: 9, tier: 'hero', at: 0.04 },
    { kind: 'burst', name: 'iron fines', recipe: recipe([STEEL, IRON], { ...GRIT, ramp: RAMP_IRON }), count: 14, tier: 'fine' },
    { kind: 'burst', name: 'crack dust', recipe: recipe([LOAM, PALE, MORTAR_DUST], { ...LIP_DUST, size: 0.24, speed: 0.6 }), count: 5, tier: 'body', arrange: 'disc', radius: 0.2, at: 0.03 },
    { kind: 'glow', name: 'snap light', r: 0.8, rgb: IRON_GLOW, a: 0.2, dur: 0.2, attack: 0.01, release: 0.16, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// shield.doorslab — THE DOOR COMES DOWN (Doorfall's slab)
// ---------------------------------------------------------------------------
// One great stone slab falls flat: its shadow closes on the ground first,
// the slab lands and STAYS, dust crowns out from under its edges, hinge
// bolts fly and bounce, grit rains, a press ring seats it, the dust hangs.

/** The slab: one great flat stone falling from a tile up, seating and staying. */
const SLAB: BurstOpts = {
  shape: 'square', speed: 0, life: 1.9, lifeVar: 0.05, size: 1.05, sizeVar: 0, gravity: 0,
  z: 1.0, vz: -1.5, zg: 8, land: 'settle', layer: 'world', shadow: 0.9,
  ramp: rampOf({ stops: [STONE_LIT, STONE, STONE_SHADE], at: [0, 0.45, 0.9], steps: 3 }), sizeCurve: HOLD,
  alphaCurve: curveOf([0, 1, 0.78, 1, 1, 0]),
};

/** The shadow ahead of the slab: a dark ground square that closes as it falls. */
const SLAB_SHADOW: BurstOpts = {
  shape: 'square', speed: 0, life: 0.36, lifeVar: 0, size: 1.0, sizeVar: 0, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [STONE_DEEP, SHADE], at: [0, 0.9] }),
  sizeCurve: curveOf([0, 0.55, 1, 1]), alphaCurve: curveOf([0, 0.2, 0.9, 0.7, 1, 0]),
};

/** A hinge bolt: iron flung from under the edge, bouncing and lying. */
const BOLT: BurstOpts = { ...PLATE, shape: 'shard', size: 0.08, speed: 1.2, vz: 2.0, life: 2.0 };

export const shieldDoorslab: EffectDef = {
  id: 'shield.doorslab',
  name: 'Shield — doorslab',
  story: 'the door comes down: its shadow closes on the ground → one great slab lands flat and stays → dust crowns out from under its edges → hinge bolts fly, bounce and lie → grit rains → a press ring seats it → the dust hangs over the door',
  layers: [
    { kind: 'burst', name: 'shadow ahead', recipe: recipe([STONE_DEEP, SHADE], SLAB_SHADOW), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'slab', recipe: recipe([STONE_LIT, STONE], SLAB), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'seat', recipe: recipe([MORTAR, STONE], { ...SEAT, size: 0.6, life: 0.4, sizeCurve: curveOf([0, 0.8, 0.5, 1.9, 1, 2.3]) }), count: 1, tier: 'hero', at: 0.35 },
    { kind: 'burst', name: 'dust crown', recipe: recipe([LOAM, PALE, MORTAR_DUST], { ...LIP_DUST, size: 0.3, speed: 1.3, drag: 2.6 }), count: 14, tier: 'body', arrange: 'rim', radius: 0.55, outward: 1.5, at: 0.35 },
    { kind: 'burst', name: 'hinge bolts', recipe: recipe([STEEL, IRON, IRON_DEEP], BOLT), count: 6, tier: 'hero', arrange: 'rim', radius: 0.5, outward: 1.1, at: 0.35 },
    { kind: 'burst', name: 'grit', recipe: recipe([MORTAR, MORTAR_DUST], GRIT), count: 16, tier: 'fine', arrange: 'rim', radius: 0.5, outward: 0.9, at: 0.35 },
    { kind: 'emit', name: 'dust hangs', arrange: 'disc', radius: 0.7, at: 0.45, rate: 8, dur: 1.0, attack: 0.05, release: 0.4, dz: 0.15, tier: 'body',
      pops: [{ colors: [PALE, MORTAR_DUST], opts: { ...LIP_DUST, size: 0.24, speed: 0.25, drag: 3 }, tier: 'body' }] },
    { kind: 'field', name: 'edge shove', field: { kind: 'attract', radius: 1.2, strength: -1.4, dur: 0.35, attack: 0.02, release: 0.15 }, at: 0.35 },
    { kind: 'glow', name: 'stone light', r: 1.0, rgb: STONE_GLOW, a: 0.1, dur: 0.4, attack: 0.02, release: 0.3, at: 0.35 },
  ],
};

// ---------------------------------------------------------------------------
// shield.wheel_road — THE LOOSED RIM (Wheel of Iron's road)
// ---------------------------------------------------------------------------
// The wall thrown spinning: a white cap at the hand, a road of iron glints
// laid along the throw, sparks shed along it that land and prick the dirt,
// and at the far end the rim's own arc snapping open where it bit.

/** A road glint: iron light lying along the throw's line at guard height. */
const ROAD_GLINT: BurstOpts = {
  shape: 'streak', align: true, speed: 0.25, speedVar: 0.4, life: 0.34, lifeVar: 0.25, size: 0.08, sizeVar: 0.3,
  gravity: 0, z: 0.55, vz: 0, zg: 0, layer: 'world', shadow: 0, flicker: 0.5,
  ramp: RAMP_IRON, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

export const shieldWheelRoad: EffectDef = {
  id: 'shield.wheel_road',
  name: 'Shield — wheel road',
  story: 'the loosed rim: a white cap at the hand → a road of iron glints lies along the throw → sparks shed along the road, land and prick the dirt → at the far end the rim\'s arc snaps open where it bit → iron fines hang on the line',
  layers: [
    { kind: 'burst', name: 'hand cap', recipe: recipe(['#ffffff', IRON_WHITE], CAP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'road glints', recipe: recipe([IRON_WHITE, STEEL, IRON], ROAD_GLINT), count: 16, tier: 'body', arrange: 'path', dz: 0.55 },
    { kind: 'burst', name: 'road sparks', recipe: recipe([HOT_WHITE, HEAT], { ...SPARK, speed: 0.9, vz: 0.9, zg: 8 }), count: 8, tier: 'hero', arrange: 'path', dz: 0.5, at: 0.02 },
    { kind: 'burst', name: 'far rim arc', recipe: recipe([IRON_WHITE, STEEL], { ...RIM, size: 0.3, ringWidth: 0.18 }), count: 1, tier: 'hero', arrange: 'far', dz: 0.55, at: 0.06 },
    { kind: 'burst', name: 'far shear', recipe: recipe([IRON_WHITE, STEEL, IRON], { ...SHEAR, speed: 2.2 }), count: 8, tier: 'body', arrange: 'far', dz: 0.55, at: 0.06 },
    { kind: 'burst', name: 'road fines', recipe: recipe([HEAT, EMBER], { ...SPARK, size: 0.035, life: 0.4, trail: 0, speed: 0.5, vz: 0.5 }), count: 12, tier: 'fine', arrange: 'path', dz: 0.5 },
    { kind: 'glow', name: 'hand light', r: 0.6, rgb: IRON_GLOW, a: 0.16, dur: 0.16, attack: 0.01, release: 0.12, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// shield.wall_swing — THE WALL SWUNG (Shield Bash, the rush's meeting)
// ---------------------------------------------------------------------------
// "Swing the wall itself": the shield's FACE — a broad iron slab — sweeps
// through the arc at guard height with a wake of iron glints behind it, the
// rim arc snaps open where it lands, a shove field throws the near dust
// outward, iron shards fly forward, bounce and lie, hot sparks prick the
// dirt, and a dust skirt rolls out at the feet. Longer-lived than the rim
// spark: the swing is SEEN, not just its strike.

/** The face: a broad iron slab driving down the aim at guard height. */
const FACE: BurstOpts = {
  shape: 'square', align: true, speed: 2.4, speedVar: 0.05, drag: 3.5, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.05,
  gravity: 0, z: 0.5, vz: 0, zg: 0, layer: 'world', shadow: 0.5,
  ramp: rampOf({ stops: [IRON_WHITE, STEEL, IRON, IRON_DEEP], at: [0, 0.3, 0.7, 0.95], steps: 4 }),
  sizeCurve: curveOf([0, 0.7, 0.2, 1, 0.8, 1, 1, 0.75]), alphaCurve: curveOf([0, 1, 0.75, 0.95, 1, 0]),
};

/** The wake: iron glints streaming off the face's trailing edge. */
const WAKE: BurstOpts = {
  ...ROAD_GLINT, speed: 1.2, speedVar: 0.5, life: 0.4, lifeVar: 0.3, size: 0.07, sizeVar: 0.3,
};

/** A dust skirt at the feet: low puffs rolling out under the swing. */
const SKIRT: BurstOpts = { ...LIP_DUST, size: 0.24, speed: 0.8, drag: 2.8, life: 1.0 };

export const shieldWallSwing: EffectDef = {
  id: 'shield.wall_swing',
  name: 'Shield — wall swing',
  story: 'the wall swung: the shield\'s broad iron face sweeps through the arc at guard height → a wake of iron glints streams off its trailing edge → the rim arc snaps open where it lands and a shove throws the dust out → iron shards fly forward, bounce and lie → hot sparks prick the dirt → a dust skirt rolls out at the feet',
  layers: [
    { kind: 'burst', name: 'face', recipe: recipe([IRON_WHITE, STEEL], FACE), count: 1, tier: 'hero', arrange: 'cone', spread: 0 },
    { kind: 'burst', name: 'wake', recipe: recipe([IRON_WHITE, STEEL, IRON], WAKE), count: 10, tier: 'body', arrange: 'cone', dirOff: Math.PI, spread: 0.5, every: 0.08, times: 3 },
    { kind: 'burst', name: 'rim arc', recipe: recipe([IRON_WHITE, STEEL], { ...RIM, size: 0.4, life: 0.42, ringWidth: 0.18 }), count: 1, tier: 'hero', along: 0.6, at: 0.14 },
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 1.3, strength: -1.6, dur: 0.35, attack: 0.02, release: 0.15 }, along: 0.6, at: 0.14 },
    { kind: 'burst', name: 'iron shards', recipe: recipe([STEEL, IRON, IRON_DEEP], { ...PLATE, size: 0.09, speed: 1.4, vz: 1.8 }), count: 6, tier: 'hero', arrange: 'cone', spread: 0.7, along: 0.6, at: 0.14 },
    { kind: 'burst', name: 'hot sparks', recipe: recipe([HOT_WHITE, HEAT], SPARK), count: 6, tier: 'hero', arrange: 'cone', spread: 0.8, along: 0.6, at: 0.14 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([LOAM, PALE, MORTAR_DUST], SKIRT), count: 8, tier: 'body', arrange: 'rim', radius: 0.35, outward: 0.9, at: 0.05 },
    { kind: 'glow', name: 'face light', r: 0.9, rgb: IRON_GLOW, a: 0.18, dur: 0.4, attack: 0.02, release: 0.25, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// shield.grind — THE RIM TURNS (Grindstone's beats)
// ---------------------------------------------------------------------------
// "Set the rim against them and turn": one beat of the grind — the rim as a
// turning iron ring at guard height that lives the whole beat, a STREAM of
// hot sparks torn off the contact for the beat's length (an emitter, not a
// burst), iron curls shed off the plate that land and lie, grit off the
// stone, a flickering hot glow, scorch flecks where the sparks fell.

/** The turning rim: a thick iron ring that breathes out-of-round for the beat. */
const TURNING_RIM: BurstOpts = {
  ...RIM, size: 0.42, life: 0.7, lifeVar: 0.05, ringWidth: 0.16,
  sizeCurve: curveOf([0, 0.9, 0.2, 1.06, 0.4, 0.96, 0.6, 1.05, 0.8, 0.97, 1, 1]), alphaCurve: curveOf([0, 1, 0.7, 0.9, 1, 0]),
};

/** A stream spark: torn off the contact, thrown down the aim, landing hot. */
const STREAM_SPARK: BurstOpts = { ...SPARK, speed: 2.6, speedVar: 0.5, life: 0.45, vz: 1.0, zg: 8, size: 0.06 };

/** An iron curl: a shaving off the plate, tumbling, landing, lying. */
const CURL: BurstOpts = {
  ...PLATE, shape: 'shard', size: 0.07, sizeVar: 0.3, speed: 1.6, speedVar: 0.5, vz: 1.8, zg: 7, life: 1.6, spin: 12, ramp: RAMP_HEAT, mark: 'fleck', markLife: 3,
};

export const shieldGrind: EffectDef = {
  id: 'shield.grind',
  name: 'Shield — grind',
  story: 'the rim turns: a thick iron ring breathes out-of-round at guard height for the whole beat → a stream of hot sparks tears off the contact down the aim → iron curls shed off the plate, tumble, land and lie → grit rains off the stone → a hot glow flickers under the work → scorch flecks where the sparks fell',
  layers: [
    { kind: 'burst', name: 'turning rim', recipe: recipe([IRON_WHITE, STEEL], TURNING_RIM), count: 1, tier: 'hero', along: 0.5 },
    { kind: 'emit', name: 'spark stream', arrange: 'cone', spread: 0.55, along: 0.5, dz: 0.5, rate: 34, dur: 0.6, attack: 0.03, release: 0.15, tier: 'hero',
      pops: [{ colors: [HOT_WHITE, HEAT], opts: STREAM_SPARK, tier: 'hero' }, { colors: [HEAT, EMBER], opts: { ...STREAM_SPARK, size: 0.035, trail: 0 }, tier: 'fine' }] },
    { kind: 'burst', name: 'iron curls', recipe: recipe([HOT_WHITE, HEAT, IRON], CURL), count: 4, tier: 'hero', arrange: 'cone', spread: 1.1, along: 0.5, every: 0.2, times: 2 },
    { kind: 'burst', name: 'grit', recipe: recipe([MORTAR_DUST, STONE], GRIT), count: 10, tier: 'fine', arrange: 'cone', spread: 1.0, along: 0.5 },
    { kind: 'burst', name: 'cap', recipe: recipe(['#ffffff', IRON_WHITE], { ...CAP, size: 0.26 }), count: 1, tier: 'body', along: 0.5, every: 0.22, times: 2 },
    { kind: 'glow', name: 'hot light', r: 0.7, rgb: '255, 200, 150', a: 0.2, dur: 0.65, attack: 0.02, release: 0.2, flicker: 0.5, dz: 0.4, along: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// shield.millwheel — THE WALL TURNS (Millwall's beats)
// ---------------------------------------------------------------------------
// "The wall turns like a mill wheel and throws the water back": one beat of
// the turn — stone blocks ride the rim on an orbit (the wheel's paddles),
// each throwing a tangent spray of pale water-glints and grit outward, a
// dark wheel-track ring turns on the ground, chips fly off the paddles and
// lie, a mortar dust stands at the rim, a stone light rides the turn.

/** A paddle: a stone block riding the rim, heading down the tangent. */
const PADDLE: BurstOpts = {
  shape: 'square', align: true, speed: 0.3, speedVar: 0.15, drag: 2.5, life: 0.55, lifeVar: 0.15, size: 0.22, sizeVar: 0.15,
  gravity: 0, z: 0.35, vz: 0, zg: 0, layer: 'world', shadow: 0.5,
  ramp: RAMP_STONE, sizeCurve: HOLD, alphaCurve: curveOf([0, 1, 0.7, 0.9, 1, 0]),
};

/** Thrown water: pale glints flung off the paddles, arcing and splatting. */
const THROWN: BurstOpts = {
  shape: 'drop', speed: 1.9, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.06, sizeVar: 0.3, gravity: 0,
  z: 0.4, vz: 1.2, zg: 8, land: 'splat', layer: 'world', shadow: 0, flicker: 0.3,
  ramp: rampOf({ stops: ['#ffffff', '#dceef6', '#9cc4d8', '#5f8ea6'], at: [0, 0.25, 0.6, 0.95], steps: 4 }),
  sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'smear', markLife: 2,
};

/** The wheel track: a dark ring turning on the ground under the paddles. */
const TRACK: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.8, lifeVar: 0.05, size: 0.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [STONE_SHADE, STONE_DEEP, SHADE], at: [0, 0.5, 0.9] }),
  sizeCurve: curveOf([0, 1.9, 1, 2.0]), alphaCurve: curveOf([0, 0.7, 0.6, 0.55, 1, 0]), ringWidth: 0.1,
};

export const shieldMillwheel: EffectDef = {
  id: 'shield.millwheel',
  name: 'Shield — millwheel',
  story: 'the wall turns: stone paddles ride the rim on an orbit → each throws a tangent spray of water-glints that arc, splat and smear → chips fly off the paddles and lie → a dark wheel-track turns on the ground → mortar dust stands at the rim → a stone light rides the turn',
  layers: [
    { kind: 'burst', name: 'wheel track', recipe: recipe([STONE_SHADE, STONE_DEEP], TRACK), count: 1, tier: 'hero', radiusK: 1 },
    { kind: 'emit', name: 'paddles', arrange: 'orbit', radius: 1.0, radiusK: 1.0, dz: 0.35, rate: 14, dur: 0.7, attack: 0.02, release: 0.2, orbitSpeed: 5.5, tangent: true, tier: 'hero',
      pops: [{ colors: [STONE_LIT, STONE, STONE_SHADE], opts: PADDLE, tier: 'hero' }] },
    { kind: 'emit', name: 'thrown water', arrange: 'orbit', radius: 1.0, radiusK: 1.0, dz: 0.4, rate: 30, dur: 0.7, attack: 0.02, release: 0.2, orbitSpeed: 5.5, tangent: true, tier: 'body',
      pops: [{ colors: ['#ffffff', '#dceef6'], opts: THROWN, tier: 'body' }, { colors: ['#dceef6', '#9cc4d8'], opts: { ...THROWN, size: 0.04 }, tier: 'fine' }] },
    { kind: 'burst', name: 'chips', recipe: recipe([STONE, STONE_SHADE], { ...CHIP, life: 1.8 }), count: 6, tier: 'hero', arrange: 'rim', radius: 1.0, radiusK: 1.0, outward: 0.9, at: 0.1 },
    { kind: 'burst', name: 'rim dust', recipe: recipe([PALE, MORTAR_DUST], { ...LIP_DUST, size: 0.18, drag: 3.4, speed: 0.5 }), count: 6, tier: 'body', arrange: 'rim', radius: 0.95, radiusK: 0.95, outward: 0.5, at: 0.05 },
    { kind: 'glow', name: 'stone light', r: 1.1, rgb: STONE_GLOW, a: 0.1, dur: 0.7, attack: 0.03, release: 0.3, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// The plans — THE VOICE (THE MASTERED HAND, Phase 4)
// ---------------------------------------------------------------------------
// Every art in three acts on the NEW mechanic: the opener brands (the bell
// rings the yard staggered; the shout turns it), the payoff detonates on a
// follow (`onFollow`: the armor CRACKS — shield.crack — and the wider door,
// the fuller sun), the channel crescendos on its last beat (`onFinale`), and
// the ground the wall keeps stands as `<art>:aftermath` (shield.held_ground
// re-spoken every second, frost or fire beside it where the art says so).

const HELD_GROUND_STANDS: AbilityPlan = {
  cues: [
    { id: 'shield.held_ground', scale: 1.0, radiusK: 1 },
    { id: 'shield.held_ground', scale: 0.7, radiusK: 1, every: 1.0 },
  ],
};

export const SHIELD_PLANS: Record<string, AbilityPlan> = {
  // ---- the school (fxSigsShield.ts) ---------------------------------------

  // PAYOFF: the wall swung — the shield's own iron face sweeps the arc and lands with the rim's snap, the ground takes the press; on a ringing body (follow) the armor CRACKS and the bell answers.
  shield_bash: {
    cues: [{ id: 'shield.wall_swing', scale: 1.2 }, { id: 'dust.slam', scale: 0.6, at: 0.15 }],
    onFollow: [{ id: 'shield.crack', scale: 1.2, at: 0.04 }, { id: 'shield.brass', scale: 0.5, radiusK: 0.6, at: 0.02 }],
  },
  // ANSWER, the `wall` word: a gold ward stands where the feet plant and TWO courses of stone are laid around them — the wall is set.
  set_the_wall: { cues: [{ id: 'arcane.sigil', scale: 0.8 }, { id: 'shield.masonry', scale: 0.9, at: 0.1 }, { id: 'shield.masonry', scale: 0.6, at: 0.32 }] },
  // ANSWER: the road is plowed along the chord; at the drive's end the stop-stamp and the rim's spark; on bodies that turned (follow) the meeting CRACKS them.
  shield_rush: {
    cues: [
      { id: 'dust.gouge', scale: 0.8 },
      { id: 'dust.slam', scale: 0.7, atFar: true, at: 0.55 },
      { id: 'shield.wall_swing', scale: 0.9, atFar: true, at: 0.5 },
    ],
    onFollow: [{ id: 'shield.crack', scale: 0.9, atFar: true, at: 0.57 }, { id: 'shield.brass', scale: 0.55, radiusK: 0.6, atFar: true, at: 0.55 }],
  },
  // OPENER, the `taunt` word: a shout with iron in it — the brass walks the yard to the taunt's reach, the rim sparks as it leaves, and the echo carries to the back of the yard.
  draw_iron: { cues: [{ id: 'shield.brass', scale: 1.3, radiusK: 1 }, { id: 'shield.rim_spark', scale: 0.6 }, { id: 'shield.brass', scale: 0.6, radiusK: 1.2, at: 0.9 }] },
  // ANSWER: the iron sky — the ward goes up over the shoulders, one beat of weather strikes the pitch and gutters off, and a blow is soaked at the rim.
  shield_roof: { cues: [{ id: 'arcane.sigil', scale: 0.7, z: 0.9 }, { id: 'water.rain', scale: 0.45, radiusK: 0.9, at: 0.25 }, { id: 'shield.rim_spark', scale: 0.45, at: 0.55 }] },
  // ANSWER, the `wall` word: the mirror angle — a small ward, then ONE blow is shown the trick: the rim sparks and a little heat drips off the facet's low corner.
  turned_blow: { cues: [
    { id: 'arcane.sigil', scale: 0.6 },
    { id: 'shield.rim_spark', scale: 1.1, at: 0.3 },
    { id: 'fire.burst', scale: 0.3, at: 0.34 },
  ] },
  // PAYOFF: the rim driven home slams the earth and the ground's own merlons stand up at the lip; after the toll, the anchor or the turned wall (follow) the yard CRACKS with them and the bell answers.
  rampart_break: {
    cues: [
      { id: 'dust.slam', scale: 1.5, radiusK: 1 },
      { id: 'shield.merlons', scale: 1.4, radiusK: 1, at: 0.08 },
      { id: 'dust.billow', scale: 0.6, at: 0.5 },
    ],
    onFollow: [{ id: 'shield.crack', scale: 1.5, at: 0.1 }, { id: 'shield.brass', scale: 0.7, radiusK: 0.8, at: 0.05 }],
  },
  // PAYOFF: the loosed rim — the wheel lays an iron road down the throw, bites the mark with a rim-spark star and a small dent, and comes HOME (it remembers the arm): the road re-laid back and the catch's spark at the hand at ~1.4 s.
  wheel_of_iron: { cues: [
    { id: 'shield.wheel_road', scale: 1.1 },
    { id: 'shield.rim_spark', scale: 1.2, atFar: true, at: 0.3 },
    { id: 'dust.slam', scale: 0.45, atFar: true, at: 0.32 },
    { id: 'shield.rim_spark', scale: 1.0, at: 1.4 },
  ] },
  // OPENER, the `wall` word, a 7-second field: THE HELD GROUND itself — the kerb course laid and re-laid every second, a cold breath on the line (it chills what crosses), the boots plant once.
  hold_the_line: { cues: [
    { id: 'shield.held_ground', scale: 1.1, radiusK: 1 },
    { id: 'shield.held_ground', scale: 0.7, radiusK: 1, every: 1.0 },
    { id: 'frost.fog', scale: 0.35, radiusK: 0.8, at: 0.3, every: 2.0 },
    { id: 'dust.kick', scale: 0.5 },
  ] },
  // CROWN: the great stand — the bell rings the yard staggered, the earth slams and the merlons stand up at the ring, and the gold ward opens over the ground that is now yours.
  unbroken: { cues: [
    { id: 'shield.brass', scale: 1.6, radiusK: 1 },
    { id: 'dust.slam', scale: 1.3, radiusK: 1, at: 0.05 },
    { id: 'shield.merlons', scale: 1.3, radiusK: 1, at: 0.1 },
    { id: 'arcane.sigil', scale: 1.3, at: 0.3 },
  ] },
  // The crown's stand (8 s): the held ground at its heaviest, the cold on the floor, the gold ward re-lit — armored, shielded, turning every blow.
  'unbroken:aftermath': { cues: [
    { id: 'shield.held_ground', scale: 1.3, radiusK: 1 },
    { id: 'shield.held_ground', scale: 0.8, radiusK: 1, every: 1.0 },
    { id: 'frost.fog', scale: 0.4, radiusK: 0.8, at: 0.4, every: 2.0 },
    { id: 'arcane.sigil', scale: 0.7, radiusK: 0.8, at: 0.2, every: 3.0 },
  ] },
  // OPENER, the `taunt` word: the champion's ring — each pulse's brass wave crosses the yard and plants its own ring of posts at the rim; the dare carries.
  champions_wall: { cues: [{ id: 'shield.brass', scale: 1.0, radiusK: 1 }, { id: 'shield.merlons', scale: 0.7, radiusK: 1, at: 0.1 }] },
  // The rim spark: the block law's own voice, cheap enough to say often; the wire's radius already carries how much was blocked.
  shield_block: { cues: [{ id: 'shield.rim_spark', scale: 0.55 }] },

  // ---- the second breath (fxSigsShieldBreath.ts) --------------------------

  // OPENER, the `stagger` word: the bell — struck iron rings the yard, the shove throws the ring back a step, and the echo answers a second on while they stand ringing.
  iron_toll: { cues: [
    { id: 'shield.brass', scale: 1.5, radiusK: 1 },
    { id: 'shield.rim_spark', scale: 1.0 },
    { id: 'dust.slam', scale: 0.5, radiusK: 0.8, at: 0.04 },
    { id: 'shield.brass', scale: 0.7, radiusK: 1.1, at: 0.95 },
  ] },
  // SUSTAIN: each turn the rim TURNS on them — a beat-long stream of sparks and iron curls off the plate; braced on a set wall (follow) a course is laid under the grind; the LAST TURN (finale) takes the plate clean off.
  grindstone: {
    cues: [{ id: 'shield.grind', scale: 1.1 }, { id: 'dust.kick', scale: 0.45, at: 0.05 }],
    onFollow: [{ id: 'shield.masonry', scale: 0.7, at: 0.1 }],
    onFinale: [{ id: 'shield.crack', scale: 1.3, at: 0.04 }, { id: 'dust.slam', scale: 0.6, at: 0.06 }],
  },
  // PAYOFF: the door comes down — the slab falls flat and stays, the earth slams under it, the dust hangs; on bodies that turned or stagger (follow) the frame is WIDER and the armor cracks under it.
  doorfall: {
    cues: [
      { id: 'shield.doorslab', scale: 1.3, radiusK: 1 },
      { id: 'dust.slam', scale: 1.1, radiusK: 1, at: 0.36 },
      { id: 'dust.billow', scale: 0.5, at: 0.7 },
    ],
    onFollow: [{ id: 'shield.merlons', scale: 1.0, radiusK: 1.25, at: 0.4 }, { id: 'shield.crack', scale: 0.9, at: 0.38 }],
  },
  // Stand on the Door (rank IV): where it fell it lies — the held ground re-laid on the slab for as long as you keep it.
  'doorfall:aftermath': HELD_GROUND_STANDS,
  // SUSTAIN: the portcullis — each breath the gate clangs home at the near mouth, cold runs the lane, rime rails freeze at the far mouth; the LAST breath (finale) SLAMS the gate: a frost column and a slab at the far mouth.
  held_gate: {
    cues: [
      { id: 'shield.masonry', scale: 0.6 },
      { id: 'frost.breath', scale: 0.8, at: 0.05 },
      { id: 'frost.shards', scale: 0.5, atFar: true, at: 0.15 },
    ],
    onFinale: [{ id: 'frost.pillar', scale: 1.0, atFar: true, at: 0.05 }, { id: 'shield.doorslab', scale: 0.8, atFar: true, at: 0.02 }],
  },
  // The frost stays on the lane: a fog planted at the far mouth and re-breathed every second, rime rails standing once.
  'held_gate:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.8, radiusK: 1 },
    { id: 'frost.shards', scale: 0.45, radiusK: 0.9, at: 0.1 },
    { id: 'frost.fog', scale: 0.5, radiusK: 1, every: 1.0 },
  ] },
  // PAYOFF: noon turned loose — the brass ring is the wavefront, radiance stands in it, fire takes the yard; bodies that turned (follow) take it FULL in the face: a second, hotter burst and the rim's spark.
  sunbrass: {
    cues: [
      { id: 'shield.brass', scale: 1.5, radiusK: 1 },
      { id: 'arcane.bloom', scale: 0.7, at: 0.05 },
      { id: 'fire.burst', scale: 0.8, radiusK: 0.8, at: 0.1 },
    ],
    onFollow: [{ id: 'fire.burst', scale: 1.0, radiusK: 1, at: 0.14 }, { id: 'shield.rim_spark', scale: 1.2, at: 0.02 }],
  },
  // The ground keeps burning where the sun fell: the ember floor planted and re-lit every second.
  'sunbrass:aftermath': { cues: [
    { id: 'fire.floor', scale: 0.9, radiusK: 1 },
    { id: 'fire.floor', scale: 0.5, radiusK: 1, every: 1.0 },
  ] },
  // SUSTAIN: the wheel turns — each beat stone paddles ride the rim and throw the water back off their tangents; on bodies that answered the shout (follow) the thrown water lands as a full splash; the LAST TURN (finale) throws hardest: the earth slams, the merlons stand, the splash is whole.
  millwall: {
    cues: [{ id: 'shield.millwheel', scale: 1.1, radiusK: 1 }, { id: 'dust.slam', scale: 0.4, radiusK: 0.5, at: 0.05 }],
    onFollow: [{ id: 'water.splash', scale: 0.8, radiusK: 0.9, at: 0.1 }],
    onFinale: [{ id: 'dust.slam', scale: 1.4, radiusK: 1.1 }, { id: 'shield.merlons', scale: 1.2, radiusK: 1.15, at: 0.06 }, { id: 'water.splash', scale: 1.1, radiusK: 1, at: 0.1 }],
  },
  // OPENER, the `stagger` word: the anchor — the launch kicks, the anchor lands 8 tiles on and PARTS the sea, and the bell rings the ring it lands in staggered; cold fog in the lane.
  anchorfall: { cues: [
    { id: 'dust.kick', scale: 0.6 },
    { id: 'water.splash', scale: 1.6, radiusK: 1, atFar: true, at: 0.57 },
    { id: 'shield.brass', scale: 1.0, radiusK: 1, atFar: true, at: 0.6 },
    { id: 'frost.fog', scale: 0.5, radiusK: 0.5, atFar: true, at: 0.9 },
  ] },
  // The Parted Sea (rank IV): where the anchor landed the water stays parted — a frost sheet planted, rime shards standing, re-breathed every second.
  'anchorfall:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.8, radiusK: 1 },
    { id: 'frost.shards', scale: 0.5, radiusK: 0.9, at: 0.05 },
    { id: 'frost.fog', scale: 0.5, radiusK: 1, every: 1.0 },
  ] },
  // SUSTAIN: the mortar tap — every strike a brick laid, dust kicked; from a set wall (follow) a second course; the LAST strike (finale) is Ground Taken: the merlons stand up and the earth slams.
  patient_wall: {
    cues: [{ id: 'shield.masonry', scale: 1.4, radiusK: 0.6 }, { id: 'shield.rim_spark', scale: 0.9, at: 0.05 }, { id: 'dust.kick', scale: 0.6, at: 0.05 }],
    onFollow: [{ id: 'shield.masonry', scale: 0.6, at: 0.18 }],
    onFinale: [{ id: 'shield.merlons', scale: 1.1, radiusK: 1, at: 0.04 }, { id: 'dust.slam', scale: 0.8, radiusK: 0.8 }],
  },
  // The ground it took is kept: the held ground re-laid every second, armor while you stand on it.
  'patient_wall:aftermath': HELD_GROUND_STANDS,
  // PAYOFF: the planted standard — the pole strikes, a column of fire stacks up over the ring, radiance stands in the court, fire takes the rim; planted on a set wall (follow) it burns WIDER and the merlons stand at the wider rim.
  standing_sun: {
    cues: [
      { id: 'dust.slam', scale: 0.6 },
      { id: 'arcane.sigil', scale: 1.2, radiusK: 0.8 },
      { id: 'fire.pillar', scale: 0.9, at: 0.05 },
      { id: 'fire.floor', scale: 0.7, radiusK: 0.9, at: 0.15 },
    ],
    onFollow: [{ id: 'fire.floor', scale: 0.8, radiusK: 1.2, at: 0.25 }, { id: 'shield.merlons', scale: 0.8, radiusK: 1.2, at: 0.1 }],
  },
  // Where it stands the day holds: the held ground under a burning floor, the gold ward re-lit — the ground burns them and armors you.
  'standing_sun:aftermath': { cues: [
    { id: 'shield.held_ground', scale: 1.0, radiusK: 1 },
    { id: 'fire.floor', scale: 0.6, radiusK: 1, at: 0.1, every: 1.0 },
    { id: 'shield.held_ground', scale: 0.6, radiusK: 1, at: 0.5, every: 1.0 },
    { id: 'arcane.sigil', scale: 0.6, radiusK: 0.8, at: 0.3, every: 2.0 },
  ] },
  // SUSTAIN: the cold keep — each breath the cold garrisons the rim in spears and rimes their feet; the LAST breath (finale) freezes the court HARD: the frost nova and a column at the heart.
  winterhold: {
    cues: [{ id: 'frost.shards', scale: 0.9, radiusK: 1 }, { id: 'frost.fog', scale: 0.35, radiusK: 0.3, at: 0.2 }],
    onFinale: [{ id: 'frost.nova', scale: 1.3, radiusK: 1 }, { id: 'frost.pillar', scale: 0.8, at: 0.1 }],
  },
  // The frost that stays is your keep: a frost court planted, the held ground's kerb inside it, both re-breathed every second — armor and turned blows while you stand in it.
  'winterhold:aftermath': { cues: [
    { id: 'frost.fog', scale: 0.8, radiusK: 1 },
    { id: 'shield.held_ground', scale: 0.9, radiusK: 1, at: 0.1 },
    { id: 'frost.fog', scale: 0.5, radiusK: 1, every: 1.0 },
    { id: 'shield.held_ground', scale: 0.6, radiusK: 1, at: 0.5, every: 1.0 },
  ] },
};

export const SHIELD_EFFECTS: EffectDef[] = [shieldRimSpark, shieldMasonry, shieldMerlons, shieldBrass, shieldHeldGround, shieldCrack, shieldDoorslab, shieldWheelRoad, shieldWallSwing, shieldGrind, shieldMillwheel];
