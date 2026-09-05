/**
 * RANKS FOR THE SHELF — the secret arts' honed steps.
 *
 * THE HONED-ART LAW, paid for every secret seat: Rank II sharpens
 * numbers, Rank III adds a beat of utility, Rank IV is the signature
 * flourish. A mastered secret ranks on its ANCHOR clock (anchor +15 /
 * +30 / +45), so the arts a hand fought to keep grow beside the
 * ladder instead of dulling behind it. An unmastered loan still casts
 * at Rank I — the borrowed motion is correct but not yet yours.
 *
 * Balance contracts (secretArts.test.ts): steps touch HONABLE fields
 * only, never degrade a damage art, and the Rank IV shelf must land
 * inside the school's RANK IV rung envelope — the shelf hones WITH
 * the ladder, never over it. THE PAYOFF BRACKET FOR THE SHELF caps
 * every honed rank against the at-level line fighter. Notes are
 * player-facing bench copy (VOICE; no dashes).
 */
import type { RankStep } from '@arx/shared';
import { ONEHAND_SECRET_RANKS } from './abilities/secrets/onehand.js';
import { TWOHAND_SECRET_RANKS } from './abilities/secrets/twohand.js';
import { ARCHERY_SECRET_RANKS } from './abilities/secrets/archery.js';
import { ARX_SECRET_RANKS } from './abilities/secrets/arx.js';
import { POLEARM_SECRET_RANKS } from './abilities/polearm.js';

export type Steps = readonly [RankStep, RankStep, RankStep];

/** THE MASTERED HAND: each school's shelf keeps its ranks beside its arts. */
export const SECRET_RANKS: Record<string, Steps> = {
  ...ONEHAND_SECRET_RANKS,
  ...TWOHAND_SECRET_RANKS,
  ...ARCHERY_SECRET_RANKS,
  ...ARX_SECRET_RANKS,
  ...POLEARM_SECRET_RANKS,
};
