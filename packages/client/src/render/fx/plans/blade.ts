/**
 * BLADE — ability plans (particles v6 phase 5), the sword-secret roster
 * (fxSigsBlade.ts: the blade twenty, the ten crowns' sword arts, the
 * onehand breath wave). One curated plan per ability id, cues into the
 * effect library; roster-only effects live in BLADE_EFFECTS and register
 * through the library index.
 *
 * THE STEEL HAS NO MATERIAL: the library speaks fire, frost, storm, dust,
 * arcane, shadow, blood, venom, water, smoke — never the edge itself. A
 * cut's voice here is what the edge does to the world (blood, dust,
 * scorch, rime) plus two roster-only steel effects for what only the
 * edge can say:
 *
 *   blade.glint   THE SHARPENING SHOWER — an aimed fan of steel glints
 *                 and filings off the edge, a white bite-flash at the
 *                 point, filings that land and prick the dirt. The
 *                 cut's own voice, sized by the cut.
 *   blade.mirror  THE MIRROR-FLASH — an unaimed white negative flash
 *                 that collapses, a chime ring on the ground, a rim of
 *                 glints thrown on true height that wink where they
 *                 land. A bell, a stamp, a word read aloud.
 *
 * Wire kinds (from the server): melee_arc → arc (300 ms), flurry → three
 * arc beats, nova → nova, dash_strike → dash (near = departure, far =
 * arrival), chain_zap → one bolt per hop (far = the struck), ground_aoe →
 * blast after its telegraph, projectile_fan → blast at the hit (radius
 * 0.55), beam → beam per beat, self_buff → buff. Channels arrive one
 * wire cast per beat, so their plans are light and speak per beat.
 * `every` only re-speaks while the wire fx lives (≤ 0.8 s) — standing
 * acts are written with `at` delays instead.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { BurstOpts } from '../../particles.js';
import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';

// ---------------------------------------------------------------------------
// The steel palette — the STEEL style family's five: white heart, bright
// steel, worn steel, dark steel, and the hot spark the edge throws.
// ---------------------------------------------------------------------------

const HEART = '#ffffff';
const BRIGHT = '#f4f2ec';
const STEEL = '#d8d4cc';
const WORN = '#a8a49c';
const DARK = '#6a6862';
const SPARK_HOT = '#fff3c4';
const SPARK = '#ffd98a';

const STEEL_GLOW = '244, 242, 236';

/** A glint's life: white, steel, worn, gone — four flat bands. */
const RAMP_GLINT = rampOf({ stops: [HEART, BRIGHT, STEEL, WORN], at: [0, 0.25, 0.6, 0.9], steps: 4 });
/** A filing: born hot off the edge, cooling to steel, lying dark. */
const RAMP_FILING = rampOf({ stops: [SPARK_HOT, SPARK, STEEL, WORN, DARK], at: [0, 0.2, 0.45, 0.75, 0.95], steps: 6 });
/** The mirror flash: white that shows steel at its rim as it dies. */
const RAMP_FLASH = rampOf({ stops: [HEART, BRIGHT, STEEL], at: [0, 0.55, 0.85] });

const FLARE = curveOf('flare');
const HOLD = curveOf('hold');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const BLOOM = curveOf('bloom');
/** A lying grain: full until the last fifth. */
const SETTLE_A = curveOf([0, 1, 0.8, 1, 1, 0]);

/** The bite: a white flare at the point, gone in a fifth of a second. */
const BITE: BurstOpts = {
  shape: 'blob', speed: 0.3, life: 0.24, lifeVar: 0.15, size: 0.44, sizeVar: 0.2, gravity: 0,
  z: 0.45, layer: 'world', shadow: 0, ramp: RAMP_FLASH, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: HEART, coreK: 0.5,
};

/** Steel glints: the sharpening shower, fast fines that wink out. */
const GLINT: BurstOpts = {
  shape: 'glint', speed: 2.2, speedVar: 0.5, life: 0.38, lifeVar: 0.35, size: 0.06, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 0.9, zg: 5, land: 'die', layer: 'world', shadow: 0, flicker: 0.6,
  ramp: RAMP_GLINT, sizeCurve: HOLD, alphaCurve: FADE_OUT,
};

