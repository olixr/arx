import {
  COMBO_GRACE_TICKS,
  FINISHER_DAMAGE_MULT,
  FINISHER_KNOCKBACK_MULT,
  FINISHER_RECOVERY_MULT,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  PoseState,
  TWOHAND_COMBO_GRACE_TICKS,
  TWOHAND_FINISHER_DAMAGE_MULT,
  TWOHAND_FINISHER_KNOCKBACK_MULT,
  TWOHAND_FINISHER_RECOVERY_MULT,
  TWOHAND_KNOCKBACK_MULT,
  TWOHAND_STAGE2_DAMAGE_MULT,
} from '@arx/shared';
import type { MovesetId, WeaponStats } from './items.js';

/**
 * THE MOVESET BOOK (combat v2, Phase 3): strikes are CONTENT. A
 * moveset is a named string of StrikeDefs; a weapon resolves one
 * through `movesetFor` — its authored `moveset` field first, then its
 * class default, with the dagger family split off by the same
 * three-dial identity the census test pins (fast cadence, short
 * reach, a real backstab). The bow deliberately has no page in this
 * book: its basic is the DRAW, a charge grammar, not a string.
 *
 * Default strings derive every number from the shared lane constants,
 * so the book and the old hardcoded lanes can never disagree — the
 * byte-law test pins it anyway.
 */

export interface StrikeDef {
  /** Choreography word — the client's strike vocabulary key. */
  key: string;
  dmgMult: number;
  kbMult: number;
  /** Every body in the arc eats its own roll (vs best-target only). */
  sweepAll: boolean;
  /** Recovery, as a multiple of the weapon's cooldownTicks. */
  recoveryMult: number;
  /**
   * THE HONEST SWING: ticks from press to impact — the blade travels
   * before it lands, like every NPC blow already does. The press pays
   * (cooldown, pose, the spoken beat); the damage arrives on the
   * choreography's impact frame. Wand bolts keep 0: the projectile's
   * flight is already the honest travel.
   */
  windupTicks: number;
  /** THE BRANCH: a rhythm TAP on this beat plays this strike instead. */
  alt?: StrikeDef;
  /** Wand lane: projectile speed factor. */
  speedMult?: number;
  /** Wand lane: splash radius (tiles) at impact. */
  splash?: number;
  /** Melee cone override, radians half-angle (else the class cone). */
  arcHalf?: number;
}

export interface MovesetDef {
  id: MovesetId;
  style: 'onehand' | 'twohand' | 'arx';
  /** Which pose vocabulary the string speaks (steel swings vs casts). */
  poseDialect: 'steel' | 'wand';
  /** Grace ticks stamped after each swing's recovery. */
  graceTicks: number;
  string: StrikeDef[];
}

/**
 * THE FOUR-BEAT SWORD STRING: cleave, return, cleave, payoff. One more
 * chip beat than the old three-beat, so the finisher is EARNED —
 * cycle damage sits 2% under the legacy line (parity-pinned). The
 * final beat BRANCHES: hold-flow sweeps the whole arc (the old
 * crowd-clear finisher, unchanged for holders); a rhythm TAP on the
 * beat drives THE PIERCING instead — one body, a heavier hit, the
 * duelist's answer. Tap reward stays inside the +10% cadence band and
 * only ever against a single target.
 */
const SWORD_STRING: MovesetDef = {
  id: 'sword_string',
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'cleave', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    { key: 'return', dmgMult: 1, kbMult: 1.1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    { key: 'cleave', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    {
      key: 'sweep',
      dmgMult: FINISHER_DAMAGE_MULT,
      kbMult: FINISHER_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: FINISHER_RECOVERY_MULT,
      windupTicks: 3,
      alt: {
        key: 'thrust',
        dmgMult: 3.0,
        kbMult: 1.6,
        sweepAll: false,
        recoveryMult: FINISHER_RECOVERY_MULT,
        windupTicks: 3,
      },
    },
  ],
};

/**
 * THE DAGGER FLURRY: the first per-family string — five quick cuts,
 * rake and backslash weaving, then the plunge. Authored to EXACT
 * cycle parity with the legacy three-beat ((4 + 2.75) / 6 = 1.125),
 * so the knife's identity is rhythm density, never a damage buff.
 * One-tick windups: fast hands stay fast.
 */
const DAGGER_FLURRY: MovesetDef = {
  id: 'dagger_flurry',
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    {
      key: 'plunge',
      dmgMult: 2.75,
      kbMult: 1.5,
      sweepAll: true,
      recoveryMult: 2.0,
      windupTicks: 2,
    },
  ],
};

