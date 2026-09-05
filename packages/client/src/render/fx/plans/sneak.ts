/**
 * SNEAK — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in SNEAK_EFFECTS and register through the
 * library index. The rogue's two ladders: the technique ladder (knives,
 * dark, venom) and the breath wave (blood, venom, the snuffed room).
 *
 * THE ROSTER'S OWN MATERIAL: the caltrops' iron. The library owns no
 * iron, so one roster effect sows it:
 *
 *   sneak.iron_sowing  the toss — teeth patter out on real arcs, hop
 *                      once, lie for seven seconds catching light on
 *                      their own clocks, then rust out tooth by tooth
 *
 * Knife-steel speaks through the core roster's steel (core.steel_ring
 * / core.steel_cut). Wire kinds noted per ability are what the server
 * casts with; channels re-speak the plan on every beat, projectile
 * arts speak at every hit (r0.55, no heading on the wire).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';
import { SAND, PALE, LOAM } from '../library/dust.js';

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
  shape: 'shard', speed: 1.4, speedVar: 0.5, life: 7.0, lifeVar: 0.12, size: 0.1, sizeVar: 0.2,
  gravity: 0, spin: 8, z: 0.5, vz: 2.2, zg: 8, land: 'bounce', bounce: 0.35, layer: 'world', shadow: 0.6,
  ramp: RAMP_TOOTH, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 8,
};

/** Spurs: the lesser iron, shorter-lived. */
const SPUR: BurstOpts = {
  ...TOOTH, shape: 'square', align: true, size: 0.06, speed: 1.1, vz: 1.8, life: 4.5, lifeVar: 0.3, bounce: 0.3, markLife: 5,
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
  shape: 'glint', speed: 0.03, life: 0.5, lifeVar: 0.35, size: 0.085, gravity: 0, z: 0.05,
  layer: 'world', shadow: 0, flicker: 0.7, sizeCurve: PULSE, alphaCurve: FADE_OUT,
};

