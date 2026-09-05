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
 *
 * THE VOICE (Phase 4) in-world read: the steel was first authored for the
 * 64-px sheet and read as a hairline in the 40-px meadow — the core,
 * sleeve, flashes, rings, pikes and shackle were widened a third and the
 * payoff scales lifted so a thrust reads across the yard, budgets kept.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { PALE, LOAM, SHADE, RAMP_CLOD, RAMP_MASS } from '../library/dust.js';
import { STORM_EFFECTS } from '../library/storm.js';

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
  shape: 'streak', align: true, speed: 10, speedVar: 0.15, drag: 3, life: 0.44, lifeVar: 0.15,
  size: 0.27, sizeVar: 0.15, gravity: 0, z: 0.55, layer: 'world', shadow: 0, flicker: 0.2,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A,
};

/** The deep sleeve: wider, dimmer, a hair behind. */
const SLEEVE: BurstOpts = {
  ...DRIVE, speed: 8.5, drag: 3, life: 0.5, size: 0.42, ramp: RAMP_SLEEVE, flicker: 0,
  alphaCurve: curveOf([0, 0.7, 0.5, 0.7, 1, 0]),
};

/** The hairline heart: thin, white, fastest. */
const HEART: BurstOpts = {
  ...DRIVE, speed: 11, drag: 3, life: 0.36, size: 0.12, ramp: rampOf({ stops: ['#ffffff', WHITE, BRIGHT], at: [0, 0.5, 0.9] }),
};

/** A leaf-point flash where the reach tops out. */
const POINT_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.1, life: 0.3, lifeVar: 0.1, size: 0.55, sizeVar: 0.1, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  ramp: rampOf({ stops: ['#ffffff', WHITE, STEEL] }), core: '#ffffff', coreK: 0.5,
};

/** Spent steel: glints that fall out of the line, land, and lie. */
const SPENT: BurstOpts = {
  shape: 'glint', speed: 0.5, speedVar: 0.5, life: 6, lifeVar: 0.2, size: 0.085, sizeVar: 0.25, gravity: 0,
  z: 0.5, vz: 0.4, zg: 4, land: 'settle', layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_SPENT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 5,
};

/** Steel sparks: ballistic, dying on the dirt, pricking it. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 1.9, speedVar: 0.6, life: 0.55, lifeVar: 0.3, size: 0.07, gravity: 0,
  z: 0.5, vz: 1.5, zg: 9, land: 'die', layer: 'world', shadow: 0, flicker: 0.5, trail: 5, trailColor: STEEL,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 1.4,
};

/** A hard ring snapping open across the lance: pierced through. */
const PIERCED_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.36, lifeVar: 0.05, size: 0.5, sizeVar: 0.04, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [WHITE, BRIGHT, STEEL], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.5, 0.5, 1.5, 1, 1.9]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]), ringWidth: 0.18,
};

/** Shock spokes thrown off a pierce. */
const SPOKE: BurstOpts = {
  shape: 'streak', align: true, speed: 2.6, speedVar: 0.3, life: 0.3, lifeVar: 0.2, size: 0.18, gravity: 0,
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
    { kind: 'glow', name: 'head light', r: 1.0, rgb: STEEL_GLOW, a: 0.36, dur: 0.3, attack: 0.01, release: 0.12, dz: 0.5, along: REACH, at: 0.12 },
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
    { kind: 'burst', name: 'pierce flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.75, life: 0.32 }), count: 1, tier: 'hero', along: REACH },
    { kind: 'burst', name: 'pierced ring', recipe: recipe([WHITE, BRIGHT], PIERCED_RING), count: 1, tier: 'hero', along: REACH, at: 0.02 },
    { kind: 'burst', name: 'shock spokes', recipe: recipe([WHITE, STEEL], SPOKE), count: 6, tier: 'body', along: REACH, arrange: 'rim', radius: 0.08, outward: 2.6 },
    { kind: 'burst', name: 'steel sparks', recipe: recipe([WHITE, STEEL], SPARK), count: 8, tier: 'fine', along: REACH },
    { kind: 'burst', name: 'press', recipe: recipe([LOAM, PALE], PRESS), count: 4, tier: 'body', along: REACH, arrange: 'disc', radius: 0.1 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 2, tier: 'hero', along: REACH },
    { kind: 'glow', name: 'bite light', r: 1.3, rgb: STEEL_GLOW, a: 0.4, dur: 0.3, attack: 0.01, release: 0.15, dz: 0.4, along: REACH },
  ],
};

