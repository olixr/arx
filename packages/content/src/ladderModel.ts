/**
 * THE LADDER MODEL — the technique balance contract's value model.
 *
 * A single-target nominal value model shared by every balance
 * contract: the rung ladder (ladder.test.ts) and the secret shelf
 * (secretArts.test.ts) must read the SAME law, so it lives here and
 * nowhere else. It is deliberately simple and DOCUMENTED — when an
 * art's real play value and its model value disagree, tune the model
 * here in the open, never by quietly excusing one art. The TTK
 * brackets in the server suite stay the outer truth.
 *
 * Model laws:
 * - Value = (direct damage x expected single-target hits x aoe credit
 *   + status value + utility credit) / cycle seconds.
 * - THE PRICED BREATH: cycle seconds = cooldown + the wind-up at its
 *   BEST case (castTicks / CAST_STILL_FACTOR — the planted cast; the
 *   moving cast is strictly worse and needs no extra tax). A channel's
 *   pulses land inside its cooldown, so its denominator stays the
 *   cooldown; its rooted seconds buy band headroom instead (THE
 *   ROOTED PREMIUM, priced in the relevance contract).
 * - DoTs are real damage: power x duration / tick-cadence (the shared
 *   BURN/BLEED/VENOM constants — not guesses) — discounted past the
 *   4-second horizon, because fights end and long tails go unpaid.
 * - Chill/shock are control: 0.9 per second, same horizon.
 * - Mobility (dash) 0.5/tile; shove 0.4/unit; a PULL is worth 0.8/unit
 *   (grouping enemies is setup, not just denial).
 * - Execute: direct x (mult-1) x frac — the low-HP window, discounted.
 * - Arts whose direct damage < 3 are utility arts: exempt from the
 *   band (their worth is the effect), but still contract-checked for
 *   step shape and non-degrading rank steps.
 */
import {
  BLEED_TICK_EVERY,
  BURN_TICK_EVERY,
  CAST_STILL_FACTOR,
  VENOM_TICK_EVERY,
  type AbilityDef,
  type StatusApply,
} from '@arx/shared';

const TICK = 20;

/** Value past this many seconds of status is discounted — fights end. */
const DOT_HORIZON_SECS = 4;

function statusValue(s: StatusApply | undefined): number {
  if (!s) return 0;
  const secs = s.durationTicks / TICK;
  const horizon = Math.min(1, DOT_HORIZON_SECS / secs);
  switch (s.status) {
    case 'burn':
      return s.power * (s.durationTicks / BURN_TICK_EVERY) * horizon;
    case 'bleed':
      return s.power * (s.durationTicks / BLEED_TICK_EVERY) * horizon;
    case 'venom':
      return s.power * (s.durationTicks / VENOM_TICK_EVERY) * horizon;
    case 'chill':
    case 'shock':
      return secs * 0.9 * horizon;
  }
}

/**
 * THE HELD NOTE: a channeled art strikes its whole shape once per
 * pulse — the model multiplies the shape's per-beat hits by the beat
 * count (first note at the press, then every pulseEveryTicks). The
 * tame's channel is survival, not damage; its shape carries no die.
 */
export function channelBeats(ab: AbilityDef): number {
  if (!ab.channelTicks || ab.shape === 'tame') return 1;
  return Math.ceil(ab.channelTicks / (ab.pulseEveryTicks ?? 16));
}

/** Expected hits against ONE target — AoE breadth is credited separately. */
function singleTargetHits(ab: AbilityDef): number {
  switch (ab.shape) {
    case 'pulse_nova':
      return (ab.pulses ?? 1) * 0.85;
    case 'ground_field':
      return Math.floor((ab.fieldTicks ?? 0) / (ab.pulseEveryTicks ?? TICK)) * 0.45;
    case 'projectile_fan':
    case 'dash_strike': {
      // dash_strike fires its projectile fan too (the tumble family).
      const n = ab.projectiles ?? 1;
      const per = ab.homing ? 0.75 : (ab.spreadArc ?? 0) <= 0.2 ? 0.6 : 0.25;
      // A boomerang strikes on the way home too.
      return (1 + (n - 1) * per) * (ab.returns ? 1.6 : 1);
    }
    case 'flurry':
      return (ab.hits ?? 1) * 0.9;
    default:
      return 1;
  }
}

const BLAST_SHAPES = new Set(['nova', 'ground_aoe', 'pulse_nova', 'leap_slam']);

function aoeCredit(ab: AbilityDef): number {
  let m = 1;
  // radius means "blast" only on the blast shapes — chain_zap's radius
  // is hop reach and ground_field's breadth already rides its pulses.
  if (ab.radius && BLAST_SHAPES.has(ab.shape)) m += Math.min(ab.radius, 3) * 0.12;
  if (ab.shape === 'chain_zap') m += (ab.chainTargets ?? 0) * 0.22;
  if (ab.pierce) m += 0.15;
  return m;
}

function utilityCredit(ab: AbilityDef): number {
  let u = 0;
  if (ab.dashTiles) u += Math.abs(ab.dashTiles) * 0.5;
  if (ab.knockback) u += Math.abs(ab.knockback) * (ab.knockback < 0 ? 0.8 : 0.4);
  if (ab.executeBelow) u += ab.damage * (ab.executeBelow.mult - 1) * ab.executeBelow.frac;
  // Drained life is sustain — worth a little less than the damage it rode.
  if (ab.drainFrac) u += ab.damage * ab.drainFrac * 0.6;
  return u;
}

export function cycleValue(ab: AbilityDef): number {
  const direct = ab.damage * singleTargetHits(ab) * aoeCredit(ab) * channelBeats(ab);
  const cycleSecs = ab.cooldownTicks / TICK + (ab.castTicks ?? 0) / TICK / CAST_STILL_FACTOR;
  return (direct + statusValue(ab.status) + utilityCredit(ab)) / cycleSecs;
}

/**
 * THE ROOTED PREMIUM: seconds of required stillness widen an art's
 * allowed band CEILING (+6%/s, capped at +30%) — commitment may buy
 * payload above the style mean, never excuse payload below it (the
 * floor never moves; an underperforming channel is simply bad).
 */
export function rootedPremium(ab: AbilityDef): number {
  if (!ab.channelTicks || ab.shape === 'tame') return 0;
  return Math.min(0.3, 0.06 * (ab.channelTicks / TICK));
}

// Summons are worth their effect, not their stamp damage — band-exempt
// beside the low-damage utility arts (blink, smoke, the shields). A
// channel's worth is its WHOLE note, never one quiet beat.
export const isUtilityArt = (ab: AbilityDef): boolean =>
  ab.damage * channelBeats(ab) < 3 || ab.shape === 'summon';

/** Fields a rank step may hone. Identity fields are excluded by type; this locks it at runtime too. */
export const HONABLE: ReadonlySet<string> = new Set([
  'note',
  'cooldownTicks',
  'castFreezeTicks',
  'castTicks',
  'damage',
  'range',
  'arc',
  'radius',
  'projectiles',
  'spreadArc',
  'projectileSpeed',
  'pierce',
  'homing',
  'dashTiles',
  'chainTargets',
  'pulses',
  'pulseEveryTicks',
  'status',
  'self',
  'knockback',
  'fuseTicks',
  'width',
  'fieldTicks',
  'hits',
  'returns',
  'executeBelow',
  'drainFrac',
  'summon',
  'tauntRadius',
  'channelTicks',
  // THE KEEPER'S TONGUE: the keeper dials rank like any other number.
  'becalmTicks',
  'petHealFrac',
  'petSurge',
  'petGuard',
  'petCleanse',
]);
