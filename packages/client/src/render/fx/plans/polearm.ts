/**
 * POLEARM — ability plans (particles v6 phase 5). THE LONG STEEL'S VOICE.
 *
 * Twenty-four abilities (fxSigsPolearm.ts): the school's twenty and the
 * armory's four. THE POINT AND THE LINE — every pierce is one line
 * driven through, never a starburst; the haft's butt is a blunt
 * instrument the ground pays for; gold appears only where the knight
 * rides. The library speaks it through five roster effects and the
 * dust, arcane, storm, frost and blood materials:
 *
 *   polearm.needle    the thrust corridor on an ARC wire (no far anchor
 *                     on the wire, so the head lives at `along` 3.0 —
 *                     the school's reach): three strata of aligned
 *                     streaks driven down the aim, a leaf-point flash
 *                     where the reach tops out, spent steel settling at
 *                     the far tick, the line withdrawn back down itself.
 *   polearm.bite      the head's bite at `along` 3.0: the pierce flash,
 *                     a ring snapping open across the lance, shock
 *                     spokes, steel sparks that land and prick, a press
 *                     of dust and two clods at the foot, a shove.
 *   polearm.corridor  the corridor on a BEAM/DASH wire (far anchor on
 *                     the wire): a bright bead sweeps near→far unrolling
 *                     the sleeve behind it, pierced-through rings stand
 *                     at three stations, spent steel lies the whole
 *                     line, the far bite flashes.
 *   polearm.reap      the swept edge (aimed cone): a hard leading fan
 *                     of edge streaks with two receding ghost fans, cut
 *                     straw thrown and lying, low scuff dust, clods.
 *   polearm.gyre      the full lap (rim, radiusK): the edge rides the
 *                     ring tangentially with two ghost laps, the haft's
 *                     counterweight runs the inner lap opposite, sod
 *                     tabs flip pale-side up, straw and scour settle.
 *
 * Arc wires carry dir + radius but no x2/y2: far-end reads on arcs go
 * through the needle/bite's fixed `along`; beam and dash wires carry
 * the far anchor and use path layers + `atFar`. Charges arrive at
 * dashTiles / 13 tiles·s⁻¹ (leaps at 14, dashes at 18) — the arrival
 * cues carry that as `at`.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { PALE, LOAM, SHADE, RAMP_CLOD, RAMP_MASS } from '../library/dust.js';

// ---------------------------------------------------------------------------
// Palette — steel, ash-wood, straw (the school's own unowned matter)
// ---------------------------------------------------------------------------

const WHITE = '#f6f9fc';
const BRIGHT = '#dfe8f0';
const STEEL = '#c4d2e2';
const IRON = '#8ea4b8';
const IRON_DEEP = '#5a6a7a';
const ASH = '#b09a6a';
const ASH_DEEP = '#6e5a44';
const STRAW_LIT = '#eadfae';
const STRAW = '#c9b070';
const STRAW_DEEP = '#8a7440';
const SOD_PALE = '#c8b890';

const STEEL_GLOW = '215, 228, 242';

/** Steel cooling: white → bright → steel → iron, five flat bands. */
const RAMP_STEEL = rampOf({ stops: [WHITE, BRIGHT, STEEL, IRON], at: [0, 0.3, 0.65, 0.92], steps: 5 });
/** The sleeve: dimmer steel from birth. */
const RAMP_SLEEVE = rampOf({ stops: [STEEL, IRON, IRON_DEEP], at: [0, 0.45, 0.9], steps: 4 });
/** Spent steel lying in the grass. */
const RAMP_SPENT = rampOf({ stops: [BRIGHT, STEEL, IRON, IRON_DEEP], at: [0, 0.2, 0.6, 0.95], steps: 4 });
/** Cut straw: lit in flight, dulling where it lies. */
const RAMP_STRAW = rampOf({ stops: [STRAW_LIT, STRAW, STRAW_DEEP], at: [0, 0.35, 0.9], steps: 4 });
/** Ash-wood: the haft's counterweight. */
const RAMP_ASH = rampOf({ stops: [ASH, ASH_DEEP], at: [0, 0.7], steps: 3 });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
const BOLT_A = curveOf([0, 1, 0.6, 0.9, 1, 0]);