/** THE GREAT STRING: the legacy three beats, now with honest weight. */
const GREAT_STRING: MovesetDef = {
  id: 'great_string',
  style: 'twohand',
  poseDialect: 'steel',
  graceTicks: TWOHAND_COMBO_GRACE_TICKS,
  string: [
    {
      key: 'fell',
      dmgMult: 1,
      kbMult: TWOHAND_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: 1,
      windupTicks: 4,
    },
    {
      key: 'reap',
      dmgMult: TWOHAND_STAGE2_DAMAGE_MULT,
      kbMult: TWOHAND_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: 1,
      windupTicks: 4,
    },
    {
      key: 'mountain',
      dmgMult: TWOHAND_FINISHER_DAMAGE_MULT,
      kbMult: TWOHAND_FINISHER_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: TWOHAND_FINISHER_RECOVERY_MULT,
      windupTicks: 5,
      // THE OVERHEAD: a rhythm TAP narrows the mountain to a single
      // falling line — a tight cone, a heavier hit, a harder shove.
      // +9.7% cycle against the great line, single-lane only, inside
      // the +10% band.
      alt: {
        key: 'overhead',
        dmgMult: 3.5,
        kbMult: 2.6,
        sweepAll: true,
        recoveryMult: TWOHAND_FINISHER_RECOVERY_MULT,
        windupTicks: 5,
        arcHalf: 0.6,
      },
    },
  ],
};

/** THE WAND RHYTHM: bolt, bolt, orb — the legacy lane, as a page. */
const WAND_RHYTHM: MovesetDef = {
  id: 'wand_rhythm',
  style: 'arx',
  poseDialect: 'wand',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    {
      key: 'orb',
      dmgMult: HEAVY_BOLT_MULT,
      kbMult: 1,
      sweepAll: false,
      recoveryMult: HEAVY_BOLT_RECOVERY_MULT,
      windupTicks: 0,
      speedMult: 0.8,
      splash: HEAVY_BOLT_SPLASH,
    },
  ],
};

export const MOVESETS: Record<MovesetId, MovesetDef> = {
  sword_string: SWORD_STRING,
  dagger_flurry: DAGGER_FLURRY,
  great_string: GREAT_STRING,
  wand_rhythm: WAND_RHYTHM,
};

/**
 * The census test's dagger identity, as the one classifier: fast
 * cadence, short reach, a real backstab. Pure WeaponStats — no
 * registry lookup, so the server door, the client mirror, and the
 * slates all classify identically.
 */
export function isDaggerStats(weapon: WeaponStats): boolean {
  return (
    weapon.cooldownTicks <= 6 && weapon.range <= 1.5 && (weapon.backstabMult ?? 0) >= 2.2
  );
}

/**
 * The weapon's page in the book: authored `moveset` first, then the
 * class default (daggers split off by identity). Archery has no page
 * — the draw is a charge grammar, and the caller must treat null as
 * "no basic string lane".
 */
export function movesetFor(weapon: WeaponStats): MovesetDef | null {
  if (weapon.moveset) return MOVESETS[weapon.moveset];
  if (weapon.style === 'twohand') return GREAT_STRING;
  if (weapon.style === 'arx') return WAND_RHYTHM;
  if (weapon.style === 'onehand') return isDaggerStats(weapon) ? DAGGER_FLURRY : SWORD_STRING;
  return null;
}

/**
 * THE POSE ALTERNATION LAW: strings of any length speak the existing
 * three attack poses — even beats swing forehand (Attack), odd beats
 * backhand (Attack2), the final beat wears the payoff pose (Attack3).
 * In the STEEL dialect adjacent beats NEVER share a pose value
 * (including the wrap into a new string), because the client's anim
 * clock keys on pose CHANGE — pinned by test. This is why a five-beat
 * flurry costs zero wire changes. The WAND dialect deliberately
 * repeats Cast beat to beat (legacy, unchanged): a bolt's feedback is
 * the projectile leaving the crown, not a body re-animation — only
 * its payoff orb flips the byte.
 */
export function strikePose(dialect: 'steel' | 'wand', stage: number, len: number): PoseState {
  if (stage === len - 1) return PoseState.Attack3;
  if (dialect === 'wand') return PoseState.Cast;
  return stage % 2 === 0 ? PoseState.Attack : PoseState.Attack2;
}
