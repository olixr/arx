/**
 * THE SERVER'S PACE LAWS (foundations F4) — tick-count tuning shared by
 * the class and its split systems. A leaf on purpose: constants flow
 * downhill, so no system needs a value edge back into gameServer.ts to
 * read a number.
 */
import { TICK_RATE } from '@arx/shared';

/** Seconds of authored dial → whole ticks of the server clock. */
export function secToTicks(sec: number): number {
  return Math.round(sec * TICK_RATE);
}

/** No gather resolves faster than this, whatever the speedups say. */
export const MIN_GATHER_TICKS = 60;
/** The milking stool's base sit, before gather speed. */
export const MILK_TICKS = 60;
/** How long suspicion keeps a hunter dwelling on a last-known spot. */
export const SUS_DWELL_TICKS = 24;

/** How far a chaining working looks for its next foe, tiles. */
export const CHAIN_PROC_RANGE = 5;

  /** How long the hearth rests between recalls. */
export const HEARTH_CD_MS = 10 * 60 * 1000;
export const WILD_MAX_R = 56;
