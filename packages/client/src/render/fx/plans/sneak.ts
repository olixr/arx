/**
 * SNEAK — ability plans (particles v6 phase 5; THE MASTERED HAND Phase 4:
 * THE VOICE). One plan per art of THE OPENED VEIN, cued into the effect
 * library and re-curated to what each art now DOES: openers brand the
 * body (the seam that stays, the steeping that stays), payoffs drink the
 * brand (the tithe), channels crescendo on the last beat (onFinale),
 * follows detonate (onFollow), the ground keeps bleeding (`:aftermath`).
 *
 * THE SCHOOL'S OWN MATTER (SNEAK_EFFECTS), none of it homogeneous:
 *
 *   sneak.iron_sowing   the caltrop toss — teeth on real arcs, seven
 *                       seconds of menace, rusting out tooth by tooth
 *   sneak.exposed_seam  THE EXPOSE BRAND — a wet seam stands open on
 *                       the body for the whole window, weeping, a red
 *                       hoop under the feet beating out the seconds
 *   sneak.venom_steep   THE VENOM BRAND — the body steeps: murk orbits
 *                       the ankles, beads fall on a count, the floor
 *                       under it greens and bubbles
 *   sneak.venom_tithe   THE CONSUME — venom drunk OUT of the body into
 *                       the knife: a closing green hoop, motes racing
 *                       inward, a pale flash at the heart, dry spatter
 *   sneak.hush          THE VANISH WORD — the silhouette snuffed like a
 *                       wick: ink gutters DOWN the body, the hoop
 *                       closes, a thread hangs where the knife was
 *   sneak.red_floor     THE POOL THAT BLEEDS YOU — the standing blood
 *                       zone: a sheet that grows and skins over, beads
 *                       welling up under every foot, clots at the rim
 *
 * Knife-steel speaks through the core roster's steel (core.steel_ring /
 * core.steel_cut); blood, venom, shadow and smoke through the library
 * materials. Wire kinds noted per art are what the server casts with;
 * channels re-speak the plan on every beat and speak `onFinale` on the
 * last, projectile arts speak at every hit (r0.55, no heading).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { SAND, PALE, LOAM } from '../library/dust.js';
import { WET, RED, DARK, CLOT, DRIED, RAMP_SPATTER, RAMP_GOBBET } from '../library/blood.js';
import { FRESH, BRIGHT, TOXIN, MURK, DRIED as V_DRIED, VENOM_GLOW, RAMP_BEAD } from '../library/venom.js';
import { INK, DEEP, BRUISE, EDGE, PALE as S_PALE, VIOLET } from '../library/shadow.js';
import { STEEL, BRIGHT as STEEL_BRIGHT } from './core.js';


// ---------------------------------------------------------------------------
// IRON — the caltrops' palette (FX_STYLES caltrops: STEEL, mid #7a7468)
// ---------------------------------------------------------------------------

const GLINT_WHITE = '#ffffff';
const IRON_LIT = '#9a948a';
const IRON = '#7a7468';
const IRON_DARK = '#4a4640';
const RUST = '#8a5a3a';
const RUST_DEEP = '#5a3a26';

/** A tooth's seven seconds: lit iron, dull iron, the first rust. */
const RAMP_TOOTH = rampOf({ stops: ['#b8b2a6', IRON_LIT, IRON, RUST], at: [0, 0.35, 0.8, 0.97], steps: 5 });
/** Rust flecks: brown, darkening. */
const RAMP_RUST = rampOf({ stops: [RUST, RUST_DEEP], at: [0, 0.8], steps: 3 });
const RAMP_DUST = rampOf({ stops: [LOAM, PALE, SAND], at: [0, 0.45, 1], steps: 4 });

const HOLD = curveOf('hold');
const PULSE = curveOf('pulse');
const FADE_OUT = curveOf('fadeOut');
/** A lying grain: holds, fades only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

/** A forged tooth: thrown, hopping once, lying — seven seconds of price. */
const TOOTH: BurstOpts = {
  shape: 'shard', speed: 1.4, speedVar: 0.5, life: 7.0, lifeVar: 0.12, size: 0.15, sizeVar: 0.2,
  gravity: 0, spin: 8, z: 0.5, vz: 2.2, zg: 8, land: 'bounce', bounce: 0.35, layer: 'world', shadow: 0.6,
  ramp: RAMP_TOOTH, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 8,
};

/** Spurs: the lesser iron, shorter-lived. */
const SPUR: BurstOpts = {
  ...TOOTH, shape: 'square', align: true, size: 0.09, speed: 1.1, vz: 1.8, life: 4.5, lifeVar: 0.3, bounce: 0.3, markLife: 5,
};

/** The toss's low breath of dust at the feet. */
const TOSS_DUST: BurstOpts = {
  shape: 'puff', speed: 0.8, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.22, sizeVar: 0.25,
  gravity: 0, drag: 2.6, z: 0.04, vz: 0.25, zg: 1.0, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: curveOf([0, 0.9, 0.3, 1.1, 1, 0.75]), alphaCurve: curveOf([0, 0.95, 0.5, 0.8, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25,
};

/** A landing puff where a tooth first strikes the dirt. */
const LAND_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.3, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.12, sizeVar: 0.3,
  gravity: 0, drag: 2.0, z: 0.02, vz: 0.2, zg: 1.5, layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: curveOf('swell'), alphaCurve: FADE_OUT,
};

/** The menace: a glint winking on a tooth. */
const MENACE: BurstOpts = {
  shape: 'glint', speed: 0.03, life: 0.5, lifeVar: 0.35, size: 0.13, gravity: 0, z: 0.05,
  layer: 'world', shadow: 0, flicker: 0.7, sizeCurve: PULSE, alphaCurve: FADE_OUT,
};

/** Rust: the spent iron's flecks, lying. */
const RUST_FLECK: BurstOpts = {
  shape: 'square', align: true, speed: 0.1, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.055, sizeVar: 0.3,
  gravity: 0, z: 0.02, vz: 0.3, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_RUST, sizeCurve: HOLD, mark: 'fleck', markLife: 4,
};

/** The iron rim: a dark ring on the dirt marking the bed's reach for its whole life. */
const IRON_RIM: BurstOpts = {
  shape: 'ring', speed: 0, life: 6.6, lifeVar: 0.04, size: 1.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [IRON_DARK, IRON, RUST, RUST_DEEP], at: [0, 0.3, 0.85, 1], steps: 5 }),
  sizeCurve: curveOf([0, 0.7, 0.1, 1, 1, 1.02]), alphaCurve: curveOf([0, 0, 0.05, 0.6, 0.85, 0.5, 1, 0]),
};

/**
 * sneak.iron_sowing — the iron sowing. Teeth patter out on real arcs,
 * hop once and lie; a puff where each falls; for seven seconds they
 * catch light on their own clocks; then they rust out tooth by tooth.
 */
