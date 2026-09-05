/**
 * VOICES — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in VOICES_EFFECTS and register through the
 * library index.
 *
 * The druid's arx secrets are weather and light: a sunrise delivered
 * down a corridor, a moon returned, a coil of wind let loose, feathers
 * that burn, a courteous pit, a red ledger, a proof, a comet's closest
 * pass, a crown holding court. The library speaks most of it — radiance
 * (warm gold, the law), frost, storm, fire, shadow, blood, dust. What it
 * cannot say — the forest that PLATS the ground in surveyed rows, and a
 * thread of wind paying out from a spindle — is authored here.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';

const HOLD = curveOf('hold');
const FADE_LATE = curveOf('fadeLate');
const MIST_A = curveOf('mist');
const SWELL = curveOf('swell');
const SETTLE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

// ---------------------------------------------------------------------------
// THE SURVEYORS — wild_root (the forest does not rage, it PLATS: sapling
// stakes sprout in surveyed rows, each crowned with a leaf flag, dotted
// root-lines link stake to stake, and the rows stay laid in the dirt)
// ---------------------------------------------------------------------------

const W_CORE = '#eaffd8';
const W_MID = '#7a9a4a';
const W_DEEP = '#3a6a34';
const W_SPARK = '#c8e89a';
const W_LOAM = '#8a6f4d';
const W_PALE_LOAM = '#b89468';
const W_GLOW = '140, 208, 120';

/** A stake: a green tongue standing up out of the dirt and holding. */
const STAKE: BurstOpts = {
  shape: 'lick', speed: 0.03, life: 1.9, lifeVar: 0.2, size: 0.18, sizeVar: 0.2, gravity: 0,
  vz: 1.3, zg: 2.6, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [W_SPARK, W_MID, W_DEEP], at: [0, 0.35, 0.9], steps: 4 }),
  sizeCurve: curveOf([0, 0.3, 0.2, 1, 0.85, 1, 1, 0.55]), alphaCurve: FADE_LATE,
};

/** A leaf flag crowning a stake: a shard born high, spinning, settling. */
const FLAG: BurstOpts = {
  shape: 'shard', speed: 0.15, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.06, sizeVar: 0.3, gravity: 0, drag: 0.5,
  z: 0.55, vz: 0.5, zg: 2.4, spin: 6, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [W_CORE, W_SPARK, W_MID], at: [0, 0.4, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** A root-line: a ground streak crawling out to link stake to stake. */
const ROOT_LINE: BurstOpts = {
  shape: 'streak', align: true, speed: 1.5, speedVar: 0.4, life: 1.4, lifeVar: 0.3, size: 0.065, sizeVar: 0.3,
  gravity: 0, drag: 2.2, layer: 'ground', ramp: rampOf({ stops: [W_MID, W_DEEP, W_LOAM], at: [0, 0.5, 0.9] }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0.4, 0.2, 1, 0.75, 0.9, 1, 0]),
};

/** Soil turned where a stake broke ground. */
const SOIL: BurstOpts = {
  shape: 'blob', speed: 0.15, speedVar: 0.5, life: 0.8, lifeVar: 0.25, size: 0.22, sizeVar: 0.25, gravity: 0, drag: 1.6,
  z: 0.02, vz: 0.3, zg: 0.6, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [W_LOAM, W_PALE_LOAM, '#c9a978'], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.8, 0.5, 0.6, 1, 0]),
};

