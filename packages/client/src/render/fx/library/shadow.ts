/**
 * SHADOW — the dark that moves on purpose (particles v6, phase 5).
 *
 * Shadow is smoke's sinister cousin and the difference is INTENT.
 * Smoke drifts; shadow REACHES. Its masses wrap a body and hold, its
 * tongues curl along the floor toward things, its motes SINK into the
 * dirt instead of rising, and the ground goes cold where they touch.
 * Its heart is the world's own ink — the outline color every body
 * already wears — so shadow reads as the drawing itself come loose,
 * with the bruise-violet edge that keeps it legible on dark ground.
 *
 * SHADOW NEVER GLOWS. There is no glow layer in this file and there
 * never will be: the anchors are heroes and FIELDS, and the voice is
 * the deliberate absence of light where a glow would sit. The craft
 * is in how the dark MOVES — vortex and attract fields own every mass
 * here, so shadow gathers, turns, clenches and lets go.
 *
 * The strata, each on its own clock:
 *
 *   SHROUD    blob masses born big at low z, swelling and HOLDING —
 *             the dark that wraps a body and does not disperse
 *   TENDRIL   licks crawling on the floor, flung out then curled
 *             back by an attract field — the reach
 *   WISP      soul-flames: licks with a deep violet core, breathing
 *             on a z-sine, orbiting the point
 *   MOTE      the fines, born above and SINKING (negative vz) to die
 *             on the dirt, each leaving a brief cold FLECK
 *   CLOT      heroes: dark that lands, lies, and soaks in
 *   HUSH      the late voice — a thin violet haze that thins to
 *             nothing where the smoke would have been
 *
 * Palette shared with render/matter/shadow.ts — ONE-VOICE. VIOLET is
 * an intermediate stop for the wisp core (between BRUISE and EDGE in
 * value, a notch more saturated) — a ramp stop, not a sixth identity.
 */

import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { defineRecipe, type BurstOpts, type EmitterPop } from '../../particles.js';

/** The world's ink — shadow IS the outline come loose. */
export const INK = '#241a2e';
export const DEEP = '#332742';
export const BRUISE = '#3f3154';
export const EDGE = '#574a6e';
export const PALE = '#6e6084';
/** The bruise, saturated: the wisp's heart (intermediate stop). */
export const VIOLET = '#4a2f6e';

// ---------------------------------------------------------------------------
// Ramps — shadow is born DENSEST and thins toward its violet edge: the
// inverse of fire (hot→soot), because dispersing dark lets the world
// back through. Nothing ever brightens past PALE.
// ---------------------------------------------------------------------------

/** The mass: ink holding long, bruising only at the end. */
const RAMP_SHROUD = rampOf({ stops: [INK, INK, DEEP, BRUISE], at: [0, 0.45, 0.78, 1], steps: 5 });
/** Tendrils: born deep, darkening to ink as they curl home. */
const RAMP_TENDRIL = rampOf({ stops: [DEEP, INK, INK], at: [0, 0.5, 1] });
/** Wisps: a bruise body that deepens, never pales. */
const RAMP_WISP = rampOf({ stops: [BRUISE, DEEP, INK], at: [0, 0.55, 0.9], steps: 4 });
/** Motes: violet edge sinking to ink. */
const RAMP_MOTE = rampOf({ stops: [EDGE, BRUISE, DEEP], at: [0, 0.4, 0.8], steps: 4 });
/** The hush: thin violet haze thinning pale then gone. */
const RAMP_HUSH = rampOf({ stops: [BRUISE, EDGE, PALE], at: [0, 0.5, 0.9], steps: 4 });
/** Gathered tendrils: the dark CONCENTRATES as it comes in. */
const RAMP_GATHER = rampOf({ stops: [EDGE, BRUISE, DEEP, INK], at: [0, 0.3, 0.6, 0.85], steps: 5 });

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