export const sneakIronSowing: EffectDef = {
  id: 'sneak.iron_sowing',
  name: 'Sneak — iron sowing',
  story: 'the toss: iron teeth patter out on real arcs, each hopping once where it lands and lying there, a puff of dust at every fall → the teeth catch light on their own clocks for seven seconds, a slow menace of glints saying the floor has a price → the iron rusts out tooth by tooth into brown flecks',
  layers: [
    { kind: 'burst', name: 'teeth', recipe: recipe([IRON_LIT, IRON], TOOTH), count: 13, tier: 'hero', arrange: 'disc', radius: 0.15, dz: 0.5 },
    { kind: 'burst', name: 'spurs', recipe: recipe([IRON, IRON_DARK], SPUR), count: 11, tier: 'body', arrange: 'disc', radius: 0.2, dz: 0.45 },
    { kind: 'burst', name: 'toss dust', recipe: recipe([PALE, SAND], { ...TOSS_DUST, size: 0.16, alphaCurve: curveOf([0, 0.7, 0.5, 0.55, 1, 0]) }), count: 3, tier: 'body', arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'landing puffs', recipe: recipe([PALE, SAND], LAND_PUFF), count: 6, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.5 },
    { kind: 'burst', name: 'late puffs', recipe: recipe([PALE, SAND], LAND_PUFF), count: 4, tier: 'fine', arrange: 'disc', radius: 1.0, radiusK: 1.0, at: 0.75 },
    { kind: 'burst', name: 'menace', recipe: recipe([GLINT_WHITE, IRON_LIT], MENACE), count: 5, tier: 'hero', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.9, every: 0.5, times: 11 },
    { kind: 'emit', name: 'sift', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.3, rate: 3, dur: 1.2, attack: 0.1, release: 0.5, tier: 'fine',
      pops: [{ colors: [SAND, PALE], opts: { shape: 'mote', speed: 0.15, speedVar: 0.6, life: 1.2, lifeVar: 0.3, size: 0.04, gravity: 0, z: 0.4, zg: 2.2, land: 'settle', layer: 'world', shadow: 0, ramp: RAMP_DUST, sizeCurve: HOLD, alphaCurve: FADE_OUT } }] },
    { kind: 'burst', name: 'rust', recipe: recipe([RUST, RUST_DEEP], RUST_FLECK), count: 4, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 5.6, every: 0.45, times: 3 },
    { kind: 'burst', name: 'iron rim', recipe: recipe([IRON_DARK, IRON], IRON_RIM), count: 1, tier: 'hero', at: 0.35 },
    { kind: 'glow', name: 'cold iron', r: 0.9, rgb: '200, 208, 220', a: 0.06, dur: 0.4, attack: 0.03, release: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// THE SCHOOL'S BRANDS AND TITHES — curves and ramps
// ---------------------------------------------------------------------------

const FLARE = curveOf('flare');
const DWINDLE = curveOf('dwindle');
const SWELL = curveOf('swell');
const BLOOM = curveOf('bloom');
const FADE_LATE = curveOf('fadeLate');
const SOLID = curveOf('solid');
const MIST_A = curveOf('mist');
/** A brand that STAYS: born fast, holds the window, gone in the last tenth. */
const BRAND_A = curveOf([0, 0, 0.05, 0.92, 0.88, 0.9, 1, 0]);
/** The seam breathes: a slow wet pulse across the open window. */
const SEAM_SIZE = curveOf([0, 0.6, 0.08, 1, 0.3, 0.85, 0.5, 1, 0.7, 0.85, 0.9, 1, 1, 0.6]);
/** A hoop that opens quick and holds. */
const HOOP_SIZE = curveOf([0, 0.55, 0.12, 1, 1, 1.04]);
/** A hoop that CLOSES on the heart. */
const CLOSE_SIZE = curveOf([0, 1, 0.2, 0.92, 0.7, 0.32, 1, 0.06]);
/** Tithe matter arrives fast and is swallowed in its last quarter. */
const TITHE_A = curveOf([0, 0, 0.12, 1, 0.72, 1, 1, 0]);
/** A pool sheet: spreads over its first act, holds, and is taken back. */
const SHEET_SIZE = curveOf([0, 0.4, 0.3, 0.9, 0.7, 1, 1, 0.9]);
const SHEET_A = curveOf([0, 0.55, 0.15, 0.9, 0.8, 0.85, 1, 0]);

/** The seam: wet, red, blackening only at the window's end. */
const RAMP_SEAM = rampOf({ stops: [WET, WET, RED, DARK, CLOT], at: [0, 0.4, 0.7, 0.9, 1], steps: 6 });
/** The open hoop: red the whole window, clot at the close. */
const RAMP_HOOP = rampOf({ stops: [RED, RED, DARK, CLOT], at: [0, 0.6, 0.85, 1], steps: 5 });
/** The steep's hoop: bright at the bite, murk for the window. */
const RAMP_STEEP = rampOf({ stops: [BRIGHT, TOXIN, TOXIN, MURK, V_DRIED], at: [0, 0.2, 0.7, 0.9, 1], steps: 5 });
/** Murk motes: never bright, always heavy. */
const RAMP_MURK_LOW = rampOf({ stops: [TOXIN, MURK, V_DRIED], at: [0, 0.5, 0.92], steps: 4 });
/** The tithe: venom BRIGHTENS as it is drawn into the knife (read backwards is legal). */
const RAMP_TITHE = rampOf({ stops: [V_DRIED, MURK, TOXIN, BRIGHT, FRESH], at: [0, 0.25, 0.5, 0.78, 0.95], steps: 6 });
/** What is left after the tithe: dry. */
const RAMP_DRY_VENOM = rampOf({ stops: [MURK, V_DRIED, V_DRIED], at: [0, 0.4, 1], steps: 3 });
/** The snuff: ink first, bruising as it gutters. */
const RAMP_SNUFF = rampOf({ stops: [INK, INK, DEEP, BRUISE], at: [0, 0.5, 0.8, 1], steps: 4 });
/** The hush thread: bruise thinning pale, then gone. */
const RAMP_HUSH = rampOf({ stops: [BRUISE, EDGE, S_PALE], at: [0, 0.5, 0.9], steps: 4 });
/** The pool sheet: red at the spill, blackening as it skins. */
const RAMP_SHEET = rampOf({ stops: [RED, DARK, CLOT, DRIED], at: [0, 0.35, 0.7, 1], steps: 6 });

// ---------------------------------------------------------------------------
// Grain templates — the seam
// ---------------------------------------------------------------------------

/** The seam flash: two wet streaks across the chest, the first read of the opening. */
const SEAM_FLASH: BurstOpts = {
  shape: 'streak', align: true, speed: 1.3, speedVar: 0.3, life: 0.3, lifeVar: 0.2, size: 0.22, sizeVar: 0.2,
  gravity: 0, drag: 5, z: 0.58, vz: 0, zg: 0, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [WET, RED, DARK], at: [0, 0.5, 0.85] }), sizeCurve: FLARE, alphaCurve: FADE_LATE, core: WET, coreK: 0.5,
};

/** The seam itself: a standing wet blob at chest height that breathes for the window. */
const SEAM: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 3.0, lifeVar: 0.06, size: 0.28, sizeVar: 0.15, gravity: 0,
  z: 0.56, vz: 0, zg: 0, land: 'none', layer: 'world', shadow: 0, spin: 0.2,
  ramp: RAMP_SEAM, sizeCurve: SEAM_SIZE, alphaCurve: BRAND_A, core: WET, coreK: 0.45,
  wave: 'sine', waveHz: 1.1, waveAmp: 0.04, waveAxis: 'z',
};

