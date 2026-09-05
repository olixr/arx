/**
 * GOLEMS — ability plans (particles v6 phase 5): THE EARTH STANDS UP.
 *
 * Curated by the golems' master pass: one plan per ability id in
 * fxSigsGolems.ts, cued into the effect library, plus the two effects
 * the library could not speak — the golems' MASONRY (slabs that stand
 * up out of the ground and sink to a rubble cairn) and the fire
 * golem's SLAG (a melt that cools into one glass-glazed coin). A
 * golem's art is geology happening to you: every plan lands heavy,
 * and the ground keeps the receipt longest of anyone.
 *
 * Wire facts: ground_aoe → `blast` at the fuse (780 ms, r = the def);
 * projectile → `blast` at the landing (r = splash); nova → `nova`;
 * dash_strike → `dash` x→x2 (radius 0: point effects only, arrivals
 * `atFar`). The painted slabs, the frozen pane and the landed
 * hillstone are drawing and stay; what lives here is the matter.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';
import { curveOf, rampOf } from '../curves.js';
import type { BurstOpts } from '../../particles.js';
import { SAND, PALE as DUST_PALE, LOAM, SHADE, DUST_GLOW } from '../library/dust.js';
import { HEART, BRIGHT, FLAME, EMBER, COAL, DEEP as FIRE_DEEP, SOOT, SMOKE, FIRE_GLOW } from '../library/fire.js';

const HOLD = curveOf('hold');
const SWELL = curveOf('swell');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const SMOKE_A = curveOf('smoke');
/** A lying grain: holds, and is taken back by the turf only at the end. */
const LIE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

// ---------------------------------------------------------------------------
// golems.masonry — THE QUARRY STANDS UP
// ---------------------------------------------------------------------------

const LIT = '#d8ccb0';
const SHELL = '#9a8f72';
const STONE = '#8a8164';
const STONE_DEEP = '#544a38';
const STONE_DARK = '#3e3830';

/** A slab's crown: lit fresh-broken stone, dulling to shade as it sinks. */
const RAMP_SLAB = rampOf({ stops: [LIT, SHELL, STONE, STONE_DEEP], at: [0, 0.3, 0.7, 0.95], steps: 5 });
const RAMP_RUBBLE = rampOf({ stops: [STONE, STONE_DEEP, STONE_DARK], at: [0, 0.6, 0.95], steps: 4 });
const RAMP_DUST = rampOf({ stops: [SHADE, LOAM, DUST_PALE, '#c9a978'], at: [0, 0.3, 0.62, 1], steps: 6 });
const RAMP_FINE = rampOf({ stops: ['#e2c384', SAND, DUST_PALE, LOAM], at: [0, 0.3, 0.65, 1], steps: 5 });

/** The shockfront of a slam on the floor. */
const SHOCKFRONT: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.5, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: ['#e2c384', DUST_PALE, LOAM], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.7, 0.5, 2.6, 1, 3.3]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** A SLAB: a big stone that heaves up out of the ground, stands, and sinks to a knuckle. */
const SLAB: BurstOpts = {
  shape: 'square', speed: 0.04, speedVar: 0, life: 6.5, lifeVar: 0.1, size: 0.3, sizeVar: 0.2,
  gravity: 0, z: 0, vz: 1.5, zg: 2.4, land: 'settle', layer: 'world', shadow: 0.9, spin: 0,
  ramp: RAMP_SLAB, sizeCurve: curveOf([0, 0.5, 0.12, 1, 0.8, 1, 1, 0.7]), alphaCurve: curveOf([0, 1, 0.9, 1, 1, 0]),
  core: LIT, coreK: 0.35,
};

/** The dust curtain each slab arrives with. */
const CURTAIN: BurstOpts = {
  shape: 'blob', speed: 0.5, speedVar: 0.5, life: 1.3, lifeVar: 0.3, size: 0.36, sizeVar: 0.25,
  gravity: 0, drag: 1.6, z: 0.05, vz: 0.9, zg: 1.3, mass: 0.4, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_DUST, sizeCurve: SWELL, alphaCurve: SMOKE_A, wave: 'noise', waveHz: 1.3, waveAmp: 0.3, spin: 0.4,
};