/** Born at two thirds, swelling to full, HOLDING, letting go late. */
const SWELL_HOLD = curveOf([0, 0.62, 0.2, 1, 0.75, 1.02, 1, 0.7]);
/** Dense through the hold, gone in the last quarter. */
const DENSE_A = curveOf([0, 0.85, 0.12, 1, 0.72, 0.95, 1, 0]);
/** A wisp breathes: swells, sags, swells, gutters. */
const BREATHE = curveOf([0, 0.55, 0.3, 1, 0.55, 0.75, 0.8, 1, 1, 0]);
/** The clench: small, then SWELLS to full and holds, then collapses. */
const CLENCH = curveOf([0, 0.35, 0.25, 1, 0.7, 1.05, 1, 0.15]);
/** The inverted flash: full at birth, collapsing. */
const FLARE = curveOf('flare');
const DWINDLE = curveOf('dwindle');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const MIST_A = curveOf('mist');
const FADE_IN = curveOf('fadeIn');

// ---------------------------------------------------------------------------
// Grain templates
// ---------------------------------------------------------------------------

/** The shroud mass — big, low, swelling and holding, turned by fields. */
const SHROUD: BurstOpts = {
  shape: 'blob', speed: 0.22, speedVar: 0.5, life: 1.7, lifeVar: 0.3,
  size: 0.5, sizeVar: 0.3, gravity: 0, drag: 1.4,
  z: 0.1, vz: 0.03, zg: -0.015, mass: 0.6, layer: 'world', shadow: 0,
  ramp: RAMP_SHROUD, sizeCurve: SWELL_HOLD, alphaCurve: DENSE_A,
  wave: 'noise', waveHz: 0.6, waveAmp: 0.22, spin: 0.3,
};

/** A puff variant so the lobes have two silhouettes and merge. */
const SHROUD_PUFF: BurstOpts = { ...SHROUD, shape: 'puff', size: 0.44, spin: 0.4 };

/** The crawling tongue — rides its velocity along the floor. */
const TENDRIL: BurstOpts = {
  shape: 'lick', speed: 2.6, speedVar: 0.45, life: 1.5, lifeVar: 0.3,
  size: 0.2, sizeVar: 0.3, gravity: 0, drag: 1.3,
  z: 0.04, vz: 0, zg: 0, mass: 1.8, layer: 'world', shadow: 0,
  ramp: RAMP_TENDRIL, sizeCurve: curveOf([0, 1, 0.55, 0.95, 1, 0.3]), alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.6, waveAmp: 0.3,
};

/** The soul-flame: a lick with a violet heart, breathing on z. */
const WISP: BurstOpts = {
  shape: 'lick', speed: 0.12, speedVar: 0.5, life: 1.2, lifeVar: 0.3,
  size: 0.22, sizeVar: 0.25, gravity: 0, drag: 0.8,
  z: 0.3, vz: 0.12, zg: -0.03, mass: 1.3, layer: 'world', shadow: 0,
  ramp: RAMP_WISP, sizeCurve: BREATHE, alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.3, waveAmp: 0.55, waveAxis: 'z',
  core: VIOLET, coreK: 0.42,
};

/** The sinking mote — born above, falls INTO the dirt, leaves a cold fleck. */
const SINK_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.18, speedVar: 0.6, life: 1.6, lifeVar: 0.3,
  size: 0.055, sizeVar: 0.35, gravity: 0, drag: 0.6,
  z: 0.7, vz: -0.45, zg: 0.35, mass: 0.9, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_MOTE, sizeCurve: HOLD, alphaCurve: FADE_IN,
  wave: 'noise', waveHz: 1.4, waveAmp: 0.18,
  mark: 'fleck', markLife: 1.5,
};