/** The open hoop: a red ring on the dirt under the body, standing the window. */
const OPEN_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 3.0, lifeVar: 0.04, size: 0.95, sizeVar: 0.03, gravity: 0,
  layer: 'ground', ramp: RAMP_HOOP, sizeCurve: HOOP_SIZE, alphaCurve: curveOf([0, 0, 0.06, 0.8, 0.5, 0.6, 0.88, 0.62, 1, 0]),
};

/** The window's beat: a small red hoop that swells out of the open hoop and dies. */
const HOOP_BEAT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 0.62, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [WET, RED, DARK], at: [0, 0.5, 0.9] }),
  sizeCurve: curveOf([0, 0.7, 1, 1.9]), alphaCurve: curveOf([0, 0.75, 0.6, 0.45, 1, 0]),
};

/** First blood off the seam: spatter drops that splat around the feet. */
const SEAM_SPATTER: BurstOpts = {
  shape: 'drop', speed: 1.3, speedVar: 0.5, life: 1.4, size: 0.075, sizeVar: 0.35, gravity: 0,
  z: 0.55, vz: 1.4, zg: 9, land: 'splat', layer: 'world',
  ramp: RAMP_SPATTER, sizeCurve: curveOf('hold'), alphaCurve: SOLID,
};

/** The weep: drops letting go from the seam straight down, splat. */
const WEEP: BurstOpts = {
  shape: 'drop', speed: 0.08, life: 1.3, size: 0.065, sizeVar: 0.3, gravity: 0,
  vz: -0.15, zg: 7, land: 'splat', layer: 'world',
  ramp: RAMP_SPATTER, sizeCurve: curveOf('hold'), alphaCurve: SOLID,
};

/** The tally: steel glints winking on the seam — the knife reading the window. */
const TALLY: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.4, lifeVar: 0.3, size: 0.08, gravity: 0, z: 0.58,
  layer: 'world', shadow: 0, flicker: 0.7, sizeCurve: curveOf('pulse'), alphaCurve: curveOf('fadeOut'),
};

const WEEP_POPS: EmitterPop[] = [{ colors: [RED, DARK], opts: WEEP, weight: 1, tier: 'body' }];

/**
 * sneak.exposed_seam — THE EXPOSE BRAND. The body is opened and STAYS
 * open for the follow window: a wet seam breathes at chest height, a
 * red hoop holds under the feet and beats out the seconds, the seam
 * weeps and splats, steel glints tally the window. Blood never glows.
 */
export const sneakExposedSeam: EffectDef = {
  id: 'sneak.exposed_seam',
  name: 'Sneak — exposed seam',
  story: 'two wet streaks cross the chest → a seam stands open there and BREATHES for three seconds, weeping drops that splat under the body → a red hoop opens on the dirt under the feet and beats out the window in swelling rings → steel glints tally the open seam → the hoop clots and the seam blackens shut',
  layers: [
    { kind: 'burst', name: 'seam flash', recipe: recipe([WET, RED], SEAM_FLASH), count: 2, tier: 'hero', arrange: 'point', aimed: true, dirOff: 0, spread: 0.4 },
    { kind: 'burst', name: 'the seam', recipe: recipe([WET, RED], SEAM), count: 4, tier: 'hero', arrange: 'ring', radius: 0.11, dz: 0.56 },
    { kind: 'burst', name: 'open hoop', recipe: recipe([RED, DARK], OPEN_HOOP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'first blood', recipe: recipe([WET, RED, DARK], SEAM_SPATTER), count: 9, tier: 'body', arrange: 'disc', radius: 0.08, dz: 0.55 },
    { kind: 'emit', name: 'weep', dz: 0.56, at: 0.25, rate: 4, dur: 2.5, attack: 0.05, release: 0.5, tier: 'body', pops: WEEP_POPS },
    { kind: 'burst', name: 'window beats', recipe: recipe([RED, DARK], HOOP_BEAT), count: 1, tier: 'body', at: 0.6, every: 0.75, times: 3 },
    { kind: 'burst', name: 'tally', recipe: recipe([STEEL_BRIGHT, STEEL], TALLY), count: 2, tier: 'fine', arrange: 'disc', radius: 0.12, dz: 0.55, at: 0.4, every: 0.5, times: 4 },
    { kind: 'burst', name: 'late seep', recipe: recipe([RED, DARK], { ...SEAM_SPATTER, speed: 0.5, vz: 0.5, z: 0.1, size: 0.06 }), count: 3, tier: 'fine', arrange: 'disc', radius: 0.15, at: 1.5, every: 0.6, times: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Grain templates — the steeping
// ---------------------------------------------------------------------------

/** The sac: fresh venom flaring at the wound. */
const SAC: BurstOpts = {
  shape: 'blob', speed: 0.55, speedVar: 0.4, life: 0.42, lifeVar: 0.2, size: 0.36, sizeVar: 0.25, gravity: 0,
  drag: 2.5, z: 0.5, vz: 0.3, zg: 3, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [FRESH, BRIGHT, TOXIN], at: [0, 0.5, 0.9] }), sizeCurve: FLARE, alphaCurve: curveOf('fadeOut'), core: '#c8f0a8', coreK: 0.4,
};

/** Steep motes: bright venom circling the ankles for the window. */
const STEEP_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.15, speedVar: 0.5, life: 0.8, lifeVar: 0.3, size: 0.085, sizeVar: 0.3, gravity: 0,
  drag: 0.5, z: 0.18, vz: 0.12, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [FRESH, BRIGHT, TOXIN], at: [0, 0.4, 0.9], steps: 3 }), sizeCurve: curveOf('hold'), alphaCurve: FADE_LATE,
  wave: 'sine', waveHz: 1.4, waveAmp: 0.18, waveAxis: 'z',
};

/** The murk: low green mass clinging to the body. */
const STEEP_MURK: BurstOpts = {
  shape: 'blob', speed: 0.12, speedVar: 0.5, life: 1.1, lifeVar: 0.3, size: 0.4, sizeVar: 0.3, gravity: 0,
  drag: 1.2, z: 0.1, vz: 0.1, zg: 0, mass: 0.4, layer: 'world', shadow: 0, spin: 0.3,
  ramp: RAMP_MURK_LOW, sizeCurve: SWELL, alphaCurve: MIST_A, wave: 'noise', waveHz: 1.1, waveAmp: 0.2,
};

/** A counted bead: one fat drop off the body, straight down, stains the dirt. */
const COUNTED_BEAD: BurstOpts = {
  shape: 'drop', speed: 0.05, life: 1.1, size: 0.1, sizeVar: 0.2, gravity: 0,
  z: 0.6, vz: -0.15, zg: 7, land: 'splat', layer: 'world',
  ramp: RAMP_BEAD, sizeCurve: curveOf('hold'), alphaCurve: SOLID, mark: 'fleck', markLife: 5,
};

/** The steep hoop: a green ring under the feet for the window. */
const STEEP_HOOP: BurstOpts = {
  ...OPEN_HOOP, size: 0.9, ramp: RAMP_STEEP,
};