/** Grit thrown off the heave. */
const GRIT: BurstOpts = {
  shape: 'square', speed: 1.1, speedVar: 0.6, life: 1.8, lifeVar: 0.35, size: 0.042, sizeVar: 0.3,
  gravity: 0, drag: 0.4, vz: 2.2, zg: 7.5, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_FINE, sizeCurve: HOLD, alphaCurve: LIE_A,
};

/** Rubble: the cairn — clods that bounce once and lie eight seconds, flecking the dirt. */
const RUBBLE: BurstOpts = {
  shape: 'shard', speed: 0.35, speedVar: 0.5, life: 8, lifeVar: 0.12, size: 0.075, sizeVar: 0.3,
  gravity: 0, spin: 7, vz: 1.1, zg: 8, land: 'bounce', bounce: 0.3, layer: 'world',
  ramp: RAMP_RUBBLE, sizeCurve: HOLD, alphaCurve: LIE_A, mark: 'fleck', markLife: 8,
};

/** The crack star: dark fractures running out of the socket, lying. */
const CRACK: BurstOpts = {
  shape: 'streak', speed: 0.1, speedVar: 0.3, life: 8, lifeVar: 0.1, size: 0.075, sizeVar: 0.3,
  gravity: 0, layer: 'ground', shadow: 0, ramp: rampOf({ stops: [STONE_DARK, '#2c2823'], at: [0, 0.8] }),
  sizeCurve: HOLD, alphaCurve: curveOf([0, 0, 0.04, 0.85, 0.85, 0.85, 1, 0]),
};

/** The settling veil. */
const VEIL: BurstOpts = {
  shape: 'blob', speed: 0.1, speedVar: 0.5, life: 2.4, lifeVar: 0.3, size: 0.36, sizeVar: 0.25,
  gravity: 0, drag: 0.8, z: 0.05, vz: 0.2, zg: 0.3, mass: 0.3, land: 'settle', layer: 'world', shadow: 0,
  ramp: rampOf({ stops: [LOAM, DUST_PALE, '#c9a978'], at: [0, 0.45, 1], steps: 4 }), sizeCurve: SWELL,
  alphaCurve: curveOf([0, 0.2, 0.3, 0.55, 0.65, 0.5, 1, 0]), wave: 'noise', waveHz: 0.8, waveAmp: 0.3, spin: 0.3,
};

export const golemsMasonry: EffectDef = {
  id: 'golems.masonry',
  name: 'Golems — masonry',
  story: 'the floor shocks and a crack star runs out of the socket → raw slabs heave OUT of the rim in sequence, each with its own dust curtain and a lit crown of fresh-broken stone, and stand → grit rains back → the slabs sink to a knuckle and a rubble cairn lies at each stump eight seconds → a pale veil settles',
  layers: [
    { kind: 'field', name: 'heave', field: { kind: 'lift', radius: 1.2, strength: 1.5, dur: 0.5, height: 0.6, attack: 0.02, release: 0.2 }, radiusK: 1.1 },
    { kind: 'burst', name: 'shockfront', recipe: recipe(['#e2c384', SAND], SHOCKFRONT), count: 1, tier: 'hero' },
    { kind: 'burst', name: 'crack star', recipe: recipe([STONE_DARK, '#2c2823'], CRACK), count: 4, tier: 'hero', arrange: 'rim', radius: 0.12, outward: 0.1, at: 0.04 },
    { kind: 'burst', name: 'slabs I', recipe: recipe([LIT, SHELL], SLAB), count: 2, tier: 'hero', arrange: 'ring', radius: 0.85, radiusK: 0.85 },
    { kind: 'burst', name: 'slabs II', recipe: recipe([LIT, SHELL], SLAB), count: 2, tier: 'hero', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.1 },
    { kind: 'burst', name: 'slabs III', recipe: recipe([SHELL, STONE], { ...SLAB, size: 0.26 }), count: 1, tier: 'hero', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.2 },
    { kind: 'burst', name: 'curtains', recipe: recipe([LOAM, SHADE, DUST_PALE], CURTAIN), count: 8, tier: 'body', arrange: 'ring', radius: 0.85, radiusK: 0.85 },
    { kind: 'burst', name: 'curtains II', recipe: recipe([LOAM, DUST_PALE], CURTAIN), count: 6, tier: 'body', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.12 },
    { kind: 'burst', name: 'grit', recipe: recipe([SAND, '#e2c384', DUST_PALE], GRIT), count: 18, tier: 'fine', arrange: 'ring', radius: 0.8, radiusK: 0.8 },
    { kind: 'burst', name: 'rubble', recipe: recipe([STONE, STONE_DEEP], RUBBLE), count: 10, tier: 'hero', arrange: 'ring', radius: 0.85, radiusK: 0.85, at: 0.15 },
    { kind: 'emit', name: 'veil', arrange: 'disc', radius: 0.7, radiusK: 0.7, at: 0.5, rate: 10, dur: 1.6, attack: 0.2, release: 0.7, tier: 'body',
      pops: [{ colors: [DUST_PALE, '#c9a978'], opts: VEIL }] },
    { kind: 'glow', name: 'ground light', r: 1.3, rgb: DUST_GLOW, a: 0.1, dur: 0.4, attack: 0.02, release: 0.3, radiusK: 1 },
  ],
};

