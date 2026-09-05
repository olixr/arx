/**
 * RELICS — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in RELICS_EFFECTS and register through the
 * library index.
 *
 * A relic is an ancient tool with one perfected trick, and its voice
 * must say the trick: the fire door shows the lane that burns, the
 * bell's clapper is a real bolt, the raised floor slams as earth. Where
 * the library speaks the material (fire, storm, dust, frost, shadow,
 * arcane, venom, blood) the plan cues it; where the relic's matter is
 * its own — the tapped spring, the leaves that cover a trap, straw,
 * riverbed stone, briar, bone, and the four pack answers — the effect
 * is authored here under the library's laws (≥4 named layers of ≥2
 * kinds, a hero anchor, hard edges, budgets, residue where the matter
 * has weight).
 *
 * THE SUMMON LAW holds on the wire: a summon is one 500 ms ceremony, so
 * summons never carry an `every` and every summon cue sets its own
 * scale — the influence radius (a decoy draws from 5 tiles) must never
 * inflate the voice.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';

// ---------------------------------------------------------------------------
// Shared curves
// ---------------------------------------------------------------------------

const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST_A = curveOf('mist');
const BLOOM = curveOf('bloom');
const SWELL = curveOf('swell');
const FLARE = curveOf('flare');
/** A settled grain: holds, lets go only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.85, 1, 1, 0]);
/** A ring racing out flat on the ground. */
const RING_OUT = curveOf([0, 0.4, 0.5, 2.6, 1, 3.4]);
const RING_A = curveOf([0, 1, 0.5, 0.7, 1, 0]);

// ---------------------------------------------------------------------------
// THE TAPPED SPRING — healing_totem (VERDANT: the totem taps a water
// table of green; upwelling rings surface and RISE as they fade; a
// clover rim marks the heal's true circle and stays with the stand)
// ---------------------------------------------------------------------------

const V_CORE = '#eaffd8';
const V_MID = '#7ac46a';
const V_DEEP = '#3a6a34';
const V_SPARK = '#c8e89a';
const V_GLOW = '140, 208, 120';

const RAMP_GREEN = rampOf({ stops: [V_CORE, V_SPARK, V_MID, V_DEEP], at: [0, 0.3, 0.65, 0.95], steps: 5 });

/** An upwelling ring: born on the dirt, rising as it widens and thins. */
const WELL_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.1, lifeVar: 0.08, size: 0.5, sizeVar: 0.03, gravity: 0,
  z: 0.02, vz: 0.34, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [V_CORE, V_SPARK, V_MID], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.6, 0.5, 1.4, 1, 1.9]), alphaCurve: curveOf([0, 0.9, 0.55, 0.7, 1, 0]),
};

/** Clover: a small ground grain that lies on the rim for the stand. */
const CLOVER: BurstOpts = {
  shape: 'mote', speed: 0.03, life: 8.5, lifeVar: 0.12, size: 0.055, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [V_SPARK, V_MID, V_DEEP], at: [0, 0.5, 0.9] }),
  sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The damp ring: a wet band on the ground at the true radius. */
const DAMP: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 6.5, lifeVar: 0.15, size: 0.3, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [V_MID, V_DEEP] }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.1, 0.3, 0.8, 0.3, 1, 0]),
};

/** Motes pushed up out of the spring, riding the lift. */
const UPWELL: BurstOpts = {
  shape: 'mote', speed: 0.12, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.07, sizeVar: 0.3, gravity: 0,
  z: 0.02, vz: 0.5, zg: 0, mass: 1.2, layer: 'world', shadow: 0, flicker: 0.25,
  ramp: RAMP_GREEN, sizeCurve: BLOOM, alphaCurve: MIST_A,
  wave: 'sine', waveHz: 1.2, waveAmp: 0.2,
};

/** Spring water: pale drops thrown low that splat and leave wet flecks. */
const SPRING_DROP: BurstOpts = {
  shape: 'drop', speed: 0.5, speedVar: 0.6, life: 1.4, size: 0.05, sizeVar: 0.3, gravity: 0,
  vz: 1.2, zg: 6, land: 'splat', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [V_CORE, V_SPARK, V_MID], at: [0, 0.4, 0.85] }), sizeCurve: HOLD,
};

export const relicsSpring: EffectDef = {
  id: 'relics.spring',
  name: 'Relics — tapped spring',
  story: 'the totem taps a water table of green: upwelling rings surface one after another and rise as they fade → motes ride the push up → spring water splats and wets the dirt → a clover rim and a damp band mark the true circle and stay for the stand',
  layers: [
    { kind: 'field', name: 'the push', field: { kind: 'lift', radius: 1.1, strength: 1.3, dur: 2.4, height: 1.3, attack: 0.05, release: 0.6 } },
    { kind: 'burst', name: 'upwelling rings', recipe: recipe([V_CORE, V_SPARK], WELL_RING), count: 1, tier: 'hero', every: 0.42, times: 4 },
    { kind: 'burst', name: 'clover rim', recipe: recipe([V_SPARK, V_MID], CLOVER), count: 16, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1 },
    { kind: 'burst', name: 'damp band', recipe: recipe([V_MID, V_DEEP], DAMP), count: 10, tier: 'body', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.1 },
    { kind: 'emit', name: 'upwell', arrange: 'disc', radius: 0.3, rate: 14, dur: 2.2, attack: 0.1, release: 0.6, tier: 'fine',
      pops: [{ colors: [V_CORE, V_SPARK, V_MID], opts: UPWELL, tier: 'fine' }] },
    { kind: 'burst', name: 'spring water', recipe: recipe([V_CORE, V_SPARK], SPRING_DROP), count: 6, tier: 'body', arrange: 'disc', radius: 0.2, at: 0.15, every: 0.5, times: 2 },
    { kind: 'glow', name: 'green light', r: 1.3, rgb: V_GLOW, a: 0.18, dur: 2.6, attack: 0.2, release: 0.9, flicker: 0.1, radiusK: 0.6 },
  ],
};

// ---------------------------------------------------------------------------
// THE COVERED WORK — snare_trap (tan leaf litter blows over the set
// jaws until nothing shows; three leaf grains stay — the only hint)
// ---------------------------------------------------------------------------

const L_PALE = '#c8b06a';
const L_MID = '#a08a4a';
const L_DARK = '#6a5426';
const L_GREEN = '#3a6a34';
const L_LOAM = '#8a6f4d';