/** Bubbles at the ankles: bloom and pop into a fleck. */
const STEEP_BUBBLE: BurstOpts = {
  shape: 'mote', speed: 0.04, life: 0.5, lifeVar: 0.4, size: 0.065, sizeVar: 0.35, gravity: 0,
  z: 0.02, vz: 0.12, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [FRESH, BRIGHT, TOXIN], at: [0, 0.4, 0.9] }), sizeCurve: BLOOM, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 3,
};

/**
 * sneak.venom_steep — THE VENOM BRAND. The body STEEPS for the window:
 * the sac flares at the bite, bright motes circle the ankles on a
 * z-sine, a low murk clings, beads fall on a count and stain the dirt,
 * a green hoop holds under the feet, bubbles bloom and fleck the floor.
 */
export const sneakVenomSteep: EffectDef = {
  id: 'sneak.venom_steep',
  name: 'Sneak — venom steep',
  story: 'the sac flares fresh at the bite → bright motes circle the ankles for three seconds while a low murk clings to the body → a bead lets go every half-second and STAINS the dirt → a green hoop holds under the feet and bubbles bloom and pop inside it → the hoop dries dark and the murk thins',
  layers: [
    { kind: 'burst', name: 'the sac', recipe: recipe([FRESH, BRIGHT], SAC), count: 8, tier: 'hero', arrange: 'disc', radius: 0.08, dz: 0.5 },
    { kind: 'burst', name: 'steep hoop', recipe: recipe([BRIGHT, TOXIN], STEEP_HOOP), count: 1, tier: 'hero' },
    { kind: 'emit', name: 'the steeping', arrange: 'orbit', radius: 0.3, orbitSpeed: 3.2, rate: 12, dur: 2.7, attack: 0.1, release: 0.5, tier: 'body',
      pops: [{ colors: [FRESH, BRIGHT], opts: STEEP_MOTE, weight: 1, tier: 'body' }] },
    { kind: 'emit', name: 'murk', arrange: 'disc', radius: 0.3, rate: 8, dur: 2.5, attack: 0.2, release: 0.7, tier: 'body',
      pops: [{ colors: [TOXIN, MURK], opts: STEEP_MURK, weight: 1, tier: 'body' }] },
    { kind: 'burst', name: 'counted beads', recipe: recipe([BRIGHT, TOXIN], COUNTED_BEAD), count: 1, tier: 'hero', arrange: 'disc', radius: 0.14, dz: 0.6, at: 0.3, every: 0.5, times: 5 },
    { kind: 'burst', name: 'bubbles', recipe: recipe([FRESH, BRIGHT], STEEP_BUBBLE), count: 2, tier: 'fine', arrange: 'disc', radius: 0.32, at: 0.5, every: 0.35, times: 6 },
    { kind: 'burst', name: 'first murk', recipe: recipe([TOXIN, MURK], { ...STEEP_MURK, speed: 0.4, size: 0.28, life: 0.9 }), count: 4, tier: 'body', arrange: 'disc', radius: 0.15, dz: 0.1 },
    { kind: 'glow', name: 'steep light', r: 0.9, rgb: VENOM_GLOW, a: 0.2, dur: 2.8, attack: 0.15, release: 0.9 },
  ],
};

// ---------------------------------------------------------------------------
// Grain templates — the tithe
// ---------------------------------------------------------------------------

/** Tithe motes: ground-hugging venom with mass, gathered by the pull. */
const TITHE_MOTE: BurstOpts = {
  shape: 'mote', speed: 1.1, speedVar: 0.4, life: 0.7, lifeVar: 0.25, size: 0.075, sizeVar: 0.4, gravity: 0,
  z: 0.04, vz: 0.4, zg: 0, drag: 1.0, mass: 1.7, land: 'none', layer: 'world', shadow: 0,
  ramp: RAMP_TITHE, sizeCurve: curveOf('hold'), alphaCurve: TITHE_A,
};

/** Tithe beads: heavier drops rising into the knife as they are drawn. */
const TITHE_BEAD: BurstOpts = {
  ...TITHE_MOTE, shape: 'drop', size: 0.115, sizeVar: 0.25, speed: 1.3, vz: 0.8, life: 0.72, mass: 1.6,
};

/** The closing hoop: green on the dirt, CLOSING on the heart. */
const TITHE_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.8, lifeVar: 0.05, size: 1.7, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [TOXIN, BRIGHT, FRESH], at: [0, 0.5, 0.9] }),
  sizeCurve: CLOSE_SIZE, alphaCurve: curveOf([0, 0.2, 0.1, 0.95, 0.8, 0.85, 1, 0]),
};

/** The heart flash: a pale-green blob at the chest that flares and closes — the drink taken. */
const TITHE_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.15, life: 0.36, lifeVar: 0.15, size: 0.5, sizeVar: 0.2, gravity: 0,
  z: 0.55, vz: 0.1, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [FRESH, BRIGHT, TOXIN], at: [0, 0.4, 0.8] }), sizeCurve: FLARE, alphaCurve: curveOf('fadeOut'),
  core: '#c8f0a8', coreK: 0.45,
};

/** Dry spatter: what is left after the tithe, thrown off the body and lying. */
const DRY_SPATTER: BurstOpts = {
  shape: 'drop', speed: 1.4, speedVar: 0.5, life: 1.2, size: 0.07, sizeVar: 0.35, gravity: 0,
  z: 0.45, vz: 1.2, zg: 8, land: 'splat', layer: 'world',
  ramp: RAMP_DRY_VENOM, sizeCurve: curveOf('hold'), alphaCurve: SOLID, mark: 'fleck', markLife: 4,
};

/**
 * sneak.venom_tithe — THE CONSUME. The venom on a body is DRUNK into
 * the knife: a green hoop closes on the heart, motes and beads race in
 * off a ring brightening as they come, a pale flash takes the drink at
 * the chest, and what is left is thrown off dry.
 */
export const sneakVenomTithe: EffectDef = {
  id: 'sneak.venom_tithe',
  name: 'Sneak — venom tithe',
  story: 'a green hoop on the dirt CLOSES on the heart → venom motes and beads race in off a ring, brightening as they come, and rise into the knife → a pale flash at the chest takes the drink → dry spatter is thrown off the body and lies as flecks: the body is spent',
  layers: [
    { kind: 'field', name: 'the pull', field: { kind: 'attract', radius: 1.3, strength: 9, dur: 0.75, attack: 0.04, release: 0.2 } },
    { kind: 'burst', name: 'closing hoop', recipe: recipe([MURK, TOXIN], TITHE_HOOP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'gathered motes', recipe: recipe([MURK, TOXIN], TITHE_MOTE), count: 18, tier: 'fine', arrange: 'rim', radius: 0.9, outward: -1.4 },
    { kind: 'burst', name: 'ring beads', recipe: recipe([TOXIN, BRIGHT], TITHE_BEAD), count: 8, tier: 'hero', arrange: 'rim', radius: 0.85, outward: -1.7, at: 0.06, every: 0.22, times: 1 },
    { kind: 'emit', name: 'the draw', arrange: 'rim', radius: 0.85, outward: -1.2, rate: 30, dur: 0.5, attack: 0.05, release: 0.15, tier: 'body',
      pops: [{ colors: [MURK, TOXIN], opts: TITHE_MOTE, weight: 1, tier: 'body' }] },
    { kind: 'burst', name: 'heart flash', recipe: recipe([FRESH, BRIGHT], TITHE_FLASH), count: 3, tier: 'hero', at: 0.5 },
    { kind: 'burst', name: 'dry spatter', recipe: recipe([MURK, V_DRIED], DRY_SPATTER), count: 7, tier: 'body', arrange: 'disc', radius: 0.08, dz: 0.45, at: 0.56 },
    { kind: 'glow', name: 'the drink', r: 0.9, rgb: VENOM_GLOW, a: 0.28, dur: 0.3, attack: 0.02, release: 0.2, at: 0.48 },
  ],
};

// ---------------------------------------------------------------------------
// Grain templates — the hush
// ---------------------------------------------------------------------------

/** The unflash: the whole silhouette going out at once. */
const UNFLASH: BurstOpts = {
  shape: 'blob', speed: 0, life: 0.22, size: 0.9, gravity: 0, z: 0.45, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [INK, INK, DEEP], at: [0, 0.6, 1] }), sizeCurve: FLARE, alphaCurve: curveOf('fadeOut'),
};