/** The school's reach on an arc wire, tiles: where the head lives. */
const REACH = 3.0;

// ---------------------------------------------------------------------------
// Shared recipes
// ---------------------------------------------------------------------------

/** The bright core of the corridor: an aligned streak driven down the aim. */
const DRIVE: BurstOpts = {
  shape: 'streak', align: true, speed: 10, speedVar: 0.15, drag: 3, life: 0.32, lifeVar: 0.15,
  size: 0.12, sizeVar: 0.15, gravity: 0, z: 0.55, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

/** The deep sleeve: wider, dimmer, a hair behind. */
const SLEEVE: BurstOpts = {
  ...DRIVE, speed: 8.5, drag: 3, life: 0.36, size: 0.17, ramp: RAMP_SLEEVE, flicker: 0,
  alphaCurve: curveOf([0, 0.7, 0.5, 0.7, 1, 0]),
};

/** The hairline heart: thin, white, fastest. */
const HEART: BurstOpts = {
  ...DRIVE, speed: 11, drag: 3, life: 0.28, size: 0.06, ramp: rampOf({ stops: ['#ffffff', WHITE, BRIGHT], at: [0, 0.5, 0.9] }),
};

/** A leaf-point flash where the reach tops out. */
const POINT_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.1, life: 0.16, lifeVar: 0.1, size: 0.22, sizeVar: 0.1, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: ['#ffffff', WHITE, STEEL] }), core: '#ffffff', coreK: 0.5,
};

/** Spent steel: glints that fall out of the line, land, and lie. */
const SPENT: BurstOpts = {
  shape: 'glint', speed: 0.5, speedVar: 0.5, life: 6, lifeVar: 0.2, size: 0.05, sizeVar: 0.25, gravity: 0,
  z: 0.5, vz: 0.4, zg: 4, land: 'settle', layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_SPENT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 5,
};

/** Steel sparks: ballistic, dying on the dirt, pricking it. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 1.9, speedVar: 0.6, life: 0.5, lifeVar: 0.3, size: 0.045, gravity: 0,
  z: 0.5, vz: 1.5, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.5, trail: 5, trailColor: STEEL,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 1.4,
};

/** A hard ring snapping open across the lance: pierced through. */
const PIERCED_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.22, lifeVar: 0.05, size: 0.24, sizeVar: 0.04, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [WHITE, BRIGHT, STEEL], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.5, 0.5, 1.5, 1, 1.9]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]), ringWidth: 0.14,
};