// ---------------------------------------------------------------------------
// golems.slag — THE GLAZED COIN
// ---------------------------------------------------------------------------

const GLASS_HOT = '#8c3a26';
const GLASS = '#3a2c26';
const GLASS_DARK = '#241a16';
const SPEC = '#ffe9a3';

/** Molten splash: gobbets that fly, splat and char. */
const RAMP_MELT = rampOf({ stops: [HEART, FLAME, EMBER, COAL, GLASS_HOT], at: [0, 0.2, 0.5, 0.8, 1], steps: 5 });
/** The coin: forge-bright cooling in the smith's honest bands to dark glass. */
const RAMP_COIN = rampOf({ stops: [FLAME, EMBER, COAL, GLASS_HOT, GLASS, GLASS_DARK], at: [0, 0.06, 0.16, 0.32, 0.6, 0.92], steps: 8 });
const RAMP_EMBER_WINK = rampOf({ stops: [FLAME, EMBER, COAL, GLASS_DARK], at: [0, 0.3, 0.6, 0.9], steps: 5 });
const RAMP_SMOKE = rampOf({ stops: [SOOT, SMOKE, '#7d7787'], at: [0, 0.45, 0.85], steps: 5 });

const SPLASH: BurstOpts = {
  shape: 'blob', align: true, speed: 1.0, speedVar: 0.5, life: 0.9, lifeVar: 0.25, size: 0.2, sizeVar: 0.3,
  gravity: 0, z: 0.1, vz: 1.5, zg: 6, land: 'splat', layer: 'world', flicker: 0.2,
  ramp: RAMP_MELT, sizeCurve: HOLD, alphaCurve: FADE_LATE, mark: 'char', markLife: 6,
};

const MELT_HEART: BurstOpts = {
  shape: 'blob', speed: 0.4, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.34, sizeVar: 0.3,
  gravity: 0, drag: 2.5, vz: 0.4, zg: -0.1, mass: 0.4, layer: 'world', shadow: 0,
  ramp: RAMP_MELT, sizeCurve: curveOf('dwindle'), alphaCurve: FADE_LATE, core: HEART, coreK: 0.45,
  wave: 'noise', waveHz: 2.0, waveAmp: 0.35,
};

/** THE COIN — one vitrified disc lying on the ground eight seconds. */
const COIN: BurstOpts = {
  shape: 'blob', speed: 0, speedVar: 0, life: 8.5, lifeVar: 0.05, size: 0.6, sizeVar: 0.1, gravity: 0,
  layer: 'ground', shadow: 0, spin: 0.15,
  ramp: RAMP_COIN, sizeCurve: curveOf([0, 0.45, 0.08, 1, 1, 1]), alphaCurve: curveOf([0, 1, 0.88, 1, 1, 0]),
};

/** The specular chip sliding on the glaze. */
const CHIP: BurstOpts = {
  shape: 'glint', speed: 0.12, speedVar: 0.4, life: 0.6, lifeVar: 0.3, size: 0.085, gravity: 0, z: 0.02,
  layer: 'world', shadow: 0, alphaCurve: FADE_OUT, sizeCurve: curveOf('pulse'),
};