/** The snuff: ink licks at body height that gutter DOWN like a wick pinched. */
const SNUFF: BurstOpts = {
  shape: 'lick', speed: 0.1, speedVar: 0.5, life: 0.5, lifeVar: 0.25, size: 0.4, sizeVar: 0.25, gravity: 0,
  drag: 1.0, z: 0.62, vz: -1.3, zg: 0, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_SNUFF, sizeCurve: DWINDLE, alphaCurve: FADE_LATE, core: VIOLET, coreK: 0.35,
};

/** The column: stacked ink masses falling down the body's line. */
const COLUMN: BurstOpts = {
  shape: 'blob', speed: 0.08, speedVar: 0.5, life: 0.55, lifeVar: 0.25, size: 0.34, sizeVar: 0.25, gravity: 0,
  drag: 1.5, z: 0.3, vz: -0.8, zg: 0, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_SNUFF, sizeCurve: DWINDLE, alphaCurve: FADE_LATE, spin: 0.4,
};

/** The closing hoop: the dark hoop on the dirt drawn shut on the feet. */
const HUSH_HOOP: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.55, lifeVar: 0.05, size: 1.6, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [BRUISE, DEEP, INK], at: [0, 0.5, 0.9] }),
  sizeCurve: CLOSE_SIZE, alphaCurve: curveOf([0, 0.7, 0.6, 0.7, 1, 0]),
};

/** Sinking motes: the violet edge falling into the dirt and cooling it. */
const HUSH_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.25, speedVar: 0.6, life: 1.0, lifeVar: 0.3, size: 0.075, sizeVar: 0.35, gravity: 0,
  drag: 0.6, z: 0.6, vz: -0.5, zg: 0.3, mass: 0.9, land: 'die', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [EDGE, BRUISE, DEEP], at: [0, 0.4, 0.8], steps: 4 }), sizeCurve: curveOf('hold'), alphaCurve: FADE_LATE, mark: 'fleck', markLife: 2.5,
};

/** The thread: a thin bruise haze hanging where the knife was. */
const HUSH_THREAD: BurstOpts = {
  shape: 'mote', speed: 0.06, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.15, vz: 0.35, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_HUSH, sizeCurve: curveOf('hold'), alphaCurve: curveOf('fadeOut'), wave: 'noise', waveHz: 1.2, waveAmp: 0.15,
};

/** The ink stain: the dark left on the dirt where the knife stood, taken back slowly. */
const INK_STAIN: BurstOpts = {
  shape: 'blob', speed: 0.02, life: 1.6, lifeVar: 0.2, size: 0.42, sizeVar: 0.25, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.1,
  ramp: rampOf({ stops: [INK, DEEP, BRUISE], at: [0, 0.5, 0.9], steps: 4 }), sizeCurve: curveOf([0, 0.6, 0.15, 1, 0.8, 0.9, 1, 0.5]), alphaCurve: curveOf([0, 0.85, 0.6, 0.7, 1, 0]),
};

/**
 * sneak.hush — THE VANISH WORD. The silhouette is snuffed like a wick:
 * an inverted flash, ink licks gutter DOWN the body, the dark hoop on
 * the dirt is drawn shut on the feet, violet motes sink and cool the
 * ground, and a thin thread hangs where the knife was. Never glows.
 */
export const sneakHush: EffectDef = {
  id: 'sneak.hush',
  name: 'Sneak — hush',
  story: 'the whole silhouette goes out in one inverted flash → ink licks gutter DOWN the body like a pinched wick, a column of dark falling with them → the dark hoop on the dirt is drawn shut on the feet → violet motes sink into the ground and leave it cold → a thin thread hangs a breath where the knife was, and is gone',
  layers: [
    { kind: 'burst', name: 'unflash', recipe: recipe([INK, INK], UNFLASH), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'snuff', recipe: recipe([INK, DEEP], SNUFF), count: 6, tier: 'hero', arrange: 'disc', radius: 0.1, dz: 0.62 },
    { kind: 'burst', name: 'column', recipe: recipe([INK, DEEP], COLUMN), count: 9, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.3 },
    { kind: 'burst', name: 'closing hoop', recipe: recipe([BRUISE, DEEP], HUSH_HOOP), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'sinking motes', recipe: recipe([EDGE, BRUISE], HUSH_MOTE), count: 16, tier: 'fine', arrange: 'disc', radius: 0.3, dz: 0.6 },
    { kind: 'field', name: 'undertow', field: { kind: 'attract', radius: 1.2, strength: 4, dur: 0.6, attack: 0.05, release: 0.2 } },
    { kind: 'burst', name: 'second gutter', recipe: recipe([DEEP, BRUISE], { ...SNUFF, size: 0.2, z: 0.4, vz: -0.9, life: 0.4 }), count: 3, tier: 'body', arrange: 'disc', radius: 0.1, dz: 0.4, at: 0.12 },
    { kind: 'burst', name: 'ink stain', recipe: recipe([INK, DEEP], INK_STAIN), count: 3, tier: 'hero', arrange: 'disc', radius: 0.18, at: 0.2 },
    { kind: 'emit', name: 'hush thread', arrange: 'disc', radius: 0.08, dz: 0.15, at: 0.3, rate: 6, dur: 1.2, attack: 0.1, release: 0.5, tier: 'fine',
      pops: [{ colors: [BRUISE, EDGE], opts: HUSH_THREAD, weight: 1, tier: 'fine' }] },
  ],
};

// ---------------------------------------------------------------------------
// Grain templates — the red floor
// ---------------------------------------------------------------------------

/** The sheet: a ground-layer blood blob that spreads and skins over. */
const SHEET: BurstOpts = {
  shape: 'blob', speed: 0.03, life: 3.0, lifeVar: 0.1, size: 0.62, sizeVar: 0.2, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.1,
  ramp: RAMP_SHEET, sizeCurve: SHEET_SIZE, alphaCurve: SHEET_A,
};

/** Welling beads: the pool bleeding whoever stands in it — drops jumping up and splatting back. */
const WELL: BurstOpts = {
  shape: 'drop', speed: 0.35, speedVar: 0.6, life: 1.0, size: 0.095, sizeVar: 0.3, gravity: 0,
  z: 0.04, vz: 1.3, zg: 8, land: 'splat', layer: 'world',
  ramp: RAMP_SPATTER, sizeCurve: curveOf('hold'), alphaCurve: SOLID,
};