/** The clot hero: a dark lump thrown low, landing, lying, soaking in. */
const CLOT: BurstOpts = {
  shape: 'blob', speed: 0.9, speedVar: 0.5, life: 1.9, lifeVar: 0.3,
  size: 0.15, sizeVar: 0.3, gravity: 0, drag: 0.8,
  z: 0.15, vz: 1.0, zg: 3.2, mass: 0, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [INK, INK, DEEP], at: [0, 0.6, 1], steps: 3 }),
  sizeCurve: curveOf([0, 1, 0.7, 0.95, 1, 0.5]), alphaCurve: FADE_LATE,
  mark: 'fleck', markLife: 2.8,
};

/** The hush — the late thin voice where smoke would sit. */
const HUSH: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 2.2, lifeVar: 0.3,
  size: 0.17, sizeVar: 0.3, gravity: 0, drag: 0.9,
  z: 0.15, vz: 0.1, zg: -0.03, mass: 0.4, layer: 'world', shadow: 0,
  ramp: RAMP_HUSH, sizeCurve: curveOf('swell'), alphaCurve: MIST_A,
  wave: 'noise', waveHz: 0.7, waveAmp: 0.2,
};

/** The inverted flash: a near-black flare with a violet core. */
const UNFLASH: BurstOpts = {
  shape: 'blob', speed: 0.3, life: 0.36, lifeVar: 0.15, size: 1.05, sizeVar: 0.2,
  gravity: 0, z: 0.25, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [INK, INK, DEEP], at: [0, 0.55, 0.85] }),
  sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: VIOLET, coreK: 0.38,
};

/** The shock ring on the ground, in the deep tone. */
const SHOCK: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [DEEP, BRUISE, EDGE], at: [0, 0.45, 0.8] }),
  sizeCurve: curveOf([0, 0.4, 0.55, 2.6, 1, 3.2]), alphaCurve: curveOf([0, 1, 0.5, 0.65, 1, 0]),
};

/** The grasp's contracting ring — the world's edge pulled inward. */
const CINCH: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [EDGE, BRUISE, DEEP], at: [0, 0.45, 0.8] }),
  sizeCurve: curveOf([0, 3.2, 0.7, 0.9, 1, 0.3]), alphaCurve: curveOf([0, 0.6, 0.4, 1, 1, 0]),
};

/** Motes a wisp DRIPS as it orbits — sinking, cold where they land. */
const DRIP_ID = defineRecipe({
  colors: [BRUISE, EDGE],
  opts: { ...SINK_MOTE, z: 0, vz: -0.3, zg: 0.5, speed: 0.06, life: 1.1, size: 0.045, markLife: 1.0 },
  count: 1,
  inherit: 0.15,
});

/** A wisp that drips. */
const WISP_DRIP: BurstOpts = { ...WISP, shed: DRIP_ID, shedRate: 1.6 };

// ---------------------------------------------------------------------------
// Populations
// ---------------------------------------------------------------------------

/** The standing shroud: masses, two silhouettes, and the sinking fines. */
const SHROUD_POPS: EmitterPop[] = [
  { colors: [INK, DEEP], opts: { ...SHROUD, size: 0.42, life: 1.6 }, weight: 1.5, tier: 'body' },
  { colors: [INK, DEEP], opts: { ...SHROUD_PUFF, size: 0.38, life: 1.5 }, weight: 1.0, tier: 'body' },
  { colors: [BRUISE, EDGE], opts: { ...SINK_MOTE, z: 0.6 }, weight: 1.1, tier: 'fine' },
];

/** Wisps orbiting: the dripping soul-flames and their fines. */
const WISP_POPS: EmitterPop[] = [
  { colors: [BRUISE, DEEP], opts: WISP_DRIP, weight: 2.0, tier: 'body' },
  { colors: [DEEP, INK], opts: { ...WISP, size: 0.16, z: 0.15, coreK: 0.35 }, weight: 1.0, tier: 'body' },
];

