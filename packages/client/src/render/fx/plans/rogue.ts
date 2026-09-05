/**
 * ROGUE — ability plans (particles v6 phase 5), the dagger roster
 * (fxSigsRogue.ts: the rogue ten + the three chase knives). One curated
 * plan per ability id, cues into the effect library; roster-only effects
 * live in ROGUE_EFFECTS and register through the library index.
 *
 * A rogue's Art is a beat in the combo, not a setpiece — the plans here
 * run smaller than the sword secrets (0.5–1.1) except the two finishers.
 * The knife's steel speaks through the blade roster's `blade.glint` /
 * `blade.mirror` (one steel voice for every edge); two stories the
 * library cannot tell are authored here:
 *
 *   rogue.bone_cast   THE MARROW READS — the needle splits into bone
 *                     splints that fan open at the wound, hang, clatter
 *                     down and LIE as lots the dead can read; a marrow-
 *                     white ring at the wound; bone dust sifting.
 *   rogue.gravelight  THE FOOTLIGHTS — a low arc of pale-green grave
 *                     flames at the feet, up-light on the body, motes
 *                     reeling INWARD to the lamps, embers that stay in
 *                     the arc when the row dims.
 *
 * Wire kinds: melee_arc → arc; nova → nova; dash_strike → dash (near =
 * departure, far = arrival); chain_zap → one bolt per hop; projectile_fan
 * → blast at the hit (radius 0.55); self_buff → buff (750 ms wire life:
 * standing acts are `at` delays, never `every`).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { BurstOpts, EmitterPop } from '../../particles.js';
import { curveOf, rampOf } from '../curves.js';
import type { EffectDef } from '../effects.js';
import { recipe } from '../effects.js';

// ---------------------------------------------------------------------------
// Palettes — the BONE family's pale five, and the grave-light's green.
// ---------------------------------------------------------------------------

const MARROW = '#fbf7ea';
const BONE = '#e2dcc8';
const OLD_BONE = '#c4b89c';
const TOOTH = '#9c9078';
const GRAVE = '#6e6452';

const LIGHT = '#eafbe0';
const PALE_GREEN = '#cff0c0';
const GREEN = '#9fd494';
const MOSS = '#5f8e62';
const DUSK = '#354a3c';

const GRAVE_GLOW = '190, 236, 180';

const HOLD = curveOf('hold');
const FLARE = curveOf('flare');
const FADE_OUT = curveOf('fadeOut');
const FADE_LATE = curveOf('fadeLate');
const BLOOM = curveOf('bloom');
const MIST = curveOf('mist');
const SETTLE_A = curveOf([0, 1, 0.85, 1, 1, 0]);

// --- bone -------------------------------------------------------------------

/** Bone from marrow-white to old bone as it lies. */
const RAMP_BONE = rampOf({ stops: [MARROW, BONE, OLD_BONE, TOOTH], at: [0, 0.2, 0.6, 0.92], steps: 5 });
/** Bone dust: pale, dulling. */
const RAMP_BONE_DUST = rampOf({ stops: [BONE, OLD_BONE, TOOTH], at: [0, 0.5, 0.9], steps: 4 });

/** The marrow ring: a pale hoop at the wound that rings out and stays a beat. */
const MARROW_RING: BurstOpts = {
  shape: 'ring', speed: 0, life: 0.6, lifeVar: 0.05, size: 0.3, sizeVar: 0.02, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [MARROW, BONE, OLD_BONE], at: [0, 0.4, 0.8] }),
  sizeCurve: curveOf([0, 0.3, 0.35, 1.6, 1, 1.9]), alphaCurve: curveOf([0, 1, 0.4, 0.8, 1, 0]),
};

/** The splints: the heroes — three lots thrown up, tumbling, bouncing, LYING for ten seconds. */
const SPLINT: BurstOpts = {
  shape: 'shard', speed: 1.1, speedVar: 0.4, life: 9.5, lifeVar: 0.1, size: 0.11, sizeVar: 0.2,
  gravity: 0, spin: 7, z: 0.6, vz: 2.4, zg: 7, land: 'bounce', bounce: 0.3, layer: 'world',
  ramp: RAMP_BONE, sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 9,
};

