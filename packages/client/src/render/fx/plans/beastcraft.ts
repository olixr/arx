/**
 * BEASTCRAFT — ability plans (particles v6 phase 5). Curated by this
 * roster's master pass: one plan per ability id, cues into the effect
 * library; roster-only effects live in BEASTCRAFT_EFFECTS and register
 * through the library index.
 *
 * The keeper's words are workings, never blows — care, call, and calm.
 * Every plan here is SMALL (0.4–0.7) and speaks the gentle materials:
 * a breath of water-mist, a ward of warm light, a heel's kick of dust,
 * blood that rises without spilling. Where the keeper's matter is its
 * own — the thrown poultice breaking green, the strewn table of grain
 * that IS its own lasting mark, and the whole tongue answered in signs —
 * the effect is authored here under the library's laws.
 *
 * Wire dialects: 'becalm' (at the stilled one), 'command' (caster with
 * x2 = the friend or the mark: `atFar` cues land on the friend), 'howl'
 * (the capstone's roll, radius 7 — scale pinned so the reach never
 * inflates the voice), 'summon' (the bait; one 500 ms ceremony whose
 * radius is its TRUE draw), 'buff' (the quiet walk's one ceremony).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';

const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST_A = curveOf('mist');
const SWELL = curveOf('swell');
const FLARE = curveOf('flare');
const SETTLE_A = curveOf([0, 1, 0.85, 1, 1, 0]);
const RING_OUT = curveOf([0, 0.3, 0.5, 2.2, 1, 3.0]);
const RING_A = curveOf([0, 0.9, 0.5, 0.7, 1, 0]);

// ---------------------------------------------------------------------------
// THE GREEN LANDING — keepers_balm (a poultice thrown TRUE breaks SOFTLY
// over the friend: wet, herb-leaf, two offset healing rings; herb flecks
// settle and lie for seven seconds)
// ---------------------------------------------------------------------------

const H_CORE = '#f0ffd8';
const H_HERB = '#a8d978';
const H_DEEP = '#4a6a2e';
const H_WET = '#bcdcef';
const H_FOAM = '#d8ecf7';
const H_GLOW = '150, 210, 120';

/** The bundle breaking: a soft pale flash at the body. */
const BREAK: BurstOpts = {
  shape: 'blob', speed: 0.2, life: 0.28, lifeVar: 0.15, size: 0.34, sizeVar: 0.2, gravity: 0,
  z: 0.5, layer: 'world', shadow: 0, ramp: rampOf({ stops: [H_CORE, H_HERB], at: [0, 0.7] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT, core: '#ffffff', coreK: 0.3,
};

/** Wet: pale drops off the poultice that fall and splat into flecks. */
const WET: BurstOpts = {
  shape: 'drop', speed: 0.7, speedVar: 0.6, life: 1.2, size: 0.05, sizeVar: 0.3, gravity: 0,
  vz: 1.2, zg: 8, land: 'splat', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [H_FOAM, H_WET], at: [0, 0.6] }), sizeCurve: HOLD,
};

/** Herb flecks: crushed-leaf squares thrown low that settle and lie. */
const HERB_FLECK: BurstOpts = {
  shape: 'square', speed: 0.7, speedVar: 0.6, life: 7, lifeVar: 0.12, size: 0.045, sizeVar: 0.3, gravity: 0, drag: 0.5,
  vz: 1.0, zg: 6, spin: 5, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [H_CORE, H_HERB, H_DEEP], at: [0, 0.3, 0.9] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** A healing ring walking out on the ground. */
const HEAL_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.8, lifeVar: 0.05, size: 0.4, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [H_CORE, H_HERB, H_DEEP], at: [0, 0.45, 0.9] }), sizeCurve: RING_OUT, alphaCurve: RING_A,
};