/** Filings: streaks off the edge on true height that land and prick the dirt. */
const FILING: BurstOpts = {
  shape: 'streak', align: true, speed: 2.8, speedVar: 0.5, life: 0.5, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 0.5, vz: 1.6, zg: 8, land: 'die', layer: 'world', shadow: 0, flicker: 0.4,
  trail: 6, trailColor: WORN, ramp: RAMP_FILING, sizeCurve: HOLD, alphaCurve: FADE_LATE,
  mark: 'fleck', markLife: 2.2,
};

/** Shavings: the heroes — curled steel thrown farther, bouncing, lying bright for a while. */
const SHAVING: BurstOpts = {
  shape: 'shard', speed: 1.6, speedVar: 0.45, life: 2.4, lifeVar: 0.3, size: 0.075, sizeVar: 0.25,
  gravity: 0, spin: 11, z: 0.5, vz: 2.2, zg: 8, land: 'bounce', bounce: 0.35, layer: 'world',
  ramp: rampOf({ stops: [BRIGHT, STEEL, WORN, DARK], at: [0, 0.3, 0.7, 0.92], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 4,
};

/** The chime: a ground ring that rings out and thins. */
const CHIME: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.42, lifeVar: 0.05, size: 0.4, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [HEART, BRIGHT, STEEL, WORN], at: [0, 0.35, 0.7, 0.9] }),
  sizeCurve: curveOf([0, 0.3, 0.5, 2.2, 1, 2.8]), alphaCurve: curveOf([0, 1, 0.5, 0.7, 1, 0]),
};

/** The mirror: a white disc at chest height that pops and collapses — the negative moment. */
const MIRROR: BurstOpts = {
  shape: 'blob', speed: 0.1, life: 0.3, lifeVar: 0.1, size: 0.7, sizeVar: 0.1, gravity: 0,
  z: 0.6, layer: 'world', shadow: 0, ramp: RAMP_FLASH, sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: HEART, coreK: 0.6,
};

/** Rim glints thrown up off the chime on true height, winking where they land. */
const RIM_GLINT: BurstOpts = {
  shape: 'glint', speed: 0.9, speedVar: 0.5, life: 0.7, lifeVar: 0.3, size: 0.06, sizeVar: 0.3,
  gravity: 0, z: 0.1, vz: 2.4, zg: 7, land: 'die', layer: 'world', shadow: 0, flicker: 0.7,
  ramp: RAMP_GLINT, sizeCurve: BLOOM, alphaCurve: FADE_LATE, mark: 'fleck', markLife: 1.6,
};

/** A steel dust: the fines that hang a breath where the flash was. */
const STEEL_DUST: BurstOpts = {
  shape: 'mote', speed: 0.3, speedVar: 0.5, life: 0.6, lifeVar: 0.3, size: 0.045, sizeVar: 0.3,
  gravity: 0, z: 0.55, vz: 0.2, zg: 1.5, layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_GLINT, sizeCurve: HOLD, alphaCurve: curveOf('mist'),
};

/**
 * blade.glint — THE SHARPENING SHOWER. Aimed down params.dir: the bite
 * flashes white at the point, a fan of glints and filings sprays off
 * the edge on true height, shavings fly farthest and lie, filings prick
 * the dirt. Anticipation is the bite; impact the shower; aftermath the
 * shavings lying bright on the ground.
 */