/** Splinters: smaller bone flung off the split, lying shorter. */
const SPLINTER: BurstOpts = {
  ...SPLINT, size: 0.06, sizeVar: 0.3, speed: 1.6, speedVar: 0.5, vz: 1.8, zg: 8, life: 3.5, spin: 12, markLife: 4,
};

/** Bone dust: the fines sifting off the split, hanging then lying. */
const BONE_DUST: BurstOpts = {
  shape: 'mote', speed: 0.5, speedVar: 0.5, life: 0.9, lifeVar: 0.3, size: 0.05, sizeVar: 0.3,
  gravity: 0, z: 0.55, vz: 0.5, zg: 1.6, land: 'settle', layer: 'world', shadow: 0,
  ramp: RAMP_BONE_DUST, sizeCurve: HOLD, alphaCurve: MIST,
};

/** The split flash: a pale pop at the wound as the needle opens. */
const SPLIT_FLASH: BurstOpts = {
  shape: 'blob', speed: 0.2, life: 0.18, size: 0.26, sizeVar: 0.15, gravity: 0, z: 0.55,
  layer: 'world', shadow: 0, ramp: rampOf({ stops: [MARROW, BONE, OLD_BONE] }), sizeCurve: FLARE, alphaCurve: FADE_OUT,
  core: MARROW, coreK: 0.4,
};

const BONE_SIFT_POPS: EmitterPop[] = [
  { colors: [BONE, OLD_BONE], opts: { ...BONE_DUST, speed: 0.25, vz: 0.1, zg: 2.2, life: 0.7 }, weight: 1, tier: 'fine' },
];

/**
 * rogue.bone_cast — THE MARROW READS. The needle strikes and splits: a
 * pale flash at the wound, the marrow ring rings out on the ground,
 * three splints fan open on true height and hang one breath (a second
 * throw of splinters follows), clatter down, bounce, and LIE as the lots
 * for ten seconds; bone dust sifts off the wound after.
 */
const rogueBoneCast: EffectDef = {
  id: 'rogue.bone_cast',
  name: 'Rogue — bone cast',
  story: 'the needle splits with a pale pop → a marrow-white ring at the wound → three bone splints fan open on true height, hang, and clatter down to LIE as the lots for ten seconds → splinters fly shorter → bone dust sifts off the wound and settles',
  layers: [
    { kind: 'burst', name: 'split flash', recipe: recipe([MARROW, BONE], SPLIT_FLASH), count: 1, tier: 'body' },
    { kind: 'burst', name: 'marrow ring', recipe: recipe([MARROW, BONE], MARROW_RING), count: 1, tier: 'body' },
    { kind: 'burst', name: 'splints', recipe: recipe([MARROW, BONE], SPLINT), count: 3, tier: 'hero', arrange: 'cone', spread: 1.3 },
    { kind: 'burst', name: 'splinters', recipe: recipe([BONE, OLD_BONE], SPLINTER), count: 6, tier: 'body', arrange: 'cone', spread: 1.5 },
    { kind: 'burst', name: 'second cast', recipe: recipe([BONE, OLD_BONE], { ...SPLINTER, speed: 1.0, vz: 1.4 }), count: 4, tier: 'body', arrange: 'cone', spread: 1.6, at: 0.12 },
    { kind: 'burst', name: 'bone dust', recipe: recipe([BONE, OLD_BONE], BONE_DUST), count: 10, tier: 'fine', arrange: 'disc', radius: 0.2 },
    { kind: 'emit', name: 'sift', dz: 0.5, at: 0.15, rate: 12, dur: 0.7, release: 0.3, tier: 'fine', pops: BONE_SIFT_POPS },
  ],
};

// --- grave-light -------------------------------------------------------------

/** A footlight: a still pale-green blade of light that stands, then lets go. */
const RAMP_LAMP = rampOf({ stops: [LIGHT, PALE_GREEN, GREEN, MOSS], at: [0, 0.35, 0.7, 0.92], steps: 5 });
/** The up-light on the body: green thinning to dusk. */
const RAMP_UPLIGHT = rampOf({ stops: [PALE_GREEN, GREEN, MOSS, DUSK], at: [0, 0.3, 0.65, 0.9], steps: 5 });