/** The cold floor after a burst: sinking motes and low creeping dark. */
const COLD_POPS: EmitterPop[] = [
  { colors: [BRUISE, EDGE], opts: SINK_MOTE, weight: 1.6, tier: 'fine' },
  { colors: [INK, DEEP], opts: { ...SHROUD, size: 0.26, z: 0.04, speed: 0.35, life: 1.3 }, weight: 1.0, tier: 'body' },
  { colors: [BRUISE, EDGE], opts: HUSH, weight: 0.7, tier: 'fine' },
];

/** The grasp's gathering rim: tongues and fines drawn to the heart. */
const GATHER_POPS: EmitterPop[] = [
  { colors: [EDGE, BRUISE], opts: { ...TENDRIL, speed: 1.4, life: 0.8, size: 0.16, ramp: RAMP_GATHER, mass: 2.2, waveAmp: 0.15 }, weight: 1.4, tier: 'body' },
  { colors: [EDGE, PALE], opts: { ...SINK_MOTE, z: 0.35, vz: -0.3, zg: 0.6, speed: 1.2, life: 0.9, mass: 2.6, mark: 'fleck', markLife: 0.9 }, weight: 1.6, tier: 'fine' },
];

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/**
 * shadow.veil — a standing dark shroud around a body. The masses are
 * born big and low, swell and HOLD while a slow vortex turns them; the
 * fines sink out of the shroud into the dirt; at the end an attract
 * field recalls what is left into the body and the last breath goes.
 */
export const shadowVeil: EffectDef = {
  id: 'shadow.veil',
  name: 'Shadow — veil',
  story: 'the dark comes up around the body and holds: blob masses swell low and turn on a slow vortex, tendrils creep the floor, motes sink into the dirt and leave it cold, then the veil is recalled into the body and goes',
  layers: [
    { kind: 'field', name: 'slow turn', field: { kind: 'vortex', radius: 1.1, strength: 1.6, dur: 2.9, attack: 0.3, release: 0.5 } },
    { kind: 'burst', name: 'first shroud', recipe: recipe([INK, DEEP], { ...SHROUD, life: 2.0 }), count: 10, tier: 'hero', arrange: 'disc', radius: 0.45, dz: 0.08 },
    { kind: 'burst', name: 'shroud lobes', recipe: recipe([INK, DEEP], { ...SHROUD_PUFF, life: 1.8 }), count: 7, tier: 'body', arrange: 'disc', radius: 0.45, dz: 0.3 },
    { kind: 'burst', name: 'creepers', recipe: recipe([DEEP, INK], { ...TENDRIL, speed: 1.8, life: 1.6, size: 0.17, mass: 0.6, sizeCurve: curveOf([0, 1, 0.6, 0.95, 1, 0.3]) }), count: 10, tier: 'body', at: 0.1, arrange: 'ring', radius: 0.3, radiusK: 0.3 },
    { kind: 'emit', name: 'shroud stands', arrange: 'disc', radius: 0.5, radiusK: 0.5, dz: 0.12, at: 0.2, rate: 24, dur: 2.5, attack: 0.2, release: 0.45, tier: 'body', pops: SHROUD_POPS },
    { kind: 'emit', name: 'sinking motes', arrange: 'disc', radius: 0.55, radiusK: 0.55, dz: 0.5, at: 0.3, rate: 12, dur: 2.2, attack: 0.3, release: 0.6, tier: 'fine',
      pops: [{ colors: [BRUISE, EDGE], opts: { ...SINK_MOTE, z: 0.4, vz: -0.3 } }] },
    { kind: 'burst', name: 'wisps', recipe: recipe([BRUISE, DEEP], { ...WISP, size: 0.18 }), count: 3, tier: 'body', arrange: 'ring', radius: 0.45, radiusK: 0.45, dz: 0.35, at: 0.5, every: 0.6, times: 3 },
    { kind: 'field', name: 'recall', field: { kind: 'attract', radius: 1.6, strength: 11, dur: 0.7, attack: 0.08, release: 0.2 }, at: 2.55 },
    { kind: 'burst', name: 'last breath', recipe: recipe([INK, DEEP], { ...SHROUD, size: 0.3, life: 0.7, speed: 0.12, sizeCurve: DWINDLE, alphaCurve: FADE_OUT }), count: 5, tier: 'body', at: 2.85, arrange: 'disc', radius: 0.15, dz: 0.2 },
    { kind: 'burst', name: 'hush', recipe: recipe([BRUISE, EDGE], HUSH), count: 4, tier: 'fine', at: 2.6, arrange: 'disc', radius: 0.4, dz: 0.3 },
  ],
};