const bladeGlint: EffectDef = {
  id: 'blade.glint',
  name: 'Blade — glint',
  story: 'the edge bites white at the point → a fan of steel glints and hot filings sprays down the aim on true height → curled shavings fly farthest, bounce, and lie bright → filings prick the dirt → a steel dust hangs one breath',
  layers: [
    { kind: 'burst', name: 'bite', recipe: recipe([HEART, BRIGHT], BITE), count: 1, tier: 'body' },
    { kind: 'burst', name: 'glint fan', recipe: recipe([HEART, BRIGHT, STEEL], GLINT), count: 14, tier: 'fine', arrange: 'cone', spread: 0.7, along: 0.3 },
    { kind: 'burst', name: 'filings', recipe: recipe([SPARK_HOT, SPARK, STEEL], FILING), count: 9, tier: 'body', arrange: 'cone', spread: 0.55, along: 0.3 },
    { kind: 'burst', name: 'shavings', recipe: recipe([BRIGHT, STEEL], SHAVING), count: 3, tier: 'hero', arrange: 'cone', spread: 0.6, along: 0.3 },
    { kind: 'burst', name: 'second scrape', recipe: recipe([BRIGHT, STEEL], { ...GLINT, speed: 1.6, life: 0.3 }), count: 6, tier: 'fine', arrange: 'cone', spread: 0.9, along: 0.3, at: 0.07 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 8, tier: 'fine', arrange: 'cone', spread: 0.8, along: 0.35, at: 0.1 },
    { kind: 'burst', name: 'bite glints', recipe: recipe([HEART, SPARK_HOT], { ...GLINT, speed: 0.8, life: 0.25, size: 0.07 }), count: 5, tier: 'body', arrange: 'disc', radius: 0.12, dz: 0.45 },
    { kind: 'glow', name: 'bite light', r: 0.9, rgb: STEEL_GLOW, a: 0.3, dur: 0.2, release: 0.14, dz: 0.4 },
  ],
};

/**
 * blade.mirror — THE MIRROR-FLASH. Unaimed: a white disc pops at chest
 * height and collapses, a chime ring rings out on the ground, glints
 * are thrown up off the rim on true height and wink where they land, a
 * steel dust hangs where the disc was. The bell, the stamp, the word
 * read aloud — every ability that rings rather than cuts.
 */
const bladeMirror: EffectDef = {
  id: 'blade.mirror',
  name: 'Blade — mirror',
  story: 'a white disc pops at chest height and collapses → the chime rings out flat on the ground → glints leap off the rim on true height and wink where they land → a steel dust hangs where the flash was → the light lets go',
  layers: [
    { kind: 'burst', name: 'mirror', recipe: recipe([HEART, BRIGHT], MIRROR), count: 1, tier: 'body' },
    { kind: 'burst', name: 'chime', recipe: recipe([HEART, BRIGHT], CHIME), count: 1, tier: 'body' },
    { kind: 'burst', name: 'rim glints', recipe: recipe([HEART, BRIGHT, STEEL], RIM_GLINT), count: 12, tier: 'body', arrange: 'rim', radiusK: 0.55, outward: 0.8 },
    { kind: 'burst', name: 'inner glints', recipe: recipe([BRIGHT, STEEL], { ...RIM_GLINT, vz: 3.0, life: 0.55 }), count: 8, tier: 'fine', arrange: 'disc', radius: 0.35, at: 0.05 },
    { kind: 'burst', name: 'hero glints', recipe: recipe([HEART, SPARK_HOT], { ...RIM_GLINT, size: 0.085, life: 0.9, vz: 2.8, markLife: 3.2 }), count: 3, tier: 'hero', arrange: 'rim', radiusK: 0.4, outward: 1.1 },
    { kind: 'burst', name: 'steel dust', recipe: recipe([STEEL, WORN], STEEL_DUST), count: 10, tier: 'fine', arrange: 'disc', radius: 0.4, at: 0.12 },
    { kind: 'glow', name: 'flash', r: 1.1, rgb: STEEL_GLOW, a: 0.3, dur: 0.24, release: 0.16, dz: 0.5 },
  ],
};