/** The rows as laid: green grains that stay in the dirt after the field. */
const LAID_ROW: BurstOpts = {
  shape: 'square', speed: 0.02, life: 9, lifeVar: 0.1, size: 0.055, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [W_MID, W_DEEP] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

export const voicesWildRoot: EffectDef = {
  id: 'voices.wild_root',
  name: 'Voices — wild root',
  story: 'the forest PLATS the ground: sapling stakes sprout in rows across the field, soil turning at every foot, each crowned with a leaf flag that spins down onto it → dotted root-lines crawl the ground to link stake to stake → the rows stay laid in the dirt: the claim, filed and witnessed',
  layers: [
    { kind: 'burst', name: 'stakes', recipe: recipe([W_SPARK, W_MID, W_DEEP], STAKE), count: 7, tier: 'hero', arrange: 'disc', radius: 0.9, radiusK: 0.9, every: 0.22, times: 2 },
    { kind: 'burst', name: 'soil turns', recipe: recipe([W_LOAM, W_PALE_LOAM], SOIL), count: 8, tier: 'body', arrange: 'disc', radius: 0.9, radiusK: 0.9, every: 0.22, times: 2, decay: 0.8 },
    { kind: 'burst', name: 'leaf flags', recipe: recipe([W_CORE, W_SPARK, W_MID], FLAG), count: 8, tier: 'body', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.15, every: 0.22, times: 2 },
    { kind: 'burst', name: 'root-lines', recipe: recipe([W_MID, W_DEEP, W_LOAM], ROOT_LINE), count: 10, tier: 'hero', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.12, every: 0.3, times: 1 },
    { kind: 'burst', name: 'laid rows', recipe: recipe([W_MID, W_DEEP], LAID_ROW), count: 12, tier: 'hero', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.5 },
    { kind: 'glow', name: 'green light', r: 1.2, rgb: W_GLOW, a: 0.16, dur: 4.5, attack: 0.3, release: 1.0, radiusK: 1 },
  ],
};

export const voicesRootBeat: EffectDef = {
  id: 'voices.root_beat',
  name: 'Voices — root beat',
  story: 'the field insists: a few more stakes jab up across the rows, leaf fines shake loose, soil turns, and the green flares once',
  layers: [
    { kind: 'burst', name: 'stakes jab', recipe: recipe([W_SPARK, W_MID, W_DEEP], { ...STAKE, size: 0.14, life: 0.7, vz: 1.5, zg: 5 }), count: 6, tier: 'hero', arrange: 'disc', radius: 0.85, radiusK: 0.85 },
    { kind: 'burst', name: 'leaf fines', recipe: recipe([W_SPARK, W_MID], { ...FLAG, size: 0.045, life: 1.4 }), count: 6, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'soil', recipe: recipe([W_LOAM, W_PALE_LOAM], SOIL), count: 4, tier: 'body', arrange: 'disc', radius: 0.8, radiusK: 0.8 },
    { kind: 'glow', name: 'flare', r: 1.0, rgb: W_GLOW, a: 0.1, dur: 0.3, attack: 0.02, release: 0.2, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// THE UNWOUND BOBBIN — shearwind (one coil comes loose: a spindle-axis
// stands at the center and a single pale thread pays out in a widening
// whirl, its free end whipping at the rim, until the bare spindle
// topples; the thread lies where it fell)
// ---------------------------------------------------------------------------

const X_PALE = '#f4f8ff';
const X_THREAD = '#d8e8f0';
const X_MID = '#9db8e8';
const X_DEEP = '#4d5a8c';
const X_SAND = '#d8b06a';
const X_LOAM = '#a8825a';
const X_GLOW = '220, 232, 245';

/** The thread: a pale streak with a trailing tail, spun out on the vortex. */
const THREAD: BurstOpts = {
  shape: 'streak', align: true, speed: 1.3, speedVar: 0.3, life: 1.1, lifeVar: 0.25, size: 0.09, sizeVar: 0.2, gravity: 0,
  z: 0.5, vz: 0.1, zg: 0.2, mass: 2.2, drag: 0.3, land: 'none', layer: 'world', shadow: 0,
  trail: 8, trailColor: X_THREAD,
  ramp: rampOf({ stops: [X_PALE, X_THREAD, X_MID], at: [0, 0.5, 0.9] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** The spindle: a bright glint standing at the axis. */
const SPINDLE: BurstOpts = {
  shape: 'glint', speed: 0.02, life: 0.9, lifeVar: 0.1, size: 0.14, sizeVar: 0.1, gravity: 0,
  z: 0.6, vz: 0, layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: [X_PALE, X_THREAD], at: [0, 0.7] }), sizeCurve: curveOf('pulse'), alphaCurve: FADE_LATE,
};

/** The spindle topples: one streak falling over and lying. */
const TOPPLE: BurstOpts = {
  shape: 'streak', align: true, speed: 0.5, speedVar: 0.2, life: 5, lifeVar: 0.1, size: 0.12, sizeVar: 0.1, gravity: 0, drag: 2,
  z: 0.6, vz: -0.8, zg: 3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [X_THREAD, X_MID, X_DEEP], at: [0, 0.3, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Dust skirt driven out along the floor by the coil. */
const SKIRT: BurstOpts = {
  shape: 'streak', align: true, speed: 3.2, speedVar: 0.4, life: 0.5, lifeVar: 0.25, size: 0.055, sizeVar: 0.3,
  gravity: 0, drag: 5, layer: 'ground', ramp: rampOf({ stops: [X_SAND, X_LOAM], at: [0, 0.7] }), alphaCurve: FADE_LATE,
};

/** Dust puffs shoved out low by the wind. */
const SHOVE: BurstOpts = {
  shape: 'blob', speed: 1.3, speedVar: 0.4, life: 1.1, lifeVar: 0.3, size: 0.3, sizeVar: 0.25, gravity: 0, drag: 2.0,
  z: 0.05, vz: 0.3, zg: 1.0, mass: 0.8, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [X_LOAM, X_SAND, '#e2c384'], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: curveOf([0, 0.6, 0.3, 1, 0.7, 1.1, 1, 0.8]), alphaCurve: curveOf([0, 0.6, 0.5, 0.5, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/** The thread as it lies: a loose arc of pale grains at the rim. */
const THREAD_LIES: BurstOpts = {
  shape: 'streak', align: false, speed: 0.02, life: 7, lifeVar: 0.1, size: 0.06, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [X_THREAD, X_MID] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The wind's sigh: pale motes riding out on the whirl. */
const SIGH: BurstOpts = {
  shape: 'mote', speed: 0.6, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.16, sizeVar: 0.3, gravity: 0, drag: 0.6,
  z: 0.3, vz: 0.1, zg: 0, mass: 1.5, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [X_PALE, X_THREAD, X_MID], at: [0, 0.4, 0.9], steps: 4 }), sizeCurve: SWELL, alphaCurve: MIST_A,
};

export const voicesShearwind: EffectDef = {
  id: 'voices.shearwind',
  name: 'Voices — shearwind',
  story: 'one coil comes loose: the spindle stands bright at the axis and a pale thread pays out in a widening whirl, its free end whipping at the rim → dust is shoved out along the floor under it, the wind sighs → the bare spindle topples → the thread lies where it fell, a loose arc of grains at the rim beside the spindle\'s stain',
  layers: [
    { kind: 'field', name: 'the whirl', field: { kind: 'vortex', radius: 2.6, strength: 9.5, dur: 1.1, attack: 0.03, release: 0.3 }, radiusK: 1 },
    { kind: 'field', name: 'the coil lets go', field: { kind: 'attract', radius: 2.6, strength: -1.4, dur: 0.9, attack: 0.03, release: 0.3 }, radiusK: 1 },
    { kind: 'burst', name: 'spindle', recipe: recipe([X_PALE, X_THREAD], SPINDLE), count: 2, tier: 'hero', dz: 0.6 },
    { kind: 'burst', name: 'the thread', recipe: recipe([X_PALE, X_THREAD], THREAD), count: 14, tier: 'hero', arrange: 'disc', radius: 0.14 },
    { kind: 'burst', name: 'thread pays out', recipe: recipe([X_THREAD, X_MID], { ...THREAD, size: 0.07, trail: 6 }), count: 10, tier: 'fine', arrange: 'disc', radius: 0.18, at: 0.12 },
    { kind: 'burst', name: 'dust skirt', recipe: recipe([X_SAND, X_LOAM], SKIRT), count: 12, tier: 'fine', arrange: 'rim', radius: 0.15, outward: 3.2 },
    { kind: 'burst', name: 'dust shoved', recipe: recipe([X_LOAM, X_SAND], { ...SHOVE, size: 0.24 }), count: 12, tier: 'body', arrange: 'rim', radius: 0.25, outward: 1.4, at: 0.04 },
    { kind: 'emit', name: 'the sigh', arrange: 'disc', radius: 0.4, dz: 0.3, rate: 14, dur: 0.9, attack: 0.05, release: 0.3, tier: 'fine',
      pops: [{ colors: [X_PALE, X_THREAD], opts: SIGH, tier: 'fine' }] },
    { kind: 'burst', name: 'spindle topples', recipe: recipe([X_THREAD, X_MID], TOPPLE), count: 1, tier: 'hero', at: 0.9, aimed: true, dirOff: 0.6 },
    { kind: 'burst', name: 'thread lies', recipe: recipe([X_THREAD, X_MID], THREAD_LIES), count: 10, tier: 'hero', arrange: 'ring', radius: 0.95, radiusK: 0.95, at: 1.0 },
    { kind: 'glow', name: 'pale light', r: 1.5, rgb: X_GLOW, a: 0.2, dur: 0.6, attack: 0.02, release: 0.4, radiusK: 0.6 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const VOICES_PLANS: Record<string, AbilityPlan> = {
  // The surveyors: the plat is laid once and stays; every pulse (16
  // ticks) the field insists with a few more stakes.
  wild_root: { cues: [
    { id: 'voices.wild_root', scale: 1.0 },
    { id: 'voices.root_beat', at: 0.8, scale: 0.8, every: 0.8 },
  ] },
  // The long sunrise: one stretched sun — a radiant lance down the whole
  // corridor at finisher weight — and a second, lower pass a beat later
  // as the day climbs; its shed light settles as dew along the edges.
  day_breaks: { cues: [
    { id: 'arcane.beam', scale: 1.3 },
    { id: 'arcane.beam', at: 0.28, scale: 0.8 },
  ] },
  // The returned moon: it lands as a cold crack and a frost bed at the
  // mark, then the moon-dust fog settles where it went home.
  moonfall: { cues: [
    { id: 'frost.nova', scale: 1.3 },
    { id: 'frost.fog', at: 0.6, scale: 0.9, radiusK: 1 },
  ] },
  // The unwound bobbin: authored — the thread pays out on a whirl and
  // the crowd rearranges itself (knockback 3.2 is the ability's weight).
  shearwind: { cues: [{ id: 'voices.shearwind', scale: 1.1 }] },
  // The wax seal: each feather burns away where it lands (five small
  // blasts) and presses a seal — a small burning floor, post paid.
  the_molt: { cues: [
    { id: 'fire.burst', scale: 0.5 },
    { id: 'fire.floor', at: 0.15, scale: 0.35 },
  ] },
  // The polite pit: the dark comes up and holds over the field; each
  // beat the invitation is extended — the dark called inward, a pull
  // that persuades (knockback −1.2), never a drag.
  hollowing: { cues: [
    { id: 'shadow.veil', scale: 1.1, radiusK: 1 },
    { id: 'shadow.grasp', at: 0.8, scale: 0.6, every: 1.6 },
  ] },
  // The ledger thread: each hop the struck one pays (a wet hit at the far
  // end) and payment flows BACK along the thread to be swallowed at the
  // origin end (the tithe gathered at the near anchor).
  red_toll: { cues: [
    { id: 'blood.hit', scale: 0.8, atFar: true },
    { id: 'blood.drink', at: 0.15, scale: 0.7 },
  ] },
  // q.e.d.: every pulse (three, 9 ticks apart) restates the figure — a
  // shock ring races out with glass flying, and the inscription stands
  // under it, restated each time.
  axiom: { cues: [
    { id: 'arcane.shatter', scale: 0.75 },
    { id: 'arcane.sigil', at: 0.1, scale: 0.5 },
  ] },
  // The closest pass: the comet KISSES the ground (a white crack, shards,
  // a frost bed at finisher weight) and climbs away on the far side with
  // its tail draped onward across the circle; ice-dust settles after.
  perihelion: { cues: [
    { id: 'frost.nova', scale: 1.5 },
    { id: 'frost.breath', at: 0.12, scale: 1.0 },
    { id: 'frost.fog', at: 0.8, scale: 0.7 },
  ] },
  // The presentation: each hop is a herald's cord (a bolt spanning to the
  // head), and on the presented head a coronet arrives with ceremony —
  // gold gathers, flares, holds a beat as a halo, and lifts away.
  crownstorm: { cues: [
    { id: 'storm.arc', scale: 0.8 },
    { id: 'arcane.bloom', scale: 0.7, atFar: true },
  ] },
};

export const VOICES_EFFECTS: EffectDef[] = [voicesWildRoot, voicesRootBeat, voicesShearwind];