/** Rust: the spent iron's flecks, lying. */
const RUST_FLECK: BurstOpts = {
  shape: 'square', align: true, speed: 0.1, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.055, sizeVar: 0.3,
  gravity: 0, z: 0.02, vz: 0.3, zg: 6, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_RUST, sizeCurve: HOLD, mark: 'fleck', markLife: 4,
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
    { kind: 'burst', name: 'teeth', recipe: recipe([IRON_LIT, IRON], TOOTH), count: 9, tier: 'hero', arrange: 'disc', radius: 0.15, dz: 0.5 },
    { kind: 'burst', name: 'spurs', recipe: recipe([IRON, IRON_DARK], SPUR), count: 8, tier: 'body', arrange: 'disc', radius: 0.2, dz: 0.45 },
    { kind: 'burst', name: 'toss dust', recipe: recipe([PALE, SAND], { ...TOSS_DUST, size: 0.16, alphaCurve: curveOf([0, 0.7, 0.5, 0.55, 1, 0]) }), count: 3, tier: 'body', arrange: 'disc', radius: 0.2 },
    { kind: 'burst', name: 'landing puffs', recipe: recipe([PALE, SAND], LAND_PUFF), count: 6, tier: 'fine', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.5 },
    { kind: 'burst', name: 'late puffs', recipe: recipe([PALE, SAND], LAND_PUFF), count: 4, tier: 'fine', arrange: 'disc', radius: 1.0, radiusK: 1.0, at: 0.75 },
    { kind: 'burst', name: 'menace', recipe: recipe([GLINT_WHITE, IRON_LIT], MENACE), count: 3, tier: 'hero', arrange: 'disc', radius: 0.8, radiusK: 0.8, at: 0.9, every: 0.5, times: 11 },
    { kind: 'emit', name: 'sift', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.3, rate: 3, dur: 1.2, attack: 0.1, release: 0.5, tier: 'fine',
      pops: [{ colors: [SAND, PALE], opts: { shape: 'mote', speed: 0.15, speedVar: 0.6, life: 1.2, lifeVar: 0.3, size: 0.04, gravity: 0, z: 0.4, zg: 2.2, land: 'settle', layer: 'world', shadow: 0, ramp: RAMP_DUST, sizeCurve: HOLD, alphaCurve: FADE_OUT } }] },
    { kind: 'burst', name: 'rust', recipe: recipe([RUST, RUST_DEEP], RUST_FLECK), count: 4, tier: 'hero', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 5.6, every: 0.45, times: 3 },
    { kind: 'glow', name: 'cold iron', r: 0.9, rgb: '200, 208, 220', a: 0.06, dur: 0.4, attack: 0.03, release: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// THE PLANS
// ---------------------------------------------------------------------------

export const SNEAK_PLANS: Record<string, AbilityPlan> = {
  // envenom — buff (8s oiled edge). "The venom bead": the vial breaks
  // over the steel (a small burst at edge height), then beads swell on
  // the edge and DROP with true weight; the ground under the guard
  // collects each landing as a stain that creeps and breathes.
  // (abilityEffects.test.ts pins the first cue to venom.burst.)
  envenom: {
    cues: [
      { id: 'venom.burst', scale: 0.5, z: 0.4 },
      { id: 'venom.drip', at: 0.25, scale: 0.8 },
      { id: 'venom.pool', at: 0.7, scale: 0.4 },
    ],
  },
  // night_fangs — blast per fang hit (r0.55, three fangs, no heading).
  // "The buried fang": the dark star snaps out where the fang plants,
  // then thin trickles crawl groundward and well into a bead.
  night_fangs: {
    cues: [
      { id: 'shadow.burst', scale: 0.55 },
      { id: 'blood.pool', at: 0.35, scale: 0.35 },
    ],
  },
  // ghost_step — dash (6.8 tiles ≈ 0.38s; the tail's hit re-speaks
  // small). "The rumor file": soul-flames stand where the body was and
  // gutter; at the arrival the CUT lands before the body does — the
  // dark star at the crossing, the slash's blood along the travel.
  ghost_step: {
    cues: [
      { id: 'shadow.wisps', scale: 0.7 },
      { id: 'blood.hit', atFar: true, at: 0.3, scale: 0.6 },
      { id: 'shadow.burst', atFar: true, at: 0.34, scale: 0.5 },
    ],
  },
  // caltrops — field (r1.8, 7s). "The iron sowing": one toss lays the
  // teeth; the effect keeps its own seven-second clock of glints and
  // rusts out with the field, so no re-speak is needed.
  caltrops: {
    cues: [{ id: 'sneak.iron_sowing', scale: 1.0 }],
  },
  // fan_of_knives — nova (r2.2, bleed). "The knife halo": eight blades
  // radiate flat and PLANT — the steel ring at full weight, and a
  // second, farther ring where the halo's outer edge lands.
  fan_of_knives: {
    cues: [
      { id: 'core.steel_ring', scale: 1.6 },
      { id: 'core.steel_ring', at: 0.12, scale: 0.7, radiusK: 1.3 },
    ],
  },
  // feint_double — summon (the arrival's half-second). "The standing
  // lie": one soft gray exhale swallows the swap, and the rogue that
  // was dissolves — the dark recalled into the body that left.
  feint_double: {
    cues: [
      { id: 'smoke.veil', scale: 0.75 },
      { id: 'shadow.veil', at: 0.1, scale: 0.55 },
    ],
  },
  // exposing_strike — arc (range 2.0, aimed). "The notarized flaw": the
  // seam sprays as it hinges open, then beads well along the open line.
  exposing_strike: {
    cues: [
      { id: 'blood.hit', scale: 0.8 },
      { id: 'blood.spray', at: 0.3, scale: 0.6 },
    ],
  },
  // thousand_cuts — flurry → arc per beat (five beats, aimed). "The
  // tally storm": each beat throws a tally group of slivers and the
  // fifth cut bites — small per beat, the count is the storm.
  thousand_cuts: {
    cues: [
      { id: 'core.steel_cut', scale: 0.6 },
      { id: 'blood.hit', at: 0.08, scale: 0.35 },
    ],
  },
  // whisper_fang — blast at the hit (r0.55). "The hush line": the
  // quietest art — the dark is called in to the point and lets go in
  // one hush-ripple; a single bead at the throat that was named.
  whisper_fang: {
    cues: [
      { id: 'shadow.grasp', scale: 0.4 },
      { id: 'blood.pool', at: 0.5, scale: 0.25 },
    ],
  },
  // shadowstep — warp (x = the near door, x2 = the far). "The dark
  // doorway": the near mouth takes the body down (the veil recalled),
  // the far mouth gives it back in a burst of dark, and the knife
  // that was already there claims its cut along the travel.
  shadowstep: {
    cues: [
      { id: 'shadow.veil', scale: 0.8 },
      { id: 'shadow.burst', atFar: true, at: 0.2, scale: 0.8 },
      { id: 'blood.hit', atFar: true, at: 0.3, scale: 0.4 },
    ],
  },
  // opened_vein — arc (range 2.0, bleed ×2 5s). "The beaded crescent":
  // one clean cut, then the wound keeps GIVING for three seconds, and
  // the settled crescent of stain under the chord is the receipt.
  opened_vein: {
    cues: [
      { id: 'blood.hit', scale: 0.9 },
      { id: 'blood.spray', at: 0.35, scale: 0.8 },
      { id: 'blood.pool', at: 1.0, scale: 0.5 },
    ],
  },
  // threadwork — channel → arc per beat (three beats, aimed). "The
  // running stitch": each beat bites one puncture red and lays one
  // settled grain — small, and the dotted line is the record.
  threadwork: {
    cues: [
      { id: 'blood.hit', scale: 0.4 },
      { id: 'blood.pool', at: 0.3, scale: 0.2 },
    ],
  },
  // nightshade_kiss — blast at the dart's hit (r0.55, venom). "The
  // flower nobody plants twice": a kiss-small burst at the wound and a
  // drip that keeps beading after the flower is gone.
  nightshade_kiss: {
    cues: [
      { id: 'venom.burst', scale: 0.5 },
      { id: 'venom.drip', at: 0.4, scale: 0.6 },
    ],
  },
  // quiet_knife — channel → beam per beat (three beats, x→x2, range
  // 7). "The paper cut": a half-tile hush of smoke-creep along the
  // lane, and thin red threads surfacing along the edges each beat.
  quiet_knife: {
    cues: [
      { id: 'smoke.trail', scale: 0.5 },
      { id: 'blood.spray', at: 0.25, scale: 0.35 },
    ],
  },
  // redwork — nova (r2.3, bleed). "The blown rose": the rose opens flat
  // on the floor around the caster — a pool at full weight is its
  // heart — and true blood leaves low where the petals point.
  redwork: {
    cues: [
      { id: 'blood.pool', scale: 1.5 },
      { id: 'blood.spray', at: 0.15, scale: 0.5 },
    ],
  },
  // gallows_thread — chain_zap → bolt per hop (x→x2, three beats,
  // venom). "The rope pulls taut": a thread of shaken fiber along the
  // rope's line, the dark clench at the far throat, venom beading
  // there drop after drop.
  gallows_thread: {
    cues: [
      { id: 'smoke.trail', scale: 0.3 },
      { id: 'shadow.grasp', atFar: true, at: 0.1, scale: 0.5 },
      { id: 'venom.drip', atFar: true, at: 0.3, scale: 0.5 },
    ],
  },
  // widows_draw — blast per needle hit (r0.55, three needles, venom).
  // "The dealt hand": a kiss of burst at each wound and a stain that
  // outlives the hand.
  widows_draw: {
    cues: [
      { id: 'venom.burst', scale: 0.45 },
      { id: 'venom.pool', at: 0.5, scale: 0.4 },
    ],
  },
  // bloodletting — channel → arc per beat (four beats). "The graduated
  // draw": every beat blood leaves the wound the WRONG way into the
  // caster, and what spills builds a settled stain beat after beat.
  bloodletting: {
    cues: [
      { id: 'blood.drink', scale: 0.7 },
      { id: 'blood.pool', at: 0.5, scale: 0.3 },
    ],
  },
  // lights_out — blast (ground_aoe r2.0 after a telegraph, chill). "The
  // snuffer bell": the dark and the cold spill from under the lip,
  // dead-wick smoke threads rise where the flames stood.
  lights_out: {
    cues: [
      { id: 'shadow.burst', scale: 1.4 },
      { id: 'frost.fog', at: 0.3, scale: 0.6 },
      { id: 'smoke.wisp', at: 0.6, scale: 0.8 },
    ],
  },
  // red_hour — channel → nova per beat (four beats, r2.0). "The
  // midnight round": each beat the hour takes its due — a gash, a
  // spray, and a settled tick laid on the ground; by the last beat the
  // ground wears a clock of what was spilled.
  red_hour: {
    cues: [
      { id: 'blood.hit', scale: 0.55 },
      { id: 'blood.pool', at: 0.3, scale: 0.4 },
    ],
  },
};

export const SNEAK_EFFECTS: EffectDef[] = [sneakIronSowing];