/** The same bite at the anchor itself: for far anchors and landings, which carry no reach. */
export const polearmBiteHere: EffectDef = {
  ...polearmBite, id: 'polearm.bite_here', name: 'Polearm — bite (here)',
  layers: polearmBite.layers.map((l) => ({ ...l, along: 0 })),
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
  size: 0.18, sizeVar: 0.15, gravity: 0, z: 0.5, layer: 'world', shadow: 0, flicker: 0.2,
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
  ...EDGE, speed: 4.5, drag: 3, life: 0.34, size: 0.19,
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
// THE MASTERED HAND, Phase 4 — THE VOICE. The school's three WORDS made
// visible: ROOT is a stake driven into the ground that STANDS while the
// hold lasts (polearm.root_stake), HOOK is the yard dragged in onto one
// lane (polearm.hook_pull), LINE is the corridor drawn and kept
// (polearm.torn_road / polearm.formation / polearm.picket). Payoffs
// break the stake (polearm.skewer_burst); the seam the breaker opens is
// a crack that stays (polearm.crack). `far` variants sit at the school's
// REACH for arc wires (no far anchor on the wire).
// ---------------------------------------------------------------------------

const DARK_IRON = '#3a444f';
const IRON_GLOW = '170, 190, 210';
const ASH_GLOW = '196, 176, 132';

/** Iron that stays iron: a dim four-band ramp for matter that STANDS. */
const RAMP_STANDING = rampOf({ stops: [BRIGHT, STEEL, IRON, IRON_DEEP], at: [0, 0.15, 0.7, 1], steps: 4 });
/** The crack's ramp: black iron opening to a cold seam and closing dark. */
const RAMP_CRACK = rampOf({ stops: [DARK_IRON, IRON_DEEP, DARK_IRON], at: [0, 0.5, 1], steps: 3 });

/** The stand: flare in, hold, and go out on the last tenth. */
const STAND_A = curveOf([0, 0, 0.08, 1, 0.85, 1, 1, 0]);
const STAND_S = curveOf([0, 0.3, 0.08, 1, 1, 1]);

/** A pike STANDING in the ground: a vertical sliver (velocity is up, and barely). */
const PIKE: BurstOpts = {
  shape: 'streak', speed: 0, life: 2.4, lifeVar: 0.08, size: 0.32, sizeVar: 0.12, gravity: 0,
  z: 0.05, vz: 0.05, zg: 0, layer: 'world', shadow: 0, flicker: 0.12,
  ramp: RAMP_STANDING, sizeCurve: STAND_S, alphaCurve: STAND_A,
};

/** The pike's head: a glint riding above the sliver. */
const PIKE_HEAD: BurstOpts = {
  shape: 'glint', speed: 0, life: 2.3, lifeVar: 0.1, size: 0.12, sizeVar: 0.15, gravity: 0,
  z: 0.5, vz: 0.05, zg: 0, layer: 'world', shadow: 0, flicker: 0.5,
  ramp: rampOf({ stops: ['#ffffff', WHITE, STEEL], at: [0, 0.4, 1], steps: 3 }), sizeCurve: STAND_S, alphaCurve: STAND_A,
};

/** The shackle: a ring that snaps open and HOLDS at its reach. */
const SHACKLE: BurstOpts = {
  shape: 'ring', speed: 0, life: 2.4, lifeVar: 0.05, size: 1.15, gravity: 0, z: 0.02, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WHITE, STEEL, IRON, IRON_DEEP], at: [0, 0.12, 0.6, 1], steps: 4 }),
  sizeCurve: curveOf([0, 0.25, 0.1, 1, 1, 1.05]), alphaCurve: curveOf([0, 1, 0.12, 0.85, 0.85, 0.7, 1, 0]), ringWidth: 0.15,
};

/** A furrow dragged along the ground: an aligned slab that lies and smears. */
const FURROW: BurstOpts = {
  shape: 'square', align: true, speed: 2.2, speedVar: 0.3, drag: 1.6, life: 1.6, lifeVar: 0.2, size: 0.1, sizeVar: 0.3,
  gravity: 0, z: 0.02, vz: 0, zg: 0, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'smear', markLife: 4,
};

/** A hook coming in: an aligned iron streak drawn toward the centre. */
const HOOK: BurstOpts = {
  shape: 'streak', align: true, speed: 6, speedVar: 0.2, drag: 2.2, life: 0.42, lifeVar: 0.15, size: 0.2, sizeVar: 0.2,
  gravity: 0, z: 0.45, layer: 'world', shadow: 0, flicker: 0.15,
  ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A, mass: 0.6,
};

/** The broken stake: iron shards flung on true height, landing and flecking. */
const SHARD_IRON: BurstOpts = {
  shape: 'shard', speed: 2.0, speedVar: 0.5, life: 2.2, lifeVar: 0.3, size: 0.08, sizeVar: 0.3, gravity: 0, spin: 11,
  z: 0.4, vz: 2.6, zg: 9, land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: RAMP_SPENT, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
};

/** A fast shock ring: the pierce's pressure wave. */
const SHOCK: BurstOpts = {
  ...PIERCED_RING, life: 0.26, size: 0.36, sizeCurve: curveOf([0, 0.4, 0.5, 2.2, 1, 2.9]), ringWidth: 0.13,
};

/** The crack itself: a dark jagged bolt that stays open. */
const CRACK: BurstOpts = {
  shape: 'bolt', speed: 0, life: 2.4, lifeVar: 0.05, size: 0.1, gravity: 0, z: 0.35, z2: 0.05, layer: 'world', shadow: 0,
  boltRate: 0.4, boltBranch: 0.5, ramp: RAMP_CRACK, sizeCurve: STAND_S, alphaCurve: STAND_A,
};

/** Grit sifting out of an opened seam. */
const GRIT: EmitterPop[] = [
  { colors: [LOAM, SHADE], opts: { shape: 'square', speed: 0.3, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.04, gravity: 0, z: 0.35, vz: -0.2, zg: 5, land: 'settle', layer: 'world', shadow: 0, ramp: RAMP_CLOD, sizeCurve: HOLD, alphaCurve: SETTLE_A }, tier: 'fine' },
];

