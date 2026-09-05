/**
 * PETARTS — ability plans (particles v6 phase 5). THE FANG FINDS ITS
 * VOICE, spoken through the library: forty-two companion words, each
 * with its own reasoned plan, and fifteen roster-only effects for the
 * matter the library does not own — a rat swarm, sound that leaves
 * nothing, feathers, snow, silk, shed skin, a howl's warm embers,
 * mud, and the BITES.
 *
 * THE BITE LAW OF THIS ROSTER: a melee 'arc' arrives anchored at the
 * BITER (x,y = caster, dir = aim, radius = range), so a library cone
 * cast there puts the blood on the biter. Every bite effect here
 * carries `along: 1.0` on all its layers — the mark's body, one tile
 * down the aim — so the wound opens where the teeth are. Dash
 * arrivals use `atFar` with the library instead (the far anchor IS
 * the mark). Nova and command casts carry no aim (dir 0), so their
 * plans are radial by design.
 *
 * Dialects (per the signature file): melee_arc → arc; flurry → one
 * arc PER BEAT (the plan speaks each beat); nova / pulse_nova → nova
 * per pulse; dash_strike → dash; self_buff → command; ground_field →
 * field (cues re-speak on `every`); projectile landings → blast;
 * leap_slam → dash AND nova (one plan answers both wires).
 *
 * Laws held: hard edges, posterized ramps only, ≥4 named layers of
 * ≥2 kinds with a hero anchor, ≤90 grains on frame one at scale 1,
 * nothing standing past 12 s, blood and shadow never glow, palettes
 * from each ability's own style family (abilityFx.ts).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import { curveOf, rampOf } from '../curves.js';
import type { EffectDef, Layer } from '../effects.js';
import { recipe } from '../effects.js';
import type { BurstOpts } from '../../particles.js';
import { WET, RED, DARK, CLOT, DRIED as BLOOD_DRIED } from '../library/blood.js';
import { CORE as F_CORE, PALE as F_PALE, ICE as F_ICE, DEEP as F_DEEP, MIST as F_MIST, FROST_GLOW } from '../library/frost.js';
import { FRESH, BRIGHT, TOXIN, MURK, DRIED as V_DRIED, VENOM_GLOW } from '../library/venom.js';
import { SAND, PALE as D_PALE, LOAM, SHADE as D_SHADE, DEEP as D_DEEP } from '../library/dust.js';

// ---------------------------------------------------------------------------
// Shared curves
// ---------------------------------------------------------------------------

const HOLD = curveOf('hold');
const FLARE = curveOf('flare');
const SWELL = curveOf('swell');
const BLOOM = curveOf('bloom');
const PULSE = curveOf('pulse');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SMOKE_A = curveOf('smoke');
const MIST_A = curveOf('mist');
const SOLID = curveOf('solid');
/** A settling grain: holds, lets go only at the very end. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);
/** A mass: born at two thirds, swells past full, thins late. */
const MASS_SIZE = curveOf([0, 0.55, 0.25, 1, 0.6, 1.15, 1, 0.85]);
const MASS_A = curveOf([0, 0.5, 0.12, 1, 0.66, 0.9, 1, 0]);
/** A pool: spreads, holds, dries away. */
const POOL_SIZE = curveOf([0, 0.5, 0.2, 1, 0.8, 1, 1, 0.9]);
const POOL_A = curveOf([0, 0.5, 0.1, 0.9, 0.75, 0.85, 1, 0]);
/** A ground ring racing out. */
const RING_OUT = curveOf([0, 0.4, 0.55, 2.6, 1, 3.2]);
const RING_A = curveOf([0, 1, 0.5, 0.7, 1, 0]);

/** Every layer of an effect anchored one tile down the aim: the mark. */
function atMark(layers: Layer[], along = 1.0): Layer[] {
  return layers.map((L) => ({ ...L, along }));
}

// ---------------------------------------------------------------------------
// Palettes — each roster effect wears its ability's own style family.
// ---------------------------------------------------------------------------

/** Skitterkin gutter: fur browns, with the plague green of the rat's hour. */
const FUR_DEEP = '#3e3428';
const FUR = '#5c5040';
const FUR_MID = '#8a7a60';
const FUR_PALE = '#b8a888';
const TEETH = '#e8dcc8';
/** Echo shriek — the bat's violet sound. */
const CRY_SPARK = '#e0d8f4';
const CRY = '#9a8ec4';
const CRY_DEEP = '#463e6a';
const CRY_GLOW = '200, 190, 240';
/** Clatter — brass on shell. */
const BRASS_SPARK = '#f4ecc0';
const BRASS = '#c9b45e';
const BRASS_DEEP = '#6a5c2a';
const BRASS_GLOW = '230, 205, 120';
/** The owl's bone-pale feathers. */
const FEATHER_WHITE = '#fbf8f0';
const FEATHER = '#e0dccf';
const FEATHER_SHADE = '#b8b2a2';
const FEATHER_DEEP = '#6e6a5e';
/** Hushing wing / white hush — winter under the wings. */
const HUSH_SPARK = '#f4fafd';
const HUSH = '#c8dce8';
const HUSH_MID = '#8ab8d8';
const HUSH_DEEP = '#5c6c78';
/** The weaver's silk. */
const SILK_WHITE = '#ffffff';
const SILK = '#f0f0e6';
const SILK_SHADE = '#c8c8bc';
const SILK_DEEP = '#787868';
const LATTICE = '#84c95e';
const LATTICE_PALE = '#dcf8c8';
/** Shed skin — the pale old coat. */
const SKIN_PALE = '#f4f4e0';
const SKIN = '#c8c8a0';
const SKIN_DEEP = '#62624a';
/** The first howl — russet that is not fire. */
const HOWL_SPARK = '#ffe4c8';
const HOWL = '#d9925a';
const HOWL_MID = '#b86a3c';
const HOWL_DEEP = '#6e4326';
const HOWL_ASH = '#4a2c18';
const HOWL_GLOW = '235, 160, 100';
/** Mud — the wallow. */
const MUD_PALE = '#d8c8a8';
const MUD = '#8a6f4a';
const MUD_DARK = '#6a5238';
const MUD_DEEP = '#443624';
/** Teeth and claws, pale. */
const FANG = '#f4ece0';
const CLAW = '#f4dcc0';
const FANG_GREEN = '#d0ecb0';

// ---------------------------------------------------------------------------
// Ramps
// ---------------------------------------------------------------------------