/** Shock spokes thrown off a pierce. */
const SPOKE: BurstOpts = {
  shape: 'streak', align: true, speed: 2.6, speedVar: 0.3, life: 0.22, lifeVar: 0.2, size: 0.09, gravity: 0,
  z: 0.55, drag: 4, layer: 'world', shadow: 0, ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

/** A press of dust at the foot of a strike. */
const PRESS: BurstOpts = {
  shape: 'blob', speed: 0.8, speedVar: 0.4, life: 1.0, lifeVar: 0.3, size: 0.24, sizeVar: 0.25, gravity: 0, drag: 2.6,
  z: 0.03, vz: 0.3, zg: 1.1, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_MASS, sizeCurve: curveOf([0, 0.8, 0.3, 1.1, 1, 0.75]), alphaCurve: curveOf([0, 0.95, 0.5, 0.8, 1, 0]),
  wave: 'noise', waveHz: 1.5, waveAmp: 0.25,
};

/** A clod thrown and flecking. */
const CLOD: BurstOpts = {
  shape: 'shard', speed: 0.9, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.065, sizeVar: 0.3, gravity: 0, spin: 9,
  vz: 2.0, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world',
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 5,
};

/** Cut straw: thrown, tumbling, lying in the grass. */
const STRAW_CUT: BurstOpts = {
  shape: 'square', align: true, speed: 2.0, speedVar: 0.5, life: 5, lifeVar: 0.25, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.3, vz: 1.3, zg: 6, spin: 6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_STRAW, sizeCurve: HOLD, alphaCurve: SETTLE_A,
};

/** The scuff: low dust shoved along the swing. */
const SCUFF: BurstOpts = {
  ...PRESS, speed: 1.6, drag: 2.4, life: 1.1, size: 0.26,
};

// ---------------------------------------------------------------------------
// polearm.needle — the thrust corridor (arc wires)
// ---------------------------------------------------------------------------

export const polearmNeedle: EffectDef = {
  id: 'polearm.needle',
  name: 'Polearm — needle',
  story: 'one line driven through: the bright core snaps down the aim with the deep sleeve a hair behind and a hairline heart ahead → a leaf-point flash where the reach tops out → three spent steel grains fall at the far tick and lie → the line is withdrawn back down itself',
  layers: [
    { kind: 'burst', name: 'core', recipe: recipe([WHITE, BRIGHT, STEEL], { ...DRIVE, speedVar: 0.4 }), count: 8, tier: 'hero', arrange: 'cone', spread: 0.04 },
    { kind: 'burst', name: 'sleeve', recipe: recipe([STEEL, IRON], { ...SLEEVE, speedVar: 0.4 }), count: 8, tier: 'body', arrange: 'cone', spread: 0.08, at: 0.02 },
    { kind: 'burst', name: 'heart', recipe: recipe(['#ffffff', WHITE], { ...HEART, speedVar: 0.4 }), count: 6, tier: 'fine', arrange: 'cone', spread: 0.02 },
    { kind: 'burst', name: 'leaf head', recipe: recipe(['#ffffff', WHITE], POINT_FLASH), count: 1, tier: 'hero', along: REACH, at: 0.12 },
    { kind: 'burst', name: 'spent points', recipe: recipe([BRIGHT, STEEL], SPENT), count: 3, tier: 'hero', along: REACH, at: 0.14, arrange: 'cone', dirOff: Math.PI, spread: 0.6 },
    { kind: 'burst', name: 'withdraw', recipe: recipe([STEEL, IRON], { ...SLEEVE, speed: 8, size: 0.09, life: 0.26 }), count: 4, tier: 'body', along: REACH, at: 0.2, arrange: 'cone', dirOff: Math.PI, spread: 0.05 },
    { kind: 'glow', name: 'head light', r: 0.5, rgb: STEEL_GLOW, a: 0.16, dur: 0.16, attack: 0.01, release: 0.12, dz: 0.5, along: REACH, at: 0.12 },
  ],
};

// ---------------------------------------------------------------------------
// polearm.bite — the head's bite at the reach
// ---------------------------------------------------------------------------

export const polearmBite: EffectDef = {
  id: 'polearm.bite',
  name: 'Polearm — bite',
  story: 'the point goes in at the reach: a white pierce flash → a hard ring snaps open across the lance and shock spokes throw off it → steel sparks fly, land and prick the dirt → dust presses out at the foot and two clods hop and lie → the air is shoved',
  layers: [
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 0.8, strength: -1.6, dur: 0.3, attack: 0.02, release: 0.15 }, along: REACH },
    { kind: 'burst', name: 'pierce flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.34, life: 0.18 }), count: 1, tier: 'hero', along: REACH },
    { kind: 'burst', name: 'pierced ring', recipe: recipe([WHITE, BRIGHT], PIERCED_RING), count: 1, tier: 'hero', along: REACH, at: 0.02 },
    { kind: 'burst', name: 'shock spokes', recipe: recipe([WHITE, STEEL], SPOKE), count: 6, tier: 'body', along: REACH, arrange: 'rim', radius: 0.08, outward: 2.6 },
    { kind: 'burst', name: 'steel sparks', recipe: recipe([WHITE, STEEL], SPARK), count: 8, tier: 'fine', along: REACH },
    { kind: 'burst', name: 'press', recipe: recipe([LOAM, PALE], PRESS), count: 4, tier: 'body', along: REACH, arrange: 'disc', radius: 0.1 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 2, tier: 'hero', along: REACH },
    { kind: 'glow', name: 'bite light', r: 0.7, rgb: STEEL_GLOW, a: 0.2, dur: 0.2, attack: 0.01, release: 0.15, dz: 0.4, along: REACH },
  ],
};