/** Lamp flames: licks with no flicker — they burn absolutely STILL. */
const LAMP: BurstOpts = {
  shape: 'lick', speed: 0, life: 2.6, lifeVar: 0.12, size: 0.16, sizeVar: 0.15, gravity: 0,
  z: 0.05, vz: 0, zg: 0, layer: 'world', shadow: 0, flicker: 0,
  ramp: RAMP_LAMP, sizeCurve: curveOf([0, 0.3, 0.15, 1, 0.8, 0.95, 1, 0]), alphaCurve: curveOf([0, 0, 0.1, 1, 0.8, 0.9, 1, 0]),
  core: LIGHT, coreK: 0.4,
};

/** Lamp cups: dark ground dots each lamp stands in. */
const CUP: BurstOpts = {
  shape: 'square', speed: 0, life: 2.8, lifeVar: 0.1, size: 0.09, sizeVar: 0.1, gravity: 0,
  layer: 'ground', ramp: rampOf({ stops: [DUSK, GRAVE], at: [0, 0.8] }), sizeCurve: HOLD, alphaCurve: curveOf([0, 0.7, 0.85, 0.7, 1, 0]),
};

/** The up-light: low green masses leaning up against the body, thinning. */
const UPLIGHT: BurstOpts = {
  shape: 'blob', speed: 0.15, speedVar: 0.5, life: 1.6, lifeVar: 0.3, size: 0.32, sizeVar: 0.25, gravity: 0,
  z: 0.15, vz: 0.35, zg: -0.05, mass: 0.3, layer: 'world', shadow: 0,
  ramp: RAMP_UPLIGHT, sizeCurve: curveOf('swell'), alphaCurve: curveOf([0, 0, 0.2, 0.5, 0.6, 0.4, 1, 0]),
  wave: 'noise', waveHz: 0.8, waveAmp: 0.15,
};

/** Reeling motes: born on a wide ring with mass, pulled INWARD to the lamps. */
const REEL_MOTE: BurstOpts = {
  shape: 'glint', speed: 0.2, life: 1.1, lifeVar: 0.3, size: 0.05, sizeVar: 0.3, gravity: 0,
  z: 0.3, vz: 0.1, zg: 0, drag: 0.6, mass: 2.2, land: 'none', layer: 'world', shadow: 0, flicker: 0.3,
  ramp: RAMP_LAMP, sizeCurve: BLOOM, alphaCurve: FADE_LATE,
};

/** Grave embers: the heroes that stay in the arc when the lamps dim. */
const GRAVE_EMBER: BurstOpts = {
  shape: 'square', speed: 0.05, life: 7.5, lifeVar: 0.15, size: 0.06, sizeVar: 0.2, gravity: 0,
  z: 0.02, vz: 0.15, zg: 3, land: 'settle', layer: 'world', shadow: 0, flicker: 0.25,
  ramp: rampOf({ stops: [PALE_GREEN, GREEN, MOSS, DUSK], at: [0, 0.3, 0.7, 0.95], steps: 5 }),
  sizeCurve: HOLD, alphaCurve: SETTLE_A, mark: 'fleck', markLife: 5,
};

const REEL_POPS: EmitterPop[] = [
  { colors: [PALE_GREEN, GREEN], opts: REEL_MOTE, weight: 1, tier: 'fine' },
  { colors: [LIGHT, PALE_GREEN], opts: { ...REEL_MOTE, size: 0.07, mass: 2.6, life: 1.3 }, weight: 0.35, tier: 'body' },
];

/**
 * rogue.gravelight — THE FOOTLIGHTS. A low arc of still pale-green lamp
 * flames comes up at the feet, each in its dark cup; up-light leans
 * against the body; green motes reel INWARD to the lamps on an attract
 * field while the watch holds; when the row dims, grave embers stay in
 * the arc on the ground.
 */