/**
 * shadow.burst — a detonation of dark. The inverted flash (ink with a
 * violet heart), a shock ring in the deep tone, the mass spreading
 * low, tendrils flung out and CURLED BACK by an undertow, motes
 * sinking into the dirt and leaving it cold, clots that land and lie,
 * and a thin violet hush where the smoke would have been.
 */
export const shadowBurst: EffectDef = {
  id: 'shadow.burst',
  name: 'Shadow — burst',
  story: 'an inverted flash and a deep shock ring → the dark mass spreads low → tendrils fling out and curl back on the undertow → motes sink into the dirt and the ground goes cold in flecks → clots land and lie → a violet hush thins to nothing',
  layers: [
    { kind: 'burst', name: 'shock', recipe: recipe([DEEP, BRUISE], SHOCK), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'unflash', recipe: recipe([INK, INK], UNFLASH), count: 3, tier: 'hero' },
    { kind: 'burst', name: 'mass', recipe: recipe([INK, DEEP], { ...SHROUD, speed: 1.0, speedVar: 0.55, drag: 2.4, life: 1.4, size: 0.44, sizeCurve: DWINDLE, alphaCurve: FADE_LATE }),
      count: 14, tier: 'body', arrange: 'disc', radius: 0.24, dz: 0.06 },
    { kind: 'burst', name: 'pool', recipe: recipe([INK, DEEP], { ...SHROUD, speed: 0.3, drag: 2.0, life: 2.4, size: 0.46, z: 0.02, vz: 0, zg: 0, mass: 0.2, waveAmp: 0.1 }),
      count: 7, tier: 'hero', at: 0.12, arrange: 'disc', radius: 0.3, dz: 0.02 },
    { kind: 'burst', name: 'tendrils', recipe: recipe([DEEP, INK, BRUISE], TENDRIL), count: 10, tier: 'body' },
    { kind: 'burst', name: 'motes', recipe: recipe([BRUISE, EDGE], { ...SINK_MOTE, speed: 0.9, z: 0.55, vz: -0.3 }), count: 16, tier: 'fine' },
    { kind: 'burst', name: 'clots', recipe: recipe([INK, DEEP], CLOT), count: 5, tier: 'hero' },
    { kind: 'field', name: 'undertow', field: { kind: 'attract', radius: 2.4, strength: 5.0, dur: 1.4, attack: 0.1, release: 0.4 }, at: 0.2 },
    { kind: 'field', name: 'curl', field: { kind: 'vortex', radius: 2.2, strength: 2.6, dur: 1.4, attack: 0.1, release: 0.4 }, at: 0.2 },
    { kind: 'burst', name: 'second mass', recipe: recipe([INK, DEEP], { ...SHROUD_PUFF, speed: 0.5, life: 1.1, size: 0.32, sizeCurve: DWINDLE, alphaCurve: FADE_LATE }),
      count: 6, tier: 'body', at: 0.14, arrange: 'disc', radius: 0.25, dz: 0.3 },
    { kind: 'burst', name: 'second reach', recipe: recipe([DEEP, INK], { ...TENDRIL, speed: 1.4, life: 0.9, size: 0.15 }), count: 6, tier: 'body', at: 0.3 },
    { kind: 'emit', name: 'cold floor', arrange: 'disc', radius: 0.6, radiusK: 0.6, at: 0.3, rate: 18, dur: 1.3, attack: 0.1, release: 0.5, tier: 'body', pops: COLD_POPS },
    { kind: 'emit', name: 'hush', arrange: 'disc', radius: 0.4, dz: 0.3, at: 0.8, rate: 4, dur: 1.4, attack: 0.2, release: 0.6, tier: 'fine',
      pops: [{ colors: [BRUISE, EDGE], opts: HUSH }] },
  ],
};