/** Embers winking in the glass. */
const WINK: BurstOpts = {
  shape: 'square', speed: 0.03, life: 2.4, lifeVar: 0.4, size: 0.06, sizeVar: 0.3, gravity: 0, z: 0.01,
  layer: 'world', shadow: 0, flicker: 0.7, ramp: RAMP_EMBER_WINK, sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'char', markLife: 4,
};

const SPARK: BurstOpts = {
  shape: 'streak', speed: 2.0, speedVar: 0.6, life: 0.5, size: 0.045, gravity: 0, vz: 2.4, zg: 7,
  land: 'die', layer: 'world', shadow: 0, flicker: 0.5, trail: 7, trailColor: FIRE_DEEP,
};

const SOOT_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.3, speedVar: 0.5, life: 1.8, lifeVar: 0.35, size: 0.24, sizeVar: 0.3,
  gravity: 0, drag: 0.9, vz: 0.5, zg: -0.1, mass: 0.3, layer: 'world', shadow: 0,
  ramp: RAMP_SMOKE, sizeCurve: SWELL, alphaCurve: SMOKE_A, wave: 'noise', waveHz: 1.0, waveAmp: 0.4, spin: 0.5,
};

export const golemsSlag: EffectDef = {
  id: 'golems.slag',
  name: 'Golems — slag',
  story: 'the melt lands: gobbets fly, splat and char, a low molten heart dwindles → the splash cools into ONE glass-glazed coin lying on the ground, forge-bright cooling in hard bands to dark glass → a specular chip slides on the glaze and embers wink in it eight seconds → soot climbs, the ember glow outlives the flame',
  layers: [
    { kind: 'field', name: 'heat', field: { kind: 'lift', radius: 0.8, strength: 1.6, dur: 1.2, height: 1.5, release: 0.4 } },
    { kind: 'burst', name: 'splash', recipe: recipe([HEART, FLAME, EMBER], SPLASH), count: 6, tier: 'hero' },
    { kind: 'burst', name: 'melt heart', recipe: recipe([HEART, BRIGHT, FLAME], MELT_HEART), count: 6, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.04 },
    { kind: 'burst', name: 'sparks', recipe: recipe(['#ffd27a', BRIGHT], SPARK), count: 8, tier: 'fine' },
    { kind: 'burst', name: 'the coin', recipe: recipe([FLAME, EMBER], COIN), count: 1, tier: 'hero', at: 0.1 },
    { kind: 'burst', name: 'embers in the glass', recipe: recipe([EMBER, COAL], WINK), count: 3, tier: 'hero', arrange: 'disc', radius: 0.18, at: 0.3, every: 1.2, times: 4, decay: 0.8 },
    { kind: 'burst', name: 'specular chip', recipe: recipe([SPEC, '#ffffff'], CHIP), count: 1, tier: 'fine', arrange: 'disc', radius: 0.16, at: 0.6, every: 0.4, times: 12 },
    { kind: 'emit', name: 'soot', arrange: 'disc', radius: 0.2, dz: 0.2, at: 0.2, rate: 10, dur: 1.4, attack: 0.1, release: 0.5, tier: 'body',
      pops: [{ colors: [SOOT, SMOKE], opts: SOOT_PUFF }] },
    { kind: 'glow', name: 'glow', r: 1.3, rgb: FIRE_GLOW, a: 0.3, dur: 0.8, attack: 0.02, release: 0.5, flicker: 0.35 },
    { kind: 'glow', name: 'ember glow', r: 0.8, rgb: FIRE_GLOW, a: 0.12, at: 0.8, dur: 3.0, attack: 0.3, release: 1.4, flicker: 0.5 },
  ],
};

export const GOLEMS_EFFECTS: EffectDef[] = [golemsMasonry, golemsSlag];

// ---------------------------------------------------------------------------
// THE PLANS — one per ability id in fxSigsGolems.ts.
// ---------------------------------------------------------------------------