/** The leaf that blows: a shard riding the wind, settling where it stalls. */
const LEAF: BurstOpts = {
  shape: 'shard', speed: 0.3, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.07, sizeVar: 0.3, gravity: 0,
  z: 0.3, vz: 0.25, zg: 0.8, mass: 1.8, drag: 1.1, spin: 6, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [L_PALE, L_MID, L_DARK], at: [0, 0.4, 0.85], steps: 4 }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/** Slips skidding across the ground along the wind. */
const SLIP: BurstOpts = {
  shape: 'streak', align: true, speed: 2.0, speedVar: 0.4, life: 0.9, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, drag: 2.6, layer: 'ground', ramp: rampOf({ stops: [L_PALE, L_MID], at: [0, 0.6] }), alphaCurve: FADE_LATE,
};

/** The three that stay: ground grains laid over the hidden work. */
const THE_THREE: BurstOpts = {
  shape: 'shard', speed: 0.02, life: 9.5, lifeVar: 0.08, size: 0.065, sizeVar: 0.15, gravity: 0, spin: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [L_MID, L_DARK] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The jaws set: one low breath of loam as the anchor pin goes in. */
const SET_PUFF: BurstOpts = {
  shape: 'blob', speed: 0.5, speedVar: 0.4, life: 0.7, lifeVar: 0.2, size: 0.24, sizeVar: 0.2, gravity: 0, drag: 2.4,
  z: 0.03, vz: 0.25, zg: 0.9, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [L_LOAM, L_MID, L_PALE], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: curveOf([0, 0.8, 0.3, 1.1, 1, 0.7]), alphaCurve: curveOf([0, 0.9, 0.5, 0.7, 1, 0]),
};

/** Leaf dust sifting down after the drift. */
const LEAF_DUST: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 1.4, lifeVar: 0.3, size: 0.04, sizeVar: 0.3, gravity: 0, drag: 1.2,
  z: 0.4, vz: 0.1, zg: 0.7, mass: 0.9, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [L_PALE, L_MID], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The wind the leaves ride — blows from the east across the work. */
const COVER_WIND = 2.5;

export const relicsLeafCover: EffectDef = {
  id: 'relics.leaf_cover',
  name: 'Relics — covered work',
  story: 'the jaws set with one breath of loam → a wind rises and leaves blow over the work in two drifts, slips skidding on the ground under them → leaf dust sifts down → the leaves settle until nothing shows; exactly three stay over the hidden trap',
  layers: [
    { kind: 'field', name: 'the wind', field: { kind: 'wind', radius: 1.7, strength: 1.5, dur: 1.3, attack: 0.06, release: 0.35, dir: COVER_WIND } },
    { kind: 'burst', name: 'jaws set', recipe: recipe([L_LOAM, L_MID], SET_PUFF), count: 5, tier: 'body', arrange: 'disc', radius: 0.14 },
    { kind: 'burst', name: 'first drift', recipe: recipe([L_PALE, L_MID, L_DARK], LEAF), count: 12, tier: 'hero', arrange: 'cone', dirOff: COVER_WIND + Math.PI, spread: 0.9, dz: 0.2, at: 0.05 },
    { kind: 'burst', name: 'slips', recipe: recipe([L_PALE, L_MID], SLIP), count: 10, tier: 'fine', arrange: 'cone', dirOff: COVER_WIND, spread: 0.8, at: 0.08, every: 0.25, times: 3 },
    { kind: 'burst', name: 'second drift', recipe: recipe([L_MID, L_DARK, L_GREEN], { ...LEAF, size: 0.06, life: 2.0 }), count: 10, tier: 'body', arrange: 'cone', dirOff: COVER_WIND + Math.PI, spread: 1.0, dz: 0.35, at: 0.3 },
    { kind: 'burst', name: 'leaf dust', recipe: recipe([L_PALE, L_MID], LEAF_DUST), count: 12, tier: 'fine', arrange: 'disc', radius: 0.5, dz: 0.3, at: 0.4 },
    { kind: 'burst', name: 'the three', recipe: recipe([L_MID, L_DARK], THE_THREE), count: 3, tier: 'hero', arrange: 'disc', radius: 0.28, at: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// THE STITCHED SHADOW — hunters_decoy (straw shaking off the work as
// the bale sews itself upright; a wide dashed ring marks its true draw)
// ---------------------------------------------------------------------------

const S_CORE = '#fff8e0';
const S_MID = '#c4a35a';
const S_DEEP = '#6a5426';
const S_SPARK = '#e8d8a0';
const S_GLOW = '200, 170, 100';

const RAMP_STRAW = rampOf({ stops: [S_CORE, S_SPARK, S_MID, S_DEEP], at: [0, 0.25, 0.6, 0.95], steps: 5 });

/** A straw sliver shaken off the work: thrown, tumbling, lying. */
const STRAW: BurstOpts = {
  shape: 'streak', align: true, speed: 0.5, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.075, sizeVar: 0.3, gravity: 0,
  vz: 1.6, zg: 6, spin: 4, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: RAMP_STRAW, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Chaff: the fines off the straw, thrown up, lying where they fall. */
const CHAFF: BurstOpts = {
  shape: 'square', speed: 0.7, speedVar: 0.6, life: 1.8, lifeVar: 0.35, size: 0.04, sizeVar: 0.3, gravity: 0, drag: 0.5,
  vz: 1.3, zg: 6, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [S_SPARK, S_MID], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The straw bed that stays at the base. */
const STRAW_BED: BurstOpts = {
  shape: 'streak', align: false, speed: 0.02, life: 8, lifeVar: 0.12, size: 0.065, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [S_MID, S_DEEP] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The draw ring: dashes on the true radius, pointing at the decoy. */
const DRAW_DASH: BurstOpts = {
  shape: 'streak', align: true, speed: 0.25, life: 1.5, lifeVar: 0.2, size: 0.07, sizeVar: 0.2, gravity: 0, drag: 0.4,
  layer: 'ground', ramp: rampOf({ stops: [S_SPARK, S_MID], at: [0, 0.6] }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.15, 0.7, 0.75, 0.6, 1, 0]),
};

/** Dust shaken loose at the base. */
const BASE_DUST: BurstOpts = {
  ...SET_PUFF, ramp: rampOf({ stops: [L_LOAM, S_MID, S_SPARK], at: [0, 0.45, 0.9], steps: 4 }),
};

export const relicsChaff: EffectDef = {
  id: 'relics.chaff',
  name: 'Relics — stitched shadow',
  story: 'the double sews itself upright: straw shakes off the work seam by seam, chaff flies and lies, dust lifts at the base → a dashed ring on the true draw radius points every nose at the bale → a straw bed stays at its feet',
  layers: [
    { kind: 'field', name: 'the work shakes', field: { kind: 'lift', radius: 0.7, strength: 1.4, dur: 1.1, height: 1.4, attack: 0.03, release: 0.3 } },
    { kind: 'burst', name: 'straw shakes off', recipe: recipe([S_CORE, S_SPARK, S_MID], STRAW), count: 9, tier: 'hero', arrange: 'disc', radius: 0.14, dz: 0.5, every: 0.28, times: 3, decay: 0.75 },
    { kind: 'burst', name: 'chaff', recipe: recipe([S_SPARK, S_MID], CHAFF), count: 16, tier: 'fine', arrange: 'disc', radius: 0.15, dz: 0.4 },
    { kind: 'burst', name: 'base dust', recipe: recipe([L_LOAM, S_MID], BASE_DUST), count: 5, tier: 'body', arrange: 'disc', radius: 0.18 },
    { kind: 'burst', name: 'draw ring', recipe: recipe([S_SPARK, S_MID], DRAW_DASH), count: 16, tier: 'body', arrange: 'rim', radius: 1.0, radiusK: 1, outward: -0.25, at: 0.12 },
    { kind: 'burst', name: 'straw bed', recipe: recipe([S_MID, S_DEEP], STRAW_BED), count: 8, tier: 'hero', arrange: 'disc', radius: 0.4, at: 0.4 },
    { kind: 'glow', name: 'straw light', r: 0.9, rgb: S_GLOW, a: 0.1, dur: 1.0, attack: 0.05, release: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// THE RIVER REMEMBERS — stone_aegis (a ring of water-worn pebbles rises
// and each one flies to the body and seats; one water-sheen sweep seals
// it; wet stains and two real pebbles stay at your feet)
// ---------------------------------------------------------------------------

const R_WHITE = '#ffffff';
const R_MID = '#8a9484';
const R_LIGHT = '#b8bec8';
const R_DEEP = '#5a6068';
const R_WET = '#bcdcef';
const R_FOAM = '#d8ecf7';
const R_GLOW = '200, 208, 220';

/** A pebble: born on the ring, drawn to the body, rising to seat. */
const PEBBLE: BurstOpts = {
  shape: 'square', align: true, speed: 0.15, speedVar: 0.3, life: 1.05, lifeVar: 0.15, size: 0.085, sizeVar: 0.25, gravity: 0,
  z: 0.02, vz: 1.0, zg: 0.5, mass: 2.4, drag: 0.3, spin: 2, land: 'none', layer: 'world', shadow: 0.4,
  ramp: rampOf({ stops: [R_LIGHT, R_MID, R_DEEP], at: [0, 0.5, 0.9], steps: 4 }), sizeCurve: HOLD, alphaCurve: curveOf([0, 1, 0.8, 1, 1, 0]),
};

/** Grit lifting with the pebbles. */
const GRIT: BurstOpts = {
  ...PEBBLE, size: 0.045, sizeVar: 0.3, life: 0.9, mass: 2.8, spin: 6, shadow: 0,
};

/** Dust lifting where a pebble left the dirt. */
const LIFT_DUST: BurstOpts = {
  shape: 'blob', speed: 0.15, speedVar: 0.5, life: 0.8, lifeVar: 0.25, size: 0.22, sizeVar: 0.25, gravity: 0, drag: 1.6,
  z: 0.02, vz: 0.35, zg: 0.6, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [L_LOAM, '#b89468', '#c9a978'], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.8, 0.5, 0.6, 1, 0]),
};

/** The sheen: glints sweeping DOWN the silhouette. */
const SHEEN: BurstOpts = {
  shape: 'glint', speed: 0.1, speedVar: 0.4, life: 0.5, lifeVar: 0.3, size: 0.07, sizeVar: 0.25, gravity: 0,
  z: 1.0, vz: -1.4, zg: 0, land: 'die', layer: 'world', shadow: 0, flicker: 0.4,
  ramp: rampOf({ stops: [R_WHITE, R_FOAM, R_WET], at: [0, 0.4, 0.85] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
};

/** Sheen water running off the seat and splatting at the feet. */
const RUNOFF: BurstOpts = {
  shape: 'drop', speed: 0.2, speedVar: 0.5, life: 1.0, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.9, vz: -0.4, zg: 6, land: 'splat', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [R_FOAM, R_WET], at: [0, 0.6] }), sizeCurve: HOLD,
};

/** Two real pebbles that stay at your feet. */
const TWO_PEBBLES: BurstOpts = {
  shape: 'square', speed: 0.02, life: 9, lifeVar: 0.1, size: 0.08, sizeVar: 0.15, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [R_MID, R_DEEP] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

export const relicsRiverbed: EffectDef = {
  id: 'relics.riverbed',
  name: 'Relics — riverbed',
  story: 'the riverbed arrives: a ring of water-worn pebbles lifts off the dirt, dust rising where each one lay, and every pebble flies in and SEATS against the body in sequence → one water-sheen sweep runs down the silhouette and splats at the feet → two real pebbles stay where you stood',
  layers: [
    { kind: 'field', name: 'the seat', field: { kind: 'attract', radius: 1.5, strength: 9, dur: 1.0, attack: 0.05, release: 0.2 } },
    { kind: 'burst', name: 'pebbles rise', recipe: recipe([R_LIGHT, R_MID, R_DEEP], PEBBLE), count: 8, tier: 'hero', arrange: 'rim', radius: 0.95, outward: -0.5, every: 0.16, times: 2, decay: 0.8 },
    { kind: 'burst', name: 'grit', recipe: recipe([R_LIGHT, R_MID], GRIT), count: 9, tier: 'fine', arrange: 'rim', radius: 1.0, outward: -0.6 },
    { kind: 'burst', name: 'dust lifts', recipe: recipe([L_LOAM, '#b89468'], LIFT_DUST), count: 8, tier: 'body', arrange: 'ring', radius: 0.95 },
    { kind: 'burst', name: 'water sheen', recipe: recipe([R_WHITE, R_FOAM], SHEEN), count: 10, tier: 'hero', arrange: 'disc', radius: 0.28, at: 0.9 },
    { kind: 'burst', name: 'runoff', recipe: recipe([R_FOAM, R_WET], RUNOFF), count: 6, tier: 'body', arrange: 'disc', radius: 0.22, at: 1.0 },
    { kind: 'burst', name: 'two pebbles', recipe: recipe([R_MID, R_DEEP], TWO_PEBBLES), count: 2, tier: 'hero', arrange: 'disc', radius: 0.26, at: 1.15 },
    { kind: 'glow', name: 'wet light', r: 1.0, rgb: R_GLOW, a: 0.12, dur: 1.2, attack: 0.05, release: 0.6, at: 0.85 },
  ],
};

// ---------------------------------------------------------------------------
// THE FENCE-WRITER — bramble_burst (one runner cane writes the perimeter,
// stapling a barb post at every beat until the ring closes and the
// claimed grass inside dims; the fence STAYS. The beat: it bleeds)
// ---------------------------------------------------------------------------

const B_CORE = '#eaffd8';
const B_MID = '#5a7a42';
const B_DEEP = '#3a6a34';
const B_SPARK = '#c8e89a';
const B_BARB = '#2c4a26';

/** A cane: a tapered tongue standing up out of the rim, settling as a stalk. */
const CANE: BurstOpts = {
  shape: 'lick', speed: 0.05, speedVar: 0.5, life: 1.5, lifeVar: 0.25, size: 0.17, sizeVar: 0.25, gravity: 0,
  vz: 1.0, zg: 2.2, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [B_SPARK, B_MID, B_DEEP], at: [0, 0.35, 0.85], steps: 4 }),
  sizeCurve: curveOf([0, 0.4, 0.2, 1, 0.8, 1, 1, 0.6]), alphaCurve: FADE_LATE,
};

/** A barb post: a dark shard that hops once and lies on the rim for nine seconds. */
const BARB: BurstOpts = {
  shape: 'shard', speed: 0.1, speedVar: 0.5, life: 9, lifeVar: 0.1, size: 0.055, sizeVar: 0.25, gravity: 0, spin: 8,
  vz: 0.6, zg: 4, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [B_MID, B_BARB] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Leaves flung off the runner as it writes. */
const BRIAR_LEAF: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.5, life: 1.6, lifeVar: 0.35, size: 0.045, sizeVar: 0.3, gravity: 0, drag: 0.6,
  vz: 1.4, zg: 6, spin: 5, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [B_SPARK, B_MID, B_DEEP], at: [0, 0.4, 0.85] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Soil turned where a cane broke ground. */
const BRIAR_SOIL: BurstOpts = {
  ...LIFT_DUST, size: 0.2, life: 0.75, vz: 0.25,
};

/** The claimed grass: the inside dims under a low green stain. */
const CLAIMED: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 4.6, lifeVar: 0.12, size: 0.5, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [B_DEEP, B_BARB] }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.12, 0.28, 0.82, 0.26, 1, 0]),
};

export const relicsBriar: EffectDef = {
  id: 'relics.briar',
  name: 'Relics — fence-writer',
  story: 'one runner writes the perimeter: canes stand up out of the rim beat by beat, leaves fling off the work, soil turns at every foot, a barb post is stapled at each one → the ring closes and the claimed grass inside dims → the fence of barbs STAYS after the light goes',
  layers: [
    { kind: 'burst', name: 'canes', recipe: recipe([B_SPARK, B_MID, B_DEEP], CANE), count: 7, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, every: 0.14, times: 2 },
    { kind: 'burst', name: 'barb posts', recipe: recipe([B_MID, B_BARB], BARB), count: 7, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.06, every: 0.14, times: 2 },
    { kind: 'burst', name: 'leaves fling', recipe: recipe([B_SPARK, B_MID], BRIAR_LEAF), count: 12, tier: 'fine', arrange: 'rim', radius: 0.95, radiusK: 0.95, outward: 0.9, at: 0.05 },
    { kind: 'burst', name: 'soil turns', recipe: recipe([L_LOAM, '#b89468'], BRIAR_SOIL), count: 10, tier: 'body', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.04 },
    { kind: 'burst', name: 'claimed grass', recipe: recipe([B_DEEP, B_BARB], CLAIMED), count: 6, tier: 'body', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.3 },
    { kind: 'glow', name: 'green light', r: 1.2, rgb: V_GLOW, a: 0.14, dur: 4.6, attack: 0.3, release: 1.0, radiusK: 1 },
  ],
};

export const relicsBriarBeat: EffectDef = {
  id: 'relics.briar_beat',
  name: 'Relics — briar beat',
  story: 'the briar does the rest: thorns jab up across the claimed ground, leaf fines fly, a barb or two more is stapled to the fence, the green flares once',
  layers: [
    { kind: 'burst', name: 'thorns jab', recipe: recipe([B_SPARK, B_MID, B_DEEP], { ...CANE, size: 0.13, life: 0.6, vz: 1.4, zg: 5 }), count: 7, tier: 'hero', arrange: 'disc', radius: 0.85, radiusK: 0.85 },
    { kind: 'burst', name: 'leaf fines', recipe: recipe([B_SPARK, B_MID], BRIAR_LEAF), count: 8, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'more barbs', recipe: recipe([B_MID, B_BARB], { ...BARB, life: 6 }), count: 2, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1 },
    { kind: 'glow', name: 'flare', r: 1.0, rgb: V_GLOW, a: 0.12, dur: 0.3, attack: 0.02, release: 0.2, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// THE THREE QUESTIONS OF THE DEAD — bone_tempest (each wave a harder
// shape: knuckles surface, hooks grind, the saw-ring turns once and
// sinks; a ring of bone grains stays). Every pulse casts this.
// ---------------------------------------------------------------------------

const BN_WHITE = '#fffcf0';
const BN_IVORY = '#e2dcc8';
const BN_MID = '#b8b09a';
const BN_DEEP = '#8a8474';
const BN_DARK = '#5c5a50';
const BN_GLOW = '220, 214, 190';

const RAMP_BONE = rampOf({ stops: [BN_WHITE, BN_IVORY, BN_MID, BN_DEEP], at: [0, 0.3, 0.65, 0.95], steps: 5 });

/** The surfacing ring: a bone-pale pressure ring racing out to the reach. */
const SURFACE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 1.0, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [BN_WHITE, BN_IVORY, BN_DEEP], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.5, 0.5, 4.2, 1, 5.4]), alphaCurve: RING_A,
};

/** Knuckles: bone shards thrown outward on true height, bouncing, lying, flecking the dirt. */
const KNUCKLE: BurstOpts = {
  shape: 'shard', speed: 1.4, speedVar: 0.5, life: 2.6, lifeVar: 0.3, size: 0.09, sizeVar: 0.3, gravity: 0, spin: 10,
  vz: 2.2, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world', shadow: 0.5,
  ramp: RAMP_BONE, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 7,
};

/** Bone dust: pale masses rolling out low and settling. */
const BONE_DUST: BurstOpts = {
  shape: 'blob', speed: 1.2, speedVar: 0.4, life: 1.3, lifeVar: 0.3, size: 0.36, sizeVar: 0.25, gravity: 0, drag: 2.2,
  z: 0.05, vz: 0.4, zg: 1.2, mass: 0.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [BN_MID, BN_IVORY, BN_WHITE], at: [0, 0.4, 0.9], steps: 5 }),
  sizeCurve: curveOf([0, 0.55, 0.25, 1, 0.6, 1.15, 1, 0.85]), alphaCurve: curveOf([0, 0.4, 0.12, 0.8, 0.66, 0.7, 1, 0]),
  wave: 'noise', waveHz: 1.5, waveAmp: 0.3, spin: 0.35,
};

/** Grit: ivory fines thrown high, lying where they land. */
const BONE_GRIT: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 1.9, lifeVar: 0.35, size: 0.042, sizeVar: 0.3, gravity: 0, drag: 0.4,
  vz: 2.4, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [BN_WHITE, BN_IVORY, BN_MID], at: [0, 0.45, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Saw teeth: squares riding the rim's tangent for one turn. */
const SAW_TOOTH: BurstOpts = {
  shape: 'square', align: true, speed: 0.08, speedVar: 0.2, life: 0.45, lifeVar: 0.25, size: 0.08, sizeVar: 0.2, gravity: 0,
  z: 0.08, vz: 0.3, zg: 1.6, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [BN_WHITE, BN_IVORY], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The ring of bone that stays. */
const BONE_RING: BurstOpts = {
  shape: 'shard', speed: 0.02, life: 8.5, lifeVar: 0.12, size: 0.06, sizeVar: 0.25, gravity: 0, spin: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [BN_IVORY, BN_DEEP, BN_DARK], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

export const relicsBoneWave: EffectDef = {
  id: 'relics.bone_wave',
  name: 'Relics — bone wave',
  story: 'the dead ask: a bone-pale ring surfaces and races to the reach → knuckles fly out on true height, bounce and lie, flecking the dirt → bone dust rolls out low and grit rains back → a saw-ring of teeth turns once on the rim and sinks → a ring of bone grains stays',
  layers: [
    { kind: 'burst', name: 'surfacing ring', recipe: recipe([BN_WHITE, BN_IVORY], SURFACE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'knuckles', recipe: recipe([BN_WHITE, BN_IVORY, BN_MID], KNUCKLE), count: 10, tier: 'hero', arrange: 'rim', radius: 0.5, radiusK: 0.5, outward: 1.6 },
    { kind: 'burst', name: 'hooks', recipe: recipe([BN_IVORY, BN_MID], { ...KNUCKLE, size: 0.065, speed: 1.1, vz: 1.6, markLife: 5 }), count: 14, tier: 'body', arrange: 'rim', radius: 0.75, radiusK: 0.75, outward: 1.2, at: 0.08 },
    { kind: 'burst', name: 'bone dust', recipe: recipe([BN_MID, BN_IVORY, BN_WHITE], { ...BONE_DUST, size: 0.3 }), count: 16, tier: 'body', arrange: 'rim', radius: 0.22, radiusK: 0.22, outward: 1.2 },
    { kind: 'burst', name: 'grit', recipe: recipe([BN_WHITE, BN_IVORY], BONE_GRIT), count: 18, tier: 'fine' },
    { kind: 'emit', name: 'saw-ring turns', arrange: 'orbit', radius: 1.0, radiusK: 1, dz: 0.05, at: 0.16, rate: 64, dur: 0.42, attack: 0.03, release: 0.1, orbitSpeed: 5.2, tangent: true, tier: 'hero',
      pops: [{ colors: [BN_WHITE, BN_IVORY], opts: SAW_TOOTH, tier: 'hero' }] },
    { kind: 'burst', name: 'ring of bone', recipe: recipe([BN_IVORY, BN_DEEP], BONE_RING), count: 14, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.5 },
    { kind: 'glow', name: 'pale light', r: 1.6, rgb: BN_GLOW, a: 0.16, dur: 0.6, attack: 0.02, release: 0.4, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// THE PACK ANSWERS — the four enemy voices (rallying_howl, vixens_scream,
// ravening_cackle, hushing_screech). One breath column at the caller,
// harmonic rings walking out to the exact edge, and at the rim the
// species' silent answer: ears, brush flags, teeth, or the wood bowing.
// Dread authors no light: the anchor is the breath's lift and the rim's
// hero grains, never a glow.
// ---------------------------------------------------------------------------

interface HowlPalette {
  pale: string;
  mid: string;
  deep: string;
  spark: string;
}

/** The breath: pale motes climbing the column at the caller. */
function breathOf(p: HowlPalette): BurstOpts {
  return {
    shape: 'mote', speed: 0.1, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.2, sizeVar: 0.3, gravity: 0, drag: 0.6,
    z: 0.55, vz: 1.1, zg: 0, mass: 1.2, layer: 'world', shadow: 0,
    ramp: rampOf({ stops: [p.pale, p.mid, p.deep], at: [0, 0.45, 0.9], steps: 4 }),
    sizeCurve: SWELL, alphaCurve: MIST_A, wave: 'noise', waveHz: 1.1, waveAmp: 0.2,
  };
}

/** A harmonic: a ground ring racing out to the howl's exact edge (2.6 tiles). */
function harmonicOf(p: HowlPalette): BurstOpts {
  return {
    shape: 'ring', speed: 0, life: 0.7, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
    ramp: rampOf({ stops: [p.pale, p.mid, p.deep], at: [0, 0.45, 0.85] }),
    sizeCurve: curveOf([0, 0.3, 0.6, 6.6, 1, 8.0]), alphaCurve: curveOf([0, 0.55, 0.6, 0.35, 1, 0]),
  };
}

/** The hush wash: fines settling on the ground behind the ring. */
function washOf(p: HowlPalette): BurstOpts {
  return {
    shape: 'mote', speed: 0.2, speedVar: 0.5, life: 1.4, lifeVar: 0.3, size: 0.04, sizeVar: 0.3, gravity: 0, drag: 1.0,
    z: 0.25, vz: -0.05, zg: 0.5, land: 'settle', layer: 'world', shadow: 0,
    ramp: rampOf({ stops: [p.pale, p.mid], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
  };
}

/** The answer's residue: paired grains keeping the circle for eight seconds. */
function pairOf(p: HowlPalette): BurstOpts {
  return {
    shape: 'square', speed: 0.02, life: 8, lifeVar: 0.1, size: 0.05, sizeVar: 0.2, gravity: 0,
    layer: 'ground', shadow: 0, ramp: rampOf({ stops: [p.spark, p.mid, p.deep], at: [0, 0.5, 0.9] }),
    sizeCurve: HOLD, alphaCurve: SETTLE_A,
  };
}

interface HowlSpec {
  id: string;
  name: string;
  story: string;
  palette: HowlPalette;
  /** The species' rim answer: what rises where the ring passes. */
  answer: BurstOpts;
  answerCount: number;
  /** Extra layers the species adds (the owl's wing shadow). */
  extra?: EffectDef['layers'];
}

function howlEffect(s: HowlSpec): EffectDef {
  const p = s.palette;
  return {
    id: s.id,
    name: s.name,
    story: s.story,
    layers: [
      { kind: 'field', name: 'the breath column', field: { kind: 'lift', radius: 0.6, strength: 1.9, dur: 0.9, height: 2.4, attack: 0.03, release: 0.3 } },
      { kind: 'burst', name: 'breath', recipe: recipe([p.pale, p.mid], breathOf(p)), count: 8, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.55 },
      { kind: 'burst', name: 'second breath', recipe: recipe([p.pale, p.mid], { ...breathOf(p), size: 0.16, life: 0.9 }), count: 5, tier: 'fine', arrange: 'disc', radius: 0.1, dz: 0.6, at: 0.2 },
      { kind: 'burst', name: 'harmonics', recipe: recipe([p.pale, p.mid], harmonicOf(p)), count: 1, tier: 'hero', every: 0.22, times: 2 },
      { kind: 'burst', name: 'the answer', recipe: recipe([p.spark, p.mid, p.deep], s.answer), count: s.answerCount, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.42 },
      { kind: 'burst', name: 'the answer again', recipe: recipe([p.spark, p.mid], { ...s.answer, life: s.answer.life! * 0.8 }), count: Math.ceil(s.answerCount * 0.6), tier: 'body', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.58 },
      { kind: 'burst', name: 'hush wash', recipe: recipe([p.pale, p.mid], washOf(p)), count: 14, tier: 'fine', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.35 },
      { kind: 'burst', name: 'paired grains', recipe: recipe([p.spark, p.mid], pairOf(p)), count: 16, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.6 },
      ...(s.extra ?? []),
    ],
  };
}

const WOLF: HowlPalette = { pale: '#d8d4e8', mid: '#9aa2b8', deep: '#3c4258', spark: '#e8ecf4' };
const FOX: HowlPalette = { pale: '#ffe8d0', mid: '#d97a35', deep: '#6a3418', spark: '#ffffff' };
const HYENA: HowlPalette = { pale: '#f4e8c0', mid: '#c9a44a', deep: '#5a4418', spark: '#fff8e0' };
const OWL: HowlPalette = { pale: '#f0f4fa', mid: '#b8c4d8', deep: '#4a5468', spark: '#ffffff' };

/** Ears: paired grains rising out of the grass at the edge and pricking up. */
const EARS: BurstOpts = {
  shape: 'shard', speed: 0.03, life: 1.4, lifeVar: 0.2, size: 0.09, sizeVar: 0.2, gravity: 0, spin: 0,
  vz: 0.7, zg: 1.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WOLF.spark, WOLF.mid, WOLF.deep], at: [0, 0.4, 0.9] }),
  sizeCurve: curveOf([0, 0.3, 0.25, 1, 0.8, 1, 1, 0.5]), alphaCurve: FADE_LATE,
};

/** Brush flags: ember licks with a white tip flicking up out of the hedge-dark. */
const FLAGS: BurstOpts = {
  shape: 'lick', speed: 0.05, life: 1.1, lifeVar: 0.25, size: 0.15, sizeVar: 0.25, gravity: 0,
  vz: 1.2, zg: 2.6, land: 'settle', layer: 'world', shadow: 0, core: FOX.spark, coreK: 0.35,
  ramp: rampOf({ stops: [FOX.pale, FOX.mid, FOX.deep], at: [0, 0.35, 0.9], steps: 4 }),
  sizeCurve: curveOf([0, 0.4, 0.2, 1, 0.75, 1, 1, 0.5]), alphaCurve: FADE_LATE,
};

/** Teeth: gold squares jabbing up in pairs and hanging grinning. */
const TEETH: BurstOpts = {
  shape: 'square', speed: 0.04, life: 1.0, lifeVar: 0.25, size: 0.075, sizeVar: 0.2, gravity: 0, spin: 0,
  vz: 0.9, zg: 3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [HYENA.spark, HYENA.mid, HYENA.deep], at: [0, 0.4, 0.9] }),
  sizeCurve: curveOf([0, 0.5, 0.15, 1, 0.85, 1, 1, 0.6]), alphaCurve: FADE_LATE,
};

/** The wood bows: white fines born a hand up and lying flat all over the circle. */
const BOW: BurstOpts = {
  shape: 'streak', align: true, speed: 0.3, speedVar: 0.5, life: 1.6, lifeVar: 0.25, size: 0.06, sizeVar: 0.3, gravity: 0, drag: 0.8,
  z: 0.3, vz: -0.4, zg: 2, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [OWL.spark, OWL.mid, OWL.deep], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** One vast soft wing-shadow sweeping across the hushed ground. */
const WING_SHADOW: BurstOpts = {
  shape: 'blob', speed: 2.4, speedVar: 0.1, life: 0.95, lifeVar: 0.05, size: 1.1, sizeVar: 0.1, gravity: 0, drag: 0.2,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [OWL.deep] }),
  sizeCurve: curveOf([0, 0.7, 0.4, 1, 1, 0.8]), alphaCurve: curveOf([0, 0, 0.2, 0.28, 0.7, 0.26, 1, 0]),
};

export const relicsHowl = howlEffect({
  id: 'relics.howl',
  name: 'Relics — rallying howl',
  story: 'the matriarch\'s breath climbs as one column with harmonic rings riding out along the ground to the howl\'s exact edge → and the pack answers SILENTLY: paired ears rise out of the grass all around the rim, prick toward the caller, and sink → a hush settles; paired grains keep the circle',
  palette: WOLF, answer: EARS, answerCount: 12,
});

export const relicsScream = howlEffect({
  id: 'relics.scream',
  name: 'Relics — vixen\'s scream',
  story: 'the scream is a needle: a thin breath, keening rings racing to the rim → where the note passes, brush flags flick up out of the hedge-dark — ember licks with white tips, the skulk answering with the only part of a fox you ever see → ember-and-white grains hold the ring',
  palette: FOX, answer: FLAGS, answerCount: 10,
});

export const relicsCackle = howlEffect({
  id: 'relics.cackle',
  name: 'Relics — ravening cackle',
  story: 'the laugh goes round the warband: a ragged breath, rings jagging out to the rim → every span the joke passes sprouts teeth — gold squares jabbing up in pairs and hanging grinning → teeth-pair grains keep the round; you are inside the joke',
  palette: HYENA, answer: TEETH, answerCount: 14,
});

export const relicsHush = howlEffect({
  id: 'relics.hush',
  name: 'Relics — hushing screech',
  story: 'the elder owl screams the wood silent: a white breath, a thin white ring expanding with a cool wash behind it → everything it crosses BOWS — pale fines lie down flat across the whole circle and stay down → one vast wing-shadow sweeps the hushed ground → flattened marks keep the bow',
  palette: OWL, answer: { ...BOW, size: 0.07 }, answerCount: 12,
  extra: [
    { kind: 'burst', name: 'the wood bows', recipe: recipe([OWL.spark, OWL.mid], BOW), count: 16, tier: 'body', arrange: 'disc', radius: 0.9, radiusK: 0.9, at: 0.3 },
    { kind: 'burst', name: 'wing shadow', recipe: recipe([OWL.deep], WING_SHADOW), count: 2, tier: 'hero', arrange: 'disc', radius: 0.25, aimed: true, dirOff: 0, at: 0.5 },
  ],
});

// ---------------------------------------------------------------------------
// THE RING GROWS — faerie_ring (toadstools rise on the exact rim on their
// own clocks — stalk first, cap after — around a floor washed with one
// faint moon disc; spores drift up inside; the cap-and-stalk pairs hold
// the circle after the light goes)
// ---------------------------------------------------------------------------

const F_CORE = '#e0fff4';
const F_MID = '#9ff0d8';
const F_MOON = '#d8f4ec';
const F_DEEP = '#2e5a4c';
const F_GLOW = '150, 240, 216';

/** The moon disc: a faint pale wash across the floor for the field's life. */
const MOON_DISC: BurstOpts = {
  shape: 'mote', speed: 0.02, life: 4.4, lifeVar: 0.1, size: 0.8, sizeVar: 0.15, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [F_MOON, F_MID] }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0, 0.1, 0.12, 0.85, 0.12, 1, 0]),
};

/** A stalk: a pale tongue standing up out of the rim. */
const STALK: BurstOpts = {
  shape: 'lick', speed: 0.03, life: 1.6, lifeVar: 0.2, size: 0.14, sizeVar: 0.25, gravity: 0,
  vz: 0.7, zg: 1.4, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [F_CORE, F_MID, F_DEEP], at: [0, 0.4, 0.9], steps: 4 }),
  sizeCurve: curveOf([0, 0.3, 0.3, 1, 0.85, 1, 1, 0.6]), alphaCurve: FADE_LATE,
};