const rogueGravelight: EffectDef = {
  id: 'rogue.gravelight',
  name: 'Rogue — grave-light',
  story: 'a low arc of still pale-green footlights comes up at the feet, each in its dark cup → up-light leans against the body → green motes reel INWARD to the lamps on the pull while the watch holds → the row dims and grave embers stay in the arc',
  layers: [
    { kind: 'burst', name: 'cups', recipe: recipe([DUSK, GRAVE], CUP), count: 5, tier: 'body', arrange: 'ring', radius: 0.5 },
    { kind: 'burst', name: 'footlights', recipe: recipe([LIGHT, PALE_GREEN], LAMP), count: 5, tier: 'hero', arrange: 'ring', radius: 0.5, at: 0.05 },
    { kind: 'burst', name: 'up-light', recipe: recipe([PALE_GREEN, GREEN], UPLIGHT), count: 4, tier: 'body', arrange: 'disc', radius: 0.3, at: 0.1 },
    { kind: 'field', name: 'the keeping', at: 0.2, field: { kind: 'attract', radius: 1.9, strength: 2.4, dur: 2.2, attack: 0.2, release: 0.4 } },
    { kind: 'emit', name: 'reeling motes', arrange: 'ring', radius: 1.6, dz: 0.2, at: 0.25, rate: 14, dur: 2.0, attack: 0.2, release: 0.5, tier: 'fine', pops: REEL_POPS },
    { kind: 'burst', name: 'grave embers', recipe: recipe([PALE_GREEN, GREEN], GRAVE_EMBER), count: 5, tier: 'hero', arrange: 'ring', radius: 0.5, at: 2.4 },
    { kind: 'burst', name: 'last up-light', recipe: recipe([GREEN, MOSS], { ...UPLIGHT, size: 0.22, life: 1.0 }), count: 3, tier: 'body', arrange: 'disc', radius: 0.25, at: 1.4 },
    { kind: 'glow', name: 'footlight', r: 1.0, rgb: GRAVE_GLOW, a: 0.16, dur: 2.6, attack: 0.2, release: 0.6, flicker: 0.05 },
  ],
};

export const ROGUE_EFFECTS: EffectDef[] = [rogueBoneCast, rogueGravelight];

// ---------------------------------------------------------------------------
// The plans
// ---------------------------------------------------------------------------