// ---------------------------------------------------------------------------
// polearm.corridor — the corridor on a beam / dash wire (far anchor)
// ---------------------------------------------------------------------------

/** The bead: the bright wavefront running the line. */
const BEAD: EmitterPop[] = [
  { colors: ['#ffffff', WHITE], opts: { shape: 'glint', speed: 0, life: 0.2, lifeVar: 0.2, size: 0.16, sizeVar: 0.15, gravity: 0, z: 0.55, layer: 'world', shadow: 0, flicker: 0.3, ramp: rampOf({ stops: ['#ffffff', WHITE, BRIGHT] }), sizeCurve: FLARE, alphaCurve: FADE_OUT }, tier: 'hero' },
];

/** The sleeve unrolling behind the bead: aligned streaks lying along the aim. */
const UNROLL: EmitterPop[] = [
  { colors: [STEEL, IRON], opts: { shape: 'streak', align: true, speed: 0, life: 0.5, lifeVar: 0.2, size: 0.16, sizeVar: 0.2, gravity: 0, z: 0.55, layer: 'world', shadow: 0, ramp: RAMP_SLEEVE, sizeCurve: HOLD, alphaCurve: curveOf([0, 0.75, 0.6, 0.7, 1, 0]) }, weight: 2, tier: 'body' },
  { colors: [WHITE, BRIGHT], opts: { shape: 'streak', align: true, speed: 0, life: 0.42, lifeVar: 0.2, size: 0.07, sizeVar: 0.2, gravity: 0, z: 0.55, layer: 'world', shadow: 0, flicker: 0.4, ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A }, weight: 1.4, tier: 'fine' },
];