export const BLADE_EFFECTS: EffectDef[] = [bladeGlint, bladeMirror];

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const BLADE_PLANS: Record<string, AbilityPlan> = {
  // --- THE ARMORY REMEMBERS: the blade twenty ------------------------------

  // The split round: the edge bites (steel), the ground splits and throws its
  // clods (the earthbreaker slam is the chop's weight), and what it hit bleeds.
  sundering_chop: { cues: [
    { id: 'blade.glint', scale: 0.8 },
    { id: 'dust.slam', at: 0.05, scale: 1.15 },
    { id: 'blood.hit', at: 0.08, scale: 0.7 },
  ] },
  // The growing whip: the rake opens the wound, the barbs it leaves keep
  // weeping in pulses (the bleed), a breath of leaf-litter kicked off the swing.
  thorn_lash: { cues: [
    { id: 'blood.hit', at: 0.05, scale: 0.8 },
    { id: 'dust.kick', scale: 0.6 },
    { id: 'blood.spray', at: 0.3, scale: 0.6 },
  ] },
  // The three bells: each of the three arc beats is one chime — a small
  // mirror-flash at the point, and a pinprick of blood; light, since it rings thrice.
  quicksilver: { cues: [
    { id: 'blade.mirror', scale: 0.55 },
    { id: 'blood.hit', at: 0.05, scale: 0.35 },
  ] },
  // The low tide: the surge leaves as a jet down the lane, cold drags at the
  // cut where it arrives, and the foam returns — the splash at the far end.
  riptide: { cues: [
    { id: 'water.jet', scale: 0.8 },
    { id: 'frost.breath', atFar: true, at: 0.25, scale: 0.6 },
    { id: 'water.splash', atFar: true, at: 0.3, scale: 0.9 },
  ] },
  // The blown coals: the edge bites, the crescent is a fan of blown flame down
  // the aim, and the rank of coals lies on the ground dying one by one.
  cinder_arc: { cues: [
    { id: 'blade.glint', scale: 0.5 },
    { id: 'fire.fan', scale: 1.0 },
    { id: 'fire.floor', at: 0.35, scale: 0.5 },
  ] },
  // The slow cut: the seam is scored (steel) and only THEN the cold arrives —
  // the breath delayed to read as slow — and lies on the line as fog.
  winters_edge: { cues: [
    { id: 'blade.glint', scale: 0.6 },
    { id: 'frost.breath', at: 0.15, scale: 0.9 },
    { id: 'frost.fog', at: 0.8, scale: 0.5 },
  ] },
  // The tithe sheaf: the harvest-wide sweep throws chaff (the billow), what it
  // scythes bleeds, and the sheaf slumps late in a low breath of dust.
  reapers_arc: { cues: [
    { id: 'dust.billow', scale: 1.0 },
    { id: 'blood.hit', at: 0.05, scale: 0.9 },
    { id: 'dust.kick', at: 0.6, scale: 0.6 },
  ] },
  // The wheel of cuts: eight edges flash as one (the mirror, unaimed), the
  // cuts weep in pulses, and the wheel of stains stays printed on the ground.
  red_harvest: { cues: [
    { id: 'blade.mirror', scale: 1.1 },
    { id: 'blood.spray', at: 0.12, scale: 1.0 },
    { id: 'blood.pool', at: 0.6, scale: 0.7 },
  ] },
  // The blade of lightning: one bolt per hop, spanning caster to the struck
  // (the arc re-forming on its beat), the point sticking in with a discharge
  // and a steel bite at the far end.
  storm_brand: { cues: [
    { id: 'storm.arc', scale: 1.0 },
    { id: 'blade.glint', atFar: true, scale: 0.5 },
    { id: 'storm.nova', atFar: true, at: 0.08, scale: 0.6 },
  ] },
  // The proclamation: the scroll unrolls (a ward wakes), the circle closes
  // and the words are the shockwave — the bloom's ring races out and the
  // court is thrown from it in a slam of dust.
  kings_decree: { cues: [
    { id: 'arcane.sigil', scale: 0.7 },
    { id: 'arcane.bloom', at: 0.3, scale: 1.3 },
    { id: 'dust.slam', at: 0.35, scale: 1.1 },
  ] },
  // The sun wheel: gold light races out as the wheel spins up, dawn happens
  // here as a fire burst, and curved scorch keeps the wheel on the ground.
  sunburst: { cues: [
    { id: 'arcane.bloom', scale: 1.0 },
    { id: 'fire.burst', at: 0.05, scale: 1.3 },
    { id: 'fire.floor', at: 0.5, scale: 0.6 },
  ] },
  // The kept appointment: the piece of sky lands — the crater slams, the
  // fragment shatters into glass that glints where it lies, the burn stays
  // on the floor, and displaced night shimmers up off it late.
  starfall_strike: { cues: [
    { id: 'dust.slam', scale: 1.2 },
    { id: 'arcane.shatter', at: 0.02, scale: 1.3 },
    { id: 'fire.floor', at: 0.4, scale: 0.6 },
    { id: 'smoke.wisp', at: 0.8, scale: 0.6 },
  ] },
  // The counted oath: a halo stands on the body for the term, and three of
  // the tally's clicks ring as small mirror-flashes across the six seconds.
  vow_unbroken: { cues: [
    { id: 'arcane.orbit', scale: 0.7 },
    { id: 'blade.mirror', scale: 0.45 },
    { id: 'blade.mirror', at: 2.0, scale: 0.45 },
    { id: 'blade.mirror', at: 4.0, scale: 0.45 },
  ] },

  // --- The ten crowns' sword arts --------------------------------------------

  // The kelp hands: the sweep is a wave (the jet), the hands DRAG DOWN — the
  // grasp's inward pull and clench — and the chill lies after as fog.
  drag_under: { cues: [
    { id: 'water.jet', scale: 0.9 },
    { id: 'shadow.grasp', at: 0.2, scale: 0.7 },
    { id: 'frost.fog', at: 0.6, scale: 0.5 },
  ] },
  // The echo before the word: the circle goes white ONCE (the mirror-flash is
  // this ability's exact shape), the light rings out, and the word lands
  // late with the real thump.
  spoken_light: { cues: [
    { id: 'blade.mirror', scale: 1.4 },
    { id: 'arcane.bloom', at: 0.05, scale: 0.9 },
    { id: 'dust.kick', at: 0.45, scale: 0.5 },
  ] },
  // The cooling cake: the mouthful lands (a slab's slam and a fire burst),
  // keeps burning as a standing plume, and smokes as it cools.
  slagfall: { cues: [
    { id: 'dust.slam', scale: 0.7 },
    { id: 'fire.burst', scale: 1.2 },
    { id: 'fire.plume', at: 0.3, scale: 0.8 },
    { id: 'smoke.wisp', at: 1.0, scale: 0.6 },
  ] },
  // The seam and the drop: per hop, the bolt drops VERTICALLY onto the mark
  // (the strike's sky-to-ground stroke at the far end) with only a thin
  // visiting line between.
  sky_splits: { cues: [
    { id: 'storm.strike', atFar: true, scale: 0.9 },
    { id: 'storm.arc', scale: 0.5 },
  ] },
  // The sown line: the dash furrows the line behind it (the verse written in
  // the dirt), the bite at the arrival is an aimed gob, and the venom stains.
  green_verse: { cues: [
    { id: 'dust.gouge', scale: 0.7 },
    { id: 'venom.spit', atFar: true, at: 0.25, scale: 0.8 },
    { id: 'venom.pool', atFar: true, at: 0.5, scale: 0.5 },
  ] },
  // The raised dais: the ward wakes underfoot (the dais), light races out,
  // everyone else is thrown down the stairs (the slam), and burns.
  sun_court: { cues: [
    { id: 'arcane.sigil', scale: 1.1 },
    { id: 'arcane.bloom', at: 0.1, scale: 0.8 },
    { id: 'dust.slam', at: 0.15, scale: 1.0 },
    { id: 'fire.floor', at: 0.3, scale: 0.7 },
  ] },
  // The hung dust: the cold arrives and a fog HANGS still around the body;
  // when the stillness ends everything drops at once — a late kick of dust.
  still_air: { cues: [
    { id: 'frost.nova', scale: 0.6 },
    { id: 'frost.fog', scale: 1.1 },
    { id: 'dust.kick', at: 1.6, scale: 0.5 },
  ] },

  // --- THE BREATH BETWEEN RUNGS: the onehand breath wave -------------------

  // The kindled wake: the edge bites, the cut is a fan of drawn fire, and
  // the coals the swing shed lie glowing in the grass after.
  ember_edge: { cues: [
    { id: 'blade.glint', scale: 0.5 },
    { id: 'fire.fan', scale: 1.1 },
    { id: 'fire.floor', at: 0.4, scale: 0.55 },
  ] },
  // The grindstone round: one beat of three — steel-on-stone sparks off the
  // rim (the sharpening shower IS this) and grit that lands. Work, not a blast.
  millwork: { cues: [
    { id: 'blade.glint', scale: 0.7 },
    { id: 'dust.kick', at: 0.1, scale: 0.5 },
  ] },
  // The sky's seam: at the hit the levin re-lights top-down onto the wound
  // (the strike) and the standing charge crackles itself out (a small nova).
  levinstroke: { cues: [
    { id: 'storm.strike', scale: 0.9 },
    { id: 'storm.nova', at: 0.3, scale: 0.5 },
  ] },
  // The ruled line: one beat of the account — the entry is taken from the
  // debtor at the far end, and the due is drawn home into the hand.
  red_ledger: { cues: [
    { id: 'blood.hit', atFar: true, at: 0.05, scale: 0.6 },
    { id: 'blood.drink', scale: 0.8 },
  ] },
  // The nail of winter: the spike bites with the white crack, hoarfrost
  // claws out as standing ice teeth, and cold fog pools and sinks after.
  cold_iron: { cues: [
    { id: 'frost.nova', scale: 0.8 },
    { id: 'frost.shards', scale: 1.2 },
    { id: 'frost.fog', at: 0.7, scale: 0.6 },
  ] },
  // The window fern: one beat of four — new arms of frost stand out of the
  // ring and the rime they write stays; a thin fog behind them. Light per beat.
  frostwork: { cues: [
    { id: 'frost.shards', scale: 0.55 },
    { id: 'frost.fog', at: 0.3, scale: 0.4 },
  ] },
  // The door left open: the posts stand at the departure (a ward), the bright
  // afterline runs to the arrival, and you arrive like morning — the bloom.
  first_light: { cues: [
    { id: 'arcane.sigil', scale: 0.6 },
    { id: 'arcane.beam', scale: 1.0 },
    { id: 'arcane.bloom', atFar: true, at: 0.15, scale: 1.1 },
  ] },
  // The aurora banner: one hop of the circuit — the jag to the struck, a
  // churning charge over the landing (the sky is part of the circuit), a
  // small discharge at the foot.
  live_iron: { cues: [
    { id: 'storm.arc', scale: 0.8 },
    { id: 'storm.nova', atFar: true, at: 0.05, scale: 0.4 },
    { id: 'storm.cloud', atFar: true, at: 0.1, scale: 0.5 },
  ] },
  // The lamps go out: the dark ARRIVES (the burst), lamp-flames stand on the
  // ring and gutter out one by one (the wisps), dusk lowers like a curtain
  // (the veil), and a smoke stub climbs where the last light stood.
  gloomfall: { cues: [
    { id: 'shadow.burst', scale: 1.4 },
    { id: 'shadow.wisps', at: 0.1, scale: 0.9 },
    { id: 'shadow.veil', at: 0.5, scale: 0.8 },
    { id: 'smoke.wisp', at: 1.3, scale: 0.5 },
  ] },
  // The noon bell: one fall of four — the light slams and rings the ring
  // (the bloom's racing ring), and the bleached ring stands a beat (the sigil).
  noonfall: { cues: [
    { id: 'arcane.bloom', scale: 0.8 },
    { id: 'arcane.sigil', at: 0.1, scale: 0.5 },
  ] },
};