/** Seep: low drops that barely leave the ground, their flecks building the sheet. */
const FLOOR_SEEP: BurstOpts = {
  shape: 'drop', speed: 0.4, speedVar: 0.6, life: 0.8, size: 0.085, sizeVar: 0.35, gravity: 0,
  z: 0.05, vz: 0.4, zg: 6, land: 'splat', layer: 'world', shadow: 0,
  ramp: RAMP_SPATTER, sizeCurve: curveOf('hold'), alphaCurve: SOLID, mark: 'fleck', markLife: 4,
};

/** Rim clots: heavy drops that settle at the pool's edge and smear. */
const RIM_CLOT: BurstOpts = {
  shape: 'drop', speed: 0.6, speedVar: 0.4, life: 1.6, lifeVar: 0.2, size: 0.14, sizeVar: 0.2, gravity: 0,
  z: 0.2, vz: 0.9, zg: 7, land: 'settle', layer: 'world',
  ramp: RAMP_GOBBET, sizeCurve: curveOf([0, 1, 0.5, 1.05, 0.8, 0.9, 1, 0.5]), alphaCurve: FADE_LATE, mark: 'smear', markLife: 6,
};

/**
 * sneak.red_floor — THE POOL THAT BLEEDS YOU. The standing blood zone
 * an opener leaves: a sheet spreads across the field's disc and skins
 * over as it dries, seep lays flecks into one stain, beads WELL UP
 * under every foot and splat back, clots settle and smear at the rim.
 * Spoken again on `every` while the field lives. Never glows.
 */
export const sneakRedFloor: EffectDef = {
  id: 'sneak.red_floor',
  name: 'Sneak — red floor',
  story: 'a sheet of blood spreads across the disc and SKINS OVER as it dries → seep lays flecks that overlap into one stain → beads well up out of the pool under every foot and splat back → clots settle at the rim and smear where they stop → the turf takes the sheet back dark',
  layers: [
    { kind: 'burst', name: 'the sheet', recipe: recipe([RED, DARK], SHEET), count: 8, tier: 'hero', arrange: 'disc', radius: 0.5, radiusK: 0.55 },
    { kind: 'emit', name: 'seep', arrange: 'disc', radius: 0.7, radiusK: 0.7, rate: 9, dur: 1.3, attack: 0.15, release: 0.5, tier: 'body',
      pops: [{ colors: [RED, DARK], opts: FLOOR_SEEP, weight: 2, tier: 'body' }, { colors: [WET, RED], opts: { ...FLOOR_SEEP, size: 0.045, life: 0.55 }, weight: 1, tier: 'fine' }] },
    { kind: 'burst', name: 'welling', recipe: recipe([WET, RED], WELL), count: 6, tier: 'body', arrange: 'disc', radius: 0.6, radiusK: 0.65, at: 0.2, every: 0.4, times: 2 },
    { kind: 'burst', name: 'rim clots', recipe: recipe([RED, DARK], RIM_CLOT), count: 4, tier: 'hero', arrange: 'ring', radius: 0.8, radiusK: 0.85, at: 0.1 },
    { kind: 'burst', name: 'the skin', recipe: recipe([DARK, CLOT], { ...SHEET, size: 0.4, life: 2.6, ramp: rampOf({ stops: [DARK, CLOT, DRIED], at: [0, 0.4, 0.85], steps: 4 }) }), count: 3, tier: 'body', arrange: 'disc', radius: 0.4, radiusK: 0.45, at: 0.6 },
    { kind: 'burst', name: 'first spill', recipe: recipe([WET, RED], { ...FLOOR_SEEP, speed: 0.7, vz: 0.6 }), count: 8, tier: 'body', arrange: 'disc', radius: 0.4, radiusK: 0.4 },
  ],
};

// ---------------------------------------------------------------------------
// THE PLANS — THE OPENED VEIN, art by art (three acts each; onFollow is
// the payoff's detonation, onFinale the held note's last pull,
// `<art>:aftermath` the ground that keeps bleeding)
// ---------------------------------------------------------------------------