export const ROGUE_PLANS: Record<string, AbilityPlan> = {
  // THE MASTERED HAND, Phase 4: the rogue's-roster secrets are the onehand
  // shelf's knife arts — every one a cross-school link. `onFollow` is the
  // link landing (the crossed stroke, the school's payoff word, ×1.15);
  // `onFinale` the held garden's last petal (×1.35).

  // serpents_kiss — arc, VENOM opener, follows expose (the venom goes in
  // twice as deep). The shed skin: the green needle whips through the arc,
  // the fangs pinprick, the venom signs the ground in drips; on an exposed
  // vein the bite BURSTS green and the drips run heavier.
  serpents_kiss: {
    cues: [
      { id: 'venom.spit', scale: 0.9 },
      { id: 'blood.hit', at: 0.05, scale: 0.5 },
      { id: 'venom.drip', at: 0.4, scale: 0.6 },
    ],
    onFollow: [
      { id: 'venom.burst', at: 0.08, scale: 0.9 },
      { id: 'venom.drip', at: 0.5, scale: 0.8 },
    ],
  },
  // stinger — dash, payoff, follows brand/expose ×1.5. The needle's gate:
  // the needle-line departs as a steel glint, the puncture bleeds at the
  // arrival; on a marked spot the point CROSSES and the wound sprays.
  stinger: {
    cues: [
      { id: 'blade.glint', scale: 0.6 },
      { id: 'blade.glint', atFar: true, at: 0.08, scale: 0.7 },
      { id: 'blood.hit', atFar: true, at: 0.1, scale: 1.0 },
      { id: 'blood.spray', atFar: true, at: 0.35, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.1, scale: 0.9 },
      { id: 'blood.spray', atFar: true, at: 0.4, scale: 0.7 },
    ],
  },
  // cold_snap — nova, CHILL opener, follows burn ×1.5 (Thermal Shock). The
  // stopped clock: the first frost happens all at once, the fog stands
  // still, the lozenges crack and drop; laid on a burning body the fire is
  // QUENCHED — the pane shatters wide and steam climbs off the ring.
  cold_snap: {
    cues: [
      { id: 'frost.nova', scale: 1.0 },
      { id: 'frost.fog', at: 0.2, scale: 0.5 },
      { id: 'frost.shards', at: 0.9, scale: 0.6 },
    ],
    onFollow: [
      { id: 'frost.shards', at: 0.05, scale: 1.2, radiusK: 1.2 },
      { id: 'smoke.wisp', at: 0.15, scale: 0.7 },
      { id: 'onehand.rime_sheet', at: 0.2, scale: 0.6 },
    ],
  },
  // bone_needle — blast at the hit, payoff, follows brand ×1.5, red ledger.
  // The marrow reads: the roster's bone cast at the hit plus the small
  // wound; thrown at a bow's brand the dart CROSSES and finds marrow — the
  // cast is thrown wide and the wound is not small.
  bone_needle: {
    cues: [
      { id: 'rogue.bone_cast', scale: 1.0 },
      { id: 'blood.hit', at: 0.05, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 0.8 },
      { id: 'rogue.bone_cast', at: 0.05, scale: 1.2, radiusK: 1.3 },
      { id: 'blood.spray', at: 0.15, scale: 0.7 },
    ],
  },
  // shadow_fang — dash, payoff, follows vanish ×1.5, drains. The long
  // shadow: the dark bursts at the arrival, cinches shut on the bite, what
  // it drew streams home; out of a vanish the fang CROSSES and the drink
  // runs deep.
  shadow_fang: {
    cues: [
      { id: 'shadow.burst', atFar: true, at: 0.05, scale: 0.7 },
      { id: 'shadow.grasp', atFar: true, at: 0.15, scale: 0.8 },
      { id: 'blood.drink', at: 0.4, scale: 0.6 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.08, scale: 1.0 },
      { id: 'blood.spray', atFar: true, at: 0.2, scale: 0.7 },
      { id: 'blood.drink', at: 0.45, scale: 1.0 },
    ],
  },
  // crimson_tithe — buff, answer, follows rend/venom (sooner back). The open
  // bowl: the pact holds the bowl out and the world pays in, the tally ring
  // dries, a second and third draw across the term; called on open wounds
  // the bowl fills at once — the steel rings and the first draw is deep.
  crimson_tithe: {
    cues: [
      { id: 'blood.drink', scale: 1.1 },
      { id: 'blade.mirror', at: 0.05, scale: 0.4 },
      { id: 'blood.pool', at: 0.4, scale: 0.45 },
      { id: 'blood.drink', at: 2.2, scale: 0.7 },
      { id: 'blood.drink', at: 3.6, scale: 0.5 },
    ],
    onFollow: [
      { id: 'blade.mirror', scale: 0.6 },
      { id: 'blood.drink', at: 0.1, scale: 1.2 },
    ],
  },
  // pale_flame — arc, payoff, follows hollow/chill ×1.5, chills. The cold
  // wick: the sweep is a cold breath, the wicks stand as ice teeth, the
  // frost lies as fog, the wicks crumble to smoke; poured into the hollow
  // the pale fire CROSSES and the cold detonates as a nova.
  pale_flame: {
    cues: [
      { id: 'frost.breath', scale: 0.8 },
      { id: 'frost.shards', at: 0.15, scale: 0.5 },
      { id: 'frost.fog', at: 0.5, scale: 0.4 },
      { id: 'smoke.wisp', at: 0.9, scale: 0.4 },
    ],
    onFollow: [
      { id: 'onehand.riposte', scale: 0.9 },
      { id: 'frost.nova', at: 0.08, scale: 1.0 },
    ],
  },
  // spark_lash — bolt per hop, payoff, follows sunder/line ×1.4 (refund).
  // The grounding nail: the taut wire spans hook to foe, the nail slams at
  // the far end, grit kicks at its foot; down a cracked guard or a polearm's
  // line the current CROSSES and the whole charge discharges at the struck.
  spark_lash: {
    cues: [
      { id: 'storm.arc', scale: 0.9 },
      { id: 'storm.strike', atFar: true, at: 0.05, scale: 0.7 },
      { id: 'dust.kick', atFar: true, at: 0.1, scale: 0.4 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.06, scale: 0.9 },
      { id: 'storm.nova', atFar: true, at: 0.1, scale: 0.9 },
    ],
  },
  // kings_bane — dash, payoff, follows taunt/weaken ×1.3, red ledger. The
  // broken scepter: history lands, the wound opens, the scepter shatters
  // into gold glass, the blood pools; on the called-out or the dulled the
  // bane CROSSES and the scepter shatters wide.
  kings_bane: {
    cues: [
      { id: 'blade.glint', atFar: true, at: 0.05, scale: 0.9 },
      { id: 'blood.hit', atFar: true, at: 0.1, scale: 1.0 },
      { id: 'arcane.shatter', atFar: true, at: 0.15, scale: 0.9 },
      { id: 'blood.pool', atFar: true, at: 0.6, scale: 0.5 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.08, scale: 1.0 },
      { id: 'arcane.shatter', atFar: true, at: 0.18, scale: 1.1, radiusK: 1.2 },
      { id: 'blood.spray', atFar: true, at: 0.25, scale: 0.8 },
    ],
  },
  // last_word — dash, the shelf's finisher, follows root/stagger/weaken
  // ×1.2, red ledger. The closed quote: the step in, the white stamp at the
  // arrival, the wound, a dark hush that settles; on a body already held the
  // word is FINAL — the crossed stroke, a louder stamp, the red not modest.
  last_word: {
    cues: [
      { id: 'blade.glint', scale: 0.5 },
      { id: 'blade.mirror', atFar: true, at: 0.05, scale: 1.5 },
      { id: 'blood.hit', atFar: true, at: 0.1, scale: 1.1 },
      { id: 'shadow.veil', atFar: true, at: 0.2, scale: 0.6 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.06, scale: 1.3 },
      { id: 'blade.mirror', atFar: true, at: 0.12, scale: 1.0, radiusK: 1.3 },
      { id: 'blood.spray', atFar: true, at: 0.2, scale: 1.0 },
    ],
  },
  // garden_close — nova per beat, held, VENOM, finale ×2 (the last petal is
  // the whole hedge). The night bouquet: each beat the buds burst into venom,
  // the petals shear off and converge on the heart, the freckles keep the
  // ring; THE LAST PETAL: the whole hedge closes at once — the dark grasps
  // the ring, venom bursts wide, and the garden pools under everyone in it.
  garden_close: {
    cues: [
      { id: 'venom.burst', at: 0.15, scale: 0.7 },
      { id: 'shadow.grasp', at: 0.2, scale: 0.7 },
      { id: 'venom.pool', at: 0.7, scale: 0.4 },
    ],
    onFinale: [
      { id: 'shadow.grasp', scale: 1.1, radiusK: 1.2 },
      { id: 'venom.burst', at: 0.1, scale: 1.3, radiusK: 1.2 },
      { id: 'venom.cloud', at: 0.3, scale: 0.8 },
      { id: 'venom.pool', at: 0.6, scale: 0.9, radiusK: 1.2 },
    ],
  },
  // beak_first — dash, payoff, follows left/right ×1.4. The rook's toll: the
  // rook launches, the purse bursts at the arrival in dark slips, two red
  // drops say the toll was taken; between the twin hands the dive CROSSES
  // and the toll is paid in a spray.
  beak_first: {
    cues: [
      { id: 'dust.kick', scale: 0.5 },
      { id: 'shadow.burst', atFar: true, at: 0.12, scale: 0.5 },
      { id: 'blood.hit', atFar: true, at: 0.1, scale: 0.8 },
    ],
    onFollow: [
      { id: 'onehand.riposte', atFar: true, at: 0.1, scale: 0.9 },
      { id: 'blood.spray', atFar: true, at: 0.2, scale: 0.7 },
    ],
  },
  // pale_lantern — buff, RIPOSTE answer. The footlights: the grave-light
  // comes up for the watch, is kept a second time mid-term, and dims lamp by
  // lamp at the end — the embers stay; the steel rings once at the throat:
  // the riposte word is open.
  pale_lantern: { cues: [
    { id: 'rogue.gravelight', scale: 1.0 },
    { id: 'blade.mirror', at: 0.15, scale: 0.5 },
    { id: 'rogue.gravelight', at: 2.4, scale: 0.75 },
    { id: 'rogue.gravelight', at: 4.0, scale: 0.5 },
  ] },
};