export const GOLEMS_PLANS: Record<string, AbilityPlan> = {
  // THE STONE THAT STAYS (blast r1.2 at the landing): the thrown hill slams
  // down, BOUNCES once (a second, smaller slam), and the masonry — the
  // standing stone in its crack star and the rubble cairn — stays nine seconds.
  hillstone_throw: { cues: [
    { id: 'dust.slam', scale: 1.4 },
    { id: 'golems.masonry', at: 0.08, scale: 0.9, radiusK: 0.5 },
    { id: 'dust.slam', at: 0.32, scale: 0.6 },
  ] },
  // THE QUARRY STANDS UP (blast r2.4): the slam, then the excavation — five
  // slabs heaving out of the rim with their dust curtains, the stump ring of
  // rubble left standing; a rolling cloud drifts off the yard after.
  quarry_ring: { cues: [
    { id: 'dust.slam', scale: 1.5 },
    { id: 'golems.masonry', at: 0.1, scale: 1.7, radiusK: 0.85 },
    { id: 'dust.billow', at: 0.5, scale: 0.9 },
  ] },
  // THE DENT THAT COOLS (blast r2.0): the floor rung like a bell — the biggest
  // slam the golems own, iron's only fire (sparks and a white strike), and at
  // the heart the dent glows forge-orange and cools in hard bands (the coin,
  // small) with a thread of smoke off it.
  anvil_fall: { cues: [
    { id: 'dust.slam', scale: 1.9 },
    { id: 'storm.strike', at: 0.05, scale: 0.7 },
    { id: 'golems.slag', at: 0.15, scale: 0.6 },
    { id: 'smoke.wisp', at: 0.6, scale: 0.5 },
  ] },
  // THE TWO GROOVES (dash): the skid grooves torn along the lane, and the STAMP
  // at the far end — five hundredweight of iron deciding to be stationary —
  // with the spark seam's last crack where it stopped.
  drawn_bolt: { cues: [
    { id: 'dust.gouge', scale: 1.2 },
    { id: 'dust.slam', atFar: true, at: 0.3, scale: 1.2 },
    { id: 'storm.strike', atFar: true, at: 0.3, scale: 0.6 },
  ] },
  // THE GLAZED COIN (blast r1.0 at the landing): honest fire at the wound, then
  // the point of the art — the melt cooling into currency — and its smoke.
  slag_gobbet: { cues: [
    { id: 'fire.burst', scale: 0.9 },
    { id: 'golems.slag', at: 0.2, scale: 1.0 },
    { id: 'smoke.wisp', at: 0.9, scale: 0.5 },
  ] },
  // THE BREATHING GROUND (blast r2.0): the held breath (a smoke thread), then
  // the ring erupts — a true column at the heart and a burning floor to the
  // rim whose ember bed chars the mouths eight seconds.
  vent_ring: { cues: [
    { id: 'smoke.wisp', scale: 0.7 },
    { id: 'fire.pillar', at: 0.2, scale: 1.0 },
    { id: 'fire.floor', at: 0.35, scale: 1.3, radiusK: 1 },
  ] },
  // THE SHELL LETS GO (nova r2.6): the fire golem shows you everything — the
  // biggest fire burst in the bestiary, crust plates flung as rock, and the
  // scorch annulus burning out to the nova's honest edge.
  crust_burst: { cues: [
    { id: 'fire.burst', scale: 1.9 },
    { id: 'dust.slam', at: 0.04, scale: 1.0 },
    { id: 'fire.floor', at: 0.3, scale: 1.1, radiusK: 0.9 },
  ] },
  // THE CALVING STARS (blast r0.55 per shard × 3): deliberately the smallest
  // golem mark — a hoar star of spears snapping out where the shard lands
  // and a breath of fog off it; the rime stays seven seconds.
  calving_volley: { cues: [
    { id: 'frost.shards', scale: 0.55, radiusK: 1.3 },
    { id: 'frost.fog', at: 0.4, scale: 0.4, radiusK: 1.2 },
  ] },
  // THE PANE CLOSES IN (blast r2.2): fog breathes off the closing edge first,
  // the crust and spears stand up round the rim, and where the edges MEET at
  // the middle the white crack of a lake made in half a second.
  winters_floor: { cues: [
    { id: 'frost.fog', scale: 1.2, radiusK: 1.0 },
    { id: 'frost.shards', at: 0.1, scale: 1.3, radiusK: 0.9 },
    { id: 'frost.nova', at: 0.5, scale: 1.1 },
  ] },
};