/** Glints drawn in along a chain. */
const CHAIN: EmitterPop[] = [
  { colors: [WHITE, STEEL], opts: { shape: 'glint', speed: 0, life: 0.45, lifeVar: 0.2, size: 0.07, sizeVar: 0.2, gravity: 0, z: 0.4, layer: 'world', shadow: 0, flicker: 0.5, ramp: RAMP_STEEL, sizeCurve: HOLD, alphaCurve: BOLT_A, mass: 0.8 }, tier: 'fine' },
];

/** Clone an effect with every layer shifted `along` tiles down the aim (arc wires). */
function farOf(base: EffectDef, id: string, along: number): EffectDef {
  return { id, name: `${base.name} (far)`, story: base.story, layers: base.layers.map((l) => ({ ...l, along: (l.along ?? 0) + along })) };
}

/** THE SKY'S PIN: the storm's strike, unchanged, moved out to the reach where the point directs it. */
export const polearmSkyPin: EffectDef = farOf(STORM_EFFECTS.find((e) => e.id === 'storm.strike')!, 'polearm.sky_pin', REACH);

// polearm.root_stake — THE ROOT: a stake driven, a shackle that holds
export const polearmRootStake: EffectDef = {
  id: 'polearm.root_stake',
  name: 'Polearm — root stake',
  story: 'the hold made visible: a white pin flash → the shackle ring snaps open and HOLDS at the knee → six iron barbs stand up out of the dirt around the held body and stay the whole breath → glints are drawn in along the chain → the foot presses dust → the barbs go out together when the hold breaks',
  layers: [
    { kind: 'burst', name: 'pin flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.36, life: 0.2, z: 0.4 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'shackle', recipe: recipe([WHITE, STEEL], SHACKLE), count: 1, tier: 'hero', at: 0.02 },
    { kind: 'burst', name: 'barbs', recipe: recipe([STEEL, IRON], PIKE), count: 6, tier: 'hero', arrange: 'ring', radius: 0.42, at: 0.04 },
    { kind: 'burst', name: 'barb heads', recipe: recipe([WHITE, STEEL], { ...PIKE_HEAD, life: 2.3 }), count: 6, tier: 'fine', arrange: 'ring', radius: 0.42, at: 0.04 },
    { kind: 'field', name: 'chain draw', field: { kind: 'attract', radius: 1.2, strength: 3.5, dur: 0.6, attack: 0.05, release: 0.2 } },
    { kind: 'emit', name: 'chain glints', arrange: 'rim', radius: 0.9, outward: -2.2, rate: 22, dur: 0.5, attack: 0, release: 0.1, tier: 'fine', pops: CHAIN },
    { kind: 'burst', name: 'press', recipe: recipe([LOAM, PALE], PRESS), count: 5, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'glow', name: 'stake light', r: 0.9, rgb: IRON_GLOW, a: 0.2, dur: 2.4, attack: 0.03, release: 0.3, dz: 0.2, flicker: 0.15 },
  ],
};
export const polearmRootStakeFar = farOf(polearmRootStake, 'polearm.root_stake_far', REACH);

// polearm.hook_pull — THE HOOK: the yard dragged in onto one lane
export const polearmHookPull: EffectDef = {
  id: 'polearm.hook_pull',
  name: 'Polearm — hook pull',
  story: 'everything comes to the point: iron hooks come in off the rim along the drag → furrows are dragged across the dirt toward the centre and smear where they stop → dust is hauled in behind them and glints run the chain → the beak flashes at the middle where the row lands',
  layers: [
    { kind: 'field', name: 'haul', field: { kind: 'attract', radius: 1.8, strength: 6, dur: 0.55, attack: 0.02, release: 0.2 }, radiusK: 1.4 },
    { kind: 'burst', name: 'hooks', recipe: recipe([WHITE, STEEL, IRON], HOOK), count: 10, tier: 'hero', arrange: 'rim', radius: 1.25, radiusK: 1.15, outward: -6 },
    { kind: 'burst', name: 'furrows', recipe: recipe([LOAM, SHADE], { ...FURROW, size: 0.08, life: 1.1 }), count: 6, tier: 'hero', arrange: 'rim', radius: 1.2, radiusK: 1.1, outward: -2.4 },
    { kind: 'burst', name: 'hauled dust', recipe: recipe([LOAM, PALE], { ...PRESS, speed: 1.8, drag: 1.8, life: 1.0, size: 0.2 }), count: 6, tier: 'body', arrange: 'rim', radius: 1.1, radiusK: 1.0, outward: -1.8 },
    { kind: 'emit', name: 'chain glints', arrange: 'rim', radius: 1.2, radiusK: 1.1, outward: -4, rate: 60, dur: 0.35, attack: 0, release: 0.05, tier: 'fine', pops: CHAIN },
    { kind: 'burst', name: 'beak flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.3 }), count: 1, tier: 'hero', at: 0.2 },
    { kind: 'burst', name: 'landing press', recipe: recipe([LOAM, PALE], PRESS), count: 4, tier: 'body', arrange: 'disc', radius: 0.2, at: 0.22 },
    { kind: 'glow', name: 'drag light', r: 0.8, rgb: IRON_GLOW, a: 0.12, dur: 0.4, attack: 0.05, release: 0.25, dz: 0.2, radiusK: 0.7 },
  ],
};

// polearm.skewer_burst — the payoff: the stake breaks, the point goes through
export const polearmSkewerBurst: EffectDef = {
  id: 'polearm.skewer_burst',
  name: 'Polearm — skewer burst',
  story: 'the point goes through a held body: a white cross-flash → two shock rings race out one behind the other → the broken stake flies as iron shards on true height, bouncing and lying → spokes and sparks throw off the pierce and prick the dirt → dust presses out and clods hop → the air is shoved back',
  layers: [
    { kind: 'field', name: 'shove', field: { kind: 'attract', radius: 1.2, strength: -3, dur: 0.3, attack: 0.02, release: 0.15 } },
    { kind: 'burst', name: 'cross flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.62, life: 0.22, z: 0.45 }), count: 2, tier: 'hero' },
    { kind: 'burst', name: 'shock rings', recipe: recipe([WHITE, BRIGHT], SHOCK), count: 1, tier: 'hero', every: 0.07, times: 1 },
    { kind: 'burst', name: 'broken stake', recipe: recipe([BRIGHT, STEEL, IRON], SHARD_IRON), count: 10, tier: 'hero' },
    { kind: 'burst', name: 'spokes', recipe: recipe([WHITE, STEEL], { ...SPOKE, speed: 3.2 }), count: 10, tier: 'body', arrange: 'rim', radius: 0.08, outward: 3.2 },
    { kind: 'burst', name: 'sparks', recipe: recipe([WHITE, STEEL], SPARK), count: 12, tier: 'fine' },
    { kind: 'burst', name: 'press', recipe: recipe([LOAM, PALE], { ...PRESS, speed: 1.4 }), count: 6, tier: 'body', arrange: 'disc', radius: 0.15 },
    { kind: 'burst', name: 'clods', recipe: recipe([LOAM, SHADE], CLOD), count: 3, tier: 'hero' },
    { kind: 'glow', name: 'pierce light', r: 1.2, rgb: STEEL_GLOW, a: 0.4, dur: 0.24, attack: 0.01, release: 0.18, dz: 0.4 },
  ],
};
export const polearmSkewerBurstFar = farOf(polearmSkewerBurst, 'polearm.skewer_burst_far', REACH);

// polearm.crack — THE SEAM: the sunder brand, a crack that stays open
export const polearmCrack: EffectDef = {
  id: 'polearm.crack',
  name: 'Polearm — crack',
  story: 'the armour opens: a seam flash → three dark cracks jag open across the body and STAY, re-seeding slowly like a wall deciding → plate chips fly and lie → grit sifts out of the seam for the whole window → a dim iron light flickers in the crack',
  layers: [
    { kind: 'burst', name: 'seam flash', recipe: recipe(['#ffffff', WHITE], { ...POINT_FLASH, size: 0.3, life: 0.16, z: 0.45 }), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'cracks', recipe: recipe([DARK_IRON, IRON_DEEP], CRACK), count: 3, tier: 'hero', span: 0.55, dz: 0.3, at: 0.03 },
    { kind: 'burst', name: 'plate chips', recipe: recipe([BRIGHT, STEEL], { ...SHARD_IRON, speed: 1.8, vz: 2.0, size: 0.065 }), count: 7, tier: 'hero', at: 0.03 },
    { kind: 'burst', name: 'spokes', recipe: recipe([STEEL, IRON], { ...SPOKE, speed: 2.2 }), count: 6, tier: 'body', arrange: 'rim', radius: 0.06, outward: 2.2 },
    { kind: 'emit', name: 'grit', arrange: 'disc', radius: 0.15, rate: 16, dur: 2.2, attack: 0.1, release: 0.4, tier: 'fine', dz: 0.35, pops: GRIT },
    { kind: 'burst', name: 'press', recipe: recipe([LOAM, PALE], PRESS), count: 4, tier: 'body', arrange: 'disc', radius: 0.12 },
    { kind: 'glow', name: 'seam light', r: 0.55, rgb: IRON_GLOW, a: 0.12, dur: 2.4, attack: 0.05, release: 0.3, dz: 0.3, flicker: 0.35 },
  ],
};
export const polearmCrackFar = farOf(polearmCrack, 'polearm.crack_far', REACH);

// polearm.formation — THE HELD GROUND: the wall of points, standing
export const polearmFormation: EffectDef = {
  id: 'polearm.formation',
  name: 'Polearm — formation',
  story: 'the wall stands: twelve pikes set on the rim, heads glinting, standing the whole beat → the trench line is trodden into the dirt under them and smears → the armour shimmers on the one inside the formation → a low iron light on the ground',
  layers: [
    { kind: 'burst', name: 'pikes', recipe: recipe([STEEL, IRON], { ...PIKE, life: 1.25, size: 0.26 }), count: 12, tier: 'hero', arrange: 'ring', radius: 1.6, radiusK: 0.92 },
    { kind: 'burst', name: 'pike heads', recipe: recipe([WHITE, STEEL], { ...PIKE_HEAD, life: 1.2, z: 0.56 }), count: 12, tier: 'fine', arrange: 'ring', radius: 1.6, radiusK: 0.92 },
    { kind: 'burst', name: 'trench', recipe: recipe([LOAM, SHADE], { ...FURROW, speed: 0.5, life: 1.4, size: 0.09 }), count: 12, tier: 'body', arrange: 'rim', radius: 1.6, radiusK: 0.92, outward: 0.3 },
    { kind: 'burst', name: 'armour shimmer', recipe: recipe([WHITE, STEEL], { ...PIKE_HEAD, life: 0.9, size: 0.07, z: 0.7, vz: 0.15 }), count: 6, tier: 'body', arrange: 'orbit', radius: 0.32, dz: 0.5 },
    { kind: 'burst', name: 'brace dust', recipe: recipe([LOAM, PALE], { ...PRESS, size: 0.2, speed: 0.5 }), count: 5, tier: 'body', arrange: 'rim', radius: 1.5, radiusK: 0.85, outward: 0.4 },
    { kind: 'glow', name: 'ward light', r: 1.0, rgb: IRON_GLOW, a: 0.1, dur: 1.1, attack: 0.1, release: 0.3, radiusK: 0.9 },
  ],
};

// polearm.splinter_ring — the moulinet's aftermath: splinters that stay
export const polearmSplinterRing: EffectDef = {
  id: 'polearm.splinter_ring',
  name: 'Polearm — splinter ring',
  story: 'what the wheel left: ash splinters standing on end all round the ring → more thrown outward, tumbling, lying and flecking the rim → scour dust rolls off the edge → glints wink on the cut ends → a faint ash light',
  layers: [
    { kind: 'burst', name: 'standing splinters', recipe: recipe([ASH, ASH_DEEP], { ...PIKE, life: 1.0, size: 0.2, ramp: RAMP_ASH, sizeVar: 0.3 }), count: 10, tier: 'hero', arrange: 'ring', radius: 1.4, radiusK: 0.85 },
    { kind: 'burst', name: 'thrown splinters', recipe: recipe([ASH, STRAW], { ...STRAW_CUT, speed: 0.9, life: 1.6, size: 0.06, ramp: RAMP_ASH, mark: 'fleck', markLife: 2.5 }), count: 8, tier: 'body', arrange: 'rim', radius: 1.3, radiusK: 0.8, outward: 0.9 },
    { kind: 'burst', name: 'scour', recipe: recipe([LOAM, PALE], { ...SCUFF, size: 0.24, speed: 0.9 }), count: 8, tier: 'body', arrange: 'rim', radius: 1.3, radiusK: 0.8, outward: 0.6 },
    { kind: 'burst', name: 'cut glints', recipe: recipe([WHITE, STEEL], { ...PIKE_HEAD, life: 0.8, size: 0.06, z: 0.3 }), count: 8, tier: 'fine', arrange: 'ring', radius: 1.4, radiusK: 0.85 },
    { kind: 'glow', name: 'ash light', r: 1.0, rgb: ASH_GLOW, a: 0.08, dur: 0.9, attack: 0.1, release: 0.3, radiusK: 0.9 },
  ],
};

// polearm.torn_road — the lance's aftermath: the road torn and kept
export const polearmTornRoad: EffectDef = {
  id: 'polearm.torn_road',
  name: 'Polearm — torn road',
  story: 'the road stays torn: furrow lips lie across the disc and smear → sod tabs flip pale-side up on the rim → torn iron stands out of the ground → a dust wake presses low and fines sift down → a dim iron light in the tear',
  layers: [
    { kind: 'burst', name: 'furrow lips', recipe: recipe([LOAM, SHADE], { ...FURROW, speed: 0.9, life: 1.3 }), count: 10, tier: 'hero', arrange: 'disc', radius: 1.2, radiusK: 0.85 },
    { kind: 'burst', name: 'sod tabs', recipe: recipe([SOD_PALE, PALE], { ...SOD, life: 1.4, vz: 1.2 }), count: 4, tier: 'hero', arrange: 'rim', radius: 1.1, radiusK: 0.8, outward: 0.5 },
    { kind: 'burst', name: 'torn iron', recipe: recipe([STEEL, IRON], { ...PIKE, life: 1.0, size: 0.2, sizeVar: 0.35 }), count: 6, tier: 'hero', arrange: 'ring', radius: 0.9, radiusK: 0.65 },
    { kind: 'burst', name: 'dust wake', recipe: recipe([LOAM, PALE], { ...PRESS, speed: 0.6, life: 1.2 }), count: 6, tier: 'body', arrange: 'disc', radius: 1.0, radiusK: 0.7 },
    { kind: 'emit', name: 'fines', arrange: 'disc', radius: 1.1, radiusK: 0.8, rate: 18, dur: 0.7, attack: 0, release: 0.2, tier: 'fine', dz: 0.3, pops: GRIT },
    { kind: 'glow', name: 'tear light', r: 1.0, rgb: IRON_GLOW, a: 0.1, dur: 0.9, attack: 0.1, release: 0.3, radiusK: 0.9 },
  ],
};

// polearm.picket — the stand: pikes thrown forward and SET across the front
export const polearmPicket: EffectDef = {
  id: 'polearm.picket',
  name: 'Polearm — picket',
  story: 'the line is held: eight pikes are set in a knot at the reach, standing the whole beat with their heads glinting → the stand line is trodden into the dirt and smears → brace dust presses at the caster\'s heels → a low iron light along the front',
  layers: [
    { kind: 'burst', name: 'set pikes', recipe: recipe([STEEL, IRON], { ...PIKE, life: 1.2, size: 0.24 }), count: 8, tier: 'hero', arrange: 'ring', radius: 0.6, along: 2.3 },
    { kind: 'burst', name: 'pike heads', recipe: recipe([WHITE, STEEL], { ...PIKE_HEAD, life: 1.15 }), count: 8, tier: 'fine', arrange: 'ring', radius: 0.6, along: 2.3 },
    { kind: 'burst', name: 'stand line', recipe: recipe([LOAM, SHADE], { ...FURROW, speed: 0.6, life: 1.3, size: 0.09 }), count: 8, tier: 'body', arrange: 'rim', radius: 0.65, outward: 0.5, along: 2.3 },
    { kind: 'burst', name: 'brace', recipe: recipe([LOAM, PALE], { ...PRESS, size: 0.2 }), count: 4, tier: 'body', arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'heel clod', recipe: recipe([LOAM, SHADE], CLOD), count: 1, tier: 'hero', arrange: 'cone', dirOff: Math.PI, spread: 0.5 },
    { kind: 'glow', name: 'front light', r: 0.9, rgb: IRON_GLOW, a: 0.1, dur: 1.0, attack: 0.05, release: 0.3, along: 2.6 },
  ],
};

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

/** Arrival delay for a charge / leap / dash of `tiles` at the shared travel speed. */
const charge = (tiles: number): number => Math.round((tiles / 13) * 100) / 100;
const dash = (tiles: number): number => Math.round((tiles / 18) * 100) / 100;

export const POLEARM_PLANS: Record<string, AbilityPlan> = {
  // ---- THE TWENTY ---------------------------------------------------------

  // PAYOFF at reach: the needle snaps out and the head bites at the far tick off a skidding front foot; when it FOLLOWS the root or the hook the stake breaks at the reach — the skewer burst.
  lunging_skewer: {
    cues: [{ id: 'polearm.needle', scale: 1.1 }, { id: 'polearm.bite', scale: 0.9, at: 0.1 }, { id: 'dust.kick', scale: 0.45 }],
    onFollow: [{ id: 'polearm.skewer_burst_far', scale: 1.2, at: 0.1 }],
  },
  // SUSTAIN, three rude beats: each beat the butt cap slams the dirt and shoves a low bar of dust forward off the hip while the cold sits in their knees (frost.breath, small); the finale is the last, heaviest shove.
  haft_strike: {
    cues: [{ id: 'dust.slam', scale: 0.75 }, { id: 'dust.kick', scale: 0.8 }, { id: 'frost.breath', scale: 0.45, at: 0.06 }],
    onFinale: [{ id: 'dust.slam', scale: 1.2, at: 0.05 }, { id: 'dust.billow', scale: 0.6, at: 0.15 }],
  },
  // OPENER, the signature's first press: the hook goes behind the knee and the whole ring is dragged in onto the point; then the stake — the ROOT — stands in the dirt with its shackle for the breath they are held.
  hooking_reap: {
    cues: [{ id: 'polearm.hook_pull', scale: 1.2, radiusK: 1.2 }, { id: 'polearm.root_stake', scale: 1.2, at: 0.24 }],
  },
  // ANSWER: the haft plants (the butt bites the dirt) and the body lands point-first 8 tiles on: the bite and a stamp at the far end.
  vaulting_step: {
    cues: [{ id: 'dust.kick', scale: 0.7 }, { id: 'dust.slam', scale: 0.45, at: 0.02 }, { id: 'polearm.bite_here', scale: 1.0, atFar: true, at: dash(8) }, { id: 'dust.slam', scale: 0.7, atFar: true, at: dash(8) }],
  },
  // PAYOFF, the signature's second press: one drawn breath, one straight line — the biggest needle and its bite; after the root the stake BREAKS in the skewer burst and the shove.
  perfect_thrust: {
    cues: [{ id: 'polearm.needle', scale: 1.6 }, { id: 'polearm.bite', scale: 1.3, at: 0.1 }, { id: 'dust.kick', scale: 0.4 }],
    onFollow: [{ id: 'polearm.skewer_burst_far', scale: 1.5, at: 0.1 }],
  },
  // SUSTAIN with a finale: each beat three pricks rain down the lane on staggered sub-clocks; the last point lands like a spear — the full bite and the stake bursting at the reach.
  flurry_of_points: {
    cues: [{ id: 'polearm.needle', scale: 0.8 }, { id: 'polearm.needle', scale: 0.65, at: 0.24 }, { id: 'polearm.needle', scale: 0.6, at: 0.46 }],
    onFinale: [{ id: 'polearm.needle', scale: 1.4, at: 0.5 }, { id: 'polearm.skewer_burst_far', scale: 1.1, at: 0.58 }],
    onFollow: [{ id: 'polearm.bite', scale: 0.7, at: 0.1 }],
  },
  // OPENER: one moonwide stroke of the hafted blade, then the whole ring is HOOKED in cold onto one lane — the reap, the pull, the frost left on the row.
  crescent_reap: {
    cues: [{ id: 'polearm.reap', scale: 1.1 }, { id: 'polearm.gyre', scale: 0.7, radiusK: 1, at: 0.04 }, { id: 'polearm.hook_pull', scale: 1.1, radiusK: 0.9, at: 0.2 }, { id: 'frost.breath', scale: 0.5, at: 0.3 }],
  },
  // PAYOFF, the drawn corridor: the bead runs five tiles unrolling the sleeve, the floor torn under it, the point driving into the ground at the run's end; after the hook the whole row on the lane takes the skewer burst at the far tick.
  impaling_drive: {
    cues: [{ id: 'polearm.corridor', scale: 1.2 }, { id: 'dust.gouge', scale: 0.7, at: 0.05 }, { id: 'polearm.bite_here', scale: 0.9, atFar: true, at: 0.26 }],
    onFollow: [{ id: 'polearm.skewer_burst', scale: 1.2, atFar: true, at: 0.28 }],
  },
  // SUSTAIN, HELD GROUND: the formation is planted and STANDS — twelve pikes on the rim re-set every second for the field's life, the cold of the station creeping out under them, the armour shimmering on the one inside.
  wall_of_points: {
    cues: [{ id: 'polearm.formation', scale: 1.2, radiusK: 1, every: 1.0 }, { id: 'frost.fog', scale: 0.55, radiusK: 0.9, at: 0.2, every: 2.0 }, { id: 'dust.slam', scale: 0.5, radiusK: 0.5 }],
  },
  // PAYOFF, the road: gold rails down the chord, the road torn between them, and at the lane's end (10 tiles at charge speed) the bar — dust thrown off its foot under a gold rim; down a drawn LINE the arrival breaks the stake too.
  knights_charge: {
    cues: [{ id: 'arcane.beam', scale: 0.9 }, { id: 'dust.gouge', scale: 0.9, at: 0.05 }, { id: 'dust.slam', scale: 1.1, atFar: true, at: charge(10) }, { id: 'arcane.bloom', scale: 0.6, atFar: true, at: charge(10) }],
    onFollow: [{ id: 'polearm.skewer_burst', scale: 1.3, atFar: true, at: charge(10) }],
  },
  // OPENER, the seam: the drawn breath drives the head in at the reach and the armour CRACKS — a dark seam that stays open the whole window for the Gatebreaker to read.
  rampart_breaker: {
    cues: [{ id: 'polearm.needle', scale: 1.2 }, { id: 'polearm.bite', scale: 1.1, at: 0.06 }, { id: 'polearm.crack_far', scale: 1.3, at: 0.1 }, { id: 'dust.kick', scale: 0.45 }],
  },
  // SUSTAIN with the school's biggest finale: two tastes — slim needles flicking out and back on opposite half-beats — and the bite: the whole point at the reach, the stake bursting, at more than twice the weight.
  serpents_tongue: {
    cues: [{ id: 'polearm.needle', scale: 0.7 }, { id: 'polearm.needle', scale: 0.65, at: 0.4 }],
    onFinale: [{ id: 'polearm.needle', scale: 1.7, at: 0.02 }, { id: 'polearm.bite', scale: 1.4, at: 0.12 }, { id: 'polearm.skewer_burst_far', scale: 1.4, at: 0.14 }],
  },
  // PAYOFF, the fall: the haft plants for the launch (the dash wire) and the landing (the blast wire, at the point) answers in a star crack of dust with the point driven through the heap; on a hooked or rooted ring the crater spreads wider and the stake bursts.
  skydriver_fall: {
    cues: [{ id: 'dust.kick', scale: 0.6 }, { id: 'dust.slam', scale: 1.3, radiusK: 1, at: 0.02 }, { id: 'polearm.bite_here', scale: 1.1, at: 0.04 }, { id: 'dust.billow', scale: 0.45, at: 0.35 }],
    onFollow: [{ id: 'polearm.skewer_burst', scale: 1.4, radiusK: 1.3, at: 0.06 }, { id: 'dust.slam', scale: 0.7, radiusK: 1.3, at: 0.1 }],
  },
  // ANSWER, the banner: the second gold — the halo at the top of the raised haft, the ward pointing the way underfoot, the line already moving (a kick of dust behind the first step).
  banner_advance: {
    cues: [{ id: 'arcane.bloom', scale: 0.55 }, { id: 'arcane.orbit', scale: 0.75, at: 0.1 }, { id: 'arcane.sigil', scale: 0.5, at: 0.15 }, { id: 'dust.kick', scale: 0.5, at: 0.2 }],
  },
  // SUSTAIN, three turns: each beat the haft runs a lap round the body and the tips kick dust; the last turn FLINGS (the full gyre and a shove of dust) and leaves the splinter ring on the ground.
  moulinet_guard: {
    cues: [{ id: 'polearm.gyre', scale: 0.7, radiusK: 1 }, { id: 'dust.kick', scale: 0.4, at: 0.2 }],
    onFinale: [{ id: 'polearm.gyre', scale: 1.2, radiusK: 1.1, at: 0.08 }, { id: 'dust.slam', scale: 0.8, radiusK: 1, at: 0.12 }],
  },
  // The wheel's aftermath: a ring of splinters standing and lying at the reach it defended, re-set every beat, with the cold sitting low in it.
  'moulinet_guard:aftermath': {
    cues: [{ id: 'polearm.splinter_ring', scale: 1.2, radiusK: 1, every: 0.8 }, { id: 'frost.fog', scale: 0.45, radiusK: 0.85, at: 0.1, every: 1.6 }],
  },
  // OPENER, the sky's pin: the point directs (the needle), the storm answers AT THE REACH (the strike moved out to where the point aims), and where the bolt lands the body is NAILED — the bite and the root stake standing in a crackling floor.
  stormpoint: {
    cues: [{ id: 'polearm.needle', scale: 1.2 }, { id: 'polearm.sky_pin', scale: 1.2, at: 0.08 }, { id: 'polearm.bite', scale: 1.1, at: 0.3 }, { id: 'polearm.root_stake_far', scale: 1.2, at: 0.4 }],
  },
  // The pin's aftermath: the charge stays in the ground — a held storm charge re-spoken on the disc for the field's life, sparks pricking the dirt.
  'stormpoint:aftermath': {
    cues: [{ id: 'storm.charge', scale: 0.6, radiusK: 1, every: 0.8 }, { id: 'storm.nova', scale: 0.35, radiusK: 0.8, at: 0.3, every: 1.6 }],
  },
  // PAYOFF, the executioner: the heaviest bite in the school comes down into the seam at the reach and the stake bursts — the crack is SPENT; off a braced foot. Cold iron only.
  gatebreaker: {
    cues: [{ id: 'polearm.needle', scale: 1.2 }, { id: 'polearm.bite', scale: 1.6, at: 0.05 }, { id: 'polearm.skewer_burst_far', scale: 1.3, at: 0.08 }, { id: 'dust.kick', scale: 0.5 }],
  },
  // ANSWER, the yard cleared: the halberd runs the full circle with the counterweight opposite, everything thrown off the point, and the scoured ring's dust rolls after.
  sweeping_gyre: {
    cues: [{ id: 'polearm.gyre', scale: 1.3, radiusK: 1 }, { id: 'dust.slam', scale: 0.6, radiusK: 0.9, at: 0.1 }, { id: 'dust.billow', scale: 0.5, at: 0.3 }],
  },
  // SUSTAIN, the stand: each beat the pikes are driven forward and SET across the front, cold running the line; the last beat breaks it — the stake bursts at the reach and the heels' trench is stamped.
  hold_the_line_polearm: {
    cues: [{ id: 'polearm.picket', scale: 1.25 }, { id: 'frost.breath', scale: 0.5, at: 0.08 }],
    onFinale: [{ id: 'polearm.skewer_burst_far', scale: 1.2, at: 0.1 }, { id: 'dust.slam', scale: 0.7, at: 0.12 }],
  },
  // CROWN, three acts in one press: the gold corridor and the steel one laid together down the whole road, the floor torn under them, every body on it pierced and CRACKED at the far end; after a root or a drawn line the whole road bursts.
  sundering_lance: {
    cues: [{ id: 'arcane.beam', scale: 1.4 }, { id: 'polearm.corridor', scale: 1.4, at: 0.02 }, { id: 'dust.gouge', scale: 0.9, at: 0.05 }, { id: 'polearm.crack', scale: 1.3, atFar: true, at: 0.3 }],
    onFollow: [{ id: 'polearm.skewer_burst', scale: 1.5, atFar: true, at: 0.3 }, { id: 'arcane.shatter', scale: 0.6, atFar: true, at: 0.32 }],
  },
  // The lance's aftermath: the road stays torn — furrows, sod, torn iron re-set every beat with the cold lying in the tear.
  'sundering_lance:aftermath': {
    cues: [{ id: 'polearm.torn_road', scale: 1.2, radiusK: 1, every: 0.8 }, { id: 'frost.fog', scale: 0.45, radiusK: 0.9, at: 0.15, every: 1.6 }],
  },

  // ---- THE ARMORY ---------------------------------------------------------

  // PAYOFF at full length: a needle and a stop-line where the front foot planted; on a reeling or hooked body the stake breaks at the reach.
  reaching_thrust: {
    cues: [{ id: 'polearm.needle', scale: 1.05 }, { id: 'polearm.bite', scale: 0.8, at: 0.1 }, { id: 'dust.kick', scale: 0.4 }],
    onFollow: [{ id: 'polearm.skewer_burst_far', scale: 1.1, at: 0.1 }],
  },
  // ANSWER, the harvest: one wide turn lays the row down in a LINE — the reap, the shove off the end of it, and the cold row's rime where it fell.
  reapers_turn: {
    cues: [{ id: 'polearm.reap', scale: 1.15 }, { id: 'polearm.gyre', scale: 0.6, radiusK: 1, at: 0.05 }, { id: 'dust.slam', scale: 0.7, at: 0.3 }, { id: 'dust.kick', scale: 0.4 }],
  },
  // OPENER, the collar hook: the pull — the yard hauled in over the collar — and the cold the iron leaves in it (a small rime star); on a branded or exposed body the row is wider and the drag harder.
  skullhook: {
    cues: [{ id: 'polearm.hook_pull', scale: 0.95, radiusK: 1.2 }, { id: 'frost.shards', scale: 0.4, radiusK: 0.5, at: 0.22 }],
    onFollow: [{ id: 'polearm.hook_pull', scale: 1.1, radiusK: 1.8, at: 0.12 }],
  },
  // PAYOFF, the short run: one gold thread, two heel skids where it began, and at the stop (7 tiles at charge speed) a stamp and gold splinters; on a line or a rally the arrival bursts the stake and throws them further.
  couched_charge: {
    cues: [{ id: 'arcane.beam', scale: 0.5 }, { id: 'dust.kick', scale: 0.6 }, { id: 'dust.slam', scale: 0.6, atFar: true, at: charge(7) }, { id: 'arcane.shatter', scale: 0.35, atFar: true, at: charge(7) }],
    onFollow: [{ id: 'polearm.skewer_burst', scale: 1.2, atFar: true, at: charge(7) }],
  },
};

export const POLEARM_EFFECTS: EffectDef[] = [
  polearmNeedle, polearmBite, polearmBiteHere, polearmCorridor, polearmReap, polearmGyre, polearmSkyPin,
  polearmRootStake, polearmRootStakeFar, polearmHookPull, polearmSkewerBurst, polearmSkewerBurstFar,
  polearmCrack, polearmCrackFar, polearmFormation, polearmSplinterRing, polearmTornRoad, polearmPicket,
];