const RAMP_FUR = rampOf({ stops: [FUR_MID, FUR, FUR_DEEP], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_FUR_FINE = rampOf({ stops: [FUR_PALE, FUR_MID, FUR], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_CRY = rampOf({ stops: [CRY_SPARK, CRY, CRY_DEEP], at: [0, 0.45, 0.85], steps: 4 });
const RAMP_CRY_DIM = rampOf({ stops: [CRY, CRY_DEEP], at: [0, 0.8], steps: 3 });
const RAMP_BRASS = rampOf({ stops: [BRASS_SPARK, BRASS, BRASS_DEEP], at: [0, 0.4, 0.85], steps: 5 });
const RAMP_FEATHER = rampOf({ stops: [FEATHER_WHITE, FEATHER, FEATHER_SHADE, FEATHER_DEEP], at: [0, 0.3, 0.7, 0.96], steps: 4 });
const RAMP_DOWN = rampOf({ stops: [FEATHER_WHITE, FEATHER, FEATHER_SHADE], at: [0, 0.5, 0.9], steps: 3 });
const RAMP_HUSH_COLD = rampOf({ stops: [HUSH_SPARK, HUSH, HUSH_MID, HUSH_DEEP], at: [0, 0.25, 0.6, 0.92], steps: 6 });
const RAMP_HUSH_FOG = rampOf({ stops: [HUSH, HUSH_MID], at: [0, 0.9], steps: 3 });
const RAMP_SNOW = rampOf({ stops: [SILK_WHITE, HUSH_SPARK, HUSH], at: [0, 0.5, 0.95], steps: 3 });
const RAMP_SILK = rampOf({ stops: [SILK_WHITE, SILK, SILK_SHADE, SILK_DEEP], at: [0, 0.35, 0.75, 0.96], steps: 4 });
const RAMP_LATTICE = rampOf({ stops: [LATTICE_PALE, LATTICE, TOXIN], at: [0, 0.4, 0.9], steps: 4 });
const RAMP_SKIN = rampOf({ stops: [SKIN_PALE, SKIN, SKIN_DEEP], at: [0, 0.35, 0.92], steps: 4 });
const RAMP_HOWL = rampOf({ stops: [HOWL_SPARK, HOWL, HOWL_MID, HOWL_DEEP], at: [0, 0.3, 0.65, 0.95], steps: 5 });
const RAMP_EMBER_NOT_FIRE = rampOf({ stops: [HOWL, HOWL_MID, HOWL_DEEP, HOWL_ASH], at: [0, 0.3, 0.7, 0.95], steps: 5 });
const RAMP_MUD = rampOf({ stops: [MUD, MUD_DARK, MUD_DEEP], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_MUD_WET = rampOf({ stops: [MUD_PALE, MUD, MUD_DARK], at: [0, 0.3, 0.8], steps: 4 });
const RAMP_BLOOD = rampOf({ stops: [WET, RED, DARK, CLOT], at: [0, 0.3, 0.7, 0.95], steps: 5 });
const RAMP_BLOOD_DRY = rampOf({ stops: [RED, DARK, CLOT, BLOOD_DRIED], at: [0, 0.25, 0.6, 0.9], steps: 5 });
const RAMP_FROST = rampOf({ stops: [F_CORE, F_PALE, F_ICE, F_DEEP], at: [0, 0.3, 0.65, 0.9], steps: 6 });
const RAMP_COLD = rampOf({ stops: [F_MIST, F_PALE, F_ICE], at: [0, 0.5, 0.9], steps: 4 });
const RAMP_VENOM = rampOf({ stops: [FRESH, BRIGHT, TOXIN, MURK, V_DRIED], at: [0, 0.3, 0.6, 0.85, 1], steps: 6 });
const RAMP_MURK = rampOf({ stops: [BRIGHT, TOXIN, MURK, V_DRIED], at: [0, 0.22, 0.6, 0.95], steps: 6 });
const RAMP_DUST_FINE = rampOf({ stops: [SAND, D_PALE, LOAM], at: [0, 0.45, 0.9], steps: 4 });

// ---------------------------------------------------------------------------
// Shared grain templates
// ---------------------------------------------------------------------------

/** Ground dust skittering out from under a body: fines, no residue. */
const DUST_SKITTER: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 0.6, lifeVar: 0.3, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 1.4, vz: 0.6, zg: 7, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_DUST_FINE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** A glint at the bite: teeth catching light, gone in a blink. */
const TOOTH_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.1, life: 0.28, lifeVar: 0.3, size: 0.07, sizeVar: 0.25, gravity: 0,
  z: 0.45, layer: 'world', shadow: 0, sizeCurve: FLARE, alphaCurve: FADE_OUT, flicker: 0.2,
};

/** A feather: a slim streak spinning slow, rocking on the air, settling. */
const FEATHER_GRAIN: BurstOpts = {
  shape: 'streak', speed: 0.3, speedVar: 0.5, life: 3.6, lifeVar: 0.25, size: 0.15, sizeVar: 0.2,
  gravity: 0, drag: 0.5, spin: 2.0, z: 1.0, vz: 0.4, zg: 0.6, land: 'settle', layer: 'world',
  ramp: RAMP_FEATHER, sizeCurve: HOLD, alphaCurve: SETTLE_A,
  wave: 'sine', waveHz: 1.1, waveAmp: 0.75,
};

/** Down: the finest feather-dust wafting on the wing's own air, settling. */
const DOWN: BurstOpts = {
  shape: 'mote', speed: 0.35, speedVar: 0.6, life: 1.9, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, drag: 0.6, z: 0.8, vz: 0.3, zg: 0.35, mass: 1.0, jitter: 1.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DOWN, sizeCurve: HOLD, alphaCurve: FADE_LATE,
  wave: 'noise', waveHz: 1.1, waveAmp: 0.25,
};

/** The wing wash: pale air pushed off the feathers, a low mass that thins. */
const WASH: BurstOpts = {
  shape: 'puff', speed: 1.3, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.24, sizeVar: 0.25,
  gravity: 0, drag: 2.8, z: 0.3, vz: 0.1, zg: 0, layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [FEATHER, FEATHER_SHADE], at: [0, 0.9], steps: 3 }), sizeCurve: curveOf([0, 0.7, 0.3, 1.1, 1, 0.8]), alphaCurve: curveOf([0, 0.35, 0.4, 0.3, 1, 0]),
  wave: 'noise', waveHz: 1.4, waveAmp: 0.25, spin: 0.3,
};

/** A silk thread: a pale streak riding its heading, thinning to shade. */
const THREAD: BurstOpts = {
  shape: 'streak', align: true, speed: 0.9, speedVar: 0.25, life: 0.95, lifeVar: 0.25, size: 0.08, sizeVar: 0.2,
  gravity: 0, drag: 0.4, z: 0.05, vz: 0, zg: 0, layer: 'world', shadow: 0,
  ramp: RAMP_SILK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
};

/** A silk glint at a crossing. */
const SILK_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.05, life: 0.6, lifeVar: 0.3, size: 0.06, sizeVar: 0.2, gravity: 0,
  z: 0.05, layer: 'world', shadow: 0, sizeCurve: PULSE, alphaCurve: FADE_OUT, flicker: 0.3,
};

/** Cold mist mass pushed out low, stalling. */
const COLD_MASS: BurstOpts = {
  shape: 'mote', speed: 1.5, speedVar: 0.5, life: 0.85, lifeVar: 0.3, size: 0.34, sizeVar: 0.3,
  gravity: 0, drag: 2.6, z: 0.06, vz: 0.15, zg: 0.4, mass: 0.6, layer: 'world', shadow: 0, spin: 0.5,
  ramp: RAMP_COLD, sizeCurve: MASS_SIZE, alphaCurve: FADE_LATE, wave: 'noise', waveHz: 1.6, waveAmp: 0.3,
};

/** The sinking fog — cold air falls. */
const COLD_FOG: BurstOpts = {
  shape: 'mote', speed: 0.2, speedVar: 0.5, life: 2.0, lifeVar: 0.3, size: 0.42, sizeVar: 0.25,
  gravity: 0, drag: 0.7, z: 0.25, vz: 0, zg: 0.15, layer: 'world', shadow: 0, spin: 0.25,
  ramp: RAMP_COLD, sizeCurve: SWELL, alphaCurve: MIST_A, wave: 'noise', waveHz: 0.5, waveAmp: 0.2, mass: 0.6,
};

/** A frost shard hero: flung on true height, lies, melts into rime. */
const FROST_SHARD: BurstOpts = {
  shape: 'shard', speed: 1.5, speedVar: 0.5, life: 1.5, lifeVar: 0.3, size: 0.08, sizeVar: 0.3,
  gravity: 0, spin: 9, z: 0.45, vz: 2.0, zg: 8, land: 'settle', layer: 'world',
  ramp: RAMP_FROST, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'frost', markLife: 5.5,
};

/** Frost crust: a square that dies on the dirt and rimes it. */
const FROST_CRUST: BurstOpts = {
  shape: 'square', speed: 0.15, life: 0.25, lifeVar: 0.3, size: 0.06, sizeVar: 0.3, gravity: 0,
  z: 0.03, vz: 0, zg: 4, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_FROST, sizeCurve: HOLD, mark: 'frost', markLife: 5,
};

/** A venom bead: falls, splats, stains. */
const VENOM_BEAD: BurstOpts = {
  shape: 'drop', speed: 0.4, speedVar: 0.5, life: 1.2, size: 0.07, sizeVar: 0.3, gravity: 0,
  z: 0.45, vz: 0.6, zg: 8, land: 'splat', layer: 'world',
  ramp: RAMP_VENOM, sizeCurve: HOLD, alphaCurve: SOLID, mark: 'fleck', markLife: 6,
};

/** Blood spatter: true-height arcs, splat where they land. */
const SPATTER: BurstOpts = {
  shape: 'drop', speed: 2.0, speedVar: 0.55, life: 1.6, size: 0.07, sizeVar: 0.35, gravity: 0,
  z: 0.45, vz: 1.6, zg: 9, land: 'splat', layer: 'world',
  ramp: RAMP_BLOOD, sizeCurve: HOLD, alphaCurve: SOLID,
};

/** The hero gobbet: lands, slides, SMEARS. */
const GOBBET: BurstOpts = {
  shape: 'drop', speed: 1.4, speedVar: 0.35, life: 2.0, lifeVar: 0.2, size: 0.13, sizeVar: 0.2, gravity: 0,
  z: 0.45, vz: 1.9, zg: 8, land: 'settle', layer: 'world',
  ramp: RAMP_BLOOD_DRY, sizeCurve: curveOf([0, 1, 0.6, 0.95, 1, 0.7]), alphaCurve: FADE_LATE,
  mark: 'smear', markLife: 7,
};

/** Blood mist: the finest beads, dead in a breath. */
const BLOOD_MIST: BurstOpts = {
  shape: 'drop', speed: 2.8, speedVar: 0.7, life: 0.3, lifeVar: 0.4, size: 0.04, sizeVar: 0.4, gravity: 0,
  z: 0.5, vz: 0.6, zg: 7, land: 'die', layer: 'world', shadow: 0,
  ramp: RAMP_BLOOD, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** A drip from body height, straight down, splat. */
const DRIP: BurstOpts = {
  shape: 'drop', speed: 0.08, life: 1.4, size: 0.06, sizeVar: 0.3, gravity: 0,
  vz: -0.15, zg: 7, land: 'splat', layer: 'world',
  ramp: RAMP_BLOOD, sizeCurve: HOLD, alphaCurve: SOLID,
};

// ===========================================================================
// THE ROSTER'S OWN EFFECTS
// ===========================================================================

/**
 * petarts.swarm — THE RAT'S HOUR. One beat of the circling swarm at the
 * mark (along 1.0): low gutter bodies race the ring on a vortex, fur
 * fines skitter behind them, teeth glint where they bite, green beads
 * well at the mark and stain the dirt. Four beats build one swarm.
 */
const swarm: EffectDef = {
  id: 'petarts.swarm',
  name: 'Pet arts — rat swarm',
  story: 'the gutter rises: low fur bodies race the ring around the mark on a turning vortex, fur fines skittering in their wake, teeth glinting where they bite, green beads welling at the mark and staining the dirt — and the swarm is gone as fast as it came',
  layers: atMark([
    { kind: 'field', name: 'circling', field: { kind: 'vortex', radius: 0.9, strength: 11, dur: 0.8, attack: 0.02, release: 0.2 } },
    { kind: 'burst', name: 'bodies', tier: 'hero', count: 12, arrange: 'orbit', radius: 0.4,
      recipe: recipe([FUR, FUR_DEEP, FUR_MID], {
        shape: 'blob', align: true, speed: 2.2, speedVar: 0.25, life: 0.8, lifeVar: 0.25, size: 0.24, sizeVar: 0.25,
        gravity: 0, drag: 2.2, z: 0.04, vz: 0, zg: 0, mass: 2.0, layer: 'world', shadow: 0,
        ramp: RAMP_FUR, sizeCurve: HOLD, alphaCurve: FADE_LATE, wave: 'noise', waveHz: 3, waveAmp: 0.25, core: FUR_MID, coreK: 0.35,
      }) },
    { kind: 'burst', name: 'gutter puff', tier: 'body', count: 5, arrange: 'disc', radius: 0.25,
      recipe: recipe([D_PALE, LOAM], {
        shape: 'puff', speed: 0.4, speedVar: 0.5, life: 0.8, lifeVar: 0.3, size: 0.3, sizeVar: 0.25, gravity: 0, drag: 2,
        z: 0.04, vz: 0.2, zg: 0.6, layer: 'world', shadow: 0, ramp: RAMP_DUST_FINE, sizeCurve: MASS_SIZE, alphaCurve: curveOf([0, 0.5, 0.4, 0.55, 1, 0]),
      }) },
    { kind: 'burst', name: 'fur', tier: 'fine', count: 16, arrange: 'orbit', radius: 0.4,
      recipe: recipe([FUR_PALE, FUR_MID], {
        shape: 'mote', speed: 1.6, speedVar: 0.5, life: 0.45, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
        gravity: 0, drag: 1.2, z: 0.06, mass: 1.2, layer: 'world', shadow: 0, ramp: RAMP_FUR_FINE, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
    { kind: 'burst', name: 'gutter dust', tier: 'fine', count: 8, arrange: 'rim', radius: 0.3, outward: 1.2,
      recipe: recipe([SAND, D_PALE], DUST_SKITTER) },
    { kind: 'burst', name: 'teeth', tier: 'body', count: 5, arrange: 'disc', radius: 0.22, at: 0.12,
      recipe: recipe([TEETH, FUR_PALE], { ...TOOTH_GLINT, z: 0.3 }) },
    { kind: 'burst', name: 'green beads', tier: 'hero', count: 4, arrange: 'disc', radius: 0.12, at: 0.2,
      recipe: recipe([FRESH, BRIGHT], { ...VENOM_BEAD, z: 0.3, speed: 0.5, vz: 0.8 }) },
    { kind: 'burst', name: 'second pass', tier: 'body', count: 5, arrange: 'orbit', radius: 0.36, at: 0.3,
      recipe: recipe([FUR_MID, FUR], {
        shape: 'blob', align: true, speed: 2.0, speedVar: 0.3, life: 0.6, size: 0.2, sizeVar: 0.25,
        gravity: 0, drag: 1.2, z: 0.04, mass: 2.0, layer: 'world', shadow: 0, ramp: RAMP_FUR, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
  ]),
};

/**
 * petarts.shriek — ECHO SHRIEK. Sound, said in geometry: hard wedges
 * snap out from the maw in a ring, the dust at the feet flinches, and
 * a half-beat later the world answers — a dimmer inverted ring of
 * wedges returning from the rim. Sound leaves NOTHING on the ground:
 * no mark, no residue, by design.
 */
const shriek: EffectDef = {
  id: 'petarts.shriek',
  name: 'Pet arts — shriek',
  story: 'a cry pitched where ears give up: hard sound-wedges snap outward from the maw in a ring, the dust at the feet flinches, and a half-beat later the world ANSWERS — a dimmer ring of wedges returns inverted from the rim; sound leaves nothing behind',
  layers: [
    { kind: 'burst', name: 'cry', tier: 'hero', count: 14, arrange: 'rim', radius: 0.15, outward: 5.0,
      recipe: recipe([CRY_SPARK, CRY], {
        shape: 'streak', align: true, speed: 5.0, speedVar: 0.15, life: 0.32, lifeVar: 0.15, size: 0.12, sizeVar: 0.2,
        gravity: 0, z: 0.5, vz: 0, zg: 0, layer: 'world', shadow: 0, ramp: RAMP_CRY, sizeCurve: HOLD, alphaCurve: FADE_LATE,
      }) },
    { kind: 'burst', name: 'ring', tier: 'body', count: 1,
      recipe: recipe([CRY_SPARK, CRY], {
        shape: 'ring', speed: 0, life: 0.38, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
        ramp: RAMP_CRY, sizeCurve: RING_OUT, alphaCurve: RING_A,
      }) },
    { kind: 'burst', name: 'flinch', tier: 'fine', count: 10, arrange: 'rim', radius: 0.3, outward: 1.4,
      recipe: recipe([SAND, D_PALE], { ...DUST_SKITTER, speed: 1.6, vz: 0.7, life: 0.55, size: 0.055 }) },
    { kind: 'burst', name: 'answer', tier: 'body', count: 12, arrange: 'rim', radiusK: 0.85, outward: -3.2, at: 0.38,
      recipe: recipe([CRY, CRY_DEEP], {
        shape: 'streak', align: true, speed: 3.2, speedVar: 0.15, life: 0.4, lifeVar: 0.15, size: 0.09, sizeVar: 0.2,
        gravity: 0, z: 0.45, layer: 'world', shadow: 0, ramp: RAMP_CRY_DIM, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
    { kind: 'burst', name: 'second flinch', tier: 'body', count: 1, at: 0.38,
      recipe: recipe([CRY, CRY_DEEP], {
        shape: 'ring', speed: 0, life: 0.4, lifeVar: 0.05, size: 1.4, sizeVar: 0.02, gravity: 0, layer: 'ground',
        ramp: RAMP_CRY_DIM, sizeCurve: curveOf([0, 2.2, 1, 0.5]), alphaCurve: curveOf([0, 0.55, 0.6, 0.4, 1, 0]),
      }) },
    { kind: 'glow', name: 'flash', r: 1.4, rgb: CRY_GLOW, a: 0.12, dur: 0.25, attack: 0.02, release: 0.15 },
  ],
};

/**
 * petarts.clatter — CLATTER CHALLENGE. Shell on shell: a brass clap at
 * center, sound-wedges bursting out to the rim where each turns BACK
 * inward as an arrowhead — every eye pulled to the shell — brass
 * sparks bouncing true. Sound leaves nothing; two cooling grains lie.
 */
const clatter: EffectDef = {
  id: 'petarts.clatter',
  name: 'Pet arts — clatter',
  story: 'the dropped kettle: a brass clap at center, sound-wedges bursting out to the rim where each turns back inward as an arrowhead — every eye pulled to the shell — brass sparks bouncing true and two cooling grains lying where they stopped',
  layers: [
    { kind: 'burst', name: 'clap', tier: 'hero', count: 1,
      recipe: recipe([BRASS_SPARK, BRASS], {
        shape: 'blob', speed: 0.2, life: 0.26, lifeVar: 0.1, size: 0.75, sizeVar: 0.15, gravity: 0, z: 0.35,
        layer: 'world', shadow: 0, ramp: RAMP_BRASS, sizeCurve: FLARE, alphaCurve: FADE_OUT, core: SILK_WHITE, coreK: 0.4,
      }) },
    { kind: 'burst', name: 'wedges', tier: 'body', count: 14, arrange: 'rim', radius: 0.15, outward: 5.5,
      recipe: recipe([BRASS_SPARK, BRASS], {
        shape: 'streak', align: true, speed: 5.5, speedVar: 0.15, life: 0.45, lifeVar: 0.15, size: 0.11, sizeVar: 0.2,
        gravity: 0, z: 0.4, layer: 'world', shadow: 0, ramp: RAMP_BRASS, sizeCurve: HOLD, alphaCurve: FADE_LATE,
      }) },
    { kind: 'burst', name: 'ring', tier: 'body', count: 1,
      recipe: recipe([BRASS_SPARK, BRASS], {
        shape: 'ring', speed: 0, life: 0.4, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
        ramp: RAMP_BRASS, sizeCurve: RING_OUT, alphaCurve: RING_A,
      }) },
    { kind: 'burst', name: 'sparks', tier: 'hero', count: 7, arrange: 'disc', radius: 0.1,
      recipe: recipe([BRASS_SPARK, BRASS], {
        shape: 'shard', speed: 1.4, speedVar: 0.5, life: 1.4, lifeVar: 0.3, size: 0.06, sizeVar: 0.25, gravity: 0,
        spin: 8, z: 0.3, vz: 2.0, zg: 8, land: 'bounce', bounce: 0.4, layer: 'world', flicker: 0.4,
        ramp: RAMP_BRASS, sizeCurve: HOLD, alphaCurve: SETTLE_A,
      }) },
    { kind: 'burst', name: 'arrowheads', tier: 'body', count: 12, arrange: 'rim', radiusK: 0.9, outward: -2.4, at: 0.42,
      recipe: recipe([BRASS, BRASS_DEEP], {
        shape: 'shard', align: true, speed: 2.4, speedVar: 0.1, life: 0.5, lifeVar: 0.15, size: 0.1, sizeVar: 0.2,
        gravity: 0, spin: 0, z: 0.35, layer: 'world', shadow: 0, ramp: RAMP_BRASS, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
    { kind: 'burst', name: 'cooling grains', tier: 'hero', count: 2, arrange: 'disc', radius: 0.1, at: 0.05,
      recipe: recipe([BRASS, BRASS_DEEP], {
        shape: 'square', speed: 0.5, speedVar: 0.4, life: 3.5, size: 0.05, gravity: 0, z: 0.3, vz: 1.0, zg: 7,
        land: 'settle', layer: 'world', ramp: RAMP_BRASS, sizeCurve: HOLD, alphaCurve: SETTLE_A,
      }) },
    { kind: 'glow', name: 'brass flash', r: 1.2, rgb: BRASS_GLOW, a: 0.16, dur: 0.3, attack: 0.02, release: 0.2 },
  ],
};

/**
 * petarts.feathers — the owl's own matter. The wing lets go: a wash of
 * pale air off the feathers, down wafting on it, and the loosed
 * feathers themselves spinning down slow, rocking, settling where they
 * lie; one downy feather seconds late.
 */
const feathers: EffectDef = {
  id: 'petarts.feathers',
  name: 'Pet arts — feathers',
  story: 'the wing lets go: a wash of pale air pushed off the feathers, down wafting on it, and the loosed feathers themselves — spinning down slow on true height, rocking on the air, settling where they lie; one downy feather spirals down seconds late',
  layers: [
    { kind: 'field', name: 'wing wash', field: { kind: 'lift', radius: 0.9, strength: 1.4, dur: 0.8, height: 1.2, attack: 0.02, release: 0.3 } },
    { kind: 'burst', name: 'wash', tier: 'body', count: 6, arrange: 'disc', radius: 0.2, recipe: recipe([FEATHER_WHITE, FEATHER], WASH) },
    { kind: 'burst', name: 'down', tier: 'fine', count: 12, arrange: 'disc', radius: 0.3, recipe: recipe([FEATHER_WHITE, FEATHER], DOWN) },
    { kind: 'burst', name: 'feathers', tier: 'hero', count: 4, arrange: 'disc', radius: 0.25, recipe: recipe([FEATHER, FEATHER_WHITE], FEATHER_GRAIN) },
    { kind: 'burst', name: 'preened glint', tier: 'body', count: 2, arrange: 'disc', radius: 0.15, at: 0.3,
      recipe: recipe([SILK_WHITE, FEATHER_WHITE], { ...TOOTH_GLINT, z: 0.6, life: 0.5, sizeCurve: PULSE }) },
    { kind: 'burst', name: 'late feather', tier: 'hero', count: 1, at: 0.9,
      recipe: recipe([FEATHER_WHITE, FEATHER], { ...FEATHER_GRAIN, z: 1.4, vz: 0.2, size: 0.12, spin: 1.8, waveAmp: 0.7 }) },
  ],
};

/**
 * petarts.wingbeat — HUSHING WING. One slow wingbeat, radial (a nova):
 * a pressure crescent rolls out low and flat, cold mist pushed on it,
 * frost glints in the wash, feathers loosed, and the air behind goes
 * QUIET — a sinking fog where the sound was. The ground rimes.
 */
const wingbeat: EffectDef = {
  id: 'petarts.wingbeat',
  name: 'Pet arts — wingbeat',
  story: 'one slow wingbeat: a broad pressure ring rolls out low and flat off the wings, cold mist masses pushed on it, frost glints winking in the wash, feathers loosed and rocking down, and the air behind goes quiet — a sinking fog where the sound was, the ground rimed under it',
  layers: [
    { kind: 'field', name: 'pressure', field: { kind: 'attract', radius: 1.6, strength: -2.2, dur: 0.5, attack: 0.02, release: 0.25 } },
    { kind: 'burst', name: 'crescent', tier: 'hero', count: 1,
      recipe: recipe([HUSH_SPARK, HUSH], {
        shape: 'ring', speed: 0, life: 0.5, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
        ramp: RAMP_HUSH_COLD, sizeCurve: curveOf([0, 0.4, 0.55, 2.8, 1, 3.5]), alphaCurve: RING_A, ringWidth: 0.14,
      }) },
    { kind: 'burst', name: 'cold wash', tier: 'body', count: 14, arrange: 'rim', radius: 0.2, outward: 2.4,
      recipe: recipe([HUSH_SPARK, HUSH], { ...COLD_MASS, ramp: rampOf({ stops: [HUSH_SPARK, HUSH, HUSH_MID], at: [0, 0.5, 0.95], steps: 4 }), speed: 2.4, life: 0.7, size: 0.28, drag: 2.2 }) },
    { kind: 'burst', name: 'glints', tier: 'fine', count: 8, arrange: 'disc', radiusK: 0.6, at: 0.1,
      recipe: recipe([HUSH_SPARK, F_CORE], { ...TOOTH_GLINT, z: 0.05, life: 0.8, sizeCurve: PULSE }) },
    { kind: 'burst', name: 'feathers', tier: 'hero', count: 2, arrange: 'disc', radius: 0.3,
      recipe: recipe([FEATHER_WHITE, HUSH], { ...FEATHER_GRAIN, z: 0.9 }) },
    { kind: 'burst', name: 'down', tier: 'fine', count: 8, arrange: 'disc', radius: 0.3, recipe: recipe([FEATHER_WHITE, HUSH], DOWN) },
    { kind: 'burst', name: 'rime', tier: 'body', count: 6, arrange: 'disc', radiusK: 0.5, at: 0.3,
      recipe: recipe([HUSH_SPARK, HUSH], { ...FROST_CRUST, ramp: RAMP_HUSH_COLD, markLife: 4 }) },
    { kind: 'burst', name: 'hush', tier: 'body', count: 5, arrange: 'disc', radius: 0.6, at: 0.5,
      recipe: recipe([HUSH, HUSH_SPARK], { ...COLD_FOG, ramp: rampOf({ stops: [HUSH, HUSH_MID], at: [0, 0.9], steps: 3 }), size: 0.36 }) },
    { kind: 'glow', name: 'cold light', r: 1.6, rgb: FROST_GLOW, a: 0.14, dur: 0.35, attack: 0.02, release: 0.25 },
  ],
};

/**
 * petarts.snowfall — THE WHITE HUSH. A field's beat: snow born at
 * altitude inside the radius only, drifting on a slow wind, settling
 * and STAYING white; the rim wears a feather-edge of barb ticks; the
 * hush is a sinking fog. The settled snow outlives the wings.
 */
const snowfall: EffectDef = {
  id: 'petarts.snowfall',
  name: 'Pet arts — snowfall',
  story: 'winter files in under the wings: snow born at altitude inside the radius only, drifting on a slow wind, settling and STAYING white on the ground, the rim wearing a feather-edge of barb ticks, the hush a sinking fog; when the wings fold the settled snow remains a while',
  layers: [
    { kind: 'field', name: 'wind', field: { kind: 'wind', radius: 3, strength: 0.5, dur: 2.4, dir: 0.6, attack: 0.2, release: 0.5 }, radiusK: 1.2 },
    { kind: 'emit', name: 'snow', arrange: 'disc', radiusK: 0.9, rate: 22, dur: 2.4, attack: 0.2, release: 0.5, tier: 'body',
      pops: [
        { colors: [SILK_WHITE, HUSH_SPARK], weight: 2, tier: 'body', opts: {
          shape: 'mote', speed: 0.15, speedVar: 0.5, life: 3.8, lifeVar: 0.2, size: 0.055, sizeVar: 0.3, gravity: 0, drag: 0.4,
          z: 1.5, vz: -0.2, zg: 0.35, mass: 0.8, jitter: 0.8, land: 'settle', layer: 'world', shadow: 0,
          ramp: RAMP_SNOW, sizeCurve: HOLD, alphaCurve: SETTLE_A, wave: 'noise', waveHz: 0.9, waveAmp: 0.25, mark: 'frost', markLife: 5,
        } },
        { colors: [SILK_WHITE, HUSH_SPARK], weight: 0.5, tier: 'hero', opts: {
          shape: 'mote', speed: 0.12, life: 4.0, lifeVar: 0.2, size: 0.085, sizeVar: 0.2, gravity: 0, drag: 0.4,
          z: 1.6, vz: -0.15, zg: 0.3, mass: 0.7, jitter: 0.6, land: 'settle', layer: 'world', shadow: 0,
          ramp: RAMP_SNOW, sizeCurve: HOLD, alphaCurve: SETTLE_A, wave: 'noise', waveHz: 0.7, waveAmp: 0.3, mark: 'frost', markLife: 6,
        } },
        { colors: [HUSH_SPARK, HUSH], weight: 1.2, tier: 'fine', opts: {
          shape: 'mote', speed: 0.2, life: 2.4, lifeVar: 0.3, size: 0.035, gravity: 0, drag: 0.3,
          z: 1.3, vz: -0.3, zg: 0.5, mass: 1.0, jitter: 1.2, land: 'die', layer: 'world', shadow: 0,
          ramp: RAMP_SNOW, sizeCurve: HOLD, alphaCurve: FADE_LATE,
        } },
      ] },
    { kind: 'burst', name: 'feather edge', tier: 'fine', count: 18, arrange: 'rim', radiusK: 1.0, outward: 0.15, every: 0.7, times: 2,
      recipe: recipe([HUSH_SPARK, HUSH], {
        shape: 'streak', align: true, speed: 0.15, life: 1.3, lifeVar: 0.3, size: 0.09, sizeVar: 0.25, gravity: 0, drag: 1,
        z: 0.03, layer: 'world', shadow: 0, ramp: RAMP_HUSH_COLD, sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.2, 0.8, 0.7, 0.8, 1, 0]),
      }) },
    { kind: 'burst', name: 'crust', tier: 'body', count: 10, arrange: 'disc', radiusK: 0.8, at: 0.4,
      recipe: recipe([SILK_WHITE, HUSH_SPARK], { ...FROST_CRUST, ramp: RAMP_SNOW, markLife: 6 }) },
    { kind: 'emit', name: 'hush', arrange: 'disc', radiusK: 0.7, rate: 4, dur: 2.2, attack: 0.3, release: 0.6, tier: 'body',
      pops: [{ colors: [HUSH_SPARK, HUSH], opts: { ...COLD_FOG, ramp: rampOf({ stops: [HUSH, HUSH_MID], at: [0, 0.9], steps: 3 }), z: 0.3, life: 2.2, size: 0.36, alphaCurve: curveOf([0, 0, 0.3, 0.4, 0.7, 0.35, 1, 0]) } }] },
    { kind: 'glow', name: 'cold light', r: 1.0, rgb: FROST_GLOW, a: 0.12, dur: 2.4, attack: 0.3, release: 0.6, radiusK: 1 },
  ],
};

/**
 * petarts.silk — PALE SILK. The weaver wraps itself: threads spun up
 * the body in a climbing spiral, glints where strands cross, two
 * anchor threads dropped to the ground that lie pale, and on the last
 * third the wrap TIGHTENS — pulled close, brightening.
 */
const silk: EffectDef = {
  id: 'petarts.silk',
  name: 'Pet arts — silk',
  story: 'the weaver wraps itself: pale threads spun up the body in a climbing spiral, each turn laid as it rises, silk glints where the strands cross, two anchor threads dropped to the ground that lie there pale, and on the last third the wrap tightens and brightens',
  layers: [
    { kind: 'emit', name: 'spiral', arrange: 'orbit', radius: 0.32, orbitSpeed: 9, tangent: true, rate: 52, dur: 0.85, attack: 0.02, release: 0.15, tier: 'body',
      pops: [{ colors: [SILK_WHITE, SILK], opts: { ...THREAD, speed: 0.45, speedVar: 0.15, vz: 1.0, mass: 0.8, drag: 4, life: 1.1, size: 0.07, alphaCurve: SETTLE_A } }] },
    { kind: 'burst', name: 'crossings', tier: 'body', count: 5, arrange: 'ring', radius: 0.3, dz: 0.5, at: 0.35, every: 0.3, times: 1,
      recipe: recipe([SILK_WHITE, SILK], { ...SILK_GLINT, z: 0.5 }) },
    { kind: 'burst', name: 'anchors', tier: 'hero', count: 2, arrange: 'rim', radius: 0.28, outward: 0.9, at: 0.5,
      recipe: recipe([SILK, SILK_SHADE], {
        ...THREAD, speed: 0.9, speedVar: 0.2, z: 0.6, vz: -0.2, zg: 5, drag: 3, land: 'settle', life: 8, lifeVar: 0.1, size: 0.09,
        alphaCurve: SETTLE_A,
      }) },
    { kind: 'field', name: 'tighten', at: 0.55, field: { kind: 'attract', radius: 0.8, strength: 1.6, dur: 0.4, attack: 0.02, release: 0.2 } },
    { kind: 'burst', name: 'cinch', tier: 'hero', count: 2, at: 0.6, dz: 0.4,
      recipe: recipe([SILK_WHITE, SILK], {
        shape: 'ring', speed: 0, life: 0.3, lifeVar: 0.1, size: 0.7, sizeVar: 0.1, gravity: 0, z: 0.4, layer: 'world', shadow: 0,
        ramp: RAMP_SILK, sizeCurve: curveOf([0, 1.1, 1, 0.7]), alphaCurve: FADE_OUT, ringWidth: 0.08,
      }) },
    { kind: 'burst', name: 'dust', tier: 'fine', count: 6, arrange: 'rim', radius: 0.2, outward: 0.8, recipe: recipe([SAND, D_PALE], DUST_SKITTER) },
  ],
};

/**
 * petarts.lattice — THE VENOM LATTICE. The weave lays itself in order:
 * six radials run in to the heart, two ring-threads walk around them,
 * silk glints at the knots, then green beads run the radials INWARD —
 * the strands reporting — and the knots keep venom flecks that
 * outlast the web. The floor inside stays dim: a web is mostly air.
 */
const lattice: EffectDef = {
  id: 'petarts.lattice',
  name: 'Pet arts — lattice',
  story: 'the weave lays itself: six radial threads run from the rim to the heart, two ring-threads walk around them, silk glints at every knot, then green beads run the radials inward — the strands reporting — and the knots keep venom flecks that outlast the web',
  layers: [
    { kind: 'burst', name: 'radials', tier: 'body', count: 18, arrange: 'rim', radiusK: 1.0, outward: -2.6,
      recipe: recipe([SILK, SILK_SHADE], { ...THREAD, speed: 2.6, speedVar: 0.1, life: 0.95, size: 0.09, z: 0.03, drag: 1.5 }) },
    { kind: 'emit', name: 'outer ring thread', arrange: 'orbit', radiusK: 1.0, orbitSpeed: 8, tangent: true, rate: 26, dur: 0.8, attack: 0.02, release: 0.1, tier: 'body', at: 0.25,
      pops: [{ colors: [SILK, SILK_SHADE], opts: { ...THREAD, speed: 0.5, life: 1.1, size: 0.08 } }] },
    { kind: 'emit', name: 'inner ring thread', arrange: 'orbit', radiusK: 0.55, orbitSpeed: 10, tangent: true, rate: 20, dur: 0.6, attack: 0.02, release: 0.1, tier: 'body', at: 0.55,
      pops: [{ colors: [SILK, SILK_SHADE], opts: { ...THREAD, speed: 0.4, life: 1.0, size: 0.075 } }] },
    { kind: 'burst', name: 'knots', tier: 'body', count: 6, arrange: 'ring', radiusK: 0.55, at: 0.9,
      recipe: recipe([LATTICE_PALE, SILK_WHITE], { ...SILK_GLINT, life: 1.2, size: 0.065, z: 0.03 }) },
    { kind: 'burst', name: 'rim knots', tier: 'body', count: 6, arrange: 'ring', radiusK: 1.0, at: 0.9,
      recipe: recipe([LATTICE_PALE, SILK_WHITE], { ...SILK_GLINT, life: 1.2, size: 0.065, z: 0.03 }) },
    { kind: 'field', name: 'pull', at: 1.05, field: { kind: 'attract', radius: 2.6, strength: 1.4, dur: 1.2, attack: 0.05, release: 0.3 }, radiusK: 1.1 },
    { kind: 'burst', name: 'beads', tier: 'hero', count: 6, arrange: 'rim', radiusK: 0.95, outward: -1.2, at: 1.1,
      recipe: recipe([FRESH, BRIGHT], {
        shape: 'drop', speed: 1.2, speedVar: 0.1, life: 1.4, lifeVar: 0.15, size: 0.07, sizeVar: 0.2, gravity: 0, drag: 0,
        z: 0.04, vz: 0, zg: 0, mass: 1.2, layer: 'world', shadow: 0, ramp: RAMP_LATTICE, sizeCurve: HOLD, alphaCurve: FADE_LATE,
      }) },
    { kind: 'burst', name: 'knot venom', tier: 'hero', count: 6, arrange: 'ring', radiusK: 0.55, at: 1.3,
      recipe: recipe([BRIGHT, TOXIN], { ...VENOM_BEAD, z: 0.25, speed: 0.1, vz: 0.3, zg: 7, markLife: 7 }) },
    { kind: 'glow', name: 'green thread-light', r: 1.0, rgb: VENOM_GLOW, a: 0.08, dur: 1.5, at: 1.0, attack: 0.3, release: 0.5, radiusK: 1 },
  ],
};

/**
 * petarts.slough — SHED SKIN. The hurt leaves with the old coat: a
 * pale line of shed skin slides off the body BACKWARD and lies where
 * it fell; sloughed flecks lift off the fresh hide and die in the air
 * (the cleanse leaving); the new skin glints. Nothing else — the quiet
 * is the point.
 */
const slough: EffectDef = {
  id: 'petarts.slough',
  name: 'Pet arts — slough',
  story: 'the hurt leaves with the old coat: a pale line of shed skin slides off the body backward and lies where it fell, sloughed flecks lift off the fresh hide and die in the air — the cleanse leaving — and the new skin glints; nothing else, the quiet is the point',
  layers: [
    { kind: 'burst', name: 'old coat', tier: 'hero', count: 14, arrange: 'cone', dirOff: Math.PI, spread: 0.3,
      recipe: recipe([SKIN, SKIN_PALE], {
        shape: 'square', align: true, speed: 1.6, speedVar: 0.8, life: 8, lifeVar: 0.1, size: 0.07, sizeVar: 0.25, gravity: 0, drag: 2.0,
        z: 0.15, vz: 0.25, zg: 3, land: 'settle', layer: 'world', ramp: RAMP_SKIN, sizeCurve: HOLD, alphaCurve: SETTLE_A,
      }) },
    { kind: 'burst', name: 'second slough', tier: 'body', count: 5, arrange: 'cone', dirOff: Math.PI, spread: 0.5, at: 0.25,
      recipe: recipe([SKIN_PALE, SKIN], {
        shape: 'square', align: true, speed: 1.3, speedVar: 0.8, life: 6, lifeVar: 0.1, size: 0.06, sizeVar: 0.25, gravity: 0, drag: 2.0,
        z: 0.25, vz: 0.2, zg: 3, land: 'settle', layer: 'world', ramp: RAMP_SKIN, sizeCurve: HOLD, alphaCurve: SETTLE_A,
      }) },
    { kind: 'field', name: 'lift', field: { kind: 'lift', radius: 0.7, strength: 1.6, dur: 0.7, height: 1.6, attack: 0.02, release: 0.3 } },
    { kind: 'burst', name: 'flecks leaving', tier: 'fine', count: 12, arrange: 'disc', radius: 0.2,
      recipe: recipe([SKIN_PALE, SKIN], {
        shape: 'mote', speed: 0.3, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.04, sizeVar: 0.3, gravity: 0,
        z: 0.4, vz: 0.7, zg: -0.1, mass: 1, jitter: 1.2, layer: 'world', shadow: 0, ramp: RAMP_SKIN, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
    { kind: 'burst', name: 'new glint', tier: 'body', count: 4, arrange: 'disc', radius: 0.15, at: 0.35,
      recipe: recipe([SILK_WHITE, SKIN_PALE], { ...TOOTH_GLINT, z: 0.5, life: 0.6, sizeCurve: PULSE }) },
    { kind: 'burst', name: 'dust', tier: 'fine', count: 5, arrange: 'rim', radius: 0.2, outward: 0.7, recipe: recipe([SAND, D_PALE], DUST_SKITTER) },
  ],
};

/**
 * petarts.howl — THE FIRST HOWL. The muzzle lifts: a warm breath-column
 * climbs and breaks into rising song-rings at its crest; then the
 * answer — russet motes rain back DOWN the column and settle as a
 * mantle of embers that are not fire; six warm grains last at its feet.
 */
const howl: EffectDef = {
  id: 'petarts.howl',
  name: 'Pet arts — howl',
  story: 'the muzzle lifts: a warm breath-column climbs off the wolf and breaks into rising song-rings at its crest; then the answer — russet motes rain back down the column and settle at its feet as a mantle of embers that are not fire; a ring of six warm grains lasts',
  layers: [
    { kind: 'field', name: 'lift', field: { kind: 'lift', radius: 0.6, strength: 2.2, dur: 0.7, height: 2.2, attack: 0.02, release: 0.3 } },
    { kind: 'emit', name: 'breath', arrange: 'point', dz: 0.6, rate: 28, dur: 0.55, attack: 0.03, release: 0.2, tier: 'body',
      pops: [{ colors: [HOWL_SPARK, HOWL], opts: {
        shape: 'mote', speed: 0.15, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.13, sizeVar: 0.3, gravity: 0,
        vz: 1.8, zg: -0.2, mass: 0.8, layer: 'world', shadow: 0, ramp: RAMP_HOWL, sizeCurve: SWELL, alphaCurve: SMOKE_A,
        wave: 'noise', waveHz: 1.4, waveAmp: 0.18,
      } }] },
    { kind: 'burst', name: 'song rings', tier: 'hero', count: 1, dz: 1.4, at: 0.3, every: 0.16, times: 2,
      recipe: recipe([HOWL_SPARK, HOWL], {
        shape: 'ring', speed: 0, life: 0.7, lifeVar: 0.1, size: 0.45, sizeVar: 0.05, gravity: 0, z: 0, vz: 0.7, zg: 0,
        layer: 'world', shadow: 0, ramp: RAMP_HOWL, sizeCurve: curveOf([0, 0.5, 1, 2.2]), alphaCurve: curveOf([0, 1, 0.6, 0.9, 1, 0]), ringWidth: 0.16,
      }) },
    { kind: 'burst', name: 'answer', tier: 'body', count: 24, arrange: 'disc', radius: 0.2, dz: 1.9, at: 0.75,
      recipe: recipe([HOWL, HOWL_MID], {
        shape: 'mote', speed: 0.1, speedVar: 0.5, life: 2.4, lifeVar: 0.25, size: 0.07, sizeVar: 0.3, gravity: 0,
        z: 1.9, vz: -0.3, zg: 1.6, land: 'settle', layer: 'world', shadow: 0, flicker: 0.25,
        ramp: RAMP_EMBER_NOT_FIRE, sizeCurve: HOLD, alphaCurve: SETTLE_A, wave: 'sine', waveHz: 1.2, waveAmp: 0.15,
      }) },
    { kind: 'glow', name: 'mantle', r: 0.9, rgb: HOWL_GLOW, a: 0.22, dur: 1.8, at: 0.7, attack: 0.6, release: 0.8, flicker: 0.2 },
    { kind: 'burst', name: 'six warm grains', tier: 'hero', count: 6, arrange: 'ring', radius: 0.4, at: 0.9,
      recipe: recipe([HOWL, HOWL_MID], {
        shape: 'square', speed: 0.03, life: 8, lifeVar: 0.1, size: 0.055, gravity: 0, z: 0.02, vz: 0.05, zg: 2,
        land: 'settle', layer: 'world', shadow: 0, flicker: 0.15, ramp: RAMP_EMBER_NOT_FIRE, sizeCurve: HOLD, alphaCurve: SETTLE_A,
      }) },
  ],
};

/**
 * petarts.mud — MUD WALLOW. It drops and rolls: the wallow print opens
 * under the boar as a fat dark ellipse, lazy gobbets loft and SPLAT
 * true leaving smears, mud spray skitters, and the cleanse reads
 * upward — dark flecks lift off the hide and die. The print lasts.
 */
const mud: EffectDef = {
  id: 'petarts.mud',
  name: 'Pet arts — mud',
  story: 'it drops and rolls: the wallow print opens under the boar as a fat dark ellipse, lazy mud gobbets loft and SPLAT true around it leaving smears, mud spray fines skitter, and the cleanse reads upward — dark flecks lift off the hide and die in the air; the print lasts',
  layers: [
    { kind: 'burst', name: 'print', tier: 'hero', count: 1,
      recipe: recipe([MUD_DARK, MUD_DEEP], {
        shape: 'blob', speed: 0.02, life: 8, lifeVar: 0.05, size: 0.62, sizeVar: 0.1, gravity: 0, layer: 'ground', shadow: 0, spin: 0,
        ramp: RAMP_MUD, sizeCurve: curveOf([0, 0.6, 0.15, 1, 1, 1]), alphaCurve: curveOf([0, 0.2, 0.1, 0.9, 0.75, 0.85, 1, 0]),
        mark: 'smear', markLife: 5,
      }) },
    { kind: 'burst', name: 'rolled rim', tier: 'body', count: 1,
      recipe: recipe([MUD, MUD_DARK], {
        shape: 'ring', speed: 0, life: 0.7, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0, layer: 'ground',
        ramp: RAMP_MUD, sizeCurve: curveOf([0, 0.6, 1, 1.6]), alphaCurve: FADE_OUT, ringWidth: 0.16,
      }) },
    { kind: 'burst', name: 'gobbets', tier: 'hero', count: 5, arrange: 'disc', radius: 0.15, at: 0.1,
      recipe: recipe([MUD, MUD_DARK], {
        shape: 'drop', speed: 0.8, speedVar: 0.5, life: 1.8, size: 0.11, sizeVar: 0.25, gravity: 0, z: 0.15, vz: 1.8, zg: 7,
        land: 'splat', layer: 'world', ramp: RAMP_MUD_WET, sizeCurve: HOLD, alphaCurve: SOLID, mark: 'smear', markLife: 6,
      }) },
    { kind: 'burst', name: 'second roll', tier: 'body', count: 4, arrange: 'disc', radius: 0.2, at: 0.4,
      recipe: recipe([MUD, MUD_DARK], {
        shape: 'drop', speed: 0.7, speedVar: 0.5, life: 1.6, size: 0.09, sizeVar: 0.25, gravity: 0, z: 0.2, vz: 1.5, zg: 7,
        land: 'splat', layer: 'world', ramp: RAMP_MUD_WET, sizeCurve: HOLD, alphaCurve: SOLID, mark: 'fleck', markLife: 5,
      }) },
    { kind: 'burst', name: 'spray', tier: 'fine', count: 14, arrange: 'disc', radius: 0.15,
      recipe: recipe([MUD_PALE, MUD], {
        shape: 'drop', speed: 1.4, speedVar: 0.6, life: 1.0, size: 0.045, sizeVar: 0.3, gravity: 0, z: 0.1, vz: 1.3, zg: 8,
        land: 'die', layer: 'world', shadow: 0, ramp: RAMP_MUD_WET, sizeCurve: HOLD, mark: 'fleck', markLife: 3,
      }) },
    { kind: 'field', name: 'lift', at: 0.3, field: { kind: 'lift', radius: 0.7, strength: 1.4, dur: 0.8, height: 1.6, attack: 0.02, release: 0.3 } },
    { kind: 'burst', name: 'flecks leaving', tier: 'fine', count: 10, arrange: 'disc', radius: 0.2, at: 0.3,
      recipe: recipe([MUD_DEEP, MUD_DARK], {
        shape: 'mote', speed: 0.25, speedVar: 0.5, life: 0.85, lifeVar: 0.3, size: 0.045, sizeVar: 0.3, gravity: 0,
        z: 0.5, vz: 0.8, zg: -0.15, mass: 1, jitter: 1.0, layer: 'world', shadow: 0, ramp: RAMP_MUD, sizeCurve: HOLD, alphaCurve: FADE_OUT,
      }) },
  ],
};

/**
 * petarts.bite — THE JAWS, at the mark (along 1.0). Teeth glint where
 * they set, a wet gout leaves the wound along the bite, spatter arcs
 * and splats, a heavy gobbet lands and SMEARS, the wound drips after
 * and a stain pools where the mark stood. Blood never glows.
 */
const bite: EffectDef = {
  id: 'petarts.bite',
  name: 'Pet arts — bite',
  story: 'the jaws close on the mark: pale teeth glint where they set, a wet gout leaves the wound along the bite, spatter arcs on true height and splats, a heavy gobbet lands and SMEARS, the wound drips after and a stain pools where it stood',
  layers: atMark([
    { kind: 'burst', name: 'teeth', tier: 'body', count: 6, arrange: 'disc', radius: 0.18, recipe: recipe([FANG, WET], TOOTH_GLINT) },
    { kind: 'burst', name: 'gout', tier: 'body', count: 3, arrange: 'cone', spread: 0.6,
      recipe: recipe([WET, RED], {
        shape: 'blob', align: true, speed: 1.4, speedVar: 0.45, life: 0.36, lifeVar: 0.2, size: 0.3, sizeVar: 0.25, gravity: 0,
        z: 0.45, vz: 0.4, zg: 4, drag: 2.2, land: 'die', layer: 'world', shadow: 0,
        ramp: RAMP_BLOOD, sizeCurve: FLARE, alphaCurve: FADE_OUT, core: WET, coreK: 0.4,
      }) },
    { kind: 'burst', name: 'spatter', tier: 'body', count: 7, arrange: 'cone', spread: 0.9, recipe: recipe([WET, RED, DARK], SPATTER) },
    { kind: 'burst', name: 'gobbet', tier: 'hero', count: 2, arrange: 'cone', spread: 0.7, recipe: recipe([RED, DARK], GOBBET) },
    { kind: 'burst', name: 'mist', tier: 'fine', count: 10, arrange: 'cone', spread: 1.1, recipe: recipe([WET, RED], BLOOD_MIST) },
    { kind: 'emit', name: 'drip', arrange: 'point', dz: 0.7, at: 0.35, rate: 5, dur: 1.2, attack: 0.05, release: 0.5, tier: 'body',
      pops: [{ colors: [RED, DARK], opts: DRIP }] },
    { kind: 'burst', name: 'stain', tier: 'hero', count: 1, at: 0.5,
      recipe: recipe([RED, DARK], {
        shape: 'blob', speed: 0.02, life: 3.6, lifeVar: 0.1, size: 0.3, sizeVar: 0.2, gravity: 0, layer: 'ground', shadow: 0, spin: 0.1,
        ramp: RAMP_BLOOD_DRY, sizeCurve: POOL_SIZE, alphaCurve: POOL_A, mark: 'smear', markLife: 4,
      }) },
  ]),
};

/**
 * petarts.rake — THE CLAWS, at the mark (along 1.0). Three parallel
 * claw-lines slashed along the aim, blood fines flung off the claws,
 * beads arcing and splatting, and the rake's scars staying on the
 * ground where the claws crossed. Blood never glows.
 */
const rake: EffectDef = {
  id: 'petarts.rake',
  name: 'Pet arts — rake',
  story: 'the paw rakes through: three parallel claw-lines slashed along the aim on the mark, blood fines flung off the claws, beads arcing and splatting, and the rake\'s scars staying on the ground where the claws crossed',
  layers: atMark([
    { kind: 'burst', name: 'claw lines', tier: 'hero', count: 3, arrange: 'ring', radius: 0.14, aimed: true,
      recipe: recipe([CLAW, RED], {
        shape: 'streak', align: true, speed: 3.6, speedVar: 0.05, life: 0.3, lifeVar: 0.05, size: 0.2, sizeVar: 0.1, gravity: 0,
        z: 0.5, layer: 'world', shadow: 0, ramp: rampOf({ stops: [CLAW, WET, RED], at: [0, 0.4, 0.85], steps: 3 }), sizeCurve: HOLD, alphaCurve: FADE_LATE,
      }) },
    { kind: 'burst', name: 'flash', tier: 'body', count: 3, arrange: 'disc', radius: 0.15, recipe: recipe([CLAW, FANG], TOOTH_GLINT) },
    { kind: 'burst', name: 'fines', tier: 'fine', count: 10, arrange: 'cone', spread: 0.7,
      recipe: recipe([WET, RED], { ...BLOOD_MIST, speed: 2.4, life: 0.8, vz: 1.2, zg: 9, size: 0.045, mark: 'fleck', markLife: 5 }) },
    { kind: 'burst', name: 'beads', tier: 'body', count: 5, arrange: 'cone', spread: 0.8, recipe: recipe([WET, RED, DARK], { ...SPATTER, speed: 1.6, vz: 1.7 }) },
    { kind: 'burst', name: 'scars', tier: 'hero', count: 3, arrange: 'ring', radius: 0.14, aimed: true, at: 0.15,
      recipe: recipe([DARK, CLOT], {
        shape: 'streak', align: true, speed: 1.0, speedVar: 0.1, life: 5, lifeVar: 0.1, size: 0.1, sizeVar: 0.15, gravity: 0, drag: 6,
        layer: 'ground', shadow: 0, ramp: RAMP_BLOOD_DRY, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'smear', markLife: 4,
      }) },
    { kind: 'emit', name: 'bleed', arrange: 'disc', radius: 0.15, dz: 0.5, at: 0.3, rate: 4, dur: 0.8, attack: 0.05, release: 0.3, tier: 'body',
      pops: [{ colors: [RED, DARK], opts: { ...DRIP, size: 0.05 } }] },
  ]),
};

/**
 * petarts.cold_bite — THE COLD JAW, at the mark (along 1.0). Frost
 * teeth glint and crack at the bite, shards fly on true height and
 * land to melt into rime, cold breath drifts off the closed line and
 * sinks, a bitten crescent of rime stays on the ground.
 */
const coldBite: EffectDef = {
  id: 'petarts.cold_bite',
  name: 'Pet arts — cold bite',
  story: 'the cold jaw closes: frost teeth glint and crack at the bite, shards fly on true height and land to melt into rime, cold breath drifts off the closed line and sinks to the floor, and a bitten crescent of rime stays on the ground',
  layers: atMark([
    { kind: 'burst', name: 'frost teeth', tier: 'body', count: 6, arrange: 'disc', radius: 0.2, recipe: recipe([F_CORE, F_PALE], { ...TOOTH_GLINT, flicker: 0.4 }) },
    { kind: 'burst', name: 'crack', tier: 'hero', count: 1,
      recipe: recipe([F_CORE, F_PALE], {
        shape: 'ring', speed: 0, life: 0.3, lifeVar: 0.1, size: 0.3, sizeVar: 0.1, gravity: 0, z: 0.4, layer: 'world', shadow: 0,
        ramp: RAMP_FROST, sizeCurve: curveOf([0, 0.4, 1, 1.7]), alphaCurve: FADE_OUT, ringWidth: 0.12,
      }) },
    { kind: 'burst', name: 'shards', tier: 'hero', count: 5, arrange: 'cone', spread: 1.0, recipe: recipe([F_CORE, F_PALE, F_ICE], FROST_SHARD) },
    { kind: 'burst', name: 'hail', tier: 'body', count: 8, arrange: 'cone', spread: 1.1,
      recipe: recipe([F_PALE, F_ICE], { ...FROST_SHARD, size: 0.06, sizeVar: 0.2, speed: 1.9, life: 0.9, vz: 1.6, zg: 7, land: 'die', markLife: 4 }) },
    { kind: 'burst', name: 'breath', tier: 'body', count: 6, arrange: 'cone', spread: 0.9, at: 0.1,
      recipe: recipe([F_MIST, F_PALE], { ...COLD_MASS, speed: 0.8, z: 0.3, size: 0.3 }) },
    { kind: 'burst', name: 'rime crescent', tier: 'body', count: 8, arrange: 'ring', radius: 0.28, at: 0.2, recipe: recipe([F_PALE, F_ICE], FROST_CRUST) },
    { kind: 'burst', name: 'sink fog', tier: 'body', count: 3, arrange: 'disc', radius: 0.35, at: 0.5, recipe: recipe([F_MIST, F_PALE], { ...COLD_FOG, size: 0.34, life: 1.6 }) },
    { kind: 'glow', name: 'cold light', r: 0.9, rgb: FROST_GLOW, a: 0.14, dur: 0.3, attack: 0.02, release: 0.2 },
  ]),
};

/**
 * petarts.envenom — THE FANGS, at the mark (along 1.0). Teeth glint at
 * the puncture, green beads well up between them and work down,
 * splatting and staining, murk breathes low at the wound, three
 * vein-lines crawl outward along the ground (the dose traveling), a
 * pool wells at the base and the ground keeps every fleck.
 */
const envenom: EffectDef = {
  id: 'petarts.envenom',
  name: 'Pet arts — envenom',
  story: 'the fangs set and hold: teeth glint at the puncture, green beads well up between them and work down, splatting and staining, murk breathes low at the wound, three vein-lines crawl outward along the ground — the dose traveling — a pool wells at the base and the ground keeps every fleck',
  layers: atMark([
    { kind: 'burst', name: 'fangs', tier: 'body', count: 4, arrange: 'disc', radius: 0.15, recipe: recipe([FANG_GREEN, FANG], TOOTH_GLINT) },
    { kind: 'burst', name: 'puncture', tier: 'body', count: 4, arrange: 'disc', radius: 0.08, recipe: recipe([FRESH, BRIGHT], VENOM_BEAD) },
    { kind: 'emit', name: 'beads welling', arrange: 'point', dz: 0.5, at: 0.15, rate: 8, dur: 1.0, attack: 0.05, release: 0.4, tier: 'body',
      pops: [
        { colors: [FRESH, BRIGHT], opts: { ...VENOM_BEAD, z: 0, speed: 0.15, vz: -0.1, zg: 6, size: 0.065 }, weight: 1, tier: 'body' },
        { colors: [BRIGHT, TOXIN], opts: { ...VENOM_BEAD, z: 0, speed: 0.1, vz: -0.1, zg: 6, size: 0.09, markLife: 7 }, weight: 0.3, tier: 'hero' },
      ] },
    { kind: 'burst', name: 'murk', tier: 'body', count: 4, arrange: 'disc', radius: 0.15, at: 0.2,
      recipe: recipe([TOXIN, MURK], {
        shape: 'blob', speed: 0.12, speedVar: 0.5, life: 1.2, lifeVar: 0.3, size: 0.3, sizeVar: 0.3, gravity: 0,
        z: 0.06, vz: 0.2, zg: 0, layer: 'world', shadow: 0, spin: 0.4, ramp: RAMP_MURK, sizeCurve: SWELL, alphaCurve: SMOKE_A,
        wave: 'noise', waveHz: 1.2, waveAmp: 0.2,
      }) },
    { kind: 'burst', name: 'veins', tier: 'hero', count: 3, arrange: 'rim', radius: 0.08, outward: 0.9, at: 0.4,
      recipe: recipe([BRIGHT, TOXIN], {
        shape: 'streak', align: true, speed: 0.9, speedVar: 0.15, life: 3.5, lifeVar: 0.15, size: 0.09, sizeVar: 0.15, gravity: 0, drag: 2.0,
        layer: 'ground', shadow: 0, ramp: RAMP_MURK, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
      }) },
    { kind: 'burst', name: 'pool', tier: 'hero', count: 1, at: 0.5,
      recipe: recipe([BRIGHT, TOXIN], {
        shape: 'blob', speed: 0.02, life: 4, lifeVar: 0.1, size: 0.28, sizeVar: 0.2, gravity: 0, layer: 'ground', shadow: 0, spin: 0.1,
        ramp: RAMP_VENOM, sizeCurve: POOL_SIZE, alphaCurve: POOL_A, mark: 'fleck', markLife: 4,
      }) },
    { kind: 'glow', name: 'green light', r: 0.7, rgb: VENOM_GLOW, a: 0.1, dur: 0.6, attack: 0.05, release: 0.4 },
  ]),
};

export const PETARTS_EFFECTS: EffectDef[] = [
  swarm, shriek, clatter, feathers, wingbeat, snowfall, silk, lattice, slough, howl, mud, bite, rake, coldBite, envenom,
];

// ===========================================================================
// THE PLANS — one per ability id, each with its reason.
// ===========================================================================

export const PETARTS_PLANS: Record<string, AbilityPlan> = {
  // ------------------------------------------------------------ SKITTERKIN
  // dash 4.4, dmg 1: the launch kick (dust.kick throws BEHIND the heel), a
  // tiny nip at the far end, and the turn-away kick where the rat wheels.
  nip_and_dart: { cues: [
    { id: 'dust.kick', scale: 0.55 },
    { id: 'blood.hit', atFar: true, at: 0.15, scale: 0.45 },
    { id: 'dust.kick', atFar: true, at: 0.3, scale: 0.45 },
  ] },
  // arc 1.6, venom 2: the clamp sets and HOLDS while beads well down —
  // envenom's welling emitter is the hold; the pool is the worried stain.
  plague_gnaw: { cues: [{ id: 'petarts.envenom', scale: 0.9 }] },
  // flurry ×4 (one arc per beat): each beat is one pass of the swarm at the
  // mark; four casts build the circling read and the green crown of flecks.
  the_rats_hour: { cues: [{ id: 'petarts.swarm', scale: 0.8 }] },
  // pulse_nova ×2, radius 1.8: each pulse is one cry and its answer; the
  // wire radius sizes the returning ring (radiusK inside the effect).
  echo_shriek: { cues: [{ id: 'petarts.shriek', scale: 1.0 }] },
  // dash 6.4, bleed: shadow wakes off the folding wings at the launch, the
  // landing is an inverted flash whose clots lie as the knife-stain, and
  // true blood follows the strike. Shadow and blood never glow.
  the_dark_descent: { cues: [
    { id: 'shadow.wisps', scale: 0.5 },
    { id: 'shadow.burst', atFar: true, at: 0.2, scale: 0.9 },
    { id: 'blood.hit', atFar: true, at: 0.25, scale: 0.7 },
  ] },

  // ------------------------------------------------------------- SHELLBACKS
  // command: the dome settles a beat after the word — a small earth slam
  // (skirt at the rim, clods that lie = ground remembers being stood on).
  set_the_shell: { cues: [{ id: 'dust.slam', at: 0.25, scale: 0.65 }] },
  // nova 3.0 taunt: brass clap, wedges out, arrowheads back to the shell.
  clatter_challenge: { cues: [{ id: 'petarts.clatter', scale: 1.2 }] },
  // arc 2.0 knockback: the horn digs in — an earth slam at the beetle's
  // feet, clods tossed high and bouncing back down (the one true chunk).
  horn_toss: { cues: [{ id: 'dust.slam', scale: 0.75 }] },
  // arc 1.7 chill 2: the caliper claws close cold at the mark; the tide
  // recedes as a mist at the crab's own feet.
  tide_grip: { cues: [
    { id: 'petarts.cold_bite', scale: 0.85 },
    { id: 'water.mist', at: 0.3, scale: 0.35 },
  ] },
  // pulse_nova ×3, radius 2.2, chill: each pull is one dragging crest (a
  // splash sheet at the crab) with cold spray sinking and riming behind it;
  // three pulls compose on the laid rime.
  the_undertow: { cues: [
    { id: 'water.splash', scale: 0.6 },
    { id: 'frost.fog', at: 0.3, scale: 0.5, radiusK: 0.6 },
  ] },
  // nova 3.6 taunt+guard: the monolith PLANTS — one big earth slam whose
  // clods bounce and STAND; the settled circle is the lasting mark.
  the_standing_stone: { cues: [{ id: 'dust.slam', at: 0.2, scale: 1.5 }] },
  // arc 2.0 dmg 8 chill: the harbor gate falls — the cold jaw at weight,
  // true water thrown at the foot a beat after.
  riptide_claw: { cues: [
    { id: 'petarts.cold_bite', scale: 1.5 },
    { id: 'water.splash', at: 0.12, scale: 0.7 },
  ] },
  // arc 2.0 dmg 7 vs chill: the frost seam shatters where the royal arcs
  // meet, and true blood follows a beat behind.
  the_kings_pincer: { cues: [
    { id: 'petarts.cold_bite', scale: 1.2 },
    { id: 'petarts.bite', at: 0.12, scale: 1.1 },
  ] },

  // ---------------------------------------------------------------- TUSKERS
  // dash 7.2 charge: the launch kick, the twin tusk-rails plowing the whole
  // corridor (dust.gouge tears near→far and its clods lie beside the line),
  // and the arrival's V of thrown earth.
  gore_charge: { cues: [
    { id: 'dust.kick', scale: 0.8 },
    { id: 'dust.gouge', scale: 1.0 },
    { id: 'dust.slam', atFar: true, at: 0.3, scale: 0.9 },
  ] },
  // arc 1.9, a one-focus word, honestly cheap: grass-nicks flicked up at the
  // boar's feet as the tusk skims the ground. Nothing more, by design.
  tusk_sweep: { cues: [{ id: 'dust.slam', scale: 0.4 }] },
  // command: the wallow — print, gobbets, spray, the flecks leaving.
  mud_wallow: { cues: [{ id: 'petarts.mud', scale: 1.0 }] },
  // dash AND nova (one plan, two wires): the leap kicks off, the slam is the
  // land, the gouge is the furrow ripping forward (near→far on the dash;
  // a point-tear at the nova's center). The field stays plowed.
  the_long_furrow: { cues: [
    { id: 'dust.kick', scale: 0.7 },
    { id: 'dust.slam', at: 0.05, scale: 1.5 },
    { id: 'dust.gouge', at: 0.15, scale: 0.9 },
  ] },

  // ----------------------------------------------------------------- CANIDS
  // arc 1.8 vs bleed: the clamp sets, then WORRIES — a second, smaller bite
  // a beat later drags the stain a little further.
  worry_the_wound: { cues: [
    { id: 'petarts.bite', scale: 1.0 },
    { id: 'petarts.bite', at: 0.28, scale: 0.6 },
  ] },
  // arc 1.8 chill 2: one precise low bite — the cold jaw with a little
  // true blood in it; the rimed nick lasts.
  hamstring: { cues: [
    { id: 'petarts.cold_bite', scale: 0.8 },
    { id: 'petarts.bite', at: 0.05, scale: 0.5 },
  ] },
  // command: the breath-column, the song-rings, the answer raining down.
  the_first_howl: { cues: [{ id: 'petarts.howl', scale: 1.0 }] },
  // arc 1.9 chill: the whole sweep is a jaw — the cold bite at width, and
  // cold breath drifting off the closed line from the worg's own mouth.
  winters_jaw: { cues: [
    { id: 'petarts.cold_bite', scale: 1.2 },
    { id: 'frost.breath', at: 0.1, scale: 0.5 },
  ] },
  // nova 3.2 becalm: the order presses out as sound (the shriek's wedges,
  // a cousin violet) and low shadow pools at the snarl's feet, then is
  // recalled. Shadow never glows.
  the_cowing_snarl: { cues: [
    { id: 'petarts.shriek', scale: 0.9 },
    { id: 'shadow.veil', at: 0.15, scale: 0.7, radiusK: 0.5 },
  ] },

  // ------------------------------------------------------------------- CATS
  // flurry ×3 (one arc per beat): each beat is one rake at the mark; the
  // scars accumulate on the ground across the beats.
  raking_flurry: { cues: [{ id: 'petarts.rake', scale: 0.9 }] },
  // dash 6.8 chill: the cold left where the cat sprang, and the frost
  // bloom on the final landing — shards lie and rime the last print.
  the_winter_stalk: { cues: [
    { id: 'frost.fog', scale: 0.4 },
    { id: 'frost.nova', atFar: true, at: 0.3, scale: 0.9 },
  ] },

  // ------------------------------------------------------------------- BEAR
  // arc 2.1 dmg 8 bleed: the whole argument — five furrows (the rake at
  // weight) and the center gushing true (the bite's gout, gobbet, pool).
  maul: { cues: [
    { id: 'petarts.rake', scale: 1.6 },
    { id: 'petarts.bite', at: 0.08, scale: 1.3 },
  ] },
  // dash 7.2 charge: the shoulder-mass rolls the corridor under a dust
  // billow (wind aimed down the dash) and arrives as thrown earth whose
  // clods lie = the skid marks.
  the_charge: { cues: [
    { id: 'dust.kick', scale: 0.9 },
    { id: 'dust.billow', at: 0.05, scale: 0.9 },
    { id: 'dust.slam', atFar: true, at: 0.35, scale: 1.0 },
  ] },
  // nova 3.4 taunt+guard: the rise pushes off the ground, then the plant-
  // down — two forepaws slamming, clods and flecks writing where it stood.
  stand_tall: { cues: [
    { id: 'dust.kick', scale: 0.7 },
    { id: 'dust.slam', at: 0.35, scale: 1.3 },
  ] },

  // -------------------------------------------------------------- GREAT OWL
  // dash 8.0: down shed at the launch flare, the strike stamps the ground
  // at the far end, and the brake flare loosens feathers that settle late.
  talon_stoop: { cues: [
    { id: 'petarts.feathers', scale: 0.6 },
    { id: 'dust.slam', atFar: true, at: 0.3, scale: 0.7 },
    { id: 'petarts.feathers', atFar: true, at: 0.45, scale: 0.9 },
  ] },
  // pulse_nova ×2, radius 2.2, chill: each pulse is one wingbeat.
  hushing_wing: { cues: [{ id: 'petarts.wingbeat', scale: 1.0 }] },
  // command: feather by feather — two loosings, the second smaller.
  preen: { cues: [
    { id: 'petarts.feathers', at: 0.1, scale: 0.8 },
    { id: 'petarts.feathers', at: 0.45, scale: 0.5 },
  ] },
  // field 2.6 (~4.5 s): snow inside the radius re-spoken every 2.2 s, and
  // the hush at the wing root once.
  the_white_hush: { cues: [
    { id: 'petarts.snowfall', scale: 1.0, every: 2.2 },
    { id: 'frost.fog', at: 0.2, scale: 0.5, radiusK: 0.5 },
  ] },

  // ------------------------------------------------------------------ ADDER
  // blast (the spit's landing): the dose bursts and the beads well down —
  // the fang-pair stamp is painted; the library gives the stain-pair.
  venom_spit: { cues: [
    { id: 'venom.burst', scale: 0.55 },
    { id: 'venom.drip', at: 0.3, scale: 0.6 },
  ] },
  // dash 5.2 venom: the coil lets go (a kick at the start), venom spits at
  // the arrival.
  coiled_strike: { cues: [
    { id: 'dust.kick', scale: 0.5 },
    { id: 'venom.burst', atFar: true, at: 0.25, scale: 0.6 },
  ] },
  // command: the old coat slides off backward and lies; the quiet is the point.
  shed_skin: { cues: [{ id: 'petarts.slough', scale: 1.0 }] },
  // arc 1.7 vs venom: the long fang drives down — envenom at weight (the
  // veins crawl, the pool wells) and a second dose finds the marrow.
  the_long_fang: { cues: [
    { id: 'petarts.envenom', scale: 1.5 },
    { id: 'petarts.envenom', at: 0.5, scale: 0.6 },
  ] },

  // ----------------------------------------------------------------- WEAVER
  // command: the wrap climbs, tightens, and two anchors lie pale.
  pale_silk: { cues: [{ id: 'petarts.silk', scale: 1.0 }] },
  // field 2.4 (~4.5 s): the weave lays itself and reports every 2.5 s.
  the_venom_lattice: { cues: [{ id: 'petarts.lattice', scale: 1.0, every: 2.5 }] },

  // --------------------------------------------------------------- BASILISK
  // nova 2.1 knockback dmg 6: the tail writes its circle in the dirt — an
  // earth slam whose clods fly tangent and lie as the furrow arc.
  tail_sweep: { cues: [{ id: 'dust.slam', scale: 1.3 }] },
  // blast (the rot's landing): the clinging rope — the sac bursts into
  // tendrils and beads, and the pool it leaves keeps bubbling.
  mire_spit: { cues: [
    { id: 'venom.burst', scale: 0.7 },
    { id: 'venom.pool', at: 0.3, scale: 0.6 },
  ] },
  // command: the plates rise out of the ground (dust stirs at the word),
  // then SEAT with an earth slam; standing grit outlasts it.
  graven_mantle: { cues: [
    { id: 'dust.kick', scale: 0.5 },
    { id: 'dust.slam', at: 0.55, scale: 0.9 },
  ] },
  // field 2.2 (8 s): the fen moves in — the rot sheet, standing-water haze
  // above it, and blisters popping (the cloud's bubbles), each every 2.5 s.
  the_drowning_mire: { cues: [
    { id: 'venom.pool', scale: 1.2, every: 2.5 },
    { id: 'water.mist', at: 0.3, scale: 0.6, every: 2.5, radiusK: 0.7 },
    { id: 'venom.cloud', at: 1.0, scale: 0.5, every: 2.5, radiusK: 0.6 },
  ] },
  // arc 4 (the short 300 ms wire): the country goes grey along the gaze —
  // a dust billow driven down the facing, and chips standing up at the
  // basilisk's feet a beat later to settle.
  the_graven_gaze: { cues: [
    { id: 'dust.billow', scale: 0.8 },
    { id: 'dust.slam', at: 0.3, scale: 0.5 },
  ] },
};