/**
 * shadow.wisps — soul-flames orbiting the point. Two counter-turning
 * orbit heads lay licks with a violet heart that breathe on a z-sine
 * and drip motes into the dirt; a vortex wraps them round the body;
 * at the end they are drawn in and gutter.
 */
export const shadowWisps: EffectDef = {
  id: 'shadow.wisps',
  name: 'Shadow — wisps',
  story: 'soul-flames wake in a ring and orbit the body, licks with a violet heart breathing on a z wave, dripping motes that sink into the dirt; a slow vortex wraps them; at the end they are drawn in and gutter out',
  layers: [
    { kind: 'field', name: 'wrap', field: { kind: 'vortex', radius: 1.2, strength: 2.4, dur: 2.9, attack: 0.2, release: 0.5 } },
    { kind: 'burst', name: 'waking', recipe: recipe([BRUISE, DEEP], { ...WISP, life: 1.4, size: 0.3, sizeCurve: curveOf('bloom') }), count: 7, tier: 'hero', arrange: 'ring', radius: 0.5, radiusK: 0.5, dz: 0.3 },
    { kind: 'burst', name: 'first drips', recipe: recipe([BRUISE, EDGE], { ...SINK_MOTE, z: 0.35, vz: -0.3 }), count: 8, tier: 'fine', arrange: 'ring', radius: 0.5, radiusK: 0.5 },
    { kind: 'emit', name: 'orbit', arrange: 'orbit', radius: 0.52, radiusK: 0.52, dz: 0.3, at: 0.15, rate: 26, dur: 2.5, attack: 0.2, release: 0.6, orbitSpeed: 2.4, tier: 'body', pops: WISP_POPS },
    { kind: 'emit', name: 'counter orbit', arrange: 'orbit', radius: 0.34, radiusK: 0.34, dz: 0.55, at: 0.35, rate: 10, dur: 2.2, attack: 0.2, release: 0.6, orbitSpeed: -1.7, tier: 'body',
      pops: [{ colors: [DEEP, INK], opts: { ...WISP, size: 0.15, vz: 0.18, waveAmp: 0.4, coreK: 0.35 } }] },
    { kind: 'emit', name: 'floor dark', arrange: 'disc', radius: 0.4, radiusK: 0.4, dz: 0.03, at: 0.3, rate: 10, dur: 2.2, attack: 0.3, release: 0.7, tier: 'body',
      pops: [{ colors: [INK, DEEP], opts: { ...SHROUD, size: 0.34, z: 0.03, speed: 0.12, life: 1.6, mass: 0.2 } }] },
    { kind: 'field', name: 'draw in', field: { kind: 'attract', radius: 1.2, strength: 5, dur: 0.6, attack: 0.1, release: 0.2 }, at: 2.5 },
    { kind: 'burst', name: 'gutter', recipe: recipe([INK, DEEP], { ...WISP, size: 0.2, life: 0.6, vz: 0.4, sizeCurve: DWINDLE, alphaCurve: FADE_OUT, waveAmp: 0.2 }), count: 7, tier: 'body', at: 2.8, arrange: 'disc', radius: 0.15, dz: 0.25 },
  ],
};

/**
 * shadow.grasp — a pull. Tendrils and motes are GATHERED from a wide
 * ring into the heart by a strong attract field, the world's edge
 * cinches inward on the ground, a dark clench swells at the center
 * when they arrive, then it lets go — a repel beat throws a last ring
 * of tongues outward and the motes sink into the cold ground.
 */