export const SNEAK_PLANS: Record<string, AbilityPlan> = {
  // rend — arc (r1.9, PAYOFF: spends every bleed ×1.5, follows expose,
  // a kill refunds). "The tear": one wide wet opening, then every bleed
  // on the body is DRAWN into the knife (the tithe, blood.drink) as the
  // wound sprays; on an exposed body the tear DETONATES — a second gout
  // a beat later and the floor under the body takes a pool.
  rend: {
    cues: [
      { id: 'blood.hit', scale: 1.4 },
      { id: 'blood.spray', at: 0.15, scale: 1.1 },
      { id: 'blood.drink', at: 0.3, scale: 0.9 },
    ],
    onFollow: [
      { id: 'blood.hit', at: 0.1, scale: 1.6 },
      { id: 'blood.spray', at: 0.35, scale: 1.2 },
      { id: 'blood.pool', at: 0.6, scale: 0.9 },
    ],
  },
  // smoke_bomb — nova (r2.4, ANSWER, tag vanish, held-ground aftermath).
  // "The lost room": the cap mushrooms, the boulder swallows the room,
  // inside its own gray the knife is SNUFFED (the vanish word), and the
  // veil settles over the disc; the room stays gray as `smoke_bomb:aftermath`.
  smoke_bomb: {
    cues: [
      { id: 'smoke.ring', at: 0.05, scale: 1.3 },
      { id: 'smoke.bomb', scale: 2.2 },
      { id: 'sneak.hush', at: 0.18, scale: 1.3 },
      { id: 'smoke.veil', at: 0.6, scale: 1.2, radiusK: 1.0 },
    ],
  },
  // smoke_bomb:aftermath — field (r2.4, 4–6 s, chill; the caster quick
  // inside). "The standing gray": a veil is planted over the disc and
  // re-spoken every 1.2 s so the room never clears while it stands.
  'smoke_bomb:aftermath': {
    cues: [
      { id: 'smoke.veil', scale: 1.6, radiusK: 1.0 },
      { id: 'smoke.veil', at: 1.2, every: 1.2, scale: 1.2, radiusK: 0.95 },
    ],
  },
  // envenom — buff (ANSWER: the oiled edge, 8 s). "The venom bead":
  // the vial breaks over the steel, then the CASTER wears the steeping
  // — the same brand the victims will — and the edge drips on.
  // (abilityEffects.test.ts pins the first cue to venom.burst.)
  envenom: {
    cues: [
      { id: 'venom.burst', scale: 0.7, z: 0.4 },
      { id: 'sneak.venom_steep', at: 0.2, scale: 1.2 },
      { id: 'venom.drip', at: 0.5, scale: 0.9 },
    ],
  },
  // night_fangs — blast per fang hit (r0.55, PAYOFF: drinks venom,
  // follows expose). "The buried fang": the dark star snaps out where
  // the fang plants, the venom on the body is DRUNK into it (the
  // tithe) and the bite bleeds; on an exposed body the fang bites
  // through — a true gout, the dark clenches, the floor takes it.
  night_fangs: {
    cues: [
      { id: 'shadow.burst', scale: 0.9 },
      { id: 'sneak.venom_tithe', at: 0.06, scale: 1.0 },
      { id: 'blood.hit', at: 0.15, scale: 0.6 },
      { id: 'blood.pool', at: 0.5, scale: 0.5 },
    ],
    onFollow: [
      { id: 'blood.hit', at: 0.12, scale: 1.2 },
      { id: 'shadow.grasp', at: 0.2, scale: 0.9 },
      { id: 'blood.spray', at: 0.3, scale: 0.8 },
    ],
  },
  // ghost_step — dash (6.8 tiles ≈ 0.38 s, ANSWER, tag vanish). "The
  // rumor": the knife is SNUFFED where it stood (the vanish word), the
  // passing cut lands at the far side before the body does, and
  // soul-flames wake where it comes out unseen.
  ghost_step: {
    cues: [
      { id: 'sneak.hush', scale: 1.3 },
      { id: 'blood.hit', atFar: true, at: 0.3, scale: 1.0 },
      { id: 'blood.spray', atFar: true, at: 0.4, scale: 0.7 },
      { id: 'shadow.wisps', atFar: true, at: 0.36, scale: 0.9 },
    ],
  },
  // caltrops — field (r1.8, 7 s, SUSTAIN: bleeding bodies pay half
  // again). "The iron sowing": one toss lays the teeth inside a dark
  // iron rim; the effect keeps its own seven-second clock of glints and
  // rusts out with the field, and the bleeding pay in beads welling
  // between the teeth.
  caltrops: {
    cues: [
      { id: 'sneak.iron_sowing', scale: 1.4 },
      { id: 'blood.spray', at: 1.5, every: 1.6, scale: 0.5, radiusK: 0.6 },
    ],
  },
  // fan_of_knives — nova (r2.2, PAYOFF: follows vanish ×1.6, refund).
  // "The knife halo": blades radiate flat and PLANT, a second ring
  // farther out, the room's blood low; thrown from a vanish the fan
  // BURSTS OUT OF THE DARK — the dark star first, a third ring farther
  // still, and the room's blood pools.
  fan_of_knives: {
    cues: [
      { id: 'core.steel_ring', scale: 2.0 },
      { id: 'core.steel_ring', at: 0.12, scale: 0.9, radiusK: 1.3 },
      { id: 'blood.spray', at: 0.3, scale: 0.8, radiusK: 0.8 },
    ],
    onFollow: [
      { id: 'shadow.burst', scale: 1.3 },
      { id: 'core.steel_ring', at: 0.24, scale: 1.0, radiusK: 1.6 },
      { id: 'blood.pool', at: 0.6, scale: 0.8, radiusK: 0.7 },
    ],
  },
  // feint_double — summon (ANSWER, tag vanish: the lie stands 7 s).
  // "The standing lie": one gray exhale swallows the swap, the knife
  // that was is SNUFFED, and the dark stands up in its place as the
  // double.
  feint_double: {
    cues: [
      { id: 'smoke.veil', scale: 1.1 },
      { id: 'sneak.hush', at: 0.05, scale: 1.2 },
      { id: 'shadow.veil', at: 0.2, scale: 0.9 },
    ],
  },
  // exposing_strike — arc (r2.0, PAYOFF: follows venom ×1.5, lays
  // sunder, leaves expose, executes). "The notarized flaw": the steel
  // finds the seam, the seam sprays open, and the body wears THE
  // EXPOSED SEAM for the window; on a venomed body the venom is drunk
  // as the seam opens (the tithe) and the spray runs longer.
  exposing_strike: {
    cues: [
      { id: 'core.steel_cut', scale: 1.1 },
      { id: 'blood.hit', at: 0.05, scale: 1.3 },
      { id: 'sneak.exposed_seam', at: 0.2, scale: 1.4 },
    ],
    onFollow: [
      { id: 'sneak.venom_tithe', at: 0.08, scale: 1.3 },
      { id: 'blood.spray', at: 0.4, scale: 1.1 },
    ],
  },
  // thousand_cuts — flurry → arc per beat (five beats, 0.2 s apart,
  // CROWN: every cut reads venom, the last drinks it). "The tally
  // storm": each beat a strobe of slivers, a red bite and a tithe
  // pulled off the body — the count is the storm; on an exposed body
  // every beat bites deeper and the floor pools.
  thousand_cuts: {
    cues: [
      { id: 'core.steel_cut', scale: 0.8 },
      { id: 'blood.hit', at: 0.06, scale: 0.6 },
      { id: 'sneak.venom_tithe', at: 0.08, scale: 0.55 },
    ],
    onFollow: [
      { id: 'blood.hit', at: 0.1, scale: 0.9 },
      { id: 'blood.pool', at: 0.4, scale: 0.5 },
    ],
  },
  // whisper_fang — blast at the hit (r0.55, PAYOFF: follows vanish
  // ×1.5 + refund). "The named throat": the dark is called in to the
  // point and lets go in one hush-ripple, blood at the throat; thrown
  // from a vanish the fang arrives as a dark star and the throat opens.
  whisper_fang: {
    cues: [
      { id: 'shadow.grasp', scale: 0.7 },
      { id: 'blood.hit', at: 0.08, scale: 0.9 },
      { id: 'blood.pool', at: 0.5, scale: 0.45 },
    ],
    onFollow: [
      { id: 'shadow.burst', scale: 1.1 },
      { id: 'blood.hit', at: 0.14, scale: 1.3 },
      { id: 'blood.spray', at: 0.3, scale: 0.9 },
    ],
  },
  // opened_vein — arc (r2.0, casted OPENER: deep bleed 5 s, leaves
  // expose; rank IV leaves a pool). "The artery": one clean cut, THE
  // EXPOSED SEAM stands open on the body for the window, the wound
  // pulses, and the settled stain under it is the receipt.
  opened_vein: {
    cues: [
      { id: 'blood.hit', scale: 1.4 },
      { id: 'sneak.exposed_seam', at: 0.15, scale: 1.3 },
      { id: 'blood.spray', at: 0.4, scale: 1.1 },
      { id: 'blood.pool', at: 1.0, scale: 0.8 },
    ],
  },
  // opened_vein:aftermath — field (rank IV: r2.0, 2.4 s, bleed). "The
  // vein never closes": the red floor is planted where the cut was
  // and wells up again every 0.8 s while it stands.
  'opened_vein:aftermath': {
    cues: [
      { id: 'sneak.red_floor', scale: 1.3, radiusK: 0.8 },
      { id: 'sneak.red_floor', at: 0.8, every: 0.8, scale: 1.0, radiusK: 0.8 },
    ],
  },
  // threadwork — channel → arc per beat (three beats, SUSTAIN, finale
  // ×2.5). "The running stitch": each beat the needle bites (a small
  // strobe of steel and one red puncture); the LAST PULL tears the
  // seam — a full gout, a long spray, and the floor takes the stitch.
  threadwork: {
    cues: [
      { id: 'core.steel_cut', scale: 0.6 },
      { id: 'blood.hit', at: 0.05, scale: 0.6 },
    ],
    onFinale: [
      { id: 'blood.hit', at: 0.1, scale: 1.6 },
      { id: 'blood.spray', at: 0.3, scale: 1.3 },
      { id: 'blood.pool', at: 0.7, scale: 0.8 },
    ],
  },
  // nightshade_kiss — blast at the dart's hit (r0.55, casted OPENER:
  // deep venom, leaves venom). "The flower nobody plants twice": the
  // sac bursts at the wound and the body wears THE VENOM STEEP for the
  // window, beading after the flower is gone.
  nightshade_kiss: {
    cues: [
      { id: 'venom.burst', scale: 0.8 },
      { id: 'sneak.venom_steep', at: 0.12, scale: 1.3 },
      { id: 'venom.drip', at: 0.5, scale: 0.7 },
    ],
  },
  // quiet_knife — channel → beam per beat (three breaths, x→x2, r7,
  // OPENER: venom each breath, the last breath cuts twice, leaves
  // venom). "The hush line": smoke creeps the lane and venom is spat
  // along it each breath, beading at the far end; on the LAST BREATH
  // the far end of the line takes the steep brand and the knife cuts
  // twice.
  quiet_knife: {
    cues: [
      { id: 'smoke.trail', scale: 0.8 },
      { id: 'venom.spit', at: 0.1, scale: 0.9 },
      { id: 'venom.drip', atFar: true, at: 0.3, scale: 0.6 },
    ],
    onFinale: [
      { id: 'core.steel_cut', at: 0.05, scale: 1.2 },
      { id: 'venom.burst', atFar: true, at: 0.15, scale: 1.1 },
      { id: 'sneak.venom_steep', atFar: true, at: 0.3, scale: 1.2 },
    ],
  },
  // redwork — nova (r2.3, casted OPENER: bleed, exposes the ROOM,
  // leaves a pool). "The blown rose": the cut, then the rose opens flat
  // on the floor around the caster, THE EXPOSED SEAM stands on the room
  // (the brand sized to the bloom), and true blood leaves low where the
  // petals point; the pool stays as `redwork:aftermath`.
  redwork: {
    cues: [
      { id: 'blood.hit', scale: 1.3 },
      { id: 'blood.pool', at: 0.05, scale: 2.0 },
      { id: 'sneak.exposed_seam', at: 0.15, scale: 1.7 },
      { id: 'blood.spray', at: 0.25, scale: 1.0 },
    ],
  },
  // redwork:aftermath — field (r2.3, 3.2–4.8 s, bleed). "The pool
  // keeps": the red floor is planted across the bloom's disc and wells
  // up under every foot every 0.9 s while it stands.
  'redwork:aftermath': {
    cues: [
      { id: 'sneak.red_floor', scale: 1.6, radiusK: 1.0 },
      { id: 'sneak.red_floor', at: 0.9, every: 0.9, scale: 1.1, radiusK: 1.0 },
    ],
  },
  // gallows_thread — chain_zap → bolt per hop (x→x2, three breaths,
  // SUSTAIN: venom each neck, finale ×2.5). "The rope pulls taut": a
  // thread of shaken fiber along the rope, the dark clench at the far
  // throat, venom beading there; on the LAST PULL the noose draws
  // tight — the clench at full weight, blood at the neck, the steep.
  gallows_thread: {
    cues: [
      { id: 'smoke.trail', scale: 0.5 },
      { id: 'shadow.grasp', atFar: true, at: 0.1, scale: 0.8 },
      { id: 'venom.drip', atFar: true, at: 0.3, scale: 0.7 },
    ],
    onFinale: [
      { id: 'shadow.grasp', atFar: true, at: 0.05, scale: 1.3 },
      { id: 'blood.hit', atFar: true, at: 0.2, scale: 1.1 },
      { id: 'sneak.venom_steep', atFar: true, at: 0.35, scale: 1.1 },
    ],
  },
  // widows_draw — blast per needle hit (r0.55, three needles, casted
  // OPENER: venom, leaves venom). "The dealt hand": a burst at each
  // wound and every body at the table wears THE VENOM STEEP, the stain
  // outliving the hand.
  widows_draw: {
    cues: [
      { id: 'venom.burst', scale: 0.7 },
      { id: 'sneak.venom_steep', at: 0.12, scale: 1.0 },
      { id: 'venom.pool', at: 0.6, scale: 0.5 },
    ],
  },
  // bloodletting — channel → arc per beat (four beats, SUSTAIN: drains,
  // finale ×2). "The graduated draw": every beat blood leaves the wound
  // the WRONG way into the caster; the LAST BEAT cuts twice — the full
  // drink, a true gout, and the floor takes what was not drunk.
  bloodletting: {
    cues: [
      { id: 'blood.drink', scale: 1.0 },
      { id: 'blood.hit', at: 0.05, scale: 0.5 },
    ],
    onFinale: [
      { id: 'blood.drink', at: 0.05, scale: 1.6 },
      { id: 'blood.hit', at: 0.15, scale: 1.3 },
      { id: 'blood.pool', at: 0.6, scale: 0.8 },
    ],
  },
  // lights_out — blast (ground_aoe r2.0 after a 24t cast + 10t fuse,
  // OPENER: the school's ONE hold, root 30t, tag vanish; rank IV
  // leaves cold). "The snuffer bell": the dark and the cold spill from
  // under the lip, the knife itself is SNUFFED (the vanish word), the
  // dark GRIPS every body in the room (the root), dead-wick smoke
  // threads rise where the flames stood.
  lights_out: {
    cues: [
      { id: 'shadow.burst', scale: 2.0 },
      { id: 'shadow.grasp', at: 0.15, scale: 1.4, radiusK: 1.0 },
      { id: 'sneak.hush', at: 0.1, scale: 1.4 },
      { id: 'frost.fog', at: 0.4, scale: 0.8 },
      { id: 'smoke.wisp', at: 0.7, scale: 1.0 },
    ],
  },
  // lights_out:aftermath — field (rank IV: r2.0, 2.4 s, chill). "The
  // dark stays": the veil is planted over the room and the cold fog
  // re-spoken under it every second while the wick is out.
  'lights_out:aftermath': {
    cues: [
      { id: 'shadow.veil', scale: 1.4, radiusK: 1.0 },
      { id: 'frost.fog', at: 0.3, every: 1.0, scale: 0.8, radiusK: 0.9 },
    ],
  },
  // red_hour — channel → nova per beat (four beats, r2.0, SUSTAIN: the
  // bleeding pay half again, finale ×2). "The midnight round": each
  // beat the hour takes its due — a gash and a spray across the room —
  // and lays a settled tick on the ground; on the LAST BEAT the clock
  // STRIKES: the room's blood at full weight and a pool the width of
  // the hour.
  red_hour: {
    cues: [
      { id: 'blood.hit', scale: 0.8 },
      { id: 'blood.spray', at: 0.15, scale: 0.7, radiusK: 0.9 },
      { id: 'blood.pool', at: 0.3, scale: 0.5 },
    ],
    onFinale: [
      { id: 'blood.hit', at: 0.05, scale: 1.8 },
      { id: 'blood.spray', at: 0.2, scale: 1.4 },
      { id: 'sneak.red_floor', at: 0.4, scale: 1.4, radiusK: 0.9 },
    ],
  },
};

export const SNEAK_EFFECTS: EffectDef[] = [sneakIronSowing, sneakExposedSeam, sneakVenomSteep, sneakVenomTithe, sneakHush, sneakRedFloor];