/** A cap: a rounder body that arrives after the stalk, glowing pale. */
const CAP: BurstOpts = {
  shape: 'mote', speed: 0.03, life: 1.4, lifeVar: 0.2, size: 0.12, sizeVar: 0.2, gravity: 0,
  z: 0.25, vz: 0.15, zg: 0, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: rampOf({ stops: [F_CORE, F_MID], at: [0, 0.7] }), sizeCurve: BLOOM, alphaCurve: FADE_LATE,
};

/** The fairy ring: cap-and-stalk grains that hold the circle in the leaf rot. */
const FAIRY_RING: BurstOpts = {
  shape: 'mote', speed: 0.02, life: 9, lifeVar: 0.1, size: 0.065, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [F_MID, F_DEEP] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Spores: glints drifting up inside the ring on a slow wave. */
const SPORE: BurstOpts = {
  shape: 'glint', speed: 0.05, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.05, vz: 0.35, zg: 0, layer: 'world', shadow: 0, flicker: 0.4,
  ramp: rampOf({ stops: [F_CORE, F_MID], at: [0, 0.7] }), sizeCurve: curveOf('pulse'), alphaCurve: MIST_A,
  wave: 'sine', waveHz: 0.9, waveAmp: 0.25,
};

/** The court's cold: pale mist breathing low at the rim. */
const COURT_COLD: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.28, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.06, vz: 0.08, zg: 0, layer: 'world', shadow: 0, spin: 0.3,
  ramp: rampOf({ stops: [F_MOON, F_MID, F_DEEP], at: [0, 0.5, 0.95], steps: 4 }), sizeCurve: SWELL, alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.6, waveAmp: 0.2,
};