/** Herb haze: the balm's breath rising off the friend. */
const HERB_HAZE: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 1.2, lifeVar: 0.3, size: 0.18, sizeVar: 0.3, gravity: 0, drag: 0.8,
  z: 0.2, vz: 0.35, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [H_CORE, H_HERB], at: [0, 0.7], steps: 3 }), sizeCurve: SWELL, alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.9, waveAmp: 0.2,
};

export const beastcraftPoultice: EffectDef = {
  id: 'beastcraft.poultice',
  name: 'Beastcraft — green landing',
  story: 'the bundle breaks SOFTLY over the friend: a pale flash, wet drops splatting into flecks, crushed herb thrown low → two offset healing rings walk out under the stride → the balm\'s breath rises green → herb flecks settle and lie for seven seconds',
  layers: [
    { kind: 'burst', name: 'the break', recipe: recipe([H_CORE, H_HERB], BREAK), count: 2, tier: 'hero', dz: 0.5 },
    { kind: 'burst', name: 'wet', recipe: recipe([H_FOAM, H_WET], WET), count: 9, tier: 'body', dz: 0.5 },
    { kind: 'burst', name: 'herb flecks', recipe: recipe([H_CORE, H_HERB, H_DEEP], HERB_FLECK), count: 14, tier: 'hero', dz: 0.5 },
    { kind: 'burst', name: 'first ring', recipe: recipe([H_CORE, H_HERB], HEAL_RING), count: 1, tier: 'hero', at: 0.05 },
    { kind: 'burst', name: 'second ring', recipe: recipe([H_HERB, H_DEEP], { ...HEAL_RING, size: 0.32, life: 0.9 }), count: 1, tier: 'hero', at: 0.32 },
    { kind: 'emit', name: 'herb haze', arrange: 'disc', radius: 0.28, dz: 0.1, rate: 12, dur: 1.2, attack: 0.1, release: 0.5, tier: 'fine',
      pops: [{ colors: [H_CORE, H_HERB], opts: HERB_HAZE, tier: 'fine' }] },
    { kind: 'glow', name: 'herb light', r: 0.9, rgb: H_GLOW, a: 0.14, dur: 1.3, attack: 0.05, release: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// THE SCATTERED GRACE — strewn_bait (grain flies from the keeper's hand
// in a true fan — every kernel arcs, lands, and LIES there: the bait IS
// its lasting mark — while a ring of inward nose-dashes marks the true
// draw radius)
// ---------------------------------------------------------------------------

const G_CORE = '#fff8e0';
const G_GRAIN = '#c4a35a';
const G_DEEP = '#6a5426';
const G_SPARK = '#e8d8a0';
const G_DRIP = '#8a5a2e';
const G_LOAM = '#8a6f4d';
const G_GLOW = '200, 170, 100';

/** A kernel: a real body that arcs, lands, and lies for the bait's stand. */
const KERNEL: BurstOpts = {
  shape: 'square', speed: 1.8, speedVar: 0.4, life: 9, lifeVar: 0.1, size: 0.055, sizeVar: 0.25, gravity: 0, drag: 0.2,
  vz: 1.6, zg: 7, spin: 6, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [G_CORE, G_SPARK, G_GRAIN, G_DEEP], at: [0, 0.15, 0.5, 0.95], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Chaff off the throw: pale slivers that fly and die. */
const CHAFF: BurstOpts = {
  shape: 'streak', align: true, speed: 1.6, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.045, sizeVar: 0.3, gravity: 0, drag: 0.6,
  vz: 1.2, zg: 5, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [G_SPARK, G_GRAIN], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** Drippings: dark drops that splat among the grain. */
const DRIPPING: BurstOpts = {
  shape: 'drop', speed: 1.5, speedVar: 0.4, life: 1.4, size: 0.06, sizeVar: 0.3, gravity: 0,
  vz: 1.3, zg: 7, land: 'splat', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [G_GRAIN, G_DRIP], at: [0, 0.6] }), sizeCurve: HOLD,
};

/** Dust where the table lands. */
const LANDING_PUFF: BurstOpts = {
  shape: 'blob', speed: 0.3, speedVar: 0.5, life: 0.75, lifeVar: 0.25, size: 0.22, sizeVar: 0.25, gravity: 0, drag: 1.8,
  z: 0.02, vz: 0.3, zg: 0.8, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [G_LOAM, '#b89468', '#c9a978'], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: curveOf([0, 0.8, 0.5, 0.6, 1, 0]),
};

/** A nose-dash: a ground streak on the true draw radius, pointing in. */
const NOSE_DASH: BurstOpts = {
  shape: 'streak', align: true, speed: 0.3, life: 1.4, lifeVar: 0.2, size: 0.07, sizeVar: 0.2, gravity: 0, drag: 0.4,
  layer: 'ground', ramp: rampOf({ stops: [G_SPARK, G_GRAIN], at: [0, 0.6] }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.15, 0.7, 0.75, 0.6, 1, 0]),
};

export const beastcraftStrewnGrain: EffectDef = {
  id: 'beastcraft.strewn_grain',
  name: 'Beastcraft — strewn grain',
  story: 'the table is thrown, not laid: grain flies from the hand in a true fan, every kernel a real body that arcs, lands, and LIES there, chaff flying past it, drippings splatting among it, dust where it comes down → a ring of nose-dashes on the true draw radius points every wild nose at the table → the grain IS the lasting mark',
  layers: [
    { kind: 'burst', name: 'kernels', recipe: recipe([G_CORE, G_SPARK, G_GRAIN], KERNEL), count: 16, tier: 'hero', arrange: 'cone', spread: 0.7, dz: 0.6 },
    { kind: 'burst', name: 'second toss', recipe: recipe([G_SPARK, G_GRAIN, G_DEEP], { ...KERNEL, speed: 1.4, vz: 1.4 }), count: 10, tier: 'body', arrange: 'cone', spread: 0.8, dz: 0.55, at: 0.08 },
    { kind: 'burst', name: 'chaff', recipe: recipe([G_SPARK, G_GRAIN], CHAFF), count: 12, tier: 'fine', arrange: 'cone', spread: 0.9, dz: 0.6 },
    { kind: 'burst', name: 'drippings', recipe: recipe([G_GRAIN, G_DRIP], DRIPPING), count: 5, tier: 'hero', arrange: 'cone', spread: 0.6, dz: 0.6 },
    { kind: 'burst', name: 'landing dust', recipe: recipe([G_LOAM, '#b89468'], LANDING_PUFF), count: 5, tier: 'body', arrange: 'disc', radius: 0.3, along: 1.1, at: 0.42 },
    { kind: 'burst', name: 'nose-dashes', recipe: recipe([G_SPARK, G_GRAIN], NOSE_DASH), count: 18, tier: 'body', arrange: 'rim', radius: 1.0, radiusK: 1, outward: -0.3, at: 0.1 },
    { kind: 'glow', name: 'grain light', r: 0.8, rgb: G_GLOW, a: 0.08, dur: 0.9, attack: 0.05, release: 0.5, along: 0.8, at: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// EVERY EAR AT ONCE — voice_of_the_wild (the whole tongue, spoken once:
// as the capstone's ring rolls out, the world ANSWERS in signs that
// surface through the circle, bow once, and sink; a scatter of sign
// grains keeps the hearing)
// ---------------------------------------------------------------------------

const T_CORE = '#eafff4';
const T_MID = '#7ac4a0';
const T_DEEP = '#2c5a48';
const T_SPARK = '#c8e89a';
const T_GLOW = '140, 208, 160';

/** The ring rolls out to the tongue's whole reach (radius 7). */
const TONGUE_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 1.2, lifeVar: 0.05, size: 0.6, sizeVar: 0.02, gravity: 0, layer: 'ground',
  ramp: rampOf({ stops: [T_CORE, T_SPARK, T_MID], at: [0, 0.4, 0.85] }),
  sizeCurve: curveOf([0, 0.3, 0.6, 8.5, 1, 11]), alphaCurve: curveOf([0, 0.5, 0.6, 0.3, 1, 0]),
};

/** The speaker's breath: pale motes climbing the call. */
const CALL_BREATH: BurstOpts = {
  shape: 'mote', speed: 0.1, speedVar: 0.5, life: 1.0, lifeVar: 0.3, size: 0.2, sizeVar: 0.3, gravity: 0, drag: 0.6,
  z: 0.55, vz: 1.1, zg: 0, mass: 1.2, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [T_CORE, T_MID, T_DEEP], at: [0, 0.45, 0.9], steps: 4 }),
  sizeCurve: SWELL, alphaCurve: MIST_A, wave: 'noise', waveHz: 1.1, waveAmp: 0.2,
};

/** A sign surfacing: a green shard rising, turning once, sinking back. */
const SIGN: BurstOpts = {
  shape: 'shard', speed: 0.03, life: 2.0, lifeVar: 0.25, size: 0.09, sizeVar: 0.25, gravity: 0, spin: 3,
  vz: 1.0, zg: 1.8, land: 'settle', layer: 'world', shadow: 0.3,
  ramp: rampOf({ stops: [T_CORE, T_SPARK, T_MID, T_DEEP], at: [0, 0.25, 0.6, 0.95], steps: 5 }),
  sizeCurve: curveOf([0, 0.3, 0.2, 1, 0.8, 1, 1, 0.5]), alphaCurve: FADE_LATE,
};

/** The bow: leaf fines lying down where a sign turned. */
const BOW_FINE: BurstOpts = {
  shape: 'square', speed: 0.2, speedVar: 0.5, life: 1.5, lifeVar: 0.3, size: 0.04, sizeVar: 0.3, gravity: 0, drag: 0.8,
  z: 0.3, vz: -0.2, zg: 2, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [T_SPARK, T_MID], at: [0, 0.7] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** Sign grains that keep the hearing for eight seconds. */
const SIGN_GRAIN: BurstOpts = {
  shape: 'square', speed: 0.02, life: 8, lifeVar: 0.1, size: 0.055, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, ramp: rampOf({ stops: [T_MID, T_DEEP] }), sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

export const beastcraftWildVoice: EffectDef = {
  id: 'beastcraft.wild_voice',
  name: 'Beastcraft — voice of the wild',
  story: 'the whole tongue, spoken once: the keeper\'s breath climbs and the ring rolls out to the tongue\'s whole reach → the world ANSWERS in signs — green shards surface through the circle in four waves, turn once toward the speaker, and sink; leaf fines bow down where each turned → a scatter of sign grains keeps the hearing',
  layers: [
    { kind: 'field', name: 'the call', field: { kind: 'lift', radius: 0.6, strength: 1.9, dur: 1.0, height: 2.4, attack: 0.03, release: 0.3 } },
    { kind: 'burst', name: 'breath', recipe: recipe([T_CORE, T_MID], CALL_BREATH), count: 8, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.55 },
    { kind: 'burst', name: 'the ring rolls out', recipe: recipe([T_CORE, T_SPARK], TONGUE_RING), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'second ring', recipe: recipe([T_SPARK, T_MID], { ...TONGUE_RING, life: 1.3 }), count: 1, tier: 'hero', at: 0.28 },
    { kind: 'burst', name: 'signs surface', recipe: recipe([T_CORE, T_SPARK, T_MID], { ...SIGN, size: 0.07 }), count: 9, tier: 'hero', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.2, every: 0.3, times: 3 },
    { kind: 'burst', name: 'the bow', recipe: recipe([T_SPARK, T_MID], BOW_FINE), count: 12, tier: 'fine', arrange: 'disc', radius: 0.85, radiusK: 0.85, at: 0.5, every: 0.3, times: 3 },
    { kind: 'burst', name: 'sign grains', recipe: recipe([T_MID, T_DEEP], SIGN_GRAIN), count: 14, tier: 'hero', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 1.2 },
    { kind: 'glow', name: 'wild light', r: 1.6, rgb: T_GLOW, a: 0.18, dur: 1.8, attack: 0.1, release: 0.8, radiusK: 0.45 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const BEASTCRAFT_PLANS: Record<string, AbilityPlan> = {
  // The smoothed hackles: a breath let out over the wild one — a soft
  // mist settling on it — and a slow calm ward breathing underfoot while
  // its eyes stay down.
  soothe_the_wild: { cues: [
    { id: 'water.mist', scale: 0.45, radiusK: 0.6 },
    { id: 'arcane.sigil', at: 0.1, scale: 0.35 },
  ] },
  // The whistle's thread: a lance of light spools from keeper to friend,
  // the friend's heels throw dust as it breaks for home, and the meet
  // gathers to a small flash at the heel.
  come_to_heel: { cues: [
    { id: 'arcane.beam', scale: 0.5 },
    { id: 'dust.kick', at: 0.1, scale: 0.7, atFar: true },
    { id: 'arcane.bloom', at: 0.4, scale: 0.4 },
  ] },
  // The borrowed scent: an amber ribbon curls from the point to the mark
  // and loops it — a halo held on the mark while the command lives.
  point_the_fang: { cues: [
    { id: 'arcane.beam', scale: 0.5 },
    { id: 'arcane.orbit', at: 0.1, scale: 0.45, atFar: true },
  ] },
  // The green landing: the lob is the painted centerpiece; the library
  // speaks the BREAK over the friend after the arc (0.35 s), authored so
  // herb flecks lie for seven seconds.
  keepers_balm: { cues: [{ id: 'beastcraft.poultice', at: 0.35, scale: 0.6, atFar: true }] },
  // The scattered grace: authored — kernels that arc, land, and lie; the
  // nose-dash ring on the true 6-tile draw; scale pinned so the summon's
  // radius never inflates the voice.
  strewn_bait: { cues: [{ id: 'beastcraft.strewn_grain', scale: 0.9 }] },
  // The borrowed pelt: dawn mist through pines drapes over the caster
  // and fades as it seats; two paws set — you track as beast now.
  the_quiet_walk: { cues: [
    { id: 'water.mist', scale: 0.6, radiusK: 0.5 },
    { id: 'dust.kick', at: 0.3, scale: 0.5 },
  ] },
  // The shared pulse: the blood rises in two bodies — out of phase at
  // first (keeper, then friend), then the SAME beat stamps both at once.
  blood_of_the_pack: { cues: [
    { id: 'blood.drink', scale: 0.5 },
    { id: 'blood.drink', at: 0.3, scale: 0.5, atFar: true },
    { id: 'blood.drink', at: 1.3, scale: 0.6 },
    { id: 'blood.drink', at: 1.3, scale: 0.6, atFar: true },
  ] },
  // The hand under the chest: a dais of light wakes under the fallen
  // friend (three rings breathing), then the light gathers and flares —
  // it stands.
  the_keepers_cry: { cues: [
    { id: 'arcane.sigil', at: 0.1, scale: 0.7, atFar: true },
    { id: 'arcane.bloom', at: 0.5, scale: 0.6, atFar: true },
  ] },
  // Every ear at once: authored — the ring to the whole reach and the
  // signs answering; scale pinned (radius 7 would otherwise shout).
  voice_of_the_wild: { cues: [{ id: 'beastcraft.wild_voice', scale: 1.2 }] },
};

export const BEASTCRAFT_EFFECTS: EffectDef[] = [beastcraftPoultice, beastcraftStrewnGrain, beastcraftWildVoice];