export const shadowGrasp: EffectDef = {
  id: 'shadow.grasp',
  name: 'Shadow — grasp',
  story: 'the dark is called in: tendrils and motes gathered from a wide ring into the heart by a strong pull, the ground edge cinching inward, a dark clench swelling at the center when they arrive, then the release — a last ring of tongues thrown outward and the motes sink cold into the dirt',
  layers: [
    { kind: 'field', name: 'draw', field: { kind: 'attract', radius: 2.4, strength: 7, dur: 0.95, attack: 0.05, release: 0.2 } },
    { kind: 'burst', name: 'cinch', recipe: recipe([EDGE, BRUISE], CINCH), count: 1, tier: 'hero', at: 0.05 },
    { kind: 'burst', name: 'reach', recipe: recipe([EDGE, BRUISE], { ...TENDRIL, speed: 1.3, life: 0.85, size: 0.17, ramp: RAMP_GATHER, mass: 2.4, waveAmp: 0.15 }),
      count: 14, tier: 'body', arrange: 'rim', radius: 1.6, radiusK: 1.6, outward: -1.3 },
    { kind: 'burst', name: 'called motes', recipe: recipe([EDGE, PALE], { ...SINK_MOTE, z: 0.4, vz: -0.35, zg: 0.6, speed: 1.1, life: 1.0, mass: 2.8, markLife: 0.9 }),
      count: 16, tier: 'fine', arrange: 'rim', radius: 1.8, radiusK: 1.8, outward: -1.2, at: 0.04 },
    { kind: 'emit', name: 'gathering', arrange: 'rim', radius: 1.5, radiusK: 1.5, dz: 0.1, at: 0.08, rate: 30, dur: 0.5, attack: 0.05, release: 0.15, outward: -1.4, tier: 'body', pops: GATHER_POPS },
    { kind: 'burst', name: 'clench', recipe: recipe([INK, INK], { ...SHROUD, speed: 0.08, life: 0.8, size: 0.5, z: 0.15, mass: 0, sizeCurve: CLENCH, alphaCurve: DENSE_A, core: VIOLET, coreK: 0.3 }),
      count: 5, tier: 'hero', at: 0.5, arrange: 'disc', radius: 0.12, dz: 0.1 },
    { kind: 'burst', name: 'clench lobes', recipe: recipe([INK, DEEP], { ...SHROUD_PUFF, speed: 0.1, life: 0.7, size: 0.34, mass: 0, sizeCurve: CLENCH, alphaCurve: DENSE_A }),
      count: 4, tier: 'body', at: 0.56, arrange: 'disc', radius: 0.2, dz: 0.3 },
    { kind: 'field', name: 'release', field: { kind: 'attract', radius: 1.6, strength: -6, dur: 0.4, attack: 0.03, release: 0.15 }, at: 0.98 },
    { kind: 'burst', name: 'let go', recipe: recipe([DEEP, INK], { ...TENDRIL, speed: 1.8, life: 1.1, size: 0.17, ramp: RAMP_TENDRIL }), count: 12, tier: 'body', at: 1.0 },
    { kind: 'burst', name: 'spent motes', recipe: recipe([BRUISE, EDGE], { ...SINK_MOTE, speed: 0.6, z: 0.35, vz: -0.4 }), count: 10, tier: 'fine', at: 1.0 },
    { kind: 'burst', name: 'clots', recipe: recipe([INK, DEEP], { ...CLOT, speed: 0.6, vz: 0.7 }), count: 3, tier: 'hero', at: 1.0 },
    { kind: 'burst', name: 'hush', recipe: recipe([BRUISE, EDGE], { ...HUSH, life: 1.6 }), count: 5, tier: 'fine', at: 1.1, arrange: 'disc', radius: 0.35, dz: 0.25 },
  ],
};

export const SHADOW_EFFECTS: EffectDef[] = [shadowVeil, shadowBurst, shadowWisps, shadowGrasp];