export const relicsFaerieRing: EffectDef = {
  id: 'relics.faerie_ring',
  name: 'Relics — faerie ring',
  story: 'the court\'s fence is GROWN: a faint moon disc washes the floor → toadstools rise on the exact rim on their own clocks, stalk first, cap after → spores drift up inside for the field\'s life, the court\'s cold breathes at the rim → the cap-and-stalk grains hold the circle after the light goes',
  layers: [
    { kind: 'burst', name: 'moon disc', recipe: recipe([F_MOON, F_MID], { ...MOON_DISC, size: 1.0, sizeVar: 0.08 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.4, radiusK: 0.4 },
    { kind: 'burst', name: 'stalks', recipe: recipe([F_CORE, F_MID], STALK), count: 4, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, every: 0.2, times: 2 },
    { kind: 'burst', name: 'caps', recipe: recipe([F_CORE, F_MID], CAP), count: 4, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.3, every: 0.2, times: 2 },
    { kind: 'burst', name: 'the fairy ring', recipe: recipe([F_MID, F_DEEP], FAIRY_RING), count: 14, tier: 'hero', arrange: 'ring', radius: 1.0, radiusK: 1, at: 0.7 },
    { kind: 'emit', name: 'spores', arrange: 'disc', radius: 0.8, radiusK: 0.8, rate: 9, dur: 4.2, attack: 0.3, release: 0.8, tier: 'fine',
      pops: [{ colors: [F_CORE, F_MID], opts: SPORE, tier: 'fine' }] },
    { kind: 'burst', name: 'the court\'s cold', recipe: recipe([F_MOON, F_MID], COURT_COLD), count: 8, tier: 'body', arrange: 'ring', radius: 0.9, radiusK: 0.9, at: 0.15 },
    { kind: 'glow', name: 'toadstool light', r: 1.3, rgb: F_GLOW, a: 0.16, dur: 4.4, attack: 0.4, release: 1.0, flicker: 0.1, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const RELICS_PLANS: Record<string, AbilityPlan> = {
  // The door of fire: the departure door flares, the lane between the
  // doors ignites as a fire wall, and the twin door opens at the arrival
  // a beat later — the pass that burns, shown as the road it burned.
  ember_dash: { cues: [
    { id: 'fire.burst', scale: 0.7 },
    { id: 'fire.trail', at: 0.05, scale: 0.8 },
    { id: 'fire.burst', at: 0.22, scale: 0.9, atFar: true },
  ] },
  // The tapped spring: an authored green upwelling whose clover rim is
  // the heal's true circle; one ceremony, scale pinned (radius 2.6).
  healing_totem: { cues: [{ id: 'relics.spring', scale: 1.0 }] },
  // The covered work: leaves blow over the set jaws; three stay. Scale
  // pinned small — the trap is meant to vanish.
  snare_trap: { cues: [{ id: 'relics.leaf_cover', scale: 0.8 }] },
  // The inverted bell: the clapper is a real stroke from the sky
  // (storm.strike lands at 0.24), and the note falls as the nova ringing
  // out across the circle the instant it strikes.
  storm_bell: { cues: [
    { id: 'storm.strike', scale: 1.0 },
    { id: 'storm.nova', at: 0.26, scale: 1.2 },
  ] },
  // The stitched shadow: straw shakes off the work; the draw ring on the
  // true 5-tile radius; scale pinned so the radius never inflates it.
  hunters_decoy: { cues: [{ id: 'relics.chaff', scale: 0.9 }] },
  // The river remembers: pebbles rise and seat on the body, sealed with
  // one water-sheen sweep.
  stone_aegis: { cues: [{ id: 'relics.riverbed', scale: 1.0 }] },
  // The finished storm: the lance is a bolt spanning caster to reach
  // that re-forms once; at the far end the storm that already happened —
  // a dissolving cloud lashing beneath itself, rain still falling only
  // inside the bar's end.
  coil_lance: { cues: [
    { id: 'storm.arc', scale: 1.1 },
    { id: 'storm.arc', at: 0.16, scale: 0.7 },
    { id: 'storm.cloud', at: 0.1, scale: 0.6, atFar: true },
    { id: 'water.rain', at: 0.2, scale: 0.5, atFar: true, radiusK: 2 },
  ] },
  // The fence-writer: the perimeter is written once and STAYS; every
  // pulse (16 ticks) the briar jabs and staples another barb.
  bramble_burst: { cues: [
    { id: 'relics.briar', scale: 1.0 },
    { id: 'relics.briar_beat', at: 0.8, scale: 0.8, every: 0.8 },
  ] },
  // The answer: at the wound the seeker's search-spiral collapses inward
  // (the vortex gathers motes) and the heart stamps the answer — found.
  // Three small blasts, one per mote.
  arcane_seekers: { cues: [{ id: 'arcane.bloom', scale: 0.6 }] },
  // The sentence served: the needle's bite splats its beads at the mark,
  // then the name keeps paying — the mark drips green after.
  venom_dart: { cues: [
    { id: 'venom.burst', scale: 0.4 },
    { id: 'venom.drip', at: 0.3, scale: 0.6 },
  ] },
  // The three questions: every pulse surfaces a bone wave (ring, knuckles,
  // saw-ring) and shakes the floor under it; ultimate scale.
  bone_tempest: { cues: [
    { id: 'relics.bone_wave', scale: 1.5 },
    { id: 'dust.slam', at: 0.05, scale: 0.6 },
  ] },
  // The raised floor: the whole plate slams back flush — the earthbreaker
  // at champion scale, then the dust rolls out and settles.
  ground_slam: { cues: [
    { id: 'dust.slam', scale: 1.6 },
    { id: 'dust.billow', at: 0.35, scale: 0.5 },
  ] },
  // The ears in the grass: the breath column, harmonics to the exact
  // edge, the pack's silent answer on the rim.
  rallying_howl: { cues: [{ id: 'relics.howl', scale: 1.0 }] },
  // The flags come up: the same shape in the fox's register — a needle
  // of a note and brush flags flicking up out of the hedge-dark.
  vixens_scream: { cues: [{ id: 'relics.scream', scale: 1.0 }] },
  // The joke goes round: the packlord's register — teeth sprout on every
  // span the laugh passes.
  ravening_cackle: { cues: [{ id: 'relics.cackle', scale: 1.0 }] },
  // The wood bows silent: the owl's register — the whole circle lies
  // down flat and one wing-shadow sweeps it.
  hushing_screech: { cues: [{ id: 'relics.hush', scale: 1.0 }] },
  // The ring grows: toadstools on the exact rim, spores inside; the
  // court's cold climbs from the floor on the field's beats.
  faerie_ring: { cues: [
    { id: 'relics.faerie_ring', scale: 1.0 },
    { id: 'frost.fog', at: 0.6, scale: 0.5, radiusK: 0.8, every: 1.5 },
  ] },
  // Night arrives early: the nova runs BACKWARD — first the dusk falls IN
  // (the dark called into the hound and clenched), and only when it lets
  // go does the cold go OUT as one hard frost wave.
  gloaming_veil: { cues: [
    { id: 'shadow.grasp', scale: 0.9 },
    { id: 'frost.nova', at: 0.98, scale: 0.85 },
  ] },
  // The hound that briefly wasn't: it comes apart at the departure door
  // (a ward shattering into glass), a lane of light hangs where it ran,
  // and the arrival lands PAST you as a cold flash, jaws first.
  glimmer_step: { cues: [
    { id: 'arcane.shatter', scale: 0.5 },
    { id: 'arcane.beam', scale: 0.7 },
    { id: 'frost.nova', at: 0.15, scale: 0.65, atFar: true },
  ] },
};

export const RELICS_EFFECTS: EffectDef[] = [
  relicsSpring,
  relicsLeafCover,
  relicsChaff,
  relicsRiverbed,
  relicsBriar,
  relicsBriarBeat,
  relicsBoneWave,
  relicsHowl,
  relicsScream,
  relicsCackle,
  relicsHush,
  relicsFaerieRing,
];