export const polearmCorridor: EffectDef = {
  id: 'polearm.corridor',
  name: 'Polearm — corridor',
  story: 'the line that travels: a bright bead runs the whole span, unrolling the sleeve behind it → a hard ring snaps open at each of three stations: pierced, pierced, pierced → spent steel falls out of the line and lies its whole length → the far bite flashes and sparks',
  layers: [
    { kind: 'emit', name: 'bead', arrange: 'path', toFar: true, sweep: 0.22, aimed: true, rate: 80, dur: 0.22, attack: 0, release: 0.02, tier: 'hero', pops: BEAD },
    { kind: 'emit', name: 'sleeve unrolls', arrange: 'path', toFar: true, sweep: 0.22, aimed: true, at: 0.02, rate: 150, dur: 0.24, attack: 0, release: 0.04, tier: 'body', pops: UNROLL },
    { kind: 'burst', name: 'stations', recipe: recipe([WHITE, BRIGHT], PIERCED_RING), count: 3, tier: 'hero', arrange: 'path', at: 0.1 },
    { kind: 'burst', name: 'station spokes', recipe: recipe([WHITE, STEEL], { ...SPOKE, speed: 2.0 }), count: 9, tier: 'body', arrange: 'path', at: 0.12 },
    { kind: 'emit', name: 'spent steel', arrange: 'path', toFar: true, at: 0.16, rate: 14, dur: 0.3, attack: 0, release: 0.05, tier: 'hero',
      pops: [{ colors: [BRIGHT, STEEL], opts: SPENT, tier: 'hero' }] },
    { kind: 'burst', name: 'far bite', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.3 }), count: 1, tier: 'hero', arrange: 'far', at: 0.24 },
    { kind: 'burst', name: 'far sparks', recipe: recipe([WHITE, STEEL], SPARK), count: 6, tier: 'fine', arrange: 'far', at: 0.24 },
    { kind: 'glow', name: 'cast light', r: 0.6, rgb: STEEL_GLOW, a: 0.15, dur: 0.25, attack: 0.01, release: 0.2, dz: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// polearm.reap — the swept edge (aimed cone)
// ---------------------------------------------------------------------------

/** The leading edge: a hard bright fan of aligned streaks. */
const EDGE: BurstOpts = {
  shape: 'streak', align: true, speed: 6, speedVar: 0.2, drag: 5, life: 0.3, lifeVar: 0.15,
  size: 0.13, sizeVar: 0.15, gravity: 0, z: 0.5, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

/** An edge-ghost: where the edge just was, thinner and dimmer. */
const GHOST: BurstOpts = {
  ...EDGE, speed: 5, size: 0.16, life: 0.28, ramp: RAMP_SLEEVE, flicker: 0,
  alphaCurve: curveOf([0, 0.6, 0.5, 0.5, 1, 0]),
};

export const polearmReap: EffectDef = {
  id: 'polearm.reap',
  name: 'Polearm — reap',
  story: 'a heavy blade went through here: the leading edge fans out hard along the swing → two receding edge-ghosts hang where it just was, each thinner and dimmer → cut straw is thrown and settles along the outer lip → scuff dust rolls low and clods hop and lie',
  layers: [
    { kind: 'field', name: 'swing wind', field: { kind: 'wind', radius: 1.6, strength: 1.5, dur: 0.5, attack: 0.02, release: 0.25 }, aimed: true },
    { kind: 'burst', name: 'edge', recipe: recipe([WHITE, BRIGHT, STEEL], EDGE), count: 7, tier: 'hero', arrange: 'cone', spread: 1.0 },
    { kind: 'burst', name: 'edge ghosts', recipe: recipe([STEEL, IRON], GHOST), count: 6, tier: 'body', arrange: 'cone', spread: 1.05, at: 0.06, every: 0.06, times: 1, decay: 0.7 },
    { kind: 'burst', name: 'cut straw', recipe: recipe([STRAW_LIT, STRAW], STRAW_CUT), count: 8, tier: 'hero', arrange: 'cone', spread: 1.0 },
    { kind: 'burst', name: 'straw fines', recipe: recipe([STRAW, STRAW_DEEP], { ...STRAW_CUT, size: 0.035, speed: 2.4, life: 3.5 }), count: 10, tier: 'fine', arrange: 'cone', spread: 1.1 },
    { kind: 'burst', name: 'scuff', recipe: recipe([LOAM, PALE], SCUFF), count: 6, tier: 'body', arrange: 'cone', spread: 0.9 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 3, tier: 'hero', arrange: 'cone', spread: 0.9 },
    { kind: 'glow', name: 'edge light', r: 0.9, rgb: STEEL_GLOW, a: 0.08, dur: 0.25, attack: 0.01, release: 0.2, dz: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// polearm.gyre — the full lap (rim, radiusK)
// ---------------------------------------------------------------------------

/** The edge riding the ring tangentially. */
const LAP: BurstOpts = {
  ...EDGE, speed: 4.5, drag: 3, life: 0.34, size: 0.14,
};

/** The haft's counterweight: ash-wood running the inner lap opposite. */
const COUNTERWEIGHT: BurstOpts = {
  ...EDGE, speed: 2.6, drag: 3, life: 0.36, size: 0.12, ramp: RAMP_ASH, flicker: 0,
  alphaCurve: curveOf([0, 0.7, 0.6, 0.6, 1, 0]),
};

/** A sod tab flipped pale-side up where the edge bit deepest. */
const SOD: BurstOpts = {
  ...CLOD, shape: 'square', size: 0.1, speed: 0.6, vz: 1.6, spin: 5, life: 3.2, markLife: 6,
  ramp: rampOf({ stops: [SOD_PALE, PALE, LOAM], at: [0, 0.4, 0.85], steps: 3 }),
};

export const polearmGyre: EffectDef = {
  id: 'polearm.gyre',
  name: 'Polearm — gyre',
  story: 'the whole circle: the edge runs a complete lap on the rim with two ghost laps behind it → the haft\'s counterweight runs the inner lap opposite → sod tabs flip pale-side up where the edge bit deepest → straw and scour settle in a scoured ring',
  layers: [
    { kind: 'field', name: 'turn', field: { kind: 'vortex', radius: 1.4, strength: 2.2, dur: 0.5, attack: 0.02, release: 0.25 }, radiusK: 1.1 },
    { kind: 'burst', name: 'lap', recipe: recipe([WHITE, BRIGHT, STEEL], LAP), count: 10, tier: 'hero', arrange: 'orbit', radius: 0.85, radiusK: 0.85 },
    { kind: 'burst', name: 'ghost laps', recipe: recipe([STEEL, IRON], { ...GHOST, speed: 4 }), count: 8, tier: 'body', arrange: 'orbit', radius: 0.85, radiusK: 0.85, at: 0.07, every: 0.07, times: 1, decay: 0.7 },
    { kind: 'burst', name: 'counterweight', recipe: recipe([ASH, ASH_DEEP], COUNTERWEIGHT), count: 6, tier: 'body', arrange: 'orbit', radius: 0.42, radiusK: 0.42, at: 0.04 },
    { kind: 'burst', name: 'sod tabs', recipe: recipe([SOD_PALE, PALE], SOD), count: 4, tier: 'hero', arrange: 'rim', radius: 0.85, radiusK: 0.85, outward: 0.6 },
    { kind: 'burst', name: 'straw', recipe: recipe([STRAW_LIT, STRAW], { ...STRAW_CUT, speed: 1.2 }), count: 10, tier: 'hero', arrange: 'rim', radius: 0.85, radiusK: 0.85, outward: 1.2 },
    { kind: 'burst', name: 'scour', recipe: recipe([LOAM, PALE], { ...SCUFF, size: 0.32, drag: 3.5, speedVar: 0.2 }), count: 18, tier: 'body', arrange: 'rim', radius: 0.8, radiusK: 0.8, outward: 0.5 },
    { kind: 'glow', name: 'ring light', r: 1.0, rgb: STEEL_GLOW, a: 0.08, dur: 0.3, attack: 0.01, release: 0.25, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

/** Arrival delay for a charge / leap / dash of `tiles` at the shared travel speed. */
const charge = (tiles: number): number => Math.round((tiles / 13) * 100) / 100;
const leap = (tiles: number): number => Math.round((tiles / 14) * 100) / 100;
const dash = (tiles: number): number => Math.round((tiles / 18) * 100) / 100;

export const POLEARM_PLANS: Record<string, AbilityPlan> = {
  // ---- THE TWENTY ---------------------------------------------------------

  // The reach that surprises: one needle corridor snaps out and is withdrawn; the front foot's skid is the only ground story.
  lunging_skewer: { cues: [{ id: 'polearm.needle', scale: 0.8 }, { id: 'dust.kick', scale: 0.45 }] },
  // The butt end: no point at all — the pressure bar shoves dust forward off the cap while the braced heel digs its trench backward.
  haft_strike: { cues: [
    { id: 'dust.slam', scale: 0.6 },
    { id: 'dust.kick', scale: 0.7 },
    { id: 'dust.billow', scale: 0.4, at: 0.1 },
  ] },
  // The hook comes home: the one art anchored out there — everything runs INWARD on the pull, and the beak's bite bleeds.
  hooking_reap: { cues: [{ id: 'blood.drink', scale: 0.8, radiusK: 1.2 }, { id: 'blood.hit', scale: 0.55, at: 0.12 }] },
  // The planted haft: the butt bites the dirt where the vault begins, and the body lands 7 tiles on at dash speed with a second stamp.
  vaulting_step: { cues: [{ id: 'dust.slam', scale: 0.6 }, { id: 'dust.slam', scale: 0.5, atFar: true, at: dash(7) }] },
  // One breath, one line: the whole corridor goes white at once — the biggest needle, its bite at the far tick — off a planted foot.
  perfect_thrust: { cues: [
    { id: 'polearm.needle', scale: 1.3 },
    { id: 'polearm.bite', scale: 0.9, at: 0.1 },
    { id: 'dust.kick', scale: 0.4 },
  ] },
  // The multi-stab: each beat three pricks down the same corridor on staggered sub-beat clocks — near, far, middle — spent points accumulating on the floor.
  flurry_of_points: { cues: [
    { id: 'polearm.needle', scale: 0.6 },
    { id: 'polearm.needle', scale: 0.45, at: 0.28 },
    { id: 'polearm.needle', scale: 0.4, at: 0.52 },
  ] },
  // The glaive's one answer: a swept EDGE with a trailing wake, cut straw settling along the outer lip, the pivot foot's scuff.
  crescent_reap: { cues: [{ id: 'polearm.reap', scale: 1.1 }, { id: 'dust.kick', scale: 0.5, at: 0.04 }] },
  // The line that travels: the bead runs the whole five tiles unrolling the sleeve, the floor is torn along the corridor, the point drives into the ground at the run's end.
  impaling_drive: { cues: [
    { id: 'polearm.corridor', scale: 1.2 },
    { id: 'dust.gouge', scale: 0.6, at: 0.05 },
    { id: 'dust.slam', scale: 0.4, atFar: true, at: 0.3 },
  ] },
  // The braced picket: each beat one shimmer walks the row of standing points and one foot bites fresh dust.
  wall_of_points: { cues: [{ id: 'polearm.needle', scale: 0.5 }, { id: 'dust.kick', scale: 0.6, at: 0.1 }] },
  // The gold goes first: gold rails laid down the chord, the road torn between them, and at the lane's end (10 tiles at charge speed) the BAR — the dust skirt thrown off its foot under a gold rim.
  knights_charge: { cues: [
    { id: 'arcane.beam', scale: 0.9 },
    { id: 'dust.gouge', scale: 0.9, at: 0.05 },
    { id: 'dust.slam', scale: 1.1, atFar: true, at: charge(10) },
    { id: 'arcane.bloom', scale: 0.6, atFar: true, at: charge(10) },
  ] },
  // The opened plate: the point goes in and the plate is pinned against something to be opened — a heavy bite at the reach, off a braced foot.
  rampart_breaker: { cues: [
    { id: 'polearm.needle', scale: 1.0 },
    { id: 'polearm.bite', scale: 1.3, at: 0.06 },
    { id: 'dust.kick', scale: 0.45 },
  ] },
  // The flicker: two slim needles flick out and back on opposite half-beats — one always going while the other comes. No ground story.
  serpents_tongue: { cues: [{ id: 'polearm.needle', scale: 0.5 }, { id: 'polearm.needle', scale: 0.45, at: 0.4 }] },
  // Point first, from above: the haft plants for the launch, and the landing (8 tiles at leap speed) answers in a star crack of dust that hangs after.
  skydriver_fall: { cues: [
    { id: 'dust.kick', scale: 0.6 },
    { id: 'dust.slam', scale: 1.4, radiusK: 1, atFar: true, at: leap(8) },
    { id: 'dust.billow', scale: 0.5, atFar: true, at: leap(8) + 0.3 },
  ] },
  // The line moves forward: the second gold — a halo of light at the top of the haft, a gold ward pointing the way underfoot, the steps already taken behind.
  banner_advance: { cues: [
    { id: 'arcane.orbit', scale: 0.7 },
    { id: 'arcane.sigil', scale: 0.5, at: 0.1 },
    { id: 'dust.kick', scale: 0.45 },
  ] },
  // The turning bar: each beat the haft turns a half lap around the body — it is the TIPS that do the work, and they kick dust.
  moulinet_guard: { cues: [{ id: 'polearm.gyre', scale: 0.7, radiusK: 1 }, { id: 'dust.kick', scale: 0.4, at: 0.2 }] },
  // The called strike: the sky answers the raised point with one hard bolt, and the rod discharges along the aim as a white corridor that bites at the reach.
  stormpoint: { cues: [
    { id: 'storm.strike', scale: 1.2 },
    { id: 'polearm.needle', scale: 1.0, at: 0.28 },
    { id: 'polearm.bite', scale: 0.9, at: 0.36 },
  ] },
  // The gate parts: the execute — the beak comes down into the seam and the heaviest bite in the school opens it, off a braced foot. Cold iron only.
  gatebreaker: { cues: [
    { id: 'polearm.needle', scale: 1.0 },
    { id: 'polearm.bite', scale: 1.5, at: 0.05 },
    { id: 'dust.kick', scale: 0.5 },
  ] },
  // The full lap: the halberd edge runs the whole circle with the counterweight opposite; the scoured ring's dust rolls after.
  sweeping_gyre: { cues: [{ id: 'polearm.gyre', scale: 1.3, radiusK: 1 }, { id: 'dust.billow', scale: 0.5, at: 0.3 }] },
  // Nothing walks through: each beat the level bar takes a hit and RINGS along its length, cold runs the front, and the heels' trenches are dug.
  hold_the_line_polearm: { cues: [
    { id: 'polearm.needle', scale: 0.45 },
    { id: 'frost.breath', scale: 0.5, at: 0.05 },
    { id: 'dust.kick', scale: 0.5 },
  ] },
  // The crown of the school: the longest line in the game — the gold corridor and the steel one laid together down the whole road, the floor torn under them, and the run finishing (12 tiles at charge speed) in a slam.
  sundering_lance: { cues: [
    { id: 'arcane.beam', scale: 1.4 },
    { id: 'polearm.corridor', scale: 1.4, at: 0.02 },
    { id: 'dust.gouge', scale: 0.9, at: 0.05 },
    { id: 'dust.slam', scale: 1.2, atFar: true, at: charge(12) },
  ] },

  // ---- THE ARMORY ---------------------------------------------------------

  // The hands give up the pole: one honest extension held a beat and let go — a needle, and a stop-line where the front foot planted.
  reaching_thrust: { cues: [{ id: 'polearm.needle', scale: 0.8 }, { id: 'dust.kick', scale: 0.4 }] },
  // The wheel, and the shove off the end of it: a heavy single sweep, then one bar struck square — the furrows thrown OUTWARD from the shove.
  reapers_turn: { cues: [
    { id: 'polearm.reap', scale: 1.1 },
    { id: 'dust.slam', scale: 0.7, at: 0.3 },
    { id: 'dust.kick', scale: 0.4 },
  ] },
  // The ladder of the haul: a pull — everything runs inward — and where the beak bit, the iron leaves its cold: a small rime star that stays.
  skullhook: { cues: [
    { id: 'blood.drink', scale: 0.8, radiusK: 1.2 },
    { id: 'blood.hit', scale: 0.45, at: 0.05 },
    { id: 'frost.shards', scale: 0.4, radiusK: 0.5, at: 0.15 },
  ] },
  // The short run, honestly priced: one gold thread (not a lane), two heel skids where it began, one stamp and three gold splinters where it stopped (7 tiles at charge speed).
  couched_charge: { cues: [
    { id: 'arcane.beam', scale: 0.5 },
    { id: 'dust.kick', scale: 0.6 },
    { id: 'dust.slam', scale: 0.6, atFar: true, at: charge(7) },
    { id: 'arcane.shatter', scale: 0.35, atFar: true, at: charge(7) },
  ] },
};

export const POLEARM_EFFECTS: EffectDef[] = [polearmNeedle, polearmBite, polearmCorridor, polearmReap, polearmGyre];
